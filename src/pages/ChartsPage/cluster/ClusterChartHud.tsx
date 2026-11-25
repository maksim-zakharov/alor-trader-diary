import React, { useMemo } from 'react';
import { ChartEmbedTfToolbar } from '@/components/ChartEmbedTfToolbar';
import {
  CLUSTER_CHART_TF_OPTIONS,
  type ClusterChartColumn,
} from './cluster-chart-build';
import {
  countClusterChartPriceDecimals,
  formatClusterChartPrice,
  formatClusterChartQtyExact,
} from './cluster-chart-draw';

export interface ClusterChartHudProps {
  /** Текущий ТФ, мс */
  bucketMs: number;
  /** Смена ТФ */
  onBucketMsChange: (bucketMs: number) => void;
  /** Колонка для OHLCV */
  column: ClusterChartColumn | null;
  /** Шаг цены */
  tick: number;
  /** disabled */
  disabled?: boolean;
  /** Строка фильтра мин. объёма */
  minVolumeFilterInput: string;
  /** Смена фильтра */
  onMinVolumeFilterInputChange?: (value: string) => void;
  /** Крупные доступны */
  largeTradesAvailable?: boolean;
  /** Крупные вкл */
  largeTradesEnabled?: boolean;
  /** Смена крупных */
  onLargeTradesEnabledChange?: (enabled: boolean) => void;
  /** Лента вкл */
  tapeEnabled?: boolean;
  /** Смена ленты */
  onTapeEnabledChange?: (enabled: boolean) => void;
  /** Айсберги */
  icesEnabled?: boolean;
  /** Смена айсбергов */
  onIcesEnabledChange?: (enabled: boolean) => void;
}

/**
 * HUD кластерного графика — стиль smartmoney-client.
 */
export const ClusterChartHud: React.FC<ClusterChartHudProps> = ({
  bucketMs,
  onBucketMsChange,
  column,
  tick,
  disabled = false,
}) => {
  const tfOptions = useMemo(
    () =>
      CLUSTER_CHART_TF_OPTIONS.map((option) => ({
        value: String(option.bucketMs),
        label: option.label,
      })),
    [],
  );

  const decimals = Math.max(0, countClusterChartPriceDecimals(tick > 0 ? tick : 1));
  const up = column != null && !(column.open > 0 && column.close < column.open);
  const accentClass = up ? 'text-bds-green-700-normal' : 'text-destructive';
  const volume = column != null ? column.totalBuy + column.totalSell : 0;
  const change =
    column != null && column.open > 0 ? column.close - column.open : null;

  return (
    <div
      className="pointer-events-none absolute left-0 top-0 z-10 flex max-w-[min(100%,480px)] flex-col gap-1.5"
      data-slot="cluster-chart-hud"
    >
      <div className="pointer-events-auto flex flex-wrap items-center gap-2">
        <ChartEmbedTfToolbar
          options={tfOptions}
          value={String(bucketMs)}
          disabled={disabled}
          aria-label="Таймфрейм кластеров"
          onChange={(value) => {
            const next = Number(value);
            if (Number.isFinite(next) && next > 0) onBucketMsChange(next);
          }}
        />
      </div>

      {column ? (
        <div className="pointer-events-none flex flex-wrap items-baseline gap-x-2 gap-y-0.5 rounded bg-background/75 px-1.5 py-1 text-[11px] leading-tight tabular-nums backdrop-blur-[2px]">
          <span className="text-muted-foreground">
            O{' '}
            <span className="text-foreground">
              {formatClusterChartPrice(column.open, decimals)}
            </span>
          </span>
          <span className="text-muted-foreground">
            H{' '}
            <span className="text-foreground">
              {formatClusterChartPrice(column.high, decimals)}
            </span>
          </span>
          <span className="text-muted-foreground">
            L{' '}
            <span className="text-foreground">
              {formatClusterChartPrice(column.low, decimals)}
            </span>
          </span>
          <span className="text-muted-foreground">
            C{' '}
            <span className={accentClass}>
              {formatClusterChartPrice(column.close, decimals)}
            </span>
          </span>
          {change != null ? (
            <span className={accentClass}>
              {change >= 0 ? '+' : ''}
              {formatClusterChartPrice(change, decimals)}
            </span>
          ) : null}
          <span className="text-muted-foreground">
            V{' '}
            <span className="text-foreground">
              {formatClusterChartQtyExact(volume)}
            </span>
          </span>
        </div>
      ) : null}
    </div>
  );
};
