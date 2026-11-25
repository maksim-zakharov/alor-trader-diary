import type { RefObject } from 'react';

/** Состояние pinned tooltip (заглушка). */
export interface ChartPinnedMarkTooltipState {
  /** Текст */
  text: string;
  /** x */
  x: number;
  /** y */
  y: number;
}

/**
 * Тултип маркеров — в diary без TV-оверлеев.
 */
export function formatGroupedAlgoMarksTooltip(): string {
  return '';
}

/**
 * Пустой компонент pinned tooltip.
 */
export function ChartPinnedMarkTooltip(_props: {
  state?: ChartPinnedMarkTooltipState;
  rootWidth?: number;
  rootHeight?: number;
  elRef?: RefObject<HTMLElement | null>;
}): null {
  return null;
}
