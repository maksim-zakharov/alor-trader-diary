import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import queryString from 'query-string';
import {UserInfoResponse} from "alor-api/dist/services/ClientInfoService/ClientInfoService";
import {AlorApi, Exchange} from "alor-api";
import {QueryReturnValue} from "@reduxjs/toolkit/dist/query/baseQueryTypes";

const recurcive = (selector: (api: AlorApi) => any, params?: any) => async (arg, _api) => {
    const api = _api.getState()['alorSlice'].api as AlorApi;
    try {
        if(!api){
            return {} as any;
        }
        const data = await selector(api).call(api, {...params, ...arg});
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
        getSummary: builder.query<any, {portfolio: string}>({
            queryFn: recurcive((api) => api.clientInfo.getSummary, params => ({
                exchange: Exchange.MOEX,
                format: 'Simple',
                ...params
            })),
        }),
    })
})

export const {useGetUserInfoQuery, useGetSummaryQuery} = alorApi;