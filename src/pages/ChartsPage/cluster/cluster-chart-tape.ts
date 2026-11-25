import { withAlpha } from '@/components/tw-chart-theme';
import { readCssVar } from '@/lib/css-color';
import {
  createScalpingOrderbookTapeAnimState,
  formatScalpingOrderbookQtyByMode,
  SCALPING_ORDERBOOK_SMOOTH_MS,
  type ScalpingOrderbookTapeAnimState,
} from '@/Scalping/scalping-orderbook-draw';
import type { ScalpingOrderbookTradeCluster } from '@/Scalping/scalping-orderbook-types';
import type { ClusterChartLadderRow } from './cluster-chart-types';

/** Ширина ленты принтов по умолчанию, px. */
export const CLUSTER_CHART_TAPE_W = 140;

/** Мин. ширина ленты, px. */
export const CLUSTER_CHART_TAPE_W_MIN = 56;

/** Макс. ширина ленты (жёсткий потолок), px. */
export const CLUSTER_CHART_TAPE_W_MAX = 480;

/** Мин. ширина зоны кластеров при ресайзе ленты, px. */
export const CLUSTER_CHART_CLUSTER_W_MIN = 80;

/** Разделитель секций, px. */
export const CLUSTER_CHART_PANE_DIVIDER = 1;

/** Hit-зона разделителя кластеры|лента, px. */
export const CLUSTER_CHART_TAPE_RESIZE_HIT_PX = 6;

/**
 * Клампает ширину ленты под доступную ширину виджета.
 */
export function clampClusterChartTapeW(tapeW: number, totalWidth: number): number {
  const axisW = 64; // CLUSTER_CHART_PRICE_AXIS_W — без цикла импорта
  const divider = CLUSTER_CHART_PANE_DIVIDER;
  // Один divider: лента|цена (кластеры к ленте без зазора).
  const available = Math.max(
    CLUSTER_CHART_TAPE_W_MIN,
    totalWidth - axisW - divider - CLUSTER_CHART_CLUSTER_W_MIN,
  );
  const maxTape = Math.min(CLUSTER_CHART_TAPE_W_MAX, available);
  const n = Number.isFinite(tapeW) ? Math.round(tapeW) : CLUSTER_CHART_TAPE_W;
  return Math.min(maxTape, Math.max(CLUSTER_CHART_TAPE_W_MIN, n));
}

/** Цвета ленты (подмножество темы графика). */
export interface ClusterChartTapeTheme {
  /** Фон */
  bg: string;
  /** Сетка */
  grid: string;
  /** Шарик buy */
  tapeBuyBg: string;
  /** Шарик sell */
  tapeSellBg: string;
}

/**
 * Layout строк лестницы (локальная копия, без импорта draw → без цикла).
 * С якорем — непрерывный зум вокруг centerPrice.
 */
function buildTapeRowLayout(
  height: number,
  ladder: readonly ClusterChartLadderRow[],
  rowHeightPx?: number,
  centerPrice?: number | null,
  displayTick?: number,
): Array<{ y: number; h: number }> {
  const rowCount = ladder.length;
  if (rowCount <= 0) return [];
  const panelH = Math.max(1, height);
  const rowH =
    rowHeightPx != null && Number.isFinite(rowHeightPx) && rowHeightPx > 0
      ? rowHeightPx
      : panelH / rowCount;

  if (
    centerPrice != null &&
    Number.isFinite(centerPrice) &&
    centerPrice > 0 &&
    displayTick != null &&
    Number.isFinite(displayTick) &&
    displayTick > 0
  ) {
    const centerY = panelH / 2;
    const rows: Array<{ y: number; h: number }> = [];
    for (let i = 0; i < rowCount; i++) {
      const price = ladder[i]?.price;
      if (!(price != null && Number.isFinite(price))) {
        rows.push({ y: i * rowH, h: rowH });
        continue;
      }
      const yMid = centerY - ((price - centerPrice) / displayTick) * rowH;
      rows.push({ y: yMid - rowH / 2, h: rowH });
    }
    return rows;
  }

  const used = rowH * rowCount;
  const y0 = (panelH - used) / 2;
  const rows: Array<{ y: number; h: number }> = [];
  for (let i = 0; i < rowCount; i++) {
    rows.push({ y: y0 + i * rowH, h: rowH });
  }
  return rows;
}

/** Сетка ленты: каждые N пунктов — слабая линия. */
const CLUSTER_CHART_TAPE_GRID_MINOR_POINTS = 10;

/** Сетка ленты: каждые N пунктов — жирная линия. */
const CLUSTER_CHART_TAPE_GRID_MAJOR_POINTS = 50;

export type { ScalpingOrderbookTapeAnimState as ClusterChartTapeAnimState };

/**
 * Пустое состояние анимации ленты (как в стакане).
 */
export function createClusterChartTapeAnimState(): ScalpingOrderbookTapeAnimState {
  return createScalpingOrderbookTapeAnimState();
}

/**
 * Ease-out quad (копия из стакана).
 */
function easeTapeSmooth(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  return 1 - (1 - x) * (1 - x);
}

/**
 * Ключ кластера для трекинга позиции на ленте.
 */
function tapeClusterKey(c: ScalpingOrderbookTradeCluster): string {
  return `${c.timeMs}|${c.side}|${c.minPrice}|${c.maxPrice}`;
}

/**
 * Y центра строки лестницы для цены.
 */
function priceToTapeY(
  price: number,
  ladderHeight: number,
  ladder: readonly ClusterChartLadderRow[],
  rowHeightPx?: number,
  centerPrice?: number | null,
  displayTick?: number,
): number | null {
  if (!ladder.length || !(ladderHeight > 0)) return null;
  let bestIdx = 0;
  let bestDist = Math.abs(ladder[0]!.price - price);
  for (let i = 1; i < ladder.length; i++) {
    const dist = Math.abs(ladder[i]!.price - price);
    if (dist < bestDist) {
      bestDist = dist;
      bestIdx = i;
    }
  }
  const layout = buildTapeRowLayout(ladderHeight, ladder, rowHeightPx, centerPrice, displayTick);
  const row = layout[bestIdx];
  if (!row) return null;
  return row.y + row.h / 2;
}

/**
 * Горизонтальная сетка цены в ленте (каждые 10 / 50 пунктов) — копия стакана.
 */
export function drawClusterChartTapePriceGrid(
  ctx: CanvasRenderingContext2D,
  opts: {
    left: number;
    width: number;
    ladderHeight: number;
    ladder: readonly ClusterChartLadderRow[];
    priceTick: number;
    theme: ClusterChartTapeTheme;
    /** Высота строки зума, px */
    rowHeightPx?: number;
    /** Центр цены */
    centerPrice?: number | null;
  },
): void {
  const { left, width, ladderHeight, ladder, priceTick, theme, rowHeightPx, centerPrice } = opts;
  if (!(width > 0) || !(ladderHeight > 0) || !ladder.length || !(priceTick > 0)) return;

  const rowLayout = buildTapeRowLayout(
    ladderHeight,
    ladder,
    rowHeightPx,
    centerPrice,
    priceTick,
  );

  ctx.save();
  ctx.beginPath();
  ctx.rect(left, 0, width, ladderHeight);
  ctx.clip();

  for (let i = 0; i < ladder.length; i++) {
    const row = ladder[i];
    const layout = rowLayout[i];
    if (!row || !layout) continue;
    const key = Math.round(row.price / priceTick);
    if (key % CLUSTER_CHART_TAPE_GRID_MINOR_POINTS !== 0) continue;
    const isMajor = key % CLUSTER_CHART_TAPE_GRID_MAJOR_POINTS === 0;
    const y = Math.round(layout.y + layout.h / 2) + 0.5;
    ctx.strokeStyle = isMajor ? withAlpha(theme.grid, 0.9) : withAlpha(theme.grid, 0.4);
    ctx.lineWidth = isMajor ? 2 : 1;
    ctx.beginPath();
    ctx.moveTo(left, y);
    ctx.lineTo(left + width, y);
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * Лента шариков (копия drawTapeBubbles из стакана).
 * @returns true — анимация ещё идёт
 */
export function drawClusterChartTapeBubbles(
  ctx: CanvasRenderingContext2D,
  opts: {
    left: number;
    width: number;
    ladderHeight: number;
    clusters: readonly ScalpingOrderbookTradeCluster[];
    ladder: readonly ClusterChartLadderRow[];
    theme: ClusterChartTapeTheme;
    tapeAnim?: ScalpingOrderbookTapeAnimState;
    /** Высота строки зума, px */
    rowHeightPx?: number;
    /** Центр цены */
    centerPrice?: number | null;
    /** Шаг ряда */
    displayTick?: number;
  },
): boolean {
  const {
    left,
    width,
    ladderHeight,
    clusters,
    ladder,
    theme,
    tapeAnim,
    rowHeightPx,
    centerPrice,
    displayTick,
  } = opts;

  if (!(width > 8) || !ladder.length || !clusters.length) return false;

  type TapeItem = {
    cluster: ScalpingOrderbookTradeCluster;
    label: string;
    rx: number;
    ry: number;
    cy: number;
  };

  const visible = [...clusters].sort((a, b) => a.timeMs - b.timeMs || a.side.localeCompare(b.side));

  const fontSizePx = 11;
  const tapeFont = `${fontSizePx}px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`;
  ctx.font = tapeFont;
  const padInside = 1.5;

  const items: TapeItem[] = [];
  for (const c of visible) {
    const markPrice =
      c.qty > 0 && c.quoteQty > 0 ? c.quoteQty / c.qty : (c.minPrice + c.maxPrice) / 2;
    const displayQty = Math.floor(c.qty > 0 ? c.qty : 0);
    if (!(displayQty > 0)) continue;
    const cy = priceToTapeY(
      markPrice,
      ladderHeight,
      ladder,
      rowHeightPx,
      centerPrice,
      displayTick,
    );
    if (cy == null) continue;
    const label = formatScalpingOrderbookQtyByMode(displayQty, 'exact');
    const textW = ctx.measureText(label || '0').width;
    const rx = Math.hypot(textW / 2, fontSizePx / 2) + padInside;
    items.push({ cluster: c, label, rx, ry: rx, cy });
  }
  if (!items.length) return false;

  const innerPad = 4;
  const overlapRatio = 0.5;
  const laneRight = left + width;

  type PlacedTapeItem = TapeItem & { x: number };
  const placedNewestFirst: PlacedTapeItem[] = [];
  let cursorX = laneRight - innerPad;
  for (let i = items.length - 1; i >= 0; i--) {
    const item = items[i]!;
    const x = cursorX - item.rx;
    if (x + item.rx < left) break;
    placedNewestFirst.push({ ...item, x });
    cursorX = x + item.rx - item.rx * 2 * (1 - overlapRatio);
  }
  if (!placedNewestFirst.length) return false;
  const placed = placedNewestFirst.slice().reverse();

  let animating = false;
  if (tapeAnim) {
    const frameNow = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const liveKeys = new Set<string>();
    const moveEps = 0.25;
    for (let i = 0; i < placed.length; i++) {
      const item = placed[i]!;
      const key = tapeClusterKey(item.cluster);
      liveKeys.add(key);
      const targetX = item.x;
      const targetCy = item.cy;
      let tr = tapeAnim.transitions.get(key);
      const prev = tapeAnim.positions.get(key);

      if (tr && (Math.abs(tr.toX - targetX) > moveEps || Math.abs(tr.toCy - targetCy) > moveEps)) {
        const elapsed = frameNow - tr.startMs;
        const p = easeTapeSmooth(elapsed / SCALPING_ORDERBOOK_SMOOTH_MS);
        const curX = tr.fromX + (tr.toX - tr.fromX) * p;
        const curCy = tr.fromCy + (tr.toCy - tr.fromCy) * p;
        tr = {
          fromX: curX,
          toX: targetX,
          fromCy: curCy,
          toCy: targetCy,
          startMs: frameNow,
        };
        tapeAnim.transitions.set(key, tr);
      } else if (
        !tr &&
        prev &&
        (Math.abs(prev.x - targetX) > moveEps || Math.abs(prev.cy - targetCy) > moveEps)
      ) {
        tr = {
          fromX: prev.x,
          toX: targetX,
          fromCy: prev.cy,
          toCy: targetCy,
          startMs: frameNow,
        };
        tapeAnim.transitions.set(key, tr);
      }

      if (tr) {
        const t = (frameNow - tr.startMs) / SCALPING_ORDERBOOK_SMOOTH_MS;
        if (t >= 1) {
          item.x = tr.toX;
          item.cy = tr.toCy;
          tapeAnim.transitions.delete(key);
        } else {
          const e = easeTapeSmooth(t);
          item.x = tr.fromX + (tr.toX - tr.fromX) * e;
          item.cy = tr.fromCy + (tr.toCy - tr.fromCy) * e;
          animating = true;
        }
      }
      tapeAnim.positions.set(key, { x: item.x, cy: item.cy });
    }
    for (const key of [...tapeAnim.positions.keys()]) {
      if (!liveKeys.has(key)) {
        tapeAnim.positions.delete(key);
        tapeAnim.transitions.delete(key);
      }
    }
  }

  ctx.save();
  ctx.beginPath();
  ctx.rect(left, 0, width, ladderHeight);
  ctx.clip();
  ctx.globalAlpha = 1;

  if (placed.length >= 2) {
    ctx.strokeStyle = theme.grid;
    ctx.lineWidth = 1;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(placed[0]!.x, placed[0]!.cy);
    for (let i = 1; i < placed.length; i++) {
      ctx.lineTo(placed[i]!.x, placed[i]!.cy);
    }
    ctx.stroke();
  }

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = tapeFont;
  const stroke = readCssVar('--bds-static-black', '#000000');
  const textColor = readCssVar('--bds-static-white', '#ffffff');

  for (const item of placed) {
    const bubbleColor = item.cluster.side === 'buy' ? theme.tapeBuyBg : theme.tapeSellBg;
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(item.x, item.cy, item.rx, item.ry, 0, 0, Math.PI * 2);
    ctx.fillStyle = theme.bg;
    ctx.fill();
    ctx.fillStyle = bubbleColor;
    ctx.fill();
    ctx.stroke();

    if (item.label) {
      ctx.fillStyle = textColor;
      ctx.fillText(item.label, item.x, item.cy + 0.5);
    }
  }

  ctx.restore();
  return animating;
}
