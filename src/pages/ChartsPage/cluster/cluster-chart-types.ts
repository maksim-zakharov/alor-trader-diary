/** Сторона тейкера. */
export type ClusterChartTradeSide = 'buy' | 'sell';

/** Сделка для footprint-кластеров. */
export interface ClusterChartTrade {
  /** Id сделки Alor (для дедупа REST/WS), если есть */
  id?: string;
  /** Время, мс */
  timeMs: number;
  /** Цена */
  price: number;
  /** Объём в лотах */
  qty: number;
  /** Нотионал (qty × price) */
  quoteQty: number;
  /** Сторона тейкера */
  side: ClusterChartTradeSide;
}

/** Строка ценовой лестницы (Y-ось кластерного графика). */
export interface ClusterChartLadderRow {
  /** Цена */
  price: number;
}
