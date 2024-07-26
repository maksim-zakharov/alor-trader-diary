import {createSlice, PayloadAction} from "@reduxjs/toolkit";
import {AlorApi, Endpoint, WssEndpoint, WssEndpointBeta} from "alor-api";
import {alorApi} from "./alor.api";
import {
    GetOperationsResponse, Portfolio,
    Status,
    UserInfoResponse
} from "alor-api/dist/services/ClientInfoService/ClientInfoService";
import {AppState} from "../store";

type Settings = {
    token: string;
    portfolio: string;
    commissionType: string;
    agreement: string;
    lk?: boolean;
}

const initialState = {
    api: undefined,
    agreementsMap: {},
    activeOperations: [],
    lastWithdrawals: [],
    release: undefined,
    darkColors: {
        backgroundColor: 'rgb(30,44,57)',
        color: 'rgb(166,189,213)',
        borderColor: 'rgba(44,60,75, 0.6)'
    },
    userInfo: localStorage.getItem('userInfo') ? JSON.parse(localStorage.getItem('userInfo')) : undefined,
    settings: JSON.parse(localStorage.getItem('settings') || '{}')
} as {
    darkColors: {
        backgroundColor: string,
        color: string,
        borderColor: string,
    }
    api: undefined | AlorApi, userInfo: UserInfoResponse, settings: Settings, agreementsMap: any, activeOperations: GetOperationsResponse[], lastWithdrawals: number[]
};

export const selectCurrentPortfolio = (state: AppState): Portfolio | undefined => {
    if (!state.alorSlice.userInfo) {
        return undefined;
    }

    const currentAgreement = state.alorSlice.userInfo.agreements.find(a => a.agreementNumber === state.alorSlice.settings.agreement);
    if (!currentAgreement) {
        return undefined;
    }

    return currentAgreement.portfolios.find(p => p.accountNumber === state.alorSlice.settings.portfolio);
};

export const alorSlice = createSlice({
    name: 'alorSlice',
    initialState,
    reducers: {
        initApi(state, action: PayloadAction<{ token: string, accessToken?: string, type?: 'lk' | 'dev' }>) {
            state.api = new AlorApi({
                token: action.payload.token,
                accessToken: action.payload.accessToken,
                endpoint: Endpoint.PROD,
                wssEndpoint: WssEndpoint.PROD,
                wssEndpointBeta: WssEndpointBeta.PROD,
                refreshType: action.payload.type,
            });

            state.release?.();
        },
        updateDarkColors(state, action: PayloadAction<typeof initialState.darkColors>) {
            state.darkColors = {...state.darkColors, ...action.payload};
        },
        setSettings(state, action: PayloadAction<Partial<Settings>>) {
            state.settings = {...state.settings, ...action.payload};
            localStorage.setItem('settings', JSON.stringify(state.settings));
        },
        acquire(state, action: PayloadAction<any>) {
            state.release = action.payload;
            if(state.api){
                state.release?.();
            }
        },
        logout(state){
            state.userInfo = undefined;
            state.settings = {...state.settings, portfolio: undefined, token: undefined, agreement: undefined, lk: undefined};
            state.api = undefined;

            localStorage.setItem('settings', JSON.stringify(state.settings));
            localStorage.removeItem('userInfo');
        }
    },
    extraReducers: (builder) => {
        // builder.addMatcher(goApi.endpoints.getAdGroup.matchPending, _resetAdGroupError);
        builder.addMatcher(alorApi.endpoints.getOperations.matchFulfilled, (state, {payload}) => {
            state.activeOperations = payload ? payload.filter(o => ![Status.Overdue, Status.Refused].includes(o.status)) : [];
            state.lastWithdrawals = Array.from(new Set(state.activeOperations.map(o => o.data.amount))).sort((a, b) => b - a).slice(0, 5).filter(a => a);
        });
        builder.addMatcher(alorApi.endpoints.getUserInfo.matchFulfilled, (state, {payload}) => {
            state.userInfo = payload;
            localStorage.setItem('userInfo', JSON.stringify(payload));
            state.agreementsMap = payload?.agreements?.reduce((acc, curr) => ({
                ...acc,
                [curr.agreementNumber]: curr
            }), {}) || {};
        });
        // builder.addMatcher(goApi.endpoints.editCampaign.matchPending, _resetEditCampaignError);
    },
});

export const {initApi, updateDarkColors, acquire, setSettings, logout} = alorSlice.actions;