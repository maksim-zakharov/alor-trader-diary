import React, {FormEvent, useEffect, useMemo, useState} from "react";
import {BarChart3, BookOpen, ChevronRight, KeyRound, Link2, Lock} from "lucide-react";
import {useNavigate} from "react-router-dom";
import {useGetUserInfoQuery} from "../../api/alor.api";
import {initApi, logout, setSettings} from "../../api/alor.slice";
import {useAppDispatch, useAppSelector} from "../../store";
import {AlorApi, Endpoint, WssEndpoint, WssEndpointBeta} from "alor-api";
import {oAuth2Client} from "../../api/oAuth2";
import axios from "axios";
import QuestionCircleIcon from "../../assets/question-circle";
import ASelect from "../../common/Select";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {cn} from "@/lib/utils";
import "./LoginPage.less";

type AuthTab = "credentials" | "token";

const PROMO_STATS = [
    {
        icon: BookOpen,
        title: "Дневник",
        value: "100%",
        lines: ["Все сделки", "MOEX и фьючерсы", "Комментарии"],
    },
    {
        icon: BarChart3,
        title: "Аналитика",
        value: "PnL",
        lines: ["Графики дохода", "Просадки", "По инструментам"],
    },
    {
        icon: Link2,
        title: "Alor",
        value: "API",
        lines: ["OAuth вход", "Портфели MOEX", "Без лишних шагов"],
    },
] as const;

const LoginPage = () => {
    const api = useAppSelector(state => state.alorSlice.api);
    const userInfo = useAppSelector(state => state.alorSlice.userInfo);
    const settings = useAppSelector(state => state.alorSlice.settings);
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    // @ts-ignore
    const {refetch} = useGetUserInfoQuery({}, {skip: !settings.token || !api, refetchOnMountOrArgChange: true});
    const [token, setToken] = useState("");
    const [error, setError] = useState<string>();
    const [loading, setLoading] = useState(false);
    const [authTab, setAuthTab] = useState<AuthTab>("credentials");
    const [{agreement, portfolio}, setState] = useState<{ agreement?: string; portfolio?: string }>({
        agreement: undefined,
        portfolio: undefined,
    });
    const [{login, password}, setCredentials] = useState({login: "", password: ""});

    const options = useMemo(
        () => userInfo?.agreements.find(a => a.agreementNumber === agreement)?.portfolios?.map(p => ({
            label: `${p.accountNumber} (${p.service})`,
            value: p.accountNumber,
        })) || [],
        [agreement, userInfo],
    );

    const selectFirstAgreement = () => {
        if (userInfo?.agreements[0].agreementNumber && userInfo?.agreements[0].portfolios[0]) {
            dispatch(setSettings({
                agreement: userInfo.agreements[0].agreementNumber,
                portfolio: userInfo.agreements[0].portfolios[0].accountNumber,
            }));
        }
    };

    useEffect(() => {
        selectFirstAgreement();
    }, [userInfo]);

    const clearToken = () => {
        dispatch(logout());
    };

    const loginByCredentials = async () => {
        try {
            const ssoResult = await axios.post("https://lk-api.alor.ru/sso-auth/client", {
                credentials: {
                    login,
                    password,
                    twoFactorPin: null,
                },
                client_id: "SingleSignOn",
                redirect_url: "//lk.alor.ru/",
            }).then(res => res.data);

            setError(undefined);
            dispatch(setSettings({token: ssoResult.refreshToken, lk: true}));
            dispatch(initApi({token: ssoResult.refreshToken, type: "lk"}));
            setTimeout(() => refetch());
        } catch (e: any) {
            setError(e.response?.data?.message);
        }
    };

    const loginBySSO = () => {
        document.location = oAuth2Client.code.getUri();
    };

    const checkToken = async (event: FormEvent) => {
        event.preventDefault();

        if (authTab === "credentials") {
            setLoading(true);
            await loginByCredentials();
            setLoading(false);
            return;
        }

        try {
            const nextApi = new AlorApi({
                token,
                endpoint: Endpoint.PROD,
                wssEndpoint: WssEndpoint.PROD,
                wssEndpointBeta: WssEndpointBeta.PROD,
            });

            setLoading(true);

            await nextApi.refresh(undefined, undefined, refreshError => {
                setError(refreshError.message);
                clearToken();
            });

            setLoading(false);

            if (nextApi.accessToken) {
                setError(undefined);
                dispatch(initApi({token, accessToken: nextApi.accessToken}));
                dispatch(setSettings({token}));
                setTimeout(() => refetch());
            }
        } catch (e: any) {
            setError(e.message);
            clearToken();
            setLoading(false);
        }
    };

    const handleSelectPortfolio = (nextPortfolio: string) => {
        setState(prevState => ({...prevState, portfolio: nextPortfolio}));
    };

    const handleSelectAgreement = (nextAgreement: string) => {
        setState(prevState => ({...prevState, agreement: nextAgreement}));
    };

    const submitPortfolio = (event: FormEvent) => {
        event.preventDefault();
        if (agreement && portfolio) {
            dispatch(setSettings({agreement, portfolio}));
            navigate("/");
        }
    };

    const isCredentialsTab = authTab === "credentials";
    const canSubmitCredentials = Boolean(login && password);
    const canSubmitToken = Boolean(token);

    return (
        <div className="LoginPage">
            <aside className="LoginPage__promo">
                <div className="LoginPage__promoGlow"/>
                <div className="LoginPage__promoContent">
                    <p className="LoginPage__promoTitle">
                        Ведите дневник трейдера
                        <span> с Alor Broker</span>
                    </p>
                    <div className="LoginPage__promoStats">
                        {PROMO_STATS.map(({icon: Icon, title, value, lines}) => (
                            <div className="LoginPage__promoStat" key={title}>
                                <Icon className="LoginPage__promoStatIcon" strokeWidth={1.5}/>
                                <div className="LoginPage__promoStatTitle">{title}</div>
                                <div className="LoginPage__promoStatValue">{value}</div>
                                {lines.map(line => (
                                    <div className="LoginPage__promoStatLine" key={line}>{line}</div>
                                ))}
                            </div>
                        ))}
                    </div>
                </div>
            </aside>

            <main className="LoginPage__main">
                <div className="LoginPage__mainInner">
                    <div className="LoginPage__brand">Alor Trader Diary</div>

                    <div className="LoginPage__card">
                        {!userInfo ? (
                            <>
                                <div className="LoginPage__cardHeader">
                                    <h1 className="LoginPage__title">Добро пожаловать</h1>
                                </div>

                                <div className="LoginPage__tabs">
                                    <button
                                        type="button"
                                        className={cn("LoginPage__tab", isCredentialsTab && "LoginPage__tab_active")}
                                        onClick={() => {
                                            setAuthTab("credentials");
                                            setError(undefined);
                                        }}
                                    >
                                        Логин
                                    </button>
                                    <button
                                        type="button"
                                        className={cn("LoginPage__tab", !isCredentialsTab && "LoginPage__tab_active")}
                                        onClick={() => {
                                            setAuthTab("token");
                                            setError(undefined);
                                        }}
                                    >
                                        Токен
                                    </button>
                                </div>

                                <form className="LoginPage__form" onSubmit={checkToken}>
                                    {isCredentialsTab ? (
                                        <>
                                            <label className="LoginPage__field">
                                                <span className="LoginPage__label">Логин</span>
                                                <Input
                                                    placeholder="Введите логин"
                                                    name="login"
                                                    value={login}
                                                    className="LoginPage__input"
                                                    onChange={e => setCredentials(prev => ({...prev, login: e.target.value}))}
                                                />
                                            </label>
                                            <label className="LoginPage__field">
                                                <span className="LoginPage__label">Пароль</span>
                                                <Input
                                                    placeholder="Введите пароль"
                                                    name="password"
                                                    type="password"
                                                    value={password}
                                                    className="LoginPage__input"
                                                    onChange={e => setCredentials(prev => ({...prev, password: e.target.value}))}
                                                />
                                            </label>
                                        </>
                                    ) : (
                                        <label className="LoginPage__field">
                                            <span className="LoginPage__label">Alor Token</span>
                                            <Input
                                                placeholder="Введите Alor Token"
                                                value={token}
                                                className="LoginPage__input"
                                                onChange={e => setToken(e.target.value)}
                                            />
                                        </label>
                                    )}

                                    {error && <p className="LoginPage__error">{error}</p>}

                                    <Button
                                        type="submit"
                                        className="LoginPage__submit"
                                        disabled={loading || (isCredentialsTab ? !canSubmitCredentials : !canSubmitToken)}
                                    >
                                        {loading ? "Загрузка..." : "Продолжить"}
                                    </Button>
                                </form>

                                <div className="LoginPage__divider">
                                    <span>или войти через</span>
                                </div>

                                <div className="LoginPage__social">
                                    <button type="button" className="LoginPage__socialBtn" onClick={loginBySSO} title="Войти через Алор Брокер">
                                        <img src="https://s3.tradingview.com/userpics/5839685-GSlC_big.png" alt="Alor"/>
                                    </button>
                                    <button
                                        type="button"
                                        className="LoginPage__socialBtn"
                                        title={isCredentialsTab ? "Войти через токен" : "Войти через логин"}
                                        onClick={() => setAuthTab(isCredentialsTab ? "token" : "credentials")}
                                    >
                                        {isCredentialsTab ? <KeyRound size={20}/> : <Lock size={20}/>}
                                    </button>
                                </div>
                            </>
                        ) : (
                            <form className="LoginPage__form" onSubmit={submitPortfolio}>
                                <div className="LoginPage__cardHeader">
                                    <h1 className="LoginPage__title">Выберите портфель</h1>
                                    <p className="LoginPage__subtitle">Подключите договор и счёт для работы с дневником</p>
                                </div>

                                <label className="LoginPage__field">
                                    <span className="LoginPage__label">Договор</span>
                                    <ASelect
                                        value={agreement}
                                        onSelect={handleSelectAgreement}
                                        placeholder="Выберите договор"
                                        className="LoginPage__select"
                                        options={userInfo?.agreements?.map(p => ({
                                            label: p.cid,
                                            value: p.agreementNumber,
                                        })) || []}
                                    />
                                </label>

                                <label className="LoginPage__field">
                                    <span className="LoginPage__label">Портфель</span>
                                    <ASelect
                                        value={portfolio}
                                        onSelect={handleSelectPortfolio}
                                        placeholder="Выберите портфель"
                                        className="LoginPage__select"
                                        options={options}
                                    />
                                </label>

                                {error && <p className="LoginPage__error">{error}</p>}

                                <Button
                                    type="submit"
                                    className="LoginPage__submit"
                                    disabled={!portfolio || !agreement}
                                >
                                    Войти
                                </Button>

                                <button type="button" className="LoginPage__linkBtn" onClick={clearToken}>
                                    Ввести другой аккаунт
                                    <ChevronRight size={16}/>
                                </button>
                            </form>
                        )}
                    </div>

                    <a className="LoginPage__support" href="https://t.me/+8KsjwdNHVzIwNDQy" target="_blank" rel="noreferrer">
                        <QuestionCircleIcon/>
                        Поддержка
                    </a>
                </div>
            </main>
        </div>
    );
};

export default LoginPage;
