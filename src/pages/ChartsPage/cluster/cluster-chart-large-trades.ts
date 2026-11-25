import type { ClusterChartColumn } from './cluster-chart-build';

/** Маркер крупной сделки (заглушка без replay/alor-server). */
export interface ReplayAlgoChartMarker {
  /** Буква L/S */
  letter: 'L' | 'S';
  /** Время, sec */
  time: number;
  /** Цена */
  price: number;
  /** Источник */
  source?: string;
  /** Hits */
  hits: unknown[];
}

/** Зона крупного size (заглушка). */
export interface LargestSizeZone {
  /** Мин. цена */
  minPrice: number;
  /** Макс. цена */
  maxPrice: number;
  /** Время from, sec */
  fromSec: number;
  /** Время to, sec */
  toSec: number;
  /** Цвет */
  color: string;
}

/** Hit-target нарисованного L/S. */
export interface ClusterChartLargeTradePaintHit {
  /** Маркер */
  marker: ReplayAlgoChartMarker;
  /** Центр X */
  x: number;
  /** Центр Y */
  y: number;
  /** Радиус */
  r: number;
}

/** No-op: крупные сделки без серверных sizes. */
export function drawClusterChartLargeTradeMarkers(): ClusterChartLargeTradePaintHit[] {
  return [];
}

/** No-op. */
export function drawClusterChartLargeTradeZones(): void {}

/** Hit-test пустой. */
export function hitTestClusterChartLargeTrade(): ClusterChartLargeTradePaintHit | null {
  return null;
}

/** Крупные всегда выкл без серверных данных. */
export function resolveClusterChartLargeTradesEnabled(): boolean {
  return false;
}

/** Интерес к крупным — нет. */
export function resolveClusterChartLargeTradeInterest(): boolean {
  return false;
}

/** Пустые маркеры. */
export function buildClusterChartLargeTradeMarkers(
  _columns?: readonly ClusterChartColumn[],
): ReplayAlgoChartMarker[] {
  return [];
}

/** Пустые зоны. */
export function buildClusterChartLargeTradeZones(): LargestSizeZone[] {
  return [];
}

/** Пустые hits из сделок. */
export function buildClusterChartSizeHitsFromTrades(): unknown[] {
  return [];
}

/** Merge hits. */
export function mergeClusterChartSizeHits(): unknown[] {
  return [];
}
