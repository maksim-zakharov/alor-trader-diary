import {moneyFormat} from "../../../common/utils";
import React, {useMemo} from "react";
import {List, Skeleton} from "antd";
import {momentRoundTime, timeLabels} from "../../../utils";

const ProfitTimeWidget = ({nonSummaryPositions, isLoading}) => {
    const lossPositions =  useMemo(() => nonSummaryPositions.filter(p => p.PnL > 0), [nonSummaryPositions]);

    const lossMap = useMemo(() => Object.entries(lossPositions.reduce((acc, curr) => {
        const key = momentRoundTime(curr.openDate, 2);

        if(!acc[key]){
            acc[key] = {PnL: 0, count: 0};
        }

        acc[key].PnL += curr.PnL;
        acc[key].count++;

        return acc;
    }, {} as {[key: string]: number})).sort((a: any, b: any) => b[1].PnL - a[1].PnL).slice(0, 4), [lossPositions]);

    return <div className="widget">
        <div className="widget_header">Profit by time of day</div>
        {isLoading ? <Skeleton title={false} paragraph={{
                rows: 4
            }} /> :
            <List
                itemLayout="horizontal"
                dataSource={lossMap}
                renderItem={(item: any) => (
                    <List.Item
                        actions={[<div style={{color: 'rgba(var(--table-profit-color),1)'}}>{moneyFormat(item[1].PnL)}</div>, <div>{item[1].count} trades</div>]}
                    >
                        {timeLabels[item[0]]}
                    </List.Item>
                )}
            />}
    </div>
}

export default ProfitTimeWidget;