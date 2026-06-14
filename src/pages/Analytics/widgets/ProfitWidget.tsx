import Spinner from '../../../common/Spinner';
import TVChart from '../../../common/TVChart';
import NoResult from '../../../common/NoResult';
import React, { useMemo } from 'react';
import moment from 'moment/moment';
import { numberToPercent } from '../../../utils';
import { useSearchParams } from 'react-router-dom';
import { moneyFormat } from '../../../common/utils';
import { summ } from '../../../App';

interface ProfitWidgetProps {
  /** Кумулятивный PnL по дням из дневника */
  chartData: { time: string; value: number }[];
  isLoading: boolean;
  colors?: Record<string, string>;
  /** Позиции за период (без summary-строк) */
  nonSummaryPositions: Record<string, unknown>[];
  /** Внутри табов аналитики — без внешней обёртки widget */
  embedded?: boolean;
}

const ProfitWidget = ({ chartData, isLoading, colors, nonSummaryPositions, embedded }: ProfitWidgetProps) => {
  const [searchParams] = useSearchParams();
  let dateFrom = searchParams.get('dateFrom');
  if (!dateFrom) {
    dateFrom = moment().startOf('month').format('YYYY-MM-DD');
  }
  let dateTo = searchParams.get('dateTo');
  if (!dateTo) {
    dateTo = moment().endOf('month').add(1, 'day').format('YYYY-MM-DD');
  }

  const stats = useMemo(() => {
    const positions = nonSummaryPositions as {
      PnL?: number;
      side?: string;
      openVolume?: number;
      closeVolume?: number;
      Fee?: number;
    }[];

    const totalCount = positions.length;
    const winsCount = positions.filter((p) => (p.PnL ?? 0) > 0).length;
    const longCount = positions.filter((p) => p.side === 'buy').length;
    const shortCount = positions.filter((p) => p.side === 'sell').length;
    const turnover = summ(positions.map((p) => (p.openVolume ?? 0) + (p.closeVolume ?? 0)));
    const totalFee = summ(positions.map((p) => p.Fee ?? 0));
    const tradesPnL = summ(positions.map((p) => p.PnL ?? 0));

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

  const pnlValue = stats.tradesPnL;
  const isProfit = pnlValue >= 0;

  return (
    <div className={embedded ? 'analytics-profit-widget analytics-profit-widget--embedded' : 'widget analytics-profit-widget'}>
      {isLoading ? (
        <Spinner />
      ) : chartData.length ? (
        <>
          <div className="analytics-profit-chart">
            <TVChart
              colors={colors}
              fitContent
              seriesType="baseLine"
              pnlChart
              showPnLLastLine
              balance={stats.turnover}
              data={chartData}
              formatTime="D MMM"
            />
          </div>
          <aside className="analytics-profit-summary">
            <div className="analytics-profit-period">{dateRangeLabel}</div>
            <div className={`analytics-profit-total ${isProfit ? 'profit' : 'loss'}`}>
              {moneyFormat(pnlValue)}
            </div>
            <div className={`analytics-profit-percent ${isProfit ? 'profit' : 'loss'}`}>
              {numberToPercent(Math.abs(stats.pnlPercent))}%
            </div>
            <div className="analytics-profit-metrics">
              <div className="analytics-profit-metric">
                <span>Win rate {numberToPercent(stats.winRate)}%</span>
                <span>{stats.winsCount}/{stats.totalCount}</span>
              </div>
              <div className="analytics-profit-metric">
                <span>Long/Short</span>
                <span>{stats.longCount}/{stats.shortCount}</span>
              </div>
              <div className="analytics-profit-metric">
                <span>Turnover</span>
                <span>{moneyFormat(stats.turnover)}</span>
              </div>
              <div className="analytics-profit-metric">
                <span>Fee {numberToPercent(stats.feePercent)}%</span>
                <span>{moneyFormat(stats.totalFee)}</span>
              </div>
            </div>
          </aside>
        </>
      ) : (
        <NoResult text="Нет данных" />
      )}
    </div>
  );
};

export default ProfitWidget;
