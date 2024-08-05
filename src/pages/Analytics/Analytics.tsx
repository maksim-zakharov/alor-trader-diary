import React, {FC, useEffect, useMemo, useState} from "react";
import {AlorApi} from "alor-api";
import Highcharts from "highcharts";
import {selectOptionsMap} from "../../App";
import ProfitIntervalWidget from "./widgets/ProfitIntervalWidget";
import LossIntervalWidget from "./widgets/LossIntervalWidget";
import MaxProfitTradesWidget from "./widgets/MaxProfitTradesWidget";
import MaxLossTradesWidget from "./widgets/MaxLossTradesWidget";
import LossTimeWidget from "./widgets/LossTimeWidget";
import ProfitTimeWidget from "./widgets/ProfitTimeWidget";
import SymbolsWidget from "./widgets/SymbolsWidget";
import ReportWidget from "./widgets/ReportWidget";
import ProfitWidget from "./widgets/ProfitWidget";
import ProfitWeekdayWidget from "./widgets/ProfitWeekdayWidget";
import LossWeekdayWidget from "./widgets/LossWeekdayWidget";
import ProfitSectionWidget from "./widgets/ProfitSectionWidget";
import LossSectionWidget from "./widgets/LossSectionWidget";
import Title from "antd/es/typography/Title";
import {useAppDispatch, useAppSelector} from "../../store";
import {updateDarkColors} from "../../api/alor.slice";
import TTitle from "../../common/TTitle";

interface IProps {
    balanceSeriesData: any
    data: any;
    api: AlorApi;
    dateFrom: any;
    isLoading: boolean;
    getListSectionBySymbol: any;
    getIsinBySymbol: any;
}

const Analytics: FC<IProps> = ({getIsinBySymbol, getListSectionBySymbol, data, api, dateFrom, isLoading, balanceSeriesData}) => {
    const [reasons, setReasons] = useState<{
        [id: string]: string
    }>(JSON.parse(localStorage.getItem('reasons') || '{}'));
    const dispatch = useAppDispatch();

    const [nightMode] = useState(true); // Boolean(localStorage.getItem('night') === 'true'));

    const balanceSeriesDataWithoutFirst = useMemo(() => balanceSeriesData.slice(1), [balanceSeriesData]);

    const darkColors = useAppSelector(state => state.alorSlice.darkColors);

    const tradingDays = useMemo(() => data.positions.filter(p => p.type === 'summary'), [data.positions]);
    const nonSummaryPositions: any[] = useMemo(() => data.positions.filter(p => p.type !== 'summary'), [data.positions]);

    const reasonPnlMap: { [reason: string]: number } = useMemo(() => nonSummaryPositions.reduce((acc, curr) => ({
        ...acc,
        [reasons[curr.id]]: (acc[reasons[curr.id]] || 0) + curr.PnL
    }), {} as { [reason: string]: number }), [nonSummaryPositions, reasons])

    const reasonCategories = useMemo(() => Object.entries(reasonPnlMap).sort((a, b) => a[1] - b[1]), [reasonPnlMap])

    const reasonSeries: Highcharts.SeriesOptionsType[] = useMemo(() => [{
        data: reasonCategories.map(([key]) => Math.floor(reasonPnlMap[key]))
    } as Highcharts.SeriesOptionsType], [reasonPnlMap, reasonCategories]);

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

    return <>
        <TTitle>Аналитика</TTitle>
        <div><ProfitWidget isLoading={isLoading} colors={nightMode && darkColors} data={balanceSeriesDataWithoutFirst}
                           initBalance={balanceSeriesData[0]?.value || 0}/></div>
        {/*<div className="widget">*/}
        {/*    <div className="widget_header">Reasons</div>*/}
        {/*    <HighchartsReact*/}
        {/*        highcharts={Highcharts}*/}
        {/*        options={reasonOptions}*/}
        {/*    />*/}
        {/*</div>*/}
        <div style={{display: 'flex', flexWrap: 'wrap', margin: '0 -1px', gap: '16px'}}>
            <ProfitIntervalWidget nonSummaryPositions={nonSummaryPositions} isLoading={isLoading}/>
            <LossIntervalWidget nonSummaryPositions={nonSummaryPositions} isLoading={isLoading}/>
            <MaxProfitTradesWidget getIsinBySymbol={getIsinBySymbol} nonSummaryPositions={nonSummaryPositions} isLoading={isLoading}/>
            <MaxLossTradesWidget getIsinBySymbol={getIsinBySymbol} nonSummaryPositions={nonSummaryPositions} isLoading={isLoading}/>
            <ProfitTimeWidget nonSummaryPositions={nonSummaryPositions} isLoading={isLoading}/>
            <LossTimeWidget nonSummaryPositions={nonSummaryPositions} isLoading={isLoading}/>
            <ProfitWeekdayWidget nonSummaryPositions={nonSummaryPositions} isLoading={isLoading}/>
            <LossWeekdayWidget nonSummaryPositions={nonSummaryPositions} isLoading={isLoading}/>
            <ProfitSectionWidget nonSummaryPositions={nonSummaryPositions} isLoading={isLoading} getListSectionBySymbol={getListSectionBySymbol}/>
            <LossSectionWidget nonSummaryPositions={nonSummaryPositions} isLoading={isLoading} getListSectionBySymbol={getListSectionBySymbol}/>
            <ReportWidget nonSummaryPositions={nonSummaryPositions} isLoading={isLoading} tradingDays={tradingDays}
                          data={balanceSeriesDataWithoutFirst}/>
        </div>
        <SymbolsWidget nightMode={nightMode} darkColors={darkColors} nonSummaryPositions={nonSummaryPositions}
                       isLoading={isLoading}/>
    </>
}

export default Analytics;