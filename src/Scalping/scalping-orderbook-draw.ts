import type {
  ScalpingOrderbookTrade,
  ScalpingOrderbookTradeCluster,
  ScalpingOrderbookTradeSide,
} from './scalping-orderbook-types';

/** Длительность плавной отрисовки ленты, мс. */
export const SCALPING_ORDERBOOK_SMOOTH_MS = 50;

/** Окно агрегации сделок в шарик, мс. */
export const SCALPING_ORDERBOOK_TRADES_AGGREGATE_MS = 200;

/** Макс. кластеров в памяти. */
const SCALPING_ORDERBOOK_MAX_CLUSTERS = 400;

/** Формат объёма. */
export type ScalpingOrderbookQtyFormat = 'compact' | 'exact';

/** Состояние анимации позиций шариков ленты. */
export interface ScalpingOrderbookTapeAnimState {
  /** Текущие визуальные координаты по ключу кластера */
  positions: Map<string, { x: number; cy: number }>;
  /** Активные переходы */
  transitions: Map<
    string,
    {
      fromX: number;
      toX: number;
      fromCy: number;
      toCy: number;
      startMs: number;
    }
  >;
}

/**
 * Пустое состояние анимации ленты.
 */
export function createScalpingOrderbookTapeAnimState(): ScalpingOrderbookTapeAnimState {
  return { positions: new Map(), transitions: new Map() };
}

/**
 * Компактный объём (1.5K).
 */
export function formatScalpingOrderbookQty(qty: number): string {
  if (!(Number.isFinite(qty) && qty > 0)) return '';
  const abs = Math.abs(qty);
  if (abs >= 1_000_000) return `${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${(abs / 1_000).toFixed(1)}K`;
  return String(Math.floor(abs));
}

/**
 * Точный объём.
 */
export function formatScalpingOrderbookQtyExact(qty: number): string {
  if (!(Number.isFinite(qty) && qty > 0)) return '';
  const abs = Math.floor(Math.abs(qty));
  return abs > 0 ? String(abs) : '';
}

/**
 * Объём по выбранному формату.
 */
export function formatScalpingOrderbookQtyByMode(
  qty: number,
  mode: ScalpingOrderbookQtyFormat = 'compact',
): string {
  return mode === 'exact' ? formatScalpingOrderbookQtyExact(qty) : formatScalpingOrderbookQty(qty);
}

function clusterKey(timeMs: number, side: ScalpingOrderbookTradeSide, windowMs: number): string {
  const bucket = Math.floor(timeMs / windowMs) * windowMs;
  return `${bucket}:${side}`;
}

/**
 * Вмерживает сделки в кластеры по окну aggregateMs.
 */
export function mergeScalpingOrderbookTradeClusters(
  prev: readonly ScalpingOrderbookTradeCluster[],
  incoming: readonly ScalpingOrderbookTrade[],
  aggregateMs: number = SCALPING_ORDERBOOK_TRADES_AGGREGATE_MS,
): ScalpingOrderbookTradeCluster[] {
  const windowMs =
    Number.isFinite(aggregateMs) && aggregateMs >= 0
      ? aggregateMs === 0
        ? 1
        : aggregateMs
      : SCALPING_ORDERBOOK_TRADES_AGGREGATE_MS;
  const map = new Map<string, ScalpingOrderbookTradeCluster>();
  for (const c of prev) {
    map.set(clusterKey(c.timeMs, c.side, windowMs), { ...c });
  }
  for (const t of incoming) {
    const key = clusterKey(t.timeMs, t.side, windowMs);
    const bucket = Math.floor(t.timeMs / windowMs) * windowMs;
    const quoteQty = Number.isFinite(t.quoteQty) && t.quoteQty > 0 ? t.quoteQty : t.qty * t.price;
    const existing = map.get(key);
    if (existing == null) {
      map.set(key, {
        timeMs: bucket,
        side: t.side,
        qty: t.qty,
        quoteQty,
        minPrice: t.price,
        maxPrice: t.price,
        count: 1,
      });
      continue;
    }
    existing.qty += t.qty;
    existing.quoteQty += quoteQty;
    existing.count += 1;
    if (t.price < existing.minPrice) existing.minPrice = t.price;
    if (t.price > existing.maxPrice) existing.maxPrice = t.price;
  }
  return [...map.values()]
    .sort((a, b) => a.timeMs - b.timeMs)
    .slice(-SCALPING_ORDERBOOK_MAX_CLUSTERS);
}
