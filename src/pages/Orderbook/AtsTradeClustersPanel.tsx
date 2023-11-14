import AtsTradeClusters from './AtsTradeClusters';
import { FC, useEffect, useMemo, useRef, useState } from 'react';
import { Alltrade, Side, Timeframe, Trade } from 'alor-api';
import * as moment from 'moment';
import { fillCanvas, shortNumberFormat } from '../../common/utils';
import { scaleLinear } from 'd3';

interface IProps {
  xAxisStep: number;
  dataContext: any;
  themeSettings: any;
  columnsCount?: number;
}

type TradesCluster = any;
type ScalperOrderBookWidgetSettings = any;
type TradesClusterPanelSettings = any;
type ClusterTimeframe = any;
type ThemeSettings = any;
type AllTradesItem = any;
interface LayerDrawer {
  zIndex: number;
  draw: () => void;
}

const AtsTradeClustersPanel: FC<IProps> = ({
  dataContext,
  xAxisStep,
  themeSettings,
  columnsCount = 2,
}) => {
  const itemWidth = 44;
  const itemHeight = xAxisStep - 0.04;

  const displayRows = dataContext.displayRows;

  const clusters = useMemo(() => {
    const buffer = {};
    const columns = new Set<number>();

    for (let i = 0; i < dataContext.trades.length; i++) {
      const trade = dataContext.trades[i] as Alltrade;
      const tradeTimeUTC = trade.timestamp / 1000;
      const tradeTimeframeTime = tradeTimeUTC - (tradeTimeUTC % Timeframe.Min5);
      if (!columns.has(tradeTimeframeTime)) {
        columns.add(tradeTimeframeTime);
      }

      const clusterKey = `${trade.price}-${tradeTimeframeTime}`;
      if (!buffer[clusterKey]) {
        buffer[clusterKey] = {
          trades: { [trade.id]: trade },
          volume: trade.qty,
        };
      } else {
        if (!buffer[clusterKey].trades[trade.id]) {
          buffer[clusterKey].trades[trade.id] = trade;
          buffer[clusterKey].volume += trade.qty;
        }
      }

      const totalQty = Object.values(buffer[clusterKey].trades).reduce(
        (acc: number, curr: Alltrade) =>
          acc + (curr.side === Side.Buy ? curr.qty : -curr.qty),
        0,
      );

      buffer[clusterKey].side =
        totalQty > 0 ? Side.Buy : totalQty < 0 ? Side.Sell : undefined;
    }

    return {
      columns: Array.from(columns).reverse().slice(-columnsCount),
      data: buffer,
    };
  }, [dataContext.trades.length, columnsCount]);

  const ref = useRef<HTMLCanvasElement>();

  useEffect(() => {
    if (!ref.current || !displayRows.length) {
      return;
    }

    const canvas = fillCanvas(
      ref.current!,
      itemWidth * clusters.columns.length + clusters.columns.length,
      displayRows.length * xAxisStep,
    );

    draw(canvas, themeSettings, displayRows, clusters);
  }, [displayRows, clusters, ref.current]);

  const draw = (
    canvas: HTMLCanvasElement,
    themeSettings: ThemeSettings,
    displayRows: any[],
    clustersMap: any,
  ) => {
    const context = canvas.getContext('2d')!;
    const xScale = scaleLinear([0, canvas.width]).domain([0, canvas.width]);
    const yScale = scaleLinear([0, canvas.height]).domain([
      0,
      displayRows.length,
    ]);

    let layers: LayerDrawer[] = [];

    const tradeItemFontSettings = {
      fontFace: 'Arial',
      fontSize: 12,
    };

    const itemX = 1;
    const itemY = 1;

    const textPadding = { xPad: 2, yPad: 4 };

    clustersMap.columns.forEach((column, columnIndex) => {
      displayRows.forEach((row, index) => {
        context.lineWidth = 1;
        context.strokeStyle = 'rgb(44,60,75)';

        if (clusters.data[`${row.price}-${column}`]?.side) {
          context.fillStyle =
            clusters.data[`${row.price}-${column}`]?.side === Side.Buy
              ? themeSettings.themeColors.buyColorBackground
              : themeSettings.themeColors.sellColorBackground;
          context.fillRect(
            itemX + columnIndex * itemWidth,
            itemY + index * itemHeight,
            itemWidth,
            itemHeight,
          );
        }

        context.fill();
        context.fillStyle = themeSettings.themeColors.textColor;
        context.font = `${tradeItemFontSettings.fontSize}px ${tradeItemFontSettings.fontFace}`;
        context.fillText(
          shortNumberFormat(
            clusters.data[`${row.price}-${column}`]?.volume || 0,
          ),
          itemX + columnIndex * itemWidth + textPadding.xPad,
          itemY + index * itemHeight + itemHeight - textPadding.yPad,
        );
        context.strokeRect(
          itemX + columnIndex * itemWidth,
          itemY + index * itemHeight,
          itemWidth,
          itemHeight,
        );
      });
    });

    layers
      .sort((a, b) => {
        if (a.zIndex < b.zIndex) {
          return -1;
        }

        if (a.zIndex > b.zIndex) {
          return 1;
        }

        return 0;
      })
      .forEach((x) => x.draw());
  };

  const toDisplayClusters = (
    allClusters: TradesCluster[],
    settings: TradesClusterPanelSettings,
  ): TradesCluster[] => {
    const intervalsToDisplay = getDisplayIntervals(
      settings.timeframe,
      settings.displayIntervalsCount,
    );
    const displayClusters: TradesCluster[] = [];

    for (let interval of intervalsToDisplay) {
      const cluster = allClusters.find((c) => c.timestamp === interval);
      displayClusters.push({
        ...cluster,
        timestamp: interval,
        tradeClusters: cluster?.tradeClusters ?? [],
      });
    }

    return displayClusters;
  };

  const getDisplayIntervals = (
    timeframe: ClusterTimeframe,
    displayIntervalsCount: number,
  ): number[] => {
    const periodStart = 0;
    getPeriodStart(new Date().getTime() / 1000, timeframe);

    const intervals = [periodStart];
    for (let i = 1; i < displayIntervalsCount; i++) {
      const newInterval = Math.floor(intervals[i - 1] - timeframe);
      intervals.push(newInterval);
    }

    return intervals;
  };

  const getPeriodStart = (
    unixTime: number,
    timeframe: ClusterTimeframe,
  ): number => {
    return Math.floor(Math.floor(unixTime / timeframe) * timeframe);
  };

  return (
    <div className="container">
      <canvas ref={ref}></canvas>
      {/*<div*/}
      {/*  className="cluster-wrapper"*/}
      {/*  style={{ display: 'flex', flexDirection: 'row' }}*/}
      {/*>*/}
      {/*  {clusters.columns.map((column) => (*/}
      {/*    <div className="column" key={`cluster-column-${column}`}>*/}
      {/*      {displayRows.map((row) => (*/}
      {/*        <div*/}
      {/*          key={`cluster-row-${row.price}-${column}`}*/}
      {/*          className="cluster"*/}
      {/*          style={{*/}
      {/*            height: xAxisStep + 'px',*/}
      {/*            lineHeight: xAxisStep + 'px',*/}
      {/*            fontSize: '12px',*/}
      {/*          }}*/}
      {/*        >*/}
      {/*          {Intl.NumberFormat('en', {*/}
      {/*            notation: 'compact',*/}
      {/*            maximumFractionDigits: 2,*/}
      {/*          }).format(clusters.data[`${row.price}-${column}`]?.volume || 0)}*/}
      {/*        </div>*/}
      {/*      ))}*/}
      {/*      <div key={`cluster-time-${column}`} className="cluster">*/}
      {/*        {moment(column * 1000).format('HH:mm')}*/}
      {/*      </div>*/}
      {/*    </div>*/}
      {/*  ))}*/}
      {/*{clusters.map((cluster) => (*/}
      {/*  <AtsTradeClusters*/}
      {/*    cluster={cluster}*/}
      {/*    xAxisStep={xAxisStep}*/}
      {/*    dataContext={dataContext}*/}
      {/*  />*/}
      {/*))}*/}
      {/*</div>*/}
    </div>
  );
};

export default AtsTradeClustersPanel;
