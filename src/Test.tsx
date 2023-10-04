import {useApi} from "./useApi";
import {AlorApi, fromTo, Timeframe} from "alor-api";
import {FC, useEffect} from "react";
import * as moment from "moment";

interface IProps{
    api: AlorApi;
}

const moneyFormat = (money: number) => new Intl.NumberFormat('ru-RU', {
    style: 'currency', currency: 'RUB'
}).format(money)

const Test: FC<IProps> = ({api}) => {

    const nonCredit =async  () => {
        // Сколько вкладываем ежемесячно
        const monthIncome = 240000;
        // Сколько вложили всего
        let totalIncome = 0;
        // Сколько акций накупили за год
        let totalStocks = 0;
        // Баланс на счете в конце периода
        let totalProfitGROSS = 0;
        // Сколько получили за вычетом вложений
        let totalProfitNet = 0;

        // Запросили свечи за 1 год
        const history = await api.instruments.getHistory({
            symbol: 'SBER',
            exchange: "MOEX",
            tf: Timeframe.Month,
            ...fromTo('-2y'),
        });
        const candles = history.history;

        for(let i = 0; i< candles.length; i++){
            totalIncome += monthIncome;
            // Тупо покупаем акции на всю котлету в начале месяца
            totalStocks += Math.floor(monthIncome / candles[i].open);
            // Раз в год получаем дивы, сразу закупаем на них акции
            if(i % 12 === 0) {
                totalStocks *= 1.06;
            }
        }

        const lastPrice = candles.slice(-1)[0].close;

        totalProfitGROSS = totalStocks * lastPrice;
        totalProfitNet = totalProfitGROSS - monthIncome * candles.length;
        console.log(`Если не в кредит: Вложили: ${moneyFormat(monthIncome * candles.length)} Баланс на конец счета: ${moneyFormat(totalProfitGROSS)}, Заработали за вычетом вложений: ${moneyFormat(totalProfitNet)}`);
    }

    const byCredit =async  () => {
        // Сколько платим за кредит ежемесячно
        const monthOutcome = 240000;
        const totalCredit = 10000000;
        // Сколько заплатили за кредит всего
        let totalOutcome = 0;
        // Сколько акций накупили за год
        let totalStocks = 0;
        // Баланс на счете в конце периода
        let totalProfitGROSS = 0;
        // Сколько получили за вычетом вложений
        let totalProfitNet = 0;

        // Запросили свечи за 1 год
        const history = await api.instruments.getHistory({
            symbol: 'SBER',
            exchange: "MOEX",
            tf: Timeframe.Month,
            ...fromTo('-2y'),
        });
        const candles = history.history;

        // Взяли кредит и купили на все бабки СБЕР
        totalStocks += Math.floor(totalCredit / candles[0].open);

        for(let i = 0; i< candles.length; i++){
            totalOutcome += monthOutcome;
            // Раз в год получаем дивы, сразу закупаем на них акции
            if(i % 12 === 0) {
                totalStocks *= 1.06;
            }
        }

        const lastPrice = candles.slice(-1)[0].close;

        totalProfitGROSS = totalStocks * lastPrice;
        totalProfitNet = totalProfitGROSS - totalOutcome;
        console.log(`Если в кредит: Заплатили за кредит: ${moneyFormat(totalOutcome)} Переплата: ${moneyFormat(totalOutcome - totalCredit)} Баланс на конец счета: ${moneyFormat(totalProfitGROSS)}, Заработали за вычетом вложений: ${moneyFormat(totalProfitNet)}`);
    }


    useEffect(() => {
        if(api) {
            nonCredit();
            byCredit();
        }
    }, [api])

    return null;
}

export default Test;