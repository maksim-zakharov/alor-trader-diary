import React, { FC, ReactNode } from 'react';
import { AppstoreOutlined, BarChartOutlined, LineChartOutlined } from '@ant-design/icons';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export type AnalyticsView = 'profit' | 'metrics' | 'symbols';

interface AnalyticsViewTabsProps {
  /** Текущая вкладка */
  value: AnalyticsView;
  /** Смена вкладки */
  onChange: (value: AnalyticsView) => void;
  /** График доходности */
  profitContent: ReactNode;
  /** Карточки метрик */
  metricsContent: ReactNode;
  /** График по тикерам */
  symbolsContent: ReactNode;
}

/**
 * Переключатель основных блоков аналитики: доходность / метрики / тикеры.
 */
export const AnalyticsViewTabs: FC<AnalyticsViewTabsProps> = ({
  value,
  onChange,
  profitContent,
  metricsContent,
  symbolsContent,
}) => (
  <Tabs
    value={value}
    onValueChange={(next) => onChange(next as AnalyticsView)}
    className="analytics-view-tabs"
  >
    <div className="widget analytics-tabbed-widget">
      <TabsList className="analytics-main-tabs">
        <TabsTrigger value="profit" aria-label="График доходности" title="График доходности">
          <LineChartOutlined />
        </TabsTrigger>
        <TabsTrigger value="metrics" aria-label="Метрики" title="Метрики">
          <AppstoreOutlined />
        </TabsTrigger>
        <TabsTrigger value="symbols" aria-label="По тикерам" title="По тикерам">
          <BarChartOutlined />
        </TabsTrigger>
      </TabsList>

      <TabsContent value="profit" className="analytics-tab-panel">
        {profitContent}
      </TabsContent>
      <TabsContent value="metrics" className="analytics-tab-panel analytics-tab-panel--metrics">
        {metricsContent}
      </TabsContent>
      <TabsContent value="symbols" className="analytics-tab-panel">
        {symbolsContent}
      </TabsContent>
    </div>
  </Tabs>
);
