import Spinner from "../../../common/Spinner";
import {List} from "antd";
import {moneyFormat} from "../../../common/utils";
import {durationLabels} from "../../../utils";
import NoResult from "../../../common/NoResult";
import React, {useMemo} from "react";
import {summ} from "../../../App";

const ReportWidget = ({isLoading, nonSummaryPositions, tradingDays}) => {

    const totalNetProfit = summ(nonSummaryPositions.map(t => t.PnL));
    const profitTrades = nonSummaryPositions.filter(t => t.PnL > 0);
    const totalProfit = summ(profitTrades.map(t => t.PnL));

    const profitFactor = totalProfit / summ(nonSummaryPositions.filter(t => t.PnL <= 0).map(t => -t.PnL));
    const percentProfitable = profitTrades.length / nonSummaryPositions.length;
    const averageTradeNetProfit = totalNetProfit / nonSummaryPositions.length;
    const averageTradesByDay = Math.round(nonSummaryPositions.length / tradingDays.length)

    const lossMap = [
        {label: 'Profit Factor', value: <div>{profitFactor.toFixed(2)}</div>},
        {label: 'Percent Profitable', value: <div>{`${(percentProfitable * 100).toFixed(2)}%`}</div>},
        {label: 'Average Trade Net Profit', value: <div style={{color:
                    averageTradeNetProfit > 0 ? 'rgba(var(--table-profit-color),1)' : 'rgba(var(--table-loss-color),1)'}}>{moneyFormat(averageTradeNetProfit)}</div>},
        {label: 'Average Trades Per Day', value: <div>{averageTradesByDay}</div>},
    ]

    return <div className="widget">
        <div className="widget_header">Total Report</div>
        {isLoading ? <Spinner/> : lossMap.length ?
            <List
                itemLayout="horizontal"
                dataSource={lossMap}
                renderItem={(item: any) => (
                    <List.Item
                        actions={[item.value]}
                    >
                        {item.label}
                    </List.Item>
                )}
            /> : <NoResult text="Нет данных"/>}
    </div>
}

export default ReportWidget;