import React, { useEffect, useRef, useState } from 'react';
import { Exchange, Format, type AlorApi } from 'alor-api';
import { firstValueFrom } from 'rxjs';
import { useAppSelector } from '@/store';
import { cn } from '@/lib/utils';
import {
  CanvasChartHost,
  drawCanvasChartCrosshair,
  drawCanvasChartLastPriceLine,
  nextCanvasChartPanOffset,
  resolveCanvasChartDpr,
} from '@/canvas-chart';
import { ChartEmbedTfToolbar } from '@/components/ChartEmbedTfToolbar';
import {
  resolveTwChartThemeColors,
  TW_CHART_THEME_COLORS,
  TW_CHART_VOLUME_DOWN,
  TW_CHART_VOLUME_UP,
} from '@/components/tw-chart-theme';
import type { DataService } from '@/api/data.service';
import type { ResolutionString } from '@/assets/charting_library';
import { fetchAlorAlltrades } from '../cluster/alor-alltrades';
import { mapAlorAlltradeToClusterChartTrade } from '../cluster/cluster-chart-today';
import {
  applyTradeToCandleBars,
  buildCandleBarsFromTrades,
} from './build-candle-bars-from-trades';

/** Свеча для canvas. */
export interface CandleCanvasBar {
  /** Unix sec (дробный для 0.5s) */
  time: number;
  /** Open */
  open: number;
  /** High */
  high: number;
  /** Low */
  low: number;
  /** Close */
  close: number;
  /** Volume */
  volume: number;
}

export interface CandleCanvasProps {
  /** Тикер MOEX */
  symbol: string;
  /** Начальный ТФ (если не из localStorage) */
  resolution?: string;
  /** className */
  className?: string;
}

/** Таймфреймы панели канваса (0.5s по сделкам + секунды/минуты/день). */
const CANVAS_TF_OPTIONS: { value: string; label: string }[] = [
  { value: '0.5S', label: '0.5s' },
  { value: '1S', label: '1s' },
  { value: '5S', label: '5s' },
  { value: '15S', label: '15s' },
  { value: '1', label: '1m' },
  { value: '5', label: '5m' },
  { value: '15', label: '15m' },
  { value: '60', label: '1h' },
  { value: 'D', label: '1d' },
];

/** ТФ, которые строятся из alltrades (не из candles Alor). */
const CANVAS_TRADE_TF_BUCKET_MS: Record<string, number> = {
  '0.5S': 500,
};

const CANVAS_TF_STORAGE_KEY = 'charts-canvas-resolution';
const DEFAULT_RESOLUTION = '5';
const VISIBLE_DEFAULT = 80;
const TRADE_TF_MAX_BARS = 2_000;
const TRADE_TF_HISTORY_MS = 20 * 60_000;
const PAD = { left: 2, right: 16, top: 6, bottom: 16 };
const PRICE_AXIS_PAD_LEFT = 8;
const PRICE_AXIS_PAD_RIGHT = 8;
const VOLUME_RATIO = 0.24;
const CANDLE_BODY_RATIO = 0.88;
const MIN_SLOT_PX = 2;

/**
 * Читает сохранённый ТФ канваса.
 */
function readStoredResolution(fallback: string): string {
  try {
    const raw = localStorage.getItem(CANVAS_TF_STORAGE_KEY);
    if (raw && CANVAS_TF_OPTIONS.some((opt) => opt.value === raw)) return raw;
  } catch {
    // ignore
  }
  return fallback;
}

/**
 * Live canvas-свечи в стиле smartmoney-client ScreenerCanvas.
 */
export const CandleCanvas: React.FC<CandleCanvasProps> = ({
  symbol,
  resolution: resolutionProp,
  className,
}) => {
  const api = useAppSelector((s) => s.alorSlice.api) as AlorApi | undefined;
  const dataService = useAppSelector((s) => s.alorSlice.dataService) as DataService | undefined;
  const [resolution, setResolution] = useState(
    () => readStoredResolution(resolutionProp ?? DEFAULT_RESOLUTION),
  );
  const [bars, setBars] = useState<CandleCanvasBar[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [scrollFromEnd, setScrollFromEnd] = useState(0);
  const [visibleCount, setVisibleCount] = useState(VISIBLE_DEFAULT);

  const onResolutionChange = (next: string) => {
    if (next === resolution) return;
    setResolution(next);
    try {
      localStorage.setItem(CANVAS_TF_STORAGE_KEY, next);
    } catch {
      // ignore
    }
  };

  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const barsRef = useRef(bars);
  const scrollRef = useRef(scrollFromEnd);
  const visibleRef = useRef(visibleCount);
  const loadingRef = useRef(loading);
  const errorRef = useRef(error);
  const crosshairRef = useRef<{ x: number; y: number } | null>(null);
  const tradeSeedReadyRef = useRef(false);
  const tradeWsBufferRef = useRef<
    Array<{ timeMs: number; price: number; qty: number }>
  >([]);
  barsRef.current = bars;
  scrollRef.current = scrollFromEnd;
  visibleRef.current = visibleCount;
  loadingRef.current = loading;
  errorRef.current = error;

  const tradeBucketMs = CANVAS_TRADE_TF_BUCKET_MS[resolution] ?? null;
  const isTradeTf = tradeBucketMs != null;

  // История: candles API или alltrades → OHLC для 0.5s
  useEffect(() => {
    if (!symbol.trim()) {
      setBars([]);
      return;
    }
    let cancelled = false;
    const ac = new AbortController();
    tradeSeedReadyRef.current = false;
    tradeWsBufferRef.current = [];
    setLoading(true);
    setError(null);
    setBars([]);
    setScrollFromEnd(0);

    const load = async () => {
      if (isTradeTf && tradeBucketMs != null) {
        if (!api) {
          throw new Error('Нет подключения к Alor');
        }
        const toMs = Date.now();
        const fromMs = toMs - TRADE_TF_HISTORY_MS;
        const raw = await fetchAlorAlltrades(api, symbol.trim(), {
          fromSec: Math.floor(fromMs / 1000),
          toSec: Math.ceil(toMs / 1000),
          signal: ac.signal,
        });
        if (cancelled) return;
        const trades = [];
        for (const item of raw) {
          const trade = mapAlorAlltradeToClusterChartTrade(item);
          if (trade) trades.push(trade);
        }
        let nextBars = buildCandleBarsFromTrades(trades, tradeBucketMs, TRADE_TF_MAX_BARS);
        const buffered = tradeWsBufferRef.current;
        tradeWsBufferRef.current = [];
        for (const trade of buffered) {
          nextBars = applyTradeToCandleBars(nextBars, trade, tradeBucketMs, TRADE_TF_MAX_BARS);
        }
        tradeSeedReadyRef.current = true;
        setBars(nextBars);
        return;
      }

      if (!dataService) {
        throw new Error('Нет DataService');
      }
      const to = Math.floor(Date.now() / 1000);
      const from = historyFromSec(resolution, to);
      const resp = await firstValueFrom(
        dataService.getChartData(symbol.trim(), resolution as ResolutionString, {
          from,
          to,
          countBack: 500,
          firstDataRequest: true,
        }),
      );
      if (cancelled) return;
      const history = (resp as { history?: CandleCanvasBar[] })?.history ?? [];
      const mapped = history
        .map((h) => ({
          time: Number(h.time),
          open: Number(h.open),
          high: Number(h.high),
          low: Number(h.low),
          close: Number(h.close),
          volume: Number((h as { volume?: number }).volume ?? 0),
        }))
        .filter((b) => Number.isFinite(b.time) && b.time > 0)
        .map((b) => ({
          ...b,
          time: b.time > 1e12 ? Math.floor(b.time / 1000) : b.time,
        }));
      setBars(mapped);
    };

    void load()
      .catch((err) => {
        if (cancelled || ac.signal.aborted) return;
        setError(err instanceof Error ? err.message : String(err));
        if (isTradeTf) {
          tradeSeedReadyRef.current = true;
          const buffered = tradeWsBufferRef.current;
          tradeWsBufferRef.current = [];
          if (tradeBucketMs != null && buffered.length) {
            let nextBars: CandleCanvasBar[] = [];
            for (const trade of buffered) {
              nextBars = applyTradeToCandleBars(
                nextBars,
                trade,
                tradeBucketMs,
                TRADE_TF_MAX_BARS,
              );
            }
            setBars(nextBars);
          }
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      ac.abort();
      tradeSeedReadyRef.current = false;
      tradeWsBufferRef.current = [];
    };
  }, [api, dataService, symbol, resolution, isTradeTf, tradeBucketMs]);

  // Live: candles WS или alltrades → OHLC для 0.5s
  useEffect(() => {
    if (!api || !symbol.trim()) return;
    let unsubscribe: (() => void) | undefined;
    let cancelled = false;

    if (isTradeTf && tradeBucketMs != null) {
      const bucketMs = tradeBucketMs;
      void api.subscriptions
        .alltrades(
          {
            exchange: Exchange.MOEX,
            depth: 1000,
            // @ts-expect-error code есть в Alor opcode
            code: symbol.trim(),
          },
          (data) => {
            if (cancelled) return;
            const trade = mapAlorAlltradeToClusterChartTrade(data as never);
            if (!trade) return;
            if (!tradeSeedReadyRef.current) {
              tradeWsBufferRef.current.push(trade);
              return;
            }
            setBars((prev) =>
              applyTradeToCandleBars(prev, trade, bucketMs, TRADE_TF_MAX_BARS),
            );
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
          console.warn('Canvas-свечи 0.5s: ошибка подписки alltrades', err);
        });
      return () => {
        cancelled = true;
        unsubscribe?.();
      };
    }

    void api.subscriptions
      .candles(
        {
          code: symbol.trim(),
          exchange: Exchange.MOEX,
          format: Format.Simple,
          tf: resolveAlorTf(resolution),
        },
        (data) => {
          if (cancelled) return;
          const rawTime = Number(data.time);
          const bar: CandleCanvasBar = {
            time: rawTime > 1e12 ? Math.floor(rawTime / 1000) : rawTime,
            open: Number(data.open),
            high: Number(data.high),
            low: Number(data.low),
            close: Number(data.close),
            volume: Number(data.volume ?? 0),
          };
          if (!(bar.time > 0)) return;
          setBars((prev) => {
            if (!prev.length) return [bar];
            const last = prev[prev.length - 1];
            if (last.time === bar.time) {
              const next = prev.slice();
              next[next.length - 1] = bar;
              return next;
            }
            if (bar.time > last.time) return [...prev, bar];
            return prev;
          });
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
        console.warn('Canvas-свечи: ошибка подписки', err);
      });
    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [api, symbol, resolution, isTradeTf, tradeBucketMs]);

  const paintRef = useRef(() => {});
  paintRef.current = () => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const cssW = wrap.clientWidth;
    const cssH = wrap.clientHeight;
    if (cssW <= 0 || cssH <= 0) return;
    const dpr = resolveCanvasChartDpr(cssW, cssH);
    if (canvas.width !== Math.floor(cssW * dpr) || canvas.height !== Math.floor(cssH * dpr)) {
      canvas.width = Math.floor(cssW * dpr);
      canvas.height = Math.floor(cssH * dpr);
      canvas.style.width = `${cssW}px`;
      canvas.style.height = `${cssH}px`;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const theme = resolveTwChartThemeColors(TW_CHART_THEME_COLORS);
    ctx.clearRect(0, 0, cssW, cssH);
    ctx.fillStyle = theme.background;
    ctx.fillRect(0, 0, cssW, cssH);

    const all = barsRef.current;
    if (!all.length) {
      ctx.fillStyle = theme.scaleText;
      ctx.font = '12px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
      ctx.fillText(
        loadingRef.current ? 'Загрузка…' : errorRef.current ?? 'Нет данных',
        12,
        40,
      );
      return;
    }

    const visible = Math.max(20, visibleRef.current);
    const maxScroll = Math.max(0, all.length - visible);
    const scroll = Math.min(maxScroll, Math.max(0, Math.floor(scrollRef.current)));
    const end = all.length - scroll;
    const start = Math.max(0, end - visible);
    const slice = all.slice(start, end);
    if (!slice.length) return;

    let minP = Infinity;
    let maxP = -Infinity;
    let maxVol = 0;
    for (const b of slice) {
      if (b.low < minP) minP = b.low;
      if (b.high > maxP) maxP = b.high;
      if (b.volume > maxVol) maxVol = b.volume;
    }
    const padRange = (maxP - minP) * 0.05 || maxP * 0.001 || 1;
    minP -= padRange;
    maxP += padRange;

    const last = slice[slice.length - 1];
    const decimals = resolvePriceDecimals(slice);
    ctx.font = '10px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
    const priceLabels = [maxP, minP, last.close].map((p) => formatPrice(p, decimals));
    const contentW = Math.max(...priceLabels.map((t) => ctx.measureText(t).width), 24);
    const axisW = Math.min(
      140,
      Math.max(PRICE_AXIS_PAD_LEFT + PRICE_AXIS_PAD_RIGHT, contentW + PRICE_AXIS_PAD_LEFT + PRICE_AXIS_PAD_RIGHT),
    );

    const plotLeft = PAD.left;
    const plotRight = cssW - axisW;
    const plotW = Math.max(1, plotRight - plotLeft);
    const plotTop = PAD.top;
    const plotBottom = cssH - PAD.bottom;
    const plotH = Math.max(1, plotBottom - plotTop);
    const volH = Math.floor(plotH * VOLUME_RATIO);
    const priceBottom = plotBottom - volH;
    const priceH = Math.max(1, priceBottom - plotTop);
    const slot = plotW / Math.max(1, slice.length);
    const bodyW = Math.max(1, slot * CANDLE_BODY_RATIO);
    const yOf = (p: number) => plotTop + ((maxP - p) / (maxP - minP)) * priceH;
    const candleX = (idx: number) => plotLeft + idx * slot + slot / 2;
    const spanSec = Math.max(0, slice[slice.length - 1].time - slice[0].time);
    const maxTimeLabels = Math.max(2, Math.min(6, Math.floor(plotW / 72)));
    const timeIdxs = pickTimeLabelIndices(slice.length, maxTimeLabels);

    // Сетка цены
    ctx.strokeStyle = theme.grid;
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i += 1) {
      const y = plotTop + (priceH * i) / 4;
      ctx.beginPath();
      ctx.moveTo(plotLeft, Math.round(y) + 0.5);
      ctx.lineTo(plotRight, Math.round(y) + 0.5);
      ctx.stroke();
    }

    // Вертикальная сетка по меткам времени
    for (const idx of timeIdxs) {
      const x = Math.round(candleX(idx)) + 0.5;
      if (x < plotLeft || x > plotRight) continue;
      ctx.beginPath();
      ctx.moveTo(x, plotTop);
      ctx.lineTo(x, plotBottom);
      ctx.stroke();
    }

    // Разделитель volume
    ctx.strokeStyle = theme.separator;
    ctx.beginPath();
    ctx.moveTo(plotLeft, Math.round(priceBottom) + 0.5);
    ctx.lineTo(plotRight, Math.round(priceBottom) + 0.5);
    ctx.stroke();

    // Volume
    if (maxVol > 0 && slot >= MIN_SLOT_PX) {
      for (let i = 0; i < slice.length; i += 1) {
        const b = slice[i];
        const up = b.close >= b.open;
        const h = (b.volume / maxVol) * (volH - 2);
        const x = plotLeft + i * slot + (slot - bodyW) / 2;
        ctx.fillStyle = up ? TW_CHART_VOLUME_UP : TW_CHART_VOLUME_DOWN;
        ctx.fillRect(x, plotBottom - h, bodyW, h);
      }
    }

    // Candles
    if (slot >= MIN_SLOT_PX) {
      for (let i = 0; i < slice.length; i += 1) {
        const b = slice[i];
        const x = plotLeft + i * slot + slot / 2;
        const up = b.close >= b.open;
        const color = up ? theme.success : theme.destructive;
        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(Math.round(x) + 0.5, yOf(b.high));
        ctx.lineTo(Math.round(x) + 0.5, yOf(b.low));
        ctx.stroke();
        const bodyTop = yOf(Math.max(b.open, b.close));
        const bodyBot = yOf(Math.min(b.open, b.close));
        ctx.fillRect(x - bodyW / 2, bodyTop, bodyW, Math.max(1, bodyBot - bodyTop));
      }
    }

    // Ось цены
    ctx.fillStyle = theme.scaleText;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    const axisX = plotRight + PRICE_AXIS_PAD_LEFT;
    for (let i = 0; i <= 4; i += 1) {
      const p = maxP - ((maxP - minP) * i) / 4;
      const y = plotTop + (priceH * i) / 4;
      ctx.fillText(formatPrice(p, decimals), axisX, y);
    }

    // Ось времени
    const timeAxisY = plotBottom + Math.max(10, PAD.bottom / 2 + 2);
    ctx.save();
    ctx.strokeStyle = theme.grid;
    ctx.fillStyle = theme.scaleText;
    ctx.font = '10px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.rect(plotLeft, plotBottom, Math.max(0, plotRight - plotLeft), PAD.bottom);
    ctx.clip();
    for (let li = 0; li < timeIdxs.length; li += 1) {
      const idx = timeIdxs[li];
      const bar = slice[idx];
      if (!bar) continue;
      const x = candleX(idx);
      if (x > plotRight || x < plotLeft) continue;
      ctx.beginPath();
      ctx.moveTo(x, plotBottom);
      ctx.lineTo(x, plotBottom + 3);
      ctx.stroke();
      const label = formatCanvasTime(bar.time, spanSec);
      if (li === 0) ctx.textAlign = 'left';
      else if (li === timeIdxs.length - 1) ctx.textAlign = 'right';
      else ctx.textAlign = 'center';
      ctx.fillText(label, Math.min(x, plotRight), timeAxisY);
    }
    ctx.restore();

    // Last price
    const lastY = yOf(last.close);
    const lastUp = last.close >= last.open;
    drawCanvasChartLastPriceLine(ctx, {
      price: last.close,
      color: lastUp ? theme.success : theme.destructive,
      y: lastY,
      plotLeft,
      plotW,
      labelWidth: axisW,
      label: formatPrice(last.close, decimals),
      priceTop: plotTop,
      priceBottom,
      labelPadLeft: PRICE_AXIS_PAD_LEFT,
    });

    // Crosshair
    const cross = crosshairRef.current;
    if (cross) {
      const cx = Math.min(plotRight, Math.max(plotLeft, cross.x));
      const cy = Math.min(plotBottom, Math.max(plotTop, cross.y));
      drawCanvasChartCrosshair(ctx, {
        x: cx,
        y: cy,
        color: theme.crosshair,
        left: plotLeft,
        top: plotTop,
        right: plotRight,
        bottom: plotBottom,
      });
      if (cy >= plotTop && cy <= priceBottom) {
        const price = maxP - ((cy - plotTop) / priceH) * (maxP - minP);
        const label = formatPrice(price, decimals);
        const boxH = 14;
        const boxY = Math.min(priceBottom - boxH / 2, Math.max(plotTop + boxH / 2, cy));
        ctx.fillStyle = theme.crosshair;
        ctx.fillRect(plotRight, boxY - boxH / 2, axisW, boxH);
        ctx.fillStyle = theme.background;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, axisX, boxY);
      }
      const candleIdx = Math.min(
        slice.length - 1,
        Math.max(0, Math.floor((cx - plotLeft) / Math.max(1, slot))),
      );
      const candle = slice[candleIdx];
      if (candle) {
        const timeLabel = formatCanvasTime(candle.time, spanSec);
        const timeW = Math.max(36, ctx.measureText(timeLabel).width + 8);
        const timeX = Math.min(plotRight - timeW / 2, Math.max(plotLeft + timeW / 2, cx));
        ctx.fillStyle = theme.crosshair;
        ctx.fillRect(timeX - timeW / 2, plotBottom, timeW, Math.max(14, PAD.bottom - 2));
        ctx.fillStyle = theme.background;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(timeLabel, timeX, timeAxisY);
      }
    }
  };

  useEffect(() => {
    paintRef.current();
  }, [bars, scrollFromEnd, visibleCount, loading, error]);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const isToolbarTarget = (target: EventTarget | null) => {
      if (!(target instanceof Element)) return false;
      return Boolean(target.closest('[data-embed-tf-toolbar]'));
    };

    const host = new CanvasChartHost({
      host: wrap,
      canvas,
      manageResize: true,
      getLayout: () => ({
        width: wrap.clientWidth,
        height: wrap.clientHeight,
        priceAxisWidth: 56,
        pricePanelBottom: wrap.clientHeight - PAD.bottom - Math.floor((wrap.clientHeight - PAD.top - PAD.bottom) * VOLUME_RATIO),
        timeZoneH: PAD.bottom,
      }),
      handlers: {
        shouldIgnoreTarget: isToolbarTarget,
        onPan: (dx) => {
          const slot = wrap.clientWidth / Math.max(1, visibleRef.current);
          const maxScroll = Math.max(0, barsRef.current.length - visibleRef.current);
          const next = nextCanvasChartPanOffset({
            currentOffset: scrollRef.current,
            mouseDxPx: dx,
            slotPx: Math.max(1, slot),
            minOffset: 0,
            maxOffset: maxScroll,
          });
          setScrollFromEnd(next);
        },
        onTimeZoom: (deltaY) => {
          setVisibleCount((prev) =>
            Math.min(400, Math.max(20, Math.round(prev * (deltaY > 0 ? 1.1 : 0.9)))),
          );
        },
        onPriceZoom: () => {},
        onPointerMove: (x, y) => {
          crosshairRef.current = { x, y };
          paintRef.current();
        },
        onPointerLeave: () => {
          crosshairRef.current = null;
          paintRef.current();
        },
      },
      onResize: () => paintRef.current(),
    });
    host.attach();
    return () => host.detach();
  }, []);

  return (
    <div
      ref={wrapRef}
      className={cn('relative h-full w-full min-h-[320px]', className)}
      style={{ background: TW_CHART_THEME_COLORS.background }}
    >
      <ChartEmbedTfToolbar
        className="absolute left-0 top-0 z-20"
        options={CANVAS_TF_OPTIONS}
        value={resolution}
        aria-label="Таймфрейм канваса"
        onChange={onResolutionChange}
      />
      <canvas ref={canvasRef} className="block h-full w-full touch-none" />
    </div>
  );
};

/**
 * Нижняя граница истории по ТФ.
 */
function historyFromSec(resolution: string, to: number): number {
  if (resolution === '0.5S') return to - Math.floor(TRADE_TF_HISTORY_MS / 1000);
  const code = resolution.slice(-1);
  if (code === 'D') return to - 60 * 60 * 24 * 400;
  if (code === 'W') return to - 60 * 60 * 24 * 7 * 200;
  if (code === 'M') return to - 60 * 60 * 24 * 30 * 120;
  if (code === 'S') {
    const seconds = Number(resolution.slice(0, -1)) || 15;
    if (seconds <= 1) return to - 60 * 30;
    if (seconds <= 5) return to - 60 * 60 * 2;
    return to - 60 * 60 * 4;
  }
  const minutes = Number(resolution) || 5;
  if (minutes >= 60) return to - 60 * 60 * 24 * 60;
  if (minutes >= 15) return to - 60 * 60 * 24 * 14;
  return to - 60 * 60 * 24 * 3;
}

/**
 * ТФ Alor из resolution TradingView (не для trade-TF вроде 0.5S).
 */
function resolveAlorTf(resolution: string): string {
  const code = resolution.slice(-1);
  if (['D', 'W', 'M', 'Y'].includes(code)) return resolution;
  if (code === 'H') {
    const count = Number(resolution.slice(0, -1)) || 1;
    return String(count * 3600);
  }
  if (code === 'S') {
    const seconds = Number(resolution.slice(0, -1)) || 15;
    return String(Math.max(1, seconds));
  }
  const minutes = Number(resolution) || 5;
  return String(minutes * 60);
}

/**
 * Decimals по диапазону цен.
 */
function resolvePriceDecimals(bars: readonly CandleCanvasBar[]): number {
  let min = Infinity;
  for (const b of bars) {
    if (b.close > 0 && b.close < min) min = b.close;
  }
  if (!(min < Infinity)) return 2;
  if (min >= 1000) return 2;
  if (min >= 1) return 4;
  return 6;
}

/**
 * Формат цены.
 */
function formatPrice(price: number, decimals: number): string {
  if (!Number.isFinite(price)) return '';
  return price.toFixed(decimals);
}

/**
 * Индексы свечей для подписей времени.
 */
function pickTimeLabelIndices(length: number, maxLabels: number): number[] {
  if (length <= 0 || maxLabels < 1) return [];
  if (length === 1) return [0];
  const n = Math.min(Math.max(2, maxLabels), length);
  const idxs: number[] = [];
  for (let i = 0; i < n; i += 1) {
    idxs.push(Math.round((i * (length - 1)) / (n - 1)));
  }
  return [...new Set(idxs)];
}

/**
 * Формат unix-времени (сек) для нижней оси.
 */
function formatCanvasTime(unixSec: number, spanSec: number): string {
  if (!Number.isFinite(unixSec)) return '—';
  // Alor иногда отдаёт ms — нормализуем к секундам.
  const sec = unixSec > 1e12 ? Math.floor(unixSec / 1000) : unixSec;
  const d = new Date(sec * 1000);
  if (Number.isNaN(d.getTime())) return '—';
  const pad2 = (n: number) => String(n).padStart(2, '0');
  const dd = pad2(d.getDate());
  const mm = pad2(d.getMonth() + 1);
  const hh = pad2(d.getHours());
  const mi = pad2(d.getMinutes());
  const ss = pad2(d.getSeconds());
  const tenths = Math.floor(d.getMilliseconds() / 100);
  if (spanSec >= 86_400 * 5) return `${dd}.${mm}`;
  if (spanSec >= 86_400) return `${dd}.${mm} ${hh}:${mi}`;
  if (spanSec < 180) return `${hh}:${mi}:${ss}.${tenths}`;
  if (spanSec < 60 * 60) return `${hh}:${mi}:${ss}`;
  return `${hh}:${mi}`;
}
