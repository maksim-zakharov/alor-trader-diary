import React, { FC, useMemo, useState } from 'react';
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
import { buildCumulativePnLSeriesFromDiary } from '../../utils';
import { AnalyticsView, AnalyticsViewTabs } from './AnalyticsViewTabs';

interface IProps {
  data: any;
  dateFrom: any;
  dateTo?: string;
  isLoading: boolean;
  getListSectionBySymbol: any;
  getIsinBySymbol: any;
  /** Встроен в дневник над таблицей */
  embedded?: boolean;
}

const ANALYTICS_VIEW_STORAGE_KEY = 'analyticsMainView';

const Analytics: FC<IProps> = ({ getIsinBySymbol, getListSectionBySymbol, data, dateTo, dateFrom, isLoading, embedded }) => {
  const [analyticsView, setAnalyticsView] = useState<AnalyticsView>(() => {
    const saved = localStorage.getItem(ANALYTICS_VIEW_STORAGE_KEY);
    return saved === 'metrics' || saved === 'symbols' ? saved : 'profit';
  });

  const handleAnalyticsViewChange = (view: AnalyticsView) => {
    setAnalyticsView(view);
    localStorage.setItem(ANALYTICS_VIEW_STORAGE_KEY, view);
  };

  const [nightMode] = useState(true);

  const darkColors = useAppSelector((state) => state.alorSlice.darkColors);

  const chartColors = useMemo(
    () => ({
      ...darkColors,
      color: ANALYTICS_CHART_TEXT_COLOR,
      borderColor: ANALYTICS_CHART_GRID_COLOR,
    }),
    [darkColors],
  );

  const pnlSeriesData = useMemo(
    () => buildCumulativePnLSeriesFromDiary(data.positions, dateFrom, dateTo),
    [data.positions, dateFrom, dateTo],
  );

  const tradingDays = useMemo(() => data.positions.filter((p) => p.type === 'summary'), [data.positions]);
  const nonSummaryPositions: any[] = useMemo(
    () => data.positions.filter((p) => p.type !== 'summary'),
    [data.positions],
  );

  return (
    <div className={embedded ? 'diary-analytics-panel' : 'analytics-page flex flex-col gap-1 mt-1'}>
      <AnalyticsViewTabs
        value={analyticsView}
        onChange={handleAnalyticsViewChange}
        profitContent={
          <ProfitWidget
            embedded
            isLoading={isLoading}
            colors={nightMode && chartColors}
            chartData={pnlSeriesData}
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
              chartData={pnlSeriesData}
            />
          </div>
        }
        symbolsContent={
          <SymbolsWidget
            embedded
            nonSummaryPositions={nonSummaryPositions}
            isLoading={isLoading}
            chartData={pnlSeriesData}
          />
        }
      />
    </div>
  );
};

export default Analytics;
