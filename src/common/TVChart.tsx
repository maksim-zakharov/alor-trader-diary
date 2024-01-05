import React, {CSSProperties, FC, useEffect, useRef} from "react";
import {
    CandlestickData,
    ColorType,
    createChart, CrosshairMode, LineStyle,
    SeriesMarker,
    Time,
    WhitespaceData
} from "lightweight-charts";
import {shortNumberFormat} from "./utils";
import moment from 'moment';

interface IProps{
    data:(CandlestickData<Time> | WhitespaceData<Time>)[];
    markers?: SeriesMarker<Time>[];
    colors?: Pick<CSSProperties, 'backgroundColor' | 'color' | 'borderColor'>
    seriesType: 'candlestick' | 'line' | 'baseLine',
    formatTime?: string
    digits?: number
}

const TVChart: FC<IProps> = ({colors, seriesType, digits, data, markers, formatTime}) => {

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
                    secondsVisible: true,
                },
                localization: {
                    locale: 'ru-RU',
                    priceFormatter: v => shortNumberFormat(v, digits, digits),
                    timeFormatter: formatTime && function(businessDayOrTimestamp) {

                        // if (LightweightCharts.isBusinessDay(businessDayOrTimestamp)) {
                        //     return 'Format for business day';
                        // }

                        return moment(businessDayOrTimestamp).format(formatTime);
                    },
                },
                crosshair: {
                    mode: CrosshairMode.Normal,
                },
                rightPriceScale: {
                    ticksVisible: true,
                    visible: true,
                },
                leftPriceScale: {
                    visible: false,
                },
                grid: {
                    vertLines: {
                        color: borderColor,
                    },

                    horzLines: {
                        color: borderColor,
                    }
                },
                layout: {
                    // Фон
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
                    downColor: 'rgb(157, 43, 56)',
                    borderDownColor: 'rgb(213, 54, 69)',
                    upColor: 'rgb(20, 131, 92)',
                    borderUpColor: 'rgb(11, 176, 109)',
                    wickUpColor: 'rgb(11, 176, 109)',
                    wickDownColor: 'rgb(213, 54, 69)',
                    lastValueVisible: false,
                    priceLineVisible: false,
                });
            }

            if(seriesType === 'line') {
                series = chart.addLineSeries({
                    color: 'rgba(51,111,238,1)'
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
                const firstBuy: any = markers.find(p => p.position === 'belowBar');
                const firstSell: any = markers.find(p => p.position === 'aboveBar');

                series.createPriceLine({
                    price: firstBuy.value,
                    color: 'rgb(20, 131, 92)',
                    lineWidth: 1,
                    lineStyle: LineStyle.SparseDotted,
                    axisLabelVisible: true,
                    // title: 'maximum price',
                });

                series.createPriceLine({
                    price: firstSell.value,
                    color: 'rgb(157, 43, 56)',
                    lineWidth: 1,
                    lineStyle: LineStyle.SparseDotted,
                    axisLabelVisible: true,
                    // title: 'maximum price',
                });

                var buySeries = chart.addLineSeries({
                    color: 'rgba(255, 255, 255, 0)', // hide or show the line by setting opacity
                    lineVisible: false,
                    lastValueVisible: false, // hide value from y axis
                    priceLineVisible: false
                });

                const buyMarkers = markers.filter(p => p.position === 'belowBar')

                buySeries.setData(Object.values(buyMarkers.reduce((acc, curr) => ({...acc, [curr.time as any]: curr}), {})));

                buySeries.setMarkers(buyMarkers);

                var sellSeries = chart.addLineSeries({
                    color: 'rgba(255, 255, 255, 0)', // hide or show the line by setting opacity
                    lineVisible: false,
                    lastValueVisible: false, // hide value from y axis
                    priceLineVisible: false
                });

                const sellMarkers = markers.filter(p => p.position === 'aboveBar')

                sellSeries.setData(Object.values(sellMarkers.reduce((acc, curr) => ({...acc, [curr.time as any]: curr}), {})));

                sellSeries.setMarkers(sellMarkers);
            }

            window.addEventListener('resize', handleResize);

            return () => {
                window.removeEventListener('resize', handleResize);

                chart.remove();
            };
        },
        [data, backgroundColor, color, chartContainerRef.current, markers, seriesType, digits]
    );

    return <div
        ref={chartContainerRef}
    />
}

export default TVChart;