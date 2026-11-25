import {
  CANVAS_CHART_RESIZE_HYSTERESIS_PX,
  CANVAS_CHART_SCALE_DRAG_STEP_PX,
  resolveCanvasChartDpr,
} from './canvas-chart-geometry';
import type { CanvasChartHitZone } from './canvas-chart-geometry';
import {
  hitCanvasChartZone,
  resolveCanvasChartCursor,
  resolveCanvasChartDragMode,
  type CanvasChartCursor,
  type CanvasChartDragMode,
  type CanvasChartInteractionHandlers,
  type CanvasChartInteractionLayout,
} from './canvas-chart-interaction';

/** Опции хоста канвас-графика. */
export interface CanvasChartHostOptions {
  /** Контейнер (pointer/wheel) */
  host: HTMLElement;
  /** Canvas для буфера (опционально — хост только интеракция) */
  canvas?: HTMLCanvasElement | null;
  /** Актуальный layout для hit-test */
  getLayout: () => CanvasChartInteractionLayout;
  /** Жесты */
  handlers: CanvasChartInteractionHandlers;
  /** После resize — перерисовать */
  onResize?: (size: { width: number; height: number; dpr: number }) => void;
  /** Hysteresis resize, px */
  resizeHysteresisPx?: number;
  /** Подписывать ResizeObserver (false — размер снаружи) */
  manageResize?: boolean;
  /** Ставить host.style.cursor (false — курсор снаружи) */
  manageCursor?: boolean;
  /**
   * Переопределение курсора (null → дефолт по зоне/drag).
   */
  resolveCursor?: (ctx: {
    dragMode: CanvasChartDragMode | null;
    zone: CanvasChartHitZone | null;
    x: number;
    y: number;
  }) => CanvasChartCursor | null;
  /** Смена режима drag */
  onDragModeChange?: (mode: CanvasChartDragMode | null) => void;
}

/**
 * Хост: ResizeObserver + wheel/pointer (zoom по осям, pan на плоте) + курсор.
 */
export class CanvasChartHost {
  private readonly _host: HTMLElement;
  private readonly _canvas: HTMLCanvasElement | null;
  private readonly _getLayout: () => CanvasChartInteractionLayout;
  private readonly _handlers: CanvasChartInteractionHandlers;
  private readonly _onResize?: (size: { width: number; height: number; dpr: number }) => void;
  private readonly _resizeHysteresis: number;
  private readonly _manageResize: boolean;
  private readonly _manageCursor: boolean;
  private readonly _resolveCursor?: CanvasChartHostOptions['resolveCursor'];
  private readonly _onDragModeChange?: (mode: CanvasChartDragMode | null) => void;

  private _ro: ResizeObserver | null = null;
  private _size = { width: 0, height: 0 };
  private _dragMode: CanvasChartDragMode | null = null;
  private _dragLast: { x: number; y: number } | null = null;
  private _dragAccum = 0;
  private _hoverZone: CanvasChartHitZone | null = null;
  private _hoverLocal: { x: number; y: number } = { x: 0, y: 0 };
  private _pointerId: number | null = null;

  constructor(options: CanvasChartHostOptions) {
    this._host = options.host;
    this._canvas = options.canvas ?? null;
    this._getLayout = options.getLayout;
    this._handlers = options.handlers;
    this._onResize = options.onResize;
    this._resizeHysteresis =
      options.resizeHysteresisPx != null && options.resizeHysteresisPx >= 0
        ? options.resizeHysteresisPx
        : CANVAS_CHART_RESIZE_HYSTERESIS_PX;
    this._manageResize = options.manageResize !== false;
    this._manageCursor = options.manageCursor !== false;
    this._resolveCursor = options.resolveCursor;
    this._onDragModeChange = options.onDragModeChange;
  }

  /**
   * Подписывает DOM-события и при необходимости ResizeObserver.
   */
  attach(): void {
    this._host.addEventListener('wheel', this._onWheel, { passive: false });
    this._host.addEventListener('pointerdown', this._onPointerDown);
    this._host.addEventListener('pointermove', this._onPointerMove);
    this._host.addEventListener('pointerup', this._onPointerUp);
    this._host.addEventListener('pointercancel', this._onPointerUp);
    this._host.addEventListener('pointerleave', this._onPointerLeave);
    this._host.addEventListener('dblclick', this._onDblClick);
    this._host.addEventListener('lostpointercapture', this._onLostPointerCapture);
    if (this._manageResize) {
      this._ro = new ResizeObserver(() => this._handleResize());
      this._ro.observe(this._host);
      this._handleResize();
    }
    this._syncCursor();
  }

  /**
   * Снимает подписки.
   */
  detach(): void {
    this._host.removeEventListener('wheel', this._onWheel);
    this._host.removeEventListener('pointerdown', this._onPointerDown);
    this._host.removeEventListener('pointermove', this._onPointerMove);
    this._host.removeEventListener('pointerup', this._onPointerUp);
    this._host.removeEventListener('pointercancel', this._onPointerUp);
    this._host.removeEventListener('pointerleave', this._onPointerLeave);
    this._host.removeEventListener('dblclick', this._onDblClick);
    this._host.removeEventListener('lostpointercapture', this._onLostPointerCapture);
    this._ro?.disconnect();
    this._ro = null;
    this._clearDrag();
    if (this._manageCursor) this._host.style.cursor = '';
  }

  /** Текущий размер css (если manageResize). */
  getSize(): { width: number; height: number } {
    return { ...this._size };
  }

  /** Активный режим drag. */
  getDragMode(): CanvasChartDragMode | null {
    return this._dragMode;
  }

  /**
   * Сбрасывает drag снаружи (например dblclick reset).
   */
  clearDrag(): void {
    this._clearDrag(this._pointerId ?? undefined);
  }

  /**
   * Синхронизирует буфер canvas под css размер (если canvas задан).
   */
  syncCanvasBuffer(): { width: number; height: number; dpr: number } | null {
    const canvas = this._canvas;
    if (!canvas) return null;
    const { width, height } = this._size;
    if (!(width > 0) || !(height > 0)) return null;
    const dpr = resolveCanvasChartDpr(width, height);
    const bw = Math.max(1, Math.floor(width * dpr));
    const bh = Math.max(1, Math.floor(height * dpr));
    if (canvas.width !== bw || canvas.height !== bh) {
      canvas.width = bw;
      canvas.height = bh;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
    }
    return { width, height, dpr };
  }

  private _setDragMode(mode: CanvasChartDragMode | null): void {
    if (this._dragMode === mode) return;
    this._dragMode = mode;
    this._onDragModeChange?.(mode);
  }

  private _handleResize = (): void => {
    const rect = this._host.getBoundingClientRect();
    const w = Math.max(1, Math.floor(rect.width));
    const h = Math.max(1, Math.floor(rect.height));
    const hyst = this._resizeHysteresis;
    if (
      Math.abs(w - this._size.width) < hyst &&
      Math.abs(h - this._size.height) < hyst &&
      this._size.width > 0
    ) {
      return;
    }
    this._size = { width: w, height: h };
    const synced = this.syncCanvasBuffer();
    const dpr = synced?.dpr ?? resolveCanvasChartDpr(w, h);
    this._onResize?.({ width: w, height: h, dpr });
  };

  private _localPoint(event: { clientX: number; clientY: number }): { x: number; y: number } {
    const rect = this._host.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  private _syncCursor(): void {
    if (!this._manageCursor) return;
    const zone = this._hoverZone;
    const custom = this._resolveCursor?.({
      dragMode: this._dragMode,
      zone,
      x: this._hoverLocal.x,
      y: this._hoverLocal.y,
    });
    if (custom != null) {
      this._host.style.cursor = custom;
      return;
    }
    this._host.style.cursor = resolveCanvasChartCursor({
      dragMode: this._dragMode,
      onPriceScale: zone === 'price',
      onTimeScale: zone === 'time',
    });
  }

  private _clearDrag(pointerId?: number): void {
    this._setDragMode(null);
    this._dragLast = null;
    this._dragAccum = 0;
    if (pointerId != null) {
      try {
        this._host.releasePointerCapture(pointerId);
      } catch {
        // ignore
      }
    }
    this._pointerId = null;
    this._syncCursor();
  }

  private _onWheel = (event: WheelEvent): void => {
    if (this._handlers.shouldIgnoreTarget?.(event.target)) return;
    event.preventDefault();
    event.stopPropagation();
    const layout = this._getLayout();
    const { x, y } = this._localPoint(event);
    const zone = hitCanvasChartZone(layout, x, y);
    if (zone === 'price') {
      this._handlers.onPriceZoom(event.deltaY);
      return;
    }
    this._handlers.onTimeZoom(event.deltaY, x);
  };

  private _onPointerDown = (event: PointerEvent): void => {
    if (event.button !== 0) return;
    if (this._handlers.shouldIgnoreTarget?.(event.target)) return;
    const { x, y } = this._localPoint(event);
    this._hoverLocal = { x, y };
    if (this._handlers.onPointerDownExtra?.(x, y, event)) {
      this._syncCursor();
      return;
    }

    const layout = this._getLayout();
    const zone = hitCanvasChartZone(layout, x, y);
    this._hoverZone = zone;
    this._setDragMode(resolveCanvasChartDragMode(zone));
    this._dragLast = { x: event.clientX, y: event.clientY };
    this._dragAccum = 0;
    this._pointerId = event.pointerId;
    event.preventDefault();
    try {
      this._host.setPointerCapture(event.pointerId);
    } catch {
      // ignore
    }
    this._syncCursor();
    if (this._dragMode === 'pan') {
      this._handlers.onPointerMove?.(x, y, 'plot');
    }
  };

  private _onPointerMove = (event: PointerEvent): void => {
    const layout = this._getLayout();
    const { x, y } = this._localPoint(event);
    this._hoverLocal = { x, y };

    if (this._dragMode == null || this._pointerId !== event.pointerId) {
      const zone = hitCanvasChartZone(layout, x, y);
      if (zone !== this._hoverZone) {
        this._hoverZone = zone;
        this._syncCursor();
      } else if (this._resolveCursor) {
        this._syncCursor();
      }
      this._handlers.onPointerMove?.(x, y, zone);
      return;
    }

    const last = this._dragLast;
    if (!last) return;
    const dx = event.clientX - last.x;
    const dy = event.clientY - last.y;
    this._dragLast = { x: event.clientX, y: event.clientY };

    if (this._dragMode === 'priceZoom') {
      // 1 px drag ≈ (100 / SCALE_DRAG_STEP_PX) единиц колеса — попиксельно, без квантования.
      const deltaY = dy * (100 / CANVAS_CHART_SCALE_DRAG_STEP_PX);
      if (deltaY !== 0) this._handlers.onPriceZoom(deltaY);
      return;
    }

    if (this._dragMode === 'timeZoom') {
      const deltaY = dx * (100 / CANVAS_CHART_SCALE_DRAG_STEP_PX);
      if (deltaY !== 0) this._handlers.onTimeZoom(deltaY, x);
      return;
    }

    this._handlers.onPan(dx, dy);
    this._handlers.onPointerMove?.(x, y, 'plot');
  };

  private _onPointerUp = (event: PointerEvent): void => {
    this._handlers.onPointerUp?.(event);
    if (this._pointerId != null && event.pointerId !== this._pointerId) return;
    this._clearDrag(event.pointerId);
  };

  private _onLostPointerCapture = (): void => {
    this._handlers.onPointerUp?.();
    this._clearDrag();
  };

  private _onPointerLeave = (): void => {
    if (this._dragMode != null) return;
    this._hoverZone = null;
    this._syncCursor();
    this._handlers.onPointerLeave?.();
  };

  private _onDblClick = (event: MouseEvent): void => {
    if (this._handlers.shouldIgnoreTarget?.(event.target)) return;
    const { x, y } = this._localPoint(event);
    this._handlers.onDoubleClick?.(x, y);
  };
}
