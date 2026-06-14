import Spinner from '../../../common/Spinner';
import TVChart from '../../../common/TVChart';
import React, { useMemo } from 'react';
import moment from 'moment/moment';
import { MoneyMovesSearch, Status } from 'alor-api/dist/services/ClientInfoService/ClientInfoService';
import { enumerateDaysBetweenDates, numberToPercent } from '../../../utils';
import { useAppSelector } from '../../../store';
import { useGetMoneyMovesQuery } from '../../../api/alor.api';
import { useSearchParams } from 'react-router-dom';
import { moneyFormat } from '../../../common/utils';
import { summ } from '../../../App';

interface ProfitWidgetProps {
  data: { time: string; value: number }[];
  isLoading: boolean;
  colors?: Record<string, string>;
  initBalance: number;
  /** Позиции за период (без summary-строк) */
  nonSummaryPositions: Record<string, unknown>[];
  /** Внутри табов аналитики — без внешней обёртки widget */
  embedded?: boolean;
}

const ProfitWidget = ({ data, isLoading, colors, initBalance, nonSummaryPositions, embedded }: ProfitWidgetProps) => {
  const [searchParams] = useSearchParams();
  let dateFrom = searchParams.get('dateFrom');
  if (!dateFrom) {
    dateFrom = moment().startOf('month').format('YYYY-MM-DD');
  }
  let dateTo = searchParams.get('dateTo');
  if (!dateTo) {
    dateTo = moment().endOf('month').add(1, 'day').format('YYYY-MM-DD');
  }

  const settings = useAppSelector((state) => state.alorSlice.settings);
  const userInfo = useAppSelector((state) => state.alorSlice.userInfo);

  const { data: moneyMoves = [] } = useGetMoneyMovesQuery(
    {
      agreementNumber: settings.agreement,
      dateFrom,
      dateTo,
    },
    {
      skip: !userInfo || !settings.agreement,
      refetchOnMountOrArgChange: true,
    },
  );

  const moneyMovesMap = useMemo(
    () =>
      moneyMoves
        .filter((mM) => !['Комиссия брокера', 'Комиссия депозитария'].includes(mM.title))
        .reduce((acc, curr) => {
          if (!curr.sum) {
            return acc;
          }

          const date = moment(curr.date).format('YYYY-MM-DD');
          if (!acc[date]) {
            acc[date] = 0;
          }

          let multi = 1;

          if (curr.subType === MoneyMovesSearch.Transfer && curr.accountTo !== settings.portfolio) {
            multi = -1;
          }
          if (curr.subType === MoneyMovesSearch.Input) {
            multi = 1;
          }

          if (curr.status === Status.Resolved || curr.status === Status.executing) {
            acc[date] += curr.sum * multi;
          }

          return acc;
        }, {} as Record<string, number>),
    [moneyMoves, settings.portfolio],
  );

  const test = useMemo(() => {
    const firstDate = (moneyMoves.length < 1 ? moment() : moment(moneyMoves.slice(-1)[0].date)).format('YYYY-MM-DD');
    const lastDate = moment().format('YYYY-MM-DD');

    const dates = enumerateDaysBetweenDates(firstDate, lastDate);

    return dates.reduce((acc, curr, i, items) => {
      const prevIndex = i === 0 ? 0 : i - 1;
      const prevDate = items[prevIndex];
      const currDate = items[i];
      const prevValue = i === 0 ? 0 : acc[prevDate] || 0;
      const currValue = moneyMovesMap[currDate] || 0;

      acc[curr] = prevValue + currValue;

      return acc;
    }, {} as Record<string, number>);
  }, [moneyMovesMap, moneyMoves]);

  const _data = useMemo(() => {
    const result: { time: string; value: number }[] = [];

    data.forEach((d, i) => {
      if (d.value === 0) {
        if (i > 0) {
          d.value = data[i - 1].value;
        } else if (data.length > 1) {
          d.value = data[1].value;
        }
      }

      result.push({ ...d, value: d.value - initBalance - (test[d.time] || 0) });
    });

    return result;
  }, [data, test, initBalance]);

  const balance = useMemo(() => data.slice(-1)[0]?.value || 0, [data]);

  const chartPnL = useMemo(() => _data.slice(-1)[0]?.value ?? 0, [_data]);

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

  const pnlValue = chartPnL;
  const isProfit = pnlValue >= 0;

  return (
    <div className={embedded ? 'analytics-profit-widget analytics-profit-widget--embedded' : 'widget analytics-profit-widget'}>
      {isLoading ? (
        <Spinner />
      ) : (
        <>
          <div className="analytics-profit-chart">
            <TVChart
              colors={colors}
              fitContent
              seriesType="baseLine"
              pnlChart
              showPnLLastLine
              balance={balance}
              data={_data}
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
      )}
    </div>
  );
};

export default ProfitWidget;
