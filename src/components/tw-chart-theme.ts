import type {
  ChartPropertiesOverrides,
  StudyOverrides,
} from '@/assets/charting_library';
import { readCssVar } from '@/lib/css-color';

/**
 * Тема TradingView / canvas в палитре smartmoney-client.
 */

/** Цвета темы графика. */
export interface TwChartThemeColors {
  /** Фон панели графика */
  background: string;
  /** Подписи шкал */
  scaleText: string;
  /** Линии сетки */
  grid: string;
  /** Разделители панелей */
  separator: string;
  /** Перекрестие */
  crosshair: string;
  /** Акцент */
  primary: string;
  /** Рост */
  success: string;
  /** Падение */
  destructive: string;
}

/** Fallback-палитра (1:1 smartmoney-client). */
export const TW_CHART_THEME_COLORS: TwChartThemeColors = {
  background: 'rgb(16, 16, 20)',
  scaleText: 'rgb(139, 139, 142)',
  grid: 'rgb(32, 33, 36)',
  separator: 'rgb(48, 48, 48)',
  crosshair: 'rgb(152, 152, 152)',
  primary: '#ff9c2e',
  success: '#24ae64',
  destructive: '#e04040',
};

/** CSS UI библиотеки относительно library_path. */
export const TW_CHART_CUSTOM_CSS_URL = 'tw-chart-theme.css';

/**
 * Переводит цвет `rgb(...)`/`#rrggbb` в `rgba(..., alpha)`.
 */
export function withAlpha(color: string, alpha: number): string {
  const rgbComma = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/.exec(color);
  if (rgbComma) {
    return `rgba(${rgbComma[1]}, ${rgbComma[2]}, ${rgbComma[3]}, ${alpha})`;
  }
  const rgbSpace = /^rgba?\(\s*(\d+)\s+(\d+)\s+(\d+)/.exec(color);
  if (rgbSpace) {
    return `rgba(${rgbSpace[1]}, ${rgbSpace[2]}, ${rgbSpace[3]}, ${alpha})`;
  }
  const hexMatch = /^#([0-9a-f]{6})$/i.exec(color);
  if (hexMatch) {
    const hex = hexMatch[1];
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  return color;
}

/**
 * Палитра графика из CSS.
 */
export function resolveTwChartThemeColors(
  base: TwChartThemeColors = TW_CHART_THEME_COLORS,
): TwChartThemeColors {
  return {
    ...base,
    primary: readCssVar('--primary', base.primary),
    success: readCssVar('--success', base.success),
    destructive: readCssVar('--destructive', base.destructive),
  };
}

/**
 * Overrides свойств графика — 1:1 smartmoney-client.
 */
export function getTwChartOverrides(
  colors: TwChartThemeColors = TW_CHART_THEME_COLORS,
): Partial<ChartPropertiesOverrides> {
  return {
    'paneProperties.backgroundType': 'solid',
    'paneProperties.background': colors.background,
    'paneProperties.backgroundGradientStartColor': colors.background,
    'paneProperties.backgroundGradientEndColor': colors.background,
    'paneProperties.vertGridProperties.color': colors.grid,
    'paneProperties.horzGridProperties.color': colors.grid,
    'paneProperties.crossHairProperties.color': colors.crosshair,
    'paneProperties.separatorColor': colors.separator,
    'scalesProperties.textColor': colors.scaleText,
    'scalesProperties.lineColor': colors.separator,
    'scalesProperties.axisHighlightColor': withAlpha(colors.primary, 0.25),
    'scalesProperties.axisLineToolLabelBackgroundColorCommon': colors.primary,
    'scalesProperties.axisLineToolLabelBackgroundColorActive': colors.primary,
    'mainSeriesProperties.candleStyle.upColor': colors.success,
    'mainSeriesProperties.candleStyle.downColor': colors.destructive,
    'mainSeriesProperties.candleStyle.borderUpColor': colors.success,
    'mainSeriesProperties.candleStyle.borderDownColor': colors.destructive,
    'mainSeriesProperties.candleStyle.wickUpColor': colors.success,
    'mainSeriesProperties.candleStyle.wickDownColor': colors.destructive,
    'mainSeriesProperties.hollowCandleStyle.upColor': colors.success,
    'mainSeriesProperties.hollowCandleStyle.downColor': colors.destructive,
    'mainSeriesProperties.hollowCandleStyle.borderUpColor': colors.success,
    'mainSeriesProperties.hollowCandleStyle.borderDownColor': colors.destructive,
    'mainSeriesProperties.hollowCandleStyle.wickUpColor': colors.success,
    'mainSeriesProperties.hollowCandleStyle.wickDownColor': colors.destructive,
    'mainSeriesProperties.barStyle.upColor': colors.success,
    'mainSeriesProperties.barStyle.downColor': colors.destructive,
    'mainSeriesProperties.lineStyle.color': colors.primary,
    'mainSeriesProperties.lineWithMarkersStyle.color': colors.primary,
    'mainSeriesProperties.steplineStyle.color': colors.primary,
    'mainSeriesProperties.areaStyle.linecolor': colors.primary,
    'mainSeriesProperties.areaStyle.color1': withAlpha(colors.primary, 0.28),
    'mainSeriesProperties.areaStyle.color2': withAlpha(colors.primary, 0.02),
    'mainSeriesProperties.hiloStyle.color': colors.primary,
    'mainSeriesProperties.hiloStyle.borderColor': colors.primary,
    'mainSeriesProperties.hiloStyle.labelColor': colors.primary,
    'mainSeriesProperties.baselineStyle.topLineColor': colors.success,
    'mainSeriesProperties.baselineStyle.bottomLineColor': colors.destructive,
    'mainSeriesProperties.baselineStyle.topFillColor1': withAlpha(colors.success, 0.28),
    'mainSeriesProperties.baselineStyle.topFillColor2': withAlpha(colors.success, 0.05),
    'mainSeriesProperties.baselineStyle.bottomFillColor1': withAlpha(colors.destructive, 0.05),
    'mainSeriesProperties.baselineStyle.bottomFillColor2': withAlpha(colors.destructive, 0.28),
  };
}

/**
 * Hex для studies_overrides (TT принимает только `#RRGGBB`, не rgba).
 */
export function toTwChartHex(color: string, fallback: string): string {
  const hex = /^#([0-9a-f]{6})$/i.exec(color.trim());
  if (hex) return `#${hex[1].toLowerCase()}`;
  const rgb = /^rgba?\(\s*(\d+)\s*[, ]\s*(\d+)\s*[, ]\s*(\d+)/i.exec(color);
  if (rgb) {
    const r = Number(rgb[1]).toString(16).padStart(2, '0');
    const g = Number(rgb[2]).toString(16).padStart(2, '0');
    const b = Number(rgb[3]).toString(16).padStart(2, '0');
    return `#${r}${g}${b}`;
  }
  return fallback;
}

/**
 * Overrides Volume — как smartmoney-client / ScreenerCanvas (down/up).
 * TT: только `#RRGGBB` + transparency [0..100], где 100 = непрозрачный.
 */
export function getTwChartStudiesOverrides(
  colors: TwChartThemeColors = TW_CHART_THEME_COLORS,
): Partial<StudyOverrides> {
  const down = toTwChartHex(colors.destructive, '#e04040');
  const up = toTwChartHex(colors.success, '#24ae64');
  const overrides: Record<string, string | number | boolean> = {
    /** down */
    'volume.volume.color.0': down,
    'volume.volume.color': down,
    /** up */
    'volume.volume.color.1': up,
    /** ~0.4 alpha → opacity 40 */
    'volume.volume.transparency': 40,
  };
  return overrides as Partial<StudyOverrides>;
}

/** Цвета объёма canvas/cluster — 1:1 ScreenerCanvas smartmoney-client. */
export const TW_CHART_VOLUME_UP = 'rgba(32, 178, 108, 0.35)';
/** Цвет объёма down. */
export const TW_CHART_VOLUME_DOWN = 'rgba(239, 69, 74, 0.35)';
