import TVChart from "../common/TVChart";
import React, {FC, useEffect, useMemo, useState} from "react";
import {AlorApi, Exchange} from "alor-api";
import {Time, WhitespaceData} from "lightweight-charts";
import * as moment from "moment";
import {Typography} from "antd";
import * as Highcharts from "highcharts";
import HighchartsReact from 'highcharts-react-official'
import {selectOptions, selectOptionsMap} from "../App";

interface IProps{
    balanceSeriesData: any
    data: any
}

const Analytics: FC<IProps> = ({data, balanceSeriesData}) => {
    const [settings, setSettings] = useState<{token: string, portfolio: string}>(JSON.parse(localStorage.getItem('settings') || '{}'));
    const [reasons, setReasons] = useState<{[id: string]: string}>(JSON.parse(localStorage.getItem('reasons') || '{}'));


    const [nightMode] = useState(Boolean(localStorage.getItem('night') === 'true'));


    const darkColors = {
        backgroundColor: 'rgb(30,44,57)',
        color: 'rgb(166,189,213)',
        borderColor: 'rgb(44,60,75)'
    }

    const nonSummaryPositions = useMemo(() => data.positions.filter(p => p.type !== 'summary'), [data.positions]);

    const reasonPnlMap: {[reason: string]: number} = useMemo(() => nonSummaryPositions.reduce((acc, curr) => ({...acc, [reasons[curr.id]]: (acc[reasons[curr.id]] || 0) +  curr.PnL  }), {} as {[reason: string]: number}), [nonSummaryPositions, reasons])

    const reasonCategories = useMemo(() => Object.entries(reasonPnlMap).sort((a, b) => a[1] - b[1]), [reasonPnlMap])

    const reasonSeries: Highcharts.SeriesOptionsType[] = useMemo(() => [{
        data: reasonCategories.map(([key]) => Math.floor(reasonPnlMap[key]))
    } as Highcharts.SeriesOptionsType], [reasonPnlMap, reasonCategories]);

    const symbolPnlMap: {[reason: string]: number} = useMemo(() => nonSummaryPositions.reduce((acc, curr) => ({...acc, [curr.symbol]: (acc[curr.symbol] || 0) +  curr.PnL  }), {} as {[reason: string]: number}), [nonSummaryPositions, reasons])

    const symbolCategories = useMemo(() => Object.entries(symbolPnlMap).sort((a, b) => a[1] - b[1]), [symbolPnlMap])

    const symbolSeries: Highcharts.SeriesOptionsType[] = useMemo(() => [{
        data: symbolCategories.map(([key]) => Math.floor(symbolPnlMap[key]))
    } as Highcharts.SeriesOptionsType], [symbolPnlMap, reasonCategories]);

    const reasonOptions: Highcharts.Options = {
        chart: {
            type: 'bar',
            backgroundColor: nightMode && darkColors.backgroundColor,
        },
        title: {
            style: {

                color: nightMode && darkColors.color
            },
            text: 'Reasons',
            align: 'left',
        },
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
            type: 'bar',
            backgroundColor: nightMode && darkColors.backgroundColor,
        },
        title: {
            style: {

                color: nightMode && darkColors.color
            },
            text: 'Symbols',
            align: 'left',
        },
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
        series: symbolSeries
    }

    return <>
        <Typography.Title>Equity</Typography.Title>
        <TVChart colors={nightMode && darkColors} seriesType="line" data={balanceSeriesData}/>
        <HighchartsReact
            highcharts={Highcharts}
            options={reasonOptions}
        />
        <HighchartsReact
            highcharts={Highcharts}
            options={symbolOptions}
        />
        </>
}

export default Analytics;