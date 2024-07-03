import {moneyFormat} from "../../../common/utils";
import React, {useMemo} from "react";
import {List, Skeleton} from "antd";
import {momentRoundTime, timeLabels} from "../../../utils";
import Spinner from "../../../common/Spinner";
import NoResult from "../../../common/NoResult";

const LossTimeWidget = ({nonSummaryPositions, isLoading}) => {
    const lossPositions =  useMemo(() => nonSummaryPositions.filter(p => p.PnL <= 0), [nonSummaryPositions]);

    const lossMap = useMemo(() => Object.entries(lossPositions.reduce((acc, curr) => {
        const key = momentRoundTime(curr.openDate, 2);

        if(!acc[key]){
            acc[key] = {PnL: 0, count: 0};
        }

        acc[key].PnL += curr.PnL;
        acc[key].count++;

        return acc;
    }, {} as {[key: string]: number})).sort((a: any, b: any) => a[1].PnL - b[1].PnL).slice(0, 4), [lossPositions]);

    return <div className="widget">
        <div className="widget_header">Убыток по времени дня</div>
        {isLoading ? <Spinner/> : lossMap.length ?
            <List
                itemLayout="horizontal"
                dataSource={lossMap}
                renderItem={(item: any) => (
                    <List.Item
                        actions={[<div style={{color: 'rgba(var(--table-loss-color),1)'}}>{moneyFormat(item[1].PnL)}</div>, <div>{item[1].count} trades</div>]}
                    >
                        {timeLabels[item[0]]}
                    </List.Item>
                )}
            /> : <NoResult text="Нет данных"/>}
    </div>
}

export default LossTimeWidget;