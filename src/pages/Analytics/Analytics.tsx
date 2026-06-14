import React, { FC, useMemo, useState } from 'react';
import { Exchange } from 'alor-api';
import ProfitIntervalWidget from './widgets/ProfitIntervalWidget';
import LossIntervalWidget from './widgets/LossIntervalWidget';
import MaxProfitTradesWidget from './widgets/MaxProfitTradesWidget';
import MaxLossTradesWidget from './widgets/MaxLossTradesWidget';
import LossTimeWidget from './widgets/LossTimeWidget';
import ProfitTimeWidget from './widgets/ProfitTimeWidget';
import SymbolsWidget from './widgets/SymbolsWidget';
import ReportWidget from './widgets/ReportWidget';
import ProfitWidget from './widgets/ProfitWidget';
import ProfitWeekdayWidget from './widgets/ProfitWeekdayWidget';
import LossWeekdayWidget from './widgets/LossWeekdayWidget';
import ProfitSectionWidget from './widgets/ProfitSectionWidget';
import LossSectionWidget from './widgets/LossSectionWidget';
import { ANALYTICS_CHART_GRID_COLOR, ANALYTICS_CHART_TEXT_COLOR } from './analytics-chart-colors';
import { useAppSelector } from '../../store';
import moment from 'moment';
import { useGetEquityDynamicsQuery, useGetSummaryQuery } from '../../api/alor.api';
import { AnalyticsView, AnalyticsViewTabs } from './AnalyticsViewTabs';

interface IProps {
  data: any;
  dateFrom: any;
  dateTo?: string;
  isLoading: boolean;
  getListSectionBySymbol: any;
  getIsinBySymbol: any;
}

const ANALYTICS_VIEW_STORAGE_KEY = 'analyticsMainView';

const Analytics: FC<IProps> = ({ getIsinBySymbol, getListSectionBySymbol, data, dateTo, dateFrom, isLoading }) => {
  const [analyticsView, setAnalyticsView] = useState<AnalyticsView>(() => {
    const saved = localStorage.getItem(ANALYTICS_VIEW_STORAGE_KEY);
    return saved === 'metrics' || saved === 'symbols' ? saved : 'profit';
  });

  const handleAnalyticsViewChange = (view: AnalyticsView) => {
    setAnalyticsView(view);
    localStorage.setItem(ANALYTICS_VIEW_STORAGE_KEY, view);
  };

  const settings = useAppSelector((state) => state.alorSlice.settings);
  const userInfo = useAppSelector((state) => state.alorSlice.userInfo);

  const { data: summary } = useGetSummaryQuery(
    {
      exchange: Exchange.MOEX,
      format: 'Simple',
      portfolio: settings.portfolio,
    },
    {
      skip: !userInfo || !settings.portfolio,
    },
  );

  const { data: _equityDynamics } = useGetEquityDynamicsQuery(
    {
      startDate: moment(dateFrom).add(-1, 'day').format('YYYY-MM-DD'),
      endDate: dateTo,
      portfolio: settings.portfolio,
      agreementNumber: settings.agreement,
    },
    {
      skip: !userInfo || !settings.portfolio || !settings.agreement || !dateFrom,
    },
  );

  const equityDynamics = useMemo(() => {
    if (!summary) {
      return {
        portfolioValues: [],
      };
    }
    if (!_equityDynamics && summary) {
      return {
        portfolioValues: [
          {
            date: moment().format('YYYY-MM-DD'),
            value: summary.portfolioLiquidationValue,
          } as any,
        ],
      };
    }

    const result = JSON.parse(JSON.stringify(_equityDynamics));

    const lastValue = result.portfolioValues.slice(-1)[0];
    if (lastValue && moment(lastValue.date).isBefore(moment()) && moment(dateTo).isAfter(moment())) {
      result.portfolioValues.push({
        date: moment().format('YYYY-MM-DDTHH:mm:ss'),
        value: summary.portfolioLiquidationValue,
      } as any);
    }

    result.portfolioValues = result.portfolioValues.filter((p) => !!p.value);

    return result;
  }, [_equityDynamics, summary, dateTo]);

  const balanceSeriesData = useMemo(
    () =>
      equityDynamics?.portfolioValues.map((v) => ({
        time: moment(v.date).format('YYYY-MM-DD'),
        value: v.value,
      })) || [],
    [equityDynamics?.portfolioValues],
  );

  const [nightMode] = useState(true);

  const balanceSeriesDataWithoutFirst = useMemo(() => balanceSeriesData.slice(1), [balanceSeriesData]);

  const darkColors = useAppSelector((state) => state.alorSlice.darkColors);

  const chartColors = useMemo(
    () => ({
      ...darkColors,
      color: ANALYTICS_CHART_TEXT_COLOR,
      borderColor: ANALYTICS_CHART_GRID_COLOR,
    }),
    [darkColors],
  );

  const tradingDays = useMemo(() => data.positions.filter((p) => p.type === 'summary'), [data.positions]);
  const nonSummaryPositions: any[] = useMemo(
    () => data.positions.filter((p) => p.type !== 'summary'),
    [data.positions],
  );

  return (
    <div className="analytics-page flex flex-col gap-1 mt-1">
      <AnalyticsViewTabs
        value={analyticsView}
        onChange={handleAnalyticsViewChange}
        profitContent={
          <ProfitWidget
            embedded
            isLoading={isLoading}
            colors={nightMode && chartColors}
            data={balanceSeriesDataWithoutFirst}
            initBalance={balanceSeriesData[0]?.value || 0}
            nonSummaryPositions={nonSummaryPositions}
          />
        }
        metricsContent={
          <div className="analytics-metrics-grid">
            <ProfitIntervalWidget nonSummaryPositions={nonSummaryPositions} isLoading={isLoading} />
            <LossIntervalWidget nonSummaryPositions={nonSummaryPositions} isLoading={isLoading} />
            <MaxProfitTradesWidget
              getIsinBySymbol={getIsinBySymbol}
              nonSummaryPositions={nonSummaryPositions}
              isLoading={isLoading}
            />
            <MaxLossTradesWidget
              getIsinBySymbol={getIsinBySymbol}
              nonSummaryPositions={nonSummaryPositions}
              isLoading={isLoading}
            />
            <ProfitTimeWidget nonSummaryPositions={nonSummaryPositions} isLoading={isLoading} />
            <LossTimeWidget nonSummaryPositions={nonSummaryPositions} isLoading={isLoading} />
            <ProfitWeekdayWidget nonSummaryPositions={nonSummaryPositions} isLoading={isLoading} />
            <LossWeekdayWidget nonSummaryPositions={nonSummaryPositions} isLoading={isLoading} />
            <ProfitSectionWidget
              nonSummaryPositions={nonSummaryPositions}
              isLoading={isLoading}
              getListSectionBySymbol={getListSectionBySymbol}
            />
            <LossSectionWidget
              nonSummaryPositions={nonSummaryPositions}
              isLoading={isLoading}
              getListSectionBySymbol={getListSectionBySymbol}
            />
            <ReportWidget
              nonSummaryPositions={nonSummaryPositions}
              isLoading={isLoading}
              tradingDays={tradingDays}
              data={balanceSeriesDataWithoutFirst}
            />
          </div>
        }
        symbolsContent={
          <SymbolsWidget
            embedded
            nightMode={nightMode}
            darkColors={chartColors}
            nonSummaryPositions={nonSummaryPositions}
            isLoading={isLoading}
          />
        }
      />
    </div>
  );
};

export default Analytics;
