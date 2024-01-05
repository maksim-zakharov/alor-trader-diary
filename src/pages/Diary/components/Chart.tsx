import React, {CSSProperties, FC, useEffect, useMemo, useRef, useState} from 'react'
import {AlorApi, fromTo, HistoryObject, Security, Side, Timeframe} from "alor-api";
import {ColorType, createChart, SeriesMarker, Time, UTCTimestamp} from "lightweight-charts";
import TVChart from "../../../common/TVChart";
import {summ} from "../../../App";

interface IProps{
    symbol: string;
    api: AlorApi
    from: string;
    to: string;
    trades: any[]
    colors?: Pick<CSSProperties, 'backgroundColor' | 'color' | 'borderColor'>
    digits?: number
}

function timeToLocal(originalTime: number) {
    const d = new Date(originalTime * 1000);
    return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes(), d.getSeconds(), d.getMilliseconds()) / 1000;
}

const Chart: FC<IProps> = ({symbol, digits, api, from, to, trades, colors = {}}) => {

    const currentTimeframe = Timeframe.Min5;

    const [data, setData] = useState<HistoryObject[]>([]);

    const entriesTrades = Object.entries(trades.reduce((acc, curr) => {
        const time = new Date(curr.date).getTime() / 1000;
        const diff = time % currentTimeframe;
        const roundedTime = time - diff;
        const key = `${roundedTime}_${curr.side}`;
        if(!acc[key]){
            acc[key] = [];
        }
        acc[key].push({...curr, time: roundedTime - currentTimeframe as UTCTimestamp});

        return acc;
    }, {})).map(([key, entries]: any) => ({...entries[0], qty: summ(entries.map(e => e.qty))})).sort((a, b) => Number(a.id) - Number(b.id));

    const roundTime = (date: string) => {
        const time = new Date(date).getTime() / 1000
        const diff = time % currentTimeframe;
        const roundedTime = time - diff;
return timeToLocal(roundedTime) as UTCTimestamp
    }

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
    })), [entriesTrades])

    useEffect(() => {
        const {from: fromDate} = fromTo('-0.5d', new Date(from));
        const {to: toDate} = fromTo('0.5d', new Date(to));
        // const fromNum = new Date(from).getTime() / 1000 - currentTimeframe * 10;
        //     let toNum = new Date(to).getTime() / 1000 + currentTimeframe * 9;
        api.instruments.getHistory({
            symbol,
            exchange: "MOEX",
            // @ts-ignore
            tf: currentTimeframe,
            from: fromDate,
            to: toDate,
        }).then(r => setData(r.history)); // .map(c => [c.time, c.open, c.high, c.low, c.close])))
    }, [symbol, api, from, to]);

    return <TVChart seriesType="candlestick" markers={markers} data={data.map(d => ({...d, time: timeToLocal(d.time)})) as any[]} digits={digits} colors={colors}/>
}

export default Chart;