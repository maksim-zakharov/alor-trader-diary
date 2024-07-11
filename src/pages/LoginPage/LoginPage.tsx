import {Button, Card, Form, Input, Select} from "antd";
import React, {useEffect, useMemo, useState} from "react";
import './LoginPage.css';
import {useNavigate} from "react-router-dom";
import FormItem from "antd/es/form/FormItem";
import {useGetUserInfoQuery} from "../../api/alor.api";
import {initApi, logout, setSettings} from "../../api/alor.slice";
import {useAppDispatch, useAppSelector} from "../../store";
import {AlorApi, Endpoint, WssEndpoint, WssEndpointBeta} from "alor-api";
import {generateCodeVerifier, OAuth2Client} from "@badgateway/oauth2-client";
import {oAuth2, oAuth2Client, redirectUri} from "../../api/oAuth2";

const LoginPage = () => {
    const trySSO =true;// localStorage.getItem('SSO');
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

    const checkToken = async () => {
        try{
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

                        if(api.accessToken){
                            setError(undefined);
                            dispatch(initApi({token, accessToken: api.accessToken}))
                            dispatch(setSettings(({token})));
                            setTimeout(() => refetch());
                        }
        } catch (e: any) {
                        setError(e.message);
                        clearToken();
                        console.log(e.message);
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

    const login = () => {
        if (agreement && portfolio) {
            dispatch(setSettings({agreement, portfolio}));
            navigate('/')
        }
    }

    const loginBySSO = async () => {
        document.location = oAuth2Client.code.getUri();
    }

    return <div className="LoginPage">
        <Card title="Вход">
            {!userInfo && <Form layout="vertical" onSubmitCapture={checkToken}>
                <FormItem validateStatus={error ? 'error' : undefined} help={error} label="Alor Token">
                    <Input placeholder="Введите Alor Token" onChange={e => setToken(e.target.value)}/>
                </FormItem>
                <Button onClick={checkToken} type="primary" htmlType="submit" disabled={!token}
                        loading={loading}>Продолжить</Button>
                {trySSO && <FormItem label="Или войти через">
                    <Button onClick={loginBySSO} type="primary" style={{width: "100%"}}>Алор Брокер (SSO)</Button>
                </FormItem>
                }
                <Button className="support-link" type="link" href="https://t.me/+8KsjwdNHVzIwNDQy" target="_blank">Поддержка</Button>
            </Form>}
            {userInfo && <Form layout="vertical" onSubmitCapture={login}>
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
                <Button onClick={login} type="primary" htmlType="submit"
                        disabled={!portfolio || !agreement}>Войти</Button>
                <Button type="link" onClick={clearToken}>Ввести другой alor token</Button>
                <Button className="support-link" type="link" href="https://t.me/+8KsjwdNHVzIwNDQy" target="_blank">Поддержка</Button>
            </Form>}
        </Card>
    </div>
}

export default LoginPage;