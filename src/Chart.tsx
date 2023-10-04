import React, {FC, useEffect, useState} from 'react'
import { render } from 'react-dom'
import * as Highcharts from "highcharts/highstock";
import HighchartsReact from 'highcharts-react-official'
import {useApi} from "./useApi";
import {AlorApi, HistoryObject, Timeframe} from "alor-api";

interface IProps{
    symbol: string;
    api: AlorApi
    from: string;
    to: string;
    trades: any[]
}

const Chart: FC<IProps> = ({symbol, api, from, to, trades}) => {

    const [data, setData] = useState<number[][]>([]);
console.log(data)

    useEffect(() => {
        const fromNum = new Date(from).getTime() / 1000;
            let toNum = new Date(to).getTime() / 1000;
        if(fromNum - toNum < 3600){
            toNum = fromNum + 3600;
        }
        api.instruments.getHistory({
            symbol,
            exchange: "MOEX",
            // @ts-ignore
            tf: Timeframe.Min5,
            from: fromNum,
            to:toNum,
        }).then(r => setData(r.history.map(c => [c.time, c.open, c.high, c.low, c.close])))
    }, [symbol, api, from, to]);

    const options = {
        chart: {
            // backgroundColor: "#1c1b2b",
            borderRadius: 15,
            height: 400,
        },

        title: null,

        series: [
            {
                type: "candlestick",
                name: "Bitcoin Candlestick",
                id: "bitcoin",
                data,
            },
            // {
            //     type: "heikinashi",
            //     name: "Bitcoin Heikin",
            //     id: "bitcoinheikin",
            //     data,
            //     yAxis: 1,
            // },
        ],

        annotations: [{
            labels: trades.map((t, i) => ({
                point: {
                    x: i,
                        y: t.price
                },
                text: '1'
            })),
        }],

        rangeSelector: {
            buttons: [
                {
                    type: "month",
                    count: 1,
                    text: "1m",
                    title: "View 1 month",
                },
                {
                    type: "month",
                    count: 4,
                    text: "4m",
                    title: "View 4 months",
                },
                {
                    type: "month",
                    count: 8,
                    text: "8m",
                    title: "View 8 months",
                },
                {
                    type: "ytd",
                    text: "YTD",
                    title: "View year to date",
                },
                {
                    type: "all",
                    count: 1,
                    text: "All",
                    title: "View All",
                },
            ],
            // buttonTheme: {
            //     // styles for the buttons
            //     fill: "none",
            //     stroke: "none",
            //     "stroke-width": 0,
            //     r: 8,
            //     style: {
            //         color: "#4F6C89",
            //         fontWeight: "bold",
            //     },
            //     states: {
            //         hover: {},
            //         select: {
            //             fill: "transparent",
            //             style: {
            //                 color: "#D76F2A",
            //             },
            //         },
            //     },
            // },
            // inputBoxBorderColor: "#4F6C89",
            // inputBoxWidth: 110,
            // inputBoxHeight: 18,
            // inputStyle: {
            //     color: "#4F6C89",
            //     fontWeight: "bold",
            // },
            // labelStyle: {
            //     color: "#cbd1d6",
            //     fontWeight: "bold",
            // },
            // selected: 5,
        },

        plotOptions: {
            line: {
                dashStyle: "dash",
            },
            series: {
                borderColor: "red",
                marker: {
                    enabled: false,
                    radius: 0,
                },
            },
            candlestick: {
                lineColor: "rgba(187,51,64)",
                color: "rgba(187,51,64)",
                upColor: "rgba(11,162,100)",
                upLineColor: "rgba(11,162,100)",
            },
            // heikinashi: {
            //     lineColor: "#FB1809",
            //     color: "#FB1809",
            //     upColor: "#4EA64A",
            //     upLineColor: "#4EA64A",
            // },
            //
            // sma: {
            //     lineWidth: 1,
            // },
        },

        xAxis: {
            lineWidth: 0.1,
            // tickColor: "#1c1b2b",
            // crosshair: {
            //     color: "#696777",
            //     dashStyle: "dash",
            // },
        },

        yAxis: [
            {
                labels: {
                    align: "right",
                    x: -2,
                },
                height: "100%",
                // crosshair: {
                //     dashStyle: "dash",
                //     color: "#696777",
                // },

                resize: {
                    enabled: true,
                    lineWidth: 2,
                    lineColor: "#1d1c30",
                },
                // gridLineColor: "#201d3a",
                lineWidth: 0,
                visible: true,
            },
            // {
            //     labels: {
            //         align: "right",
            //         x: -3,
            //     },
            //     top: "50%",
            //     height: "50%",
            //     offset: 0,
            //     lineWidth: 0,
            //     crosshair: false,
            //     gridLineColor: "#201d3a",
            //     visible: true,
            // },
        ],

        // tooltip: {
        //     shape: "rect",
        //     split: true,
        //     valueDecimals: 2,
        //
        //     positioner: function (width, height, point) {
        //         var chart = this.chart,
        //             position;
        //
        //         if (point.isHeader) {
        //             position = {
        //                 x: Math.max(
        //                     // Left side limit
        //                     0,
        //                     Math.min(
        //                         point.plotX + chart.plotLeft - width / 2,
        //                         // Right side limit
        //                         chart.chartWidth - width - chart.marginRight
        //                     )
        //                 ),
        //                 y: point.plotY,
        //             };
        //         } else {
        //             position = {
        //                 x: point.series.chart.plotLeft,
        //                 y: point.series.yAxis.top - chart.plotTop,
        //             };
        //         }
        //
        //         return position;
        //     },
        // },

        stockTools: {
            gui: {
                enabled: false,
            },
        },

        navigator: {
            enabled: false,
            // height: 50,
            // margin: 10,
            // outlineColor: "#8380a5",
            // handles: {
            //     backgroundColor: "#8380a5",
            //     borderColor: "#e9d5d5",
            // },
            // xAxis: {
            //     gridLineColor: "#8380a5",
            // },
        },

        scrollbar: {
            // barBackgroundColor: "#8380a5",
            // barBorderColor: "#8380a5",
            // barBorderRadius: 8,
            // buttonArrowColor: "#fff",
            // buttonBackgroundColor: "#405466",
            // rifleColor: "#fff",
            // trackBackgroundColor: "#e9d5d5",
        },

        credits: {
            enabled: false,
        },
    }

    return <HighchartsReact
        highcharts={Highcharts}
        options={options}
    />
}

export default Chart;