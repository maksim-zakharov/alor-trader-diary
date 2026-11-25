import type { ClusterChartColumn } from './cluster-chart-build';
import { sliceClusterChartVisibleColumns } from './cluster-chart-draw';
import type { ClusterChartTrade } from './cluster-chart-types';

/** Публичная сделка Alor alltrades (минимальный shape). */
export interface AlorMoexAlltrade {
  /** Id */
  id?: string | number;
  /** Время, ms или sec */
  time?: number;
  /** timestamp */
  timestamp?: number;
  /** Цена */
  price: number;
  /** Объём */
  qty: number;
  /** Сторона */
  side?: string;
  /** buy/sell */
  buysell?: string;
}

/** Значение day в query/UI для live-режима Alor. */
export const CLUSTER_CHART_TODAY_DAY = 'today';

/** Мин. запас колонок слева от видимого окна. */
export const CLUSTER_CHART_TODAY_PREFETCH_COLUMNS = 8;

/**
 * Запас слева относительно видимой ширины: чуть больше одного экрана,
 * чтобы при drag в прошлое свечи уже были в памяти.
 */
export const CLUSTER_CHART_TODAY_PREFETCH_VISIBLE_RATIO = 1.25;

/** Макс. длина одного REST-запроса окна (safety). */
export const CLUSTER_CHART_TODAY_MAX_WINDOW_MS = 2 * 60 * 60_000;

/** Базовый размер чанка REST при инкрементальной подгрузке «сегодня», ms. */
export const CLUSTER_CHART_TODAY_FETCH_CHUNK_MS = 5 * 60_000;

/** Минимум свечей (бакетов) в одном REST-чанке — не грузить по одной на крупном ТФ. */
export const CLUSTER_CHART_TODAY_FETCH_MIN_CANDLES = 48;

/**
 * Длина REST-чанка с учётом ТФ: на 5м и выше не по одной свече.
 */
export function resolveClusterChartFetchChunkMs(
  bucketMs: number,
  fallbackMs: number = CLUSTER_CHART_TODAY_FETCH_CHUNK_MS,
): number {
  const bucket = Number.isFinite(bucketMs) && bucketMs > 0 ? bucketMs : 60_000;
  const base = Number.isFinite(fallbackMs) && fallbackMs > 0 ? fallbackMs : CLUSTER_CHART_TODAY_FETCH_CHUNK_MS;
  const byCandles = bucket * CLUSTER_CHART_TODAY_FETCH_MIN_CANDLES;
  return Math.min(CLUSTER_CHART_TODAY_MAX_WINDOW_MS, Math.max(base, byCandles));
}

/**
 * Режет интервал на чанки от новых к старым (чтобы сразу показать правый край графика).
 */
export function splitClusterChartCoverageNewestFirst(
  range: ClusterChartLoadedCoverage,
  chunkMs: number = CLUSTER_CHART_TODAY_FETCH_CHUNK_MS,
): ClusterChartLoadedCoverage[] {
  if (!(range.toMs > range.fromMs)) return [];
  const step =
    Number.isFinite(chunkMs) && chunkMs > 0 ? Math.floor(chunkMs) : CLUSTER_CHART_TODAY_FETCH_CHUNK_MS;
  const out: ClusterChartLoadedCoverage[] = [];
  let to = range.toMs;
  while (to > range.fromMs) {
    const from = Math.max(range.fromMs, to - step);
    out.push({ fromMs: from, toMs: to });
    if (!(from < to)) break;
    to = from;
  }
  return out;
}

/**
 * Проверяет, выбран ли режим «сегодня» (Alor alltrades).
 */
export function isClusterChartTodayDay(day: string | null | undefined): boolean {
  return (day ?? '').trim().toLowerCase() === CLUSTER_CHART_TODAY_DAY;
}

/**
 * Начало календарного дня Europe/Moscow (UTC+3 без DST), ms UTC.
 */
export function resolveMoscowDayStartMs(nowMs: number = Date.now()): number {
  const mskOffsetMs = 3 * 3600_000;
  const mskNow = nowMs + mskOffsetMs;
  const dayIndex = Math.floor(mskNow / 86_400_000);
  return dayIndex * 86_400_000 - mskOffsetMs;
}

/**
 * Макс. scrollFromEnd за сегодня по ТФ — pan не ждёт подгрузку колонок.
 */
export function resolveClusterChartDayMaxScroll(
  bucketMs: number,
  visibleCount: number,
  nowMs: number = Date.now(),
  dayStartMs?: number,
): number {
  const bucket = Number.isFinite(bucketMs) && bucketMs > 0 ? bucketMs : 60_000;
  const visible = Math.max(1, Math.floor(visibleCount));
  const dayStart = dayStartMs ?? resolveMoscowDayStartMs(nowMs);
  const spanMs = Math.max(0, nowMs - dayStart);
  const bucketsInDay = Math.max(1, Math.ceil(spanMs / bucket));
  return Math.max(0, bucketsInDay - visible);
}

/**
 * Маппинг Alor alltrade → сделка кластерного графика.
 */
export function mapAlorAlltradeToClusterChartTrade(
  trade: AlorMoexAlltrade,
): ClusterChartTrade | null {
  const rawTime = Number(trade.timestamp ?? trade.time);
  // Alor WS часто отдаёт секунды, REST Slim — мс.
  const timeMs =
    Number.isFinite(rawTime) && rawTime > 0 && rawTime < 1e12 ? rawTime * 1000 : rawTime;
  const price = Number(trade.price);
  const qty = Number(trade.qty);
  if (!(Number.isFinite(timeMs) && timeMs > 0)) return null;
  if (!(Number.isFinite(price) && price > 0)) return null;
  if (!(Number.isFinite(qty) && qty > 0)) return null;
  const sideRaw = (trade.side ?? trade.buysell ?? '').toString().toLowerCase();
  const side = sideRaw === 'sell' || sideRaw === 's' ? 'sell' : 'buy';
  const idRaw = trade.id;
  const id =
    typeof idRaw === 'string' && idRaw.trim() !== ''
      ? idRaw.trim()
      : typeof idRaw === 'number' && Number.isSafeInteger(idRaw)
        ? String(idRaw)
        : undefined;
  const out: ClusterChartTrade = {
    timeMs,
    price,
    qty,
    quoteQty: qty * price,
    side,
  };
  if (id != null) out.id = id;
  return out;
}

/**
 * Непрерывный интервал уже загруженных сделок.
 */
export interface ClusterChartLoadedCoverage {
  /** Левая граница включительно, ms */
  fromMs: number;
  /** Правая граница включительно, ms */
  toMs: number;
}

/**
 * Сливает новый интервал в coverage (ожидаем стык/перекрытие).
 */
export function mergeClusterChartCoverage(
  prev: ClusterChartLoadedCoverage | null,
  next: ClusterChartLoadedCoverage,
): ClusterChartLoadedCoverage {
  if (!prev) return next;
  return {
    fromMs: Math.min(prev.fromMs, next.fromMs),
    toMs: Math.max(prev.toMs, next.toMs),
  };
}

/**
 * Вычисляет окно времени, которое нужно иметь в памяти под текущий viewport.
 */
export function resolveClusterChartTodayNeededWindow(options: {
  /** Столбики уже собранные из загруженных сделок */
  columns: readonly ClusterChartColumn[];
  /** Сдвиг окна в прошлое */
  scrollFromEnd: number;
  /** Сколько колонок влезает на экран */
  visibleColumnCount: number;
  /** ТФ бакета, ms */
  bucketMs: number;
  /** Сейчас, ms */
  nowMs?: number;
  /** Старт сегодняшнего дня MSK, ms */
  dayStartMs?: number;
}): { fromMs: number; toMs: number } {
  const nowMs = options.nowMs ?? Date.now();
  const dayStartMs = options.dayStartMs ?? resolveMoscowDayStartMs(nowMs);
  const bucketMs = options.bucketMs > 0 ? options.bucketMs : 60_000;
  const visible = Math.max(1, Math.floor(options.visibleColumnCount));
  const prefetch = Math.max(
    CLUSTER_CHART_TODAY_PREFETCH_COLUMNS,
    Math.ceil(visible * CLUSTER_CHART_TODAY_PREFETCH_VISIBLE_RATIO),
  );
  const padMs = prefetch * bucketMs;

  if (!options.columns.length) {
    const span = Math.min(CLUSTER_CHART_TODAY_MAX_WINDOW_MS, (visible + prefetch) * bucketMs);
    return {
      fromMs: Math.max(dayStartMs, nowMs - span),
      toMs: nowMs,
    };
  }

  const visibleCols = sliceClusterChartVisibleColumns(
    options.columns,
    visible,
    options.scrollFromEnd,
  );
  const firstVisible =
    visibleCols[0]?.bucketStartMs ?? options.columns[0]?.bucketStartMs ?? nowMs - padMs;
  const lastVisible =
    visibleCols[visibleCols.length - 1]?.bucketStartMs ??
    options.columns[options.columns.length - 1]?.bucketStartMs ??
    nowMs;

  // Всегда держим слева ≥1.25 экрана; у края / overscroll — ещё запас.
  const histScroll = Math.max(0, Math.floor(options.scrollFromEnd));
  const dataCount = Math.max(1, visible - Math.max(0, -Math.floor(options.scrollFromEnd)));
  const loadedMaxScroll = Math.max(0, options.columns.length - dataCount);
  const overscrollCols = Math.max(0, histScroll - loadedMaxScroll);
  const nearLeftEdge = histScroll >= Math.max(0, loadedMaxScroll - Math.max(2, Math.ceil(visible * 0.25)));
  const leftPad =
    (nearLeftEdge || overscrollCols > 0 ? padMs * 1.5 : padMs) + overscrollCols * bucketMs;

  let fromMs = Math.max(dayStartMs, firstVisible - leftPad);
  let toMs = Math.min(nowMs, Math.max(lastVisible + bucketMs, nowMs));

  if (toMs - fromMs > CLUSTER_CHART_TODAY_MAX_WINDOW_MS) {
    // Сжимаем к видимому центру, чтобы не тянуть весь день одним запросом.
    const mid = (firstVisible + lastVisible) / 2;
    fromMs = Math.max(dayStartMs, mid - CLUSTER_CHART_TODAY_MAX_WINDOW_MS / 2);
    toMs = Math.min(nowMs, fromMs + CLUSTER_CHART_TODAY_MAX_WINDOW_MS);
  }

  return { fromMs, toMs };
}

/**
 * Куски needed, которых ещё нет в coverage (обычно 0–1 интервал).
 */
export function resolveClusterChartCoverageGaps(
  needed: ClusterChartLoadedCoverage,
  coverage: ClusterChartLoadedCoverage | null,
): ClusterChartLoadedCoverage[] {
  if (!(needed.toMs > needed.fromMs)) return [];
  if (!coverage) return [needed];

  const gaps: ClusterChartLoadedCoverage[] = [];
  if (needed.fromMs < coverage.fromMs) {
    gaps.push({
      fromMs: needed.fromMs,
      toMs: Math.min(needed.toMs, coverage.fromMs),
    });
  }
  if (needed.toMs > coverage.toMs) {
    gaps.push({
      fromMs: Math.max(needed.fromMs, coverage.toMs),
      toMs: needed.toMs,
    });
  }
  return gaps.filter((gap) => gap.toMs > gap.fromMs);
}

/**
 * Ключ дедупа: id Alor, иначе time+price+qty+side.
 */
export function clusterChartTradeDedupeKey(trade: ClusterChartTrade): string {
  if (trade.id != null && trade.id !== '') return `id:${trade.id}`;
  return `t:${trade.timeMs}|${trade.price}|${trade.qty}|${trade.side}`;
}

/**
 * Мержит сделки (дедуп по id Alor или time+price+qty+side).
 */
export function mergeClusterChartTrades(
  prev: readonly ClusterChartTrade[],
  incoming: readonly ClusterChartTrade[],
): ClusterChartTrade[] {
  if (!incoming.length) return prev.slice();
  if (!prev.length) {
    return incoming.slice().sort((a, b) => a.timeMs - b.timeMs);
  }
  const seen = new Set(prev.map(clusterChartTradeDedupeKey));
  const out = prev.slice();
  for (const trade of incoming) {
    const key = clusterChartTradeDedupeKey(trade);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(trade);
  }
  out.sort((a, b) => a.timeMs - b.timeMs);
  return out;
}
