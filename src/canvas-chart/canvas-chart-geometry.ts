/**
 * Общая геометрия и зум канвас-графика (screener candles / cluster footprint).
 */

/** Пикселей drag по шкале ≈ один шаг колеса. */
export const CANVAS_CHART_SCALE_DRAG_STEP_PX = 28;

/** Высота зоны шкалы времени снизу, px. */
export const CANVAS_CHART_TIME_SCALE_ZONE_H = 16;

/** Мин. множитель вертикального масштаба цены. */
export const CANVAS_CHART_PRICE_SCALE_MIN = 0.15;

/** Макс. множитель вертикального масштаба цены. */
export const CANVAS_CHART_PRICE_SCALE_MAX = 8;

/** Шаг вертикального зума колесом. */
export const CANVAS_CHART_PRICE_SCALE_FACTOR = 1.12;

/** Шаг горизонтального зума колесом (множитель числа видимых баров). */
export const CANVAS_CHART_TIME_ZOOM_FACTOR = 1.15;

/** Игнор дрожания host ResizeObserver, px. */
export const CANVAS_CHART_RESIZE_HYSTERESIS_PX = 2;

/**
 * DPR с учётом площади: на fullscreen 2× даёт миллионы пикселей и лаги.
 */
export function resolveCanvasChartDpr(cssWidth: number, cssHeight: number): number {
  const raw =
    typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 2) : 1;
  const area = Math.max(0, cssWidth) * Math.max(0, cssHeight);
  if (area >= 1_200_000) return 1;
  if (area >= 700_000) return Math.min(raw, 1.25);
  if (area >= 400_000) return Math.min(raw, 1.5);
  return raw;
}

/**
 * Попадание в зону шкалы цены справа.
 */
export function isCanvasChartPriceScaleZone(
  x: number,
  cssWidth: number,
  rightPadding: number,
): boolean {
  if (!(cssWidth > 0) || !Number.isFinite(x)) return false;
  const right = Number.isFinite(rightPadding) && rightPadding > 0 ? rightPadding : 0;
  if (!(right > 0)) return false;
  return x >= cssWidth - right;
}

/**
 * Попадание в зону шкалы времени снизу.
 */
export function isCanvasChartTimeScaleZone(
  y: number,
  cssHeight: number,
  zoneH: number = CANVAS_CHART_TIME_SCALE_ZONE_H,
): boolean {
  if (!(cssHeight > 0) || !Number.isFinite(y)) return false;
  const h = zoneH > 0 ? zoneH : CANVAS_CHART_TIME_SCALE_ZONE_H;
  return y >= cssHeight - h;
}

/**
 * Ограничивает вертикальный масштаб цены.
 */
export function clampCanvasChartPriceScale(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.max(CANVAS_CHART_PRICE_SCALE_MIN, Math.min(CANVAS_CHART_PRICE_SCALE_MAX, value));
}

/**
 * Новый вертикальный масштаб: вниз — сужение (scale↑), вверх — расширение (scale↓).
 * `deltaY` масштабируется непрерывно (`±100` ≈ один прежний шаг колеса).
 */
export function nextCanvasChartPriceScale(current: number, deltaY: number): number {
  if (!(deltaY !== 0 && Number.isFinite(deltaY))) return clampCanvasChartPriceScale(current);
  const units = deltaY / 100;
  const next = current * Math.pow(CANVAS_CHART_PRICE_SCALE_FACTOR, units);
  return clampCanvasChartPriceScale(next);
}

/**
 * Растягивает/сжимает ценовой диапазон вокруг середины.
 */
export function applyCanvasChartPriceScale(
  range: { min: number; max: number },
  scale: number,
): { min: number; max: number } {
  const s = clampCanvasChartPriceScale(scale);
  if (s === 1) return range;
  const mid = (range.min + range.max) / 2;
  const half = ((range.max - range.min) / 2) * s;
  return { min: mid - half, max: mid + half };
}

/**
 * Ограничивает число видимых элементов (баров/колонок).
 */
export function clampCanvasChartVisibleCount(
  value: number,
  minCount: number,
  maxCount: number,
): number {
  if (!Number.isFinite(value)) return minCount;
  return Math.max(minCount, Math.min(maxCount, Math.round(value)));
}

/**
 * Новое число видимых элементов по deltaY колеса.
 * `deltaY` масштабируется непрерывно (`±100` ≈ один прежний шаг колеса).
 */
export function nextCanvasChartVisibleCount(
  current: number,
  deltaY: number,
  minCount: number,
  maxCount: number,
  factor: number = CANVAS_CHART_TIME_ZOOM_FACTOR,
): number {
  if (!(deltaY !== 0 && Number.isFinite(deltaY))) {
    return clampCanvasChartVisibleCount(current, minCount, maxCount);
  }
  const f = factor > 1 ? factor : CANVAS_CHART_TIME_ZOOM_FACTOR;
  const next = current * Math.pow(f, deltaY / 100);
  return clampCanvasChartVisibleCount(next, minCount, maxCount);
}

/**
 * Дробная часть pan-offset (0…1) для пиксельного сдвига слотов.
 * Общая для screener-свечей и cluster-колонок.
 */
export function resolveCanvasChartPanFrac(offset: number): number {
  if (!(Number.isFinite(offset) && offset > 0)) return 0;
  const frac = offset - Math.floor(offset);
  return frac > 1e-9 ? frac : 0;
}

/**
 * X центра i-го слота с учётом дробного пана и «заглядывающего» слота слева.
 */
export function canvasChartSlotCenterX(opts: {
  /** Индекс в срезе */
  index: number;
  /** Левый край plot */
  plotLeft: number;
  /** Ширина слота, px */
  slot: number;
  /** Дробная часть panOffset (0…1) */
  panFrac?: number;
  /** Сколько лишних элементов слева в срезе */
  extraLeft?: number;
}): number {
  const frac = opts.panFrac != null && opts.panFrac > 0 ? opts.panFrac : 0;
  const extra = opts.extraLeft != null && opts.extraLeft > 0 ? opts.extraLeft : 0;
  return opts.plotLeft + opts.slot * (opts.index - extra + frac + 0.5);
}

/**
 * Новый pan-offset по горизонтальному сдвигу мыши (свободный, не по слотам).
 * Вправо (dx&gt;0) → offset↑ (история / контент едет за пальцем).
 */
export function nextCanvasChartPanOffset(opts: {
  /** Текущий offset (бары/колонки от правого края) */
  currentOffset: number;
  /** Сдвиг указателя, px */
  mouseDxPx: number;
  /** Ширина одного слота, px */
  slotPx: number;
  /** Мин. offset (может быть &lt;0 — пустота справа) */
  minOffset?: number;
  /** Макс. offset */
  maxOffset?: number;
}): number {
  const slot = opts.slotPx > 0 && Number.isFinite(opts.slotPx) ? opts.slotPx : 0;
  const cur = Number.isFinite(opts.currentOffset) ? opts.currentOffset : 0;
  if (!(slot > 0) || !Number.isFinite(opts.mouseDxPx) || opts.mouseDxPx === 0) {
    return cur;
  }
  let next = cur + opts.mouseDxPx / slot;
  const min = opts.minOffset != null && Number.isFinite(opts.minOffset) ? opts.minOffset : Number.NEGATIVE_INFINITY;
  const max = opts.maxOffset != null && Number.isFinite(opts.maxOffset) ? opts.maxOffset : Number.POSITIVE_INFINITY;
  if (next < min) next = min;
  if (next > max) next = max;
  return next;
}

/**
 * Hit-зоны канваса для роутинга зума.
 */
export type CanvasChartHitZone = 'price' | 'time' | 'plot';

/**
 * Зона под курсором: ось цены, ось времени или плот.
 */
export function resolveCanvasChartHitZone(opts: {
  /** X в css px */
  x: number;
  /** Y в css px */
  y: number;
  /** Ширина канваса */
  width: number;
  /** Высота канваса */
  height: number;
  /** Ширина правой оси цены */
  priceAxisWidth: number;
  /** Низ панели цены (ниже — volume/footer; для price-zoom не используем угол) */
  pricePanelBottom: number;
  /** Высота зоны времени снизу */
  timeZoneH?: number;
}): CanvasChartHitZone {
  const {
    x,
    y,
    width,
    height,
    priceAxisWidth,
    pricePanelBottom,
    timeZoneH = CANVAS_CHART_TIME_SCALE_ZONE_H,
  } = opts;
  const onTime = isCanvasChartTimeScaleZone(y, height, timeZoneH);
  if (onTime) return 'time';
  const onPrice =
    isCanvasChartPriceScaleZone(x, width, priceAxisWidth) && y < pricePanelBottom;
  if (onPrice) return 'price';
  return 'plot';
}
