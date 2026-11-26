import { resolveCanvasChartPanFrac } from '@/canvas-chart';
import {
  resolveTwChartThemeColors,
  TW_CHART_THEME_COLORS,
  TW_CHART_VOLUME_DOWN,
  TW_CHART_VOLUME_UP,
  withAlpha,
} from '@/components/tw-chart-theme';
import { readCssVar } from '@/lib/css-color';
import { resolveOrderbookSideColors } from '@/Scalping/orderbook-side-colors';
import {
  CLUSTER_CHART_BUCKET_MS,
  CLUSTER_CHART_CANDLE_STRIP_W,
  CLUSTER_CHART_COL_WIDTH,
  CLUSTER_CHART_FOOTER_H,
  CLUSTER_CHART_TIME_AXIS_H,
  CLUSTER_CHART_VOLUME_H,
  type ClusterChartColumn,
} from './cluster-chart-build';
import type { ClusterChartLadderRow } from './cluster-chart-types';
import {
  clampClusterChartTapeW,
  CLUSTER_CHART_PANE_DIVIDER,
  CLUSTER_CHART_TAPE_W,
  drawClusterChartTapeBubbles,
  type ClusterChartTapeAnimState,
} from './cluster-chart-tape';
import type { ScalpingOrderbookTradeCluster } from '@/Scalping/scalping-orderbook-types';
import {
  drawClusterChartLargeTradeMarkers,
  drawClusterChartLargeTradeZones,
  type ClusterChartLargeTradePaintHit,
  type LargestSizeZone,
  type ReplayAlgoChartMarker,
} from './cluster-chart-large-trades';

/** Формат числа объёма: compact (1.5K) или точное целое. */
export type ClusterChartQtyFormat = 'compact' | 'exact';

/** Тема отрисовки кластерного графика (копия палитры стакана). */
export interface ClusterChartTheme {
  /** Фон */
  bg: string;
  /** Основной текст */
  fg: string;
  /** Приглушённый текст */
  muted: string;
  /** Линии/сетка */
  grid: string;
  /** Покупка / бид */
  bid: string;
  /** Продажа / аск */
  ask: string;
  /** Фон шарика покупки */
  tapeBuyBg: string;
  /** Фон шарика продажи */
  tapeSellBg: string;
  /** Золотистая заливка POC */
  volumeGold: string;
  /** Фон визуального уровня (Alt+H / L) */
  visualLevelBg: string;
  /** Фон ячейки с айсбергом (как в стакане) */
  icebergBg: string;
}

const SIDE_FALLBACK = resolveOrderbookSideColors(null);
const DEFAULT_FG = 'rgba(250, 250, 250, 0.92)';
const DEFAULT_MUTED = 'rgba(161, 161, 170, 0.9)';
const DEFAULT_GRID = 'rgba(63, 63, 70, 0.55)';
const DEFAULT_BG = 'rgba(24, 24, 27, 1)';
const DEFAULT_VOLUME_GOLD = 'rgba(234, 179, 8, 0.55)';
/** Визуальный уровень L / Alt+H — янтарный (как в стакане). */
const DEFAULT_VISUAL_LEVEL_BG = 'rgba(245, 158, 11, 0.38)';
/** Айсберг — sky, как DEFAULT_ICEBERG_BG в стакане. */
const DEFAULT_ICEBERG_BG = 'rgba(14, 165, 233, 0.42)';

/** Ширина колонки цены справа, px. */
export const CLUSTER_CHART_PRICE_AXIS_W = 52;

/** Горизонтальный отступ подписи внутри оси (слева = справа). */
export const CLUSTER_CHART_PRICE_AXIS_PAD_X = 6;

/** Шрифт шкалы цены / last — как TradingView (Trebuchet). */
export const CLUSTER_CHART_PRICE_AXIS_FONT =
  '11px "Trebuchet MS", "Segoe UI", Roboto, Ubuntu, sans-serif';

/** Шрифт бейджа last price. */
export const CLUSTER_CHART_LAST_PRICE_FONT =
  'bold 11px "Trebuchet MS", "Segoe UI", Roboto, Ubuntu, sans-serif';

/** Высота бейджа last price, px. */
export const CLUSTER_CHART_LAST_PRICE_LABEL_H = 18;

/** Цвет подписей шкалы (TV scalesProperties.textColor). */
export const CLUSTER_CHART_PRICE_AXIS_TEXT = 'rgb(178, 181, 190)';

/** Текст на бейдже last price. */
export const CLUSTER_CHART_LAST_PRICE_LABEL_FG = '#ffffff';

export {
  CLUSTER_CHART_TAPE_W,
  CLUSTER_CHART_PANE_DIVIDER,
  clampClusterChartTapeW,
};

/**
 * Раскладка: [кластеры][лента][цена].
 */
export function resolveClusterChartPaneLayout(
  width: number,
  preferredTapeW: number = CLUSTER_CHART_TAPE_W,
): {
  /** Ширина зоны кластеров */
  clusterW: number;
  /** Ширина ленты */
  tapeW: number;
  /** Ширина оси цены */
  axisW: number;
  /** Левый край кластеров */
  clusterLeft: number;
  /** Левый край ленты */
  tapeLeft: number;
  /** Левый край оси цены */
  axisLeft: number;
} {
  const axisW = CLUSTER_CHART_PRICE_AXIS_W;
  const divider = CLUSTER_CHART_PANE_DIVIDER;
  // preferredTapeW <= 0 — лента выключена.
  const tapeW =
    preferredTapeW > 0 ? clampClusterChartTapeW(preferredTapeW, width) : 0;
  // Кластеры и лента вплотную; разделитель только перед осью цены.
  const clusterW = Math.max(0, width - tapeW - axisW - divider);
  const clusterLeft = 0;
  const tapeLeft = clusterW;
  const axisLeft = tapeLeft + tapeW + divider;
  return { clusterW, tapeW, axisW, clusterLeft, tapeLeft, axisLeft };
}

/** Мин. высота строки лестницы, px. */
export const CLUSTER_CHART_MIN_ROW_H = 14;

/** Доля ширины колонки под бар объёма (как body свечи на canvas). */
export const CLUSTER_CHART_VOLUME_BAR_RATIO = 0.88;

/** Прозрачность баров объёма (как volumeUp/Down на canvas). */
export const CLUSTER_CHART_VOLUME_BAR_ALPHA = 0.35;

/** Целевой интервал между подписями шкалы, px (зависит от зума через rowH). */
export const CLUSTER_CHART_PRICE_AXIS_LABEL_TARGET_PX = 48;

/** Кандидаты «красивого» шага в тиках (как TV). */
const CLUSTER_CHART_PRICE_AXIS_NICE_STEPS = [
  1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000, 2500, 5000, 10000,
] as const;

/**
 * Округляет мин. шаг тиков вверх до «красивого» числа.
 */
export function niceClusterChartPriceAxisStepTicks(minStepTicks: number): number {
  const min = Math.max(1, Math.ceil(minStepTicks));
  for (const candidate of CLUSTER_CHART_PRICE_AXIS_NICE_STEPS) {
    if (candidate >= min) return candidate;
  }
  const mag = 10 ** Math.floor(Math.log10(min));
  const n = min / mag;
  if (n <= 1) return mag;
  if (n <= 2) return 2 * mag;
  if (n <= 5) return 5 * mag;
  return 10 * mag;
}

/**
 * Шаг подписей шкалы в тиках от высоты строки (зума по цене).
 */
export function resolveClusterChartPriceAxisLabelStepTicks(
  rowHeightPx: number,
  targetPx: number = CLUSTER_CHART_PRICE_AXIS_LABEL_TARGET_PX,
): number {
  const rowH = rowHeightPx > 0 && Number.isFinite(rowHeightPx) ? rowHeightPx : CLUSTER_CHART_MIN_ROW_H;
  const target = targetPx > 0 && Number.isFinite(targetPx) ? targetPx : CLUSTER_CHART_PRICE_AXIS_LABEL_TARGET_PX;
  return niceClusterChartPriceAxisStepTicks(target / rowH);
}

/**
 * Показывать ли цену на правой шкале (каждые stepTicks).
 */
export function shouldShowClusterChartPriceAxisLabel(
  price: number,
  tick: number,
  stepTicks: number,
): boolean {
  if (!(Number.isFinite(price) && price > 0)) return false;
  const t = tick > 0 && Number.isFinite(tick) ? tick : 1;
  const step = stepTicks > 0 ? Math.floor(stepTicks) : 1;
  const tickKey = Math.round(price / t);
  return tickKey % step === 0;
}

/**
 * Layout строк с непрерывным якорем по centerPrice (если задан).
 */
export function resolveClusterChartRowLayout(
  ladderHeight: number,
  ladder: readonly ClusterChartLadderRow[],
  rowHeightPx: number | undefined,
  centerPrice: number | null | undefined,
  displayTick: number,
): Array<{ y: number; h: number }> {
  const anchor =
    centerPrice != null &&
    Number.isFinite(centerPrice) &&
    centerPrice > 0 &&
    Number.isFinite(displayTick) &&
    displayTick > 0
      ? { centerPrice, displayTick, ladder }
      : null;
  return buildClusterChartRowLayout(ladderHeight, ladder.length, rowHeightPx, anchor);
}

/**
 * Горизонтальная сетка по тем же ценам, что подписи шкалы.
 * Линии всегда от left до right (до оси), независимо от сдвига колонок.
 */
export function drawClusterChartPriceLabelGrid(
  ctx: CanvasRenderingContext2D,
  opts: {
    /** Левый край (обычно 0) */
    left: number;
    /** Правый край (обычно axisLeft — до шкалы цены) */
    right: number;
    ladderHeight: number;
    ladder: readonly ClusterChartLadderRow[];
    tick: number;
    theme: ClusterChartTheme;
    /** Высота строки зума, px */
    rowHeightPx?: number;
    /** Центр цены для непрерывного якоря */
    centerPrice?: number | null;
  },
): void {
  const { left, right, ladderHeight, ladder, tick, theme, rowHeightPx, centerPrice } = opts;
  const width = right - left;
  if (!(width > 0) || !(ladderHeight > 0) || !ladder.length) return;
  const rowLayout = resolveClusterChartRowLayout(
    ladderHeight,
    ladder,
    rowHeightPx,
    centerPrice,
    tick,
  );
  const rowH =
    rowLayout[0]?.h ??
    (ladder.length > 0 ? ladderHeight / ladder.length : CLUSTER_CHART_MIN_ROW_H);
  const labelStepTicks = resolveClusterChartPriceAxisLabelStepTicks(rowH);
  ctx.strokeStyle = theme.grid;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 0; i < ladder.length; i++) {
    const row = ladder[i];
    const layout = rowLayout[i];
    if (!row || !layout) continue;
    if (!shouldShowClusterChartPriceAxisLabel(row.price, tick, labelStepTicks)) continue;
    const y = Math.round(layout.y + layout.h / 2) + 0.5;
    ctx.moveTo(left, y);
    ctx.lineTo(right, y);
  }
  ctx.stroke();
}

/**
 * Тема как у реплея/TradingView-стакана.
 */
export function resolveClusterChartTheme(): ClusterChartTheme {
  const colors = resolveTwChartThemeColors(TW_CHART_THEME_COLORS);
  const side = resolveOrderbookSideColors(
    typeof document !== 'undefined' ? document.documentElement : null,
  );
  return {
    bg: colors.background,
    fg: colors.crosshair,
    muted: colors.scaleText,
    grid: colors.grid,
    bid: side.buy,
    ask: side.sell,
    tapeBuyBg: side.buySoft,
    tapeSellBg: side.sellSoft,
    volumeGold: withAlpha(colors.primary, 0.6),
    visualLevelBg: DEFAULT_VISUAL_LEVEL_BG,
    icebergBg: DEFAULT_ICEBERG_BG,
  };
}

/** Якорь непрерывного vertical zoom: цена в центре панели. */
export interface ClusterChartRowLayoutAnchor {
  /** Цена в центре панели */
  centerPrice: number;
  /** Шаг ряда (displayTick) */
  displayTick: number;
  /** Лестница цен (та же, что рисуем) */
  ladder: readonly ClusterChartLadderRow[];
}

/**
 * Layout строк лестницы (y/h).
 * С якорем — непрерывный зум вокруг centerPrice (цена→Y без скачков rowCount).
 * Без якоря — блок строк центрируется в панели.
 */
export function buildClusterChartRowLayout(
  height: number,
  rowCount: number,
  rowHeightPx?: number,
  anchor?: ClusterChartRowLayoutAnchor | null,
): Array<{ y: number; h: number }> {
  if (rowCount <= 0) return [];
  const panelH = Math.max(1, height);
  const rowH =
    rowHeightPx != null && Number.isFinite(rowHeightPx) && rowHeightPx > 0
      ? rowHeightPx
      : panelH / rowCount;

  if (
    anchor &&
    Number.isFinite(anchor.centerPrice) &&
    anchor.centerPrice > 0 &&
    Number.isFinite(anchor.displayTick) &&
    anchor.displayTick > 0 &&
    anchor.ladder.length > 0
  ) {
    const centerY = panelH / 2;
    const rows: Array<{ y: number; h: number }> = [];
    const n = Math.min(rowCount, anchor.ladder.length);
    for (let i = 0; i < n; i++) {
      const price = anchor.ladder[i]?.price;
      if (!(price != null && Number.isFinite(price))) {
        rows.push({ y: i * rowH, h: rowH });
        continue;
      }
      const yMid = centerY - ((price - anchor.centerPrice) / anchor.displayTick) * rowH;
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

/**
 * Знаков после запятой у числа.
 */
export function countClusterChartPriceDecimals(price: number): number {
  if (!Number.isFinite(price)) return 0;
  const s = price.toFixed(10).replace(/0+$/, '').replace(/\.$/, '');
  const i = s.indexOf('.');
  return i < 0 ? 0 : s.length - i - 1;
}

/**
 * Шаг пустых уровней по знакам цены.
 */
export function inferClusterChartTick(prices: readonly number[]): number {
  if (!prices.length) return 1;
  let maxDec = 0;
  for (const p of prices) {
    maxDec = Math.max(maxDec, countClusterChartPriceDecimals(p));
  }
  const tick = 10 ** -maxDec;
  return Number.isFinite(tick) && tick > 0 ? tick : 1;
}

/**
 * Округление цены к шагу тика.
 */
export function roundClusterChartPriceToTick(price: number, tick: number): number {
  if (!(Number.isFinite(price) && Number.isFinite(tick) && tick > 0)) return price;
  const decimals = Math.min(
    10,
    Math.max(countClusterChartPriceDecimals(tick), countClusterChartPriceDecimals(price)),
  );
  const rounded = Math.round(price / tick) * tick;
  return Number(rounded.toFixed(decimals));
}

/**
 * Лестница цен вокруг center (ключи displayTick).
 * Дробная часть center учитывается в layout (якорь), здесь — покрытие панели.
 */
export function buildClusterChartLadder(
  centerPrice: number,
  tick: number,
  rowCount: number,
): ClusterChartLadderRow[] {
  if (!(rowCount > 0) || !(tick > 0) || !(Number.isFinite(centerPrice) && centerPrice > 0)) {
    return [];
  }
  const centerKey = centerPrice / tick;
  // floor: дробный сдвиг уходит в Y-якорь, без скачка Math.round при зуме.
  const topKey = Math.floor(centerKey + (rowCount - 1) / 2 + 1e-9);
  const out: ClusterChartLadderRow[] = [];
  for (let i = 0; i < rowCount; i++) {
    const key = topKey - i;
    out.push({ price: roundClusterChartPriceToTick(key * tick, tick) });
  }
  return out;
}

/** Мин. высота строки на экране при вертикальном сжатии. */
export const CLUSTER_CHART_PRICE_ROW_H_VISUAL_MIN = 8;

/**
 * Вертикальный зум → высота строки + агрегация.
 * `priceRowH` = px на базовый тик (непрерывно).
 * Ниже visual min: stepTicks = ceil(visualMin / px), visualRowH = stepTicks × px
 * (масштаб цена→Y остаётся непрерывным, без nice-скачков 1→2→5).
 */
export function resolveClusterChartPriceZoom(opts: {
  /** Высота панели цены, px */
  ladderHeight: number;
  /** Логический зум: px на базовый тик */
  priceRowH: number;
  /** Базовый тик инструмента */
  baseTick: number;
  /** Мин. высота строки на экране */
  visualMinRowH?: number;
  /** Абсолютный мин. логического зума */
  logicMinRowH?: number;
  /** Макс. логического зума */
  logicMaxRowH?: number;
}): {
  /** Высота строки на экране (stepTicks × px на базовый тик) */
  visualRowH: number;
  /** Число строк лестницы */
  rowCount: number;
  /** Сколько базовых тиков в одной строке */
  stepTicks: number;
  /** Шаг цены ряда (= baseTick × stepTicks) */
  displayTick: number;
  /** Px на базовый тик (тот же непрерывный зум) */
  pxPerBaseTick: number;
} {
  const visualMin =
    opts.visualMinRowH != null && opts.visualMinRowH > 0
      ? opts.visualMinRowH
      : CLUSTER_CHART_PRICE_ROW_H_VISUAL_MIN;
  const logicMin = opts.logicMinRowH != null && opts.logicMinRowH > 0 ? opts.logicMinRowH : 1;
  const logicMax = opts.logicMaxRowH != null && opts.logicMaxRowH > 0 ? opts.logicMaxRowH : 48;
  const baseTick = opts.baseTick > 0 && Number.isFinite(opts.baseTick) ? opts.baseTick : 1;
  const desired = Number.isFinite(opts.priceRowH) ? opts.priceRowH : visualMin;
  const pxPerBaseTick = Math.max(logicMin, Math.min(logicMax, desired));
  let stepTicks = 1;
  if (pxPerBaseTick < visualMin - 1e-9) {
    stepTicks = Math.max(1, Math.ceil(visualMin / pxPerBaseTick - 1e-9));
  }
  const visualRowH = stepTicks * pxPerBaseTick;
  const panelH = Math.max(1, opts.ladderHeight);
  // +2: запас на дробный якорь (частично видимые строки сверху/снизу).
  const rowCount = Math.max(8, Math.ceil(panelH / Math.max(1e-6, visualRowH)) + 2);
  return {
    visualRowH,
    rowCount,
    stepTicks,
    displayTick: baseTick * stepTicks,
    pxPerBaseTick,
  };
}

/**
 * Суммирует ячейки колонки в строки лестницы (агрегация при stepTicks &gt; 1).
 */
export function aggregateClusterChartCellsToLadder(opts: {
  /** Ячейки колонки: tickKey базового тика → объёмы */
  cells: ReadonlyMap<number, { buyQty: number; sellQty: number }>;
  /** Лестница (шаг = displayTick) */
  ladder: readonly ClusterChartLadderRow[];
  /** Базовый тик инструмента */
  baseTick: number;
  /** Шаг ряда на экране */
  displayTick: number;
}): Array<{ buyQty: number; sellQty: number } | null> {
  const { cells, ladder, baseTick, displayTick } = opts;
  const out: Array<{ buyQty: number; sellQty: number } | null> = ladder.map(() => null);
  if (!ladder.length || !(baseTick > 0) || !(displayTick > 0)) return out;

  const stepTicks = Math.max(1, Math.round(displayTick / baseTick));
  const rowByDisplayKey = new Map<number, number>();
  for (let r = 0; r < ladder.length; r++) {
    const row = ladder[r];
    if (!row) continue;
    rowByDisplayKey.set(Math.round(row.price / displayTick), r);
  }

  for (const [baseKey, cell] of cells) {
    // floor по stepTicks: 100 и 101 при step=2 → одна строка 100.
    const displayKey = Math.floor(baseKey / stepTicks);
    const r = rowByDisplayKey.get(displayKey);
    if (r == null) continue;
    const prev = out[r];
    if (!prev) {
      out[r] = { buyQty: cell.buyQty, sellQty: cell.sellQty };
    } else {
      prev.buyQty += cell.buyQty;
      prev.sellQty += cell.sellQty;
    }
  }
  return out;
}

/**
 * Компактный объём: 1.2K / 3.4M / 850.
 */
export function formatClusterChartQty(qty: number): string {
  if (!(Number.isFinite(qty) && qty > 0)) return '';
  const abs = Math.floor(Math.abs(qty));
  if (!(abs > 0)) return '';
  if (abs >= 1_000_000) {
    const n = abs / 1_000_000;
    const fixed = n >= 10 ? n.toFixed(0) : n.toFixed(1);
    return `${fixed.replace(/\.0$/, '')}M`;
  }
  if (abs >= 1_000) {
    const n = abs / 1_000;
    const fixed = n >= 10 ? n.toFixed(0) : n.toFixed(1);
    return `${fixed.replace(/\.0$/, '')}K`;
  }
  return String(abs);
}

/**
 * Объём без compact.
 */
export function formatClusterChartQtyExact(qty: number): string {
  if (!(Number.isFinite(qty) && qty > 0)) return '';
  const abs = Math.floor(Math.abs(qty));
  return abs > 0 ? String(abs) : '';
}

/**
 * Объём по выбранному формату.
 */
export function formatClusterChartQtyByMode(
  qty: number,
  mode: ClusterChartQtyFormat = 'exact',
): string {
  return mode === 'exact' ? formatClusterChartQtyExact(qty) : formatClusterChartQty(qty);
}

/**
 * Группирует целую часть тонким пробелом (как TradingView: 83 256).
 */
export function formatClusterChartPriceGroupedInteger(intPart: string): string {
  const raw = intPart.replace(/[^\d-]/g, '');
  const neg = raw.startsWith('-');
  const digits = neg ? raw.slice(1) : raw;
  const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, '\u202f');
  return neg ? `−${grouped}` : grouped;
}

/**
 * Подпись цены в стиле TradingView (тонкий пробел между тысячами).
 */
export function formatClusterChartPrice(price: number, decimals?: number): string {
  if (!(Number.isFinite(price))) return '—';
  if (price === 0) return '0';
  const dec =
    decimals != null && Number.isFinite(decimals) && decimals >= 0
      ? Math.max(0, Math.min(12, Math.floor(decimals)))
      : countClusterChartPriceDecimals(Math.abs(price));
  const fixed = Math.abs(price).toFixed(dec);
  const [intPart, frac] = fixed.split('.');
  const grouped = formatClusterChartPriceGroupedInteger(intPart ?? '0');
  const body = frac != null && dec > 0 ? `${grouped}.${frac}` : grouped;
  return price < 0 ? `−${body}` : body;
}

/**
 * Полоска open→close слева от ячеек кластера (только тело/тень OHLC в видимом диапазоне цен).
 */
function drawClusterCandleStrip(
  ctx: CanvasRenderingContext2D,
  opts: {
    x: number;
    stripW: number;
    open: number;
    close: number;
    high: number;
    low: number;
    /** Макс. цена видимой лестницы */
    ladderMax: number;
    /** Мин. цена видимой лестницы */
    ladderMin: number;
    priceToRow: (price: number) => { y: number; h: number } | null;
    theme: ClusterChartTheme;
  },
): void {
  const { x, stripW, open, close, high, low, ladderMax, ladderMin, priceToRow, theme } = opts;
  if (!(open > 0 && close > 0)) return;
  if (!(ladderMax >= ladderMin)) return;
  // Полностью вне видимой области — не рисуем (иначе липнет к краю красным/зелёным).
  if (high < ladderMin || low > ladderMax) return;

  const clipPrice = (price: number): number =>
    Math.min(ladderMax, Math.max(ladderMin, price));

  const rowOpen = priceToRow(clipPrice(open));
  const rowClose = priceToRow(clipPrice(close));
  const rowHigh = priceToRow(clipPrice(high));
  const rowLow = priceToRow(clipPrice(low));
  if (!rowOpen || !rowClose) return;

  const bull = close >= open;
  const stripColor = bull ? theme.bid : theme.ask;

  if (rowHigh && rowLow) {
    const y1 = Math.min(rowHigh.y, rowLow.y);
    const y2 = Math.max(rowHigh.y + rowHigh.h, rowLow.y + rowLow.h);
    ctx.strokeStyle = stripColor;
    ctx.globalAlpha = 0.35;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + stripW / 2, y1);
    ctx.lineTo(x + stripW / 2, y2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  const bodyTop = Math.min(rowOpen.y, rowClose.y);
  const bodyBot = Math.max(rowOpen.y + rowOpen.h, rowClose.y + rowClose.h);
  const bodyH = Math.max(2, bodyBot - bodyTop);
  ctx.fillStyle = stripColor;
  ctx.fillRect(x + 0.5, bodyTop, stripW - 1, bodyH);
}

/**
 * Подпись времени колонки.
 */
function formatClusterChartColumnTime(bucketStartMs: number, bucketMs: number): string {
  const d = new Date(bucketStartMs);
  const pad = (n: number) => String(n).padStart(2, '0');
  if (bucketMs < 60_000) {
    return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  }
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Мин. ширина на одну подпись времени, px (как у TV / screener). */
const CLUSTER_CHART_TIME_LABEL_MIN_PX = 72;

/** «Круглые» шаги оси времени, мс. */
const CLUSTER_CHART_NICE_TIME_STEPS_MS = [
  500, 1_000, 2_000, 5_000, 10_000, 15_000, 30_000, 60_000, 120_000, 300_000, 600_000,
  900_000, 1_800_000, 3_600_000, 7_200_000, 14_400_000, 43_200_000, 86_400_000,
] as const;

/**
 * Подбирает шаг времени под целевое число меток.
 */
function resolveClusterChartNiceTimeStepMs(spanMs: number, targetLabels: number): number {
  const raw = spanMs / Math.max(1, targetLabels - 1);
  for (const step of CLUSTER_CHART_NICE_TIME_STEPS_MS) {
    if (step >= raw) return step;
  }
  return CLUSTER_CHART_NICE_TIME_STEPS_MS[CLUSTER_CHART_NICE_TIME_STEPS_MS.length - 1]!;
}

/**
 * Индексы колонок для оси времени: не под каждой свечой, а с шагом как у TV.
 */
export function pickClusterChartTimeLabelIndices(
  columns: readonly { bucketStartMs: number }[],
  plotWidth: number,
  colW: number,
): number[] {
  const n = columns.length;
  if (n <= 0 || !(plotWidth > 0)) return [];
  if (n === 1) return [0];

  const maxLabels = Math.max(
    2,
    Math.min(8, Math.floor(plotWidth / CLUSTER_CHART_TIME_LABEL_MIN_PX)),
  );
  if (n <= maxLabels) {
    return Array.from({ length: n }, (_, i) => i);
  }

  const first = columns[0]!.bucketStartMs;
  const last = columns[n - 1]!.bucketStartMs;
  const spanMs = Math.max(0, last - first);
  const stepMs = resolveClusterChartNiceTimeStepMs(spanMs, maxLabels);
  const minGapCols = Math.max(
    1,
    Math.ceil((CLUSTER_CHART_TIME_LABEL_MIN_PX * 0.85) / Math.max(1, colW)),
  );

  const idxs: number[] = [];
  let lastIdx = Number.NEGATIVE_INFINITY;
  for (let i = 0; i < n; i += 1) {
    const t = columns[i]!.bucketStartMs;
    if (t % stepMs !== 0) continue;
    if (i - lastIdx < minGapCols) continue;
    idxs.push(i);
    lastIdx = i;
    if (idxs.length >= maxLabels) break;
  }
  if (idxs.length >= 2) return idxs;

  const even: number[] = [];
  for (let i = 0; i < maxLabels; i += 1) {
    even.push(Math.round((i * (n - 1)) / (maxLabels - 1)));
  }
  return [...new Set(even)];
}

/**
 * Панель объёма (гистограмма) + ось времени под колонками.
 */
/**
 * Макс. суммарный объём по колонкам (для шкалы Vol).
 */
export function resolveClusterChartMaxVolume(columns: readonly ClusterChartColumn[]): number {
  let maxVol = 0;
  for (const col of columns) {
    const vol = Math.floor(col.totalBuy + col.totalSell);
    if (vol > maxVol) maxVol = vol;
  }
  return maxVol;
}

/**
 * Панель объёма + ось времени под кластерами (бары как на canvas-свечах).
 */
function drawClusterChartVolumeAndTime(
  ctx: CanvasRenderingContext2D,
  opts: {
    left: number;
    width: number;
    ladderHeight: number;
    columns: readonly ClusterChartColumn[];
    colW: number;
    startX: number;
    theme: ClusterChartTheme;
    bucketMs: number;
    /** Мин. объём: ниже — серый полупрозрачный */
    minVolumeFilter?: number;
  },
): number {
  const {
    left,
    width,
    ladderHeight,
    columns,
    colW,
    startX,
    theme,
    bucketMs,
    minVolumeFilter = 0,
  } = opts;
  const volumeFilter =
    Number.isFinite(minVolumeFilter) && minVolumeFilter > 0 ? minVolumeFilter : 0;
  const volumeH = CLUSTER_CHART_VOLUME_H;
  const timeH = CLUSTER_CHART_TIME_AXIS_H;
  const volumeTop = ladderHeight;
  const timeTop = ladderHeight + volumeH;

  ctx.fillStyle = theme.bg;
  ctx.fillRect(left, volumeTop, width, volumeH + timeH);

  const maxVol = resolveClusterChartMaxVolume(columns);

  // Сетка объёма + разделители (как на screener canvas).
  ctx.strokeStyle = theme.grid;
  ctx.lineWidth = 1;
  ctx.beginPath();
  const volGridLines = 2;
  for (let i = 0; i <= volGridLines; i += 1) {
    const y = volumeTop + (i / volGridLines) * volumeH + 0.5;
    ctx.moveTo(left, y);
    ctx.lineTo(left + width, y);
  }
  ctx.moveTo(left, timeTop + 0.5);
  ctx.lineTo(left + width, timeTop + 0.5);
  ctx.stroke();

  const barW = Math.max(1, Math.min(colW - 0.5, colW * CLUSTER_CHART_VOLUME_BAR_RATIO));

  for (let i = 0; i < columns.length; i++) {
    const col = columns[i];
    if (!col) continue;
    const vol = Math.floor(col.totalBuy + col.totalSell);
    if (!(maxVol > 0 && vol > 0)) continue;
    const bull = col.close >= col.open;
    const t = Math.min(1, vol / maxVol);
    const yVolTop = volumeTop + (1 - t) * volumeH;
    const vh = Math.max(1, volumeTop + volumeH - yVolTop);
    const filtered = volumeFilter > 0 && vol < volumeFilter;
    ctx.fillStyle = filtered
      ? withAlpha(theme.muted, 0.28)
      : bull
        ? TW_CHART_VOLUME_UP
        : TW_CHART_VOLUME_DOWN;
    const x = startX + i * colW + (colW - barW) / 2;
    ctx.fillRect(x, yVolTop, barW, vh);
  }

  const timeLabelIdxs = pickClusterChartTimeLabelIndices(columns, width, colW);
  ctx.font = '9px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = theme.muted;
  for (let li = 0; li < timeLabelIdxs.length; li += 1) {
    const i = timeLabelIdxs[li]!;
    const col = columns[i];
    if (!col) continue;
    const x = startX + i * colW + colW / 2;
    if (li === 0) ctx.textAlign = 'left';
    else if (li === timeLabelIdxs.length - 1) ctx.textAlign = 'right';
    else ctx.textAlign = 'center';
    ctx.fillText(
      formatClusterChartColumnTime(col.bucketStartMs, bucketMs),
      x,
      timeTop + timeH / 2,
    );
  }

  return maxVol;
}

/**
 * Рисует столбики кластеров (footprint).
 * Скопировано из scalping-orderbook-draw.drawClusterColumns.
 */
export function drawClusterColumns(
  ctx: CanvasRenderingContext2D,
  opts: {
    left: number;
    width: number;
    ladderHeight: number;
    footerH: number;
    columns: readonly ClusterChartColumn[];
    theme: ClusterChartTheme;
    ladder: readonly ClusterChartLadderRow[];
    /** Шаг ряда лестницы (displayTick) */
    tick: number;
    /** Базовый тик ячеек; по умолчанию = tick */
    baseTick?: number;
    /** ТФ бакета, мс */
    bucketMs?: number;
    /** Формат объёма */
    qtyFormat?: ClusterChartQtyFormat;
    /** Мин. объём: ниже — серый полупрозрачный */
    minVolumeFilter?: number;
    /** Высота строки зума, px (попиксельный vertical zoom) */
    rowHeightPx?: number;
    /** Центр цены для непрерывного якоря */
    centerPrice?: number | null;
    /** Цены айсбергов для подсветки ячеек */
    icebergPrices?: readonly number[];
  },
): number {
  const {
    left,
    width,
    ladderHeight,
    footerH,
    columns,
    theme,
    ladder,
    tick,
    bucketMs = CLUSTER_CHART_BUCKET_MS,
    qtyFormat = 'exact',
    minVolumeFilter = 0,
    rowHeightPx,
    centerPrice,
    icebergPrices = [],
  } = opts;
  const volumeFilter =
    Number.isFinite(minVolumeFilter) && minVolumeFilter > 0 ? minVolumeFilter : 0;
  if (!(width > 0) || !columns.length || !ladder.length) return 0;

  const stripW = CLUSTER_CHART_CANDLE_STRIP_W;
  const visible = columns;
  const colW = Math.max(1, Math.floor(width / visible.length));
  if (!visible.length || !(colW > 0)) return 0;

  const displayTick = tick > 0 && Number.isFinite(tick) ? tick : 1;
  const baseTick =
    opts.baseTick != null && opts.baseTick > 0 && Number.isFinite(opts.baseTick)
      ? opts.baseTick
      : displayTick;

  const rowLayout = resolveClusterChartRowLayout(
    ladderHeight,
    ladder,
    rowHeightPx,
    centerPrice,
    displayTick,
  );
  const ladderMax = ladder[0]!.price;
  const ladderMin = ladder[ladder.length - 1]!.price;

  const priceToRow = (price: number): { y: number; h: number } | null => {
    if (!ladder.length) return null;
    let bestIdx = 0;
    let bestDist = Math.abs(ladder[0]!.price - price);
    for (let i = 1; i < ladder.length; i++) {
      const dist = Math.abs(ladder[i]!.price - price);
      if (dist < bestDist) {
        bestDist = dist;
        bestIdx = i;
      }
    }
    const row = rowLayout[bestIdx];
    if (!row) return null;
    return { y: row.y, h: row.h };
  };

  const font = '9px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
  const startX = left + Math.max(0, width - visible.length * colW);

  const aggregatedByCol = visible.map((col) =>
    aggregateClusterChartCellsToLadder({
      cells: col.cells,
      ladder,
      baseTick,
      displayTick,
    }),
  );

  // Макс. объём агрегированной ячейки среди видимых колонок — шкала ширины заливки.
  let visibleMaxVol = 0;
  for (const rows of aggregatedByCol) {
    for (const cell of rows) {
      if (!cell) continue;
      const v = cell.buyQty + cell.sellQty;
      if (v > visibleMaxVol) visibleMaxVol = v;
    }
  }

  for (let i = 0; i < visible.length; i++) {
    const col = visible[i];
    if (!col) continue;
    const x = startX + i * colW;
    const cellsLeft = x + stripW + 1;
    const cellsW = Math.max(1, colW - stripW - 2);
    const textInsetX = 3;
    const aggregated = aggregatedByCol[i] ?? [];

    drawClusterCandleStrip(ctx, {
      x,
      stripW,
      open: col.open,
      close: col.close,
      high: col.high,
      low: col.low,
      ladderMax,
      ladderMin,
      priceToRow,
      theme,
    });

    let colMaxVol = 0;
    for (const cell of aggregated) {
      if (!cell) continue;
      const v = cell.buyQty + cell.sellQty;
      if (v > colMaxVol) colMaxVol = v;
    }

    const priceEps = displayTick / 2;
    const icebergRowIdx = new Set<number>();
    if (icebergPrices.length) {
      for (let r = 0; r < ladder.length; r++) {
        const row = ladder[r];
        if (!row) continue;
        if (isClusterChartMarkedPrice(row.price, icebergPrices, priceEps)) {
          icebergRowIdx.add(r);
        }
      }
    }

    // Айс — полная ширина ячейки, только где есть объём (как footprint в стакане).
    if (icebergRowIdx.size > 0) {
      for (let r = 0; r < aggregated.length; r++) {
        if (!icebergRowIdx.has(r)) continue;
        const cell = aggregated[r];
        const layout = rowLayout[r];
        if (!cell || !layout) continue;
        const cellVol = cell.buyQty + cell.sellQty;
        if (!(cellVol > 0)) continue;
        ctx.fillStyle = theme.icebergBg;
        ctx.fillRect(cellsLeft, layout.y, cellsW, layout.h);
      }
    }

    const maxVolRowIdx = new Set<number>();
    const maxFont = 'bold 9px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
    const scaleMax = visibleMaxVol > 0 ? visibleMaxVol : colMaxVol;

    for (let r = 0; r < aggregated.length; r++) {
      const cell = aggregated[r];
      if (!cell) continue;
      const buy = Math.floor(cell.buyQty);
      const sell = Math.floor(cell.sellQty);
      if (!(buy > 0 || sell > 0)) continue;
      const layout = rowLayout[r];
      if (!layout) continue;

      const vol = buy + sell;
      const filtered = volumeFilter > 0 && vol < volumeFilter;
      const isIcebergRow = icebergRowIdx.has(r);
      const isMax = !filtered && !isIcebergRow && colMaxVol > 0 && vol >= colMaxVol;
      if (isMax) maxVolRowIdx.add(r);

      if (!isIcebergRow) {
        const heat = scaleMax > 0 ? Math.min(1, vol / scaleMax) : 0;
        const fillW = Math.max(1, Math.round(cellsW * heat));
        if (filtered) {
          ctx.fillStyle = withAlpha(theme.muted, 0.28);
          ctx.fillRect(cellsLeft, layout.y, fillW, layout.h);
        } else {
          const sideSoft = buy >= sell ? theme.tapeBuyBg : theme.tapeSellBg;
          const sideSolid = buy >= sell ? theme.bid : theme.ask;
          ctx.fillStyle = sideSoft;
          ctx.fillRect(cellsLeft, layout.y, fillW, layout.h);
          if (isMax) {
            ctx.fillStyle = withAlpha(sideSolid, 0.55);
            ctx.fillRect(cellsLeft, layout.y, fillW, layout.h);
            ctx.fillStyle = withAlpha(theme.volumeGold, 0.35);
            ctx.fillRect(cellsLeft, layout.y, fillW, layout.h);
          } else if (heat > 0.55) {
            ctx.fillStyle = withAlpha(sideSolid, (heat - 0.55) * 0.5);
            ctx.fillRect(cellsLeft, layout.y, fillW, layout.h);
          }
        }
      }

      const label = formatClusterChartQtyByMode(vol, qtyFormat);
      if (!label) continue;
      ctx.fillStyle = filtered
        ? withAlpha(theme.muted, 0.55)
        : readCssVar('--bds-static-white', '#ffffff');
      ctx.font = isMax && !isIcebergRow ? maxFont : font;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(
        label,
        Math.round(cellsLeft + textInsetX),
        Math.round(layout.y + layout.h / 2),
        Math.max(1, cellsW - textInsetX * 2),
      );
    }

    if (maxVolRowIdx.size > 0) {
      ctx.strokeStyle = theme.volumeGold;
      ctx.lineWidth = 1.5;
      for (const r of maxVolRowIdx) {
        const layout = rowLayout[r];
        if (!layout) continue;
        const pocCell = aggregated[r];
        const pocVol = pocCell ? pocCell.buyQty + pocCell.sellQty : colMaxVol;
        const pocHeat = scaleMax > 0 ? Math.min(1, pocVol / scaleMax) : 1;
        const pocW = Math.max(1, Math.round(cellsW * pocHeat));
        ctx.strokeRect(cellsLeft + 0.5, layout.y + 0.5, pocW - 1, layout.h - 1);
      }
    }
  }

  if (footerH > 0) {
    return drawClusterChartVolumeAndTime(ctx, {
      left,
      width,
      ladderHeight,
      columns: visible,
      colW,
      startX,
      theme,
      bucketMs,
      minVolumeFilter: volumeFilter,
    });
  }
  return resolveClusterChartMaxVolume(visible);
}

/**
 * Колонка цен справа.
 */
export function drawClusterChartPriceAxis(
  ctx: CanvasRenderingContext2D,
  opts: {
    left: number;
    width: number;
    ladderHeight: number;
    ladder: readonly ClusterChartLadderRow[];
    theme: ClusterChartTheme;
    tick: number;
    /** Макс. объём видимых колонок — шкала Vol справа */
    maxVolume?: number;
    /** Высота строки зума, px */
    rowHeightPx?: number;
    /** Центр цены для непрерывного якоря */
    centerPrice?: number | null;
  },
): void {
  const {
    left,
    width,
    ladderHeight,
    ladder,
    theme,
    tick,
    maxVolume = 0,
    rowHeightPx,
    centerPrice,
  } = opts;
  if (!(width > 0) || !ladder.length) return;
  const rowLayout = resolveClusterChartRowLayout(
    ladderHeight,
    ladder,
    rowHeightPx,
    centerPrice,
    tick,
  );
  const decimals = countClusterChartPriceDecimals(tick);
  const rowH =
    rowLayout[0]?.h ??
    (ladder.length > 0 ? ladderHeight / ladder.length : CLUSTER_CHART_MIN_ROW_H);
  const labelStepTicks = resolveClusterChartPriceAxisLabelStepTicks(rowH);
  ctx.fillStyle = theme.bg;
  ctx.fillRect(left, 0, width, ladderHeight + CLUSTER_CHART_FOOTER_H);
  ctx.strokeStyle = theme.grid;
  ctx.beginPath();
  ctx.moveTo(left + 0.5, 0);
  ctx.lineTo(left + 0.5, ladderHeight + CLUSTER_CHART_VOLUME_H);
  ctx.stroke();
  ctx.font = CLUSTER_CHART_PRICE_AXIS_FONT;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = CLUSTER_CHART_PRICE_AXIS_TEXT;
  const labelX = left + width / 2;
  const labelMaxW = Math.max(8, width - CLUSTER_CHART_PRICE_AXIS_PAD_X * 2);
  for (let i = 0; i < ladder.length; i++) {
    const row = ladder[i];
    const layout = rowLayout[i];
    if (!row || !layout) continue;
    if (!shouldShowClusterChartPriceAxisLabel(row.price, tick, labelStepTicks)) continue;
    ctx.fillText(
      formatClusterChartPrice(row.price, decimals),
      labelX,
      Math.round(layout.y + layout.h / 2),
      labelMaxW,
    );
  }

  // Шкала объёма справа (как на canvas-свечах), иначе «Vol».
  const volumeTop = ladderHeight;
  const volumeH = CLUSTER_CHART_VOLUME_H;
  ctx.font = CLUSTER_CHART_PRICE_AXIS_FONT;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = CLUSTER_CHART_PRICE_AXIS_TEXT;
  if (maxVolume > 0) {
    const volGridLines = 2;
    for (let i = 0; i <= volGridLines; i += 1) {
      const t = i / volGridLines;
      const vol = maxVolume * (1 - t);
      const y = volumeTop + t * volumeH;
      const label = formatClusterChartQty(vol) || (vol === 0 ? '0' : String(Math.floor(vol)));
      ctx.fillText(label, labelX, y, labelMaxW);
    }
  } else {
    ctx.fillText('Vol', labelX, volumeTop + volumeH / 2, labelMaxW);
  }
  ctx.fillText(
    'Time',
    labelX,
    volumeTop + volumeH + CLUSTER_CHART_TIME_AXIS_H / 2,
    labelMaxW,
  );
}

/**
 * Совпадает ли цена с одним из уровней (допуск = tick/2).
 */
export function isClusterChartMarkedPrice(
  price: number,
  marks: readonly number[],
  priceEps: number,
): boolean {
  if (!(Number.isFinite(price) && price > 0) || !marks.length) return false;
  const eps = priceEps > 0 ? priceEps : 1e-9;
  for (const mark of marks) {
    if (Number.isFinite(mark) && Math.abs(mark - price) <= eps) return true;
  }
  return false;
}

/** Цвет бейджа уровня на шкале (как TV showPrice у horzline). */
const CLUSTER_CHART_VISUAL_LEVEL_AXIS_BG = 'rgb(245, 158, 11)';

/**
 * Заливка строк визуальных уровней (Alt+H) на ширину кластеры+лента.
 */
export function drawClusterChartVisualLevels(
  ctx: CanvasRenderingContext2D,
  opts: {
    width: number;
    ladderHeight: number;
    ladder: readonly ClusterChartLadderRow[];
    tick: number;
    prices: readonly number[];
    theme: ClusterChartTheme;
    /** Высота строки зума, px */
    rowHeightPx?: number;
    /** Центр цены для непрерывного якоря */
    centerPrice?: number | null;
  },
): void {
  const { width, ladderHeight, ladder, tick, prices, theme, rowHeightPx, centerPrice } = opts;
  if (!(width > 0) || !(ladderHeight > 0) || !ladder.length || !prices.length) return;
  const priceEps = tick > 0 ? tick / 2 : 1e-9;
  const rowLayout = resolveClusterChartRowLayout(
    ladderHeight,
    ladder,
    rowHeightPx,
    centerPrice,
    tick,
  );

  ctx.save();
  for (let i = 0; i < ladder.length; i++) {
    const row = ladder[i];
    const layout = rowLayout[i];
    if (!row || !layout) continue;
    if (!isClusterChartMarkedPrice(row.price, prices, priceEps)) continue;
    ctx.fillStyle = theme.visualLevelBg;
    ctx.fillRect(0, layout.y, width, layout.h);
    // Линия по центру строки — как горизонтальный уровень на графике.
    const y = Math.round(layout.y + layout.h / 2) + 0.5;
    ctx.strokeStyle = withAlpha(theme.visualLevelBg, 0.95);
    ctx.lineWidth = 1;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  ctx.restore();
}

/**
 * Метки визуальных уровней на шкале цены (как showPrice у horzline на TV).
 */
export function drawClusterChartVisualLevelAxisLabels(
  ctx: CanvasRenderingContext2D,
  opts: {
    /** Левый край оси цены */
    left: number;
    /** Ширина оси */
    width: number;
    ladderHeight: number;
    ladder: readonly ClusterChartLadderRow[];
    tick: number;
    prices: readonly number[];
    /** Высота строки зума, px */
    rowHeightPx?: number;
    /** Центр цены для непрерывного якоря */
    centerPrice?: number | null;
  },
): void {
  const { left, width, ladderHeight, ladder, tick, prices, rowHeightPx, centerPrice } = opts;
  if (!(width > 0) || !(ladderHeight > 0) || !ladder.length || !prices.length) return;
  const priceEps = tick > 0 ? tick / 2 : 1e-9;
  const rowLayout = resolveClusterChartRowLayout(
    ladderHeight,
    ladder,
    rowHeightPx,
    centerPrice,
    tick,
  );
  const decimals = countClusterChartPriceDecimals(tick);
  const boxH = CLUSTER_CHART_LAST_PRICE_LABEL_H;
  const labelMaxW = Math.max(8, width - CLUSTER_CHART_PRICE_AXIS_PAD_X * 2);

  ctx.save();
  ctx.font = CLUSTER_CHART_LAST_PRICE_FONT;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let i = 0; i < ladder.length; i++) {
    const row = ladder[i];
    const layout = rowLayout[i];
    if (!row || !layout) continue;
    if (!isClusterChartMarkedPrice(row.price, prices, priceEps)) continue;
    const yMid = layout.y + layout.h / 2;
    const boxY = Math.min(ladderHeight - boxH, Math.max(0, Math.round(yMid - boxH / 2)));
    ctx.fillStyle = CLUSTER_CHART_VISUAL_LEVEL_AXIS_BG;
    ctx.fillRect(left, boxY, width, boxH);
    ctx.fillStyle = CLUSTER_CHART_LAST_PRICE_LABEL_FG;
    ctx.fillText(
      formatClusterChartPrice(row.price, decimals),
      left + width / 2,
      boxY + boxH / 2,
      labelMaxW,
    );
  }
  ctx.restore();
}

/**
 * Пустые слоты справа от последней свечи (scrollFromEnd &lt; 0), целое для среза.
 */
export function resolveClusterChartRightPad(scrollFromEnd: number): number {
  return Math.max(0, -Math.floor(scrollFromEnd));
}

/**
 * Пустые слоты слева: pan ушёл дальше загруженной истории (ждём REST).
 */
export function resolveClusterChartLeftPad(
  scrollFromEnd: number,
  columnCount: number,
  visibleCount: number,
): number {
  if (!(scrollFromEnd > 0) || !(visibleCount > 0)) return 0;
  const rightPad = resolveClusterChartRightPad(scrollFromEnd);
  if (rightPad > 0) return 0;
  const dataSlots = Math.max(1, Math.floor(visibleCount));
  const loadedMax = Math.max(0, columnCount - dataSlots);
  const over = Math.max(0, Math.floor(scrollFromEnd) - loadedMax);
  if (!(over > 0)) return 0;
  // Хотя бы одна колонка данных на экране, если они есть.
  if (columnCount > 0) return Math.min(over, Math.max(0, dataSlots - 1));
  return Math.min(over, dataSlots);
}

/**
 * X левого края отрисовки колонок с учётом right/left pad и дробного пана.
 */
export function resolveClusterChartColumnsDrawLeft(opts: {
  clusterW: number;
  slotW: number;
  visibleSlotCount: number;
  drawnColumnCount: number;
  scrollFromEnd: number;
  columnCount: number;
}): number {
  const {
    clusterW,
    slotW,
    visibleSlotCount,
    drawnColumnCount,
    scrollFromEnd,
    columnCount,
  } = opts;
  const frac = resolveCanvasChartPanFrac(Math.max(0, scrollFromEnd));
  const extraLeft = Math.max(0, drawnColumnCount - visibleSlotCount);
  const logicalWidth = Math.max(slotW, visibleSlotCount * slotW);
  const rightPadPx = Math.max(0, -scrollFromEnd) * slotW;
  if (rightPadPx > 0) {
    // Дробная пустота справа: данные едут влево от правого края.
    return clusterW - rightPadPx - drawnColumnCount * slotW;
  }
  const leftPad = resolveClusterChartLeftPad(scrollFromEnd, columnCount, visibleSlotCount);
  if (leftPad > 0) {
    return leftPad * slotW + frac * slotW;
  }
  // Правое выравнивание логических слотов + пиксельный сдвиг (extra слева заглядывает).
  const baseLeft = Math.max(0, clusterW - logicalWidth);
  return baseLeft + (frac - extraLeft) * slotW;
}

/**
 * Срез видимых колонок.
 * scrollFromEnd&gt;0 — в прошлое; 0 — новые справа; &lt;0 — запас пустого места справа.
 * Дробный offset: +1 колонка слева для плавного пана (как screener).
 */
export function sliceClusterChartVisibleColumns(
  columns: readonly ClusterChartColumn[],
  visibleCount: number,
  scrollFromEnd = 0,
): ClusterChartColumn[] {
  if (!columns.length || !(visibleCount > 0)) return [];
  const rightPad = resolveClusterChartRightPad(scrollFromEnd);
  const leftPad = resolveClusterChartLeftPad(scrollFromEnd, columns.length, visibleCount);
  const dataCount = Math.max(0, visibleCount - rightPad - leftPad);
  if (!(dataCount > 0)) return [];
  const histScroll = Math.max(0, Math.floor(scrollFromEnd));
  const frac = resolveCanvasChartPanFrac(Math.max(0, scrollFromEnd));
  const maxScroll = Math.max(0, columns.length - dataCount);
  const scroll = Math.min(histScroll, maxScroll);
  const end = columns.length - scroll;
  const extraLeft = frac > 0 && end - dataCount > 0 && leftPad === 0 && rightPad === 0 ? 1 : 0;
  const start = Math.max(0, end - dataCount - extraLeft);
  return columns.slice(start, Math.max(start, end));
}

/**
 * Колонка под курсором в зоне кластеров (для OHLCV HUD).
 */
export function resolveClusterChartHoverColumn(opts: {
  /** X в css px относительно канваса */
  x: number;
  columns: readonly ClusterChartColumn[];
  /** Ширина зоны кластеров, px */
  clusterW: number;
  /** Ширина колонки, px */
  colWidth: number;
  scrollFromEnd: number;
}): ClusterChartColumn | null {
  const { x, columns, clusterW, colWidth, scrollFromEnd } = opts;
  if (!(clusterW > 0) || !columns.length || !(x >= 0) || !(x < clusterW)) return null;
  const slotCount = Math.max(1, Math.floor(clusterW / Math.max(1, colWidth)));
  const slotW = Math.max(1, Math.floor(clusterW / slotCount));
  const visible = sliceClusterChartVisibleColumns(columns, slotCount, scrollFromEnd);
  if (!visible.length) return null;
  const drawWidth = Math.max(slotW, visible.length * slotW);
  const drawLeft = resolveClusterChartColumnsDrawLeft({
    clusterW,
    slotW,
    visibleSlotCount: slotCount,
    drawnColumnCount: visible.length,
    scrollFromEnd,
    columnCount: columns.length,
  });
  const drawnColW = Math.max(1, Math.floor(drawWidth / visible.length));
  if (x < drawLeft || x >= drawLeft + drawWidth) return null;
  const colIdx = Math.min(
    visible.length - 1,
    Math.max(0, Math.floor((x - drawLeft) / drawnColW)),
  );
  return visible[colIdx] ?? null;
}

/**
 * Y-координата цены на лестнице (центр строки), либо null вне диапазона.
 */
export function resolveClusterChartPriceY(
  price: number,
  ladder: readonly ClusterChartLadderRow[],
  ladderHeight: number,
  rowHeightPx?: number,
  centerPrice?: number | null,
  displayTick?: number,
): number | null {
  if (!(Number.isFinite(price) && price > 0) || !ladder.length || !(ladderHeight > 0)) {
    return null;
  }
  const top = ladder[0]?.price;
  const bottom = ladder[ladder.length - 1]?.price;
  if (!(top != null && bottom != null)) return null;
  const hi = Math.max(top, bottom);
  const lo = Math.min(top, bottom);
  if (price > hi || price < lo) return null;
  const tick =
    displayTick != null && displayTick > 0
      ? displayTick
      : Math.abs(ladder.length > 1 ? (ladder[0]!.price - ladder[1]!.price) : 1) || 1;
  const rowLayout = resolveClusterChartRowLayout(
    ladderHeight,
    ladder,
    rowHeightPx,
    centerPrice,
    tick,
  );
  // Лестница сверху вниз: ищем ближайшую строку.
  let bestIdx = 0;
  let bestDist = Number.POSITIVE_INFINITY;
  for (let i = 0; i < ladder.length; i++) {
    const row = ladder[i];
    if (!row) continue;
    const dist = Math.abs(row.price - price);
    if (dist < bestDist) {
      bestDist = dist;
      bestIdx = i;
    }
  }
  const layout = rowLayout[bestIdx];
  if (!layout) return null;
  return layout.y + layout.h / 2;
}

/**
 * Пунктир последней цены + метка на шкале (как screener canvas chart).
 */
export function drawClusterChartLastPriceLine(
  ctx: CanvasRenderingContext2D,
  opts: {
    /** Последняя цена */
    price: number;
    /** Цвет линии и бейджа */
    color: string;
    /** Лестница цен */
    ladder: readonly ClusterChartLadderRow[];
    /** Высота зоны кластеров */
    ladderHeight: number;
    /** Ширина зоны кластеров (до оси) */
    clusterW: number;
    /** Полная ширина канваса */
    width: number;
    /** Тема */
    theme: ClusterChartTheme;
    /** Шаг тика (для decimals) */
    tick: number;
    /** Высота строки зума, px */
    rowHeightPx?: number;
    /** Центр цены для непрерывного якоря */
    centerPrice?: number | null;
  },
): void {
  const { price, color, ladder, ladderHeight, width, tick, rowHeightPx, centerPrice } = opts;
  if (!(Number.isFinite(price) && price > 0) || !ladder.length || !(ladderHeight > 0)) return;

  const yRaw = resolveClusterChartPriceY(
    price,
    ladder,
    ladderHeight,
    rowHeightPx,
    centerPrice,
    tick,
  );
  // Вне видимой лестницы — прижимаем к краю панели (как screener).
  const top = ladder[0]?.price;
  const bottom = ladder[ladder.length - 1]?.price;
  let yLine: number;
  if (yRaw != null) {
    yLine = yRaw;
  } else if (top != null && bottom != null) {
    const hi = Math.max(top, bottom);
    const lo = Math.min(top, bottom);
    yLine = price >= hi ? 0.5 : price <= lo ? ladderHeight - 0.5 : ladderHeight / 2;
  } else {
    return;
  }

  const decimals = countClusterChartPriceDecimals(tick);
  const label = formatClusterChartPrice(price, decimals);
  const axisW = CLUSTER_CHART_PRICE_AXIS_W;
  const y = Math.round(yLine) + 0.5;

  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 3]);
  ctx.beginPath();
  ctx.moveTo(0, y);
  ctx.lineTo(width - axisW, y);
  ctx.stroke();
  ctx.setLineDash([]);

  // Бейдж на всю ширину шкалы, белый текст — как TradingView.
  const boxW = axisW;
  const boxH = CLUSTER_CHART_LAST_PRICE_LABEL_H;
  const boxX = width - axisW;
  const boxY = Math.min(ladderHeight - boxH, Math.max(0, Math.round(yLine - boxH / 2)));
  ctx.fillStyle = color;
  ctx.fillRect(boxX, boxY, boxW, boxH);
  ctx.font = CLUSTER_CHART_LAST_PRICE_FONT;
  ctx.fillStyle = CLUSTER_CHART_LAST_PRICE_LABEL_FG;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(
    label,
    boxX + boxW / 2,
    boxY + boxH / 2,
    boxW - CLUSTER_CHART_PRICE_AXIS_PAD_X * 2,
  );
  ctx.restore();
}

/**
 * Перекрестие + подписи цены/времени.
 */
export function drawClusterChartCrosshair(
  ctx: CanvasRenderingContext2D,
  opts: {
    x: number;
    y: number;
    width: number;
    height: number;
    ladderHeight: number;
    clusterW: number;
    theme: ClusterChartTheme;
    /** Подпись цены на оси */
    priceLabel?: string;
    /** Подпись времени внизу */
    timeLabel?: string;
  },
): void {
  const { x, y, width, height, ladderHeight, clusterW, theme, priceLabel, timeLabel } = opts;
  if (!(x >= 0 && y >= 0 && x < width && y < height)) return;

  const axisW = CLUSTER_CHART_PRICE_AXIS_W;
  const crossColor = theme.fg;
  const lineBottom = ladderHeight + CLUSTER_CHART_VOLUME_H;

  ctx.save();
  ctx.strokeStyle = crossColor;
  ctx.globalAlpha = 0.55;
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 3]);

  // Вертикаль — только в зоне кластеров/объёма.
  if (x < clusterW) {
    ctx.beginPath();
    ctx.moveTo(Math.round(x) + 0.5, 0);
    ctx.lineTo(Math.round(x) + 0.5, lineBottom);
    ctx.stroke();
  }

  // Горизонталь — по лестнице до оси цены.
  if (y < ladderHeight) {
    ctx.beginPath();
    ctx.moveTo(0, Math.round(y) + 0.5);
    ctx.lineTo(width, Math.round(y) + 0.5);
    ctx.stroke();
  }

  ctx.setLineDash([]);
  ctx.globalAlpha = 1;

  const labelFont = '10px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
  ctx.font = labelFont;

  if (priceLabel && y < ladderHeight) {
    const padX = 4;
    const padY = 3;
    const textW = ctx.measureText(priceLabel).width;
    const boxW = Math.min(axisW - 4, textW + padX * 2);
    const boxH = 16;
    const boxX = width - axisW + 2;
    const boxY = Math.min(ladderHeight - boxH, Math.max(0, Math.round(y - boxH / 2)));
    ctx.fillStyle = theme.fg;
    ctx.fillRect(boxX, boxY, boxW, boxH);
    ctx.fillStyle = theme.bg;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(priceLabel, boxX + boxW / 2, boxY + boxH / 2, boxW - 2);
  }

  if (timeLabel && x < clusterW) {
    const padX = 4;
    const textW = ctx.measureText(timeLabel).width;
    const boxW = textW + padX * 2;
    const boxH = CLUSTER_CHART_TIME_AXIS_H - 2;
    const timeTop = ladderHeight + CLUSTER_CHART_VOLUME_H;
    const boxX = Math.min(clusterW - boxW, Math.max(0, Math.round(x - boxW / 2)));
    const boxY = timeTop + 1;
    ctx.fillStyle = theme.fg;
    ctx.fillRect(boxX, boxY, boxW, boxH);
    ctx.fillStyle = theme.bg;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(timeLabel, boxX + boxW / 2, boxY + boxH / 2, boxW - 2);
  }

  ctx.restore();
}

/**
 * Полная отрисовка кластерного графика на канвасе.
 * @returns true — нужна следующая отрисовка (летящие шарики).
 */
export function paintClusterChart(
  ctx: CanvasRenderingContext2D,
  opts: {
    width: number;
    height: number;
    columns: readonly ClusterChartColumn[];
    ladder: readonly ClusterChartLadderRow[];
    /** Шаг ряда лестницы (displayTick) */
    tick: number;
    /** Базовый тик ячеек footprint; по умолчанию = tick */
    baseTick?: number;
    bucketMs: number;
    theme: ClusterChartTheme;
    /** Ширина одной колонки, px */
    colWidth?: number;
    /** Сдвиг окна в прошлое (0 = справа самые новые) */
    scrollFromEnd?: number;
    /** Перекрестие (css px относительно канваса) */
    crosshair?: { x: number; y: number } | null;
    /** Мин. объём: ниже — серый полупрозрачный; также фильтр ленты */
    minVolumeFilter?: number;
    /** Кластеры ленты принтов (как в стакане) */
    tapeClusters?: readonly ScalpingOrderbookTradeCluster[];
    /** Анимация сдвига шариков ленты */
    tapeAnim?: ClusterChartTapeAnimState;
    /** Желаемая ширина ленты, px */
    tapeW?: number;
    /** Цены визуальных уровней (Alt+H) */
    visualLevelPrices?: readonly number[];
    /** Маркеры крупных сделок L/S (настройки TV) */
    largeTradeMarkers?: readonly ReplayAlgoChartMarker[];
    /** Зоны крупнейших sizes (groupLargestSizes) */
    largeTradeZones?: readonly LargestSizeZone[];
    /**
     * Сюда пишутся hit-targets L/S после отрисовки (для тултипа).
     * Массив очищается в начале paint.
     */
    largeTradeHitsOut?: ClusterChartLargeTradePaintHit[];
    /** Высота строки зума, px (попиксельный vertical zoom) */
    rowHeightPx?: number;
    /** Центр цены для непрерывного якоря зума */
    centerPrice?: number | null;
    /** Цены айсбергов (sticky) */
    icebergPrices?: readonly number[];
  },
): boolean {
  const {
    width,
    height,
    columns,
    ladder,
    tick,
    baseTick: baseTickOpt,
    bucketMs,
    theme,
    colWidth = CLUSTER_CHART_COL_WIDTH,
    scrollFromEnd = 0,
    crosshair = null,
    minVolumeFilter = 0,
    tapeClusters = [],
    tapeAnim,
    tapeW: preferredTapeW = CLUSTER_CHART_TAPE_W,
    visualLevelPrices = [],
    largeTradeMarkers = [],
    largeTradeZones = [],
    largeTradeHitsOut,
    rowHeightPx,
    centerPrice = null,
    icebergPrices = [],
  } = opts;
  if (largeTradeHitsOut) largeTradeHitsOut.length = 0;
  ctx.fillStyle = theme.bg;
  ctx.fillRect(0, 0, width, height);

  const footerH = CLUSTER_CHART_FOOTER_H;
  const ladderHeight = Math.max(1, height - footerH);
  const pane = resolveClusterChartPaneLayout(width, preferredTapeW);
  const { clusterW, tapeW, axisW, tapeLeft, axisLeft } = pane;
  if (!(clusterW > 0) || !columns.length || !ladder.length || !(tick > 0)) {
    ctx.fillStyle = theme.muted;
    ctx.font = '13px ui-sans-serif, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Нет данных для кластеров', width / 2, height / 2);
    return false;
  }

  const displayTick = tick;
  const baseTick =
    baseTickOpt != null && baseTickOpt > 0 && Number.isFinite(baseTickOpt)
      ? baseTickOpt
      : displayTick;

  const colW = Math.max(1, colWidth);
  const slotCount = Math.max(1, Math.floor(clusterW / colW));
  const slotW = Math.max(1, Math.floor(clusterW / slotCount));
  const visible = sliceClusterChartVisibleColumns(columns, slotCount, scrollFromEnd);
  const drawWidth = Math.max(slotW, visible.length * slotW);
  const drawLeft = resolveClusterChartColumnsDrawLeft({
    clusterW,
    slotW,
    visibleSlotCount: slotCount,
    drawnColumnCount: visible.length,
    scrollFromEnd,
    columnCount: columns.length,
  });
  const drawnColW = visible.length > 0 ? Math.max(1, Math.floor(drawWidth / visible.length)) : slotW;

  // Фон ленты — до сетки и кластеров.
  if (tapeW > 0) {
    ctx.fillStyle = theme.bg;
    ctx.fillRect(tapeLeft, 0, tapeW, ladderHeight);
  }

  // Сетка под кластерами: до оси, даже если колонки сдвинуты влево.
  drawClusterChartPriceLabelGrid(ctx, {
    left: 0,
    right: axisLeft,
    ladderHeight,
    ladder,
    tick,
    theme,
    rowHeightPx,
    centerPrice,
  });

  // Клип: при дробном pan колонки частично заезжают за край.
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, clusterW, height);
  ctx.clip();
  const maxVolume = drawClusterColumns(ctx, {
    left: drawLeft,
    width: drawWidth,
    ladderHeight,
    footerH,
    columns: visible,
    theme,
    ladder,
    tick: displayTick,
    baseTick,
    bucketMs,
    qtyFormat: 'exact',
    minVolumeFilter,
    rowHeightPx,
    centerPrice,
    icebergPrices,
  });
  ctx.restore();

  // Визуальные уровни Alt+H — поверх кластеров/ленты, под шариками и last price.
  if (visualLevelPrices.length) {
    drawClusterChartVisualLevels(ctx, {
      width: axisLeft,
      ladderHeight,
      ladder,
      tick,
      prices: visualLevelPrices,
      theme,
      rowHeightPx,
      centerPrice,
    });
  }

  const priceToY = (price: number) =>
    resolveClusterChartPriceY(price, ladder, ladderHeight, rowHeightPx, centerPrice, tick);

  // Зоны крупнейших sizes — под L/S маркерами.
  if (largeTradeZones.length && visible.length) {
    drawClusterChartLargeTradeZones(ctx, {
      zones: largeTradeZones,
      columns: visible,
      bucketMs,
      drawLeft,
      colW: drawnColW,
      clusterW,
      ladderHeight,
      priceToY,
    });
  }

  // Разделитель только лента|цена (кластеры к ленте вплотную).
  ctx.strokeStyle = theme.grid;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(axisLeft - 0.5, 0);
  ctx.lineTo(axisLeft - 0.5, ladderHeight);
  ctx.stroke();

  // Лента: фильтр мин. объёма только для серых ячеек кластеров, не для шариков.
  let tapeAnimating = false;
  if (tapeW > 8 && tapeClusters.length) {
    tapeAnimating = drawClusterChartTapeBubbles(ctx, {
      left: tapeLeft,
      width: tapeW,
      ladderHeight,
      clusters: tapeClusters,
      ladder,
      theme,
      tapeAnim,
      rowHeightPx,
      centerPrice,
      displayTick: tick,
    });
  }

  drawClusterChartPriceAxis(ctx, {
    left: axisLeft,
    width: axisW,
    ladderHeight,
    ladder,
    theme,
    tick,
    maxVolume,
    rowHeightPx,
    centerPrice,
  });

  // Уровни Alt+H на шкале цены (как showPrice у horzline на свечном графике).
  if (visualLevelPrices.length) {
    drawClusterChartVisualLevelAxisLabels(ctx, {
      left: axisLeft,
      width: axisW,
      ladderHeight,
      ladder,
      tick,
      prices: visualLevelPrices,
      rowHeightPx,
      centerPrice,
    });
  }

  // Последняя цена: close самого нового столбика (как last на canvas-графике).
  const lastCol = columns[columns.length - 1];
  const lastPrice = lastCol?.close;
  if (lastPrice != null && Number.isFinite(lastPrice) && lastPrice > 0) {
    const up = !(lastCol.open > 0) || lastPrice >= lastCol.open;
    drawClusterChartLastPriceLine(ctx, {
      price: lastPrice,
      color: up ? theme.bid : theme.ask,
      ladder,
      ladderHeight,
      clusterW: axisLeft,
      width,
      theme,
      tick,
      rowHeightPx,
      centerPrice,
    });
  }

  // L/S поверх кластеров (после last price / ленты — выше ячеек footprint).
  if (largeTradeMarkers.length && visible.length) {
    const hits = drawClusterChartLargeTradeMarkers(ctx, {
      markers: largeTradeMarkers,
      columns: visible,
      bucketMs,
      drawLeft,
      colW: drawnColW,
      clusterW,
      ladderHeight,
      priceToY,
    });
    if (largeTradeHitsOut) {
      for (const hit of hits) largeTradeHitsOut.push(hit);
    }
  }

  if (crosshair) {
    const { x, y } = crosshair;
    let priceLabel: string | undefined;
    let timeLabel: string | undefined;

    if (y >= 0 && y < ladderHeight && ladder.length) {
      const rowLayout = resolveClusterChartRowLayout(
        ladderHeight,
        ladder,
        rowHeightPx,
        centerPrice,
        tick,
      );
      let bestIdx = 0;
      let bestDist = Number.POSITIVE_INFINITY;
      for (let i = 0; i < rowLayout.length; i++) {
        const row = rowLayout[i];
        if (!row) continue;
        const cy = row.y + row.h / 2;
        const dist = Math.abs(cy - y);
        if (dist < bestDist) {
          bestDist = dist;
          bestIdx = i;
        }
      }
      const price = ladder[bestIdx]?.price;
      if (price != null) {
        priceLabel = formatClusterChartPrice(price, countClusterChartPriceDecimals(tick));
      }
    }

    if (x >= drawLeft && x < drawLeft + drawWidth && visible.length) {
      const colIdx = Math.min(
        visible.length - 1,
        Math.max(0, Math.floor((x - drawLeft) / drawnColW)),
      );
      const col = visible[colIdx];
      if (col) {
        timeLabel = formatClusterChartColumnTime(col.bucketStartMs, bucketMs);
      }
    }

    drawClusterChartCrosshair(ctx, {
      x,
      y,
      width,
      height,
      ladderHeight,
      clusterW: axisLeft,
      theme,
      priceLabel,
      timeLabel,
    });
  }

  return tapeAnimating;
}

/**
 * Fallback-тема без DOM.
 */
export function fallbackClusterChartTheme(): ClusterChartTheme {
  return {
    bg: DEFAULT_BG,
    fg: DEFAULT_FG,
    muted: DEFAULT_MUTED,
    grid: DEFAULT_GRID,
    bid: SIDE_FALLBACK.buy,
    ask: SIDE_FALLBACK.sell,
    tapeBuyBg: SIDE_FALLBACK.buySoft,
    tapeSellBg: SIDE_FALLBACK.sellSoft,
    volumeGold: DEFAULT_VOLUME_GOLD,
    visualLevelBg: DEFAULT_VISUAL_LEVEL_BG,
    icebergBg: DEFAULT_ICEBERG_BG,
  };
}
