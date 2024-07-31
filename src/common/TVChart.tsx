import React, {CSSProperties, FC, useEffect, useMemo, useRef} from "react";
import {
    CandlestickData,
    ColorType,
    createChart, CrosshairMode, LineStyle, PriceScaleMode,
    SeriesMarker,
    Time,
    WhitespaceData
} from "lightweight-charts";
import {moneyFormat, shortNumberFormat} from "./utils";
import moment from 'moment';
import {numberToPercent} from "../utils";

interface IProps{
    data:(CandlestickData<Time> | WhitespaceData<Time>)[];
    markers?: SeriesMarker<Time>[];
    colors?: Pick<CSSProperties, 'backgroundColor' | 'color' | 'borderColor'>
    seriesType: 'candlestick' | 'line' | 'baseLine',
    formatTime?: string
    digits?: number
    balance?: number
    shortNumber?: boolean;
    lotSize?: number
}

const TVChart: FC<IProps> = ({lotSize, balance, colors, seriesType, shortNumber, digits, data, markers, formatTime}) => {
const {
        backgroundColor = 'white', // 'rgb(30,44,57)
        color = 'black', // 'rgb(166,189,213)'
        borderColor = 'grey'
    } = (colors || {})

    const chartContainerRef = useRef<any>();

    let priceFormatter = v => new Intl.NumberFormat('en', {
        maximumFractionDigits: digits,
        minimumFractionDigits: digits,
    }).format(v);

    const lastValue = useMemo(() => data.slice(-1)[0],[data]);

    if(shortNumber){
        priceFormatter = v => {
            const format = shortNumberFormat(v, digits, digits);
            // @ts-ignore
            if(lastValue.value === v) {
                // @ts-ignore
                return `${format} (${numberToPercent(lastValue.value / balance)}%)`
            }
            return format
        };
    }

    useEffect(
        () => {
            const handleResize = () => {
                chart.applyOptions({ width: chartContainerRef.current.clientWidth });
            };

            const chart = createChart(chartContainerRef.current, {
                timeScale: {
                    visible: true,
                    timeVisible: true,
                    rightOffset: 0,
                    secondsVisible: true,
                },
                localization: {
                    locale: 'ru-RU',
                    priceFormatter,
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
                series.priceScale().applyOptions({
                    scaleMargins: {
                        top: 0.1, // highest point of the series will be 10% away from the top
                        bottom: 0.4, // lowest point will be 40% away from the bottom
                    },
                });

                const volumeSeries = chart.addHistogramSeries({
                    priceFormat: {
                        type: 'volume',
                    },
                    priceScaleId: '', // set as an overlay by setting a blank priceScaleId
                });
                volumeSeries.priceScale().applyOptions({
                    // set the positioning of the volume series
                    scaleMargins: {
                        top: 0.7, // highest point of the series will be 70% away from the top
                        bottom: 0,
                    },
                });
                volumeSeries?.setData(data.map((d: any) => ({ time: d.time, value: d.volume, color: d.open < d.close ? 'rgb(20, 131, 92)' : 'rgb(157, 43, 56)' })));

                const timeCandleMap = new Map(data.map(d => [d.time, d]));

                const toolTip: any = document.createElement('div');
                toolTip.style =`position: absolute; display: none; z-index: 1000; top: 12px; left: 12px; right: 66px;`;
                    chartContainerRef!.current.appendChild(toolTip);

                // toolTip.innerHTML = '123'
                // update tooltip
                chart.subscribeCrosshairMove(param => {
                    if (
                        param.point === undefined ||
                        !param.time ||
                        param.point.x < 0 ||
                        param.point.x > chartContainerRef!.current.clientWidth ||
                        param.point.y < 0 ||
                        param.point.y > chartContainerRef!.current.clientHeight
                    ) {
                        toolTip.style.display = 'none';
                    } else {
                        // time will be in the same format that we supplied to setData.
                        toolTip.style.display = 'flex';
                        const data = param.seriesData.get(series);
                        // symbol ОТКР МАКС МИН ЗАКР ОБЪЕМ
                        const candle: any = timeCandleMap.get(data.time)

                        toolTip.innerHTML = `ОТКР: ${candle.open} МАКС: ${candle.high} МИН: ${candle.low} ЗАКР: ${candle.close} ОБЪЕМ: ${shortNumberFormat(candle.volume)} ОБЪЕМ (деньги): ${moneyFormat(candle.volume * candle.close * lotSize)}`;

                        toolTip.style.left = '12px';
                        toolTip.style.top = '12px';
                    }
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
                    lineWidth: 1,
                    lineType: 2,
                    topFillColor1: 'rgb(51,111,238, 0.8)',
                    topFillColor2: 'rgba(51,111,238, 0.3)',
                    topLineColor: 'rgb(51,111,238)',
                    // bottomFillColor1: 'rgb(51,111,238)',
                    // bottomLineColor: 'rgb(51,111,238)',
                    // bottomFillColor2: 'rgb(51,111,238)',
                })

                const toolTip: any = document.createElement('div');
                toolTip.style = `background-color: rgba(var(--pro-base-02),1); 
    box-shadow: var(--pro-elevation-shadow-2);
        flex-direction: column;
        align-items: center;
        width: 160px;
    border-radius: 4px; position: absolute; display: none; padding: 8px; box-sizing: border-box; font-size: 12px; text-align: left; z-index: 1000; top: 12px; left: 12px; pointer-events: none; font-family: -apple-system, BlinkMacSystemFont, 'Trebuchet MS', Roboto, Ubuntu, sans-serif; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;`;
                // toolTip.style.background = 'white';
                toolTip.style.color = 'black';
                // toolTip.style.borderColor = '#2962FF';

                const title: any = document.createElement('div');
                title.style = `padding: 4px;
    background-color: rgba(var(--pro-base-04),1);
    border-radius: 2px;
    color: rgba(var(--pro-text-01),1);
    word-wrap: break-word;
    font-size: 13px;
    line-height: 16px;
    font-weight: 500;
    width: 100%;
    letter-spacing: 0;
    text-align: center;
    margin: -4px -4px 0;`

                toolTip.appendChild(title);

                const tooltipContent: any = document.createElement('div');
                tooltipContent.style = `margin-top: 8px;     display: flex;
    flex-direction: row;
    justify-content: space-between;
    white-space: nowrap;
    word-wrap: break-word;
    font-size: 13px;
    letter-spacing: 0;
    line-height: 16px;
    font-feature-settings: "tnum";
    color: rgba(var(--pro-text-01),1);
    line-height: 13px;
    font-weight: 500;
    text-align: center;
    letter-spacing: 0;`

                toolTip.appendChild(tooltipContent);

                chartContainerRef!.current.appendChild(toolTip);
                // update tooltip
                chart.subscribeCrosshairMove(param => {
                    if (
                        param.point === undefined ||
                        !param.time ||
                        param.point.x < 0 ||
                        param.point.x > chartContainerRef!.current.clientWidth ||
                        param.point.y < 0 ||
                        param.point.y > chartContainerRef!.current.clientHeight
                    ) {
                        toolTip.style.display = 'none';
                    } else {
                        const toolTipWidth = 80;
                        const toolTipHeight = 80;
                        const toolTipMargin = 15;
                        // time will be in the same format that we supplied to setData.
                        // thus it will be YYYY-MM-DD
                        const dateStr = param.time;
                        toolTip.style.display = 'flex';
                        const data = param.seriesData.get(series);
                        // @ts-ignore
                        const price = data.value !== undefined ? data.value : data.close;
                        title.innerHTML = moment(dateStr).format('LL, ddd').replaceAll(' г.', ''); // '15 ноября 2023, ср'
                        tooltipContent.innerHTML = moneyFormat(price)
                        price > 0 ?
                        tooltipContent.style.color = `rgba(var(--table-profit-color),1)` : tooltipContent.style.color = `rgba(var(--table-loss-color),1)`

                        const coordinate = series.priceToCoordinate(price);
                        let shiftedCoordinate = param.point.x - 50;
                        if (coordinate === null) {
                            return;
                        }
                        shiftedCoordinate = Math.max(
                            0,
                            Math.min(chartContainerRef!.current.clientWidth - toolTipWidth, shiftedCoordinate)
                        );
                        const coordinateY =
                            coordinate - toolTipHeight - toolTipMargin > 0
                                ? coordinate - toolTipHeight - toolTipMargin
                                : Math.max(
                                    0,
                                    Math.min(
                                        chartContainerRef!.current.clientHeight - toolTipHeight - toolTipMargin,
                                        coordinate + toolTipMargin
                                    )
                                );
                        toolTip.style.left = shiftedCoordinate + 'px';
                        toolTip.style.top = coordinateY + 'px';
                    }
                });
            }

            series?.setData(data);

            if(markers && markers.length > 0){
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
        style={{position: 'relative'}}
        ref={chartContainerRef}
    />
}

export default TVChart;