import {Button, Card, Form, Input, Popconfirm, Result, Space, Tag, Typography} from "antd";
import FormItem from "antd/es/form/FormItem";
import ASelect from "../../../common/Select";
import {moneyFormat} from "../../../common/utils";
import {DeleteOutlined, EditOutlined, ReloadOutlined} from "@ant-design/icons";
import DraggableDrawer from "../../../common/DraggableDrawerHOC";
import React, {FC, useMemo, useState} from "react";
import NoResult from "../../../common/NoResult";
import {setSettings} from "../../../api/alor.slice";
import {Currency} from "alor-api/dist/services/ClientInfoService/ClientInfoService";
import {
    useCreateOperationMutation,
    useGetAllSummariesQuery,
    useGetOperationCodeMutation,
    useSignOperationMutation
} from "../../../api/alor.api";
import {useAppSelector} from "../../../store";
import {useSearchParams} from "react-router-dom";
import useWindowDimensions from "../../../common/useWindowDimensions";
import {Exchange} from "alor-api";


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

const WithdrawDrawer = ({onClose}) => {

    const [createOperationMutation] = useCreateOperationMutation();
    const [getOperationCode] = useGetOperationCodeMutation();
    const [signOperationMutation] = useSignOperationMutation();

    const lastWithdrawals = useAppSelector(state => state.alorSlice.lastWithdrawals)
    const settings = useAppSelector(state => state.alorSlice.settings);
    const userInfo = useAppSelector(state => state.alorSlice.userInfo);
    const fullName = userInfo?.fullName;

    const {data: summaries} = useGetAllSummariesQuery({
        exchange: Exchange.MOEX,
        format: 'Simple',
        userInfo
    }, {
        skip: !userInfo
    });

    const {height, width, isMobile} = useWindowDimensions();
    const [searchParams, setSearchParams] = useSearchParams();
    let showPayModal = searchParams.get('drawer') === 'payout';

    const [showForm, setShowForm] = useState<boolean | string>(false);

    const [{operationId, confirmationCode, amount, portfolio, success}, setPaidInfo] = useState({
        operationId: '',
        confirmationCode: '',
        amount: '',
        portfolio: settings.portfolio,
        success: false
    })

    const [error, setError] = useState(undefined);

    const [formState, setFormState] = useState<any>({});

    const [accounts, setAccounts] = useState(
        JSON.parse(localStorage.getItem('accounts') || '[]'),
    );

    const [selectedAccount, onSelect] = useState<string>('');

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

    const createOperation = async () => {
        setError(undefined);

        const agreementNumber = settings.agreement;

        const account = accounts.find(a => a.settlementAccount === selectedAccount) || settings;
        if (!account.settlementAccount) {
            return;
        }

        const operationResult = await createOperationMutation({
            agreementNumber,
            account: portfolio,
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
        }).unwrap()

        if (operationResult.errorMessage) {
            setError(operationResult.errorMessage);
            return;
        }

        const codeResponse = await getOperationCode({
            operationId: operationResult.operationId.toString(),
            agreementNumber
        }).unwrap();

        if (codeResponse.errorMessage) {
            setError(codeResponse.errorMessage);
            return;
        }

        setPaidInfo(prevState => ({...prevState, operationId: operationResult.operationId.toString()}))
    }
    const signOperation = async () => {
        const agreementNumber = settings.agreement;

        const result = await signOperationMutation({
            agreementNumber,
            operationId,
            confirmationCode
        }).unwrap();

        if (result.errorMessage) {
            setError(result.errorMessage);
            return;
        }

        if (result.success) {
            setPaidInfo({
                portfolio: settings.portfolio,
                confirmationCode: '',
                operationId: '',
                amount: '',
                success: true
            })
        }
    }
    const sendAgain = () => setPaidInfo({
        portfolio: settings.portfolio,
        confirmationCode: '',
        operationId: '',
        amount: '',
        success: false
    })

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

    const cancelEditAccount = () => {
        setFormState({})
        setShowForm(false);
        onSelect('');
        onClose?.();
        setPaidInfo({
            portfolio: settings.portfolio,
            operationId: '',
            confirmationCode: '',
            amount: '',
            success: false
        })
    }

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

    const accountSummariesMap = useMemo(() => (summaries || []).reduce((acc, curr) => ({
        ...acc,
        [curr.accountNumber]: curr
    }), {}), [summaries]);

    const sumHelp = `Доступно ${moneyFormat(accountSummariesMap[portfolio]?.portfolioLiquidationValue, 0, 0)}`;

    return <DraggableDrawer title="Вывести" open={showPayModal} placement={isMobile ? "bottom" : "right"}
                            closeIcon={<Button type="link" onClick={() => cancelEditAccount()}>Закрыть</Button>}
                            onClose={() => cancelEditAccount()}>
        {!success && <Form layout="vertical" className="pad-lr">
            {(accounts.length || settings['settlementAccount']) &&
                <FormItem label="Откуда">
                    <ASelect value={portfolio}
                             onChange={e => setPaidInfo(prevState => ({...prevState, portfolio: e}))}
                             placeholder="Выберите договор"
                             options={userInfo?.agreements?.map(p => ({
                                 label: p.cid,
                                 title: p.cid,
                                 value: p.agreementNumber,
                                 options: p.portfolios.map(portfolio => ({
                                     label: <>
                                         <div>{portfolio.accountNumber}</div>
                                         <div>{moneyFormat(accountSummariesMap[portfolio.accountNumber]?.portfolioLiquidationValue, 0, 0)}</div>
                                     </>,
                                     value: portfolio.accountNumber
                                 }))
                             })) || []}/>
                </FormItem>}
            <AccountList/>
            {showForm && <>
                <FormItem label="Получатель">
                    <Input placeholder="Получатель" disabled value={fullName}/>
                </FormItem>
                <FormItem label="БИК">
                    <Input placeholder="БИК" type="number" {...settingsFormProps('bic')} />
                </FormItem>
                <FormItem label="Корр. счет">
                    <Input
                        placeholder="Корр. счет" type="number"
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
                        placeholder="Номер счета" type="number"
                        {...settingsFormProps('settlementAccount')}
                    />
                </FormItem>
            </>}
            {!showForm && <Button onClick={() => setShowForm(true)} type="primary"
                                  style={{width: '100%'}}>Добавить счет</Button>}
            {showForm && <>
                <Button onClick={() => saveAccount()} type="primary"
                        style={{width: '100%'}}>Сохранить</Button>
                <Button onClick={() => cancelEditAccount()}
                        style={{width: '100%'}}>Отменить</Button>
            </>}
            {selectedAccount && <>
                <FormItem label="Сумма" style={{width: '100%'}} help={error || sumHelp}
                          status={error ? 'error' : undefined}>
                    <Input
                        placeholder="Введите сумму"
                        value={amount}
                        onChange={e => setPaidInfo(prevState => ({...prevState, amount: e.target.value}))}
                        disabled={!selectedAccount}
                        suffix="₽" type="number"
                    />
                </FormItem>
                {lastWithdrawals.length > 0 && <div className="tag-container">
                    {lastWithdrawals.map(lw => <Tag key={lw} onClick={() => setPaidInfo(prevState => ({
                        ...prevState,
                        amount: lw.toString()
                    }))}>{lw}</Tag>)}
                </div>}
            </>}
            {operationId && <FormItem label="Код подтверждения">
                <Input
                    placeholder="Код подтверждения"
                    value={confirmationCode} type="number"
                    onChange={e => setPaidInfo(prevState => ({...prevState, confirmationCode: e.target.value}))}
                />
            </FormItem>}
            <FormItem>
                {!operationId && selectedAccount &&
                    <Button onClick={() => createOperation()} disabled={!amount} type="primary"
                            style={{width: '100%'}}>Отправить код</Button>}
                {operationId &&
                    <Button onClick={() => signOperation()} type="primary"
                            style={{width: '100%'}}>Подтвердить
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
                <Button type="primary" key="buy" onClick={() => sendAgain()} icon={<ReloadOutlined/>}>Отправить
                    снова</Button>,
            ]}
        />}
    </DraggableDrawer>
}

export default WithdrawDrawer;