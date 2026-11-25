import { withAlpha } from '@/components/tw-chart-theme';
import { readCssVar } from '@/lib/css-color';

/** Цвета buy/sell для canvas. */
export interface OrderbookSideColors {
  /** Buy */
  buy: string;
  /** Sell */
  sell: string;
  /** Фон buy ~13% */
  buyBg: string;
  /** Фон sell ~13% */
  sellBg: string;
  /** Мягкая заливка buy ~40% */
  buySoft: string;
  /** Мягкая заливка sell ~40% */
  sellSoft: string;
  /** alias buySoft */
  buyStrong: string;
  /** alias sellSoft */
  sellStrong: string;
}

const FALLBACK_BUY = '#24ae64';
const FALLBACK_SELL = '#e04040';

const FALLBACK: OrderbookSideColors = {
  buy: FALLBACK_BUY,
  sell: FALLBACK_SELL,
  buyBg: withAlpha(FALLBACK_BUY, 0.13),
  sellBg: withAlpha(FALLBACK_SELL, 0.13),
  buySoft: withAlpha(FALLBACK_BUY, 0.4),
  sellSoft: withAlpha(FALLBACK_SELL, 0.4),
  buyStrong: withAlpha(FALLBACK_BUY, 0.4),
  sellStrong: withAlpha(FALLBACK_SELL, 0.4),
};

/**
 * Цвета сторон из CSS-токенов (canvas-safe rgba).
 */
export function resolveOrderbookSideColors(
  el: Element | null = null,
): OrderbookSideColors {
  const root = el ?? (typeof document !== 'undefined' ? document.documentElement : null);
  const buy = readCssVar('--success', FALLBACK.buy, root);
  const sell = readCssVar('--destructive', FALLBACK.sell, root);
  const buySoft = canvasSafeSoft(buy, 0.4, FALLBACK.buySoft);
  const sellSoft = canvasSafeSoft(sell, 0.4, FALLBACK.sellSoft);
  return {
    buy,
    sell,
    buyBg: canvasSafeSoft(buy, 0.13, FALLBACK.buyBg),
    sellBg: canvasSafeSoft(sell, 0.13, FALLBACK.sellBg),
    buySoft,
    sellSoft,
    buyStrong: buySoft,
    sellStrong: sellSoft,
  };
}

/**
 * rgba для canvas.
 */
function canvasSafeSoft(solid: string, alpha: number, fallback: string): string {
  const mixed = withAlpha(solid, alpha);
  if (mixed.startsWith('rgba(') || mixed.startsWith('rgb(')) {
    return mixed;
  }
  return fallback;
}
