import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import {
    Agreement,
    Currency,
    EquityDynamicsResponse,
    GetOperationsResponse,
    MoneyMove, Portfolio,
    UserInfoResponse
} from "alor-api/dist/services/ClientInfoService/ClientInfoService";
import {
    AlorApi,
    DevHistoryParams,
    Exchange,
    History as AHistory,
    Securities,
    Security,
    Summary,
    Trade,
    Trades
} from "alor-api";
import moment from "moment";
import {getCommissionByPlanAndTotalVolume, mutex} from "../utils";
import {DevSecuritiesSearchParams, ExchangePortfolioSummaryParams} from "alor-api/dist/models/models";
import {Mutex, MutexInterface} from "async-mutex";
import {acquire} from "./alor.slice";

export const calculateCommission = (plan: string, totalVolume: number, commissionType: string | undefined) => {

    switch (commissionType) {
        case 'tariff':
            return getCommissionByPlanAndTotalVolume(plan, totalVolume);
        case 'taker':
            return getCommissionByPlanAndTotalVolume(plan, totalVolume, true);
        case undefined:
            return getCommissionByPlanAndTotalVolume(plan, totalVolume);
        default:
            return Number(commissionType) || 0;
    }
}

const recurcive = (selector: (api: AlorApi) => any, paramsCallback = params => params) => async (args: any[] | void, _api) => {
    const api = _api.getState()['alorSlice'].api as AlorApi;
    const dispatch = _api.dispatch;
    const {lk, token} = _api.getState()['alorSlice'].settings;
    let release: MutexInterface.Releaser;

    await mutex.waitForUnlock();

    if(!api) {
        // return {} as any;
        release = await mutex.acquire();
        dispatch(acquire(release))
        // await mutex.waitForUnlock();
        return recurcive(selector, paramsCallback)(args, _api)
    }
    try {
        const params = paramsCallback ? paramsCallback(args) : args;
        if(Array.isArray(params)){
            // @ts-ignore
            return selector(api).apply(api, params).then(data => ({data}));
        }
        // @ts-ignore
        return selector(api).call(api, params).then(data => ({data}));
    } catch (error: any) {
        if(error.message === 'Необходимо авторизоваться'){
            if (!mutex.isLocked()) {
                const release = await mutex.acquire();
                dispatch(acquire(release))
                if (lk) {
                    const {AccessToken} = await api.auth.refreshToken({refreshToken: token, type: 'lk'});
                    api.accessToken = AccessToken;
                    api.http.defaults.headers.common["Authorization"] =
                        "Bearer " + AccessToken;
                } else {
                    await api.refresh();
                    release();
                }
            }
        } else {
            await mutex.waitForUnlock();
            return recurcive(selector, paramsCallback)(args, _api)
        }
        return { error } as any
    }
}

export interface NewsRequest {
    limit:           number;
    offset:     number;
    sortDesc:     string;
    symbols?:       string;
}

export interface News {
    id:           number;
    sourceId:     string;
    header:       string;
    publishDate:  Date;
    newsType:     number;
    content:      string;
    countryCodes: string[];
    rubricCodes:  string[];
    symbols:      string[];
    mt:           null;
}
export interface SecurityDescription {
    symbol:       string;
    description:  string;
    sector:       string;
    isin:         string;
    baseCurrency: string;
    securityType: string;
    lotsize:      number;
    shortName:    string;
    cfiCode:      string;
}

export interface SecurityDividend {
    recordDate:                Date;
    dividendPerShare:          number;
    dividendYield:             number;
    currency:                  Currency;
    recommendDividendPerShare: number;
    listDate:                  Date;
    declaredPayDateNominee:    Date | null;
    exDividendDate:            Date | null;
    fixDate:                   Date | null;
}

const getDescription = (api: AlorApi) => ({ticker}: {ticker: string})  => api.http
    .get(`/instruments/v1/${ticker}/description`, {
        baseURL: "https://api.alor.ru",
    })
    .then((r) => r.data)

const getDividends = (api: AlorApi) => ({ticker}: {ticker: string})  => api.http
    .get(`/instruments/v1/${ticker}/stock/dividends`, {
        baseURL: "https://api.alor.ru",
    })
    .then((r) => r.data)

const getNews = (api: AlorApi) => (params: NewsRequest)  => api.http
    .get(`/news/news`, {
        params,
        baseURL: "https://api.alor.ru",
    })
    .then((r) => r.data)

const getAllSummaries = (api: AlorApi) => async ({userInfo, ...params}: (Omit<ExchangePortfolioSummaryParams, 'portfolio'> & {userInfo: UserInfoResponse}))  => {
    return Promise.all(userInfo.agreements.map((agreement) => agreement.portfolios.map(p => api.clientInfo.getSummary({...params, portfolio:  p.accountNumber}).then(r => ({...r, accountNumber: p.accountNumber, agreementNumber: agreement.agreementNumber})))).flat());
}

export const alorApi = createApi({
    reducerPath: 'alor.api',
    tagTypes: [
        'User',
    ],
    baseQuery: fetchBaseQuery(),
    endpoints: (builder) => ({
        createOperation: builder.mutation<{
            validations: [];
            formErrors: null;
            data: {};
            operationId: number;
            errorMessage: null;
            success: true;
        }, {
            agreementNumber: string;
            recipient: string;
            account: string;
            currency: Currency;
            subportfolioFrom: "MOEX";
            all: boolean;
            bic: string;
            loroAccount: string;
            bankName: string;
            settlementAccount: string;
            agree: boolean;
            amount: number;
        }>({
            queryFn: recurcive(api => api.clientInfo.createOperation, ({agreementNumber, ...params}) => [agreementNumber, params]),
        } as any),
        signOperation: builder.mutation<{validations: [], errorMessage: null, success: true}, any>({
            queryFn: recurcive(api => api.clientInfo.signOperation),
        }),
        getOperationCode: builder.mutation<{errorMessage: null, success: true}, any>({
            queryFn: recurcive(api => api.clientInfo.getOperationCode),
        }),
        getSecurities: builder.mutation<Securities, DevSecuritiesSearchParams>({
            queryFn: recurcive(api => api.instruments.getSecurities),
        } as any),
        getUserInfo: builder.query<UserInfoResponse, void>({
            queryFn: recurcive(api => api.clientInfo.getUserInfo),
        }),
        getOperations: builder.query<GetOperationsResponse[], string>({
            queryFn: recurcive(api => api.clientInfo.getOperations),
        } as any),
        getNews: builder.query<News[], NewsRequest>({
            queryFn: recurcive(api => getNews(api)),
        } as any),
        getDividends: builder.query<SecurityDividend, {ticker: string}>({
            queryFn: recurcive(api => getDividends(api)),
        } as any),
        getDescription: builder.query<SecurityDescription, {ticker: string}>({
            queryFn: recurcive(api => getDescription(api)),
        } as any),
        getMoneyMoves: builder.query<MoneyMove[], {
            agreementNumber: string
            dateFrom: string,
            dateTo: string
        }>({
            queryFn: recurcive(api => api.clientInfo.getMoneyMoves, ({agreementNumber, ...params}) => [agreementNumber, params]),
        } as any),
        getSummary: builder.query<Summary, ExchangePortfolioSummaryParams>({
            queryFn: recurcive((api) => api.clientInfo.getSummary),
        } as any),
        getAllSummaries: builder.query<(Summary & Pick<Agreement, 'agreementNumber'> & Pick<Portfolio, 'accountNumber'>)[], (Omit<ExchangePortfolioSummaryParams, 'portfolio'> & {userInfo: UserInfoResponse})>({
            queryFn: recurcive((api) => getAllSummaries(api)),
        } as any),
        getSecurityByExchangeAndSymbol: builder.query<Security, {symbol: string, exchange: string}>({
            queryFn: recurcive((api) => api.instruments.getSecurityByExchangeAndSymbol),
        } as any),
        getHistory: builder.query<AHistory, DevHistoryParams>({
            queryFn: recurcive((api) => api.instruments.getHistory),
        } as any),
        getEquityDynamics: builder.query<EquityDynamicsResponse, {
            startDate: string;
            endDate: string;
            portfolio: string;
            agreementNumber: string;
        }>({
            queryFn: recurcive((api) => api.clientInfo.getEquityDynamics),
        } as any),
        getTrades: builder.query<Trades, {
            tariffPlan?: string;
            date?: string;
            dateFrom?: string;
            dateTo: string,
            commissionType?: string,
            portfolio: string
        }>({
            queryFn: recurcive((api) => {
                const loadTrades = async ({
                                        tariffPlan,
                                        date,
                                        dateFrom,
                                              dateTo,
                                              commissionType,
                    portfolio
                                    }: {
                    tariffPlan?: string;
                    date?: string;
                    dateFrom?: string;
                    dateTo: string,
                    commissionType?: string,
                    portfolio: string
                }) => {
                    let trades: Trade[] = await api.clientInfo.getTrades({
                        exchange: Exchange.MOEX,
                        portfolio,
                    });

                    if (date || dateFrom) {
                        let lastTrades = await api.clientInfo.getHistoryTrades({
                            exchange: Exchange.MOEX,
                            portfolio,
                            dateFrom: date || dateFrom,
                        });
                        trades.push(...lastTrades);

                        while (lastTrades.length > 1) {
                            lastTrades = await api.clientInfo.getHistoryTrades({
                                exchange: Exchange.MOEX,
                                portfolio,
                                from: trades.slice(-1)[0].id,
                            });
                            trades.push(...lastTrades.slice(1));
                        }

                        if (date)
                            trades = trades.filter((t) =>
                                moment(date).add(1, 'day').isAfter(moment(t.date)),
                            );

                        const dayVolumes = trades.reduce((acc, curr) => {
                            const day = moment(curr.date).format('YYYY-MM-DD');
                            if (!acc[day]) {
                                acc[day] = 0;
                            }
                            // @ts-ignore
                            acc[day] += curr.volume;

                            return acc;
                        }, {});

                        trades = trades.map((t) => ({
                            ...t,
                            // @ts-ignore
                            commission: calculateCommission(tariffPlan, dayVolumes[moment(t.date).format('YYYY-MM-DD')], commissionType) * t.volume,
                        }));
                    }

                    return trades.filter(t => moment(t.date).isBefore(moment(dateTo)));
                }

                return loadTrades;
            }),
        } as any),
    })
})

export const {useGetUserInfoQuery, useGetAllSummariesQuery, useGetSecurityByExchangeAndSymbolQuery, useGetHistoryQuery, useGetDescriptionQuery, useGetNewsQuery, useGetDividendsQuery, useGetSecuritiesMutation, useGetTradesQuery, useSignOperationMutation, useGetOperationCodeMutation, useCreateOperationMutation, useGetEquityDynamicsQuery,useGetMoneyMovesQuery, useGetOperationsQuery, useGetSummaryQuery} = alorApi;