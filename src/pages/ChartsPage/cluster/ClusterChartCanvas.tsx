import React, { useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import type { ScalpingOrderbookTradeCluster } from '@/Scalping/scalping-orderbook-types';
import {
  CanvasChartHost,
  nextCanvasChartPanOffset,
  resolveCanvasChartCursor,
  resolveCanvasChartDpr,
} from '@/canvas-chart';
import {
  CLUSTER_CHART_FOOTER_H,
  CLUSTER_CHART_MIN_COL_WIDTH,
  CLUSTER_CHART_TIME_AXIS_H,
  normalizeClusterChartBucketMs,
  type ClusterChartColumn,
} from './cluster-chart-build';
import {
  buildClusterChartLadder,
  resolveClusterChartRowLayout,
  clampClusterChartTapeW,
  CLUSTER_CHART_PANE_DIVIDER,
  CLUSTER_CHART_PRICE_AXIS_W,
  CLUSTER_CHART_PRICE_ROW_H_VISUAL_MIN as DRAW_PRICE_ROW_H_VISUAL_MIN,
  CLUSTER_CHART_TAPE_W,
  paintClusterChart,
  resolveClusterChartHoverColumn,
  resolveClusterChartPaneLayout,
  resolveClusterChartPriceZoom,
  resolveClusterChartTheme,
  roundClusterChartPriceToTick,
  sliceClusterChartVisibleColumns,
} from './cluster-chart-draw';
import { resolveClusterChartDayMaxScroll } from './cluster-chart-today';
import { ClusterChartHud } from './ClusterChartHud';
import {
  hitTestClusterChartLargeTrade,
  type ClusterChartLargeTradePaintHit,
  type LargestSizeZone,
  type ReplayAlgoChartMarker,
} from './cluster-chart-large-trades';
import {
  ChartPinnedMarkTooltip,
  formatGroupedAlgoMarksTooltip,
  type ChartPinnedMarkTooltipState,
} from './cluster-stubs';
import {
  CLUSTER_CHART_TAPE_RESIZE_HIT_PX,
  createClusterChartTapeAnimState,
} from './cluster-chart-tape';

/**
 * Мин. «логический» зум по цене, px.
 * Ниже {@link CLUSTER_CHART_PRICE_ROW_H_VISUAL_MIN} — строки не мельче, растёт агрегация тиков.
 */
export const CLUSTER_CHART_PRICE_ROW_H_MIN = 1;
/** Мин. высота строки на экране, px (дальше — агрегация объёмов). */
export const CLUSTER_CHART_PRICE_ROW_H_VISUAL_MIN = DRAW_PRICE_ROW_H_VISUAL_MIN;
/** Макс. высота строки цены при зуме, px. */
export const CLUSTER_CHART_PRICE_ROW_H_MAX = 48;
/** Макс. ширина колонки при зуме, px. */
const CLUSTER_CHART_COL_WIDTH_MAX = 96;

export interface ClusterChartCanvasProps {
  /** Столбики footprint */
  columns: readonly ClusterChartColumn[];
  /** Шаг цены */
  tick: number;
  /** ТФ бакета, мс */
  bucketMs: number;
  /** Центр лестницы */
  centerPrice: number | null;
  /** Сдвиг окна колонок в прошлое */
  scrollFromEnd: number;
  /** Ширина колонки, px (зум по времени) */
  colWidth: number;
  /** Высота строки цены, px (зум по цене) */
  priceRowH: number;
  /** Мин. объём ячейки / шариков ленты */
  minVolumeFilter: number;
  /** Строка фильтра для модалки настроек */
  minVolumeFilterInput?: string;
  /** Смена фильтра из модалки */
  onMinVolumeFilterInputChange?: (value: string) => void;
  /** Кластеры ленты принтов (как в стакане) */
  tapeClusters?: readonly ScalpingOrderbookTradeCluster[];
  /** Ширина ленты принтов, px */
  tapeW?: number;
  /** Цены визуальных уровней (Alt+H) */
  visualLevelPrices?: readonly number[];
  /** Alt+H — поставить/снять уровень на цене под курсором */
  onToggleVisualLevel?: (price: number) => void;
  /** Смена центра (drag) */
  onCenterPriceChange: (price: number) => void;
  /** Смена горизонтального сдвига (drag) */
  onScrollFromEndChange: (scroll: number) => void;
  /** Зум по времени */
  onColWidthChange: (width: number) => void;
  /** Зум по цене */
  onPriceRowHChange: (rowH: number) => void;
  /** Ресайз ширины ленты (drag разделителя) */
  onTapeWChange?: (tapeW: number) => void;
  /** Лента принтов включена (для HUD; ширина через tapeW=0 при выкл.) */
  tapeEnabled?: boolean;
  /** Вкл/выкл ленты принтов */
  onTapeEnabledChange?: (enabled: boolean) => void;
  /** Подсветка айсбергов */
  icesEnabled?: boolean;
  /** Вкл/выкл айсбергов */
  onIcesEnabledChange?: (enabled: boolean) => void;
  /** Цены айсбергов для подсветки ячеек */
  icebergPrices?: readonly number[];
  /**
   * Видимое окно колонок (для подгрузки Alor «сегодня»).
   * fromMs/toMs — границы бакетов; null, если колонок нет.
   */
  onVisibleWindowChange?: (info: {
    /** Сколько колонок влезает на экран */
    visibleColumnCount: number;
    /** Начало первого видимого бакета, ms */
    fromMs: number | null;
    /** Конец последнего видимого бакета, ms */
    toMs: number | null;
  }) => void;
  /** Смена ТФ с HUD на графике */
  onBucketMsChange?: (bucketMs: number) => void;
  /** Маркеры крупных сделок L/S (настройки TV) */
  largeTradeMarkers?: readonly ReplayAlgoChartMarker[];
  /** Зоны крупнейших sizes */
  largeTradeZones?: readonly LargestSizeZone[];
  /** Тикер поддерживает крупные сделки */
  largeTradesAvailable?: boolean;
  /** Крупные включены */
  largeTradesEnabled?: boolean;
  /** Тумблер showLargeTrades */
  onLargeTradesEnabledChange?: (enabled: boolean) => void;
  /** className */
  className?: string;
}

/**
 * Макс. сдвиг в прошлое по уже загруженным колонкам.
 */
export function resolveClusterChartLoadedMaxScroll(
  columnCount: number,
  visibleCount: number,
): number {
  return Math.max(0, columnCount - Math.max(1, visibleCount));
}

/**
 * Макс. scrollFromEnd: весь сегодняшний день по ТФ (не упирается в подгрузку).
 */
export function resolveMaxScroll(
  _columnCount: number,
  visibleCount: number,
  bucketMs: number = 60_000,
  nowMs: number = Date.now(),
): number {
  return resolveClusterChartDayMaxScroll(bucketMs, visibleCount, nowMs);
}

/**
 * Мин. scrollFromEnd: отрицательный = пустое место справа (~1 экран).
 */
export function resolveMinScroll(visibleCount: number): number {
  return -Math.max(1, Math.floor(Math.max(1, visibleCount)));
}

/**
 * Сколько колонок влезает в зону кластеров.
 */
function resolveVisibleColumnCount(
  cssWidth: number,
  colWidth: number,
  tapeW: number,
): number {
  const { clusterW } = resolveClusterChartPaneLayout(cssWidth, tapeW);
  return Math.max(1, Math.floor(clusterW / Math.max(1, colWidth)));
}

/**
 * Клампает scrollFromEnd: в прошлое — до начала дня, вправо — ~1 экран пустоты.
 * Дробный offset сохраняем (свободный pan из canvas-chart).
 */
export function clampScrollFromEnd(
  scroll: number,
  columnCount: number,
  visibleCount: number,
  bucketMs: number = 60_000,
  nowMs: number = Date.now(),
): number {
  const minScroll = resolveMinScroll(visibleCount);
  const rightPad = Math.max(0, -Math.floor(scroll));
  const dataCount = Math.max(1, visibleCount - rightPad);
  const maxScroll = resolveMaxScroll(columnCount, dataCount, bucketMs, nowMs);
  const value = Number.isFinite(scroll) ? scroll : 0;
  return Math.min(maxScroll, Math.max(minScroll, value));
}

/**
 * Canvas кластерного графика: [кластеры][лента][цена].
 */
export const ClusterChartCanvas: React.FC<ClusterChartCanvasProps> = ({
  columns,
  tick,
  bucketMs,
  centerPrice,
  scrollFromEnd,
  colWidth,
  priceRowH,
  minVolumeFilter,
  minVolumeFilterInput = '',
  onMinVolumeFilterInputChange,
  tapeClusters = [],
  tapeW = CLUSTER_CHART_TAPE_W,
  visualLevelPrices = [],
  onToggleVisualLevel,
  onCenterPriceChange,
  onScrollFromEndChange,
  onColWidthChange,
  onPriceRowHChange,
  onTapeWChange,
  tapeEnabled = true,
  onTapeEnabledChange,
  icesEnabled = false,
  onIcesEnabledChange,
  icebergPrices = [],
  onVisibleWindowChange,
  onBucketMsChange,
  largeTradeMarkers = [],
  largeTradeZones = [],
  largeTradesAvailable = false,
  largeTradesEnabled = false,
  onLargeTradesEnabledChange,
  className,
}) => {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  /** bucketStartMs колонки под курсором; null = показать последнюю. */
  const [hoverBucketMs, setHoverBucketMs] = useState<number | null>(null);
  const hoverBucketMsRef = useRef<number | null>(null);
  const columnsRef = useRef(columns);
  const tickRef = useRef(tick);
  const bucketMsRef = useRef(bucketMs);
  const centerPriceRef = useRef(centerPrice);
  const scrollRef = useRef(scrollFromEnd);
  const colWidthRef = useRef(colWidth);
  const priceRowHRef = useRef(priceRowH);
  const minVolumeFilterRef = useRef(minVolumeFilter);
  const tapeClustersRef = useRef(tapeClusters);
  const tapeWRef = useRef(tapeW);
  const visualLevelPricesRef = useRef(visualLevelPrices);
  const icebergPricesRef = useRef(icebergPrices);
  const largeTradeMarkersRef = useRef(largeTradeMarkers);
  const largeTradeZonesRef = useRef(largeTradeZones);
  const largeTradeHitsRef = useRef<ClusterChartLargeTradePaintHit[]>([]);
  const [pinnedMarkTooltip, setPinnedMarkTooltip] = useState<ChartPinnedMarkTooltipState | null>(
    null,
  );
  const pinnedMarkTooltipElRef = useRef<HTMLDivElement | null>(null);
  const [overlaySize, setOverlaySize] = useState({ width: 0, height: 0 });
  const onToggleVisualLevelRef = useRef(onToggleVisualLevel);
  const onCenterRef = useRef(onCenterPriceChange);
  const onScrollRef = useRef(onScrollFromEndChange);
  const onColWidthRef = useRef(onColWidthChange);
  const onPriceRowHRef = useRef(onPriceRowHChange);
  const onTapeWRef = useRef(onTapeWChange);
  const onVisibleWindowRef = useRef(onVisibleWindowChange);
  /** Цена под курсором (для Alt+H). */
  const lastCrosshairPriceRef = useRef<number | null>(null);
  const lastVisibleWindowRef = useRef<{
    visibleColumnCount: number;
    fromMs: number | null;
    toMs: number | null;
  } | null>(null);
  const tapeAnimRef = useRef(createClusterChartTapeAnimState());
  const animRafRef = useRef<number | null>(null);
  /** Накопленный dx при drag (px → колонки). */
  /** Накопленный dy при drag (px → тики цены). */
  const priceAccRef = useRef(0);
  /** Перекрестие (css px) или null вне графика. */
  const crosshairRef = useRef<{ x: number; y: number } | null>(null);
  /** Ресайз ленты за разделитель кластеры|лента. */
  const tapeResizeDragRef = useRef(false);
  /** Активен ли pan плота (для курсора L/S). */
  const plotDraggingRef = useRef(false);
  const drawRef = useRef<() => boolean>(() => false);

  columnsRef.current = columns;
  tickRef.current = tick;
  bucketMsRef.current = bucketMs;
  centerPriceRef.current = centerPrice;
  scrollRef.current = scrollFromEnd;
  colWidthRef.current = colWidth;
  priceRowHRef.current = priceRowH;
  minVolumeFilterRef.current = minVolumeFilter;
  tapeClustersRef.current = tapeClusters;
  tapeWRef.current = tapeW;
  visualLevelPricesRef.current = visualLevelPrices;
  icebergPricesRef.current = icebergPrices;
  largeTradeMarkersRef.current = largeTradeMarkers;
  largeTradeZonesRef.current = largeTradeZones;
  onToggleVisualLevelRef.current = onToggleVisualLevel;
  onCenterRef.current = onCenterPriceChange;
  onScrollRef.current = onScrollFromEndChange;
  onColWidthRef.current = onColWidthChange;
  onPriceRowHRef.current = onPriceRowHChange;
  onTapeWRef.current = onTapeWChange;
  onVisibleWindowRef.current = onVisibleWindowChange;

  const hudColumn = useMemo(() => {
    if (hoverBucketMs != null) {
      const found = columns.find((col) => col.bucketStartMs === hoverBucketMs);
      if (found) return found;
    }
    return columns.length ? columns[columns.length - 1]! : null;
  }, [columns, hoverBucketMs]);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;

    const scheduleAnim = (needFrame: boolean) => {
      if (!needFrame) {
        if (animRafRef.current != null) {
          cancelAnimationFrame(animRafRef.current);
          animRafRef.current = null;
        }
        return;
      }
      if (animRafRef.current != null) return;
      animRafRef.current = requestAnimationFrame(() => {
        animRafRef.current = null;
        drawRef.current();
      });
    };

    const tapeResizeHitAt = (clientX: number, clientY: number): boolean => {
      if (!(tapeWRef.current > 0) || !onTapeWRef.current) return false;
      const rect = wrap.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      if (y < 0 || y >= rect.height) return false;
      const { tapeLeft } = resolveClusterChartPaneLayout(rect.width, tapeWRef.current);
      return Math.abs(x - tapeLeft) <= CLUSTER_CHART_TAPE_RESIZE_HIT_PX;
    };

    const applyTapeWFromPointer = (clientX: number) => {
      if (!onTapeWRef.current) return;
      const rect = wrap.getBoundingClientRect();
      const x = clientX - rect.left;
      // Левый край ленты = x → tapeW = width - axis - dividers - clusterW.
      const pane = resolveClusterChartPaneLayout(rect.width, tapeWRef.current);
      const nextTapeW = clampClusterChartTapeW(
        rect.width - pane.axisW - CLUSTER_CHART_PANE_DIVIDER - x,
        rect.width,
      );
      if (nextTapeW === tapeWRef.current) return;
      tapeWRef.current = nextTapeW;
      onTapeWRef.current(nextTapeW);
    };

    const panByPixels = (dxPx: number) => {
      const colW = Math.max(1, colWidthRef.current);
      if (!(colW > 0) || dxPx === 0) return;
      const cssW = wrap.getBoundingClientRect().width;
      const visible = resolveVisibleColumnCount(
        cssW,
        colWidthRef.current,
        tapeWRef.current,
      );
      const minScroll = resolveMinScroll(visible);
      const maxScroll = resolveMaxScroll(
        columnsRef.current.length,
        visible,
        bucketMsRef.current,
      );
      const next = clampScrollFromEnd(
        nextCanvasChartPanOffset({
          currentOffset: scrollRef.current,
          mouseDxPx: dxPx,
          slotPx: colW,
          minOffset: minScroll,
          maxOffset: maxScroll,
        }),
        columnsRef.current.length,
        visible,
        bucketMsRef.current,
      );
      if (next === scrollRef.current) return;
      scrollRef.current = next;
      onScrollRef.current(next);
      drawRef.current();
    };

    const zoomTimeAt = (anchorX: number, zoomIn: boolean) => {
      const rect = wrap.getBoundingClientRect();
      const cssW = rect.width;
      const { clusterW } = resolveClusterChartPaneLayout(cssW, tapeWRef.current);
      const oldColW = colWidthRef.current;
      const delta = zoomIn ? 4 : -4;
      const nextColW = Math.min(
        CLUSTER_CHART_COL_WIDTH_MAX,
        Math.max(CLUSTER_CHART_MIN_COL_WIDTH, oldColW + delta),
      );
      if (nextColW === oldColW) return;

      const oldVisible = resolveVisibleColumnCount(cssW, oldColW, tapeWRef.current);
      const newVisible = resolveVisibleColumnCount(cssW, nextColW, tapeWRef.current);
      const localX = Math.min(clusterW, Math.max(0, anchorX));
      const frac = clusterW > 0 ? localX / clusterW : 0;
      const cols = columnsRef.current;
      const oldPad = Math.max(0, -Math.floor(scrollRef.current));
      const oldHist = Math.max(0, Math.floor(scrollRef.current));
      const oldData = Math.max(1, oldVisible - oldPad);
      const oldStart = Math.max(0, cols.length - oldHist - oldData);
      const anchorIdx = Math.min(
        cols.length - 1,
        Math.max(0, oldStart + Math.floor(frac * oldData)),
      );
      const newStart = Math.min(
        Math.max(0, cols.length - newVisible),
        Math.max(0, anchorIdx - Math.floor(frac * newVisible)),
      );
      const newScroll = clampScrollFromEnd(
        cols.length - newVisible - newStart,
        cols.length,
        newVisible,
        bucketMsRef.current,
      );

      colWidthRef.current = nextColW;
      scrollRef.current = newScroll;
      onColWidthRef.current(nextColW);
      onScrollRef.current(newScroll);
      drawRef.current();
    };

    const zoomTimeFromDelta = (anchorX: number, deltaY: number) => {
      if (!(deltaY !== 0)) return;
      const steps = Math.max(1, Math.round(Math.abs(deltaY) / 100));
      const zoomIn = deltaY < 0;
      for (let i = 0; i < steps; i += 1) zoomTimeAt(anchorX, zoomIn);
    };

    /** ±100 deltaY ≈ ±2 px на базовый тик (непрерывно, без шагов). */
    const zoomPriceFromDelta = (deltaY: number) => {
      if (!(deltaY !== 0 && Number.isFinite(deltaY))) return;
      const next = Math.min(
        CLUSTER_CHART_PRICE_ROW_H_MAX,
        Math.max(
          CLUSTER_CHART_PRICE_ROW_H_MIN,
          priceRowHRef.current - (deltaY / 100) * 2,
        ),
      );
      if (!(Math.abs(next - priceRowHRef.current) > 1e-6)) return;
      priceRowHRef.current = next;
      onPriceRowHRef.current(next);
      drawRef.current();
    };

    const draw = (): boolean => {
      const rect = wrap.getBoundingClientRect();
      const cssW = Math.max(1, Math.floor(rect.width));
      const cssH = Math.max(1, Math.floor(rect.height));
      const dpr = resolveCanvasChartDpr(cssW, cssH);
      if (canvas.width !== Math.floor(cssW * dpr) || canvas.height !== Math.floor(cssH * dpr)) {
        canvas.width = Math.floor(cssW * dpr);
        canvas.height = Math.floor(cssH * dpr);
        canvas.style.width = `${cssW}px`;
        canvas.style.height = `${cssH}px`;
      }
      const ctx = canvas.getContext('2d');
      if (!ctx) return false;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const theme = resolveClusterChartTheme();
      const ladderH = Math.max(1, cssH - CLUSTER_CHART_FOOTER_H);
      const baseTick = tickRef.current > 0 ? tickRef.current : 1;
      const priceZoom = resolveClusterChartPriceZoom({
        ladderHeight: ladderH,
        priceRowH: priceRowHRef.current,
        baseTick,
        visualMinRowH: CLUSTER_CHART_PRICE_ROW_H_VISUAL_MIN,
        logicMinRowH: CLUSTER_CHART_PRICE_ROW_H_MIN,
        logicMaxRowH: CLUSTER_CHART_PRICE_ROW_H_MAX,
      });
      let center = centerPriceRef.current;
      if (!(center != null && center > 0) && columnsRef.current.length) {
        const last = columnsRef.current[columnsRef.current.length - 1];
        center = last?.close ?? last?.open ?? null;
      }
      const ladder =
        center != null && center > 0
          ? buildClusterChartLadder(center, priceZoom.displayTick, priceZoom.rowCount)
          : [];

      // Цена под курсором для Alt+H.
      const cross = crosshairRef.current;
      if (cross && cross.y >= 0 && cross.y < ladderH && ladder.length && center != null) {
        const rowLayout = resolveClusterChartRowLayout(
          ladderH,
          ladder,
          priceZoom.visualRowH,
          center,
          priceZoom.displayTick,
        );
        let bestIdx = 0;
        let bestDist = Number.POSITIVE_INFINITY;
        for (let i = 0; i < rowLayout.length; i++) {
          const row = rowLayout[i];
          if (!row) continue;
          const cy = row.y + row.h / 2;
          const dist = Math.abs(cy - cross.y);
          if (dist < bestDist) {
            bestDist = dist;
            bestIdx = i;
          }
        }
        const price = ladder[bestIdx]?.price;
        lastCrosshairPriceRef.current =
          price != null && price > 0
            ? roundClusterChartPriceToTick(price, priceZoom.displayTick)
            : null;
      }

      setOverlaySize((prev) =>
        prev.width === cssW && prev.height === cssH ? prev : { width: cssW, height: cssH },
      );

      const tapeAnimating = paintClusterChart(ctx, {
        width: cssW,
        height: cssH,
        columns: columnsRef.current,
        ladder,
        tick: priceZoom.displayTick,
        baseTick,
        bucketMs: bucketMsRef.current,
        theme,
        colWidth: colWidthRef.current,
        scrollFromEnd: scrollRef.current,
        crosshair: crosshairRef.current,
        minVolumeFilter: minVolumeFilterRef.current,
        tapeClusters: tapeClustersRef.current,
        tapeAnim: tapeAnimRef.current,
        tapeW: tapeWRef.current,
        visualLevelPrices: visualLevelPricesRef.current,
        icebergPrices: icebergPricesRef.current,
        largeTradeMarkers: largeTradeMarkersRef.current,
        largeTradeZones: largeTradeZonesRef.current,
        largeTradeHitsOut: largeTradeHitsRef.current,
        rowHeightPx: priceZoom.visualRowH,
        centerPrice: center,
      });

      const visibleColumnCount = resolveVisibleColumnCount(
        cssW,
        colWidthRef.current,
        tapeWRef.current,
      );
      const visibleCols = sliceClusterChartVisibleColumns(
        columnsRef.current,
        visibleColumnCount,
        scrollRef.current,
      );
      const bucket = bucketMsRef.current > 0 ? bucketMsRef.current : 1;
      const fromMs = visibleCols[0]?.bucketStartMs ?? null;
      const lastStart = visibleCols[visibleCols.length - 1]?.bucketStartMs;
      const toMs = lastStart != null ? lastStart + bucket : null;
      const prev = lastVisibleWindowRef.current;
      if (
        !prev ||
        prev.visibleColumnCount !== visibleColumnCount ||
        prev.fromMs !== fromMs ||
        prev.toMs !== toMs
      ) {
        const next = { visibleColumnCount, fromMs, toMs };
        lastVisibleWindowRef.current = next;
        onVisibleWindowRef.current?.(next);
      }

      scheduleAnim(tapeAnimating);
      return tapeAnimating;
    };

    drawRef.current = draw;
    draw();
    const ro = new ResizeObserver(() => draw());
    ro.observe(wrap);

    const syncHoverColumn = (x: number) => {
      const { clusterW } = resolveClusterChartPaneLayout(
        wrap.getBoundingClientRect().width,
        tapeWRef.current,
      );
      const hover = resolveClusterChartHoverColumn({
        x,
        columns: columnsRef.current,
        clusterW,
        colWidth: colWidthRef.current,
        scrollFromEnd: scrollRef.current,
      });
      const nextKey = hover?.bucketStartMs ?? null;
      if (hoverBucketMsRef.current === nextKey) return;
      hoverBucketMsRef.current = nextKey;
      setHoverBucketMs(nextKey);
    };

    const updateCrosshair = (clientX: number, clientY: number) => {
      const rect = wrap.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      if (x < 0 || y < 0 || x >= rect.width || y >= rect.height) {
        if (crosshairRef.current != null) {
          crosshairRef.current = null;
          draw();
        }
        if (hoverBucketMsRef.current != null) {
          hoverBucketMsRef.current = null;
          setHoverBucketMs(null);
        }
        return;
      }
      crosshairRef.current = { x, y };
      syncHoverColumn(x);
      draw();
    };

    const isHudTarget = (target: EventTarget | null) => {
      if (!(target instanceof Element)) return false;
      return Boolean(
        target.closest('[data-slot="cluster-chart-hud"]') ||
          target.closest('[data-slot="cluster-chart-settings"]') ||
          target.closest('[data-slot="cluster-chart-size-tooltip"]'),
      );
    };

    const interactionHost = new CanvasChartHost({
      host: wrap,
      canvas: null,
      manageResize: false,
      manageCursor: true,
      getLayout: () => {
        const rect = wrap.getBoundingClientRect();
        const h = Math.max(1, rect.height);
        return {
          width: Math.max(1, rect.width),
          height: h,
          priceAxisWidth: CLUSTER_CHART_PRICE_AXIS_W,
          pricePanelBottom: Math.max(1, h - CLUSTER_CHART_FOOTER_H),
          timeZoneH: CLUSTER_CHART_TIME_AXIS_H,
        };
      },
      resolveCursor: ({ dragMode, zone, x, y }) => {
        if (tapeResizeDragRef.current) return 'col-resize';
        if (dragMode == null && onTapeWRef.current) {
          const rect = wrap.getBoundingClientRect();
          if (tapeResizeHitAt(rect.left + x, rect.top + y)) return 'col-resize';
        }
        if (dragMode == null && zone === 'plot') {
          if (hitTestClusterChartLargeTrade(largeTradeHitsRef.current, x, y)) {
            return 'pointer';
          }
        }
        return resolveCanvasChartCursor({
          dragMode,
          onPriceScale: zone === 'price',
          onTimeScale: zone === 'time',
        });
      },
      onDragModeChange: (mode) => {
        plotDraggingRef.current = mode === 'pan';
        if (mode === 'pan') {
          priceAccRef.current = 0;
        }
      },
      handlers: {
        shouldIgnoreTarget: isHudTarget,
        onTimeZoom: (deltaY, anchorX) => {
          setPinnedMarkTooltip(null);
          zoomTimeFromDelta(anchorX, deltaY);
        },
        onPriceZoom: (deltaY) => {
          setPinnedMarkTooltip(null);
          zoomPriceFromDelta(deltaY);
        },
        onPan: (dx, dy) => {
          if (dx !== 0) panByPixels(dx);
          if (dy !== 0) {
            const baseTick = tickRef.current > 0 ? tickRef.current : 1;
            const center = centerPriceRef.current;
            if (center != null && center > 0) {
              const rect = wrap.getBoundingClientRect();
              const ladderH = Math.max(1, Math.floor(rect.height) - CLUSTER_CHART_FOOTER_H);
              const priceZoom = resolveClusterChartPriceZoom({
                ladderHeight: ladderH,
                priceRowH: priceRowHRef.current,
                baseTick,
                visualMinRowH: CLUSTER_CHART_PRICE_ROW_H_VISUAL_MIN,
                logicMinRowH: CLUSTER_CHART_PRICE_ROW_H_MIN,
                logicMaxRowH: CLUSTER_CHART_PRICE_ROW_H_MAX,
              });
              priceAccRef.current += dy;
              const steps = Math.trunc(priceAccRef.current / priceZoom.visualRowH);
              if (steps !== 0) {
                priceAccRef.current -= steps * priceZoom.visualRowH;
                const next = roundClusterChartPriceToTick(
                  center + steps * priceZoom.displayTick,
                  priceZoom.displayTick,
                );
                centerPriceRef.current = next;
                onCenterRef.current(next);
                drawRef.current();
              }
            }
          }
        },
        onPointerDownExtra: (x, y, event) => {
          const rect = wrap.getBoundingClientRect();
          if (onTapeWRef.current && tapeResizeHitAt(rect.left + x, rect.top + y)) {
            event.preventDefault();
            tapeResizeDragRef.current = true;
            setPinnedMarkTooltip(null);
            try {
              wrap.setPointerCapture(event.pointerId);
            } catch {
              // ignore
            }
            applyTapeWFromPointer(rect.left + x);
            wrap.style.cursor = 'col-resize';
            return true;
          }

          const sizeHit = hitTestClusterChartLargeTrade(largeTradeHitsRef.current, x, y);
          if (sizeHit) {
            event.preventDefault();
            event.stopPropagation();
            const text = formatGroupedAlgoMarksTooltip([sizeHit.marker]);
            setPinnedMarkTooltip({
              id: `size:${sizeHit.marker.time}:${sizeHit.marker.letter}:${sizeHit.x}`,
              text,
              x: sizeHit.x,
              y: sizeHit.y,
            });
            return true;
          }

          setPinnedMarkTooltip(null);

          const { clusterW, axisLeft } = resolveClusterChartPaneLayout(
            rect.width,
            tapeWRef.current,
          );
          // Лента — не pan; ось цены/времени отдаём host.
          if (x >= clusterW && x < axisLeft) return true;
          return false;
        },
        onPointerMove: (x, y) => {
          const rect = wrap.getBoundingClientRect();
          if (tapeResizeDragRef.current) {
            applyTapeWFromPointer(rect.left + x);
            wrap.style.cursor = 'col-resize';
            return;
          }
          updateCrosshair(rect.left + x, rect.top + y);
        },
        onPointerUp: (event) => {
          if (tapeResizeDragRef.current) {
            tapeResizeDragRef.current = false;
            if (event) {
              try {
                wrap.releasePointerCapture(event.pointerId);
              } catch {
                // ignore
              }
            }
          }
          plotDraggingRef.current = false;
          priceAccRef.current = 0;
        },
        onPointerLeave: () => {
          if (plotDraggingRef.current || tapeResizeDragRef.current) return;
          if (crosshairRef.current == null && hoverBucketMsRef.current == null) return;
          crosshairRef.current = null;
          if (hoverBucketMsRef.current != null) {
            hoverBucketMsRef.current = null;
            setHoverBucketMs(null);
          }
          draw();
        },
      },
    });
    interactionHost.attach();

    const onKeyDown = (event: KeyboardEvent) => {
      const keyTarget = event.target as HTMLElement | null;
      const typingInField =
        keyTarget &&
        (keyTarget.tagName === 'INPUT' ||
          keyTarget.tagName === 'TEXTAREA' ||
          keyTarget.isContentEditable);
      if (typingInField) return;

      if (event.key === 'Escape') {
        setPinnedMarkTooltip(null);
      }

      if (
        event.altKey &&
        (event.key === 'h' || event.key === 'H' || event.code === 'KeyH')
      ) {
        const price = lastCrosshairPriceRef.current;
        if (price != null && price > 0 && onToggleVisualLevelRef.current) {
          event.preventDefault();
          onToggleVisualLevelRef.current(price);
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      ro.disconnect();
      if (animRafRef.current != null) {
        cancelAnimationFrame(animRafRef.current);
        animRafRef.current = null;
      }
      interactionHost.detach();
      window.removeEventListener('keydown', onKeyDown);
      drawRef.current = () => false;
    };
    // Host/listeners только на mount — иначе каждый scrollFromEnd рвёт pointer capture.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refs держат актуальные props
  }, []);

  // Перерисовка при смене данных (без пересоздания interaction host).
  useEffect(() => {
    drawRef.current();
  }, [
    columns,
    tick,
    bucketMs,
    centerPrice,
    scrollFromEnd,
    colWidth,
    priceRowH,
    minVolumeFilter,
    tapeClusters,
    tapeW,
    visualLevelPrices,
    icebergPrices,
    largeTradeMarkers,
    largeTradeZones,
  ]);

  return (
    <div ref={wrapRef} className={cn('relative', className)}>
      <canvas ref={canvasRef} className="block h-full w-full touch-none" />
      <ClusterChartHud
        bucketMs={bucketMs}
        onBucketMsChange={(next) => {
          onBucketMsChange?.(normalizeClusterChartBucketMs(next));
        }}
        column={hudColumn}
        tick={tick}
        disabled={!onBucketMsChange}
        minVolumeFilterInput={minVolumeFilterInput}
        onMinVolumeFilterInputChange={onMinVolumeFilterInputChange}
        tapeEnabled={tapeEnabled}
        onTapeEnabledChange={onTapeEnabledChange}
        icesEnabled={icesEnabled}
        onIcesEnabledChange={onIcesEnabledChange}
        largeTradesAvailable={largeTradesAvailable}
        largeTradesEnabled={largeTradesEnabled}
        onLargeTradesEnabledChange={onLargeTradesEnabledChange}
      />
      {pinnedMarkTooltip && overlaySize.width > 0 && overlaySize.height > 0 ? (
        <div data-slot="cluster-chart-size-tooltip" className="pointer-events-none absolute inset-0 z-20">
          <ChartPinnedMarkTooltip
            state={pinnedMarkTooltip}
            rootWidth={overlaySize.width}
            rootHeight={overlaySize.height}
            elRef={pinnedMarkTooltipElRef}
          />
        </div>
      ) : null}
    </div>
  );
};
