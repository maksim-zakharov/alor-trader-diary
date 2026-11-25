/** Сторона тейкера в ленте принтов. */
export type ScalpingOrderbookTradeSide = 'buy' | 'sell';

/** Сделка для ленты принтов. */
export interface ScalpingOrderbookTrade {
  /** Время, мс */
  timeMs: number;
  /** Цена */
  price: number;
  /** Объём */
  qty: number;
  /** Нотионал */
  quoteQty: number;
  /** Сторона тейкера */
  side: ScalpingOrderbookTradeSide;
}

/** Агрегированный кластер сделок для шариков ленты. */
export interface ScalpingOrderbookTradeCluster {
  /** Начало окна, мс */
  timeMs: number;
  /** Сторона тейкера */
  side: ScalpingOrderbookTradeSide;
  /** Суммарный объём */
  qty: number;
  /** Суммарный нотионал */
  quoteQty: number;
  /** Мин. цена в окне */
  minPrice: number;
  /** Макс. цена в окне */
  maxPrice: number;
  /** Число исходных сделок */
  count: number;
}
