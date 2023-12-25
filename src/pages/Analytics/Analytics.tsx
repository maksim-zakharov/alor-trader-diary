import TVChart from "../../common/TVChart";
import React, {FC, useEffect, useMemo, useState} from "react";
import {AlorApi, Exchange} from "alor-api";
import {Time, WhitespaceData} from "lightweight-charts";
import * as moment from "moment";
import {List, Space, Typography} from "antd";
import * as Highcharts from "highcharts";
import HighchartsReact from 'highcharts-react-official'
import {selectOptions, selectOptionsMap} from "../../App";
import {useSearchParams} from "react-router-dom";
import {moneyFormat} from "../../common/utils";
import ProfitIntervalWidget from "./widgets/ProfitIntervalWidget";
import {durationLabels} from "../../utils";
import LossIntervalWidget from "./widgets/LossIntervalWidget";

interface IProps{
    balanceSeriesData: any
    data: any;
    api: AlorApi;
    dateFrom: any;
}

const Analytics: FC<IProps> = ({data, api, dateFrom}) => {
    const [settings, setSettings] = useState<{token: string, portfolio: string}>(JSON.parse(localStorage.getItem('settings') || '{}'));
    const [reasons, setReasons] = useState<{[id: string]: string}>(JSON.parse(localStorage.getItem('reasons') || '{}'));

    const [nightMode] = useState(Boolean(localStorage.getItem('night') === 'true'));

    const [balanceSeriesData, setData] = useState([]);

    const darkColors = {
        backgroundColor: 'rgb(30,44,57)',
        color: 'rgb(166,189,213)',
        borderColor: 'rgb(44,60,75)'
    }

    useEffect(() => {
        if(api && settings.portfolio){
            api.clientInfo.getEquityDynamics({
                startDate: dateFrom,
                endDate: moment().format('YYYY-MM-DD'),
                portfolio: settings.portfolio?.replace('D', '')
            }).then(res => setData(res.portfolioValues.map(v => ({time: moment(v.date).format('YYYY-MM-DD'), value: v.value}))))
        }
    }, [api, dateFrom]);

    const nonSummaryPositions = useMemo(() => data.positions.filter(p => p.type !== 'summary'), [data.positions]);

    const reasonPnlMap: {[reason: string]: number} = useMemo(() => nonSummaryPositions.reduce((acc, curr) => ({...acc, [reasons[curr.id]]: (acc[reasons[curr.id]] || 0) +  curr.PnL  }), {} as {[reason: string]: number}), [nonSummaryPositions, reasons])

    const reasonCategories = useMemo(() => Object.entries(reasonPnlMap).sort((a, b) => a[1] - b[1]), [reasonPnlMap])

    const reasonSeries: Highcharts.SeriesOptionsType[] = useMemo(() => [{
        data: reasonCategories.map(([key]) => Math.floor(reasonPnlMap[key]))
    } as Highcharts.SeriesOptionsType], [reasonPnlMap, reasonCategories]);

    const symbolPnlMap: {[reason: string]: number} = useMemo(() => nonSummaryPositions.reduce((acc, curr) => ({...acc, [curr.symbol]: (acc[curr.symbol] || 0) +  curr.PnL  }), {} as {[reason: string]: number}), [nonSummaryPositions, reasons])

    const symbolCategories = useMemo(() => Object.entries(symbolPnlMap).sort((a, b) => a[1] - b[1]), [symbolPnlMap])

    const symbolSeries: any = useMemo(() => [{
        data: symbolCategories.map(([key]) => [Math.floor(symbolPnlMap[key])])
    }], [symbolPnlMap, symbolCategories]);

    const reasonOptions: Highcharts.Options = {
        chart: {
            type: 'bar',
            backgroundColor: nightMode && darkColors.backgroundColor,
        },
        title: null,
        xAxis: {
            categories: reasonCategories.map(([key]) => selectOptionsMap[key]),
            title: {
                text: null
            },
            gridLineColor: nightMode && darkColors.borderColor,
            gridLineWidth: 1,
            lineWidth: 0,
            labels: {
                style: {
                    color: nightMode && darkColors.color
                }
            }
        },
        yAxis: {
            labels: {
                style: {
                    color: nightMode && darkColors.color
                }
            },

            gridLineColor: nightMode && darkColors.borderColor,
        },
        tooltip: {
            valueSuffix: ' millions'
        },
        plotOptions: {
            bar: {
                borderRadius: '50%',
                borderColor: 'transparent',
                dataLabels: {
                    enabled: true
                },
                groupPadding: 0.1
            }
        },
        credits: {
            enabled: false
        },
        legend: {
            enabled: false,
        },
        series: reasonSeries
    }

    const symbolOptions: Highcharts.Options = {
        chart: {
            type: 'column',
            backgroundColor: nightMode && darkColors.backgroundColor,
        },
        title: null,
        xAxis: {
            categories: symbolCategories.map(([key]) => key),
            title: {
                text: null
            },
            gridLineColor: nightMode && darkColors.borderColor,
            gridLineWidth: 1,
            lineWidth: 0,
            labels: {
                style: {
                    color: nightMode && darkColors.color
                }
            }
        },
        yAxis: {
            labels: {
                style: {
                    color: nightMode && darkColors.color
                }
            },

            gridLineColor: nightMode && darkColors.borderColor,
        },
        plotOptions: {
            column: {
                negativeColor: "rgb(255,117,132)",
                color: "rgb(19,193,123)",
                // colors: {
                //     ranges: [
                //         {
                //             from: -Infinity, // Any value less than this will be red
                //             to: 0,
                //             color: "#e85347" // Red color
                //         },
                //         {
                //             from: 0,
                //             to: Infinity, // Any value greater than this will be green
                //             color: "#1ee0ac" // Green color
                //         }
                //     ]
                // },
                borderColor: 'transparent',
                dataLabels: {
                    enabled: true
                },
                // color: 'rgb(51,111,238)',
                groupPadding: 0.1
            }
        },
        credits: {
            enabled: false
        },
        legend: {
            enabled: false,
        },
        series: symbolSeries
    }

    return <>
        <div className="widget">
            <div className="widget_header">Equity</div>
            <TVChart colors={nightMode && darkColors} seriesType="baseLine" data={balanceSeriesData}/>
        </div>
        {/*<div className="widget">*/}
        {/*    <div className="widget_header">Reasons</div>*/}
        {/*    <HighchartsReact*/}
        {/*        highcharts={Highcharts}*/}
        {/*        options={reasonOptions}*/}
        {/*    />*/}
        {/*</div>*/}
        <div style={{display: 'flex'}}>
            <ProfitIntervalWidget nonSummaryPositions={nonSummaryPositions}/>
            <LossIntervalWidget nonSummaryPositions={nonSummaryPositions}/>
        </div>
        <div className="widget">
            <div className="widget_header">Symbols</div>
            <HighchartsReact
                highcharts={Highcharts}
                options={symbolOptions}
            />
        </div>
        </>
}

export default Analytics;