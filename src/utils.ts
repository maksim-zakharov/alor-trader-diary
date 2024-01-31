import {Positions, Side, Trade} from 'alor-api';
import {avg, summ} from './App';
import moment, {Moment} from 'moment/moment';

export const digitsAfterDot = (num) => {
    if (!num) {
        return 0;
    }

    return `${num}`.split('.')?.[1]?.length || 0;
};

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
export const positionsToTrades = (positions: Positions) =>
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
                commission: Math.abs(p.volume) * 0.0005,
                price: p.avgPrice,
                // @ts-ignore
                accruedInt: 0,
                // @ts-ignore
                repoSpecificFields: null,
                // @ts-ignore
                volume: Math.abs(p.volume),
            }) as Trade,
    );

export const tradesToHistoryPositions = (trades: Trade[]) => {
    const batchPositions: any = [];
    const currentPositionsMap: { [symbol: string]: any } = {};

    trades.map((trade) => {
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
                trades: [trade],
            };
            // Если позиция есть - работаем
        } else {
            // Если направление трейда такое же как у трейда закрытия - суммируем тотал лот
            if (trade.side === currentPositionsMap[trade.symbol].lastSide) {
                currentPositionsMap[trade.symbol].commQty += trade.qty;
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

                    const totalDiffVolume = currentPositionsMap[
                        trade.symbol
                        ].trades.reduce(
                        (acc, curr) =>
                            curr.side === Side.Buy ? acc - curr.volume : acc + curr.volume,
                        0,
                    );

                    const totalCommission = summ(
                        currentPositionsMap[trade.symbol].trades.map((t) => t.commission),
                    );

                    currentPositionsMap[trade.symbol].Fee = totalCommission;

                    const buyVolume = summ(
                        currentPositionsMap[trade.symbol].trades
                            .filter((c) => c.side === Side.Buy)
                            .map((t) => t.volume),
                    );
                    const sellVolume = summ(
                        currentPositionsMap[trade.symbol].trades
                            .filter((c) => c.side === Side.Sell)
                            .map((t) => t.volume),
                    );

                    currentPositionsMap[trade.symbol].PnL =
                        sellVolume - buyVolume - Math.abs(totalCommission);
                    currentPositionsMap[trade.symbol].PnLPercent =
                        (sellVolume - currentPositionsMap[trade.symbol].Fee) / buyVolume -
                        1;

                    batchPositions.push({...currentPositionsMap[trade.symbol]});
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

                    const totalDiffVolume = currentPositionsMap[
                        trade.symbol
                        ].trades.reduce(
                        (acc, curr) =>
                            curr.side === Side.Buy ? acc - curr.volume : acc + curr.volume,
                        0,
                    );

                    const totalCommission = summ(
                        currentPositionsMap[trade.symbol].trades.map((t) => t.commission),
                    );

                    currentPositionsMap[trade.symbol].Fee = totalCommission;

                    const buyVolume = summ(
                        currentPositionsMap[trade.symbol].trades
                            .filter((c) => c.side === Side.Buy)
                            .map((t) => t.volume),
                    );
                    const sellVolume = summ(
                        currentPositionsMap[trade.symbol].trades
                            .filter((c) => c.side === Side.Sell)
                            .map((t) => t.volume),
                    );

                    currentPositionsMap[trade.symbol].PnL =
                        sellVolume - buyVolume - Math.abs(totalCommission);
                    currentPositionsMap[trade.symbol].PnLPercent =
                        (sellVolume - currentPositionsMap[trade.symbol].Fee) / buyVolume -
                        1;

                    const {commQty, lastSide, ...newPosition} =
                        currentPositionsMap[trade.symbol];

                    batchPositions.push({...newPosition});

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

    return maxDrawdown_(positions.map(p => p.value), 0, positions.length-1)[0];
}

function maxDrawdown_(equityCurve, idxStart, idxEnd) {
    // Initialisations
    var highWaterMark = -Infinity;
    var maxDd = -Infinity;
    var idxHighWaterMark = -1;
    var idxStartMaxDd = -1;
    var idxEndMaxDd = -1;

    // Loop over all the values to compute the maximum drawdown
    for (var i=idxStart; i<idxEnd+1; ++i) {
        if (equityCurve[i] > highWaterMark) {
            highWaterMark = equityCurve[i];
            idxHighWaterMark = i;
        }

        var dd = (highWaterMark - equityCurve[i]) / highWaterMark;

        if (dd > maxDd) {
            maxDd = dd;
            idxStartMaxDd = idxHighWaterMark;
            idxEndMaxDd = i;
        }
    }

    // Return the computed values
    return [maxDd, idxStartMaxDd, idxEndMaxDd];
}
