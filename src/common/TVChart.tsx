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
    seriesType: 'candlestick' | 'line' | 'baseLine'
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
                    downColor: 'rgba(var(--table-loss-color),1)',
                    borderDownColor: 'rgba(var(--table-loss-color),1)',
                    upColor: 'rgba(var(--table-profit-color),1)',
                    borderUpColor: 'rgba(var(--table-profit-color),1)',
                });
            }

            if(seriesType === 'line') {
                series = chart.addLineSeries({
                    color: 'rgb(51,111,238)'
                })
            }

            if(seriesType === 'baseLine') {
                series = chart.addBaselineSeries({
                    // priceLineColor: 'rgb(51,111,238)',
                    // crosshairMarkerBackgroundColor: 'rgb(51,111,238)',
                    topFillColor1: 'rgb(51,111,238, 0.7)',
                    topFillColor2: 'rgba(51,111,238, 0.1)',
                    topLineColor: 'rgb(51,111,238)',
                    // bottomFillColor1: 'rgb(51,111,238)',
                    // bottomLineColor: 'rgb(51,111,238)',
                    // bottomFillColor2: 'rgb(51,111,238)',
                })
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