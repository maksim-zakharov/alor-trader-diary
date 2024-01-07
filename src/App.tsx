// import logo from './logo.svg';
import './App.css';
import {
  DatePicker,
  DatePickerProps,
  Layout,
  Menu,
  MenuProps,
  Select,
  Space,
  Switch, Typography,
} from 'antd';
import { Content, Footer, Header } from 'antd/es/layout/layout';
import React, { ReactNode, useEffect, useMemo, useState } from 'react';
import moment from 'moment';
import {
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useSearchParams,
} from 'react-router-dom';
import { useApi } from './useApi';
import {Exchange, Positions, Summary, Trade, Trades} from 'alor-api';
import { MenuItemType } from 'antd/es/menu/hooks/useItems';
import Diary from './pages/Diary/Diary';
import Analytics from './pages/Analytics/Analytics';
import * as days from 'dayjs';
import { DefaultOptionType } from 'antd/es/select';
import { SwitchChangeEventHandler } from 'antd/es/switch';
import OrderbookWidget from './pages/Orderbook/OrderbookWidget';
import { positionsToTrades, tradesToHistoryPositions } from './utils';
import {Time, WhitespaceData} from "lightweight-charts";

export const avg = (numbers: number[]) =>
  !numbers.length ? 0 : summ(numbers) / numbers.length;
export const summ = (numbers: number[]) =>
  numbers.reduce((acc, curr) => acc + curr, 0);

export const selectOptions: DefaultOptionType[] = [
  { label: 'Эмоции', value: 'Emotion' },
  { label: 'Отскок от уровня', value: 'ReboundLevel' },
  { label: 'Отскок от айса', value: 'ReboundIce' },
  { label: 'Отскок от плотности', value: 'ReboundSize' },
  { label: 'Пробой уровня', value: 'BreakoutLevel' },
  { label: 'Пробой айса', value: 'BreakoutIce' },
  { label: 'Пробой плотности', value: 'BreakoutSize' },
  { label: 'Памп неликвида', value: 'Pump' },
  { label: 'Планка', value: 'PriceLimit' },
  { label: 'Прострел', value: 'Prostrel' },
  { label: 'Робот', value: 'Robot' },
  { label: 'Сбор волатильности', value: 'Volatility' },
  { label: 'Спред', value: 'Spread' },
  { label: 'Сигнал', value: 'Signal' },
  { label: 'Другое', value: undefined },
];
export const selectOptionsMap = selectOptions.reduce(
  (acc, curr) => ({ ...acc, [curr.value]: curr.label }),
  {},
);

function App() {
  const [symbols, setSymbols] = useState(
    localStorage.getItem('symbols')
      ? JSON.parse(localStorage.getItem('symbols'))
      : [],
  );

  const [balanceSeriesData, setBalanceSeriesData] = useState< WhitespaceData<Time>[]>([]);
  const [summary, setSummary] = useState<Summary | undefined>(undefined);


  const [positions, setPositions] = useState<Positions>([]);
  const [trades, setTrades] = useState<Trades>([]);
  const [isLoading, setIsLoading] = useState(true);

  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentMenuSelectedKey = location.pathname?.split('/')[1] || 'diary';
  const date = searchParams.get('date');
  let dateFrom = searchParams.get('dateFrom');

  if (!dateFrom) {
    dateFrom = moment().startOf('month').format('YYYY-MM-DD');
  }
  const [nightMode] = useState(
      Boolean(localStorage.getItem('night') === 'true'),
  );
  useEffect(() => {
    if (nightMode) {
      document.body.className = 'dark-theme';
    } else {
      document.body.removeAttribute('class');
    }
  }, [nightMode]);


  const loadTrades = async ({
    date,
    dateFrom,
  }: {
    date?: string;
    dateFrom?: string;
  }) => {
    let trades: Trade[] = await api.clientInfo.getTrades({
      exchange: Exchange.MOEX,
      portfolio: settings.portfolio,
    });

    if (date || dateFrom) {
      let lastTrades = await api.clientInfo.getHistoryTrades({
        exchange: Exchange.MOEX,
        portfolio: settings.portfolio,
        dateFrom: date || dateFrom,
      });
      trades.push(...lastTrades);

      while (lastTrades.length > 1) {
        lastTrades = await api.clientInfo.getHistoryTrades({
          exchange: Exchange.MOEX,
          portfolio: settings.portfolio,
          from: trades.slice(-1)[0].id,
        });
        trades.push(...lastTrades.slice(1));
      }

      if (date)
        trades = trades.filter((t) =>
          moment(date).add(1, 'day').isAfter(moment(t.date)),
        );

      trades = trades.map((t) => ({
        ...t,
        // @ts-ignore
        commission: !t.commission ? t.volume * 0.0005 : t.commission,
      }));
    }

    return trades;
  };

  const [settings, setSettings] = useState<{
    token: string;
    portfolio: string;
  }>(JSON.parse(localStorage.getItem('settings') || '{}'));
  const api = useApi(settings.token);

  const startedTrades = useMemo(
    () => positionsToTrades(positions),
    [positions],
  );

  const historyPositions = useMemo(() => {
    const allTrades = [...trades, ...startedTrades];

    allTrades.reverse();

    return tradesToHistoryPositions(allTrades);
  }, [startedTrades, trades]);

  const data = useMemo(() => {
    const data = historyPositions;
    data.positions = data.positions.map((p: any) => ({
      ...p,
      id: p.trades[0].id,
      duration: moment(p.closeDate).diff(moment(p.openDate), 'seconds'),
      volume: summ(
        p.trades.filter((t) => t.side === p.side).map((t) => t.volume),
      ),
    }));
    const dayPositionsWithSummaryMap = {};
    for (let i = 0; i < data.positions.length; i++) {
      const currentDay = moment(data.positions[i].openDate).format(
        'YYYY-MM-DD',
      );
      if (!dayPositionsWithSummaryMap[currentDay]) {
        const currentDayPositions = data.positions.filter(
          (p) => moment(p.openDate).format('YYYY-MM-DD') === currentDay,
        );
        dayPositionsWithSummaryMap[currentDay] = [
          {
            type: 'summary',
            Fee: summ(currentDayPositions.map((p) => p.Fee)),
            PnL: summ(currentDayPositions.map((p) => p.PnL)),
            openDate: currentDay,
          },
        ];
        dayPositionsWithSummaryMap[currentDay].push(...currentDayPositions);
      }
    }

    data.positions = Object.entries(dayPositionsWithSummaryMap)
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([key, value]) => value)
      .flat();

    return data;
  }, [historyPositions]);

  useEffect(() => {
    if (!api) {
      return;
    }

    api.clientInfo
      .getPositions({
        exchange: 'MOEX',
        portfolio: settings.portfolio,
        withoutCurrency: true,
      })
      .then(setPositions);

    setIsLoading(true);
    loadTrades({
      date,
      dateFrom,
    }).then(setTrades).finally(() => setIsLoading(false));
  }, [api, dateFrom]);

  const loadData = async () => {
    const summary = await api.clientInfo.getSummary({
      exchange: Exchange.MOEX,
      portfolio: settings.portfolio,
      format: 'Simple'
    })

    const summaryData = data.positions.filter(p => p.type === 'summary')

    const result = [{time: moment().format('YYYY-MM-DD'), value: summary.portfolioEvaluation}];
    summaryData.forEach((d) => result.unshift({time: d.openDate, value: result[0].value - d.PnL}))

    setBalanceSeriesData(result)
    setSummary(summary)
  }

  useEffect(() => {
    if(api && settings.portfolio){
      loadData();
    }
  }, [api, settings.portfolio, data.positions])

  useEffect(() => {
    if (!api) {
      return;
    }

    api.onAuthCallback = () => {
      api.subscriptions.positions(
        {
          portfolio: settings.portfolio,
          exchange: Exchange.MOEX,
        },
        (positions) =>
          setPositions((prevState) =>
            prevState.map((p) =>
              p.symbol === positions.symbol ? positions : p,
            ),
          ),
      );

      api.subscriptions.trades(
        {
          portfolio: settings.portfolio,
          exchange: Exchange.MOEX,
        },
        (trades) =>
          setTrades((prevState) =>
            prevState.map((p) => (p.id === trades.id ? trades : p)),
          ),
      );
    };

    if (!api.accessToken) {
      api.refresh();
    }
  }, [api, historyPositions]);

  useEffect(() => {
    localStorage.setItem('symbols', JSON.stringify(symbols));
  }, [symbols]);

  useEffect(() => {
    localStorage.setItem('settings', JSON.stringify(settings));
  }, [settings]);

  const menuItems: (MenuItemType & { element: ReactNode })[] = [
    { key: 'diary', label: 'Diary', element: <Diary data={data} trades={trades} api={api} isLoading={isLoading} summary={summary} /> },
    {
      key: 'analytics',
      label: 'Analytics',
      element: <Analytics data={data} balanceSeriesData={balanceSeriesData} api={api} isLoading={isLoading} dateFrom={dateFrom} />,
    },
    {
      key: 'orderbook',
      label: 'Orderbook',
      element: (
        <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: '16px', width: '100%' }}>
            <Select
              style={{ minWidth: '300px' }}
              mode="tags"
              value={symbols}
              placeholder="Введите тикеры разделяя клавишей Enter"
              onChange={(values) => setSymbols(values)}
            />
          </div>
          {symbols.map((symbol) => (
            <div>
              <h3>{symbol}</h3>
              <OrderbookWidget api={api} symbol={symbol} showClusters />
            </div>
          ))}
        </div>
      ),
    },
  ];

  const onSelectMenu: MenuProps['onSelect'] = (e) => {
    let to = `/${e.key}`;
    if (location.search) {
      to += location.search;
    }

    navigate(to);
  };

  return (
    <Layout>
      <Header style={{ display: 'flex', alignItems: 'center' }}>
        {/*<Typography.Title level={2} style={{width: 'auto'}}>Alor Trader Diary</Typography.Title>*/}
        <div className="menu-content">
          <Menu
            theme="dark"
            mode="horizontal"
            defaultSelectedKeys={[currentMenuSelectedKey]}
            items={menuItems}
            onSelect={onSelectMenu}
          />
        </div>
      </Header>
      <Content className="site-layout" style={{ minHeight: '100vh' }}>
        <div className="body-content">
          <Routes>
            <Route
              path="/"
              element={<Navigate to={`/${menuItems[0].key}`} />}
            />
            {menuItems.map((item) => (
              <Route path={`/${item.key}`} element={item.element} />
            ))}
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </div>
      </Content>
      <Footer style={{ textAlign: 'center' }}>
        Alor Trader Diary ©2023 Created by Maksim Zakharov
      </Footer>
    </Layout>
  );
}

export default App;
