import {
  CANVAS_CHART_SCALE_DRAG_STEP_PX,
  resolveCanvasChartHitZone,
  type CanvasChartHitZone,
} from './canvas-chart-geometry';

/** Режим drag на канвасе. */
export type CanvasChartDragMode = 'pan' | 'priceZoom' | 'timeZoom';

/** Курсор по состоянию интеракции. */
export type CanvasChartCursor = 'crosshair' | 'ns-resize' | 'ew-resize' | 'grabbing' | 'pointer' | 'col-resize';

/**
 * Курсор по зоне / режиму drag (как screener canvas).
 */
export function resolveCanvasChartCursor(opts: {
  /** Активный drag */
  dragMode: CanvasChartDragMode | null;
  /** Hover на оси цены */
  onPriceScale: boolean;
  /** Hover на оси времени */
  onTimeScale: boolean;
  /** Линейка активна — не grabbing */
  rulerActive?: boolean;
}): CanvasChartCursor {
  const { dragMode, onPriceScale, onTimeScale, rulerActive = false } = opts;
  if (dragMode === 'pan' && !rulerActive) return 'grabbing';
  if (dragMode === 'priceZoom' || (!dragMode && onPriceScale)) return 'ns-resize';
  if (dragMode === 'timeZoom' || (!dragMode && onTimeScale)) return 'ew-resize';
  return 'crosshair';
}

/**
 * Режим drag при pointerdown по зоне.
 */
export function resolveCanvasChartDragMode(zone: CanvasChartHitZone): CanvasChartDragMode {
  if (zone === 'price') return 'priceZoom';
  if (zone === 'time') return 'timeZoom';
  return 'pan';
}

/**
 * Накопленный drag → число шагов зума (±1 на SCALE_DRAG_STEP_PX).
 * Мутирует `accum` через возврат нового значения.
 */
export function consumeCanvasChartScaleDragSteps(
  accumPx: number,
  stepPx: number = CANVAS_CHART_SCALE_DRAG_STEP_PX,
): { steps: number; remainPx: number } {
  const step = stepPx > 0 ? stepPx : CANVAS_CHART_SCALE_DRAG_STEP_PX;
  let remain = accumPx;
  let steps = 0;
  while (remain >= step) {
    steps += 1;
    remain -= step;
  }
  while (remain <= -step) {
    steps -= 1;
    remain += step;
  }
  return { steps, remainPx: remain };
}

/**
 * deltaY для next*Scale из числа drag-шагов (как wheel ±100).
 */
export function canvasChartDragStepsToDeltaY(steps: number): number {
  if (!(steps !== 0)) return 0;
  return steps > 0 ? 100 * steps : -100 * Math.abs(steps);
}

/**
 * Layout для hit-test (серия отдаёт актуальные размеры осей).
 */
export interface CanvasChartInteractionLayout {
  /** Ширина css */
  width: number;
  /** Высота css */
  height: number;
  /** Ширина правой оси цены */
  priceAxisWidth: number;
  /** Низ панели цены */
  pricePanelBottom: number;
  /** Высота зоны времени */
  timeZoneH?: number;
}

/**
 * Колбэки серии / хоста на жесты.
 */
export interface CanvasChartInteractionHandlers {
  /** Зум по времени (plot wheel / time axis). anchorX — css x для якоря */
  onTimeZoom: (deltaY: number, anchorX: number) => void;
  /** Зум по цене (price axis wheel/drag) */
  onPriceZoom: (deltaY: number) => void;
  /** Пан плота */
  onPan: (dx: number, dy: number) => void;
  /** Hover / crosshair (null — сброс) */
  onPointerMove?: (x: number, y: number, zone: CanvasChartHitZone) => void;
  /** Pointer leave без drag */
  onPointerLeave?: () => void;
  /**
   * Extra hit до стандартного роутинга (tape resize, L/S).
   * true — событие обработано, хост не продолжает.
   */
  onPointerDownExtra?: (x: number, y: number, event: PointerEvent) => boolean;
  /** Double-click reset viewport */
  onDoubleClick?: (x: number, y: number) => void;
  /** Pointer up / cancel / lostcapture (до clearDrag) */
  onPointerUp?: (event?: PointerEvent) => void;
  /** Игнор жеста (HUD и т.п.) */
  shouldIgnoreTarget?: (target: EventTarget | null) => boolean;
}

/**
 * Зона по layout и координатам.
 */
export function hitCanvasChartZone(
  layout: CanvasChartInteractionLayout,
  x: number,
  y: number,
): CanvasChartHitZone {
  return resolveCanvasChartHitZone({
    x,
    y,
    width: layout.width,
    height: layout.height,
    priceAxisWidth: layout.priceAxisWidth,
    pricePanelBottom: layout.pricePanelBottom,
    timeZoneH: layout.timeZoneH,
  });
}
