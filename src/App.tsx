// import logo from './logo.svg';
import './App.css';
import {
    Button, DatePicker, DatePickerProps, Divider, Drawer, Form,
    Input, InputRef,
    Layout, Menu, MenuProps, Select, SelectProps, Space,
    Statistic, Switch,
    Table,
    TableColumnsType,
    Typography
} from "antd";
import {Content, Footer, Header} from "antd/es/layout/layout";
import {ColumnsType} from "antd/es/table";
import React, {ChangeEventHandler, ReactNode, useEffect, useRef, useState} from "react";
import moment from "moment";
import {ArrowDownOutlined, ArrowUpOutlined, SettingOutlined} from '@ant-design/icons'
import {Navigate, Route, Routes, useLocation, useNavigate, useSearchParams} from "react-router-dom";
import {useApi} from "./useApi";
import {Exchange, Side, Trade} from "alor-api";
import {ItemType, MenuItemType} from "antd/es/menu/hooks/useItems";
import Diary from "./pages/Diary";
import Analytics from "./pages/Analytics";
import {RangePickerProps} from "antd/es/date-picker";
import * as days from 'dayjs'
import {DefaultOptionType} from "antd/es/select";
import {SwitchChangeEventHandler} from "antd/es/switch";
import OrderbookWidget from "./pages/Orderbook/OrderbookWidget";

export const avg = (numbers: number[]) =>
    !numbers.length ? 0 : summ(numbers) / numbers.length;
export const summ = (numbers: number[]) =>
    numbers.reduce((acc, curr) => acc + curr, 0);

export const selectOptions: DefaultOptionType[] = [
    {label: 'Эмоции', value: 'Emotion'},
    {label: 'Отскок от уровня', value: 'ReboundLevel'},
    {label: 'Отскок от айса', value: 'ReboundIce'},
    {label: 'Отскок от плотности', value: 'ReboundSize'},
    {label: 'Пробой уровня', value: 'BreakoutLevel'},
    {label: 'Пробой айса', value: 'BreakoutIce'},
    {label: 'Пробой плотности', value: 'BreakoutSize'},
    {label: 'Памп неликвида', value: 'Pump'},
    {label: 'Планка', value: 'PriceLimit'},
    {label: 'Прострел', value: 'Prostrel'},
    {label: 'Робот', value: 'Robot'},
    {label: 'Сбор волатильности', value: 'Volatility'},
    {label: 'Спред', value: 'Spread'},
    {label: 'Другое', value: undefined},
]
export const selectOptionsMap = selectOptions.reduce((acc, curr) => ({...acc, [curr.value]: curr.label}),{})

function App() {
    const [nightMode, setNightMode] = useState(Boolean(localStorage.getItem('night') === 'true'));


    const onChangeNightMode: SwitchChangeEventHandler = (e) => {
        localStorage.setItem('night', String(e));
        document.body.className = 'dark-theme';
        setNightMode(e)
    }

    useEffect(() => {
        if(nightMode){
            document.body.className = 'dark-theme';
        } else {

            document.body.removeAttribute('class');
        }
    }, [nightMode]);
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams, setSearchParams] = useSearchParams();
    const currentMenuSelectedKey = location.pathname?.split('/')[1] || 'diary';
    const date = searchParams.get('date');
    let dateFrom = searchParams.get('dateFrom');

    if(!dateFrom){
        dateFrom = moment().startOf('week').format('YYYY-MM-DD');
    }

    const currentDates: DatePickerProps['value'] = days(dateFrom);

     const getCommulitiveTrades = async (
        { date, dateFrom }: { date?: string; dateFrom?: string },
) => {

        const positions = await api.clientInfo.getPositions({
            exchange: "MOEX",
            portfolio: settings.portfolio,
            withoutCurrency: true
        });

        const startedTrades: Trade[] = [];
        positions.map((p) =>
            startedTrades.push({
                symbol: p.symbol,
                exchange: p.exchange,
                qty: Math.abs(p.qty),
                qtyBatch: Math.abs(p.qty),
                qtyUnits: Math.abs(p.qty),
                existing: false,
                date: new Date().toISOString(),
                brokerSymbol: `${p.exchange}:${p.symbol}`,
                side: p.qty > 0 ? Side.Sell : Side.Buy,
                board: 'TQBR',
                // @ts-ignore
                commission: Math.abs(p.volume) * 0.0005,
                price: p.avgPrice,
                // @ts-ignore
                accruedInt: 0,
                // @ts-ignore
                repoSpecificFields: null,
                // @ts-ignore
                volume: Math.abs(p.volume),
            }),
        );

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
            trades.push(...lastTrades)

            while (lastTrades.length > 1){
                lastTrades = await api.clientInfo.getHistoryTrades({
                    exchange: Exchange.MOEX,
                    portfolio: settings.portfolio,
                    from: trades.slice(-1)[0].id
                })
                trades.push(...lastTrades.slice(1))
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

        const allTrades = [...trades, ...startedTrades];

        allTrades.reverse();

        const batchPositions: any = [];
        const currentPositionsMap: { [symbol: string]: any } = {};

        allTrades.map((trade) => {
            if(!trade.symbol){
                trade.symbol = '';
            }

            // Если позиции нет - добавляем
            if (!currentPositionsMap[trade.symbol]) {
                currentPositionsMap[trade.symbol] = {
                    commQty: trade.qty,
                    closePrice: trade.price,
                    symbol: trade.symbol,
                    closeDate: trade.date,
                    lastSide: trade.side,
                    side: trade.side === Side.Buy ? Side.Sell : Side.Buy,
                    trades: [trade],
                };
                // Если позиция есть - работаем
            } else {

                // Если направление трейда такое же как у трейда закрытия - суммируем тотал лот
                if (trade.side === currentPositionsMap[trade.symbol].lastSide) {
                    currentPositionsMap[trade.symbol].commQty += trade.qty;
                    currentPositionsMap[trade.symbol].trades.unshift(trade);
                } else {
                    // Если нет - вычитаем
                    currentPositionsMap[trade.symbol].commQty -= trade.qty;

                    // Если объем остался

                    if (currentPositionsMap[trade.symbol].commQty > 0) {
                        currentPositionsMap[trade.symbol].trades.unshift(trade);
                    }

                    // Если объема нет - закрываем позу
                    else if (currentPositionsMap[trade.symbol].commQty === 0) {
                        currentPositionsMap[trade.symbol].openPrice = trade.price;
                        currentPositionsMap[trade.symbol].openDate = trade.date;
                        currentPositionsMap[trade.symbol].trades.unshift(trade);
                        delete currentPositionsMap[trade.symbol].commQty;
                        delete currentPositionsMap[trade.symbol].lastSide;

                        const totalDiffVolume = currentPositionsMap[
                            trade.symbol
                            ].trades.reduce(
                            (acc, curr) =>
                                curr.side === Side.Buy ? acc - curr.volume : acc + curr.volume,
                            0,
                        );

                        const totalCommission = summ(
                            currentPositionsMap[trade.symbol].trades.map((t) => t.commission),
                        );

                        currentPositionsMap[trade.symbol].Fee = totalCommission;

                        currentPositionsMap[trade.symbol].PnL =
                            totalDiffVolume - totalCommission;

                        const avgBuyVolume = avg(currentPositionsMap[trade.symbol].trades.filter(t => t.side === Side.Buy).map(t => t.volume));
                        const avgSellVolume = avg(currentPositionsMap[trade.symbol].trades.filter(t => t.side === Side.Sell).map(t => t.volume));
                        currentPositionsMap[trade.symbol].PnLPercent = currentPositionsMap[trade.symbol].side === Side.Buy ? totalDiffVolume / avgBuyVolume : totalDiffVolume / avgSellVolume;

                        batchPositions.push({ ...currentPositionsMap[trade.symbol] });
                        delete currentPositionsMap[trade.symbol];
                    }
                    // Если объем в минус - перевернуться
                    else {
                        currentPositionsMap[trade.symbol].openPrice = trade.price;
                        currentPositionsMap[trade.symbol].openDate = trade.date;

                        // @ts-ignore
                        const lotSize = trade.volume / (trade.price * trade.qty);

                        // @ts-ignore
                        const diffVolume = trade.price *
                            -currentPositionsMap[trade.symbol].commQty *
                            lotSize;

                        // @ts-ignore
                        trade.volume -= diffVolume;

                        trade.qty += currentPositionsMap[trade.symbol].commQty;
                        trade.qtyBatch += currentPositionsMap[trade.symbol].commQty;
                        trade.qtyUnits += currentPositionsMap[trade.symbol].commQty;

                        currentPositionsMap[trade.symbol].trades.unshift(trade);

                        const totalDiffVolume = currentPositionsMap[
                            trade.symbol
                            ].trades.reduce(
                            (acc, curr) =>
                                curr.side === Side.Buy ? acc - curr.volume : acc + curr.volume,
                            0,
                        );

                        const totalCommission = summ(
                            currentPositionsMap[trade.symbol].trades.map((t) => t.commission),
                        );

                        currentPositionsMap[trade.symbol].Fee = totalCommission;

                        currentPositionsMap[trade.symbol].PnL =
                            totalDiffVolume - totalCommission;

                        const avgBuyVolume = avg(currentPositionsMap[trade.symbol].trades.filter(t => t.side === Side.Buy).map(t => t.volume));
                        const avgSellVolume = avg(currentPositionsMap[trade.symbol].trades.filter(t => t.side === Side.Sell).map(t => t.volume));
                        currentPositionsMap[trade.symbol].PnLPercent = currentPositionsMap[trade.symbol].side === Side.Buy ? totalDiffVolume / avgBuyVolume : totalDiffVolume / avgSellVolume;

                        const { commQty, lastSide, ...newPosition } =
                            currentPositionsMap[trade.symbol];

                        batchPositions.push({ ...newPosition });

                        // @ts-ignore
                        trade.volume = diffVolume;

                        trade.qty = currentPositionsMap[trade.symbol].commQty;
                        trade.qtyBatch = currentPositionsMap[trade.symbol].commQty;
                        trade.qtyUnits = currentPositionsMap[trade.symbol].commQty;

                        currentPositionsMap[trade.symbol] = {
                            commQty: Math.abs(currentPositionsMap[trade.symbol].commQty),
                            lastSide: trade.side,
                            closePrice: trade.price,
                            symbol: trade.symbol,
                            closeDate: trade.date,
                            side: trade.side === Side.Buy ? Side.Sell : Side.Buy,
                            trades: [trade],
                        };
                    }
                }
            }
        });

        const totalFee = summ(batchPositions.map((p: any) => p.Fee));
        const totalPnL = summ(batchPositions.map((p: any) => p.PnL));

        return { positions: batchPositions, totalPnL, totalFee };
    }

    const [data, setData] = useState({positions: [], totalPnL: 0, totalFee: 0});


    const [settings, setSettings] = useState<{token: string, portfolio: string}>(JSON.parse(localStorage.getItem('settings') || '{}'));
    const api = useApi(settings.token);

    useEffect(() => {
        if(!api){
            return
        }
        const url = new URL('http://localhost:3000/commulitive-trades');
        if(location.search){
            url.search = location.search;
        }
        getCommulitiveTrades({date, dateFrom}).then(data => {
            data.positions = data.positions.map((p: any) =>
                ({...p,
                id: p.trades[0].id,
                duration: moment(p.closeDate).diff(moment(p.openDate), 'seconds'),
                    volume: summ(p.trades.filter(t => t.side === p.side).map(t => t.volume))
            }));
            const dayPositionsWithSummaryMap = {};
            for(let i = 0; i< data.positions.length; i++){
                const currentDay = moment(data.positions[i].openDate).format('YYYY-MM-DD')
                if(!dayPositionsWithSummaryMap[currentDay]){
                    const currentDayPositions = data.positions.filter(p => moment(p.openDate).format('YYYY-MM-DD') === currentDay);
                    dayPositionsWithSummaryMap[currentDay] = [{type: 'summary', Fee: summ(currentDayPositions.map(p => p.Fee)), PnL: summ(currentDayPositions.map(p => p.PnL)), openDate: currentDay}];
                    dayPositionsWithSummaryMap[currentDay].push(...currentDayPositions)
                }
            }
            console.log(dayPositionsWithSummaryMap)

            data.positions = Object.entries(dayPositionsWithSummaryMap).sort((a, b) => b[0].localeCompare(a[0])).map(([key, value]) => value).flat();

            setData(data)
        })
        // fetch(url.toString()).then(async r => {
        //     const data = await r.json();
        //     data.positions = data.positions.map((p: any) => ({...p, id: p.trades[0].id}));
        //     setData(data)
        // })
    }, [location.search, api])

    useEffect(() => {
        localStorage.setItem('settings', JSON.stringify(settings));
    }, [settings])

    const menuItems: (MenuItemType & {element: ReactNode})[] = [
        {key: 'diary', label: 'Diary', element: <Diary data={data} api={api}/>},
        {key: 'analytics', label: 'Analytics', element: <Analytics data={data} api={api}/>},
        {key: 'orderbook', label: 'Orderbook', element: <OrderbookWidget api={api}/>}
    ]

    const onSelectMenu: MenuProps['onSelect'] = (e) => {
        let to = `/${e.key}`;
        if(location.search){
            to += location.search;
        }

        navigate(to);
    }

    const onChangeDate: DatePickerProps['onChange'] = (dateFrom) => {
        searchParams.set('dateFrom', dateFrom.format('YYYY-MM-DD'));
        setSearchParams(searchParams)
    }

  return (
      <Layout>
          {/*<Test api={api}/>*/}
          <Header style={{ display: 'flex', alignItems: 'center' }}>
              <div className="menu-content">
                  <Menu
                      theme="dark"
                      mode="horizontal"
                      defaultSelectedKeys={[currentMenuSelectedKey]}
                      items={menuItems}
                      onSelect={onSelectMenu}
                  />
                  <Space>
                      <DatePicker value={currentDates} onChange={onChangeDate} />
                      <Switch defaultChecked={nightMode} checked={nightMode} onChange={onChangeNightMode}
                      />
                  </Space>
              </div>
          </Header>
        <Content className="site-layout" style={{ minHeight: '100vh' }}>
          <div style={{ padding: 24, minHeight: 380, maxWidth: '1200px', margin: 'auto' }}>
              <Routes>
                  <Route path="/" element={<Navigate to={`/${menuItems[0].key}`} />}/>
                  {menuItems.map(item => <Route path={`/${item.key}`} element={item.element}/>)}
                  <Route path="*" element={<Navigate to="/" />}/>
              </Routes>
          </div>
        </Content>
        <Footer style={{ textAlign: 'center' }}>Alor Trader Diary ©2023 Created by Maksim Zakharov</Footer>
      </Layout>
  );
}

export default App;
