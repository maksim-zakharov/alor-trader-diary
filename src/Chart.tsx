import React, {FC, useEffect, useRef, useState} from 'react'
import {AlorApi, HistoryObject, Side, Timeframe} from "alor-api";
import {ColorType, createChart, SeriesMarker, Time, UTCTimestamp} from "lightweight-charts";

interface IProps{
    symbol: string;
    api: AlorApi
    from: string;
    to: string;
    trades: any[]
}

function timeToLocal(originalTime: number) {
    const d = new Date(originalTime * 1000);
    return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes(), d.getSeconds(), d.getMilliseconds()) / 1000;
}

const Chart: FC<IProps> = ({symbol, api, from, to, trades}) => {

    const [data, setData] = useState<HistoryObject[]>([]);

    const {
        backgroundColor = 'white',
        lineColor = '#2962FF',
        textColor = 'black',
        areaTopColor = '#2962FF',
        areaBottomColor = 'rgba(41, 98, 255, 0.28)',
    } = {}

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
                    // timeFormatter: (originalTime, timeZone) => {
                    //     console.log(originalTime)
                    //     const zonedDate = new Date(new Date(originalTime * 1000).toLocaleString('ru-RU', { timeZone }));
                    //     return moment(zonedDate).format('HH:mm'); //  zonedDate.getTime() / 1000;
                    // }
                },
                leftPriceScale: {
                    visible: true,
                },
                rightPriceScale: {
                    visible: false
                },
                layout: {
                    background: { type: ColorType.Solid, color: backgroundColor },
                    textColor,
                },
                width: chartContainerRef!.current.clientWidth,
                height: 400,
            });
            chart.timeScale().fitContent();

            const candlestickSeries = chart.addCandlestickSeries();
            candlestickSeries.setData(data.map(d => ({...d, time: timeToLocal(d.time)})) as any[]);

            const markers: SeriesMarker<Time>[] = trades.map(t => ({
                time: timeToLocal(new Date(t.date).getTime() / 1000) as UTCTimestamp,
                position: t.side === Side.Buy ? 'belowBar' : 'aboveBar',
                    color: t.side === Side.Buy ? '#26a69a' : '#ef5350',
                    shape: t.side === Side.Buy ? 'arrowUp' : 'arrowDown',
                // size: t.volume,
                id: t.id,
                text: `${t.side === Side.Buy ? 'Buy' : 'Sell'} ${t.qty} lots`
            }));
            candlestickSeries.setMarkers(markers);

            window.addEventListener('resize', handleResize);

            return () => {
                window.removeEventListener('resize', handleResize);

                chart.remove();
            };
        },
        [data, backgroundColor, lineColor, textColor, areaTopColor, areaBottomColor, chartContainerRef.current, trades]
    );

    useEffect(() => {
        const fromNum = new Date(from).getTime() / 1000 - Timeframe.Min5 * 10;
            let toNum = new Date(to).getTime() / 1000 + Timeframe.Min5 * 10;
        api.instruments.getHistory({
            symbol,
            exchange: "MOEX",
            // @ts-ignore
            tf: Timeframe.Min5,
            from: fromNum,
            to:toNum,
        }).then(r => setData(r.history)); // .map(c => [c.time, c.open, c.high, c.low, c.close])))
    }, [symbol, api, from, to]);

    return <div
        ref={chartContainerRef}
    />
}

export default Chart;