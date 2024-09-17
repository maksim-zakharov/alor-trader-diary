
import { configureStore, ThunkDispatch, combineReducers } from '@reduxjs/toolkit';
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import { AnyAction } from 'redux';
import {alorApi} from "./api/alor.api";
import {alorSlice} from "./api/alor.slice";

export const reducers = {
    [alorApi.reducerPath]: alorApi.reducer,
    [alorSlice.name]: alorSlice.reducer
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
