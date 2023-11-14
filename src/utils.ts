import { Positions, Side, Trade } from 'alor-api';
import { avg, summ } from './App';

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

          currentPositionsMap[trade.symbol].PnL =
            totalDiffVolume - totalCommission;

          const avgBuyVolume = avg(
            currentPositionsMap[trade.symbol].trades
              .filter((t) => t.side === Side.Buy)
              .map((t) => t.volume),
          );
          const avgSellVolume = avg(
            currentPositionsMap[trade.symbol].trades
              .filter((t) => t.side === Side.Sell)
              .map((t) => t.volume),
          );
          currentPositionsMap[trade.symbol].PnLPercent =
            currentPositionsMap[trade.symbol].side === Side.Buy
              ? totalDiffVolume / avgBuyVolume
              : totalDiffVolume / avgSellVolume;

          batchPositions.push({ ...currentPositionsMap[trade.symbol] });
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

          currentPositionsMap[trade.symbol].PnL =
            totalDiffVolume - totalCommission;

          const avgBuyVolume = avg(
            currentPositionsMap[trade.symbol].trades
              .filter((t) => t.side === Side.Buy)
              .map((t) => t.volume),
          );
          const avgSellVolume = avg(
            currentPositionsMap[trade.symbol].trades
              .filter((t) => t.side === Side.Sell)
              .map((t) => t.volume),
          );
          currentPositionsMap[trade.symbol].PnLPercent =
            currentPositionsMap[trade.symbol].side === Side.Buy
              ? totalDiffVolume / avgBuyVolume
              : totalDiffVolume / avgSellVolume;

          const { commQty, lastSide, ...newPosition } =
            currentPositionsMap[trade.symbol];

          batchPositions.push({ ...newPosition });

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

  return { positions: batchPositions, totalPnL, totalFee };
};
