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
    getCurrentTariffPlan,
    positionsToTrades,
    tradesToHistoryPositions
} from './utils';
import useListSecs from "./useListSecs";
import {initApi} from "./api/alor.slice";
import {useAppDispatch, useAppSelector} from "./store";
import {MenuItemType} from "antd/es/menu/interface";
import {
    calculateCommission,
    useGetEquityDynamicsQuery,
    useGetMoneyMovesQuery,
    useGetOperationsQuery,
    useGetSummaryQuery, useGetTradesQuery,
    useGetUserInfoQuery
} from './api/alor.api';
import {getEnv, oAuth2, oAuth2Client, redirectUri} from "./api/oAuth2";

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
    const userInfo = useAppSelector(state => state.alorSlice.userInfo);

    const [positions, setPositions] = useState<Positions>([]);

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

    useEffect(() => {
        const url = new URL(document.location.href);
        const code = url.searchParams.get('code');
        if(code){
        (async () => {
            oAuth2Client.code.getToken(document.location.href, {
                // clientId: getEnv('SSO_CLIENT_ID'),
                // clientSecret: getEnv('SSO_CLIENT_SECRET'),
                body: {
                    client_id: getEnv('SSO_CLIENT_ID'),
                    client_secret: getEnv('SSO_CLIENT_SECRET'),
                }
            }).then(console.log)
            // fetch("https://oauth.alor.ru/token", {
            //     "headers": {
            //         "accept": "*/*",
            //         "accept-language": "ru-RU,ru;q=0.9",
            //         "authorization": "Basic NjFkYjBhYzEzYmI5NDEzMWIxNzQ6Y29scUhGc2FvT0hSd3A4SDVKYk5OK2dqYzdocWU1dUE4YXBLMXRsd1BMZz0=",
            //         "cache-control": "no-cache",
            //         "content-type": "application/x-www-form-urlencoded",
            //         "pragma": "no-cache",
            //         "sec-ch-ua": "\"Google Chrome\";v=\"117\", \"Not;A=Brand\";v=\"8\", \"Chromium\";v=\"117\"",
            //         "sec-ch-ua-mobile": "?0",
            //         "sec-ch-ua-platform": "\"macOS\"",
            //         "sec-fetch-dest": "empty",
            //         "sec-fetch-mode": "cors",
            //         "sec-fetch-site": "cross-site"
            //     },
            //     "referrer": "http://localhost:3000/",
            //     "referrerPolicy": "strict-origin-when-cross-origin",
            //     "body": `client_id=${getEnv('SSO_CLIENT_ID')}&client_secret=${getEnv('SSO_CLIENT_SECRET')}&grant_type=authorization_code&code=${code}&redirect_uri=https%3A%2F%2Fmaksim-zakharov.github.io%2Falor-trader-diary`,
            //     "method": "POST",
            //     "mode": "cors",
            //     "credentials": "include"
            // });
            // oAuth2.authorizationCode.getToken({
            //     // @ts-ignore
            //         clientId: getEnv('SSO_CLIENT_ID'),
            //         code,
            //         redirectUri,
            //     }).then(console.log)

            // const oauth2Token = await oAuth2.authorizationCode.getTokenFromCodeRedirect(
            //     document.location.href,
            //     {
            //         /**
            //          * The redirect URI is not actually used for any redirects, but MUST be the
            //          * same as what you passed earlier to "authorizationCode"
            //          */
            //         redirectUri,
            //
            //         /**
            //          * This is optional, but if it's passed then it also MUST be the same as
            //          * what you passed in the first step.
            //          *
            //          * If set, it will verify that the server sent the exact same state back.
            //          */
            //         // state: 'some-string',
            //
            //         // codeVerifier: '',
            //     }
            // );
            //
            // console.log(oauth2Token);
        })()
        }
    }, [document.location.href])

    // @ts-ignore
    useGetUserInfoQuery({}, {
        skip: !api
    });

    const {data: _trades = [], isLoading} = useGetTradesQuery({
        tariffPlan: getCurrentTariffPlan(userInfo, settings.agreement, settings.portfolio),
        date,
        dateFrom,
        dateTo,
        commissionType: settings.commissionType,
        portfolio: settings.portfolio
    }, {
        skip: !api || !userInfo || !settings.agreement || !settings.portfolio
    })

    const {data: summary} = useGetSummaryQuery({
        exchange: Exchange.MOEX,
        format: 'Simple',
        portfolio: settings.portfolio
    }, {
        skip: !api || !userInfo || !settings.portfolio
    });

    const {data: operations = []} = useGetOperationsQuery(userInfo?.agreements[0]?.agreementNumber, {
        skip: !userInfo || !api
    });

    const {data: moneyMoves = []} = useGetMoneyMovesQuery({
            agreementNumber: settings.agreement,
            dateFrom,
            dateTo
        }, {
        skip: !userInfo || !settings.agreement || !api
    })

    const {data: _equityDynamics} = useGetEquityDynamicsQuery({
        startDate: moment(dateFrom).add(-1, 'day').format('YYYY-MM-DD'),
        endDate: dateTo,
        portfolio: settings.portfolio,
        agreementNumber: settings.agreement
    }, {
        skip: !userInfo || !settings.portfolio || !settings.agreement || !dateFrom || !api
    });

    const trades = useMemo(() => {
        const tariffPlan = getCurrentTariffPlan(userInfo, settings.agreement, settings.portfolio);
        const dayVolumes = _trades.reduce((acc, curr) => {
            const day = moment(curr.date).format('YYYY-MM-DD');
            if (!acc[day]) {
                acc[day] = 0;
            }
            // @ts-ignore
            acc[day] += curr.volume;

            return acc;
        }, {});
        return _trades.map((t) => ({
            ...t,
            // @ts-ignore
            commission: calculateCommission(tariffPlan, dayVolumes[moment(t.date).format('YYYY-MM-DD')], settings.commissionType) * t.volume,
        }))
    }, [userInfo, settings.commissionType, settings.agreement, settings.portfolio, _trades])

    useEffect(() => {
        if (settings.token)
            dispatch(initApi({token: settings.token}))
    }, [settings.token])

    useEffect(() => {
        if (settings.token && settings.portfolio && location.pathname.endsWith('/login')) {
            navigate('/')
        }
    }, [location.pathname, settings.token, settings.portfolio]);

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

    useEffect(() => {
        // Если токена нет - редирект на логин
        if (!settings.token && !location.pathname.endsWith('/login')) {
            navigate('/login');
        } else
            // Если портфолио нет - редирект на страницу выбора логина
        if (!settings.portfolio && !location.pathname.endsWith('/login')) {
            navigate('/login');
        }
    }, [settings.token, settings.portfolio, location.pathname]);

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

        return tradesToHistoryPositions(allTrades as any);
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

    const lastWithdrawals = useAppSelector(state => state.alorSlice.lastWithdrawals)

    const equityDynamics = useMemo(() => {
        if (!summary) {
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
                date: moment().format('YYYY-MM-DDTHH:mm:ss'),
                value: summary.portfolioLiquidationValue
            } as any)
        }

        result.portfolioValues = result.portfolioValues.filter(p => !!p.value);

        return result;
    }, [_equityDynamics, summary]);

    useEffect(() => {
        localStorage.setItem('symbols', JSON.stringify(symbols));
    }, [symbols]);

    const menuItems: (MenuItemType & { element: ReactNode })[] = [
        {
            key: 'diary',
            label: 'Дневник',
            element: <Diary getIsinBySymbol={getIsinBySymbol} getListSectionBySymbol={getListSectionBySymbol}
                            isMobile={width < 400 ? 1 : width < 1200 ? Math.round(width / 410) : 0}
                            moneyMoves={moneyMoves || []}
                            data={data} isLoading={isLoading}
                            lastWithdrawals={lastWithdrawals} operations={operations}/>
        },
        {
            key: 'analytics',
            label: 'Аналитика',
            element: <Analytics getIsinBySymbol={getIsinBySymbol}
                                getListSectionBySymbol={getListSectionBySymbol} data={data}
                                balanceSeriesData={equityDynamics?.portfolioValues.map(v => ({
                                    time: moment(v.date).format('YYYY-MM-DD'),
                                    value: v.value
                                })) || []} api={api} isLoading={isLoading} dateFrom={dateFrom}/>,
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
