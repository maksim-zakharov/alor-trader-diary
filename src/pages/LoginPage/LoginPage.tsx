import {Button, Card, Form, Input, Select} from "antd";
import React, {useEffect, useMemo, useState} from "react";
import './LoginPage.css';
import {useNavigate} from "react-router-dom";
import FormItem from "antd/es/form/FormItem";
import {useGetUserInfoQuery} from "../../api/alor.api";
import {initApi, logout, setSettings} from "../../api/alor.slice";
import {useAppDispatch, useAppSelector} from "../../store";

const LoginPage = () => {
    const api = useAppSelector(state => state.alorSlice.api);
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const userInfo = useAppSelector(state => state.alorSlice.userInfo);
    // @ts-ignore
    const {refetch, isLoading} = useGetUserInfoQuery({}, {skip: !api});
    const [token, setToken] = React.useState<string | null>(null);
    const [error, setError] = useState();

    const [loading, setLoading] = useState(false);

    const settings = useAppSelector(state => state.alorSlice.settings);

    const [{agreement, portfolio}, setState] = useState({agreement: undefined, portfolio: undefined});

    const options = useMemo(() => userInfo?.agreements.find(a => a.agreementNumber === agreement)?.portfolios?.map(p => ({
        label: `${p.accountNumber} (${p.service})`,
        value: p.accountNumber
    })) || [], [agreement, userInfo]);

    useEffect(() => {
        // (async () => {
        //     if(api){
        //         try {
        //             dispatch(initApi({token}))
        //
        //             setLoading(true);
        //
        //             await api.refresh();
        //
        //             setLoading(false);
        //
        //             setError(undefined);
        //
        //             dispatch(setSettings(({token})));
        //         } catch (e: any) {
        //             setError(e.message);
        //             clearToken();
        //             console.log(e.message);
        //         }
        //     }
        // })();
    }, [api]);

    const checkToken = async () => {
        dispatch(initApi({token}))
        dispatch(setSettings({token}));
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

    return <div className="LoginPage">
        <Card title="Вход">
            {!userInfo && <Form layout="vertical" onSubmitCapture={checkToken}>
                <FormItem validateStatus={error ? 'error' : undefined} help={error} label="Alor Token">
                    <Input placeholder="Введите Alor Token" onChange={e => setToken(e.target.value)}/>
                </FormItem>
                <Button onClick={checkToken} type="primary" htmlType="submit" disabled={!token}
                        loading={isLoading}>Продолжить</Button>
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
            </Form>}
        </Card>
    </div>
}

export default LoginPage;