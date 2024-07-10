import {createSlice, PayloadAction} from "@reduxjs/toolkit";
import {AlorApi, Endpoint, WssEndpoint, WssEndpointBeta} from "alor-api";
import {alorApi} from "./alor.api";
import {
    GetOperationsResponse, Portfolio,
    Status,
    UserInfoResponse
} from "alor-api/dist/services/ClientInfoService/ClientInfoService";
import {AppState} from "../store";

const initialState = {
    api: undefined,
    agreementsMap: {},
    activeOperations: [],
    lastWithdrawals: [],
    userInfo: localStorage.getItem('userInfo') ? JSON.parse(localStorage.getItem('userInfo')) : undefined,
    settings: JSON.parse(localStorage.getItem('settings') || '{}')
} as {
    api: undefined | AlorApi, userInfo: UserInfoResponse, settings: {
        token: string;
        portfolio: string;
        commissionType: string;
        agreement: string;
    }, agreementsMap: any, activeOperations: GetOperationsResponse[], lastWithdrawals: number[]
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
        initApi(state, action: PayloadAction<{ token: string, accessToken?: string }>) {
            state.api = new AlorApi({
                token: action.payload.token,
                accessToken: action.payload.accessToken,
                endpoint: Endpoint.PROD,
                wssEndpoint: WssEndpoint.PROD,
                wssEndpointBeta: WssEndpointBeta.PROD,
            });
        },
        setSettings(state, action: PayloadAction<any>) {
            state.settings = {...state.settings, ...action.payload};
            localStorage.setItem('settings', JSON.stringify(state.settings));
        },
        logout(state){
            state.userInfo = undefined;
            state.settings = {...state.settings, portfolio: undefined, token: undefined, agreement: undefined};
            state.api = undefined;

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

export const {initApi, setSettings, logout} = alorSlice.actions;