import {Positions, Side, Trade} from 'alor-api';
import {summ} from './App';
import moment, {Moment} from 'moment/moment';
import {UserInfoResponse} from "alor-api/dist/services/ClientInfoService/ClientInfoService";
import humanizeDuration from "humanize-duration";
import { Mutex } from 'async-mutex';

export const mutex = new Mutex();

export const digitsAfterDot = (num) => {
    if (!num) {
        return 0;
    }

    return `${num}`.split('.')?.[1]?.length || 0;
};


// Активный
export const calculateCommission = (totalVolume: number): number => {
    let commission = 0.0008;
    switch (true){
        case totalVolume < 1000000: commission = 0.0008; break;
        case totalVolume >= 1000000 && totalVolume < 10000000: commission = 0.00025; break;
        case totalVolume >= 10000000 && totalVolume < 30000000: commission = 0.0002; break;
        case totalVolume >= 30000000 && totalVolume < 50000000: commission = 0.00015; break;
        case totalVolume >= 50000000: commission = 0.0001; break;
        default: break;
    }

    return commission;
}
// Профессионал
const calculateCommission1 = (totalVolume: number): number => {
    let commission = 0.0004;
    switch (true){
        case totalVolume < 500000: commission = 0.0004; break;
        case totalVolume >= 500000 && totalVolume < 1000000: commission = 0.00035; break;
        case totalVolume >= 1000000 && totalVolume < 10000000: commission = 0.0003; break;
        case totalVolume >= 10000000: commission = 0.00025; break;
        default: break;
    }

    return commission;
}
// Ассистент
const calculateCommission2 = (totalVolume: number): number => {
    let commission = 0.002;

    return commission;
}
// Единый
const calculateCommission3 = (totalVolume: number): number => {
    let commission = 0.001;

    return commission;
}
// Маркетинговый 10
const calculateCommission4 = (totalVolume: number): number => {
    let commission = 0.0004;
    switch (true){
        case totalVolume < 1000000: commission = 0.0004; break;
        case totalVolume >= 1000000 && totalVolume < 25000000: commission = 0.0002; break;
        case totalVolume >= 25000000 && totalVolume < 50000000: commission = 0.00015; break;
        case totalVolume >= 50000000 && totalVolume < 100000000: commission = 0.0001; break;
        case totalVolume >= 100000000: commission = 0.00008; break;
        default: break;
    }

    return commission;
}

export const getCommissionByPlanAndTotalVolume = (plan: string, totalVolume: number, taker?: boolean) => {
    const map = {
        'Активный': calculateCommission,
        'Профессионал': calculateCommission1,
        'Ассистент': calculateCommission2,
        'Единый': calculateCommission3,
        'Маркетинговый 10': calculateCommission4,
    }

    const func = map[plan] || calculateCommission;

    let commission = func(totalVolume);

    // https://www.moex.com/s1197
    if(taker) {
        // биржевой сбор (платится за маркет заявки)
        const kliringFee = 0.0001275;
        // мейкер тейкер moex (платится за маркет заявки)
        const marketFee = 0.0001725;

        commission += kliringFee + marketFee;
    }

    return commission;
}

export const numberToPercent = (number) => new Intl.NumberFormat('ru-RU', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2
}).format(((number || 0) * 100));

export const roundPrice = (
    price: number,
    minPriceIncrement?: number,
): number => {
    if (!minPriceIncrement) {
        return Math.round(price);
    }
    const withIncrement =
        Math.round(price / minPriceIncrement) * minPriceIncrement;
    return +withIncrement.toFixed(digitsAfterDot(minPriceIncrement));
};
export const positionsToTrades = (positions: Positions, commission: number = 0.0005) =>
    positions.map(
        (p) =>
            ({
                symbol: p.symbol,
                exchange: p.exchange,
                qty: Math.abs(p.qty),
                qtyBatch: Math.abs(p.qty),
                qtyUnits: Math.abs(p.qty),
                existing: false,
                date: new Date().toISOString(),
                brokerSymbol: `${p.exchange}:${p.symbol}`,
                side: p.qty > 0 ? Side.Sell : Side.Buy,
                board: 'TQBR',
                // @ts-ignore
                commission: Math.abs(p.volume) * commission,
                price: p.avgPrice,
                // @ts-ignore
                accruedInt: 0,
                // @ts-ignore
                repoSpecificFields: null,
                // @ts-ignore
                volume: Math.abs(p.volume),
            }) as Trade,
    );


export const calculatePositionPart = (trades, trade) => {

    const Fee = summ(
        trades.map((t) => t.commission),
    );

    const buyVolume = summ(
        trades
            .filter((c) => c.side === Side.Buy)
            .map((t) => t.volume),
    );
    const sellVolume = summ(
        trades
            .filter((c) => c.side === Side.Sell)
            .map((t) => t.volume),
    );


    const openVolume = trade.side === Side.Buy ? buyVolume : sellVolume
    const closeVolume = trade.side === Side.Buy ? sellVolume : buyVolume

    const multi = trade.side === Side.Buy ? 1 : -1;

    const PnL =
        (closeVolume - openVolume) * multi - Math.abs(Fee);
    const PnLPercent =
        (closeVolume - Math.abs(Fee)) / openVolume -
        1;

    return {Fee, openVolume, closeVolume, PnL, PnLPercent};
}

export const humanize = (duration: moment.Duration) => {
    const numberDuration = (duration as any) as number;

    if(numberDuration >= 60000){
        let hum = duration.humanize();
        if(hum === 'минута'){
            hum = '1 минута';
        }
        if(hum === 'час'){
            hum = '1 час';
        }
        return hum;
    } else {
        return humanizeDuration(numberDuration, { language: "ru" });
    }
}

export const isMobile = () => {
    if (navigator.userAgent.match(/Android/i)
        || navigator.userAgent.match(/webOS/i)
        || navigator.userAgent.match(/iPhone/i)
        || navigator.userAgent.match(/iPad/i)
        || navigator.userAgent.match(/iPod/i)
        || navigator.userAgent.match(/BlackBerry/i)
        || navigator.userAgent.match(/Windows Phone/i)) {
        return true ;
    } else {
        return false ;
    }
}

export const flatTradesByOrderNo = (trades: (Trade | any)[]) => Object.values<Trade>(trades.reduce((acc, curr) => {
    if(!acc[curr.orderno]){
        acc[curr.orderno] = curr;
    } else {
        acc[curr.orderno].volume += curr.volume;
        acc[curr.orderno].commission += curr.commission;
        acc[curr.orderno].qty += curr.qty;
        acc[curr.orderno].qtyBatch += curr.qtyBatch;
        acc[curr.orderno].qtyUnits += curr.qtyUnits;
    }

    return acc;
}, {}));

export const excludePositions = (historyTrades: Trade[], positionsTrades: Trade[]): Trade[] => {
    const symbolPositionMap = new Map(positionsTrades.filter(p => p.qty).map(p => [p.symbol, p]));

    const flatTrades = flatTradesByOrderNo(historyTrades);
    const sorted = flatTrades.sort((a, b) => b.date.localeCompare(a.date));

    let result = [];

    for (let i = 0; i < sorted.length; i++) {
        const trade = sorted[i];
        if(symbolPositionMap.get(trade.symbol)){
            const qty = trade.qty - symbolPositionMap.get(trade.symbol).qty
            if(qty === 0){
                symbolPositionMap.delete(trade.symbol)
            }
            else if(qty > 0){
                trade.qty-=qty;
                result.push(trade);
            } else if (qty < 0){
                trade.qty = -qty;
                result.push(trade);
            }
        } else {
            result.push(trade);
        }
    }

    return result;
}

export const tradesToHistoryPositions = (trades: Trade[]) => {
    const batchPositions: any = [];
    const currentPositionsMap: { [symbol: string]: any } = {};

    if (!trades || !trades.length) {
        return {positions: [], totalPnL: 0, totalFee: 0};
    }

    const sorted = trades.sort((a, b) => b.date.localeCompare(a.date))

    sorted.forEach((trade) => {

        if (!trade.symbol) {
            trade.symbol = '';
        }

        // Если позиции нет - добавляем
        if (!currentPositionsMap[trade.symbol]) {
            currentPositionsMap[trade.symbol] = {
                commQty: trade.qty,
                closePrice: trade.price,
                symbol: trade.symbol,
                closeDate: trade.date,
                lastSide: trade.side,
                side: trade.side === Side.Buy ? Side.Sell : Side.Buy,
                qtyUnits: trade.qtyUnits,
                trades: [trade],
            };
            // Если позиция есть - работаем
        } else {
            // Если направление трейда такое же как у трейда закрытия - суммируем тотал лот
            if (trade.side === currentPositionsMap[trade.symbol].lastSide) {
                currentPositionsMap[trade.symbol].commQty += trade.qty;
                currentPositionsMap[trade.symbol].qtyUnits += trade.qtyUnits;
                currentPositionsMap[trade.symbol].trades.unshift(trade);
            } else {
                // Если нет - вычитаем
                currentPositionsMap[trade.symbol].commQty -= trade.qty;

                // Если объем остался

                if (currentPositionsMap[trade.symbol].commQty > 0) {
                    currentPositionsMap[trade.symbol].trades.unshift(trade);
                }

                // Если объема нет - закрываем позу
                else if (currentPositionsMap[trade.symbol].commQty === 0) {
                    currentPositionsMap[trade.symbol].openPrice = trade.price;
                    currentPositionsMap[trade.symbol].openDate = trade.date;
                    currentPositionsMap[trade.symbol].trades.unshift(trade);
                    delete currentPositionsMap[trade.symbol].commQty;
                    delete currentPositionsMap[trade.symbol].lastSide;

                    batchPositions.push({...currentPositionsMap[trade.symbol], ...calculatePositionPart(currentPositionsMap[trade.symbol].trades, trade)});
                    delete currentPositionsMap[trade.symbol];
                }
                // Если объем в минус - перевернуться
                else {
                    currentPositionsMap[trade.symbol].openPrice = trade.price;
                    currentPositionsMap[trade.symbol].openDate = trade.date;

                    // @ts-ignore
                    const lotSize = trade.volume / (trade.price * trade.qty);

                    // @ts-ignore
                    const diffVolume =
                        trade.price * -currentPositionsMap[trade.symbol].commQty * lotSize;

                    // @ts-ignore
                    trade.volume -= diffVolume;

                    trade.qty += currentPositionsMap[trade.symbol].commQty;
                    trade.qtyBatch += currentPositionsMap[trade.symbol].commQty;
                    trade.qtyUnits += currentPositionsMap[trade.symbol].commQty;

                    currentPositionsMap[trade.symbol].trades.unshift(trade);

                    const {commQty, lastSide, ...newPosition} =
                        currentPositionsMap[trade.symbol];

                    batchPositions.push({...newPosition, ...calculatePositionPart(currentPositionsMap[trade.symbol].trades, trade)});

                    // @ts-ignore
                    trade.volume = diffVolume;

                    trade.qty = currentPositionsMap[trade.symbol].commQty;
                    trade.qtyBatch = currentPositionsMap[trade.symbol].commQty;
                    trade.qtyUnits = currentPositionsMap[trade.symbol].commQty;

                    currentPositionsMap[trade.symbol] = {
                        commQty: Math.abs(currentPositionsMap[trade.symbol].commQty),
                        lastSide: trade.side,
                        closePrice: trade.price,
                        symbol: trade.symbol,
                        closeDate: trade.date,
                        side: trade.side === Side.Buy ? Side.Sell : Side.Buy,
                        trades: [trade],
                    };
                }
            }
        }
    });

    const totalFee = summ(batchPositions.map((p: any) => p.Fee));
    const totalPnL = summ(batchPositions.map((p: any) => p.PnL));

    return {positions: batchPositions, totalPnL, totalFee};
};

export const momentRoundTime = (date: string, hoursRound: number) => {
    const start = moment(date);
    const remainder = start.hours() - (start.hours() % hoursRound);
    return moment(start)
        // .add(-remainder, "hours")
        .set('hours', remainder)
        .set('minutes', 0)
        .set('seconds', 0)
        .format("HH:mm");
}

export const durationLabels = {
    seconds: 'До 1 минуты',
    '5min': 'От 1 до 5 минут',
    '1hour': 'От 5 минут до 1 часа',
    'hours': 'Более часа',
}

export const timeLabels = {
    '08:00': '08:00 - 10:00',
    '10:00': '10:00 - 12:00',
    '12:00': '12:00 - 14:00',
    '14:00': '14:00 - 16:00',
    '16:00': '16:00 - 18:00',
    '18:00': '18:00 - 20:00',
    '20:00': '20:00 - 22:00',
    '22:00': '22:00 - 24:00',
}

export function workday_count(startDate: Moment, endDate: Moment): number {
// + 1 cause diff returns the difference between two moments, in this case the day itself should be included.

    const totalDays: number = endDate.diff(moment(startDate), 'days') + 1;
    const dayOfWeek = endDate.isoWeekday();
    let totalWorkdays = 0;

    for (let i = dayOfWeek; i < totalDays + dayOfWeek; i++) {
        if (i % 7 !== 6 && i % 7 !== 0) {
            totalWorkdays++;
        }
    }
    return totalWorkdays;
}

export const calculateDrawdown = (positions: { value: number }[]): number => {
    if (!positions.length) {
        return 0;
    }

    return maxDrawdown_(positions.map(p => p.value), 0, positions.length - 1)[0];
}

function maxDrawdown_(equityCurve, idxStart, idxEnd) {
    // Initialisations
    let highWaterMark = -Infinity;
    let maxDd = -Infinity;
    let idxHighWaterMark = -1;
    let idxStartMaxDd = -1;
    let idxEndMaxDd = -1;

    // Loop over all the values to compute the maximum drawdown
    for (let i = idxStart; i < idxEnd + 1; ++i) {
        if (equityCurve[i] > highWaterMark) {
            highWaterMark = equityCurve[i];
            idxHighWaterMark = i;
        }

        const dd = (highWaterMark - equityCurve[i]) / highWaterMark;

        if (dd > maxDd) {
            maxDd = dd;
            idxStartMaxDd = idxHighWaterMark;
            idxEndMaxDd = i;
        }
    }

    // Return the computed values
    return [maxDd, idxStartMaxDd, idxEndMaxDd];
}

export const enumerateDaysBetweenDates = (startDate, endDate) => {

    const currDate = moment(startDate).startOf('day');
    const lastDate = moment(endDate).startOf('day');

    const dates = [currDate.clone().format('YYYY-MM-DD')];

    while (currDate.add(1, 'days').diff(lastDate) <= 0) {
        dates.push(currDate.clone().format('YYYY-MM-DD'));
    }

    return dates;
};

export const getCurrentTariffPlan = (userInfo: UserInfoResponse, agreementNumber: string, accountNumber: string): string | undefined =>  (userInfo?.agreements?.find(a => a.agreementNumber === agreementNumber)?.portfolios || []).find(p => p.accountNumber === accountNumber)?.tariffPlan;