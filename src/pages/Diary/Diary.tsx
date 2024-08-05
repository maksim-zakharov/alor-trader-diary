import {
    Button,
    Card, Carousel,
    Col,
    DatePicker,
    DatePickerProps,
    Descriptions,
    Divider,
    Form,
    Input,
    message,
    Popconfirm,
    Radio,
    Result,
    Row,
    SelectProps,
    Space,
    Statistic,
    Table,
    Tabs,
    Tag,
    Timeline,
    Typography,
} from 'antd';
import {
    AppstoreOutlined,
    ArrowDownOutlined,
    ArrowUpOutlined, ClockCircleOutlined,
    DeleteOutlined,
    EditOutlined,
    EyeInvisibleOutlined,
    EyeOutlined,
    LogoutOutlined,
    MoonOutlined,
    ReloadOutlined,
    RetweetOutlined,
    SearchOutlined,
    SettingOutlined,
    ShareAltOutlined,
    SunOutlined,
    SwapOutlined,
    TableOutlined
} from '@ant-design/icons';
import List from 'rc-virtual-list';

import FormItem from 'antd/es/form/FormItem';
import React, {ChangeEventHandler, FC, useEffect, useMemo, useRef, useState} from 'react';
import {ColumnsType} from 'antd/es/table';
import moment from 'moment/moment';
import {selectOptions, summ} from '../../App';
import {moneyFormat, shortNumberFormat} from '../../common/utils';
import {Exchange} from "alor-api";
import dayjs from "dayjs";
import {useSearchParams} from "react-router-dom";
import PositionDetails from "./components/PositionDetails";
import {Currency, Status} from "alor-api/dist/services/ClientInfoService/ClientInfoService";
import {humanize, numberToPercent} from "../../utils";
import NoResult from "../../common/NoResult";
import TickerImg from "../../common/TickerImg";
import {useAppDispatch, useAppSelector} from "../../store";
import {
    useCreateOperationMutation,
    useGetAllSummariesQuery,
    useGetDescriptionQuery,
    useGetDividendsQuery,
    useGetMoneyMovesQuery,
    useGetNewsQuery,
    useGetOperationCodeMutation,
    useGetSecuritiesMutation, useGetSecurityByExchangeAndSymbolQuery,
    useGetSummaryQuery,
    useSignOperationMutation
} from "../../api/alor.api";
import {logout, selectCurrentPortfolio, setSettings} from "../../api/alor.slice";
import Spinner from "../../common/Spinner";
import Title from "antd/es/typography/Title";
import ASelect from "../../common/Select";
import OperationsDrawer from "./components/OperationsDrawer";
import Chart from "./components/Chart";
import MoneyOutputIcon from "../../assets/money-output";
import MoneyInputIcon from "../../assets/money-input";
import useWindowDimensions from "../../common/useWindowDimensions";
import DraggableDrawer from "../../common/DraggableDrawerHOC";
import WithdrawDrawer from "./components/WithdrawDrawer";
import MobilePosition from "./components/MobilePosition";
import MobileSearch from "./components/MobileSearch";
import MobileSummaryCarousel from "./components/MobileSummaryCarousel";
import MonthRender from "./components/MonthRender";
import useScroll from "../../common/useScroll";
import TTitle from "../../common/TTitle";

interface DataType {
    key: string;
    name: string;
    age: number;
    address: string;
    tags: string[];
}

interface DataType {
    key: string;
    name: string;
    age: number;
    tel: string;
    phone: number;
    address: string;
}

interface IProps {
    data: any;
    trades?: any;
    isLoading: boolean;
    isMobile: number
    getListSectionBySymbol: any;
    getIsinBySymbol: any;
    dateFrom?: string;
    dateTo?: string;
}

const Diary: FC<IProps> = ({
                               trades,
                               getListSectionBySymbol,
                               data,
                               isLoading,
                               getIsinBySymbol,
                               dateFrom,
                               dateTo,
                               isMobile
                           }) => {

    const dispatch = useAppDispatch();
    const settings = useAppSelector(state => state.alorSlice.settings);
    const userInfo = useAppSelector(state => state.alorSlice.userInfo);

    const {data: moneyMoves = []} = useGetMoneyMovesQuery({
        agreementNumber: settings.agreement,
        dateFrom,
        dateTo
    }, {
        skip: !userInfo || !settings.agreement
    })

    const {data: summary, isLoading: isSummaryLoading} = useGetSummaryQuery({
        exchange: Exchange.MOEX,
        format: 'Simple',
        portfolio: settings.portfolio
    }, {
        skip: !userInfo || !settings.portfolio
    });

    const agreementsMap = useAppSelector(state => state.alorSlice.agreementsMap);
    const currentPortfolio = useAppSelector(selectCurrentPortfolio);

    const moneyMovesCommission = useMemo(() => summ(moneyMoves.filter(m => m.title === "Комиссия брокера").map(m => m.sum)), [moneyMoves]);

    const [reasons, setReasons] = useState<{ [id: string]: string }>(
        JSON.parse(localStorage.getItem('reasons') || '{}'),
    );

    const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');

    useEffect(() => {
        if ((theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches) || theme === 'dark') {
            document.body.className = 'dark-theme';
        } else {
            document.body.removeAttribute('class');
        }
    }, [theme]);

    const [comments, setComments] = useState<{ [id: string]: string }>(
        JSON.parse(localStorage.getItem('state') || '{}'),
    );

    useEffect(() => {
        localStorage.setItem('state', JSON.stringify(comments));
    }, [comments]);

    const nightMode = useMemo(() => (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches) || theme === 'dark', [theme]);

    const expandedRowRender = (row: any) => <PositionDetails trades={row.trades} symbol={row.symbol}
                                                             nightMode={nightMode}/>;
    const selectProps = (position: any): SelectProps => {
        const onSelect: SelectProps['onSelect'] = (value) => {
            setReasons((prevState) => ({...prevState, [position.id]: value}));
        };

        return {
            value: reasons[position.id],
            defaultValue: reasons[position.id],
            options: selectOptions,
            onSelect,
        };
    };

    const inputProps = (position: any) => {
        const onChange: ChangeEventHandler = (e: any) => {
            const value = e.target.value;
            setComments((prevState) => ({...prevState, [position.id]: value}));
        };

        return {
            value: comments[position.id],
            defaultValue: comments[position.id],
            onChange,
        };
    };

    useEffect(() => {
        localStorage.setItem('reasons', JSON.stringify(reasons));
    }, [reasons]);

    const copyToClipboard = (symbol: string) => {
        navigator.clipboard.writeText(symbol);
        message.info(`Тикер ${symbol} скопирован.`);
    };

    const [hidenMap, setHidenMap] = useState({});

    const renderVolume = (row) => {
        if (row.type === 'summary') {
            return;
        }

        const changeVolumeView = () => {
            setHidenMap(prevState => ({...prevState, [row.id]: !!!prevState[row.id]}))
        }

        if (!hidenMap[row.id]) {
            return <>
                {shortNumberFormat(row.openVolume, 0, 2)} / {shortNumberFormat(row.closeVolume, 0, 2)} <RetweetOutlined
                style={{cursor: 'pointer'}} onClick={changeVolumeView}/>
            </>
        }

        return <>
            {moneyFormat(row.openVolume, 0)} / {moneyFormat(row.closeVolume, 0)} <RetweetOutlined
            style={{cursor: 'pointer'}} onClick={changeVolumeView}/>
        </>
    }

    const columns: ColumnsType<DataType> = useMemo(() =>
            [
                {
                    title: 'Тикер',
                    dataIndex: 'symbol',
                    key: 'symbol',
                    width: 60,
                    align: 'center',
                    // onCell: (record: any) => record.type === 'summary'  && ({className: record.PnL > 0 ? 'profit' : 'loss'}),
                    // @ts-ignore
                    render: (_, row) => row.type !== 'summary' &&
                        <span className="link-color" onClick={() => copyToClipboard(row.symbol)}
                              style={{cursor: 'pointer'}}>${row.symbol}</span>,
                },
                {
                    title: 'Время открытия',
                    dataIndex: 'openDate',
                    key: 'openDate',
                    width: 160,
                    align: 'center',
                    // onCell: (record: any) => record.type === 'summary'  && ({className: record.PnL > 0 ? 'profit' : 'loss'}),
                    render: (_, row) =>
                        // @ts-ignore
                        row.type !== 'summary'
                            ? // @ts-ignore
                            moment(row.openDate).format('HH:mm:ss')
                            : // @ts-ignore
                            moment(row.openDate).format('DD.MM.YYYY'),
                    // onCell: sharedOnCell,
                },
                currentPortfolio?.marketType === "FOND" && {
                    title: 'Эшелон',
                    dataIndex: 'symbol',
                    key: 'symbol',
                    width: 70,
                    align: 'center',
                    // onCell: (record: any) => record.type === 'summary'  && ({className: record.PnL > 0 ? 'profit' : 'loss'}),
                    render: (_, row) =>
                        // @ts-ignore
                        row.type !== 'summary' && (getListSectionBySymbol(row.symbol) || 'Not found'),
                    // onCell: sharedOnCell,
                },
                {
                    title: 'Длительность',
                    dataIndex: 'duration',
                    key: 'duration',
                    width: 130,
                    align: 'center',
                    // onCell: (record: any) => record.type === 'summary'  && ({className: record.PnL > 0 ? 'profit' : 'loss'}),
                    render: (_, row) =>
                        // @ts-ignore
                        row.type !== 'summary' && humanize(moment.duration(_, 'seconds')),
                    // onCell: sharedOnCell,
                },
                {
                    title: 'L/S',
                    dataIndex: 'side',
                    key: 'side',
                    align: 'center',
                    // onCell: (record: any) => record.type === 'summary'  && ({className: record.PnL > 0 ? 'profit' : 'loss'}),
                    render: (_, row) =>
                        // @ts-ignore
                        row.type !== 'summary' &&
                        // @ts-ignore
                        (row.side === 'sell' ? <ArrowDownOutlined/> : <ArrowUpOutlined/>),
                },
                {
                    title: 'PnL %',
                    dataIndex: 'PnLPercent',
                    key: 'PnLPercent',
                    align: 'center',
                    // onCell: (record: any) => record.type === 'summary'  && ({className: record.PnL > 0 ? 'profit' : 'loss'}),
                    // onCell: (record: any, rowIndex) => ({className: record.PnLPercent > 0 ? 'profit' : 'loss'}),
                    // render: (_, row) => moneyFormat(_)
                    render: (val: number, row: any) =>
                        row.type !== 'summary' && `${numberToPercent(val)}%`,
                },
                {
                    title: 'PnL',
                    dataIndex: 'PnL',
                    key: 'PnL',
                    align: 'center',
                    onCell: (record: any, rowIndex) => ({
                        className:
                            record.type !== 'summary' && (record.PnL > 0 ? 'profit' : 'loss'),
                        style: {textAlign: 'center'},
                    }),
                    render: (_, row: any) =>
                        row.type !== 'summary' ? (
                            moneyFormat(_)
                        ) : (
                            <strong>{moneyFormat(_)}</strong>
                        ),
                    // onCell: (_, index) => ({
                    //     colSpan: index === 1 ? 4 : 1,
                    // }),
                },
                {
                    title: 'Объем',
                    dataIndex: 'volume',
                    key: 'volume',
                    align: 'center',
                    // onCell: (record: any) => record.type === 'summary'  && ({className: record.PnL > 0 ? 'profit' : 'loss'}),
                    render: (_, row: any, index) => renderVolume(row),
                },
                {
                    title: 'Комиссия',
                    dataIndex: 'Fee',
                    key: 'Fee',
                    align: 'center',
                    // onCell: (record: any) => record.type === 'summary'  && ({className: record.PnL > 0 ? 'profit' : 'loss'}),
                    render: (_, row) => `${moneyFormat(_)} ${row.type !== 'summary' ? `(${(_ * 100 / (row.openVolume + row.closeVolume)).toFixed(3)}%)` : ''}`,
                },
                {
                    title: 'Причина',
                    dataIndex: 'reason',
                    key: 'reason',
                    width: 200,
                    // onCell: (record: any) => record.type === 'summary'  && ({className: record.PnL > 0 ? 'profit' : 'loss'}),
                    render: (_, row: any) =>
                        row.type !== 'summary' && (
                            <ASelect
                                key={`${row.id}-reason-select`}
                                size="small"
                                style={{width: '180px'}}
                                allowClear
                                placeholder="Выберите причину..."
                                {...selectProps(row)}
                            />
                        ),
                },
                {
                    title: 'Комментарий',
                    dataIndex: 'comment',
                    key: 'comment',
                    // onCell: (record: any) => record.type === 'summary'  && ({className: record.PnL > 0 ? 'profit' : 'loss'}),
                    render: (_, row: any) =>
                        row.type !== 'summary' && (
                            <Input
                                key={`${row.id}-comment-input`}
                                size="small"
                                allowClear
                                placeholder="Добавьте комментарий..."
                                {...inputProps(row)}
                            />
                        ),
                },
            ].filter(c => !!c && (!isMobile || !['comment', 'reason', 'side', 'PnLPercent', 'Fee'].includes(c.dataIndex))) as any[]
        , [isMobile, hidenMap, currentPortfolio]);


    const settingsInputProps = (field: string) => {
        const onChange = (e: any) => {
            const value = e.target ? e.target.value : e;
            dispatch(setSettings(({[field]: value})));
        };

        return {
            value: settings[field],
            defaultValue: settings[field],
            onChange,
            name: field,
            id: field
        };
    };

    const netProfitPercent = useMemo(() => !summary ? 0 : data.totalPnL * 100 / (summary?.portfolioEvaluation - data.totalPnL), [data.totalPnL, summary?.portfolioEvaluation]);

    const [searchParams, setSearchParams] = useSearchParams();
    let showOperationsModal = searchParams.get('drawer') === 'operations';
    let showSettings = searchParams.get('drawer') === 'settings';
    let symbol = searchParams.get('symbol');
    let exchange = searchParams.get('exchange');
    let symbolTab = searchParams.get('symbolTab') || 'description';

    const {data: news = []} = useGetNewsQuery({
        symbols: symbol,
        limit: 100,
        offset: 0
    }, {
        skip: !symbol
    });

    const newsMap = useMemo(() => news.reduce((acc, curr) => ({...acc, [curr.id]: curr}), {}), [news]);

    const selectedNews = searchParams.get('newsId');

    const selectNews = (id) => {
        if (id) {
            searchParams.set('newsId', id);
        } else {
            searchParams.delete('newsId');
        }

        setSearchParams(searchParams);
    }

    const darkColors = useAppSelector(state => state.alorSlice.darkColors);
    const {data: description} = useGetDescriptionQuery({
        ticker: symbol
    }, {
        skip: !symbol
    });const {data: security} = useGetSecurityByExchangeAndSymbolQuery({
            symbol: symbol,
            exchange: exchange || "MOEX",
        },
        {
            skip:  !symbol
        });
    const digits = useMemo(() => security ? `${security.minstep}`.split('.')[1]?.length : 0, [security]);
    const {data: dividendsData, error: dividendsError} = useGetDividendsQuery({
        ticker: symbol
    }, {
        skip: !symbol,
    });

    const dividends = dividendsData || [];

    const setShowOperationsModal = (drawerName: string) => (opened: boolean) => {
        if (opened) {
            searchParams.set('drawer', drawerName);
        } else {
            searchParams.delete('drawer');
        }
        setSearchParams(searchParams);
    }
    const closeSymbolModal = () => {
        searchParams.delete('selectedSymbolKey');
        searchParams.delete('symbol');
        searchParams.delete('exchange');
        searchParams.delete('symbolTab');
        setSearchParams(searchParams);
    }

    const onHandleSelectSymbolTab = (symbolTab) => {
        searchParams.set('symbolTab', symbolTab);
        setSearchParams(searchParams);
    }

    if (!dateFrom) {
        dateFrom = moment().startOf('month').format('YYYY-MM-DD');
    }
    const currentDates: DatePickerProps['value'] = dayjs(dateFrom);

    const onChangeDate = (dateFrom) => {
        searchParams.set('dateFrom', dateFrom.format('YYYY-MM-DD'));
        setSearchParams(searchParams);
    };

    const onChangeNightMode = (e) => {
        localStorage.setItem('theme', e);

        if ((e === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches) || e === 'dark') {
            document.body.className = 'dark-theme';
        }
        setTheme(e);
    };

    const weeks = useMemo(() => {
        const result = new Map<number, any>([]);
        const nonSummary = data.positions.filter(p => p.type !== 'summary');
        for (let i = 0; i < nonSummary.length; i++) {
            const row = nonSummary[i];
            const weekNumber = moment(row.openDate).week();
            let week = result.get(weekNumber);
            if (!week) {
                week = {
                    trades: []
                };
            }
            week.trades.push(row);
            result.set(weekNumber, week);
        }

        return Array.from(result).map(([key, value]) => [key, {
            ...value,
            month: moment(value.trades[0].openDate).month(),
            year: moment(value.trades[0].openDate).year(),
            winRate: value.trades.filter(t => t.PnL >= 0).length / value.trades.length,
            PnL: summ(value.trades.map(t => t.PnL)),
            volume: summ(value.trades.map(t => t.openVolume + t.closeVolume)),
            tradesCount: value.trades.length,
            from: moment(value.trades[0].openDate).startOf('week').format('ll'),
            to: moment(value.trades[0].openDate).endOf('week').format('ll')
        }]);
    }, [data.positions]);

    const years = useMemo(() => Array.from(new Set(weeks.map(([key, value]) => value.year))), [weeks]);

    const YearRender: FC<any> = ({year}) => {
        const months = useMemo(() => Array.from(new Set(weeks.filter(([_, w]) => w.year === year).map(([key, value]) => value.month))), [weeks]);

        return <>
            <div style={{
                fontSize: '48px',
                fontWeight: 'bold'
            }}>{year}</div>
            <Timeline
                className="MonthRenderTimeline"
                items={
                    months.map(month => ({
                        children: <MonthRender weeks={weeks} isMobile={isMobile} month={month} year={year}/>,
                        color: 'rgba(var(--pro-input-color), 1)'
                    }))}
            />
        </>
    }

    const [view, setView] = useState(searchParams.get('view') || 'table');

    const onChangeView = (view: string) => {
        searchParams.set('view', view);
        setSearchParams(searchParams);
        setView(view)
    }

    const options = [
        {label: <TableOutlined/>, value: 'table'},
        {label: <AppstoreOutlined/>, value: 'week'},
    ];

    const todayPnL = useMemo(() => data.positions.find(row => row.type === 'summary' && moment(row.openDate).format('DD.MM.YYYY') === moment().format('DD.MM.YYYY'))?.PnL || 0, [data.positions]);

    const summaryValue = useMemo(() => {
        if (!summary) {
            return 0;
        }
        if (!settings['summaryType'] || settings['summaryType'] === 'brokerSummary') {
            return summary.portfolioLiquidationValue || 0;
        }

        return summary.buyingPowerAtMorning + todayPnL;
    }, [summary, settings['summaryType'], todayPnL]);

    const Summary = () => <div
        style={{
            display: 'flex',
            gap: '16px',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap'
        }}
    >
        <Statistic
            title="Баланс"
            loading={isSummaryLoading}
            value={moneyFormat(summaryValue)}
            precision={2}
        />
    </div>

    const themeOptions = [
        {
            label: 'Системная',
            value: 'system',
            icon: <SettingOutlined/>
        }, {
            label: `Светлая`,
            value: 'light',
            icon: <SunOutlined/>
        }, {
            label: `Темная`,
            value: 'dark',
            icon: <MoonOutlined/>
        }
    ]

    const InfoPanelDesktop = () => <div
        className="InfoPanelDesktop"
    >
        <Summary/>
        <div
            style={{
                display: 'flex',
                gap: '32px',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap'
            }}
        >
            <Statistic
                title="Сделок"
                loading={isLoading}
                value={`${data.positions.filter(p => p.type !== 'summary').length} trades`}
                precision={2}
            />
            <Statistic
                title="Чистая прибыль"
                loading={isLoading}
                value={`${moneyFormat(data.totalPnL)} (${shortNumberFormat(netProfitPercent)}%)`}
                precision={2}
                valueStyle={{
                    color:
                        data.totalPnL > 0 ? 'rgba(var(--table-profit-color),1)' : 'rgba(var(--table-loss-color),1)',
                }}
            />
            <Statistic
                title="Общ. комиссия"
                loading={isLoading}
                value={moneyFormat(data.totalFee)}
                precision={2}
                valueStyle={{color: 'rgba(var(--table-loss-color),1)'}}
            />
            <Button
                type="text"
                icon={<SettingOutlined/>}
                onClick={(f) => setShowOperationsModal('settings')(true)}
            />
            <Button
                type="text"
                icon={<SwapOutlined/>}
                onClick={(f) => setShowOperationsModal('operations')(true)}
            >Операции</Button>

            <Button
                type="text"
                icon={<LogoutOutlined/>}
                onClick={(f) => setShowOperationsModal('payout')(true)}
            >Вывести</Button>

            <DatePicker value={currentDates} onChange={onChangeDate} style={{width: 120}}/>


            <Radio.Group options={options} onChange={e => onChangeView(e.target.value)} value={view}
                         optionType="button"/>
        </div>
    </div>

    const dayPositions = useMemo(() => Object.entries(data.positions.reduce((acc, curr) => {
        const date = moment(curr.openDate).format('YYYY-MM-DD');
        if (!acc[date]) {
            acc[date] = [];
        }

        acc[date].push(curr);

        return acc;
    }, {})).map(p => p[1]), [data.positions]);

    const commissionOptions: any[] = [
        {label: 'По тарифу', value: 'tariff'},
        {label: 'Тейкер', value: 'taker'},
    ]

    const summaryOptions: any[] = [
        {label: 'От брокера', value: 'brokerSummary'},
        {label: 'Средства утром + прибыль', value: 'buyMorningPowerPlusPnL'},
    ]

    const handleShareButtonClick = (data: Omit<ShareData, 'files'>) => {
        if (navigator.canShare) {
            navigator.share(data)
        }
    }

    const tradeEvents = useMemo(() => trades.filter(s => s.symbol === symbol).sort((a, b) => a.date - b.date), [symbol, trades]);
    const symbolPositions = useMemo(() => data.positions.filter(s => s.symbol === symbol && s.type !== 'summary').sort((a, b) => a.time - b.time), [symbol, data.positions]);
    const {height} = useWindowDimensions();
    const listHeight = useMemo(() => isMobile ? height - 186 : height - 56, [isMobile, height]);

    return (
        <>
            <TTitle>Дневник</TTitle>
            <MobileSearch getIsinBySymbol={getIsinBySymbol}/>
            <MobileSummaryCarousel dateFrom={dateFrom} onChangeView={onChangeView} view={view} setShowOperationsModal={setShowOperationsModal} options={options} netProfitPercent={netProfitPercent} todayPnL={todayPnL} onChangeDate={onChangeDate} totalPnL={data.totalPnL}/>
            <InfoPanelDesktop/>
            <WithdrawDrawer onClose={() => setShowOperationsModal('payout')(false)}/>
            <DraggableDrawer title="Новости" open={selectedNews} placement={isMobile ? "bottom" : "right"}
                    closeIcon={<Button type="link"
                                       onClick={() => selectNews(null)}>Закрыть</Button>}
                    onClose={() => selectNews(null)}
                    extra={<Button onClick={() => handleShareButtonClick({
                        title: `${description?.shortName || symbol} | Trading Diary`,
                        text: `${window.location.host}/alor-trader-diary/#`,
                        url: `/alor-trader-diary/#/diary?symbol=${symbol}&newsId=${selectedNews}`,
                    })} icon={<ShareAltOutlined/>}/>}
            >
                <div className="description-container">
                    <h3>{newsMap[selectedNews]?.header}</h3>
                    <p dangerouslySetInnerHTML={{__html: newsMap[selectedNews]?.content}}/>
                </div>
            </DraggableDrawer>
            <DraggableDrawer title={description?.shortName || symbol} open={!selectedNews && symbol}
                    placement={isMobile ? "bottom" : "right"}
                    closeIcon={<Button type="link"
                                       onClick={closeSymbolModal}>Закрыть</Button>}
                    onClose={closeSymbolModal}
                    extra={<Button onClick={() => handleShareButtonClick({
                        title: `${description?.shortName || symbol} | Trading Diary`,
                        text: `${window.location.host}/alor-trader-diary/#`,
                        url: `/alor-trader-diary/#/diary?symbol=${symbol}`,
                    })} icon={<ShareAltOutlined/>}/>}
            >
                <Tabs activeKey={symbolTab} onTabClick={onHandleSelectSymbolTab}>
                    <Tabs.TabPane tab="Обзор" key="description">
                        <div className="description-container">
                            <Chart
                                colors={nightMode && darkColors}
                                trades={data.positions
                                    .filter(p => p.symbol === symbol)
                                    .map(p => p.trades).flat()
                                    .filter(p => p.symbol === symbol)
                            }
                                symbol={symbol}
                                digits={digits}
                                security={security}
                                from={moment().add(-8, 'hour').toISOString()}
                                to={moment().toISOString()}
                            />
                            <h3>О компании</h3>
                            <p>
                                {description?.description}
                            </p>
                        </div>
                        {security?.tradingStatus === 18 && <div className="btn-disabled" style={{position: 'fixed',
                            left: '16px',
                            right: '16px',
                            bottom: '16px'}}>
                            Биржа закрыта
                        </div>}
                    </Tabs.TabPane>
                    <Tabs.TabPane tab="Стакан" key="level2">
                        {/*<div className="level2-container">*/}
                        {/*    <OrderbookWidget api={api} symbol={symbol} key={symbol} showClusters/>*/}
                        {/*</div>*/}
                        В разработке
                    </Tabs.TabPane>
                    {dividends.filter(d => d.dividendPerShare).length > 0 && !dividendsError &&
                        <Tabs.TabPane tab="Дивиденды" key="dividends">
                        <span>
                            Дата, по которой включительно необходимо купить акции биржевых эмитентов для получения дивидендов. Начисление дивидендов ориентировочно в течение 1-2 месяцев. По внебиржевым инструментам даты строго ориентировочны и могут отличаться в связи с спецификой расчета по таким сделкам.
                        </span>
                            <table className="dividends-table">
                                <thead>
                                <th>Дата</th>
                                <th>Сумма</th>
                                <th>Доход</th>
                                </thead>
                                <tbody>
                                {dividends.filter(d => d.dividendPerShare).sort((a, b) => b.recordDate.localeCompare(a.recordDate)).map(d =>
                                    <tr key={d.id}>
                                        <td>{moment(d.recordDate).format('LL')}</td>
                                        <td>{new Intl.NumberFormat('ru-RU', {
                                            minimumFractionDigits: 0,
                                            maximumFractionDigits: 2,
                                            style: 'currency',
                                            currency: d.currency
                                        }).format(d.dividendPerShare)}</td>
                                        <td>{numberToPercent(d.dividendYield)}%</td>
                                    </tr>)}
                                </tbody>
                            </table>
                        </Tabs.TabPane>}
                    {news.length > 0 && <Tabs.TabPane tab="Новости" key="news">
                        <div className="news-list-container">
                            {news.map(n => <div className="news-list" onClick={() => selectNews(n.id)} key={n.id}>
                                <h4>{n.header}</h4>
                                <div>{moment(n.publishDate).format('LLL')}</div>
                                <p dangerouslySetInnerHTML={{__html: n.content}}/>
                            </div>)}
                        </div>
                    </Tabs.TabPane>
                    }
                    {symbolPositions.length > 0 && <Tabs.TabPane tab="Сделки" key="positions">
                        <div className="tradeEvents-list-container">
                            <List data={symbolPositions} styles={{
                                verticalScrollBar: {
                                    width: 'calc(var(--scrollbar-width) - 2px)',
                                    height: 'var(--scrollbar-width)',
                                    background: 'rgba(var(--scrollbars-bg-color), var(--scrollbars-bg-opacity))',
                                    cursor: 'pointer'
                                },
                                verticalScrollBarThumb: {
                                    border: '2px solid transparent',
                                    backgroundColor: "rgba(var(--scrollbars-thumb-color), var(--scrollbars-thumb-opacity))",
                                    backgroundClip: "padding-box",
                                    borderRadius: "5px",
                                    cursor: "pointer",
                                    // -webkit-transition: "background-color .2s ease-in",
                                    transition: "background-color .2s ease-in"
                                }
                            }} height={listHeight} itemHeight={48} itemKey="id">
                                {(dp =>
                                    <div
                                        className="ticker-info">
                                        <div style={{display: 'flex'}}>
                                            <TickerImg getIsinBySymbol={getIsinBySymbol} key={dp?.symbol} symbol={dp?.symbol}/>
                                            <div className="ticker_name">
                                                <div className="ticker_name_title">{dp?.side === 'buy'? 'Покупка' : 'Продажа'} {dp?.qtyUnits} акций</div>
                                                <div className="ticker_name_description">
                                                    {moment(dp?.openDate).format('DD.MM.YYYY HH:mm:ss')}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="ticker_actions">
                                            <div className="ticker_name_title"
                                                 style={{color: dp?.PnL > 0 ? 'rgba(var(--table-profit-color),1)' : 'rgba(var(--table-loss-color),1)'}}>
                                                <span>{moneyFormat(dp?.PnL || 0)}</span>
                                                <span>{`${numberToPercent(dp?.PnLPercent)}%`}</span>
                                            </div>
                                            <div className="ticker_name_description">на сумму {moneyFormat(dp?.volume, 0)}</div>
                                        </div>
                                    </div>)}
                            </List>
                        </div>
                    </Tabs.TabPane>
                    }
                    {tradeEvents.length > 0 && <Tabs.TabPane tab="События" key="tradeEvents">
                        <div className="tradeEvents-list-container">
                            <List data={tradeEvents} styles={{
                                verticalScrollBar: {
                                    width: 'calc(var(--scrollbar-width) - 2px)',
                                    height: 'var(--scrollbar-width)',
                                    background: 'rgba(var(--scrollbars-bg-color), var(--scrollbars-bg-opacity))',
                                    cursor: 'pointer'
                                },
                                verticalScrollBarThumb: {
                                    border: '2px solid transparent',
                                    backgroundColor: "rgba(var(--scrollbars-thumb-color), var(--scrollbars-thumb-opacity))",
                                    backgroundClip: "padding-box",
                                    borderRadius: "5px",
                                    cursor: "pointer",
                                    // -webkit-transition: "background-color .2s ease-in",
                                    transition: "background-color .2s ease-in"
                                }
                            }} height={listHeight} itemHeight={48} itemKey="id">
                                {(getMaxLossTrade =>
                                    <div className="ticker-info" key={getMaxLossTrade.id}>
                                        <div style={{display: 'flex'}}>
                                            <TickerImg getIsinBySymbol={getIsinBySymbol} key={getMaxLossTrade?.symbol} symbol={getMaxLossTrade?.symbol}/>
                                            <div className="ticker_name">
                                                <div className="ticker_name_title">{getMaxLossTrade?.side === 'buy'? 'Покупка' : 'Продажа'} {getMaxLossTrade?.qtyUnits} акций</div>
                                                <div className="ticker_name_description">
                                                    {moment(getMaxLossTrade?.date).format('DD.MM.YYYY HH:mm:ss')}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="ticker_actions">
                                            <div className="ticker_name_title"
                                                 style={{color: getMaxLossTrade?.side === 'sell' ? 'rgba(var(--table-profit-color),1)' : undefined }}>
                                                <span>{getMaxLossTrade?.side === 'buy'? '-' : '+'}{moneyFormat(getMaxLossTrade?.volume || 0)}</span>
                                            </div>
                                        </div>
                                    </div>)}
                            </List>
                        </div>
                    </Tabs.TabPane>
                    }
                </Tabs>
            </DraggableDrawer>
            <OperationsDrawer isOpened={showOperationsModal}
                              onClose={() => setShowOperationsModal('operations')(false)}/>
            <DraggableDrawer
                title="Настройки"
                placement={isMobile ? "bottom" : "right"}
                closeIcon={<Button type="link"
                                   onClick={() => setShowOperationsModal('settings')(false)}>Закрыть</Button>}
                onClose={() => setShowOperationsModal('settings')(false)}
                open={showSettings}
            >
                <Form layout="vertical">
                    {!settings.lk && <FormItem label="Alor Token">
                        <Input placeholder="Token" {...settingsInputProps('token')} />
                    </FormItem>}
                    <FormItem label="Договор">
                        <ASelect value={settings.agreement}
                                 {...settingsInputProps('agreement')}

                                 placeholder="Выберите договор"
                                 options={userInfo?.agreements?.map(p => ({
                                     label: p.cid,
                                     value: p.agreementNumber
                                 })) || []}/>
                    </FormItem>
                    <FormItem label="Alor Portfolio">
                        <ASelect value={settings.portfolio}
                                 {...settingsInputProps('portfolio')}
                                 placeholder="Выберите портфель"
                                 options={agreementsMap[settings.agreement]?.portfolios?.map(p => ({
                                     label: `${p.accountNumber} (${p.service})`,
                                     value: p.accountNumber
                                 })) || []}/>
                    </FormItem>
                    <FormItem label="Расчет комиссии">
                        <ASelect
                            style={{width: '100%'}}
                            placeholder="Комиссия"
                            value={settingsInputProps('commissionType').value}
                            onChange={val => dispatch(setSettings(({['commissionType']: val})))}
                            dropdownRender={(menu) => (
                                <>
                                    {menu}
                                    <Divider style={{margin: '8px 0'}}/>

                                    <Form layout="vertical">
                                        <FormItem label="Комиссия">
                                            <Input
                                                placeholder="Введите комиссию"
                                                value={settingsInputProps('commissionType').value}
                                                onChange={settingsInputProps('commissionType').onChange}
                                                onKeyDown={(e) => e.stopPropagation()}
                                            />
                                        </FormItem>
                                    </Form>
                                </>
                            )}
                            options={commissionOptions}
                        />
                    </FormItem>
                    {/*<FormItem label="Тема">*/}
                    {/*    <Select options={themeOptions} value={theme}*/}
                    {/*            optionRender={(option) => (*/}
                    {/*                <Space>*/}
                    {/*                    {option.data.icon}*/}
                    {/*                    <div>{option.data.label}</div>*/}
                    {/*                </Space>*/}
                    {/*            )} style={{width: '100%'}} onSelect={onChangeNightMode}/>*/}
                    {/*</FormItem>*/}
                    <FormItem label="Расчет текущих средств">
                        <ASelect options={summaryOptions} style={{width: '100%'}}
                                 value={settingsInputProps('summaryType').value || 'brokerSummary'}
                                 onChange={val => dispatch(setSettings({['summaryType']: val}))}
                        />
                    </FormItem>
                    <FormItem>
                        <Button danger style={{width: '100%'}} onClick={() => dispatch(logout())}
                                type="link">Выйти</Button>
                    </FormItem>
                </Form>
            </DraggableDrawer>
            {view === 'week' && <>
                {years.map(year => <YearRender year={year}/>)}
            </>}
            {view === 'table' && <>
                {isLoading && <div className="mobile-position-spinner">
                    <Spinner/>
                    <div className="spinner-text">Подгружаем сделки</div>
                </div>}
                <Table
                    onRow={(row: any) =>
                        row.type === 'summary' && {
                            className: row.PnL > 0 ? 'profit' : 'loss',
                        }
                    }
                    className="DesktopPositions"
                    rowKey="id"
                    columns={columns}
                    loading={isLoading}
                    dataSource={data.positions}
                    size="small"
                    pagination={false}
                    expandable={{
                        expandedRowRender,
                        defaultExpandedRowKeys: ['0'],
                        rowExpandable: (row: any) => row.type !== 'summary',
                    }}
                />
                {!isLoading && dayPositions.map(dp => <MobilePosition getIsinBySymbol={getIsinBySymbol} positions={dp}/>)}
            </>}
        </>
    );
};

export default Diary;
