import Spinner from "../../../common/Spinner";
import {Divider, List, Space} from "antd";
import {moneyFormat} from "../../../common/utils";
import {calculateDrawdown, durationLabels, workday_count} from "../../../utils";
import NoResult from "../../../common/NoResult";
import React, {useMemo} from "react";
import {summ} from "../../../App";
import moment from "moment";

const ReportWidget = ({nonSummaryPositions, tradingDays, data}) => {

    const totalNetProfit = summ(nonSummaryPositions.map(t => t.PnL));
    const profitTrades = nonSummaryPositions.filter(t => t.PnL > 0);
    const totalProfit = summ(profitTrades.map(t => t.PnL));

    const profitFactor = totalProfit / summ(nonSummaryPositions.filter(t => t.PnL <= 0).map(t => -t.PnL));
    const percentProfitable = profitTrades.length / nonSummaryPositions.length;
    const averageTradeNetProfit = totalNetProfit / nonSummaryPositions.length;
    const averageTradesByDay = Math.round(nonSummaryPositions.length / tradingDays.length)
    const averageDayNetProfit = averageTradeNetProfit * averageTradesByDay;

    const workDaysCountInMonth = workday_count(moment().startOf('month'), moment().endOf('month'));
    const workDaysCountInYear = workday_count(moment().startOf('year'), moment().endOf('year'));

    const planingMonthlyProfit = averageTradeNetProfit * averageTradesByDay * workDaysCountInMonth;
    const planingYearlyProfit = averageTradeNetProfit * averageTradesByDay * workDaysCountInYear;

    const drawdown = useMemo(() => calculateDrawdown(data), [data]);

    const list1 = [
        {label: 'Average Trades Per Day', value: <div>{averageTradesByDay}</div>},
        {label: 'Profit Factor', value: <div>{profitFactor.toFixed(2)}</div>},
        {label: 'Percent Profitable', value: <div>{`${(percentProfitable * 100).toFixed(2)}%`}</div>},
        {label: 'Maximum drawdown', value: <div>{`${(drawdown * 100).toFixed(2)}%`}</div>},
    ]
    const list2 = [
        {label: 'Average Trade Net Profit', value: <div style={{color:
                    averageTradeNetProfit > 0 ? 'rgba(var(--table-profit-color),1)' : 'rgba(var(--table-loss-color),1)'}}>{moneyFormat(averageTradeNetProfit)}</div>},
        {label: 'Average Day Net Profit', value: <div style={{color:
                    averageDayNetProfit > 0 ? 'rgba(var(--table-profit-color),1)' : 'rgba(var(--table-loss-color),1)'}}>{moneyFormat(averageDayNetProfit)}</div>},
        {label: 'Planing Monthly Profit', value: <div style={{color:
                    planingMonthlyProfit > 0 ? 'rgba(var(--table-profit-color),1)' : 'rgba(var(--table-loss-color),1)'}}>{moneyFormat(planingMonthlyProfit)}</div>},
        {label: 'Planing Yearly Profit', value: <div style={{color:
                    planingYearlyProfit > 0 ? 'rgba(var(--table-profit-color),1)' : 'rgba(var(--table-loss-color),1)'}}>{moneyFormat(planingYearlyProfit)}</div>},
    ]

    return <div className="widget">
        <div className="widget_header">Total Report</div>
        <div className="double-list">
            <List
                itemLayout="horizontal"
                dataSource={list1}
                split={true}
                renderItem={(item: any) => (
                    <List.Item
                        actions={[item.value]}
                    >
                        {item.label}
                    </List.Item>
                )}
            />
            <Divider/>
            <List
                itemLayout="horizontal"
                dataSource={list2}
                split={true}
                renderItem={(item: any) => (
                    <List.Item
                        actions={[item.value]}
                    >
                        {item.label}
                    </List.Item>
                )}
            />
        </div>
    </div>
}

export default ReportWidget;