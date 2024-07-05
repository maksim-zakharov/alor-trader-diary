// import logo from './logo.svg';
import './App.css';
import {Layout, Menu, MenuProps,} from 'antd';
import {Content, Footer, Header} from 'antd/es/layout/layout';
import React, {ReactNode, useEffect, useMemo, useState} from 'react';
// import QuestionCircleIcon  from './assets/question-circle';
import moment from 'moment';
import {Navigate, Route, Routes, useLocation, useNavigate, useSearchParams,} from 'react-router-dom';
import {Exchange, Positions, Trade, Trades} from 'alor-api';
import Diary from './pages/Diary/Diary';
import Analytics from './pages/Analytics/Analytics';
import LoginPage from "./pages/LoginPage/LoginPage";
import {DefaultOptionType} from 'antd/es/select';
import {
    getAgreementNumber,
    getCommissionByPlanAndTotalVolume,
    getCurrentTariffPlan,
    positionsToTrades,
    tradesToHistoryPositions
} from './utils';
import {EquityDynamicsResponse, Status} from "alor-api/dist/services/ClientInfoService/ClientInfoService";
import useListSecs from "./useListSecs";
import {initApi} from "./api/alor.slice";
import {useAppDispatch, useAppSelector} from "./store";
import {MenuItemType} from "antd/es/menu/interface";
import {
    useGetEquityDynamicsQuery,
    useGetMoneyMovesQuery,
    useGetOperationsQuery,
    useGetSummaryQuery,
    useGetUserInfoQuery
} from './api/alor.api';

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
    {label: 'Сигнал', value: 'Signal'},
    {label: 'Другое', value: undefined},
];
export const selectOptionsMap = selectOptions.reduce(
    (acc, curr) => ({...acc, [curr.value]: curr.label}),
    {},
);

function getWindowDimensions() {
    const {innerWidth: width, innerHeight: height} = window;
    return {
        width,
        height
    };
}

function useWindowDimensions() {
    const [windowDimensions, setWindowDimensions] = useState(getWindowDimensions());

    useEffect(() => {
        function handleResize() {
            setWindowDimensions(getWindowDimensions());
        }

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return windowDimensions;
}

function App() {
    const api = useAppSelector(state => state.alorSlice.api);
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const location = useLocation();
    const settings = useAppSelector(state => state.alorSlice.settings);

    const [positions, setPositions] = useState<Positions>([]);
    const [trades, setTrades] = useState<Trades>([]);
    const [isLoading, setIsLoading] = useState(true);

    const [searchParams, setSearchParams] = useSearchParams();
    const currentMenuSelectedKey = location.pathname?.split('/')[1] || 'diary';
    const date = searchParams.get('date');
    let dateFrom = searchParams.get('dateFrom');
    if (!dateFrom) {
        dateFrom = moment().startOf('month').format('YYYY-MM-DD');
    }
    let dateTo = searchParams.get('dateTo');
    if (!dateTo) {
        dateTo = moment().endOf('month').add(1, 'day').format('YYYY-MM-DD');
    }

    // @ts-ignore
    const {data: userInfo} = useGetUserInfoQuery({}, {
        skip: !api
    });

    const {data: summary} = useGetSummaryQuery([{
        exchange: Exchange.MOEX,
        format: 'Simple',
        portfolio: settings.portfolio
    }], {
        skip: !userInfo || !settings.portfolio,
        refetchOnMountOrArgChange: true,
    });

    const {data: operations = []} = useGetOperationsQuery([userInfo?.agreements[0]?.agreementNumber], {
        skip: !userInfo,
        refetchOnMountOrArgChange: true
    });

    const {data: moneyMoves = []} = useGetMoneyMovesQuery([
        getAgreementNumber(userInfo)
        , {
            dateFrom,
            dateTo
        }], {
        skip: !userInfo,
        refetchOnMountOrArgChange: true
    })

    useEffect(() => {
        dispatch(initApi({token: settings.token}))
    }, [settings.token])

    useEffect(() => {
        if (settings.token && location.pathname.endsWith('/login')) {
            navigate('/')
        }
    }, [location.pathname, settings.token]);

    const {height, width} = useWindowDimensions();
    const [symbols, setSymbols] = useState(
        localStorage.getItem('symbols')
            ? JSON.parse(localStorage.getItem('symbols'))
            : [],
    );

    const {getListSectionBySymbol, getIsinBySymbol} = useListSecs();

    const [visibilitychange, setVisibilitychange] = useState<boolean>(true);

    useEffect(() => {
        document.addEventListener("visibilitychange", function () {
            setVisibilitychange(!document.hidden);
        });
    }, [])

    const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');

    useEffect(() => {
        if ((theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches) || theme === 'dark') {
            document.body.className = 'dark-theme';
        } else {
            document.body.removeAttribute('class');
        }
    }, [theme]);

    const calculateCommission = (plan: string, totalVolume: number) => {

        switch (settings.commissionType) {
            case 'tariff':
                return getCommissionByPlanAndTotalVolume(plan, totalVolume);
            case 'taker':
                return getCommissionByPlanAndTotalVolume(plan, totalVolume, true);
            case undefined:
                return getCommissionByPlanAndTotalVolume(plan, totalVolume);
            default:
                return Number(settings.commissionType) || 0;
        }
    }

    const loadTrades = async ({
                                  tariffPlan,
                                  date,
                                  dateFrom,
                              }: {
        tariffPlan?: string;
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

            const dayVolumes = trades.reduce((acc, curr) => {
                const day = moment(curr.date).format('YYYY-MM-DD');
                if (!acc[day]) {
                    acc[day] = 0;
                }
                // @ts-ignore
                acc[day] += curr.volume;

                return acc;
            }, {});

            trades = trades.map((t) => ({
                ...t,
                // @ts-ignore
                commission: calculateCommission(tariffPlan, dayVolumes[moment(t.date).format('YYYY-MM-DD')]) * t.volume,
            }));
        }

        setTrades(trades.filter(t => moment(t.date).isBefore(moment(dateTo))));
    };

    useEffect(() => {
        // Если токена нет - редирект на логин
        if (!settings.token) {
            navigate('/login');
        } else
            // Если портфолио нет - редирект на страницу выбора логина
        if (!settings.portfolio) {

        }
    }, []);

    const startedTrades = useMemo(
        () => positionsToTrades(positions),
        [positions],
    );

    // const historyPositions = useMemo(() => {
    //     const allTrades = [...trades, ...startedTrades];
    //
    //     allTrades.reverse();
    //
    //     return tradesToHistoryPositions(allTrades);
    // }, [startedTrades, trades]);

    const historyPositions = useMemo(() => {
        const allTrades = [...trades];

        allTrades.reverse();

        return tradesToHistoryPositions(allTrades);
    }, [trades]);

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
                        openDate: currentDay
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

    const activeOperations = useMemo(() => operations.filter(o => ![Status.Overdue, Status.Refused].includes(o.status)), [operations]);

    // @ts-ignore
    const lastWithdrawals: number[] = useMemo(() => Array.from(new Set(activeOperations.map(o => o.data.amount))).sort((a, b) => b - a).slice(0, 5).filter(a => a), [activeOperations]);

    const {data: _equityDynamics} = useGetEquityDynamicsQuery([{
        startDate: moment(dateFrom).add(-1, 'day').format('YYYY-MM-DD'),
        endDate: dateTo,
        portfolio: settings.portfolio,
        agreementNumber: getAgreementNumber(userInfo)
    }], {
        skip: !userInfo || !settings.portfolio,
        refetchOnMountOrArgChange: true
    });

    const equityDynamics = useMemo(() => {
        if(!summary){
            return {
                portfolioValues: []
            }
        }
        if (!_equityDynamics && summary) {
            return {
                portfolioValues: [{
                    date: moment().format('YYYY-MM-DD'),
                    value: summary.portfolioLiquidationValue
                } as any]
            };
        }

        const result = JSON.parse(JSON.stringify(_equityDynamics));

        const lastValue = result.portfolioValues.slice(-1)[0];
        // Если последнее значение есть и оно не сегодняшний день и мы запросили за текущий день тоже
        if (lastValue && moment(lastValue.date).isBefore(moment()) && moment(dateTo).isAfter(moment())) {
            result.portfolioValues.push({
                date: moment().format('YYYY-MM-DD'),
                value: summary.portfolioLiquidationValue
            } as any)
        }

        return result;
    }, [_equityDynamics, summary]);

    useEffect(() => {
        if (!api || !summary || !userInfo || !visibilitychange) {
            return;
        }

        setIsLoading(true);

        loadTrades({
            tariffPlan: getCurrentTariffPlan(userInfo, 'FOND'),
            date,
            dateFrom,
        })
            .finally(() => setIsLoading(false));
    }, [api, dateFrom, summary, userInfo, visibilitychange]);

    useEffect(() => {
        localStorage.setItem('symbols', JSON.stringify(symbols));
    }, [symbols]);

    useEffect(() => {
        localStorage.setItem('settings', JSON.stringify(settings));
    }, [settings]);

    const menuItems: (MenuItemType & { element: ReactNode })[] = [
        {
            key: 'diary',
            label: 'Дневник',
            element: <Diary getIsinBySymbol={getIsinBySymbol} getListSectionBySymbol={getListSectionBySymbol}
                            userInfo={userInfo}
                            isMobile={width < 400 ? 1 : width < 1200 ? Math.round(width / 410) : 0}
                            moneyMoves={moneyMoves || []} equityDynamics={equityDynamics}
                            data={data} trades={trades} api={api} isLoading={isLoading}
                            lastWithdrawals={lastWithdrawals} operations={operations}
                            fullName={userInfo?.fullName}/>
        },
        {
            key: 'analytics',
            label: 'Аналитика',
            element: <Analytics activeOperations={activeOperations} getIsinBySymbol={getIsinBySymbol}
                                getListSectionBySymbol={getListSectionBySymbol} data={data}
                                balanceSeriesData={equityDynamics?.portfolioValues.map(v => ({
                                    time: moment(v.date).format('YYYY-MM-DD'),
                                    value: v.value
                                })) || []} api={api} isLoading={isLoading} dateFrom={dateFrom}
                                moneyMoves={moneyMoves || []}/>,
        }//,
        // {
        //     key: 'orderbook',
        //     label: 'Orderbook',
        //     element: (
        //         <div style={{display: 'flex', gap: '24px', flexWrap: 'wrap'}}>
        //             <div style={{display: 'flex', gap: '16px', width: '100%'}}>
        //                 <Select
        //                     style={{minWidth: '300px'}}
        //                     mode="tags"
        //                     value={symbols}
        //                     placeholder="Введите тикеры разделяя клавишей Enter"
        //                     onChange={(values) => setSymbols(values)}
        //                 />
        //             </div>
        //             {symbols.map((symbol) => (
        //                 <div>
        //                     <h3>{symbol}</h3>
        //                     <OrderbookWidget api={api} symbol={symbol} showClusters/>
        //                 </div>
        //             ))}
        //         </div>
        //     ),
        // },
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
            {userInfo && <Header style={{display: 'flex', alignItems: 'center'}}>
                {/*<Typography.Title level={2} style={{width: 'auto'}}>Alor Trader Diary</Typography.Title>*/}
                <div className="menu-content">
                    <Menu
                        theme="dark"
                        mode="horizontal"
                        defaultSelectedKeys={[currentMenuSelectedKey]}
                        items={menuItems}
                        onSelect={onSelectMenu}
                    />
                    <a className="header-support-link" href="https://t.me/+8KsjwdNHVzIwNDQy"
                       target="_blank"> Поддержка</a>
                </div>
            </Header>}
            <Content className="site-layout" style={{minHeight: '100vh'}}>
                <div className="body-content">
                    <Routes>
                        <Route
                            path="/"
                            element={<Navigate to={`/${menuItems[0].key}`}/>}
                        />
                        {menuItems.map((item) => (
                            <Route path={`/${item.key}`} element={item.element}/>
                        ))}
                        <Route path="/login" element={<LoginPage/>}/>
                        <Route path="*" element={<Navigate to="/"/>}/>
                    </Routes>
                </div>
            </Content>
            {userInfo && <Footer style={{textAlign: 'center'}}>
                Alor Trader Diary ©2023 Created by Maksim Zakharov
            </Footer>}
        </Layout>
    );
}

export default App;
