import {
  FC,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
// @ts-ignore
import { ScaleLinear, scaleLinear } from 'd3';
import { AlorApi, Exchange, fromTo } from 'alor-api';
import { ThemeColors } from './AtsScalperOrderBookBody';
import { fillCanvas } from '../../common/utils';

interface DrewItemMeta {
  xLeft: number;

  xRight: number;

  yTop: number;

  yBottom: number;

  connectionColor: string;
}
interface LayerDrawer {
  zIndex: number;
  draw: () => void;
}

interface TradeDisplay {
  rowIndex: number;

  volume: number;

  color: 'red' | 'green';
}

interface ItemMeasurements {
  xLeft: number;
  xRight: number;
  yTop: number;
  yBottom: number;
}

type ThemeSettings = any;
type AllTradesItem = any;

interface IProps {
  xAxisStep: number;
  dataContext: any;
  themeSettings: any;
  maxWidth?: number;
}

const TradesPanel: FC<IProps> = ({
  dataContext,
  xAxisStep,
  themeSettings,
  maxWidth = 200,
}) => {
  const containerRef = useRef<HTMLDivElement>();
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useLayoutEffect(() => {
    if (containerRef.current) {
      setDimensions({
        width: containerRef.current.offsetWidth,
        height: containerRef.current.offsetHeight,
      });
    }
  }, [containerRef.current?.offsetWidth]);

  const ref = useRef<HTMLCanvasElement>();

  const priceItems = useMemo(() => {
    return !dataContext.displayRange
      ? []
      : dataContext.orderBookBody
          .slice(
            dataContext.displayRange!.start,
            Math.min(
              dataContext.displayRange!.end + 1,
              dataContext.orderBookBody.length,
            ),
          )
          .map((x) => x.price);
  }, [dataContext]);

  useEffect(() => {
    if (!ref.current || !priceItems.length) {
      return;
    }

    const canvas = fillCanvas(
      ref.current!,
      dimensions.width > maxWidth ? maxWidth : dimensions.width,
      priceItems.length * xAxisStep,
    );

    draw(canvas, themeSettings, priceItems, dataContext.trades);
  }, [priceItems, dataContext.trades.length, ref.current]);

  const zIndexes = {
    gridLines: 0,
    item: 10,
    itemsConnector: 5,
  };

  const tradeItemFontSettings = {
    fontFace: 'Arial',
    fontSize: 10,
  };

  const margins = {
    tradePoint: {
      top: 3,
      bottom: 3,
      itemsGap: 2,
      text: {
        left: 2,
        right: 2,
      },
    },
  };

  const getCenter = (start: number, end: number): number => {
    return start + (end - start) / 2;
  };

  const draw = (
    canvas: HTMLCanvasElement,
    themeSettings: ThemeSettings,
    priceItems: number[],
    orderedTrades: AllTradesItem[],
  ) => {
    const context = canvas.getContext('2d')!;
    const xScale = scaleLinear([0, canvas.width]).domain([0, canvas.width]);
    const yScale = scaleLinear([0, canvas.height]).domain([
      0,
      priceItems.length,
    ]);

    let layers: LayerDrawer[] = [];

    layers.push(
      drawGridLines(
        priceItems.length,
        xScale,
        yScale,
        context,
        themeSettings.themeColors,
      ),
    );

    const itemsDraws: LayerDrawer[] = [];
    let prevItem: DrewItemMeta | null = null;
    for (const trade of orderedTrades) {
      const currentItem = drawTrade(
        trade,
        priceItems,
        prevItem,
        xScale,
        yScale,
        context,
        themeSettings.themeColors,
      );

      if (currentItem.meta.xRight < 0) {
        break;
      }

      itemsDraws.push(currentItem.drawer);

      if (!!prevItem) {
        layers.push(
          drawItemsConnection(
            currentItem.meta,
            prevItem,
            prevItem.connectionColor,
            context,
          ),
        );
      }

      prevItem = currentItem.meta;
    }

    layers = [...layers, ...itemsDraws.reverse()];

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

  const drawTrade = (
    trade: AllTradesItem,
    priceItems: number[],
    prevItem: DrewItemMeta | null,
    xScale: ScaleLinear<number, number>,
    yScale: ScaleLinear<number, number>,
    context: CanvasRenderingContext2D,
    themeColors: ThemeColors,
  ): { meta: DrewItemMeta; drawer: LayerDrawer } => {
    const mappedPriceIndex = priceItems.indexOf(trade.price);
    const tradeDisplay: TradeDisplay = {
      rowIndex: mappedPriceIndex,
      color: trade.side === 'buy' ? 'green' : 'red',
      volume: trade.qty,
    };

    let currentItem: { meta: DrewItemMeta; drawer: LayerDrawer };
    if (mappedPriceIndex < 0) {
      if (
        trade.price < priceItems[0] &&
        trade.price > priceItems[priceItems.length - 1]
      ) {
        currentItem = drawMissingPriceItem(
          {
            ...tradeDisplay,
            rowIndex: getNearestPriceIndex(trade, priceItems),
          },
          prevItem,
          xScale,
          yScale,
          context,
          themeColors,
        );
      } else {
        currentItem = drawOuterItem(
          {
            ...tradeDisplay,
            rowIndex: trade.price > priceItems[0] ? 0 : priceItems.length,
          },
          prevItem,
          xScale,
          yScale,
          context,
          themeColors,
        );
      }
    } else {
      currentItem = drawItemWithVolume(
        tradeDisplay,
        prevItem,
        xScale,
        yScale,
        context,
        themeColors,
      );
    }

    return currentItem;
  };

  const getNearestPriceIndex = (
    trade: AllTradesItem,
    priceItems: number[],
  ): number => {
    let index = 0;
    for (let i = priceItems.length - 1; i >= 0; i--) {
      if (trade.price < priceItems[i]) {
        break;
      }

      index = i;
    }

    return index;
  };

  const drawItemsConnection = (
    item1Meta: DrewItemMeta,
    item2Meta: DrewItemMeta,
    color: string,
    context: CanvasRenderingContext2D,
  ): LayerDrawer => {
    return {
      zIndex: zIndexes.itemsConnector,
      draw: () => {
        context.beginPath();
        context.moveTo(getMetaCenterX(item1Meta)!, getMetaCenterY(item1Meta)!);
        context.lineTo(getMetaCenterX(item2Meta)!, getMetaCenterY(item2Meta)!);
        context.strokeStyle = color;
        context.lineWidth = 1;
        context.stroke();
      },
    };
  };

  const drawItemWithVolume = (
    item: TradeDisplay,
    prevItemMeta: DrewItemMeta | null,
    xScale: ScaleLinear<number, number>,
    yScale: ScaleLinear<number, number>,
    context: CanvasRenderingContext2D,
    themeColors: ThemeColors,
  ): { meta: DrewItemMeta; drawer: LayerDrawer } => {
    const itemText = item.volume.toString();
    const itemMeasurements = getItemWithVolumeMeasurements(
      itemText,
      item.rowIndex,
      prevItemMeta,
      xScale,
      yScale,
      context,
    );

    const itemWidth = itemMeasurements.xRight - itemMeasurements.xLeft;
    const itemHeight = itemMeasurements.yBottom - itemMeasurements.yTop;
    const xCenter = itemMeasurements.xLeft + itemWidth / 2;
    const yCenter = itemMeasurements.yTop + itemHeight / 2;

    const draw = () => {
      context.fillStyle =
        item.color === 'green' ? themeColors.buyColor : themeColors.sellColor;
      drawRoundedRect(
        itemMeasurements.xLeft,
        itemMeasurements.yTop,
        itemWidth,
        itemHeight,
        2,
        context,
      );
      context.fill();
      context.fillStyle = themeColors.buySellLabelColor;
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillText(itemText, xCenter, yCenter);
    };

    return {
      drawer: {
        zIndex: zIndexes.item,
        draw,
      },
      meta: {
        xLeft: itemMeasurements.xLeft,
        xRight: itemMeasurements.xRight,
        yTop: itemMeasurements.yTop,
        yBottom: itemMeasurements.yBottom,
        connectionColor:
          item.color === 'green'
            ? themeColors.buyColorBackground
            : themeColors.sellColorBackground,
      },
    };
  };

  const drawMissingPriceItem = (
    item: TradeDisplay,
    prevItemMeta: DrewItemMeta | null,
    xScale: ScaleLinear<number, number>,
    yScale: ScaleLinear<number, number>,
    context: CanvasRenderingContext2D,
    themeColors: ThemeColors,
  ): { meta: DrewItemMeta; drawer: LayerDrawer } => {
    const itemText = item.volume.toString();
    const itemMeasurements = getItemWithVolumeMeasurements(
      itemText,
      item.rowIndex,
      prevItemMeta,
      xScale,
      yScale,
      context,
    );

    const itemWidth = itemMeasurements.xRight - itemMeasurements.xLeft;
    const itemHeight = itemMeasurements.yBottom - itemMeasurements.yTop;
    const xCenter = itemMeasurements.xLeft + itemWidth / 2;
    const yCenter = itemMeasurements.yTop + itemHeight / 2;

    const draw = () => {
      context.strokeStyle =
        item.color === 'green' ? themeColors.buyColor : themeColors.sellColor;
      drawRoundedRect(
        itemMeasurements.xLeft,
        itemMeasurements.yTop,
        itemWidth,
        itemHeight,
        2,
        context,
      );
      context.stroke();
      context.fillStyle = themeColors.buySellLabelColor;
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillText(itemText, xCenter, yCenter);
    };

    return {
      drawer: {
        zIndex: zIndexes.item,
        draw,
      },
      meta: {
        xLeft: itemMeasurements.xLeft,
        xRight: itemMeasurements.xRight,
        yTop: itemMeasurements.yTop,
        yBottom: itemMeasurements.yBottom,
        connectionColor:
          item.color === 'green'
            ? themeColors.buyColorBackground
            : themeColors.sellColorBackground,
      },
    };
  };

  const drawOuterItem = (
    item: TradeDisplay,
    prevItemMeta: DrewItemMeta | null,
    xScale: ScaleLinear<number, number>,
    yScale: ScaleLinear<number, number>,
    context: CanvasRenderingContext2D,
    themeColors: ThemeColors,
  ): { meta: DrewItemMeta; drawer: LayerDrawer } => {
    const measurements = getItemWithVolumeMeasurements(
      item.volume.toString(),
      item.rowIndex,
      prevItemMeta,
      xScale,
      yScale,
      context,
    );

    const x =
      measurements.xLeft + (measurements.xRight - measurements.xLeft) / 2;
    const y = yScale(item.rowIndex);

    const draw = () => {
      context.beginPath();
      context.arc(x, y, 2, 0, 2 * Math.PI, false);
      context.strokeStyle =
        item.color === 'green' ? themeColors.buyColor : themeColors.sellColor;
      context.fillStyle =
        item.color === 'green'
          ? themeColors.buyColorBackground
          : themeColors.sellColorBackground;
      context.stroke();
      context.fill();
    };

    return {
      drawer: {
        zIndex: zIndexes.item,
        draw,
      },
      meta: {
        xLeft: measurements.xLeft,
        xRight: measurements.xRight,
        yTop: measurements.yTop,
        yBottom: measurements.yBottom,
        connectionColor:
          item.color === 'green'
            ? themeColors.buyColorBackground
            : themeColors.sellColorBackground,
      },
    };
  };

  const getItemWithVolumeMeasurements = (
    itemText: string,
    rowIndex: number,
    prevItemMeta: DrewItemMeta | null,
    xScale: ScaleLinear<number, number>,
    yScale: ScaleLinear<number, number>,
    context: CanvasRenderingContext2D,
  ): ItemMeasurements => {
    const prevLeftBound = prevItemMeta?.xLeft ?? xScale(xScale.domain()[1]);
    const yTop = yScale(rowIndex) + margins.tradePoint.top;
    const yBottom = yScale(rowIndex) + xAxisStep - margins.tradePoint.bottom;
    let xRight = prevLeftBound - margins.tradePoint.itemsGap;

    if (
      !!prevItemMeta &&
      getMetaCenterY(prevItemMeta) !== getCenter(yTop, yBottom)
    ) {
      xRight = getMetaCenterX(prevItemMeta)! - margins.tradePoint.itemsGap;
    }

    context.font = `${tradeItemFontSettings.fontSize}px ${tradeItemFontSettings.fontFace}`;
    const textMetrics = context.measureText(itemText);
    const textWidth = Math.ceil(textMetrics.width);
    const textMargins =
      margins.tradePoint.text.left + margins.tradePoint.text.right;

    const itemHeight = yBottom - yTop;
    let itemWidth = Math.max(itemHeight, textWidth);
    const marginDiff = itemWidth - textWidth;
    if (marginDiff < textMargins) {
      itemWidth = itemWidth + textMargins - marginDiff;
    }

    return {
      xLeft: xRight - itemWidth,
      xRight,
      yTop,
      yBottom,
    };
  };

  const drawGridLines = (
    rowsCount: number,
    xScale: ScaleLinear<number, number>,
    yScale: ScaleLinear<number, number>,
    context: CanvasRenderingContext2D,
    themeColors: ThemeColors,
  ): LayerDrawer => {
    const draw = () => {
      for (let i = 5; i < rowsCount; i = i + 5) {
        context.beginPath();
        context.moveTo(xScale(0), yScale(i) - 0.5);
        context.lineTo(xScale(xScale.domain()[1]), yScale(i));
        context.strokeStyle = themeColors.chartGridColor;
        context.lineWidth = 1;
        context.stroke();
      }
    };

    return {
      zIndex: zIndexes.gridLines,
      draw,
    };
  };

  const drawRoundedRect = (
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number,
    context: CanvasRenderingContext2D,
  ) => {
    context.beginPath();
    context.moveTo(x + radius, y);
    context.arcTo(x + width, y, x + width, y + height, radius);
    context.arcTo(x + width, y + height, x, y + height, radius);
    context.arcTo(x, y + height, x, y, radius);
    context.arcTo(x, y, x + width, y, radius);
    context.closePath();
  };

  const getMetaCenterX = (item: DrewItemMeta | null): number | null => {
    if (!item) {
      return null;
    }

    return getCenter(item.xLeft, item.xRight);
  };

  const getMetaCenterY = (item: DrewItemMeta | null): number | null => {
    if (!item) {
      return null;
    }

    return getCenter(item.yTop, item.yBottom);
  };

  const mediumTradeVolume = useMemo(() => {
    const trades = [...dataContext.trades].sort((a, b) => b.qty - a.qty);

    return trades[Math.floor(trades.length / 2)]?.qty;
  }, [dataContext.trades.length]);

  const mediumTradesPerSecond = useMemo(() => {
    const trades = [...dataContext.trades]
      .sort((a, b) => b.timestamp - a.timestamp)
      .reduce((acc, { timestamp }) => {
        if (!acc.length || acc[0][0] !== timestamp) {
          acc.push([timestamp, 1]);
        } else if (acc[0][0] === timestamp) {
          acc[0][1]++;
        }

        return acc;
      }, []);

    const sorted = [...trades].sort((a, b) => b[1] - a[1]);

    return {
      medium: sorted[Math.floor(sorted.length / 2)]?.[1],
      current: trades[0]?.[1] || 0,
    };
  }, [dataContext.trades.length]);

  return (
    <div
      className="container"
      style={{ display: 'flex', flexDirection: 'column' }}
      ref={containerRef}
    >
      <canvas ref={ref}></canvas>
      {/*<div style={{ color: 'rgb(140,167,190)' }}>*/}
      {/*  mV: {mediumTradeVolume}lts mS: {mediumTradesPerSecond.medium}tps cs:{' '}*/}
      {/*  {mediumTradesPerSecond.current}tps*/}
      {/*</div>*/}
    </div>
  );
};

export default TradesPanel;
