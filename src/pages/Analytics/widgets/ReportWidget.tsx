import {Divider, List} from "antd";
import {moneyFormat} from "../../../common/utils";
import {calculateDrawdown, numberToPercent, workday_count} from "../../../utils";
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

    const currentBalance = useMemo(() => (data || []).slice(-1)[0]?.value || 0, [data]);

    const list1 = [
        {label: 'Average Trades Per Day', value: <div>{averageTradesByDay}</div>},
        {label: 'Profit Factor', value: <div>{profitFactor.toFixed(2)}</div>},
        {label: 'Percent Profitable', value: <div>{`${numberToPercent(percentProfitable)}%`}</div>},
        {label: 'Maximum drawdown', value: <div>{`${numberToPercent(drawdown)}%`}</div>},
    ]

    const renderProfit = (profit) => <div style={{color:
            profit > 0 ? 'rgba(var(--table-profit-color),1)' : 'rgba(var(--table-loss-color),1)'}}>{moneyFormat(profit)} ({numberToPercent(profit / currentBalance)}%)</div>

    const list2 = [
        {label: 'Average Trade Net Profit', value: renderProfit(averageTradeNetProfit)},
        {label: 'Average Day Net Profit', value: renderProfit(averageDayNetProfit)},
        {label: 'Planing Monthly Profit', value: renderProfit(planingMonthlyProfit)},
        {label: 'Planing Yearly Profit', value: renderProfit(planingYearlyProfit)},
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