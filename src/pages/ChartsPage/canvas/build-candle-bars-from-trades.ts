/** Сделка для сборки свечей. */
export interface CandleTradeInput {
  /** Время, мс */
  timeMs: number;
  /** Цена */
  price: number;
  /** Объём */
  qty: number;
}

/** OHLC-бар канваса. */
export interface CandleBarFromTrades {
  /** Unix sec (дробный для субсекундных бакетов) */
  time: number;
  /** Open */
  open: number;
  /** High */
  high: number;
  /** Low */
  low: number;
  /** Close */
  close: number;
  /** Volume */
  volume: number;
}

/**
 * Начало бакета по времени сделки.
 */
export function candleTradeBucketStartMs(timeMs: number, bucketMs: number): number {
  if (!(Number.isFinite(timeMs) && timeMs > 0)) return 0;
  const window = Number.isFinite(bucketMs) && bucketMs > 0 ? bucketMs : 500;
  return Math.floor(timeMs / window) * window;
}

/**
 * Собирает OHLC-свечи из сделок (как кластер, но без footprint).
 */
export function buildCandleBarsFromTrades(
  trades: readonly CandleTradeInput[],
  bucketMs: number,
  maxBars: number = 2_000,
): CandleBarFromTrades[] {
  if (!(Number.isFinite(bucketMs) && bucketMs > 0) || maxBars < 1) return [];
  const byBucket = new Map<number, CandleBarFromTrades>();

  for (const trade of trades) {
    if (!(Number.isFinite(trade.price) && trade.price > 0)) continue;
    if (!(Number.isFinite(trade.qty) && trade.qty > 0)) continue;
    const bucketStartMs = candleTradeBucketStartMs(trade.timeMs, bucketMs);
    if (!(bucketStartMs > 0)) continue;
    const existing = byBucket.get(bucketStartMs);
    if (!existing) {
      byBucket.set(bucketStartMs, {
        time: bucketStartMs / 1000,
        open: trade.price,
        high: trade.price,
        low: trade.price,
        close: trade.price,
        volume: trade.qty,
      });
      continue;
    }
    existing.close = trade.price;
    if (trade.price > existing.high) existing.high = trade.price;
    if (trade.price < existing.low) existing.low = trade.price;
    existing.volume += trade.qty;
  }

  return [...byBucket.values()]
    .sort((a, b) => a.time - b.time)
    .slice(-Math.floor(maxBars));
}

/**
 * Применяет одну сделку к уже собранным свечам.
 */
export function applyTradeToCandleBars(
  bars: readonly CandleBarFromTrades[],
  trade: CandleTradeInput,
  bucketMs: number,
  maxBars: number = 2_000,
): CandleBarFromTrades[] {
  if (!(Number.isFinite(trade.price) && trade.price > 0)) return bars.slice();
  if (!(Number.isFinite(trade.qty) && trade.qty > 0)) return bars.slice();
  const bucketStartMs = candleTradeBucketStartMs(trade.timeMs, bucketMs);
  if (!(bucketStartMs > 0)) return bars.slice();
  const time = bucketStartMs / 1000;
  if (!bars.length) {
    return [
      {
        time,
        open: trade.price,
        high: trade.price,
        low: trade.price,
        close: trade.price,
        volume: trade.qty,
      },
    ];
  }

  const last = bars[bars.length - 1];
  if (last.time === time) {
    const next = bars.slice();
    next[next.length - 1] = {
      ...last,
      close: trade.price,
      high: Math.max(last.high, trade.price),
      low: Math.min(last.low, trade.price),
      volume: last.volume + trade.qty,
    };
    return next;
  }

  if (time < last.time) {
    // Сделка в прошлом — редкий out-of-order; полный rebuild локально по хвосту не делаем.
    return bars.slice();
  }

  const appended = [
    ...bars,
    {
      time,
      open: trade.price,
      high: trade.price,
      low: trade.price,
      close: trade.price,
      volume: trade.qty,
    },
  ];
  return appended.length > maxBars ? appended.slice(-maxBars) : appended;
}
