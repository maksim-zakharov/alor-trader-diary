import React, {CSSProperties, FC, useEffect, useRef, useState} from 'react'
import {AlorApi, HistoryObject, Side, Timeframe} from "alor-api";
import {ColorType, createChart, SeriesMarker, Time, UTCTimestamp} from "lightweight-charts";

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

    const {
        backgroundColor = 'white', // 'rgb(30,44,57)
        color = 'black', // 'rgb(166,189,213)'
    } = colors

    const chartContainerRef = useRef<any>();

    useEffect(
        () => {
            const handleResize = () => {
                chart.applyOptions({ width: chartContainerRef.current.clientWidth });
            };

            const chart = createChart(chartContainerRef.current, {
                timeScale: {
                    visible: true,
                    timeVisible: true,
                    secondsVisible: true
                },
                localization: {
                    locale: 'ru-RU',
                },
                leftPriceScale: {
                    visible: true,
                },
                rightPriceScale: {
                    visible: false
                },
                grid: {
                    vertLines: {
                        color: colors.borderColor
                    },

                    horzLines: {
                        color: colors.borderColor
                    }
                },
                layout: {
                    background: { type: ColorType.Solid, color: backgroundColor },
                    textColor: color,
                },
                width: chartContainerRef!.current.clientWidth,
                height: 400,
            });
            chart.timeScale().fitContent();

            const candlestickSeries = chart.addCandlestickSeries({
                wickColor: '#000',
                downColor: 'rgb(255,117,132)',
                borderDownColor: 'rgb(255,117,132)',
                upColor: 'rgb(19,193,123)',
                borderUpColor: 'rgb(19,193,123)',
            });
            candlestickSeries.setData(data.map(d => ({...d, time: timeToLocal(d.time)})) as any[]);

            const markers: SeriesMarker<Time>[] = trades.map(t => ({
                time: timeToLocal(new Date(t.date).getTime() / 1000) - currentTimeframe as UTCTimestamp,
                position: t.side === Side.Buy ? 'belowBar' : 'aboveBar',
                    color: t.side === Side.Buy ? 'rgb(19,193,123)' : 'rgb(255,117,132)',
                    shape: t.side === Side.Buy ? 'arrowUp' : 'arrowDown',
                // size: t.volume,
                id: t.id,
                text: `${t.side === Side.Buy ? 'Buy' : 'Sell'} ${t.qty} lots by ${t.price}`
            }));
            candlestickSeries.setMarkers(markers);

            window.addEventListener('resize', handleResize);

            return () => {
                window.removeEventListener('resize', handleResize);

                chart.remove();
            };
        },
        [data, backgroundColor, color, chartContainerRef.current, trades]
    );

    useEffect(() => {
        const fromNum = new Date(from).getTime() / 1000 - currentTimeframe * 2;
            let toNum = new Date(to).getTime() / 1000 + currentTimeframe * 9;
        api.instruments.getHistory({
            symbol,
            exchange: "MOEX",
            // @ts-ignore
            tf: currentTimeframe,
            from: fromNum,
            to:toNum,
        }).then(r => setData(r.history)); // .map(c => [c.time, c.open, c.high, c.low, c.close])))
    }, [symbol, api, from, to]);

    return <div
        ref={chartContainerRef}
    />
}

export default Chart;