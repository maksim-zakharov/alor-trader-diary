import {
    createApi,
    BaseQueryApi,
    fetchBaseQuery,
    FetchBaseQueryError,
    FetchBaseQueryMeta
} from '@reduxjs/toolkit/query/react';
// @ts-ignore
import { Mutex } from 'async-mutex';
import queryString from 'query-string';
import {UserInfoResponse} from "alor-api/dist/services/ClientInfoService/ClientInfoService";
import {AlorApi} from "alor-api";
import {QueryReturnValue} from "@reduxjs/toolkit/dist/query/baseQueryTypes";

const mutex = new Mutex();

const wrap = <T>(selector: (api: AlorApi) => any) => async (arg: any, _api: any): Promise<QueryReturnValue<T, FetchBaseQueryError, FetchBaseQueryMeta>> => {
    try {
        const api = _api.getState()['alor.slice'].api as AlorApi;
        if(!api){
            return {} as any;
        }
        const data = await selector(api);
        return { data }
    } catch (error) {
        return { error } as any
    }
}

const recurcive = (selector: (api: AlorApi) => any) => async (arg, _api) => {
    const api = _api.getState()['alor.slice'].api as AlorApi;
    try {
        if(!api){
            return {} as any;
        }
        const data = await selector(api);
        return { data }
    } catch (error: any) {
        if(error.message === 'Необходимо авторизоваться'){
            await api.refresh();
            return recurcive(selector)(arg, _api)
        }
        return { error } as any
    }
}

export const baseQueryWithReauth = () => async (args, _api: BaseQueryApi, extraOptions) => {
    let result = await fetchBaseQuery()(args, _api, extraOptions);
    // const userinfo = api.getState().auth.userinfo;
debugger
    if (result?.error?.status === 401) {
        if (!mutex.isLocked()) {
            const release = await mutex.acquire();
            try {
                const api = _api.getState()['alor.slice'].api as AlorApi;
                await api.refresh();
                // const refreshResult = await baseQuery('/api')('/refresh', api, extraOptions);
                // if (refreshResult?.meta?.response?.status === 200) {
                //     result = await baseQuery(baseUrl, args.headers)(args, api, extraOptions);
                // } else {
                //     // костыль для рефреша, иначе не работают extraReducers
                //     api.dispatch({
                //         type: 'auth/logout',
                //     });
                // }
            } finally {
                release();
            }
        } else {
            await mutex.waitForUnlock();
            result = await fetchBaseQuery()(args, _api, extraOptions);
        }
    }

    return result;
};

export const alorApi = createApi({
    reducerPath: 'alor.api',
    tagTypes: [
        'User',
    ],
    baseQuery: baseQueryWithReauth(),
    endpoints: (builder) => ({
        // topUpBalance: builder.mutation<any, any>({
        //     query: (body) => ({
        //         url: 'advAccounts/invoice',
        //         method: 'POST',
        //         body,
        //     }),
        // }),
        // getUserInfo: builder.query<void, void>({
        //     query: (params) => ({method: 'GET', url: '/users', params}),
        //     providesTags: ['User'],
        // }),
        getUserInfo: builder.query<UserInfoResponse, void>({
            queryFn: recurcive(api => api.clientInfo.getUserInfo()),
        } as any),
    })
})

export const {useGetUserInfoQuery} = alorApi;