import React, {CSSProperties, FC, useEffect, useMemo, useState} from 'react'
import {AlorApi, fromTo, HistoryObject, Security, Side, Timeframe} from "alor-api";
import {SeriesMarker, Time, UTCTimestamp} from "lightweight-charts";
import TVChart from "../../../common/TVChart";
import {summ} from "../../../App";
import {useGetHistoryQuery} from "../../../api/alor.api";
import {useAppSelector} from "../../../store";

interface IProps {
    symbol: string;
    from: string;
    to: string;
    trades: any[]
    colors?: Pick<CSSProperties, 'backgroundColor' | 'color' | 'borderColor'>
    digits?: number
    security?: Security;
}

function timeToLocal(originalTime: number) {
    const d = new Date(originalTime * 1000);
    return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes(), d.getSeconds(), d.getMilliseconds()) / 1000;
}

const Chart: FC<IProps> = ({security, symbol, digits, from, to, trades, colors = {}}) => {

    const currentTimeframe = Timeframe.Min5;

    const entriesTrades = Object.entries(trades.reduce((acc, curr) => {
        const time = new Date(curr.date).getTime() / 1000;
        const diff = time % currentTimeframe;
        const roundedTime = time - diff;
        const key = `${roundedTime}_${curr.side}`;
        if (!acc[key]) {
            acc[key] = [];
        }
        acc[key].push({...curr, time: roundedTime - currentTimeframe as UTCTimestamp});

        return acc;
    }, {})).map(([key, entries]: any) => ({
        ...entries[0],
        qty: summ(entries.map(e => e.qty))
    })).sort((a, b) => Number(a.id) - Number(b.id));

    const roundTime = (date: string) => {
        const time = new Date(date).getTime() / 1000
        const diff = time % currentTimeframe;
        const roundedTime = time - diff;
        return timeToLocal(roundedTime) as UTCTimestamp
    }


    const fromDate = useMemo(() => new Date(from), [from]);
    const toDate = useMemo(() => new Date(to), [to]);

    const markers: SeriesMarker<Time>[] = useMemo(() => entriesTrades.map(t => ({
        time: roundTime(t.date),
        position: t.side === Side.Buy ? 'belowBar' : 'aboveBar',
        color: t.side === Side.Buy ? 'rgb(19,193,123)' : 'rgb(255,117,132)',
        shape: t.side === Side.Buy ? 'arrowUp' : 'arrowDown',
        // size: t.volume,
        id: t.id,
        value: t.price,
        size: 2
        // text: `${t.side === Side.Buy ? 'Buy' : 'Sell'} ${t.qty} lots by ${t.price}`
    }))
        .filter(t => t.time * 1000 >= fromDate.getTime())
        , [entriesTrades, fromDate, toDate])

    const {data} = useGetHistoryQuery({
        symbol,
        exchange: "MOEX",
        // @ts-ignore
        tf: currentTimeframe,
        from: fromTo('-0.5d', fromDate).from,
        to: fromTo('0.5d', toDate).to,
    });

    const history = data?.history || [];

    return <TVChart seriesType="candlestick" lotSize={security?.lotsize || 1} markers={markers}
                    data={history.map(d => ({...d, time: timeToLocal(d.time)})) as any[]} digits={digits} colors={colors}/>
}

export default Chart;