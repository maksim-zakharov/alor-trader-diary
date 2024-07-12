import {Button, Card, Form, Input, Select} from "antd";
import {KeyOutlined, LockOutlined} from "@ant-design/icons";
import React, {useMemo, useState} from "react";
import './LoginPage.css';
import {useNavigate} from "react-router-dom";
import FormItem from "antd/es/form/FormItem";
import {useGetUserInfoQuery} from "../../api/alor.api";
import {initApi, logout, setSettings} from "../../api/alor.slice";
import {useAppDispatch, useAppSelector} from "../../store";
import {AlorApi, Endpoint, WssEndpoint, WssEndpointBeta} from "alor-api";
import {oAuth2Client} from "../../api/oAuth2";
import axios from "axios";
import QuestionCircleIcon  from '../../assets/question-circle';

const LoginPage = () => {
    const tryLogin = true; // localStorage.getItem('tryLogin');
    const api = useAppSelector(state => state.alorSlice.api);
    const userInfo = useAppSelector(state => state.alorSlice.userInfo);
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    // @ts-ignore
    const {refetch} = useGetUserInfoQuery({}, {skip: !api});
    const [token, setToken] = React.useState<string | null>(null);
    const [error, setError] = useState();

    const [loading, setLoading] = useState(false);

    const [{agreement, portfolio}, setState] = useState({agreement: undefined, portfolio: undefined});

    const options = useMemo(() => userInfo?.agreements.find(a => a.agreementNumber === agreement)?.portfolios?.map(p => ({
        label: `${p.accountNumber} (${p.service})`,
        value: p.accountNumber
    })) || [], [agreement, userInfo]);

    const checkToken = async (event) => {
        event.preventDefault();
        if (withPassword) {
            return loginByCredentials()
        }
        try {
            const api = new AlorApi({
                token,
                endpoint: Endpoint.PROD,
                wssEndpoint: WssEndpoint.PROD,
                wssEndpointBeta: WssEndpointBeta.PROD,
            })
            setLoading(true);

            await api.refresh(undefined, undefined, error => {
                setError(error.message)
                clearToken();
                console.log(error.message);
            });

            setLoading(false);

            if (api.accessToken) {
                setError(undefined);
                dispatch(initApi({token, accessToken: api.accessToken}))
                dispatch(setSettings(({token})));
                setTimeout(() => refetch());
            }
        } catch (e: any) {
            setError(e.message);
            clearToken();
        }
    }

    const handleSelectPortfolio = (portfolio: string) => {
        setState(prevState => ({...prevState, portfolio}));
    }

    const handleSelectAgreement = (agreement: string) => {
        setState(prevState => ({...prevState, agreement}));
    }

    const clearToken = () => {
        dispatch(logout())
    }

    const submit = () => {
        if (agreement && portfolio) {
            dispatch(setSettings({agreement, portfolio}));
            navigate('/')
        }
    }

    const [{login, password, withPassword}, setCredentials] = useState<{
        login?: string,
        password?: string,
        withPassword?: boolean
    }>({login: '', password: '', withPassword: true});

    const loginByCredentials = async () => {
        try{
            const ssoResult = await axios.post('https://lk-api.alor.ru/sso-auth/client', {
                "credentials": {
                    login,
                    password,
                    "twoFactorPin": null
                }, "client_id": "SingleSignOn", "redirect_url": "//lk.alor.ru/"
            }).then(res => res.data)
            setError(undefined);
            dispatch(setSettings(({token: ssoResult.refreshToken, lk: true})));
            dispatch(initApi({token: ssoResult.refreshToken, type: 'lk'}))
            setTimeout(() => refetch());
        } catch (e: any){
            setError(e.response?.data?.message);
        }
    }

    const loginBySSO = async () => {
        document.location = oAuth2Client.code.getUri();
    }

    return <div className="LoginPage">
        <div className="ant-card-container">
            <Card title="Вход">
                {!userInfo && <Form layout="vertical" onSubmitCapture={checkToken}>
                    {!withPassword && <>
                        <FormItem validateStatus={error ? 'error' : undefined} help={error} label="Alor Token">
                            <Input placeholder="Введите Alor Token" onChange={e => setToken(e.target.value)}/>
                        </FormItem>
                        <Button onClick={checkToken} type="primary" htmlType="submit" disabled={!token}
                                loading={loading}>Продолжить</Button>
                    </>}
                    {withPassword && <>
                        <FormItem validateStatus={error ? 'error' : undefined} help={error} label="Логин">
                            <Input placeholder="Введите логин" name="login"
                                   onChange={e => setCredentials(prevState => ({...prevState, login: e.target.value}))}/>
                        </FormItem>
                        <FormItem label="Пароль">
                            <Input.Password placeholder="Введите пароль" name="password" type="password"
                                            onChange={e => setCredentials(prevState => ({
                                                ...prevState,
                                                password: e.target.value
                                            }))}/>
                        </FormItem>
                        <Button onClick={checkToken} type="primary" htmlType="submit" disabled={!login || !password}
                                loading={loading}>Войти</Button>
                    </>}
                    <FormItem label="Или войти через">
                        <div style={{display: "flex", gap: '16px'}}>
                            <Button onClick={loginBySSO} type="default" title="Войти через Алор Брокер"
                                    className="auth-btn"><img
                                src="https://s3.tradingview.com/userpics/5839685-GSlC_big.png"/></Button>
                            {withPassword && <Button onClick={() => setCredentials(({withPassword: false}))} title="Войти через токен" className="auth-btn" icon={<KeyOutlined/>}/>}
                            {!withPassword && <Button onClick={() => setCredentials(({withPassword: true}))} title="Войти через пароль" className="auth-btn" icon={<LockOutlined/>}/>}
                        </div>
                    </FormItem>
                </Form>}
                {userInfo && <Form layout="vertical" onSubmitCapture={submit}>
                    <FormItem validateStatus={error ? 'error' : undefined} extra={error} label="Договор">
                        <Select value={agreement} onSelect={handleSelectAgreement}
                                placeholder="Выберите договор"
                                options={userInfo?.agreements?.map(p => ({
                                    label: p.cid,
                                    value: p.agreementNumber
                                })) || []}/>
                    </FormItem>
                    <FormItem validateStatus={error ? 'error' : undefined} extra={error} label="Alor Portfolio">
                        <Select value={portfolio} onSelect={handleSelectPortfolio}
                                placeholder="Выберите портфель"
                                options={options}/>
                    </FormItem>
                    <Button onClick={submit} type="primary" htmlType="submit"
                            disabled={!portfolio || !agreement}>Войти</Button>
                    <Button type="link" onClick={clearToken}>Ввести другой alor token</Button>
                </Form>}
            </Card>
            <Button className="support-link" type="link" href="https://t.me/+8KsjwdNHVzIwNDQy"
                    target="_blank"><QuestionCircleIcon/>Поддержка</Button>
        </div>
    </div>
}

export default LoginPage;