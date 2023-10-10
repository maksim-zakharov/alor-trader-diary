import { FC, useMemo } from 'react';
import { Side } from 'alor-api';

export interface CurrentOrderDisplay {
  orderId: string;
  symbol: string;
  exchange: string;
  portfolio: string;
  type: 'limit' | 'stoplimit' | 'stop';

  side: Side;
  linkedPrice: number;
  displayVolume: number;
}

export interface PriceRow {
  price: number;
  isStartRow: boolean;
}

export enum ScalperOrderBookRowType {
  Ask = 'ask',
  Bid = 'bid',
  Spread = 'spread',
}

export interface BodyRow extends PriceRow {
  volume?: number | null;
  isBest?: boolean | null;

  rowType?: ScalperOrderBookRowType | null;

  isFiller: boolean;

  currentPositionRangeSign: number | null;
}

export interface ScalperOrderBookPositionState {
  price: number;
  qty: number;
  lossOrProfitPoints: number;
  lossOrProfitPercent: number;
}

interface IProps {
  dataContext: any;
  themeSettings: any;
  isActive: boolean;
  rowHeight: number;
  orderService: any;
  renderOrderTemplate?: any;
}
interface VolumeHighlightArguments {
  rowType: ScalperOrderBookRowType;
  volume: number;
  maxVolume: number;
}

type VolumeHighlightStrategy = (args: VolumeHighlightArguments) => any | null;

type ThemeSettings = any;

type ScalperOrderBookWidgetSettings = any;

type VolumeHighlightOption = any;

type DisplayRow = any;

export enum VolumeHighlightMode {
  BiggestVolume,
  VolumeBoundsWithFixedValue,
}

const OrderbookTable: FC<IProps> = ({
  dataContext,
  rowHeight,
  isActive,
  themeSettings,
  orderService,
  renderOrderTemplate,
}) => {
  const ordersSides = Side;

  const createBiggestVolumeHighlightStrategy = (
    themeSettings: ThemeSettings,
  ): VolumeHighlightStrategy => {
    return (args: VolumeHighlightArguments) => {
      if (
        (args.rowType !== ScalperOrderBookRowType.Ask &&
          args.rowType !== ScalperOrderBookRowType.Bid) ||
        !args.volume
      ) {
        return null;
      }

      const size = 100 * (args.volume / args.maxVolume);
      const color =
        args.rowType === ScalperOrderBookRowType.Bid
          ? themeSettings.themeColors.buyColorBackground
          : themeSettings.themeColors.sellColorBackground;

      return {
        background: `linear-gradient(90deg, ${color} ${size}% , rgba(0,0,0,0) ${size}%)`,
      };
    };
  };

  const volumeBoundsWithFixedValueStrategy = (
    settings: ScalperOrderBookWidgetSettings,
  ): VolumeHighlightStrategy => {
    return (args: VolumeHighlightArguments) => {
      if (
        (args.rowType !== ScalperOrderBookRowType.Ask &&
          args.rowType !== ScalperOrderBookRowType.Bid) ||
        !args.volume
      ) {
        return null;
      }

      let size = 0;
      const volumeHighlightOption = getVolumeHighlightOption(
        settings,
        args.volume,
      );
      if (!volumeHighlightOption) {
        return null;
      }

      if (!!settings.volumeHighlightFullness) {
        size = 100 * (args.volume / settings.volumeHighlightFullness);
        if (size > 100) {
          size = 100;
        }
      }

      return {
        background: `linear-gradient(90deg, ${volumeHighlightOption.color}BF ${size}% , rgba(0,0,0,0) ${size}%)`,
      };
    };
  };

  const getVolumeHighlightOption = (
    settings: ScalperOrderBookWidgetSettings,
    volume: number,
  ): VolumeHighlightOption | undefined => {
    return [...settings.volumeHighlightOptions]
      .sort((a, b) => b.boundary - a.boundary)
      .find((x) => volume >= x.boundary);
  };

  const getVolumeHighlightStrategy = (
    settings: ScalperOrderBookWidgetSettings,
    themeSettings: ThemeSettings,
  ): VolumeHighlightStrategy => {
    if (settings.volumeHighlightMode === VolumeHighlightMode.BiggestVolume) {
      return createBiggestVolumeHighlightStrategy(themeSettings);
    }

    if (
      settings.volumeHighlightMode ===
      VolumeHighlightMode.VolumeBoundsWithFixedValue
    ) {
      return volumeBoundsWithFixedValueStrategy(settings);
    }

    return () => null;
  };

  const displayItems = useMemo(() => {
    const {
      settings,
      orderBookBody: body,
      orderBookData,
      displayRange,
      currentOrders,
    } = dataContext;

    const displayRows = body.slice(
      displayRange!.start,
      Math.min(displayRange!.end + 1, body.length),
    );
    const minOrderPrice = Math.min(...currentOrders.map((x) => x.linkedPrice));
    const maxOrderPrice = Math.max(...currentOrders.map((x) => x.linkedPrice));
    const volumeHighlightStrategy = getVolumeHighlightStrategy(
      settings.widgetSettings,
      themeSettings,
    );
    const maxOrderBookVolume =
      settings.widgetSettings.volumeHighlightMode ===
      VolumeHighlightMode.BiggestVolume
        ? Math.max(...[...orderBookData.a, ...orderBookData.b].map((x) => x.v))
        : 0;

    return displayRows.map((row) => {
      const displayRow = {
        ...row,
        currentOrders: [],
        getVolumeStyle: () =>
          volumeHighlightStrategy({
            rowType: row.rowType!,
            volume: row.volume ?? 0,
            maxVolume: maxOrderBookVolume,
          }),
      } as DisplayRow;

      if (row.price >= minOrderPrice && row.price <= maxOrderPrice) {
        displayRow.currentOrders = currentOrders.filter(
          (x) => x.linkedPrice === row.price,
        );
      }

      return displayRow;
    });
  }, [dataContext]);

  const leftMouseClick = (e: React.MouseEvent, row: DisplayRow) => {
    e.preventDefault();
    e.stopPropagation();
    document.getSelection()?.removeAllRanges();

    if (row.rowType === 'bid') {
      orderService.sendLimitOrder({
        side: Side.Buy,
        price: row.price,
        qty: 1,
      });
    } else {
      orderService.sendStopLimitOrder({
        side: Side.Buy,
        price: row.price,
        qty: 1,
      });
    }

    // this.commandProcessorService.processLeftMouseClick(e, row, dataContext);
  };

  const rightMouseClick = (e: React.MouseEvent, row: DisplayRow) => {
    e.preventDefault();
    e.stopPropagation();
    document.getSelection()?.removeAllRanges();

    if (row.rowType === 'ask') {
      orderService.sendLimitOrder({
        side: Side.Sell,
        price: row.price,
        qty: 1,
      });
    } else {
      orderService.sendStopLimitOrder({
        side: Side.Sell,
        price: row.price,
        qty: 1,
      });
    }

    // this.commandProcessorService.processRightMouseClick(e, row, dataContext);
  };

  const getPriceCellClasses = (row: BodyRow): any => {
    return {
      ...getVolumeCellClasses(row),
      'current-position-range-item': !!row.currentPositionRangeSign,
      positive: row.currentPositionRangeSign! > 0,
      negative: row.currentPositionRangeSign! < 0,
    };
  };

  const getVolumeCellClasses = (row: BodyRow): any => {
    return {
      ...getOrdersCellClasses(row),
      'spread-item': row.rowType === ScalperOrderBookRowType.Spread,
    };
  };

  const getOrdersCellClasses = (row: BodyRow): any => {
    return {
      'trade-item': (row.volume ?? 0) > 0,
      'ask-side-item': row.rowType === ScalperOrderBookRowType.Ask,
      'bid-side-item': row.rowType === ScalperOrderBookRowType.Bid,
      'spread-item': row.rowType === ScalperOrderBookRowType.Spread,
      'best-row': row.isBest,
    };
  };

  const isAllOrdersHaveSide = (
    orders: CurrentOrderDisplay[],
    side: Side,
  ): boolean => {
    return orders.length > 0 && orders.every((o) => o.side === side);
  };

  const cancelOrders = (e: React.MouseEvent, orders: CurrentOrderDisplay[]) => {
    e?.preventDefault();
    e?.stopPropagation();

    if (orders.length > 0) {
      orderService.cancelOrders(orders);
    }
  };

  const renderOrderView = ({
    orderSymbol,
    orders,
  }: {
    orderSymbol: string;
    orders: {
      orders: CurrentOrderDisplay[];
      volume: number;
    };
  }) => {
    if (!orders.orders.length) {
      return null;
    }

    return (
      orders.orders.length > 0 && (
        <span
          onClick={($event) => cancelOrders($event, orders.orders)}
          className={`orders-indicator ${
            isAllOrdersHaveSide(orders.orders, ordersSides.Buy) && 'bid'
          } ${isAllOrdersHaveSide(orders.orders, ordersSides.Sell) && 'ask'} ${
            orders.orders.length > 1 && 'multiple'
          }`}
        >
          {renderOrderTemplate
            ? renderOrderTemplate({ orderSymbol, volume: orders.volume })
            : `${orderSymbol}(${orders.volume})`}
        </span>
      )
    );
  };

  const getFilteredOrders = (
    orders: CurrentOrderDisplay[],
    type: 'limit' | 'stoplimit' | 'stop',
  ): {
    orders: CurrentOrderDisplay[];
    volume: number;
  } => {
    const limitOrders = orders.filter((x) => x.type === type);

    return {
      orders: limitOrders,
      volume: limitOrders.reduce(
        (previousValue, currentValue) =>
          previousValue + currentValue.displayVolume,
        0,
      ),
    };
  };

  return (
    <>
      <div id="table-body-container" style={{ display: 'flex' }}>
        <div className="table-col" id="volume-panel">
          {displayItems.map((row) => (
            <div
              onClick={($event) => leftMouseClick($event, row)}
              style={{
                height: `${rowHeight}px`,
                lineHeight: `${rowHeight}px`,
                minWidth: '50px',
              }}
              className="table-row"
            >
              <div
                style={row.getVolumeStyle()}
                className={`table-cell ${Object.entries(
                  getVolumeCellClasses(row),
                )
                  .filter(([key, value]) => !!value)
                  .map(([key]) => key)
                  .join(' ')}`}
              >
                {row.volume}
              </div>
            </div>
          ))}
        </div>
        <div className="table-col" id="price-panel">
          {displayItems.map((row) => (
            <div
              key={row}
              className="table-row"
              style={{
                height: `${rowHeight}px`,
                lineHeight: `${rowHeight}px`,
                minWidth: '50px',
              }}
              onClick={($event) => leftMouseClick($event, row)}
              onContextMenu={($event) => rightMouseClick($event, row)}
              onDoubleClick={(e) => e.stopPropagation()}
            >
              <div
                className={`table-cell ${Object.entries(
                  getPriceCellClasses(row),
                )
                  .filter(([key, value]) => !!value)
                  .map(([key]) => key)
                  .join(' ')}`}
              >
                {row.price}
              </div>
            </div>
          ))}
        </div>
        <div className="table-col" id="orders-panel">
          {displayItems.map((row) => (
            <div
              key={row}
              className="table-row"
              style={{
                height: `${rowHeight}px`,
                lineHeight: `${rowHeight}px`,
                minWidth: '50px',
              }}
              onClick={($event) => leftMouseClick($event, row)}
              onContextMenu={($event) => rightMouseClick($event, row)}
              onDoubleClick={(e) => e.stopPropagation()}
            >
              <div
                className={`table-cell ${Object.entries(
                  getOrdersCellClasses(row),
                )
                  .filter(([key, value]) => !!value)
                  .map(([key]) => key)
                  .join(' ')}`}
              >
                {renderOrderView({
                  orders: getFilteredOrders(row.currentOrders, 'limit'),
                  orderSymbol: 'L',
                  // tooltipKey: 'limitOrderTooltip',
                  // enableDrag: true
                })}
                {renderOrderView({
                  orders: getFilteredOrders(row.currentOrders, 'stoplimit'),
                  orderSymbol: 'SL',
                  // tooltipKey: 'stopLimitOrderTooltip',
                  // enableDrag: false
                })}
                {renderOrderView({
                  orders: getFilteredOrders(row.currentOrders, 'stop'),
                  orderSymbol: 'SM',
                  // tooltipKey: 'stopMarketOrderTooltip',
                  // enableDrag: false
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

export default OrderbookTable;
