import {Button, Card, Form, Input, Select} from "antd";
import {AlorApi, Endpoint, WssEndpoint, WssEndpointBeta} from "alor-api";
import React, {useEffect, useState} from "react";
import {useApi} from "../../useApi";
import {UserInfoResponse} from "alor-api/dist/services/ClientInfoService/ClientInfoService";
import './LoginPage.css';
import {useNavigate} from "react-router-dom";
import FormItem from "antd/es/form/FormItem";

const LoginPage = () => {
    const navigate = useNavigate();
    const [token, setToken] = React.useState<string | null>(null);
    const [userInfo, setUserInfo] = React.useState<UserInfoResponse>(null);
    const [error, setError] = useState();

    const [loading, setLoading]  = useState(false);

    const [settings, setSettings] = useState<{
        token: string;
        portfolio: string;
        commissionType: string;
    }>(JSON.parse(localStorage.getItem('settings') || '{}'));
    const api = useApi(settings.token);

    useEffect(() => {
        (async function () {
            if (api) {
                try {
                    await api.refresh();

                    setUserInfo(await api.clientInfo.getUserInfo());
                } catch (e) {
                    clearToken();
                }
            }
        })();
    }, [settings.token, api]);

    const checkToken = async () => {
        try {
            const api = new AlorApi({
                token,
                endpoint: Endpoint.PROD,
                wssEndpoint: WssEndpoint.PROD,
                wssEndpointBeta: WssEndpointBeta.PROD,
            })

            await api.refresh();

            setLoading(true);

            await api.clientInfo.getUserInfo().then(setUserInfo);

            setLoading(false);

            setError(undefined);

            setSettings(prevState => ({...prevState, token}));
        } catch (e: any) {
            setError(e.message);
            clearToken();
            console.log(e.message);
        }
    }
    useEffect(() => {
        localStorage.setItem('settings', JSON.stringify(settings));
    }, [settings]);

    const handleSelectPortfolio = (portfolio: string) => {
        setSettings(prevState => ({...prevState, portfolio}));
    }

    const clearToken = () => {
        setSettings({} as any);
    }

    const login = () => {
        navigate('/')
        window.location.reload();
    }

    return <div className="LoginPage">
        <Card title="Вход">
            {!settings.token && <Form className="container" layout="vertical" onSubmitCapture={checkToken}>
                <FormItem validateStatus={error ? 'error' : undefined} help={error} label="Alor Token">
                    <Input placeholder="Введите Alor Token" onChange={e => setToken(e.target.value)}/>
                </FormItem>
                <Button onClick={checkToken} type="primary" htmlType="submit" disabled={!token} loading={loading}>Продолжить</Button>
            </Form>}
            {settings.token && <Form className="container" layout="vertical" onSubmitCapture={login}>
                <FormItem validateStatus={error ? 'error' : undefined} extra={error} label="Alor Portfolio">
                <Select value={settings.portfolio} onSelect={handleSelectPortfolio}

                        placeholder="Выберите портфель"
                        options={userInfo?.agreements?.[0]?.portfolios?.map(p => ({
                            label: `${p.accountNumber} (${p.service})`,
                            value: p.accountNumber
                        })) || []}/>
                </FormItem>
                <Button onClick={login} type="primary" htmlType="submit" disabled={!settings.portfolio}>Войти</Button>
                <Button type="link" onClick={clearToken}>Ввести другой alor token</Button>
            </Form>}
        </Card>
    </div>
}

export default LoginPage;