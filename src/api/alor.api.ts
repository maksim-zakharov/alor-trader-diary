import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import {
    Currency,
    EquityDynamicsResponse,
    GetOperationsResponse,
    MoneyMove,
    UserInfoResponse
} from "alor-api/dist/services/ClientInfoService/ClientInfoService";
import {AlorApi, Exchange, Summary, Trade, Trades} from "alor-api";
import moment from "moment";
import {getCommissionByPlanAndTotalVolume} from "../utils";
import {ExchangePortfolioSummaryParams} from "alor-api/dist/models/models";

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
    try {
        if(!api){
            return {} as any;
        }
        const params = paramsCallback ? paramsCallback(args) : args;
        if(Array.isArray(params)){
            // @ts-ignore
            const data = await selector(api).apply(api, params);
            return { data }
        }
        // @ts-ignore
        const data = await selector(api).call(api, params);
        return { data }
    } catch (error: any) {
        if(error.message === 'Необходимо авторизоваться'){
            await api.refresh();
            return recurcive(selector)(args, _api)
        }
        return { error } as any
    }
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
        getUserInfo: builder.query<UserInfoResponse, void>({
            queryFn: recurcive(api => api.clientInfo.getUserInfo),
        }),
        getOperations: builder.query<GetOperationsResponse[], string>({
            queryFn: recurcive(api => api.clientInfo.getOperations),
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

export const {useGetUserInfoQuery, useGetTradesQuery, useSignOperationMutation, useGetOperationCodeMutation, useCreateOperationMutation, useGetEquityDynamicsQuery,useGetMoneyMovesQuery, useGetOperationsQuery, useGetSummaryQuery} = alorApi;