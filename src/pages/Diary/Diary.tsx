import {
    Button, Card, Col,
    DatePicker,
    DatePickerProps, Descriptions,
    Divider,
    Drawer,
    Form,
    Input,
    message, Popconfirm, Radio, Row,
    Select,
    SelectProps, Space,
    Statistic,
    Switch,
    Table, Timeline, Typography,
} from 'antd';
import {
    ArrowDownOutlined,
    ArrowUpOutlined,
    SettingOutlined,
    RetweetOutlined,
    EditOutlined,
    DeleteOutlined,
    AppstoreOutlined,
    TableOutlined
} from '@ant-design/icons';
import FormItem from 'antd/es/form/FormItem';
import React, {ChangeEventHandler, FC, useEffect, useMemo, useState} from 'react';
import {ColumnsType} from 'antd/es/table';
import moment from 'moment/moment';
import {SwitchChangeEventHandler} from 'antd/es/switch';
import {selectOptions, summ} from '../../App';
import {moneyFormat, shortNumberFormat} from '../../common/utils';
import {AlorApi} from "alor-api";
import * as days from "dayjs";
import {useSearchParams} from "react-router-dom";
import PositionDetails from "./components/PositionDetails";
import {Currency, EquityDynamicsResponse, MoneyMove} from "alor-api/dist/services/ClientInfoService/ClientInfoService";
import {numberToPercent} from "../../utils";
import NoResult from "../../common/NoResult";

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
    summary: any;
    fullName?: string;
    isMobile: boolean
    equityDynamics?: EquityDynamicsResponse
    moneyMoves: MoneyMove[];
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

const Diary: FC<IProps> = ({data, trades, api, isLoading, summary, fullName, moneyMoves, isMobile, equityDynamics}) => {
    const [settings, setSettings] = useState<{
        token: string;
        portfolio: string;
        settlementAccount: string;
        recipient: string;
        loroAccount: string;
        bankName: string;
        amount: string;
        bic: string;
    }>(JSON.parse(localStorage.getItem('settings') || '{}'));

    const moneyMovesCommission = useMemo(() => summ(moneyMoves.filter(m => m.title === "Комиссия брокера").map(m => m.sum)), [moneyMoves]);

    const [showForm, setShowForm] = useState<boolean | string>(false);

    const [operationId, setOperationId] = useState<string>('');
    const [confirmationCode, setConfirmationCode] = useState<string>('');

    const [showSettings, setShowSettings] = useState(false);
    const [reasons, setReasons] = useState<{ [id: string]: string }>(
        JSON.parse(localStorage.getItem('reasons') || '{}'),
    );

    const [nightMode, setNightMode] = useState(
        Boolean(localStorage.getItem('night') === 'true'),
    );

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
                    title: 'Symbol',
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
                    title: 'Time',
                    dataIndex: 'openDate',
                    key: 'openDate',
                    width: 100,
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
                    title: 'Duration',
                    dataIndex: 'duration',
                    key: 'duration',
                    width: 110,
                    align: 'center',
                    // onCell: (record: any) => record.type === 'summary'  && ({className: record.PnL > 0 ? 'profit' : 'loss'}),
                    render: (_, row) =>
                        // @ts-ignore
                        row.type !== 'summary' && moment.duration(_, 'seconds').humanize(),
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
                    title: 'Volume',
                    dataIndex: 'volume',
                    key: 'volume',
                    align: 'center',
                    // onCell: (record: any) => record.type === 'summary'  && ({className: record.PnL > 0 ? 'profit' : 'loss'}),
                    render: (_, row: any, index) => renderVolume(row),
                },
                {
                    title: 'Fee',
                    dataIndex: 'Fee',
                    key: 'Fee',
                    align: 'center',
                    // onCell: (record: any) => record.type === 'summary'  && ({className: record.PnL > 0 ? 'profit' : 'loss'}),
                    render: (_, row) => `${moneyFormat(_)} ${row.type !== 'summary' ? `(${(_ * 100 / (row.openVolume + row.closeVolume)).toFixed(3)}%)` : ''}`,
                },
                {
                    title: 'Reason',
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
                                placeholder="Select reason..."
                                {...selectProps(row)}
                            />
                        ),
                },
                {
                    title: 'Comment',
                    dataIndex: 'comment',
                    key: 'comment',
                    // onCell: (record: any) => record.type === 'summary'  && ({className: record.PnL > 0 ? 'profit' : 'loss'}),
                    render: (_, row: any) =>
                        row.type !== 'summary' && (
                            <Input
                                key={`${row.id}-comment-input`}
                                size="small"
                                allowClear
                                placeholder="Add comment..."
                                {...inputProps(row)}
                            />
                        ),
                },
            ].filter(c => !isMobile || !['comment', 'reason', 'side', 'PnLPercent', 'Fee'].includes(c.dataIndex)) as any[]
        , [isMobile, hidenMap]);


    const settingsInputProps = (field: string) => {
        const onChange = (e: any) => {
            const value = e.target.value;
            setSettings((prevState) => ({...prevState, [field]: value}));
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

    const netProfitPercent = useMemo(() => !summary ? 0 : data.totalPnL * 100 / (summary?.portfolioEvaluation - data.totalPnL), [data.totalPnL, summary?.portfolioEvaluation]);

    const createOperation = async () => {
        const agreementNumber = settings.portfolio.replace('D', '');

        const account = accounts.find(a => a.settlementAccount === selectedAccount) || settings;
        if (!account.settlementAccount) {
            return;
        }

        const operationResult = await api.clientInfo.createOperation(agreementNumber, {
            account: settings.portfolio,
            bic: account.bic,
            amount: Number((settings.amount || "").replaceAll(" ", '')),
            all: false,
            bankName: account.bankName,
            loroAccount: account.loroAccount,
            recipient: fullName,
            agree: true,
            settlementAccount: account.settlementAccount,
            currency: Currency.RUB,
            subportfolioFrom: "MOEX"
        })

        const codeResponse = await api.clientInfo.getOperationCode({
            operationId: operationResult.operationId.toString(),
            agreementNumber
        });

        setOperationId(operationResult.operationId.toString());
    }
    const signOperation = async () => {
        const agreementNumber = settings.portfolio.replace('D', '');

        const result = await api.clientInfo.signOperation({
            agreementNumber,
            operationId,
            confirmationCode
        })

        if (result.success) {
            setConfirmationCode('');
            setOperationId('');
        }
    }
    const [searchParams, setSearchParams] = useSearchParams();
    let dateFrom = searchParams.get('dateFrom');

    if (!dateFrom) {
        dateFrom = moment().startOf('month').format('YYYY-MM-DD');
    }
    const currentDates: DatePickerProps['value'] = days(dateFrom);

    useEffect(() => {
        if (nightMode) {
            document.body.className = 'dark-theme';
        } else {
            document.body.removeAttribute('class');
        }
    }, [nightMode]);
    const onChangeDate: DatePickerProps['onChange'] = (dateFrom) => {
        searchParams.set('dateFrom', dateFrom.format('YYYY-MM-DD'));
        setSearchParams(searchParams);
    };

    const onChangeNightMode: SwitchChangeEventHandler = (e) => {
        localStorage.setItem('night', String(e));
        document.body.className = 'dark-theme';
        setNightMode(e);
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
        setOperationId('');
        onSelect('');
    }

    const AccountList = () => {
        if (!accounts.length && !settings['settlementAccount'] && !showForm) {
            return <div style={{
                marginTop: "20px",
                paddingTop: "20px",
                display: "inline-block",
                textAlign: "center"
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
            for (let i = 0; i < weeksByMonth.length; i += 3) {
                const row = weeksByMonth.slice(i, i + 3);
                rows.push(row)
            }

            return rows;
        }, [weeksByMonth]);

        const title = useMemo(() => moment(weeksByMonth[0][1].trades[0].openDate).startOf('week').format('MMMM'), [month])

        return <>
            <div className="MonthRenderTitle">{title}</div>
            {weeksRows.map(row => <Row gutter={16}>
                {row.map(([weekNumber, week]) => <Col span={8}>
                    <Card title={`${week.from} - ${week.to}`} bordered={false}
                          className={`MonthRenderCard ${week.PnL > 0 ? 'profit' : 'loss'}`}>
                        <Descriptions column={4} layout="vertical">
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

    return (
        <>
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '8px',
                    marginTop: '-16px'
                }}
            >
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
                        title="Summary"
                        loading={isLoading}
                        value={moneyFormat(summary?.portfolioLiquidationValue || 0)}
                        precision={2}
                    />
                </div>
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
                        title="Trades"
                        loading={isLoading}
                        value={`${data.positions.filter(p => p.type !== 'summary').length} trades`}
                        precision={2}
                    />
                    <Statistic
                        title="Net Profit"
                        loading={isLoading}
                        value={`${moneyFormat(data.totalPnL)} (${shortNumberFormat(netProfitPercent)}%)`}
                        precision={2}
                        valueStyle={{
                            color:
                                data.totalPnL > 0 ? 'rgba(var(--table-profit-color),1)' : 'rgba(var(--table-loss-color),1)',
                        }}
                    />
                    <Statistic
                        title="Total Fee"
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

                    <DatePicker value={currentDates} onChange={onChangeDate} style={{width: 120}}/>
                    <Switch
                        defaultChecked={nightMode}
                        checked={nightMode}
                        onChange={onChangeNightMode}
                    />

                    <Radio.Group options={options} onChange={e => onChangeView(e.target.value)} value={view}
                                 optionType="button"/>
                    <Drawer
                        title="Settings"
                        placement="right"
                        onClose={() => setShowSettings(false)}
                        open={showSettings}
                    >
                        <Form layout="vertical">
                            <FormItem label="Alor Token">
                                <Input placeholder="Token" {...settingsInputProps('token')} />
                            </FormItem>
                            <FormItem label="Alor Portfolio">
                                <Input
                                    placeholder="Portfolio"
                                    {...settingsInputProps('portfolio')}
                                />
                            </FormItem>
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
                            {selectedAccount && <FormItem label="Сумма" style={{width: '100%', marginTop: '12px'}}>
                                <Input
                                    placeholder="Сумма"
                                    {...settingsFormProps('amount')}
                                    disabled={!selectedAccount}
                                    suffix="₽"
                                />
                            </FormItem>}
                            {operationId && <FormItem label="Код подтверждения">
                                <Input
                                    placeholder="Код подтверждения"
                                    value={confirmationCode}
                                    onChange={e => setConfirmationCode(e.target.value)}
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
                        </Form>
                    </Drawer>
                </div>
            </div>
            {view === 'week' && <>
                {years.map(year => <YearRender year={year}/>)}
            </>}
            {view === 'table' && <Table
                onRow={(row: any) =>
                    row.type === 'summary' && {
                        className: row.PnL > 0 ? 'profit' : 'loss',
                    }
                }
                rowKey="id"
                columns={columns}
                loading={isLoading}
                dataSource={data.positions}
                size="small"
                pagination={false}
                expandable={{
                    expandedRowRender,
                    defaultExpandedRowKeys: ['0'],
                    rowExpandable: (row) => row.type !== 'summary',
                }}
            />}
        </>
    );
};

export default Diary;
