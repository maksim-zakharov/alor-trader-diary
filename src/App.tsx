// import logo from './logo.svg';
import './App.css';
import {
    Button, Divider, Drawer, Form,
    Input, InputRef,
    Layout, Select, SelectProps, Space,
    Statistic, Switch,
    Table,
    TableColumnsType,
    Typography
} from "antd";
import {Content, Footer} from "antd/es/layout/layout";
import {ColumnsType} from "antd/es/table";
import React, {ChangeEventHandler, useEffect, useRef, useState} from "react";
import moment from "moment";
import {ArrowDownOutlined, ArrowUpOutlined, SettingOutlined} from '@ant-design/icons'
import {useLocation} from "react-router-dom";
import {useApi} from "./useApi";
import {Exchange, Side, Trade} from "alor-api";
import FormItem from "antd/es/form/FormItem";
import Chart from "./Chart";
import {SwitchChangeEventHandler} from "antd/es/switch";
import {SelectHandler} from "rc-select/lib/Select";
import { DefaultOptionType } from 'antd/es/select';
import { PlusOutlined } from '@ant-design/icons';

export const avg = (numbers: number[]) =>
    !numbers.length ? 0 : summ(numbers) / numbers.length;
export const summ = (numbers: number[]) =>
    numbers.reduce((acc, curr) => acc + curr, 0);
interface DataType {
    key: string;
    name: string;
    age: number;
    address: string;
    tags: string[];
}

interface ExpandedDataType {
    key: React.Key;
    date: string;
    name: string;
    upgradeNum: string;
}

interface DataType {
    key: string;
    name: string;
    age: number;
    tel: string;
    phone: number;
    address: string;
}
const sharedOnCell = (_: DataType, index: number) => {
    if (index === 1) {
        return { colSpan: 0 };
    }

    return {};
};

const moneyFormat = (money: number) => new Intl.NumberFormat('ru-RU', {
    style: 'currency', currency: 'RUB'
}).format(money)
function App() {
    const [nightMode, setNightMode] = useState(Boolean(localStorage.getItem('night') === 'true'));
    const [showSettings, setShowSettings] = useState(false);

    useEffect(() => {
        if(nightMode){
            document.body.className = 'dark-theme';
        } else {

            document.body.removeAttribute('class');
        }
    }, [nightMode]);

    const onChangeNightMode: SwitchChangeEventHandler = (e) => {
        localStorage.setItem('night', String(e));
        document.body.className = 'dark-theme';
        setNightMode(e)
    }

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

        let trades: Trade[] = [];

        if (date || dateFrom) {
            trades = await api.clientInfo.getHistoryTrades({
                exchange: Exchange.MOEX,
                portfolio: settings.portfolio,
                dateFrom: date || dateFrom,
            });

            if (date)
                trades = trades.filter((t) =>
                    moment(date).add(1, 'day').isAfter(moment(t.date)),
                );

            trades = trades.map((t) => ({
                ...t,
                // @ts-ignore
                commission: !t.commission ? t.volume * 0.0005 : t.commission,
            }));
        } else {
            trades = await api.clientInfo.getTrades({
                exchange: Exchange.MOEX,
                portfolio: settings.portfolio,
            });
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

    const location = useLocation();
    const [data, setData] = useState({positions: [], totalPnL: 0, totalFee: 0});

    const [comments, setComments] = useState<{[id: string]: string}>(JSON.parse(localStorage.getItem('state') || '{}'));

    const [reasons, setReasons] = useState<{[id: string]: string}>(JSON.parse(localStorage.getItem('reasons') || '{}'));

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
        const date = url.searchParams.get('date');
        let dateFrom = url.searchParams.get('dateFrom');
        if(!dateFrom){
            dateFrom = moment().add(-7, 'day').format('YYYY-MM-DD');
        }
        getCommulitiveTrades({date, dateFrom}).then(data => {
            data.positions = data.positions.map((p: any) => ({...p, id: p.trades[0].id}));
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
        localStorage.setItem('state', JSON.stringify(comments));
    }, [comments])

    useEffect(() => {
        localStorage.setItem('reasons', JSON.stringify(reasons));
    }, [reasons])

    useEffect(() => {
        localStorage.setItem('settings', JSON.stringify(settings));
    }, [settings])

    const expandedRowRender = (row: any) => {
        const columns: TableColumnsType<ExpandedDataType> = [
            {
                title: 'Time',
                dataIndex: 'date',
                key: 'date',
                render: (_, row) => moment(row.date).format('HH:mm:ss'),
            },
            { title: 'Side', dataIndex: 'side', key: 'side',
                // @ts-ignore
                render: (_, row) => row.side === 'sell' ? <ArrowDownOutlined /> : <ArrowUpOutlined />, },
            { title: 'Quantity', dataIndex: 'qty', key: 'qty' },
            { title: 'Price', dataIndex: 'price', key: 'price',
                render: (_, row) => moneyFormat(_) },
            { title: 'Amount', dataIndex: 'volume', key: 'volume',
                render: (_, row) => moneyFormat(_) },
            { title: 'Fee', dataIndex: 'commission', key: 'commission',
                render: (_, row) => moneyFormat(_) },
        ];

        const darkColors = {
            backgroundColor: 'rgb(30,44,57)',
            color: 'rgb(166,189,213)',
            borderColor: 'rgb(44,60,75)'
        }

        return <div style={{    display: "grid",
            gridTemplateColumns: "800px auto",
            gap: '8px'}}>
            <Chart colors={nightMode && darkColors} trades={row.trades} symbol={row.symbol} api={api} from={row.trades[0].date} to={row.trades.slice(-1)[0].date}/>
            <Input.TextArea placeholder="Add comment..." {...inputProps(row)}/>
            <Table style={{gridColumnStart: 1, gridColumnEnd: 3}} columns={columns} dataSource={row.trades.sort((a: any, b: any) => a.date.localeCompare(b.date))} pagination={false} />
            </div>;
    };

    const selectOptions: DefaultOptionType[] = [
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
    ]

    const selectProps = (position: any): SelectProps => {

        const onSelect: SelectProps["onSelect"] = (value) => {
            setReasons(prevState => ({...prevState, [position.id]: value}))
        }

        return {
            value: reasons[position.id],
            defaultValue: reasons[position.id],
            options: selectOptions,
            onSelect
        }
    }

    const inputProps = (position: any) => {

        const onChange: ChangeEventHandler = (e: any) => {
            const value = e.target.value;
            setComments(prevState => ({...prevState, [position.id]: value}))
        }

        return {
            value: comments[position.id],
            defaultValue: comments[position.id],
            onChange
        }
    }

    const columns: ColumnsType<DataType> = [
        {
            title: 'Time',
            dataIndex: 'openDate',
            key: 'openDate',
            width: 100,
            align: 'center',
            // onCell: (record: any) => record.type === 'summary'  && ({className: record.PnL > 0 ? 'profit' : 'loss'}),
            // @ts-ignore
            render: (_, row) => row.type !== 'summary' ? moment(row.openDate).format('HH:mm:ss') :  moment(row.openDate).format('DD.MM.YYYY'),
            // onCell: sharedOnCell,
        },
        {
            title: 'PnL',
            dataIndex: 'PnL',
            key: 'PnL',
            align: 'center',
            onCell: (record: any, rowIndex) => ({className: record.type !== 'summary' && (record.PnL > 0 ? 'profit' : 'loss'), style: {textAlign: 'center'}}),
            render: (_, row: any) => row.type !== 'summary' ? moneyFormat(_) : <strong>{moneyFormat(_)}</strong>,
            // onCell: (_, index) => ({
            //     colSpan: index === 1 ? 4 : 1,
            // }),
        },
        {
            title: 'Symbol',
            dataIndex: 'symbol',
            key: 'symbol',
            align: 'center',
            // onCell: (record: any) => record.type === 'summary'  && ({className: record.PnL > 0 ? 'profit' : 'loss'}),
            // @ts-ignore
            render: (_, row) => row.type !== 'summary' && _,
        },
        {
            title: 'L/S',
            dataIndex: 'side',
            key: 'side',
            align: 'center',
            // onCell: (record: any) => record.type === 'summary'  && ({className: record.PnL > 0 ? 'profit' : 'loss'}),
            // @ts-ignore
            render: (_, row) => row.type !== 'summary' && (row.side === 'sell' ? <ArrowDownOutlined /> : <ArrowUpOutlined />),
        },
        {
            title: 'PnL %',
            dataIndex: 'PnLPercent',
            key: 'PnLPercent',
            align: 'center',
            // onCell: (record: any) => record.type === 'summary'  && ({className: record.PnL > 0 ? 'profit' : 'loss'}),
            // onCell: (record: any, rowIndex) => ({className: record.PnLPercent > 0 ? 'profit' : 'loss'}),
            // render: (_, row) => moneyFormat(_)
            render: (val: number, row: any) => row.type !== 'summary' &&  `${(val * 100).toFixed(2)}%`
        },
        {
            title: 'Fee',
            dataIndex: 'Fee',
            key: 'Fee',
            align: 'center',
            // onCell: (record: any) => record.type === 'summary'  && ({className: record.PnL > 0 ? 'profit' : 'loss'}),
            render: (_, row) => moneyFormat(_)
        },
        {
            title: 'Reason',
            dataIndex: 'reason',
            key: 'reason',
            width: 200,
            // onCell: (record: any) => record.type === 'summary'  && ({className: record.PnL > 0 ? 'profit' : 'loss'}),
            render: (_, row: any) => row.type !== 'summary' && <Select size="small" style={{width: '180px'}} allowClear placeholder="Select reason..." {...selectProps(row)}/>
        },
        {
            title: 'Comment',
            dataIndex: 'comment',
            key: 'comment',
            // onCell: (record: any) => record.type === 'summary'  && ({className: record.PnL > 0 ? 'profit' : 'loss'}),
            render: (_, row: any) => row.type !== 'summary' && <Input size="small" allowClear placeholder="Add comment..." {...inputProps(row)}/>
        },
    ];

    const settingsInputProps = (field: string) => {
        const onChange = (e: any) => {
            const value = e.target.value;
            setSettings(prevState => ({...prevState, [field]: value}))
        }

        return {
            value: settings[field],
            defaultValue: settings[field],
            onChange,
            name: field,
            id: field
        }
    }

  return (
      <Layout>
          {/*<Test api={api}/>*/}
        <Content className="site-layout" style={{ padding: '0 50px', minHeight: '100vh' }}>
          <div style={{ padding: 24, minHeight: 380, maxWidth: '1200px', margin: 'auto' }}>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                  <Typography.Title>Alor Trader Diary</Typography.Title>
                  <div style={{display: 'flex', gap: '24px', justifyContent: 'space-between', alignItems: 'center'}}>
                      <Switch defaultChecked={nightMode} checked={nightMode} onChange={onChangeNightMode}
                      />
                      <Statistic
                          title="Total PnL"
                          value={moneyFormat(data.totalPnL)}
                          precision={2}
                          valueStyle={{ color: data.totalPnL > 0 ? 'rgb(44,232,156)' : 'rgb( 255,117,132)' }}
                      />
                      <Statistic
                          title="Total Fee"
                          value={moneyFormat(data.totalFee)}
                          precision={2}
                          valueStyle={{ color: 'rgb( 255,117,132)' }}
                      />
                      <Button type="text" icon={<SettingOutlined/>} onClick={(f) => setShowSettings(true)}/>
                      <Drawer title="Settings" placement="right" onClose={() => setShowSettings(false)} open={showSettings}>
                          <Form>
                              <FormItem label="Alor Token">
                                  <Input placeholder="Token" {...settingsInputProps('token')}/>
                              </FormItem>
                              <FormItem label="Alor Portfolio">
                                  <Input placeholder="Portfolio" {...settingsInputProps('portfolio')}/>
                              </FormItem>
                          </Form>
                      </Drawer>
                  </div>
              </div>
              <Table onRow={(row) => row.type === 'summary' && {className: row.PnL > 0 ? 'profit' : 'loss'}} rowKey="id" columns={columns} dataSource={data.positions} size="small" pagination={false}
                     expandable={{ expandedRowRender, defaultExpandedRowKeys: ['0'], rowExpandable: (row) => row.type !== 'summary' }} />
          </div>
        </Content>
        <Footer style={{ textAlign: 'center' }}>Alor Trader Diary ©2023 Created by Maksim Zakharov</Footer>
      </Layout>
  );
}

export default App;
