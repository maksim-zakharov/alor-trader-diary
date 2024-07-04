import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import {UserInfoResponse} from "alor-api/dist/services/ClientInfoService/ClientInfoService";
import {AlorApi, Exchange} from "alor-api";

const recurcive = (selector: (api: AlorApi) => any, params?: any) => async (arg, _api) => {
    const api = _api.getState()['alorSlice'].api as AlorApi;
    try {
        if(!api){
            return {} as any;
        }
        const newParams = params?.(arg);
        const data = await selector(api).call(api, newParams);
        return { data }
    } catch (error: any) {
        if(error.message === 'Необходимо авторизоваться'){
            await api.refresh();
            return recurcive(selector, params)(arg, _api)
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
        // topUpBalance: builder.mutation<any, any>({
        //     query: (body) => ({
        //         url: 'advAccounts/invoice',
        //         method: 'POST',
        //         body,
        //     }),
        // }),
        getUserInfo: builder.query<UserInfoResponse, void>({
            queryFn: recurcive(api => api.clientInfo.getUserInfo),
        }),
        getOperations: builder.query<any, {agreementNumber: string}>({
            queryFn: recurcive(api => api.clientInfo.getOperations, ({agreementNumber}) => Number(agreementNumber)),
        }),
        getSummary: builder.query<any, {portfolio: string}>({
            queryFn: recurcive((api) => api.clientInfo.getSummary, params => ({
                exchange: Exchange.MOEX,
                format: 'Simple',
                ...params
            })),
        }),
    })
})

export const {useGetUserInfoQuery, useGetOperationsQuery, useGetSummaryQuery} = alorApi;