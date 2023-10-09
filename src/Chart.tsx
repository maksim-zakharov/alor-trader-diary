import React, {CSSProperties, FC, useEffect, useMemo, useRef, useState} from 'react'
import {AlorApi, HistoryObject, Side, Timeframe} from "alor-api";
import {ColorType, createChart, SeriesMarker, Time, UTCTimestamp} from "lightweight-charts";
import TVChart from "./common/TVChart";

interface IProps{
    symbol: string;
    api: AlorApi
    from: string;
    to: string;
    trades: any[]
    colors?: Pick<CSSProperties, 'backgroundColor' | 'color' | 'borderColor'>
}

function timeToLocal(originalTime: number) {
    const d = new Date(originalTime * 1000);
    return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes(), d.getSeconds(), d.getMilliseconds()) / 1000;
}

const Chart: FC<IProps> = ({symbol, api, from, to, trades, colors = {}}) => {

    const currentTimeframe = Timeframe.Min5 * 2;

    const [data, setData] = useState<HistoryObject[]>([]);


    const markers: SeriesMarker<Time>[] = useMemo(() => trades.map(t => ({
        time: timeToLocal(new Date(t.date).getTime() / 1000) - currentTimeframe as UTCTimestamp,
        position: t.side === Side.Buy ? 'belowBar' : 'aboveBar',
        color: t.side === Side.Buy ? 'rgb(19,193,123)' : 'rgb(255,117,132)',
        shape: t.side === Side.Buy ? 'arrowUp' : 'arrowDown',
        // size: t.volume,
        id: t.id,
        text: `${t.side === Side.Buy ? 'Buy' : 'Sell'} ${t.qty} lots by ${t.price}`
    })), [trades])

    useEffect(() => {
        const fromNum = new Date(from).getTime() / 1000 - currentTimeframe * 2;
            let toNum = new Date(to).getTime() / 1000 + currentTimeframe * 9;
        api.instruments.getHistory({
            symbol,
            exchange: "MOEX",
            // @ts-ignore
            tf: currentTimeframe,
            from: fromNum,
            to: Math.floor(toNum),
        }).then(r => setData(r.history)); // .map(c => [c.time, c.open, c.high, c.low, c.close])))
    }, [symbol, api, from, to]);

    return <TVChart seriesType="candlestick" markers={markers} data={data.map(d => ({...d, time: timeToLocal(d.time)})) as any[]} colors={colors}/>
}

export default Chart;