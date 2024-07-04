import {Button, Card, Form, Input, Select} from "antd";
import {AlorApi, Endpoint, WssEndpoint, WssEndpointBeta} from "alor-api";
import React, {useEffect, useState} from "react";
import {useApi} from "../../useApi";
import {UserInfoResponse} from "alor-api/dist/services/ClientInfoService/ClientInfoService";
import './LoginPage.css';
import {useNavigate} from "react-router-dom";
import FormItem from "antd/es/form/FormItem";
import {useGetUserInfoQuery} from "../../api/alor.api";
import {initApi} from "../../api/alor.slice";
import {useAppDispatch} from "../../store";

const LoginPage = () => {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const {data: userInfo, refetch} = useGetUserInfoQuery();
    const [token, setToken] = React.useState<string | null>(null);
    const [error, setError] = useState();

    const [loading, setLoading]  = useState(false);

    const [settings, setSettings] = useState<{
        token: string;
        portfolio: string;
        commissionType: string;
    }>(JSON.parse(localStorage.getItem('settings') || '{}'));

    const checkToken = async () => {
        try {
            dispatch(initApi({token}))

            setLoading(true);

            refetch();

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