import {
    Button,
    Card,
    Col,
    DatePicker,
    DatePickerProps,
    Descriptions,
    Divider,
    Drawer,
    Form,
    Input,
    message,
    Modal,
    Popconfirm,
    Radio, Result,
    Row,
    Select,
    SelectProps,
    Space,
    Statistic,
    Table,
    Tag,
    Timeline,
    Typography,
} from 'antd';
import {
    AppstoreOutlined,
    ArrowDownOutlined,
    ArrowUpOutlined,
    DeleteOutlined,
    EditOutlined,
    MoonOutlined,
    RetweetOutlined,
    ClockCircleOutlined,
    SettingOutlined,
    EyeOutlined,
    EyeInvisibleOutlined,
    ReloadOutlined,
    SunOutlined,
    SwapOutlined,
    LogoutOutlined,
    TableOutlined
} from '@ant-design/icons';

import MoneyInputIcon  from '../../assets/money-input';
import MoneyOutputIcon  from '../../assets/money-output';

import FormItem from 'antd/es/form/FormItem';
import React, {ChangeEventHandler, FC, useEffect, useMemo, useState} from 'react';
import {ColumnsType} from 'antd/es/table';
import moment from 'moment/moment';
import {selectOptions, summ} from '../../App';
import {moneyFormat, shortNumberFormat} from '../../common/utils';
import {AlorApi, Exchange} from "alor-api";
import * as days from "dayjs";
import dayjs from "dayjs";
import {useSearchParams} from "react-router-dom";
import PositionDetails from "./components/PositionDetails";
import {
    Currency,
    EquityDynamicsResponse,
    GetOperationsResponse,
    MoneyMove,
    Status, UserInfoResponse
} from "alor-api/dist/services/ClientInfoService/ClientInfoService";
import {humanize, numberToPercent} from "../../utils";
import NoResult from "../../common/NoResult";
import * as humanizeDuration from 'humanize-duration';
import TickerImg from "../../common/TickerImg";
import {useAppSelector} from "../../store";
import {useGetSummaryQuery} from "../../api/alor.api";
import {setSettings} from "../../api/alor.slice";

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
        return {colSpan: 0};
    }

    return {};
};

interface IProps {
    data: any;
    trades?: any;
    api: AlorApi;
    isLoading: boolean;
    fullName?: string;
    isMobile: number
    equityDynamics?: EquityDynamicsResponse
    moneyMoves: MoneyMove[];
    getListSectionBySymbol: any;
    getIsinBySymbol: any;
    lastWithdrawals: number[]
    operations: GetOperationsResponse[];
    userInfo: UserInfoResponse;
}

const AccountCard: FC<any> = ({
                                  bankName,
                                  settlementAccount,
                                  onEditAccount,
                                  confirmDeleteAccount,
                                  onSelect,
                                  selected
                              }) => {

    const DeleteButton: FC<any> = ({settlementAccount}: { settlementAccount: string }) => <Popconfirm
        title="Удаление счета"
        description="Вы уверены что хотите удалить счет?"
        onConfirm={() => confirmDeleteAccount(settlementAccount)}
        okText="Да"
        cancelText="Нет"
    >
        <Button icon={<DeleteOutlined/>} type="link" danger></Button>
    </Popconfirm>

    const className = useMemo(() => selected ? 'AccountCard selected' : 'AccountCard', [selected]);

    return <Card className={className} title={bankName} onClick={() => onSelect(settlementAccount)}
                 extra={<Space><Button icon={<EditOutlined key="edit"/>}
                                       onClick={() => onEditAccount(settlementAccount)}
                                       type="link"></Button><DeleteButton
                     settlementAccount={settlementAccount}/></Space>}>
        {settlementAccount}
    </Card>
}

const Diary: FC<IProps> = ({
                               getListSectionBySymbol,
                               data,
                               trades,
                               api,
                               isLoading,
                               getIsinBySymbol,
                               fullName,
                               moneyMoves,
                               isMobile,
                               lastWithdrawals,
                               operations,
                               userInfo,
                               equityDynamics
                           }) => {
    const settings = useAppSelector(state => state.alorSlice.settings);

    const {data: summary} = useGetSummaryQuery([{
        exchange: Exchange.MOEX,
        format: 'Simple',
        portfolio: settings.portfolio
    }]);

    const agreementsMap = useAppSelector(state => state.alorSlice.agreementsMap);

    const moneyMovesCommission = useMemo(() => summ(moneyMoves.filter(m => m.title === "Комиссия брокера").map(m => m.sum)), [moneyMoves]);

    const [showForm, setShowForm] = useState<boolean | string>(false);

    const [{operationId, confirmationCode, amount, success}, setPaidInfo] = useState({
        operationId: '',
        confirmationCode: '',
        amount: '',
        success: false
    })

    const [showSettings, setShowSettings] = useState(false);
    const [reasons, setReasons] = useState<{ [id: string]: string }>(
        JSON.parse(localStorage.getItem('reasons') || '{}'),
    );

    const [showOperationsModal, setShowOperationsModal] = useState(false);
    const [showPayModal, setShowPayModal] = useState(false);

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

    const [formState, setFormState] = useState<any>({});

    const [accounts, setAccounts] = useState(
        JSON.parse(localStorage.getItem('accounts') || '[]'),
    );

    const [selectedAccount, onSelect] = useState<string>('');

    useEffect(() => {
        localStorage.setItem('state', JSON.stringify(comments));
    }, [comments]);

    useEffect(() => {
        localStorage.setItem('settings', JSON.stringify(settings));
    }, [settings]);

    const nightMode = useMemo(() => (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches) || theme === 'dark', [theme]);

    const expandedRowRender = (row: any) => <PositionDetails trades={row.trades} symbol={row.symbol} api={api}
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
                {
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
                            <Select
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
            ].filter(c => !isMobile || !['comment', 'reason', 'side', 'PnLPercent', 'Fee'].includes(c.dataIndex)) as any[]
        , [isMobile, hidenMap]);


    const settingsInputProps = (field: string) => {
        const onChange = (e: any) => {
            const value = e.target ? e.target.value : e;
            setSettings(({ [field]: value}));
        };

        return {
            value: settings[field],
            defaultValue: settings[field],
            onChange,
            name: field,
            id: field
        };
    };

    const settingsFormProps = (field: string) => {
        const onChange = (e: any) => {
            const value = e.target.value;
            setFormState((prevState) => ({...prevState, [field]: value}));
        };

        return {
            value: formState[field],
            defaultValue: formState[field],
            onChange,
            name: field,
            id: field
        };
    };

    const [error, setError] = useState(undefined);

    const netProfitPercent = useMemo(() => !summary ? 0 : data.totalPnL * 100 / (summary?.portfolioEvaluation - data.totalPnL), [data.totalPnL, summary?.portfolioEvaluation]);

    const createOperation = async () => {
        setError(undefined);

        const agreementNumber = settings.portfolio.replace('D', '');

        const account = accounts.find(a => a.settlementAccount === selectedAccount) || settings;
        if (!account.settlementAccount) {
            return;
        }

        const operationResult = await api.clientInfo.createOperation(agreementNumber, {
            account: settings.portfolio,
            bic: account.bic,
            amount: Number((amount || "").replaceAll(" ", '')),
            all: false,
            bankName: account.bankName,
            loroAccount: account.loroAccount,
            recipient: fullName,
            agree: true,
            settlementAccount: account.settlementAccount,
            currency: Currency.RUB,
            subportfolioFrom: "MOEX"
        })

        if(operationResult.errorMessage){
            setError(operationResult.errorMessage);
            return;
        }

        const codeResponse = await api.clientInfo.getOperationCode({
            operationId: operationResult.operationId.toString(),
            agreementNumber
        });

        setPaidInfo(prevState => ({...prevState, operationId: operationResult.operationId.toString()}))
    }
    const signOperation = async () => {
        const agreementNumber = settings.portfolio.replace('D', '');

        const result = await api.clientInfo.signOperation({
            agreementNumber,
            operationId,
            confirmationCode
        })

        if (result.success) {
            setPaidInfo({
                confirmationCode: '',
                operationId: '',
                amount: '',
                success: true
            })
        }
    }
    const sendAgain = () => setPaidInfo({
        confirmationCode: '',
        operationId: '',
        amount: '',
        success: false
    })
    const [searchParams, setSearchParams] = useSearchParams();
    let dateFrom = searchParams.get('dateFrom');

    if (!dateFrom) {
        dateFrom = moment().startOf('month').format('YYYY-MM-DD');
    }
    const currentDates: DatePickerProps['value'] = days(dateFrom);

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

    const confirmDeleteAccount = (settlementAccount: string) => {
        // @deprecate
        if (settings['settlementAccount'] === settlementAccount) {

            setSettings((state: any) => {
                const {token, portfolio, amount, ...prevState} = state;

                return {token, portfolio, amount} as any
            });
        } else {
            setAccounts(accounts.filter(a => a.settlementAccount !== settlementAccount));
            localStorage.setItem('accounts', JSON.stringify(accounts.filter(a => a.settlementAccount !== settlementAccount)));
            cancelEditAccount();
        }

    }

    const saveAccount = () => {
        let edited = false;
        for (let i = 0; i < accounts.length; i++) {
            if (accounts[i].settlementAccount === formState.settlementAccount) {
                accounts[i] = formState;
                edited = true;
            }
        }
        if (!edited) {
            accounts.push(formState)
        }
        setAccounts(accounts);
        localStorage.setItem('accounts', JSON.stringify(accounts));
        cancelEditAccount();
    }

    const onEditAccount = (settlementAccount: string) => {
        // @deprecate
        if (settings['settlementAccount'] === settlementAccount) {
            setFormState(settings)
            setShowForm(settings['settlementAccount']);
        } else {
            const account = accounts.find(a => a.settlementAccount === settlementAccount) || {};

            setFormState(account)
            setShowForm(account['settlementAccount']);
        }
    }

    const cancelEditAccount = () => {
        setFormState({})
        setShowForm(false);
        onSelect('');
        setShowPayModal(false);
        setPaidInfo({
            operationId: '',
            confirmationCode: '',
            amount: '',
            success: false
        })
    }

    const AccountList = () => {
        if (!accounts.length && !settings['settlementAccount'] && !showForm) {
            return <div style={{
                marginTop: "20px",
                paddingTop: "20px",
                display: "inline-block",
                textAlign: "center",
                width: '100%'
            }}><NoResult text={"Счета для вывода средств отсутствуют"}/></div>
        }

        return <>
            {(accounts.length || settings['settlementAccount']) && <>
                <Divider/>
                <Typography.Text>Выберите банковский счет</Typography.Text>
            </>}
            {settings['settlementAccount'] && showForm !== settings['settlementAccount'] &&
                <AccountCard key={settings['settlementAccount']} bankName={settings['bankName']}
                             onSelect={onSelect}
                             selected={settings['settlementAccount'] === selectedAccount}
                             settlementAccount={settings['settlementAccount']}
                             onEditAccount={onEditAccount}
                             confirmDeleteAccount={confirmDeleteAccount}/>
            }
            {accounts.map(account => showForm !== account['settlementAccount'] &&
                <AccountCard key={account['settlementAccount']}
                             bankName={account['bankName']}
                             selected={account['settlementAccount'] === selectedAccount}
                             settlementAccount={account['settlementAccount']}
                             onEditAccount={onEditAccount}
                             onSelect={onSelect}
                             confirmDeleteAccount={confirmDeleteAccount}/>)}
        </>
    }

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

    const MonthRender = ({month, year}) => {
        const weeksByMonth = useMemo(() => weeks.filter(([_, week]) => week.month === month && week.year === year), [month, weeks]);

        const weeksRows = useMemo(() => {
            const rows = [];
            const offset = isMobile || 3; //  ? 1 : 3
            for (let i = 0; i < weeksByMonth.length; i += offset) {
                const row = weeksByMonth.slice(i, i + offset);
                rows.push(row)
            }

            return rows;
        }, [weeksByMonth, isMobile]);

        const title = useMemo(() => moment(weeksByMonth[0][1].trades[0].openDate).startOf('week').format('MMMM'), [month]);

        const monthTotalResult = useMemo(()  => summ(weeksByMonth.map(([_, week]) => week.PnL)), [weeksByMonth]);

        return <>
            <div className="MonthRenderTitle">{title}<span style={{color: monthTotalResult > 0 ? 'rgba(var(--table-profit-color),1)' : 'rgba(var(--table-loss-color),1)'}}>{moneyFormat(monthTotalResult)}</span></div>
            {weeksRows.map(row => <Row gutter={16}>
                {row.map(([weekNumber, week]) => <Col span={isMobile ? 24 / isMobile : 8}>
                    <Card title={`${week.from} - ${week.to}`} bordered={false}
                          className={`MonthRenderCard ${week.PnL > 0 ? 'profit' : 'loss'}`}>
                        <Descriptions column={isMobile ? 2 : 4} layout="vertical">
                            <Descriptions.Item label="Чистая прибыль">
                                <div
                                    style={{color: week.PnL > 0 ? 'rgba(var(--table-profit-color),1)' : 'rgba(var(--table-loss-color),1)'}}>{moneyFormat(week.PnL)}</div>
                            </Descriptions.Item>
                            <Descriptions.Item label="Сделок">
                                {week.tradesCount}
                            </Descriptions.Item>
                            <Descriptions.Item label="Объем">
                                {moneyFormat(week.volume, 0)}
                            </Descriptions.Item>
                            <Descriptions.Item label="Процент побед">
                                {numberToPercent(week.winRate)}%
                            </Descriptions.Item>
                        </Descriptions>
                    </Card>
                </Col>)}
            </Row>)}
        </>
    }

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
                        children: <MonthRender month={month} year={year}/>,
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
        if(!summary){
            return 0;
        }
        if(!settings['summaryType'] || settings['summaryType'] === 'brokerSummary'){
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
            loading={isLoading}
            value={moneyFormat(summaryValue)}
            precision={2}
        />
    </div>

    const MobileDatepicker = () => <div className="MobileDatepicker">
        <label htmlFor="mobile-date">от {dateFrom}</label>
        <input type="date" id="mobile-date" value={dateFrom}
               onChange={date => onChangeDate(dayjs(date.target.value, 'YYYY-MM-DD'))}/>
    </div>

    const MobileSummary = () => <div className="MobileSummary widget">
        <div style={{display: 'flex',     alignItems: 'baseline',
            justifyContent: 'space-between'}}>
            <div>
                <div className="summary">{settings['hideSummary'] ? '••••' : moneyFormat(summaryValue)}</div>
                <div style={{
                    display: 'inline-flex',
                    alignItems: 'end'
                }}>
                    <div
                        className={`result ${data.totalPnL > 0 ? 'profit' : 'loss'}`}>{data.totalPnL > 0 ? '+' : ''}{moneyFormat(data.totalPnL)}
                        <span className='percent'>{shortNumberFormat(netProfitPercent)}%</span>
                    </div>
                    <MobileDatepicker/>
                </div>
            </div>

            <Space>
                <Button
                    type="text"
                    icon={settings['hideSummary']? <EyeOutlined/> :<EyeInvisibleOutlined/>}
                    className="vertical-button"
                    onClick={(f) => setSettings((prevState) => ({...prevState, ['hideSummary']: !prevState['hideSummary']}))}
                />
                <Button
                    type="text"
                    icon={<SettingOutlined/>}
                    className="vertical-button"
                    onClick={(f) => setShowSettings(true)}
                />
            </Space>
        </div>
        <div className="button-group">
            <Button
                type="text"
                icon={<SwapOutlined/>}
                className="vertical-button"
                onClick={(f) => setShowOperationsModal(true)}
            >Операции</Button>

            <Button
                type="text"
                icon={<LogoutOutlined />}
                className="vertical-button"
                onClick={(f) => setShowPayModal(true)}
            >Вывести</Button>

            <Radio.Group options={options} onChange={e => onChangeView(e.target.value)} value={view} size="large"
                         optionType="button"/>
        </div>
    </div>

    const MobilePosition = ({positions}) => {
        const summary = useMemo(() => positions.find(p => p.type === 'summary'), [positions]);
        const dayPositions = useMemo(() => positions.filter(p => p.type !== 'summary'), [positions]);

        return <div className="MobilePosition widget">
            <div style={{display: 'flex', alignItems: 'end'}}>
                <div className="title-container">
                    <div className="title">{moment(summary.openDate).format('DD.MM.YYYY')}</div>
                    <div style={{
                        display: 'inline-flex',
                        alignItems: 'end'
                    }}>
                        <div
                            className={`result ${summary.PnL > 0 ? 'profit' : 'loss'}`}>{summary.PnL > 0 ? '+' : ''}{moneyFormat(summary.PnL)}
                            {/*<span className='percent'>{shortNumberFormat(netProfitPercent)}%</span>*/}
                        </div>
                    </div>
                </div>
            </div>
            {dayPositions.map(dp =>
                <div className="ticker-info">
                    <div style={{display: 'flex'}}>
                        <TickerImg getIsinBySymbol={getIsinBySymbol} symbol={dp?.symbol}/>
                        <div className="ticker_name">
                            <div className="ticker_name_title">{dp?.symbol}</div>
                            <div className="ticker_name_description">
                                {moment(dp?.openDate).format('HH:mm:ss')}
                            </div>
                        </div>
                    </div>
                    <div className="ticker_actions">
                        <div className="ticker_name_title"
                             style={{color: dp?.PnL > 0 ? 'rgba(var(--table-profit-color),1)' : 'rgba(var(--table-loss-color),1)'}}>{moneyFormat(dp?.PnL || 0)} ({`${numberToPercent(dp?.PnLPercent)}%`})
                        </div>
                        <div className="ticker_name_description">на сумму {moneyFormat(dp?.volume, 0)}</div>
                    </div>
                </div>)}
        </div>
    }

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
                onClick={(f) => setShowSettings(true)}
            />
            <Button
                type="text"
                icon={<SwapOutlined/>}
                onClick={(f) => setShowOperationsModal(true)}
            >Операции</Button>

            <Button
                type="text"
                icon={<LogoutOutlined />}
                onClick={(f) => setShowPayModal(true)}
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

    const moneyOperations = useMemo(() => operations.filter(o => ['money_input', 'money_withdrawal'].includes(o.subType)), [operations])

    const withoutYear = (date) => {
        const format = moment(date).format('LL');

        return format.slice(0, format.length - 8);
    }

    const commissionOptions: any[] = [
        {label: 'По тарифу', value: 'tariff'},
        {label: 'Тейкер', value: 'taker'},
    ]

    const summaryOptions: any[] = [
        {label: 'От брокера', value: 'brokerSummary'},
        {label: 'Средства утром + прибыль', value: 'buyMorningPowerPlusPnL'},
    ]

    return (
        <div className="Diary">
            <MobileSummary/>
            <InfoPanelDesktop/>
            <Modal title="Вывод средств" open={showPayModal} footer={null}
                   onCancel={() => cancelEditAccount()}>
                {!success && <Form layout="vertical">
                    <AccountList/>
                    {showForm && <>
                        <Divider/>
                        <FormItem label="Получатель">
                            <Input placeholder="Получатель" disabled value={fullName}/>
                        </FormItem>
                        <FormItem label="БИК">
                            <Input placeholder="БИК" {...settingsFormProps('bic')} />
                        </FormItem>
                        <FormItem label="Корр. счет">
                            <Input
                                placeholder="Корр. счет"
                                {...settingsFormProps('loroAccount')}
                            />
                        </FormItem>
                        <FormItem label="Банк получатель">
                            <Input
                                placeholder="Банк получатель"
                                {...settingsFormProps('bankName')}
                            />
                        </FormItem>
                        <FormItem label="Номер счета">
                            <Input
                                placeholder="Номер счета"
                                {...settingsFormProps('settlementAccount')}
                            />
                        </FormItem>
                    </>}
                    {!showForm && <Button onClick={() => setShowForm(true)} type="primary"
                                          style={{width: '100%', marginTop: '12px'}}>Добавить счет</Button>}
                    {showForm && <>
                        <Button onClick={() => saveAccount()} type="primary"
                                style={{width: '100%', marginTop: '12px'}}>Сохранить</Button>
                        <Button onClick={() => cancelEditAccount()}
                                style={{width: '100%', marginTop: '12px'}}>Отменить</Button>
                    </>}
                    {selectedAccount && <>
                        <FormItem label="Сумма" style={{width: '100%', marginTop: '12px'}} help={error} status={error ? 'error' : undefined}>
                            <Input
                                placeholder="Сумма"
                                value={amount}
                                onChange={e => setPaidInfo(prevState => ({...prevState, amount: e.target.value}))}
                                disabled={!selectedAccount}
                                suffix="₽"
                            />
                        </FormItem>
                        {lastWithdrawals.length > 0 && <div className="tag-container">
                            {lastWithdrawals.map(lw => <Tag onClick={() => setPaidInfo(prevState => ({
                                ...prevState,
                                amount: lw.toString()
                            }))}>{lw}</Tag>)}
                        </div>}
                    </> }
                    {operationId && <FormItem label="Код подтверждения">
                        <Input
                            placeholder="Код подтверждения"
                            value={confirmationCode}
                            onChange={e => setPaidInfo(prevState => ({...prevState, confirmationCode: e.target.value}))}
                        />
                    </FormItem>}
                    <FormItem>
                        {!operationId && selectedAccount &&
                            <Button onClick={() => createOperation()} type="primary"
                                    style={{width: '100%', marginTop: '12px'}}>Отправить
                                код</Button>}
                        {operationId &&
                            <Button onClick={() => signOperation()} type="primary"
                                    style={{width: '100%', marginTop: '12px'}}>Подтвердить
                                код</Button>}
                    </FormItem>
                </Form>}
                {success && <Result
                    style={{padding: '16px'}}
                    status="success"
                    title="Деньги отправлены"
                    subTitle={`На банковский счет: ${selectedAccount.match(/.{1,4}/g).join(' ')}`}
                    extra={[
                        <Button key="console">
                            Распоряжение
                        </Button>,
                        <Button type="primary" key="buy" onClick={() => sendAgain()} icon={<ReloadOutlined />} >Отправить снова</Button>,
                    ]}
                />}
            </Modal>
            <Modal title="Операции" open={showOperationsModal} footer={null}
                   onCancel={() => setShowOperationsModal(false)} className="operation-modal">
                {moneyOperations.map(getMaxLossTrade =>
                    <div className="ticker-info">
                        <div style={{display: 'flex'}}>
                            {getMaxLossTrade.subType === 'money_withdrawal' ? <MoneyOutputIcon/> : <MoneyInputIcon/>}
                            <div className="ticker_name">
                                <div className="ticker_name_title">{getMaxLossTrade.subType === 'money_withdrawal' ? 'Вывод с брокерского счета' : 'Пополнение брокерского счета'}</div>
                                <div className="ticker_name_description">
                                    {withoutYear(getMaxLossTrade.date)} {moment(getMaxLossTrade?.date).format('HH:mm:ss')}
                                </div>
                            </div>
                        </div>
                        <div className="ticker_actions">
                            <div className="ticker_name_title"
                                 style={{color: [Status.Refused, Status.Overdue].includes(getMaxLossTrade.status) ? 'rgba(var(--table-loss-color),1)' : getMaxLossTrade.status === Status.Resolved ? 'rgba(var(--table-profit-color),1)' : undefined}}>{getMaxLossTrade.subType === 'money_input' ? '+' : '-'}{moneyFormat(getMaxLossTrade?.data?.amount || 0, 0)}{getMaxLossTrade.status === Status.executing && <ClockCircleOutlined style={{marginLeft: '4px'}} />}</div>
                            <div className="ticker_name_description">{getMaxLossTrade?.data?.accountFrom}</div>
                        </div>
                    </div>)}
            </Modal>
            <Drawer
                title="Настройки"
                placement="right"
                onClose={() => setShowSettings(false)}
                open={showSettings}
            >
                <Form layout="vertical">
                    <FormItem label="Alor Token">
                        <Input placeholder="Token" {...settingsInputProps('token')} />
                    </FormItem>
                    <FormItem label="Договор">
                        <Select value={settings.agreement}
                                {...settingsInputProps('agreement')}

                                placeholder="Выберите договор"
                                options={userInfo?.agreements?.map(p => ({
                                    label: p.cid,
                                    value: p.agreementNumber
                                })) || []}/>
                    </FormItem>
                    <FormItem label="Alor Portfolio">
                        <Select value={settings.portfolio}
                                {...settingsInputProps('portfolio')}
                                placeholder="Выберите портфель"
                                options={agreementsMap[settings.agreement]?.portfolios?.map(p => ({
                                    label: `${p.accountNumber} (${p.service})`,
                                    value: p.accountNumber
                                })) || []}/>
                    </FormItem>
                    <FormItem label="Расчет комиссии">
                        <Select
                            style={{ width: '100%' }}
                            placeholder="Комиссия"
                            value={settingsInputProps('commissionType').value}
                            onChange={val => setSettings(({ ['commissionType']: val}))}
                            dropdownRender={(menu) => (
                                <>
                                    {menu}
                                    <Divider style={{ margin: '8px 0' }} />

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
                        <Select options={summaryOptions} style={{width: '100%'}}
                                value={settingsInputProps('summaryType').value || 'brokerSummary'}
                                onChange={val => setSettings((prevState) => ({...prevState, ['summaryType']: val}))}/>
                    </FormItem>
                </Form>
            </Drawer>
            {view === 'week' && <>
                {years.map(year => <YearRender year={year}/>)}
            </>}
            {view === 'table' && <>
                {dayPositions.map(dp => <MobilePosition positions={dp}/>)}
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
            </>}
        </div>
    );
};

export default Diary;
