import React, {CSSProperties, FC, useEffect, useRef} from "react";
import {
    CandlestickData,
    ColorType,
    createChart,
    SeriesMarker,
    Time,
    WhitespaceData
} from "lightweight-charts";

interface IProps{
    data:(CandlestickData<Time> | WhitespaceData<Time>)[];
    markers?: SeriesMarker<Time>[];
    colors?: Pick<CSSProperties, 'backgroundColor' | 'color' | 'borderColor'>
    seriesType: 'candlestick' | 'line'
}

const TVChart: FC<IProps> = ({colors, seriesType, data, markers}) => {

    const {
        backgroundColor = 'white', // 'rgb(30,44,57)
        color = 'black', // 'rgb(166,189,213)'
        borderColor = 'grey'
    } = (colors || {})

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
                        color: borderColor
                    },

                    horzLines: {
                        color: borderColor
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

            let series;

            if(seriesType === 'candlestick'){
                series = chart.addCandlestickSeries({
                    wickColor: '#000',
                    downColor: 'rgb(255,117,132)',
                    borderDownColor: 'rgb(255,117,132)',
                    upColor: 'rgb(19,193,123)',
                    borderUpColor: 'rgb(19,193,123)',
                });
            }

            if(seriesType === 'line') {
                series = chart.addLineSeries()
            }

            series?.setData(data);

            if(markers){
                series?.setMarkers(markers);
            }

            window.addEventListener('resize', handleResize);

            return () => {
                window.removeEventListener('resize', handleResize);

                chart.remove();
            };
        },
        [data, backgroundColor, color, chartContainerRef.current, markers, seriesType]
    );

    return <div
        ref={chartContainerRef}
    />
}

export default TVChart;