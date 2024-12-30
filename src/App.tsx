// import logo from './logo.svg';
import './App.css';
import {Divider, Dropdown, Layout, Menu, MenuProps, Space,} from 'antd';
import {Content, Footer, Header} from 'antd/es/layout/layout';
import React, {ReactNode, useEffect, useMemo, useState} from 'react';
// import QuestionCircleIcon  from './assets/question-circle';
import moment from 'moment';
import {Navigate, Route, Routes, useLocation, useNavigate, useSearchParams,} from 'react-router-dom';
import {Exchange, Positions} from 'alor-api';
import Diary from './pages/Diary/Diary';
import Analytics from './pages/Analytics/Analytics';
import LoginPage from "./pages/LoginPage/LoginPage";
import {DefaultOptionType} from 'antd/es/select';
import {excludePositions, getCurrentTariffPlan, positionsToTrades, tradesToHistoryPositions} from './utils';
import useListSecs from "./useListSecs";
import {initApi, setSettings, updateDarkColors} from "./api/alor.slice";
import {useAppDispatch, useAppSelector} from "./store";
import {MenuItemType} from "antd/es/menu/interface";
import {FundOutlined, ProfileOutlined, SearchOutlined} from "@ant-design/icons";
import {
    calculateCommission,
    useGetAllSummariesQuery,
    useGetPositionsQuery,
    useGetTradesQuery,
    useGetUserInfoQuery
} from './api/alor.api';
import {getEnv, oAuth2Client} from "./api/oAuth2";
import QuestionCircleIcon from "./assets/question-circle";
import PortfolioIcon from './assets/portfolio';
import CheckIcon from './assets/check';
import {moneyFormat} from "./common/utils";
import ChevronBottomIcon from "./assets/chevron-bottom";
import useWindowDimensions from "./common/useWindowDimensions";
import WhatBuy from "./pages/WhatBuy";

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

function App() {
    const contentRef = React.createRef();
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const location = useLocation();
    const api = useAppSelector(state => state.alorSlice.api);
    const userInfo = useAppSelector(state => state.alorSlice.userInfo);
    const settings = useAppSelector(state => state.alorSlice.settings);

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
    const {refetch} = useGetUserInfoQuery({}, {skip: !settings.token || !api});

    useEffect(() => {
        const url = new URL(document.location.href);
        const code = url.searchParams.get('code');
        if (code) {
            oAuth2Client.code.getToken(document.location.href, {
                body: {
                    client_id: getEnv('SSO_CLIENT_ID'),
                    client_secret: getEnv('SSO_CLIENT_SECRET'),
                }
            }).then(({accessToken, refreshToken}) => {
                dispatch(initApi({token: refreshToken, accessToken: accessToken}))
                dispatch(setSettings(({token: refreshToken})));
                // setTimeout(() => refetch());
            })
        }
    }, [document.location.href])


    useEffect(() => {
        if (contentRef) {
            contentRef?.current?.scrollTo({
                top: 0,
                behavior: 'smooth',
            });
        }
    }, [location, contentRef]);

    useEffect(() => {
        if (userInfo && settings.token) {
            const url = new URL(window.location.href);
            if (url.searchParams.get('state') || url.searchParams.get('code')) {
                url.searchParams.delete('code');
                url.searchParams.delete('state');
                window.location.replace(url.toString());
            }

            searchParams.delete('code');
            setSearchParams(searchParams);
        }
    }, [userInfo, settings.token, searchParams])

    const {data: positions = []} = useGetPositionsQuery({
        exchange: Exchange.MOEX,
        portfolio: settings.portfolio
    }, {
        skip: !settings.portfolio
    })

    const {data: tradesData = [], isLoading} = useGetTradesQuery({
        tariffPlan: getCurrentTariffPlan(userInfo, settings.agreement, settings.portfolio),
        date,
        dateFrom,
        dateTo,
        commissionType: settings.commissionType,
        portfolio: settings.portfolio
    }, {
        skip: !userInfo || !settings.agreement || !settings.portfolio
    })

    const _trades = useMemo(() => {
        const tariffPlan = getCurrentTariffPlan(userInfo, settings.agreement, settings.portfolio);
        const dayVolumes = tradesData.reduce((acc, curr) => {
            const day = moment(curr.date).format('YYYY-MM-DD');
            if (!acc[day]) {
                acc[day] = 0;
            }
            // @ts-ignore
            acc[day] += curr.volume;

            return acc;
        }, {});
        return tradesData.map((t) => ({
            ...t,
            // @ts-ignore
            commission: calculateCommission(tariffPlan, dayVolumes[moment(t.date).format('YYYY-MM-DD')], settings.commissionType) * t.volume,
        }))
    }, [userInfo, settings.commissionType, settings.agreement, settings.portfolio, tradesData])

    useEffect(() => {
        if (settings.token)
            dispatch(initApi({token: settings.token, type: settings.lk ? 'lk' : undefined}))
    }, [settings.token])

    useEffect(() => {
        if (settings.token && settings.portfolio && location.pathname.endsWith('/login')) {
            navigate('/')
        }
    }, [location.pathname, settings.token, settings.portfolio]);

    const {height, width, isMobile} = useWindowDimensions();

    useEffect(() => {
        if (isMobile) {
            dispatch(updateDarkColors({
                backgroundColor: 'rgb(1,1,1)',
                color: 'rgb(250,250,250)',
                borderColor: 'rgba(126, 127, 136, 0.2)'
            }));
        }
    }, [isMobile]);

    const [symbols, setSymbols] = useState(
        localStorage.getItem('symbols')
            ? JSON.parse(localStorage.getItem('symbols'))
            : [],
    );

    const {getListSectionBySymbol, getIsinBySymbol} = useListSecs();

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

    const trades = useMemo(() => excludePositions(_trades, startedTrades), [_trades, startedTrades]);

    const historyPositions = useMemo(() => tradesToHistoryPositions(trades), [trades, startedTrades]);

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

    useEffect(() => {
        localStorage.setItem('symbols', JSON.stringify(symbols));
    }, [symbols]);

    const menuItems: (MenuItemType & { element: ReactNode })[] = [
        {
            key: 'diary',
            label: 'Дневник',
            icon: <ProfileOutlined/>,
            element: <Diary trades={trades} getIsinBySymbol={getIsinBySymbol}
                            getListSectionBySymbol={getListSectionBySymbol}
                            isMobile={width < 400 ? 1 : width < 1200 ? Math.round(width / 410) : 0}
                            dateFrom={dateFrom} dateTo={dateTo}
                            data={data} isLoading={isLoading}/>
        },
        isMobile && {
            key: 'what_buy',
            label: 'Что купить',
            icon: <SearchOutlined/>,
            element: <WhatBuy getIsinBySymbol={getIsinBySymbol}/>
        },
        {
            key: 'analytics',
            label: 'Аналитика',
            icon: <FundOutlined/>,
            element: <Analytics getIsinBySymbol={getIsinBySymbol}
                                getListSectionBySymbol={getListSectionBySymbol} data={data}
                                isLoading={isLoading} dateTo={dateTo} dateFrom={dateFrom}/>,
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
    ].filter(s => !!s);

    const onSelectMenu: MenuProps['onSelect'] = (e) => {
        let to = `/${e.key}`;
        if (location.search) {
            to += location.search;
        }

        navigate(to);
    };

    const MobileFooterMenu = () => {

        return <div className="MobileFooter">
            <Menu
                theme="dark"
                mode="horizontal"
                defaultSelectedKeys={[currentMenuSelectedKey]}
                items={menuItems}
                onSelect={onSelectMenu}
            />
            <a className="header-support-link" href="https://t.me/+8KsjwdNHVzIwNDQy"
               target="_blank"><QuestionCircleIcon/>Поддержка</a>
        </div>
    }

    const SelectAccountDropdown = () => {

        const {data: summaries} = useGetAllSummariesQuery({
            exchange: Exchange.MOEX,
            format: 'Simple',
            userInfo
        }, {
            skip: !userInfo
        });

        const accountSummariesMap = useMemo(() => (summaries || []).reduce((acc, curr) => ({
            ...acc,
            [curr.accountNumber]: curr
        }), {}), [summaries]);
        const agreementSummariesMap = useMemo(() => (summaries || []).reduce((acc, curr) => {
            if (!acc[curr.agreementNumber]) {
                acc[curr.agreementNumber] = 0;
            }
            acc[curr.agreementNumber] += curr.portfolioLiquidationValue;
            return acc;
        }, {}), [summaries]);

        const totalSum = useMemo(() => (summaries || []).reduce((acc, curr) => {
            acc += curr.portfolioLiquidationValue;
            return acc;
        }, 0), [summaries]);

        const items: MenuProps['items'] = useMemo(() => (userInfo?.agreements || []).map(agreement => ({
            label: <div className="portfolio-item">
                <Space><span>Договор {agreement.cid}</span></Space>
                {!agreement.isEDP && <div className="portfolio-summary">
                    <span
                        className="portfolio-description">Всего на {agreement.portfolios.length} счетах:</span>{moneyFormat(agreementSummariesMap[agreement.agreementNumber], 0, 0)}
                </div>}
            </div>,
            type: 'group',
            key: agreement.agreementNumber,
            children: (agreement.isEDP ? [{
                accountNumber: `E${agreement.agreementNumber}`,
                service: 'ЕДП'
            }] : agreement.portfolios).map(portfolio => ({
                label: <div className="portfolio-item">
                    <Space><span>{portfolio.accountNumber} ({portfolio.service})</span><CheckIcon/></Space>
                    <div
                        className="portfolio-summary">{moneyFormat(accountSummariesMap[portfolio.accountNumber]?.portfolioLiquidationValue, 0, 0)}</div>
                </div>,
                key: `${agreement.agreementNumber}-${portfolio.accountNumber}`,
                icon: <div className="portfolio-icon"><PortfolioIcon/></div>
            }))
        })), [userInfo]);

        const onSelect = ({key}) => {
            const [agreement, portfolio] = key.split('-');
            if (agreement && portfolio) {
                dispatch(setSettings(({agreement, portfolio})))
            }
        }

        return <Dropdown overlayClassName="SelectAccountDropdownMenu"
                         dropdownRender={menu => (
                             <>
                                 <div className="portfolio-item ant-dropdown-menu-item-group-title">
                                     <div className="portfolio-summary">
                                         <span className="portfolio-description">Всего на всех счетах:</span>
                                     </div>
                                     <div className="portfolio-summary">
                                         {moneyFormat(totalSum, 0, 0)}
                                     </div>
                                 </div>
                                 <Divider/>
                                 {menu}
                             </>
                         )} menu={{
            selectedKeys: [`${settings.agreement}-${settings.portfolio}`],
            items,
            onSelect,
            selectable: true
        }} trigger={['click']} className="SelectAccountDropdown">
            <a className="header-support-link" onClick={e => e.preventDefault()}>
                <Space>
                    <strong>{settings.portfolio}</strong>
                    <ChevronBottomIcon/>
                </Space>
            </a>
        </Dropdown>
    }

    return (
        <Layout ref={contentRef}>
            {userInfo && <Header style={{display: 'flex', alignItems: 'center'}}>
                <div className="menu-content">
                    <SelectAccountDropdown/>
                    <Menu
                        theme="dark"
                        mode="horizontal"
                        defaultSelectedKeys={[currentMenuSelectedKey]}
                        items={menuItems}
                        onSelect={onSelectMenu}
                    />
                    <a className="header-support-link" href="https://t.me/+8KsjwdNHVzIwNDQy"
                       target="_blank"><QuestionCircleIcon/>Поддержка</a>
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
            {userInfo && <MobileFooterMenu/>}
            {userInfo && <Footer style={{textAlign: 'center'}}>
                Alor Trader Diary ©2023 Created by Maksim Zakharov
            </Footer>}
        </Layout>
    );
}

export default App;
