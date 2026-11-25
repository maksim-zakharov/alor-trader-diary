import React, { useMemo, useState } from 'react';
import type { AlorApi } from 'alor-api';
import { useAppSelector } from '@/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { TW_CHART_THEME_COLORS } from '@/components/tw-chart-theme';
import { TWChart } from '@/common/TWChart';
import { CandleCanvas } from './canvas/CandleCanvas';
import { ClusterChartCanvas } from './cluster/ClusterChartCanvas';
import { useClusterChartLiveSession } from './cluster/useClusterChartLiveSession';

/** Режим отображения графика. */
export type ChartsPageMode = 'tradingview' | 'canvas' | 'cluster';

const MODE_OPTIONS: { value: ChartsPageMode; label: string }[] = [
  { value: 'tradingview', label: 'TradingView' },
  { value: 'canvas', label: 'Канвас' },
  { value: 'cluster', label: 'Кластер' },
];

const DEFAULT_SYMBOL = 'CNYRUB_TOM';

/**
 * Страница «Графики»: live TV / canvas / cluster в стиле smartmoney-client.
 */
export const ChartsPage: React.FC = () => {
  const api = useAppSelector((s) => s.alorSlice.api) as AlorApi | undefined;
  const [symbolInput, setSymbolInput] = useState(DEFAULT_SYMBOL);
  const [symbol, setSymbol] = useState(DEFAULT_SYMBOL);
  const [mode, setMode] = useState<ChartsPageMode>(() => {
    try {
      const raw = localStorage.getItem('charts-page-mode');
      if (raw === 'tradingview' || raw === 'canvas' || raw === 'cluster') return raw;
    } catch {
      // ignore
    }
    return 'tradingview';
  });

  const cluster = useClusterChartLiveSession({
    symbol: mode === 'cluster' ? symbol : '',
    api,
  });

  const applySymbol = () => {
    const next = symbolInput.trim().toUpperCase();
    if (!next) return;
    setSymbol(next);
  };

  const onModeChange = (next: ChartsPageMode) => {
    setMode(next);
    try {
      localStorage.setItem('charts-page-mode', next);
    } catch {
      // ignore
    }
  };

  const chartBody = useMemo(() => {
    const frameClass = 'relative min-h-0 w-full flex-1 overflow-hidden';
    const frameStyle = { background: TW_CHART_THEME_COLORS.background };

    if (mode === 'tradingview') {
      return (
        <div className={frameClass} style={frameStyle}>
          <TWChart ticker={symbol} />
        </div>
      );
    }
    if (mode === 'canvas') {
      return (
        <div className={frameClass} style={frameStyle}>
          <CandleCanvas symbol={symbol} className="h-full" />
        </div>
      );
    }
    return (
      <div className={frameClass} style={frameStyle}>
        {cluster.error ? (
          <div className="absolute left-2 top-10 z-20 text-xs text-destructive">{cluster.error}</div>
        ) : null}
        {cluster.loading ? (
          <div className="absolute left-2 top-10 z-20 text-xs text-muted-foreground">Загрузка…</div>
        ) : null}
        <ClusterChartCanvas
          className="h-full w-full"
          columns={cluster.columns}
          tick={cluster.tick}
          bucketMs={cluster.bucketMs}
          onBucketMsChange={cluster.onBucketMsChange}
          centerPrice={cluster.centerPrice}
          scrollFromEnd={cluster.scrollFromEnd}
          colWidth={cluster.colWidth}
          priceRowH={cluster.priceRowH}
          minVolumeFilter={cluster.minVolumeFilter}
          minVolumeFilterInput={cluster.minVolumeFilterInput}
          onMinVolumeFilterInputChange={cluster.setMinVolumeFilterInput}
          tapeClusters={cluster.tapeClusters}
          tapeW={cluster.tapeW}
          tapeEnabled={cluster.tapeEnabled}
          onTapeEnabledChange={cluster.onTapeEnabledChange}
          onTapeWChange={cluster.onTapeWChange}
          onCenterPriceChange={cluster.setCenterPrice}
          onScrollFromEndChange={cluster.setScrollFromEnd}
          onColWidthChange={cluster.setColWidth}
          onPriceRowHChange={cluster.setPriceRowH}
          onVisibleWindowChange={cluster.onVisibleWindowChange}
        />
      </div>
    );
  }, [mode, symbol, cluster]);

  return (
    <div className="flex h-[calc(100dvh-3rem-env(safe-area-inset-top))] w-full flex-col overflow-hidden">
      <div className="flex shrink-0 flex-wrap items-center gap-2 px-2 py-1">
        <h1 className="mr-1 text-sm font-medium text-foreground">Графики</h1>
        <Input
          className="h-7 w-36"
          value={symbolInput}
          onChange={(e) => setSymbolInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') applySymbol();
          }}
          placeholder="Тикер"
        />
        <Button type="button" size="xs" variant="secondary" onClick={applySymbol}>
          Применить
        </Button>
        <div className="ml-auto flex items-center">
          {MODE_OPTIONS.map((option) => (
            <Button
              key={option.value}
              type="button"
              size="xs"
              variant="ghost"
              className={cn(
                'h-auto min-w-0 gap-0 rounded-none p-2 text-[11px] font-medium leading-none text-bds-gray-t2 hover:text-bds-static-white',
                mode === option.value && 'text-bds-brand-700-normal hover:text-bds-brand-700-normal',
              )}
              aria-pressed={mode === option.value}
              onClick={() => onModeChange(option.value)}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>
      {chartBody}
    </div>
  );
};

export default ChartsPage;
