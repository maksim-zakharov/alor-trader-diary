/**
 * Общий chrome канвас-графика: crosshair, last-price (без свечей/кластеров).
 */

/** Опции пунктирной линии last price. */
export interface CanvasChartLastPriceLineDrawOptions {
  /** Цена */
  price: number;
  /** Цвет линии и фона метки */
  color: string;
  /** Y линии */
  y: number;
  /** Левый край плота */
  plotLeft: number;
  /** Ширина плота */
  plotW: number;
  /** Ширина метки на оси (обычно = priceAxisWidth) */
  labelWidth: number;
  /** Текст метки */
  label: string;
  /** Верх панели цены (кламп метки) */
  priceTop: number;
  /** Низ панели цены */
  priceBottom: number;
  /** Отступ текста в метке слева */
  labelPadLeft?: number;
  /** Сдвиг метки по Y */
  labelOffsetY?: number;
}

/** Опции crosshair. */
export interface CanvasChartCrosshairDrawOptions {
  /** X */
  x: number;
  /** Y */
  y: number;
  /** Цвет */
  color: string;
  /** Клип: лево */
  left: number;
  /** Клип: верх */
  top: number;
  /** Клип: право */
  right: number;
  /** Клип: низ */
  bottom: number;
}

/**
 * Пунктир last price + прямоугольная метка на правой оси.
 */
export function drawCanvasChartLastPriceLine(
  ctx: CanvasRenderingContext2D,
  options: CanvasChartLastPriceLineDrawOptions,
): void {
  const {
    price,
    color,
    y,
    plotLeft,
    plotW,
    labelWidth,
    label,
    priceTop,
    priceBottom,
    labelPadLeft = 8,
    labelOffsetY = 0,
  } = options;
  if (!Number.isFinite(price) || !Number.isFinite(y)) return;

  const yLine = Math.min(priceBottom, Math.max(priceTop, y));

  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 3]);
  ctx.beginPath();
  ctx.moveTo(plotLeft, yLine);
  ctx.lineTo(plotLeft + plotW, yLine);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.font = '10px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  const labelH = 14;
  const labelW = Math.max(1, labelWidth);
  const labelX = plotLeft + plotW;
  const rawLabelY = yLine + labelOffsetY;
  const labelY = Math.min(
    priceBottom - labelH / 2,
    Math.max(priceTop + labelH / 2, rawLabelY),
  );
  ctx.fillStyle = color;
  ctx.fillRect(labelX, labelY - labelH / 2, labelW, labelH);
  ctx.fillStyle = '#ffffff';
  ctx.fillText(label, labelX + labelPadLeft, labelY);
  ctx.restore();
}

/**
 * Крест курсора в клипе плота.
 */
export function drawCanvasChartCrosshair(
  ctx: CanvasRenderingContext2D,
  options: CanvasChartCrosshairDrawOptions,
): void {
  const { x, y, color, left, top, right, bottom } = options;
  if (!(x >= left && x <= right && y >= top && y <= bottom)) return;

  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 3]);
  ctx.beginPath();
  ctx.moveTo(x, top);
  ctx.lineTo(x, bottom);
  ctx.moveTo(left, y);
  ctx.lineTo(right, y);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}
