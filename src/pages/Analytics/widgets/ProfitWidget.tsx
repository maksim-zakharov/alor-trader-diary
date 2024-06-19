import Spinner from "../../../common/Spinner";
import TVChart from "../../../common/TVChart";
import React, {useMemo} from "react";
import moment from 'moment/moment';
import {Status} from "alor-api/dist/services/ClientInfoService/ClientInfoService";
import {enumerateDaysBetweenDates} from "../../../utils";

const ProfitWidget = ({activeOperations, data, isLoading, colors, moneyMoves, initBalance}) => {
    const moneyMovesMap = useMemo(() => moneyMoves.filter(mM =>  !['Комиссия брокера', "Комиссия депозитария"].includes(mM.title)).reduce((acc, curr) => {
        if(!curr.sum){
            return acc;
        }

        const date = moment(curr.date).format('YYYY-MM-DD');
        if(!acc[date]){
            acc[date] = 0;
        }

        let multi = 1;

        if(curr.subType === 'withdrawal'){
            multi = -1;
        }
        if(curr.subType === 'input') {
            multi = 1;
        }

        // Только те движения которые исполнены
        if(curr.status === Status.Resolved || curr.status === Status.executing){
            // спорно TODO
            acc[date] += curr.sum * multi;
        }

        return acc;
    }, {}), [moneyMoves]);

    const dayMoneyMovesMap = useMemo(() => activeOperations.reduce((acc, curr) => {
        if(!curr.data.amount){
            return acc;
        }

        const date = moment(curr.date).format('YYYY-MM-DD');
        if(!acc[date]){
            acc[date] = 0;
        }

        let multi = 1;

        if(curr.subType === 'money_withdrawal'){
            multi = -1;
        }
        if(curr.subType === 'money_input') {
            multi = 1;
        }

        // Только те движения которые исполнены
        if(curr.status === Status.Resolved || curr.status === Status.executing){
            // спорно TODO
            acc[date] += curr.data.amount * multi;
        }

        return acc;
    }, moneyMovesMap), [activeOperations, moneyMovesMap]);

    const test = useMemo(() => {
        const firstDate = (moneyMoves.length < 1 ? moment() : moment(moneyMoves.slice(-1)[0].date)).format('YYYY-MM-DD');
        const lastDate = moment().format('YYYY-MM-DD')

        const dates = enumerateDaysBetweenDates(firstDate, lastDate);

        return dates.reduce((acc, curr,  i, items) => {
            const prevIndex = i === 0 ? 0 : i - 1;
            const prevDate = items[prevIndex];
            const currDate = items[i];
            const prevValue = i === 0 ? 0 : (acc[prevDate] || 0)
            const currValue = (dayMoneyMovesMap[currDate] || 0);

            acc[curr] = prevValue + currValue;

            return acc;
        }, {})

    }, [dayMoneyMovesMap, moneyMoves]);

    const _data = useMemo(() => {
        let result = [];
        let lastMoneyMove = initBalance;

        data.forEach((d, i) => {
            // Вычитаем результат первого дня чтобы отсчет начинался с 0
            if(i === 0){
                // lastMoneyMove += d.value;
            }

            // Изза багов Алора иногда бывает резкий 0 в балансе
            if(d.value === 0){
                if(i > 0)
                d.value = data[i - 1].value;
                else if(data.length > 1){
                    d.value = data[1].value;
                }
            }

            // if(dayMoneyMovesMap[d.time]){
            //     // Вычитаем очередное движение средств
            //     lastMoneyMove += dayMoneyMovesMap[d.time];
            // }

            result.push({...d, value: d.value - initBalance - test[d.time]});
        })

        return result;
    }, [data, test, initBalance]);

    const balance = useMemo(() => data.slice(-1)[0]?.value || 0,[data]);

    return <div className="widget" style={{height: 460, width: '100%'}}>
        <div className="widget_header">Profit</div>
        {isLoading ? <Spinner/> :<TVChart colors={colors} seriesType="baseLine" shortNumber={true} balance={balance} data={_data} formatTime="ll"/>}
    </div>
}

export default ProfitWidget;