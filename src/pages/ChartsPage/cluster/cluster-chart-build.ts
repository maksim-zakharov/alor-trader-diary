import type { ClusterChartTrade } from './cluster-chart-types';

/** Доступные ТФ столбика кластеров (подпись как у графика стакана + длительность бакета). */
export const CLUSTER_CHART_TF_OPTIONS = [
  { label: '0.5s', bucketMs: 500 },
  { label: '1s', bucketMs: 1_000 },
  { label: '15s', bucketMs: 15_000 },
  { label: '1m', bucketMs: 60_000 },
  { label: '5m', bucketMs: 300_000 },
  { label: '15m', bucketMs: 900_000 },
  { label: '30m', bucketMs: 1_800_000 },
] as const;

/** Длительность бакета кластеров по умолчанию, мс (5 минут). */
export const CLUSTER_CHART_BUCKET_MS = 300_000;

/** Допустимые значения ТФ кластеров, мс. */
export const CLUSTER_CHART_BUCKET_MS_SET: ReadonlySet<number> = new Set(
  CLUSTER_CHART_TF_OPTIONS.map((option) => option.bucketMs),
);

/**
 * Нормализует ТФ кластеров к одному из {@link CLUSTER_CHART_TF_OPTIONS}.
 */
export function normalizeClusterChartBucketMs(
  value: unknown,
  fallback: number = CLUSTER_CHART_BUCKET_MS,
): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (CLUSTER_CHART_BUCKET_MS_SET.has(n)) return n;
  if (CLUSTER_CHART_BUCKET_MS_SET.has(fallback)) return fallback;
  return CLUSTER_CHART_BUCKET_MS;
}

/**
 * Подпись ТФ кластеров для меню.
 */
export function formatClusterChartTfLabel(bucketMs: number): string {
  const normalized = normalizeClusterChartBucketMs(bucketMs);
  const found = CLUSTER_CHART_TF_OPTIONS.find((option) => option.bucketMs === normalized);
  return found?.label ?? '5m';
}

/** Ширина одного столбика кластеров, px (~33% уже прежнего 52). */
export const CLUSTER_CHART_COL_WIDTH = 35;

/** Макс. число хранимых столбиков кластеров и ширина секции drag’ом (последние N свечей). */
export const CLUSTER_CHART_DEFAULT_COLUMNS = 10;

/**
 * Окно хранения сделок footprint под выбранный ТФ (N+1 бакет).
 */
export function resolveClusterChartTradeKeepMs(
  bucketMs: number = CLUSTER_CHART_BUCKET_MS,
): number {
  const normalized = normalizeClusterChartBucketMs(bucketMs);
  return normalized * (CLUSTER_CHART_DEFAULT_COLUMNS + 1);
}

/** Сколько столбиков видно по умолчанию (зона/зум стартует с этого). */
export const CLUSTER_CHART_DEFAULT_VISIBLE_COLUMNS = 2;

/** Мин. число видимых столбиков при горизонтальном зуме. */
export const CLUSTER_CHART_MIN_COLUMNS = 1;

/** Мин. ширина столбика при растягивании по секции, px. */
export const CLUSTER_CHART_MIN_COL_WIDTH = 24;

/** Высота панели объёма под кластерами (как Volume на графике), px. */
export const CLUSTER_CHART_VOLUME_H = 56;

/** Высота оси времени под объёмом, px. */
export const CLUSTER_CHART_TIME_AXIS_H = 20;

/** Суммарная высота нижней зоны (объём + время), px. */
export const CLUSTER_CHART_FOOTER_H = CLUSTER_CHART_VOLUME_H + CLUSTER_CHART_TIME_AXIS_H;

/** Шаг горизонтальной сетки в пунктах (1 пункт = 1 tick). */
export const CLUSTER_CHART_H_GRID_POINTS = 50;

/** Ячейка кластера на уровне цены. */
export interface ClusterChartCell {
  /** Объём покупок (лоты) */
  buyQty: number;
  /** Объём продаж (лоты) */
  sellQty: number;
}

/** Столбик кластеров за один бакет ТФ. */
export interface ClusterChartColumn {
  /** Начало бакета, ms */
  bucketStartMs: number;
  /** tickKey → ячейка */
  cells: Map<number, ClusterChartCell>;
  /** Сумма buy */
  totalBuy: number;
  /** Сумма sell */
  totalSell: number;
  /** Цена открытия (первая сделка) */
  open: number;
  /** Цена закрытия (последняя сделка) */
  close: number;
  /** Макс. цена */
  high: number;
  /** Мин. цена */
  low: number;
}

/** Ширина полоски OHLC слева от ячеек, px. */
export const CLUSTER_CHART_CANDLE_STRIP_W = 4;

/**
 * Нормализует начало 5‑минутного бакета.
 */
export function clusterChartBucketStartMs(
  timeMs: number,
  bucketMs: number = CLUSTER_CHART_BUCKET_MS,
): number {
  if (!(Number.isFinite(timeMs) && timeMs > 0)) return 0;
  const window = Number.isFinite(bucketMs) && bucketMs > 0 ? bucketMs : CLUSTER_CHART_BUCKET_MS;
  return Math.floor(timeMs / window) * window;
}

/**
 * Собирает столбики кластеров (footprint) по сделкам: бакет 5 мин × цена (tick).
 * Возвращает не более maxColumns последних бакетов (справа — самые новые).
 */
export function buildClusterChartColumns(
  trades: readonly ClusterChartTrade[],
  options: {
    /** Шаг цены */
    tick: number;
    /** Ширина бакета, ms */
    bucketMs?: number;
    /** Макс. число столбиков */
    maxColumns?: number;
    /** Учитывать сделки только до этого времени (включительно) */
    untilMs?: number;
  },
): ClusterChartColumn[] {
  const tick = options.tick;
  if (!(Number.isFinite(tick) && tick > 0)) return [];
  const bucketMs =
    options.bucketMs != null && Number.isFinite(options.bucketMs) && options.bucketMs > 0
      ? options.bucketMs
      : CLUSTER_CHART_BUCKET_MS;
  const maxColumns =
    options.maxColumns != null && Number.isFinite(options.maxColumns) && options.maxColumns > 0
      ? Math.floor(options.maxColumns)
      : 32;
  const untilMs =
    options.untilMs != null && Number.isFinite(options.untilMs) ? options.untilMs : Number.POSITIVE_INFINITY;

  const byBucket = new Map<number, ClusterChartColumn>();

  for (const trade of trades) {
    if (!(trade.timeMs <= untilMs)) continue;
    if (!(Number.isFinite(trade.price) && trade.price > 0)) continue;
    if (!(Number.isFinite(trade.qty) && trade.qty > 0)) continue;
    const bucketStartMs = clusterChartBucketStartMs(trade.timeMs, bucketMs);
    if (!(bucketStartMs > 0)) continue;
    let column = byBucket.get(bucketStartMs);
    if (!column) {
      column = {
        bucketStartMs,
        cells: new Map(),
        totalBuy: 0,
        totalSell: 0,
        open: trade.price,
        close: trade.price,
        high: trade.price,
        low: trade.price,
      };
      byBucket.set(bucketStartMs, column);
    } else {
      column.close = trade.price;
      if (trade.price > column.high) column.high = trade.price;
      if (trade.price < column.low) column.low = trade.price;
    }
    const tickKey = Math.round(trade.price / tick);
    let cell = column.cells.get(tickKey);
    if (!cell) {
      cell = { buyQty: 0, sellQty: 0 };
      column.cells.set(tickKey, cell);
    }
    const qty = trade.qty;
    if (trade.side === 'sell') {
      cell.sellQty += qty;
      column.totalSell += qty;
    } else {
      cell.buyQty += qty;
      column.totalBuy += qty;
    }
  }

  return [...byBucket.values()]
    .sort((a, b) => a.bucketStartMs - b.bucketStartMs)
    .slice(-maxColumns);
}

/**
 * Индекс последней сделки с timeMs ≤ untilMs (−1 если нет).
 */
export function findLastClusterChartTradeIndexAtOrBefore(
  trades: readonly ClusterChartTrade[],
  untilMs: number,
): number {
  if (!trades.length || !(Number.isFinite(untilMs))) return -1;
  let lo = 0;
  let hi = trades.length - 1;
  let ans = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (trades[mid].timeMs <= untilMs) {
      ans = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return ans;
}

/**
 * Индекс первой сделки с timeMs ≥ fromMs (length, если нет).
 */
export function findFirstClusterChartTradeIndexAtOrAfter(
  trades: readonly ClusterChartTrade[],
  fromMs: number,
): number {
  if (!trades.length || !Number.isFinite(fromMs)) return 0;
  let lo = 0;
  let hi = trades.length - 1;
  let ans = trades.length;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (trades[mid]!.timeMs >= fromMs) {
      ans = mid;
      hi = mid - 1;
    } else {
      lo = mid + 1;
    }
  }
  return ans;
}

/**
 * Сколько столбиков влезет в доступную ширину (базовая ширина колонки).
 */
export function resolveClusterChartColumnCount(availableWidth: number): number {
  if (!(availableWidth >= CLUSTER_CHART_COL_WIDTH)) return 0;
  return Math.floor(availableWidth / CLUSTER_CHART_COL_WIDTH);
}

/**
 * Нормализует число видимых столбиков (зум 1…DEFAULT_COLUMNS).
 */
export function normalizeClusterChartVisibleColumns(value: number): number {
  if (!Number.isFinite(value)) {
    return CLUSTER_CHART_DEFAULT_VISIBLE_COLUMNS;
  }
  return Math.min(
    CLUSTER_CHART_DEFAULT_COLUMNS,
    Math.max(CLUSTER_CHART_MIN_COLUMNS, Math.floor(value)),
  );
}

/**
 * Шаг горизонтального зума кластеров.
 * @param delta −1 зум+ (меньше колонок), +1 зум− (больше колонок)
 */
export function stepClusterChartVisibleColumns(
  current: number,
  delta: number,
): number {
  const step = Number.isFinite(delta) ? Math.sign(delta) : 0;
  if (step === 0) return normalizeClusterChartVisibleColumns(current);
  return normalizeClusterChartVisibleColumns(
    normalizeClusterChartVisibleColumns(current) + step,
  );
}

/**
 * Сколько колонок реально показать в секции при текущем зуме.
 * Колёсико меняет число свечей внутри; ширина секции задаётся drag’ом отдельно.
 */
export function resolveClusterChartVisibleColumns(
  availableWidth: number,
  zoomColumns: number = CLUSTER_CHART_DEFAULT_VISIBLE_COLUMNS,
): number {
  const want = normalizeClusterChartVisibleColumns(zoomColumns);
  if (!(availableWidth >= CLUSTER_CHART_MIN_COL_WIDTH)) return 0;
  return want;
}

/**
 * Ширина секции кластеров по числу колонок секции (поколоночно, drag).
 * Колёсико на ширину не влияет — только на зум свечей внутри.
 */
export function resolveClusterChartSectionWidth(
  columnCount: number = CLUSTER_CHART_DEFAULT_VISIBLE_COLUMNS,
): number {
  return (
    normalizeClusterChartVisibleColumns(columnCount) *
    CLUSTER_CHART_COL_WIDTH
  );
}

/**
 * Число колонок секции по целевой ширине (snap при drag).
 */
export function resolveClusterChartSectionColumnsFromWidth(
  widthPx: number,
): number {
  if (!(Number.isFinite(widthPx) && widthPx > 0)) {
    return CLUSTER_CHART_MIN_COLUMNS;
  }
  return normalizeClusterChartVisibleColumns(
    Math.round(widthPx / CLUSTER_CHART_COL_WIDTH),
  );
}

/**
 * Сколько истории сделок держать для footprint при дефолтном ТФ (N+1 бакет).
 * Для другого ТФ — {@link resolveClusterChartTradeKeepMs}.
 */
export const CLUSTER_CHART_TRADE_KEEP_MS = resolveClusterChartTradeKeepMs(
  CLUSTER_CHART_BUCKET_MS,
);

/** Жёсткий потолок буфера сделок (защита от спама на ликвидных рынках). */
export const CLUSTER_CHART_TRADE_MAX_COUNT = 20_000;

/**
 * Дописывает сделки в буфер footprint и обрезает по времени / размеру.
 * Порядок по `timeMs` ascending (нужен для бинарного поиска playhead).
 */
export function appendClusterChartTrades(
  prev: readonly ClusterChartTrade[],
  batch: readonly ClusterChartTrade[],
  options?: {
    /** Окно хранения, ms */
    keepMs?: number;
    /** «Сейчас» для cutoff */
    nowMs?: number;
    /** Макс. число сделок */
    maxCount?: number;
  },
): ClusterChartTrade[] {
  if (!prev.length && !batch.length) return [];
  const keepMs =
    options?.keepMs != null && Number.isFinite(options.keepMs) && options.keepMs > 0
      ? options.keepMs
      : CLUSTER_CHART_TRADE_KEEP_MS;
  const nowMs =
    options?.nowMs != null && Number.isFinite(options.nowMs) && options.nowMs > 0
      ? options.nowMs
      : Date.now();
  const maxCount =
    options?.maxCount != null && Number.isFinite(options.maxCount) && options.maxCount > 0
      ? Math.floor(options.maxCount)
      : CLUSTER_CHART_TRADE_MAX_COUNT;
  const cutoff = nowMs - keepMs;
  const out: ClusterChartTrade[] = [];
  for (const trade of prev) {
    if (trade.timeMs >= cutoff) out.push(trade);
  }
  for (const trade of batch) {
    if (trade.timeMs >= cutoff) out.push(trade);
  }
  for (let i = 1; i < out.length; i++) {
    if (out[i]!.timeMs < out[i - 1]!.timeMs) {
      out.sort((a, b) => a.timeMs - b.timeMs);
      break;
    }
  }
  if (out.length > maxCount) return out.slice(-maxCount);
  return out;
}
