import {List, Skeleton} from "antd";
import {moneyFormat} from "../../../common/utils";
import React, {useMemo} from "react";
import {durationLabels} from "../../../utils";
import Spinner from "../../../common/Spinner";
import NoResult from "../../../common/NoResult";
import {useGetOperationsQuery} from "../../../api/alor.api";
import {useAppSelector} from "../../../store";

const ProfitIntervalWidget = ({nonSummaryPositions, isLoading}) => {
    const profitPositions =  useMemo(() => nonSummaryPositions.filter(p => p.PnL > 0), [nonSummaryPositions]);

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

    return <div className="widget">
        <div className="widget_header">Прибыльные интервалы</div>
        {isLoading ? <Spinner/> : profitMap.length ?
        <List
            itemLayout="horizontal"
            dataSource={profitMap}
            renderItem={(item: any) => (
                <List.Item
                    actions={[<div style={{color: 'rgba(var(--table-profit-color),1)'}}>{moneyFormat(item[1].PnL)}</div>, <div>{item[1].count} trades</div>]}
                >
                    {durationLabels[item[0]]}
                </List.Item>
            )}
        />  : <NoResult text="Нет данных"/>}
    </div>
}

export default  ProfitIntervalWidget;