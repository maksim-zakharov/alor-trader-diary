import Spinner from "../../../common/Spinner";
import TVChart from "../../../common/TVChart";
import React, {useMemo} from "react";
import moment from 'moment/moment';
import {MoneyMovesSearch, Status} from "alor-api/dist/services/ClientInfoService/ClientInfoService";
import {enumerateDaysBetweenDates} from "../../../utils";
import {useAppSelector} from "../../../store";
import {useGetMoneyMovesQuery} from "../../../api/alor.api";
import {useSearchParams} from "react-router-dom";

const ProfitWidget = ({data, isLoading, colors, initBalance}) => {
    const [searchParams, setSearchParams] = useSearchParams();
    let dateFrom = searchParams.get('dateFrom');
    if (!dateFrom) {
        dateFrom = moment().startOf('month').format('YYYY-MM-DD');
    }
    let dateTo = searchParams.get('dateTo');
    if (!dateTo) {
        dateTo = moment().endOf('month').add(1, 'day').format('YYYY-MM-DD');
    }
    const settings = useAppSelector(state => state.alorSlice.settings);
    const userInfo = useAppSelector(state => state.alorSlice.userInfo);

    const {data: moneyMoves = []} = useGetMoneyMovesQuery({
        agreementNumber: settings.agreement,
        dateFrom,
        dateTo
    }, {
        skip: !userInfo || !settings.agreement,
        refetchOnMountOrArgChange: true
    });

    const activeOperations = useAppSelector(state => state.alorSlice.activeOperations);

    const moneyMovesMap = useMemo(() => moneyMoves.filter(mM =>  !['Комиссия брокера', "Комиссия депозитария"].includes(mM.title)).reduce((acc, curr) => {
        if(!curr.sum){
            return acc;
        }

        const date = moment(curr.date).format('YYYY-MM-DD');
        if(!acc[date]){
            acc[date] = 0;
        }

        let multi = 1;

        if(curr.subType === MoneyMovesSearch.Transfer && curr.accountTo !== settings.portfolio){
            multi = -1;
        }
        if(curr.subType === MoneyMovesSearch.Input) {
            multi = 1;
        }

        // Только те движения которые исполнены
        if(curr.status === Status.Resolved || curr.status === Status.executing){
            // спорно TODO
            acc[date] += curr.sum * multi;
        }

        return acc;
    }, {}), [moneyMoves, settings.portfolio]);

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
    }, {}), [activeOperations, moneyMovesMap]);

    const test = useMemo(() => {
        const firstDate = (moneyMoves.length < 1 ? moment() : moment(moneyMoves.slice(-1)[0].date)).format('YYYY-MM-DD');
        const lastDate = moment().format('YYYY-MM-DD')

        const dates = enumerateDaysBetweenDates(firstDate, lastDate);

        return dates.reduce((acc, curr,  i, items) => {
            const prevIndex = i === 0 ? 0 : i - 1;
            const prevDate = items[prevIndex];
            const currDate = items[i];
            const prevValue = i === 0 ? 0 : (acc[prevDate] || 0)
            const currValue = (moneyMovesMap[currDate] || 0);

            acc[curr] = prevValue + currValue;

            return acc;
        }, {})

    }, [moneyMovesMap, moneyMoves]);

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

            // Баланс на конкретный день (d.time)
            const dayEquity = d.value;

            // Разница в балансе между текущим днем и самым первым (по сути задаем initBalance как точку отчета y = 0);
            const diffInitCurrentDayEquity = dayEquity - initBalance;

            const moneyMovesSumByTime = test[d.time]

            const value = diffInitCurrentDayEquity; // - initBalance; //  - moneyMovesSumByTime;

            result.push({...d, value: d.value - initBalance - test[d.time]});

            // result.push({...d, value });
        })

        return result;
    }, [data, test, initBalance]);

    const balance = useMemo(() => data.slice(-1)[0]?.value || 0,[data]);

    return <div className="widget" style={{height: 460, width: '100%'}}>
        <div className="widget_header">Прибыль</div>
        {isLoading ? <Spinner/> :<TVChart colors={colors} fitContent seriesType="baseLine" shortNumber={true} balance={balance} data={_data} formatTime="ll"/>}
    </div>
}

export default ProfitWidget;