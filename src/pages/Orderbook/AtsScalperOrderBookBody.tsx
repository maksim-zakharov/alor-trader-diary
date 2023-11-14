import { FC, useEffect, useMemo, useState } from 'react';
import { notification, Spin } from 'antd';
import TradesPanel from './TradesPanel';
import OrderbookTable, {
  ScalperOrderBookRowType,
  VolumeHighlightMode,
} from './OrderbookTable';
import {
  AlorApi,
  Condition,
  Exchange,
  fromTo,
  Orders,
  OrderStatus,
  Security,
  Side,
  Timeframe,
} from 'alor-api';
import { random } from '../../common/utils';
import AtsTradeClustersPanel from './AtsTradeClustersPanel';
import { roundPrice } from '../../utils';

interface IProps {
  showClusters: boolean;
  symbol: string;
  workingVolume: number;
  api: AlorApi;
  orderBookPosition: any;
}
export type ThemeColors = any;

const darkThemeColors: ThemeColors = {
  sellColor: 'rgba(209, 38, 27, 1)',
  sellColorBackground: 'rgba(209, 38, 27, 0.4)',
  sellColorAccent: 'rgba(255, 69, 0, 1)',
  buyColor: 'rgba(0, 155, 99, 1)',
  buyColorBackground: 'rgba(0, 155, 99, 0.4)',
  buyColorBackgroundLight: 'rgba(0, 155, 99, 1)',
  buySellLabelColor: '#ffffff',
  buyColorAccent: 'rgba(19, 219, 146, 1)',
  componentBackground: '#141922',
  primaryColor: '#177ddc',
  purpleColor: '#51258f',
  errorColor: '#a61d24',
  chartGridColor: '#272E3B',
  chartLabelsColor: '#97A4BB',
  chartPrimaryTextColor: '#ffffff',
  chartBackground: '#1F2530',
  textColor: '#97A4BB',
};

const AtsScalperOrderBookBody: FC<IProps> = ({
  api,
  showClusters,
  symbol,
  orderBookPosition,
  workingVolume,
}) => {
  const [settings, setSettings] = useState<{
    token: string;
    portfolio: string;
  }>(JSON.parse(localStorage.getItem('settings') || '{}'));

  const [orderBookData, setOrderbookData] = useState<{ a: any[]; b: any[] }>({
    a: [],
    b: [],
  });
  const [security, setSecurity] = useState<Security | undefined>();
  const [trades, setTrades] = useState([]);
  const [orders, setOrders] = useState(new Map<string, any>([]));

  const orderBookBody = useMemo(
    () =>
      [...orderBookData.b, ...orderBookData.a].sort(
        (a, b) => b.price - a.price,
      ),
    [orderBookData],
  );

  let orderBookSubscription;
  let tradesSubscription;

  const subscribe = async () => {
    const security = await api.instruments.getSecurityByExchangeAndSymbol({
      exchange: Exchange.MOEX,
      symbol,
    });
    setSecurity(security);

    await api.subscriptions.orders(
      {
        exchange: Exchange.MOEX,
        portfolio: settings.portfolio,
      },
      (position) =>
        setOrders((prevState) =>
          prevState.set(position.id, {
            ...position,
            linkedPrice: position.price,
            displayVolume: position.qty,
          }),
        ),
    );
    await api.subscriptions.stoporders(
      {
        exchange: Exchange.MOEX,
        portfolio: settings.portfolio,
      },
      (position) =>
        setOrders((prevState) =>
          prevState.set(position.id.toString(), {
            ...position,
            type: 'stop',
            linkedPrice: position.price,
            displayVolume: position.qty,
          }),
        ),
    );

    await api.subscriptions
      .orderBook(
        {
          exchange: Exchange.MOEX,
          code: symbol,
          depth: 20,
        },
        (orderbook) =>
          setOrderbookData({
            a: orderbook.asks.map((p) => ({
              price: p.price,
              v: p.volume,
              volume: p.volume,
              rowType: ScalperOrderBookRowType.Ask,
            })),
            b: orderbook.bids.map((p) => ({
              price: p.price,
              v: p.volume,
              volume: p.volume,
              rowType: ScalperOrderBookRowType.Bid,
            })),
          }),
      )
      .then((s) => (orderBookSubscription = s));

    await api.subscriptions
      .alltrades(
        {
          exchange: Exchange.MOEX,
          depth: showClusters ? 1000 : 20,
          // @ts-ignore
          code: symbol,
        },
        (data) =>
          setTrades((prev) => {
            const exist = prev.find((t) => t.id === data.id);
            if (!exist) {
              prev.push(data);
            }

            const timeUTC = new Date().getTime() / 1000;

            const from = Math.floor(timeUTC - (timeUTC % Timeframe.Min5) * 3);

            return prev.filter((t) => t.timestamp >= from);
          }),
      )
      .then((s) => (tradesSubscription = s));
  };

  useEffect(() => {
    if (api) {
      subscribe();
    }

    return () => {
      tradesSubscription?.();
      orderBookSubscription?.();
    };
  }, [api]);

  const rowHeight = 18;

  const isLoading = false;

  if (isLoading) {
    return <Spin />;
  }

  const themeSettings = { themeColors: darkThemeColors };

  const orderService = {
    sendLimitOrder: ({ side, price, qty }) =>
      api.orders
        .sendLimitOrder({
          price,
          side,
          type: 'limit',
          user: {
            portfolio: settings.portfolio,
          },
          instrument: {
            symbol,
            exchange: Exchange.MOEX,
          },
          quantity: qty,
          icebergVariance: qty,
          icebergFixed: qty,
        })
        .then(() =>
          notification.success({
            message: `Лимитная заявка для ${symbol} по цене ${price} установлена`,
          }),
        )
        .catch((e) => notification.error({ message: e.message })),
    sendStopLimitOrder: ({ side, price, qty }) =>
      api.stoporders
        .sendStopOrder({
          // price,
          side,
          condition: side === Side.Buy ? Condition.More : Condition.Less,
          triggerPrice: price,
          user: {
            portfolio: settings.portfolio,
          },
          instrument: {
            symbol,
            exchange: Exchange.MOEX,
          },
          quantity: qty,
          // icebergVariance: qty,
          // icebergFixed: qty,
        })
        .then(() =>
          notification.success({
            message: `Стоп заявка для ${symbol} по цене ${price} установлена`,
          }),
        )
        .catch((e) => notification.error({ message: e.message })),
    cancelOrders: (orders: Orders) =>
      orders.map((p) =>
        api.orders
          .cancelOrder({
            portfolio: settings.portfolio,
            orderId: Number(p.id),
            exchange: 'MOEX',
            stop: typeof p.id !== 'string',
          })
          .then(() =>
            notification.success({
              message: `Заявка для ${symbol} отменена`,
            }),
          )
          .catch((e) => notification.error({ message: e.message })),
      ),
  };

  const displayRange = { start: 0, end: 60 };

  const calculateRows = () => {
    const minStep = security?.minstep;
    if (!minStep) {
      return [];
    }

    const displayRows = orderBookBody.length ? [orderBookBody[0]] : [];

    for (let i = 1; i < orderBookBody.length; i++) {
      const minSteps = Math.round(
        Math.abs(
          (orderBookBody[i].price - orderBookBody[i - 1].price) / minStep,
        ),
      );
      if (minSteps > 1) {
        for (let j = 1; j < minSteps; j++) {
          let price;
          if (orderBookBody[i - 1].rowType === 'ask') {
            price = roundPrice(
              orderBookBody[i].price + (minSteps - j) * minStep,
              minStep,
            );
          } else {
            price = roundPrice(orderBookBody[i].price + j * minStep, minStep);
          }
          // debugger;
          displayRows.push({
            price,
            v: 0,
            volume: 0,
            rowType: orderBookBody[i].rowType,
          });
        }
        displayRows.push(orderBookBody[i]);
      } else {
        displayRows.push(orderBookBody[i]);
      }
    }

    return orderBookBody.slice(
      displayRange!.start,
      Math.min(displayRange!.end + 1, orderBookBody.length),
    );

    return displayRows.slice(
      displayRange!.start,
      Math.min(displayRange!.end + 1, displayRows.length),
    );
  };

  const dataContext = {
    currentOrders: Array.from(orders)
      .map(([key, value]) => value)
      .filter((o) => [OrderStatus.Working].includes(o.status)),
    orderBookBody: orderBookBody,
    orderBookData: orderBookData,
    trades: trades.sort((a, b) => b.timestamp - a.timestamp),
    displayRange,
    displayRows: calculateRows(),
    orderBookPosition,
    settings: {
      widgetSettings: {
        volumeHighlightMode: VolumeHighlightMode.BiggestVolume,
      },
    },
  };

  return (
    <>
      {showClusters && (
        <div>
          <AtsTradeClustersPanel
            themeSettings={themeSettings}
            xAxisStep={rowHeight}
            dataContext={dataContext}
            columnsCount={1}
          />
        </div>
      )}
      <div>
        <TradesPanel
          themeSettings={themeSettings}
          dataContext={dataContext}
          xAxisStep={rowHeight}
          maxWidth={100}
        />
      </div>
      <div id="table">
        <OrderbookTable
          orderService={orderService}
          themeSettings={themeSettings}
          dataContext={dataContext}
          isActive={true}
          rowHeight={rowHeight}
        />
      </div>
    </>
  );
};

export default AtsScalperOrderBookBody;
