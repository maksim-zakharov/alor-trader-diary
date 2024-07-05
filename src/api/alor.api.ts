import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import {
    EquityDynamicsResponse,
    GetOperationsResponse,
    MoneyMove,
    UserInfoResponse
} from "alor-api/dist/services/ClientInfoService/ClientInfoService";
import {AlorApi, Exchange, Summary} from "alor-api";

const recurcive = (selector: (api: AlorApi) => any) => async (args: any[] | void, _api) => {
    const api = _api.getState()['alorSlice'].api as AlorApi;
    try {
        if(!api){
            return {} as any;
        }
        if(Array.isArray(args)){
            // @ts-ignore
            const data = await selector(api).call(api, ...args);
            return { data }
        }
        // @ts-ignore
        const data = await selector(api).call(api);
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
        }, any>({
            queryFn: recurcive(api => api.clientInfo.createOperation),
        }),
        signOperation: builder.mutation<{validations: [], errorMessage: null, success: true}, any>({
            queryFn: recurcive(api => api.clientInfo.signOperation),
        }),
        getOperationCode: builder.mutation<{errorMessage: null, success: true}, any>({
            queryFn: recurcive(api => api.clientInfo.getOperationCode),
        }),
        getUserInfo: builder.query<UserInfoResponse, void>({
            queryFn: recurcive(api => api.clientInfo.getUserInfo),
        }),
        getOperations: builder.query<GetOperationsResponse[], any>({
            queryFn: recurcive(api => api.clientInfo.getOperations),
        }),
        getMoneyMoves: builder.query<MoneyMove[], any>({
            queryFn: recurcive(api => api.clientInfo.getMoneyMoves),
        }),
        getSummary: builder.query<Summary, any>({
            queryFn: recurcive((api) => api.clientInfo.getSummary),
        }),
        getEquityDynamics: builder.query<EquityDynamicsResponse, any>({
            queryFn: recurcive((api) => api.clientInfo.getEquityDynamics),
        }),
    })
})

export const {useGetUserInfoQuery, useSignOperationMutation, useGetOperationCodeMutation, useCreateOperationMutation, useGetEquityDynamicsQuery,useGetMoneyMovesQuery, useGetOperationsQuery, useGetSummaryQuery} = alorApi;