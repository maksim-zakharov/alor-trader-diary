import Spinner from "../../../common/Spinner";
import TVChart from "../../../common/TVChart";
import React, {useMemo} from "react";
import moment from 'moment/moment';
import {Status} from "alor-api/dist/services/ClientInfoService/ClientInfoService";

const ProfitWidget = ({data, isLoading, colors, moneyMoves}) => {
    const dayMoneyMovesMap = useMemo(() => moneyMoves.reduce((acc, curr) => {
        const date = moment(curr.date).format('YYYY-MM-DD');
        if(!acc[date]){
            acc[date] = 0;
        }

        // Только те движения которые исполнены
        if(curr.status === Status.Resolved && curr.title !== "Комиссия брокера"){
            // спорно TODO
            acc[date] += curr.sum;
        }

        return acc;
    }, {}), [moneyMoves]);

    const _data = useMemo(() => {
        let result = [];
        let lastMoneyMove = 0;

        data.forEach((d, i) => {
            // Вычитаем результат первого дня чтобы отсчет начинался с 0
            if(i === 0){
                lastMoneyMove += d.value;
            }

            if(dayMoneyMovesMap[d.time] && i > 0){
                // Вычитаем очередное движение средств
                lastMoneyMove += dayMoneyMovesMap[d.time];
            }

            result.push({...d, value: d.value - lastMoneyMove});
        })

        return result;
    }, [data, dayMoneyMovesMap]);

    console.log(moneyMoves, data, _data, dayMoneyMovesMap)

    return <div className="widget" style={{height: 460, width: '100%'}}>
        <div className="widget_header">Profit</div>
        {isLoading ? <Spinner/> :<TVChart colors={colors} seriesType="baseLine" data={_data} formatTime="ll"/>}
    </div>
}

export default ProfitWidget;