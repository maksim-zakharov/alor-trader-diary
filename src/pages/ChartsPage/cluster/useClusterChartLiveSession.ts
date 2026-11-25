import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Exchange, type AlorApi } from 'alor-api';
import { mergeScalpingOrderbookTradeClusters } from '@/Scalping/scalping-orderbook-draw';
import type { ScalpingOrderbookTradeCluster } from '@/Scalping/scalping-orderbook-types';
import {
  buildClusterChartColumns,
  CLUSTER_CHART_BUCKET_MS,
  CLUSTER_CHART_COL_WIDTH,
  normalizeClusterChartBucketMs,
  type ClusterChartColumn,
} from './cluster-chart-build';
import {
  clampClusterChartTapeW,
  CLUSTER_CHART_MIN_ROW_H,
  CLUSTER_CHART_TAPE_W,
  inferClusterChartTick,
} from './cluster-chart-draw';
import type { ClusterChartTrade } from './cluster-chart-types';
import {
  mapAlorAlltradeToClusterChartTrade,
  mergeClusterChartCoverage,
  mergeClusterChartTrades,
  resolveClusterChartCoverageGaps,
  resolveClusterChartFetchChunkMs,
  resolveClusterChartTodayNeededWindow,
  resolveMoscowDayStartMs,
  splitClusterChartCoverageNewestFirst,
  type ClusterChartLoadedCoverage,
} from './cluster-chart-today';
import {
  readClusterChartMinVolumeFilterForSymbol,
  writeClusterChartMinVolumeFilterForSymbol,
} from './cluster-chart-min-volume-filter';
import { fetchAlorAlltrades } from './alor-alltrades';

/** Сколько столбиков держим в памяти. */
const CLUSTER_CHART_MAX_COLUMNS = 2_000;

/** localStorage: ширина ленты. */
const CLUSTER_CHART_TAPE_W_KEY = 'cluster-chart-tape-w';

/** localStorage: лента вкл. */
const CLUSTER_CHART_TAPE_ENABLED_KEY = 'cluster-chart-tape-enabled';

/**
 * Читает ширину ленты.
 */
function readClusterChartTapeW(): number {
  try {
    const raw = localStorage.getItem(CLUSTER_CHART_TAPE_W_KEY);
    if (raw == null) return CLUSTER_CHART_TAPE_W;
    const n = Number(raw);
    return Number.isFinite(n) ? clampClusterChartTapeW(n, 2000) : CLUSTER_CHART_TAPE_W;
  } catch {
    return CLUSTER_CHART_TAPE_W;
  }
}

/**
 * Читает флаг ленты.
 */
function readClusterChartTapeEnabled(): boolean {
  try {
    const raw = localStorage.getItem(CLUSTER_CHART_TAPE_ENABLED_KEY);
    if (raw == null) return true;
    return raw !== '0' && raw !== 'false';
  } catch {
    return true;
  }
}

export interface UseClusterChartLiveSessionParams {
  /** Тикер MOEX */
  symbol: string;
  /** Клиент Alor */
  api: AlorApi | null | undefined;
}

/**
 * Live-сессия кластерного графика: REST alltrades + WS subscriptions.alltrades.
 */
export function useClusterChartLiveSession(params: UseClusterChartLiveSessionParams) {
  const { symbol, api } = params;

  const [bucketMs, setBucketMs] = useState(() =>
    normalizeClusterChartBucketMs(CLUSTER_CHART_BUCKET_MS),
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [trades, setTrades] = useState<ClusterChartTrade[]>([]);
  const [priceTick, setPriceTick] = useState<number | null>(null);
  const [centerPrice, setCenterPrice] = useState<number | null>(null);
  const [scrollFromEnd, setScrollFromEnd] = useState(0);
  const [colWidth, setColWidth] = useState(CLUSTER_CHART_COL_WIDTH);
  const [priceRowH, setPriceRowH] = useState(CLUSTER_CHART_MIN_ROW_H);
  const [minVolumeFilterInput, setMinVolumeFilterInput] = useState(() =>
    readClusterChartMinVolumeFilterForSymbol(symbol),
  );
  const minVolumeFilter = useMemo(() => {
    const n = Number(minVolumeFilterInput.replace(',', '.'));
    return Number.isFinite(n) && n > 0 ? n : 0;
  }, [minVolumeFilterInput]);
  const [visibleColumnCount, setVisibleColumnCount] = useState(24);
  const [tapeClusters, setTapeClusters] = useState<ScalpingOrderbookTradeCluster[]>([]);
  const [tapeW, setTapeW] = useState(readClusterChartTapeW);
  const [tapeEnabled, setTapeEnabled] = useState(readClusterChartTapeEnabled);

  const abortRef = useRef<AbortController | null>(null);
  const loadGenRef = useRef(0);
  const coverageRef = useRef<ClusterChartLoadedCoverage | null>(null);
  const todayFetchInFlightRef = useRef(false);
  const todayQueueRef = useRef(false);
  const todaySeedReadyRef = useRef(false);
  const wsBufferRef = useRef<ClusterChartTrade[]>([]);
  const wsFlushRafRef = useRef<number | null>(null);

  useEffect(() => {
    setMinVolumeFilterInput(readClusterChartMinVolumeFilterForSymbol(symbol));
  }, [symbol]);

  const onMinVolumeFilterInputChange = useCallback(
    (value: string) => {
      setMinVolumeFilterInput(value);
      writeClusterChartMinVolumeFilterForSymbol(symbol, value);
    },
    [symbol],
  );

  useEffect(() => {
    try {
      localStorage.setItem(CLUSTER_CHART_TAPE_W_KEY, String(tapeW));
    } catch {
      // ignore
    }
  }, [tapeW]);

  useEffect(() => {
    try {
      localStorage.setItem(CLUSTER_CHART_TAPE_ENABLED_KEY, tapeEnabled ? '1' : '0');
    } catch {
      // ignore
    }
  }, [tapeEnabled]);

  const onTapeWChange = useCallback((next: number) => {
    setTapeW(clampClusterChartTapeW(next, 2000));
  }, []);

  const onTapeEnabledChange = useCallback((enabled: boolean) => {
    setTapeEnabled(enabled);
  }, []);

  const effectiveTapeW = tapeEnabled ? tapeW : 0;

  useEffect(() => {
    if (!api || !symbol) {
      setPriceTick(null);
      return;
    }
    let cancelled = false;
    api.instruments
      .getSecurityByExchangeAndSymbol({
        symbol,
        exchange: Exchange.MOEX,
        format: 'Simple',
      })
      .then((sec) => {
        if (cancelled) return;
        const minstep = Number((sec as { minstep?: number })?.minstep);
        setPriceTick(Number.isFinite(minstep) && minstep > 0 ? minstep : null);
      })
      .catch(() => {
        if (!cancelled) setPriceTick(null);
      });
    return () => {
      cancelled = true;
    };
  }, [api, symbol]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const tick = useMemo(() => {
    if (priceTick != null && priceTick > 0) return priceTick;
    if (!trades.length) return 1;
    return inferClusterChartTick(trades.map((t) => t.price));
  }, [priceTick, trades]);

  const columns: ClusterChartColumn[] = useMemo(() => {
    if (!trades.length || !(tick > 0)) return [];
    return buildClusterChartColumns(trades, {
      tick,
      bucketMs,
      maxColumns: CLUSTER_CHART_MAX_COLUMNS,
    });
  }, [trades, tick, bucketMs]);

  const columnsRef = useRef(columns);
  columnsRef.current = columns;

  const resetSession = useCallback(() => {
    abortRef.current?.abort();
    loadGenRef.current += 1;
    coverageRef.current = null;
    todayFetchInFlightRef.current = false;
    todayQueueRef.current = false;
    todaySeedReadyRef.current = false;
    wsBufferRef.current = [];
    if (wsFlushRafRef.current != null) {
      cancelAnimationFrame(wsFlushRafRef.current);
      wsFlushRafRef.current = null;
    }
    setTrades([]);
    setScrollFromEnd(0);
    setCenterPrice(null);
    setError(null);
    setTapeClusters([]);
  }, []);

  const flushWsBuffer = useCallback(() => {
    wsFlushRafRef.current = null;
    const batch = wsBufferRef.current;
    if (!batch.length) return;
    wsBufferRef.current = [];
    setTrades((prev) => mergeClusterChartTrades(prev, batch));
    setTapeClusters((prev) => mergeScalpingOrderbookTradeClusters(prev, batch));
    const coverage = coverageRef.current;
    if (coverage) {
      let toMs = coverage.toMs;
      for (const trade of batch) {
        if (trade.timeMs > toMs) toMs = trade.timeMs;
      }
      coverageRef.current = mergeClusterChartCoverage(coverage, {
        fromMs: coverage.fromMs,
        toMs,
      });
    }
    const last = batch[batch.length - 1];
    if (last) {
      setCenterPrice((prev) => (prev != null && prev > 0 ? prev : last.price));
    }
  }, []);

  const enqueueWsTrade = useCallback(
    (trade: ClusterChartTrade) => {
      wsBufferRef.current.push(trade);
      if (wsFlushRafRef.current != null) return;
      wsFlushRafRef.current = requestAnimationFrame(() => {
        flushWsBuffer();
      });
    },
    [flushWsBuffer],
  );

  const ensureTodayCoverage = useCallback(async () => {
    if (!symbol) return;
    if (!api) {
      setError('Нет подключения к Alor');
      return;
    }
    if (todayFetchInFlightRef.current) {
      todayQueueRef.current = true;
      return;
    }

    const nowMs = Date.now();
    const dayStartMs = resolveMoscowDayStartMs(nowMs);
    const needed = resolveClusterChartTodayNeededWindow({
      columns: columnsRef.current,
      scrollFromEnd,
      visibleColumnCount,
      bucketMs,
      nowMs,
      dayStartMs,
    });
    const gaps = resolveClusterChartCoverageGaps(needed, coverageRef.current);
    if (!gaps.length) {
      if (!todaySeedReadyRef.current) {
        todaySeedReadyRef.current = true;
        if (wsBufferRef.current.length) flushWsBuffer();
      }
      return;
    }

    todayFetchInFlightRef.current = true;
    const ac = new AbortController();
    abortRef.current?.abort();
    abortRef.current = ac;
    const gen = loadGenRef.current;
    setLoading(true);
    setError(null);

    try {
      let centerSeeded = false;
      const fetchChunkMs = resolveClusterChartFetchChunkMs(bucketMs);
      for (const gap of gaps) {
        const chunks = splitClusterChartCoverageNewestFirst(gap, fetchChunkMs);
        for (const chunk of chunks) {
          if (ac.signal.aborted || loadGenRef.current !== gen) return;
          const raw = await fetchAlorAlltrades(api, symbol, {
            fromSec: Math.floor(chunk.fromMs / 1000),
            toSec: Math.ceil(chunk.toMs / 1000),
            signal: ac.signal,
          });
          if (ac.signal.aborted || loadGenRef.current !== gen) return;
          const mapped: ClusterChartTrade[] = [];
          for (const item of raw) {
            const trade = mapAlorAlltradeToClusterChartTrade(item);
            if (trade) mapped.push(trade);
          }
          setTrades((prev) => mergeClusterChartTrades(prev, mapped));
          setTapeClusters((prev) => mergeScalpingOrderbookTradeClusters(prev, mapped));
          coverageRef.current = mergeClusterChartCoverage(coverageRef.current, chunk);
          if (!centerSeeded && mapped.length) {
            centerSeeded = true;
            const last = mapped.reduce((a, b) => (a.timeMs >= b.timeMs ? a : b));
            setCenterPrice((prev) => (prev != null && prev > 0 ? prev : last.price));
          }
          if (!todaySeedReadyRef.current) {
            todaySeedReadyRef.current = true;
            if (wsBufferRef.current.length) flushWsBuffer();
          }
        }
      }
    } catch (err) {
      if (ac.signal.aborted) return;
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      todayFetchInFlightRef.current = false;
      if (loadGenRef.current === gen) {
        setLoading(false);
        if (!todaySeedReadyRef.current) {
          todaySeedReadyRef.current = true;
          if (wsBufferRef.current.length) flushWsBuffer();
        }
      }
      if (todayQueueRef.current) {
        todayQueueRef.current = false;
        void ensureTodayCoverage();
      }
    }
  }, [symbol, api, scrollFromEnd, visibleColumnCount, bucketMs, flushWsBuffer]);

  useEffect(() => {
    resetSession();
  }, [symbol]); // eslint-disable-line react-hooks/exhaustive-deps -- сброс только при смене тикера

  useEffect(() => {
    void ensureTodayCoverage();
  }, [ensureTodayCoverage]);

  const bucketMsRef = useRef(bucketMs);
  bucketMsRef.current = bucketMs;

  useEffect(() => {
    if (!symbol || !api) return;
    let unsubscribe: (() => void) | undefined;
    let cancelled = false;
    void api.subscriptions
      .alltrades(
        {
          exchange: Exchange.MOEX,
          depth: 1000,
          // @ts-expect-error code есть в Alor opcode
          code: symbol,
        },
        (data) => {
          const trade = mapAlorAlltradeToClusterChartTrade(data as never);
          if (!trade) return;
          const coverage = coverageRef.current;
          const padMs = bucketMsRef.current;
          if (coverage && trade.timeMs < coverage.fromMs - padMs) return;
          if (!todaySeedReadyRef.current) {
            wsBufferRef.current.push(trade);
            return;
          }
          enqueueWsTrade(trade);
        },
      )
      .then((unsub) => {
        if (cancelled) {
          unsub?.();
          return;
        }
        unsubscribe = unsub;
      })
      .catch((err) => {
        console.warn('Кластер-график: ошибка подписки alltrades', err);
      });
    return () => {
      cancelled = true;
      unsubscribe?.();
      if (wsFlushRafRef.current != null) {
        cancelAnimationFrame(wsFlushRafRef.current);
        wsFlushRafRef.current = null;
      }
    };
  }, [symbol, api, enqueueWsTrade]);

  const onVisibleWindowChange = useCallback(
    (info: { visibleColumnCount: number; fromMs: number | null; toMs: number | null }) => {
      setVisibleColumnCount(info.visibleColumnCount);
    },
    [],
  );

  useEffect(() => {
    if (centerPrice != null && centerPrice > 0) return;
    if (!columns.length) return;
    const last = columns[columns.length - 1];
    setCenterPrice(last?.close ?? last?.open ?? null);
  }, [columns, centerPrice]);

  const onBucketMsChange = useCallback((next: number) => {
    setBucketMs(normalizeClusterChartBucketMs(next));
  }, []);

  return {
    bucketMs,
    onBucketMsChange,
    loading,
    error,
    columns,
    tick,
    centerPrice,
    setCenterPrice,
    scrollFromEnd,
    setScrollFromEnd,
    colWidth,
    setColWidth,
    priceRowH,
    setPriceRowH,
    minVolumeFilter,
    minVolumeFilterInput,
    setMinVolumeFilterInput: onMinVolumeFilterInputChange,
    tapeClusters,
    tapeW: effectiveTapeW,
    onTapeWChange,
    tapeEnabled,
    onTapeEnabledChange,
    onVisibleWindowChange,
  };
}
