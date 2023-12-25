import TVChart from "../common/TVChart";
import React, {FC, useEffect, useMemo, useState} from "react";
import {AlorApi, Exchange} from "alor-api";
import {Time, WhitespaceData} from "lightweight-charts";
import * as moment from "moment";
import {List, Space, Typography} from "antd";
import * as Highcharts from "highcharts";
import HighchartsReact from 'highcharts-react-official'
import {selectOptions, selectOptionsMap} from "../App";
import {useSearchParams} from "react-router-dom";
import {moneyFormat} from "../common/utils";

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

    const profitPositions =  useMemo(() => nonSummaryPositions.filter(p => p.PnL > 0), [nonSummaryPositions]);
    const lossPositions =  useMemo(() => nonSummaryPositions.filter(p => p.PnL <= 0), [nonSummaryPositions]);

    const profitMap = useMemo(() => Object.entries(profitPositions.reduce((acc, curr) => {
        if(!acc['seconds']){
            acc['seconds'] = {PnL: 0, count: 0};
        }
        if(!acc['5min']){
            acc['5min'] = {PnL: 0, count: 0};
        }
        if(!acc['1hour']){
            acc['1hour'] = {PnL: 0, count: 0};
        }
        if(!acc['hours']){
            acc['hours'] = {PnL: 0, count: 0};
        }
        if(curr.duration < 60) {
            acc['seconds'].PnL += curr.PnL;
            acc['seconds'].count++;
        } else if (curr.duration >= 60 && curr.duration < 300){
            acc['5min'].PnL += curr.PnL;
            acc['5min'].count++;
        } else if (curr.duration >= 300 && curr.duration < 3600){
            acc['1hour'].PnL += curr.PnL;
            acc['1hour'].count++;
        } else {
            acc['hours'].PnL += curr.PnL;
            acc['hours'].count++;
        }
        return acc;
        // @ts-ignore
    }, {} as {[key: string]: number})).sort((a, b) => b[1].count - a[1].count), [profitPositions]);

    const lossMap = useMemo(() => Object.entries(lossPositions.reduce((acc, curr) => {
        if(!acc['seconds']){
            acc['seconds'] = {PnL: 0, count: 0};
        }
        if(!acc['5min']){
            acc['5min'] = {PnL: 0, count: 0};
        }
        if(!acc['1hour']){
            acc['1hour'] = {PnL: 0, count: 0};
        }
        if(!acc['hours']){
            acc['hours'] = {PnL: 0, count: 0};
        }
        if(curr.duration < 60) {
            acc['seconds'].PnL += curr.PnL;
            acc['seconds'].count++;
        } else if (curr.duration >= 60 && curr.duration < 300){
            acc['5min'].PnL += curr.PnL;
            acc['5min'].count++;
        } else if (curr.duration >= 300 && curr.duration < 3600){
            acc['1hour'].PnL += curr.PnL;
            acc['1hour'].count++;
        } else {
            acc['hours'].PnL += curr.PnL;
            acc['hours'].count++;
        }
        return acc;
        // @ts-ignore
    }, {} as {[key: string]: number})).sort((a, b) => b[1].count - a[1].count), [lossPositions]);

    const durationLabels = {
        seconds: 'До 1 минуты',
        '5min': 'От 1 до 5 минут',
        '1hour': 'От 5 минут до 1 часа',
        'hours': 'Более часа',
    }

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
            <div className="widget">
                <div className="widget_header">Profit intervals</div>
                <List
                    itemLayout="horizontal"
                    dataSource={profitMap}
                    renderItem={(item: any) => (
                        <List.Item
                            actions={[<div style={{color: 'rgb(44,232,156)'}}>{moneyFormat(item[1].PnL)} ({item[1].count} trades)</div>]}
                        >
                            {durationLabels[item[0]]}
                        </List.Item>
                    )}
                />
            </div>
            <div className="widget">
                <div className="widget_header">Loss intervals</div>
                <List
                    itemLayout="horizontal"
                    dataSource={lossMap}
                    renderItem={(item: any) => (
                        <List.Item
                            actions={[<div style={{color: 'rgb( 255,117,132)'}}>{moneyFormat(item[1].PnL)} ({item[1].count} trades)</div>]}
                        >
                            {durationLabels[item[0]]}
                        </List.Item>
                    )}
                />
            </div>
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