import Spinner from '../../../common/Spinner';
import NoResult from '../../../common/NoResult';
import React, { FC, useMemo } from 'react';
import moment from 'moment';
import { useSearchParams } from 'react-router-dom';
import { moneyFormat } from '../../../common/utils';
import { numberToPercent } from '../../../utils';
import { summ } from '../../../App';
import { LineChartOutlined, BulbOutlined } from '@ant-design/icons';

interface PositionRow {
  /** Тикер */
  symbol?: string;
  /** PnL сделки */
  PnL?: number;
  /** Направление */
  side?: string;
  /** Объём открытия */
  openVolume?: number;
  /** Объём закрытия */
  closeVolume?: number;
  /** Комиссия */
  Fee?: number;
}

interface SymbolStats {
  /** Название тикера или группы */
  label: string;
  /** Количество сделок */
  count: number;
  /** Суммарный PnL */
  pnl: number;
  /** Прибыльные сделки */
  wins: number;
  /** Убыточные сделки */
  losses: number;
}

interface SymbolsWidgetProps {
  /** Позиции за период (без summary-строк) */
  nonSummaryPositions: PositionRow[];
  isLoading: boolean;
  /** Внутри табов аналитики — без внешней обёртки widget */
  embedded?: boolean;
  /** Кумулятивный PnL по дням из дневника */
  chartData?: { time: string; value: number }[];
}

const TOP_SYMBOLS_COUNT = 6;

/**
 * Агрегирует статистику по тикерам.
 */
function buildSymbolStats(positions: PositionRow[]): SymbolStats[] {
  const map = positions.reduce<Record<string, SymbolStats>>((acc, position) => {
    const symbol = position.symbol || 'Unknown';
    if (!acc[symbol]) {
      acc[symbol] = { label: symbol, count: 0, pnl: 0, wins: 0, losses: 0 };
    }

    const pnl = position.PnL ?? 0;
    acc[symbol].count += 1;
    acc[symbol].pnl += pnl;
    if (pnl > 0) {
      acc[symbol].wins += 1;
    } else {
      acc[symbol].losses += 1;
    }

    return acc;
  }, {});

  const sorted = Object.values(map).sort((a, b) => b.pnl - a.pnl);
  if (sorted.length <= TOP_SYMBOLS_COUNT + 1) {
    return sorted;
  }

  const top = sorted.slice(0, TOP_SYMBOLS_COUNT);
  const rest = sorted.slice(TOP_SYMBOLS_COUNT);
  const other: SymbolStats = {
    label: `Other (${rest.length})`,
    count: 0,
    pnl: 0,
    wins: 0,
    losses: 0,
  };

  rest.forEach((item) => {
    other.count += item.count;
    other.pnl += item.pnl;
    other.wins += item.wins;
    other.losses += item.losses;
  });

  return [...top, other];
}

/**
 * Агрегирует статистику по направлению сделки.
 */
function buildSideStats(positions: PositionRow[], side: 'buy' | 'sell'): SymbolStats {
  const filtered = positions.filter((p) => p.side === side);
  const wins = filtered.filter((p) => (p.PnL ?? 0) > 0).length;
  const losses = filtered.length - wins;

  return {
    label: side === 'buy' ? 'Long' : 'Short',
    count: filtered.length,
    pnl: summ(filtered.map((p) => p.PnL ?? 0)),
    wins,
    losses,
  };
}

interface AnalyticsSymbolRowProps {
  /** Строка статистики */
  item: SymbolStats;
}

/**
 * Строка тикера или направления с PnL и win/loss-полоской.
 */
const AnalyticsSymbolRow: FC<AnalyticsSymbolRowProps> = ({ item }) => {
  const total = item.wins + item.losses;
  const winPercent = total ? (item.wins / total) * 100 : 0;
  const isProfit = item.pnl >= 0;

  return (
    <div className="analytics-symbol-row">
      <div className="analytics-symbol-row__main">
        <span className="analytics-symbol-row__name">{item.label}</span>
        <span className="analytics-symbol-row__count">{item.count}</span>
        <span className={`analytics-symbol-row__pnl ${isProfit ? 'profit' : 'loss'}`}>
          {moneyFormat(item.pnl)}
        </span>
      </div>
      <div className="analytics-symbol-row__bar-wrap">
        <span className="analytics-symbol-row__ratio">
          {item.wins}/{item.losses}
        </span>
        <div className="analytics-symbol-row__bar">
          <div className="analytics-symbol-row__bar-win" style={{ width: `${winPercent}%` }} />
          <div className="analytics-symbol-row__bar-loss" style={{ width: `${100 - winPercent}%` }} />
        </div>
      </div>
    </div>
  );
};

const SymbolsWidget: FC<SymbolsWidgetProps> = ({
  nonSummaryPositions,
  isLoading,
  embedded,
  chartData = [],
}) => {
  const [searchParams] = useSearchParams();
  let dateFrom = searchParams.get('dateFrom');
  if (!dateFrom) {
    dateFrom = moment().startOf('month').format('YYYY-MM-DD');
  }
  let dateTo = searchParams.get('dateTo');
  if (!dateTo) {
    dateTo = moment().endOf('month').add(1, 'day').format('YYYY-MM-DD');
  }

  const symbolStats = useMemo(() => buildSymbolStats(nonSummaryPositions), [nonSummaryPositions]);
  const longStats = useMemo(() => buildSideStats(nonSummaryPositions, 'buy'), [nonSummaryPositions]);
  const shortStats = useMemo(() => buildSideStats(nonSummaryPositions, 'sell'), [nonSummaryPositions]);

  const summary = useMemo(() => {
    const totalCount = nonSummaryPositions.length;
    const winsCount = nonSummaryPositions.filter((p) => (p.PnL ?? 0) > 0).length;
    const longCount = nonSummaryPositions.filter((p) => p.side === 'buy').length;
    const shortCount = nonSummaryPositions.filter((p) => p.side === 'sell').length;
    const turnover = summ(nonSummaryPositions.map((p) => (p.openVolume ?? 0) + (p.closeVolume ?? 0)));
    const totalFee = summ(nonSummaryPositions.map((p) => p.Fee ?? 0));
    const tradesPnL = summ(nonSummaryPositions.map((p) => p.PnL ?? 0));

    return {
      winRate: totalCount ? winsCount / totalCount : 0,
      winsCount,
      totalCount,
      longCount,
      shortCount,
      turnover,
      totalFee,
      feePercent: turnover ? totalFee / turnover : 0,
      pnlPercent: turnover ? tradesPnL / turnover : 0,
      tradesPnL,
    };
  }, [nonSummaryPositions]);

  const dateRangeLabel = useMemo(() => {
    const from = moment(dateFrom);
    const to = moment(dateTo).subtract(1, 'day');
    const formatMonth = (date: moment.Moment) => {
      const month = date.format('MMM').replace('.', '');
      return month.charAt(0).toUpperCase() + month.slice(1);
    };

    if (from.isSame(to, 'month')) {
      return `${from.format('DD')} - ${to.format('DD')} ${formatMonth(to)}`;
    }

    return `${from.format('DD')} ${formatMonth(from)} - ${to.format('DD')} ${formatMonth(to)}`;
  }, [dateFrom, dateTo]);

  const growthPercent = useMemo(() => {
    if (!summary.turnover) {
      return 0;
    }
    return (summary.tradesPnL / summary.turnover) * 100;
  }, [summary.tradesPnL, summary.turnover]);

  const chartPnL = useMemo(() => chartData.slice(-1)[0]?.value ?? summary.tradesPnL, [chartData, summary.tradesPnL]);

  const excludeTip = useMemo(() => {
    const losers = nonSummaryPositions.reduce<Record<string, number>>((acc, position) => {
      const symbol = position.symbol || 'Unknown';
      acc[symbol] = (acc[symbol] || 0) + (position.PnL ?? 0);
      return acc;
    }, {});

    const worst = Object.entries(losers)
      .filter(([, pnl]) => pnl < 0)
      .sort((a, b) => a[1] - b[1])[0];

    return worst?.[0];
  }, [nonSummaryPositions]);

  const isProfit = summary.tradesPnL >= 0;

  const content = isLoading ? (
    <Spinner />
  ) : symbolStats.length ? (
    <div className="analytics-symbols-dashboard">
      <aside className="analytics-symbols-card analytics-symbols-summary">
        <div className="analytics-profit-period">{dateRangeLabel}</div>
        <div className={`analytics-profit-total ${isProfit ? 'profit' : 'loss'}`}>
          {moneyFormat(summary.tradesPnL)}
        </div>
        <div className={`analytics-profit-percent ${isProfit ? 'profit' : 'loss'}`}>
          {numberToPercent(Math.abs(summary.pnlPercent))}%
        </div>
        <div className="analytics-profit-metrics">
          <div className="analytics-profit-metric">
            <span>Win rate {numberToPercent(summary.winRate)}%</span>
            <span>
              {summary.winsCount}/{summary.totalCount}
            </span>
          </div>
          <div className="analytics-profit-metric">
            <span>Long/Short</span>
            <span>
              {summary.longCount}/{summary.shortCount}
            </span>
          </div>
          <div className="analytics-profit-metric">
            <span>Turnover</span>
            <span>{moneyFormat(summary.turnover)}</span>
          </div>
          <div className="analytics-profit-metric">
            <span>Fee {numberToPercent(summary.feePercent)}%</span>
            <span>{moneyFormat(summary.totalFee)}</span>
          </div>
        </div>
      </aside>

      <section className="analytics-symbols-card analytics-symbols-list">
        {symbolStats.map((item) => (
          <AnalyticsSymbolRow key={item.label} item={item} />
        ))}
      </section>

      <section className="analytics-symbols-card analytics-symbols-reasons">
        <p>Данный блок будет пустой, т.к. в анализе не используются основания</p>
      </section>

      <section className="analytics-symbols-right">
        <div className="analytics-symbols-card analytics-symbols-side">
          <AnalyticsSymbolRow item={shortStats} />
          <AnalyticsSymbolRow item={longStats} />
        </div>

        <div className="analytics-symbols-card analytics-symbols-footer">
          {excludeTip && (
            <div className="analytics-symbols-tip">
              <BulbOutlined />
              <span>Совет: исключите {excludeTip}</span>
            </div>
          )}
          <div className="analytics-symbols-growth">
            <div className="analytics-symbols-growth__pnl">
              PnL {moneyFormat(chartPnL)}
            </div>
            <div className="analytics-symbols-growth__chart">
              <LineChartOutlined />
              <span>Прирост {numberToPercent(Math.abs(growthPercent))}%</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  ) : (
    <NoResult text="Нет данных" />
  );

  if (embedded) {
    return <div className="analytics-symbols-panel">{content}</div>;
  }

  return (
    <div className="widget">
      <div className="widget_header">По инструментам</div>
      {content}
    </div>
  );
};

export default SymbolsWidget;
