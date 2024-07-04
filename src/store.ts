
import { configureStore, ThunkDispatch, combineReducers, EnhancedStore } from '@reduxjs/toolkit';
import { Reducer } from 'react';
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import { AnyAction } from 'redux';
import {alorApi} from "./api/alor.api";
import {alorSlice} from "./api/alor.slice";

export const reducers = {
    [alorApi.reducerPath]: alorApi.reducer,
    // [bffLogoutApi.reducerPath]: bffLogoutApi.reducer,
    // [billingApi.reducerPath]: billingApi.reducer,
    // [dictionariesApi.reducerPath]: dictionariesApi.reducer,
    // // [anAdsApi.reducerPath]: anAdsApi.reducer,
    // [analyticsApi.reducerPath]: analyticsApi.reducer,
    // [nsiApi.reducerPath]: nsiApi.reducer,
    // // [anGoApi.reducerPath]: anGoApi.reducer,
    // [goApi.reducerPath]: goApi.reducer,
    // [segmentsApi.reducerPath]: segmentsApi.reducer,
    [alorSlice.name]: alorSlice.reducer,
    // [errorsSlice.name]: errorsSlice.reducer,
    // // [coverageApi.reducerPath]: coverageApi.reducer
    // ...CMSReducers,
};

const reducer = combineReducers(reducers);

export const store = configureStore({
    reducer,
    devTools: process.env.NODE_ENV !== 'production',
    middleware: (getDefaultMiddleware) => getDefaultMiddleware({
        serializableCheck: false,
    })
        .concat(alorApi.middleware) as any,
});

export type AppState = ReturnType<typeof reducer>;
export type AppDispatch = typeof store.dispatch;

export const useAppSelector: TypedUseSelectorHook<AppState> = useSelector;
export const useAppDispatch: () => ThunkDispatch<AppState, void, AnyAction> = () => useDispatch<AppDispatch>();
