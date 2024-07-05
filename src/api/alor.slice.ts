import {createSlice, PayloadAction} from "@reduxjs/toolkit";
import {AlorApi, Endpoint, WssEndpoint, WssEndpointBeta} from "alor-api";
import {alorApi} from "./alor.api";
import {GetOperationsResponse, Status} from "alor-api/dist/services/ClientInfoService/ClientInfoService";

const initialState = {
    api: undefined,
    agreementsMap: {},
    activeOperations: [],
    lastWithdrawals: [],
    settings: JSON.parse(localStorage.getItem('settings') || '{}')
} as {
    api: undefined | AlorApi, settings: {
        token: string;
        portfolio: string;
        commissionType: string;
        agreement: string;
    }, agreementsMap: any, activeOperations: GetOperationsResponse[], lastWithdrawals: number[]
};

export const alorSlice = createSlice({
    name: 'alorSlice',
    initialState,
    reducers: {
        initApi(state, action: PayloadAction<{ token: string }>) {
            state.api = new AlorApi({
                token: action.payload.token,
                endpoint: Endpoint.PROD,
                wssEndpoint: WssEndpoint.PROD,
                wssEndpointBeta: WssEndpointBeta.PROD,
            });
        },
        setSettings(state, action: PayloadAction<any>) {
            state.settings = {...state.settings, ...action.payload};
            localStorage.setItem('settings', JSON.stringify(state.settings));
        },
    },
    extraReducers: (builder) => {
        // builder.addMatcher(goApi.endpoints.getAdGroup.matchPending, _resetAdGroupError);
        builder.addMatcher(alorApi.endpoints.getOperations.matchFulfilled, (state, {payload}) => {
            state.activeOperations = payload.filter(o => ![Status.Overdue, Status.Refused].includes(o.status)) || [];
            state.lastWithdrawals = Array.from(new Set(state.activeOperations.map(o => o.data.amount))).sort((a, b) => b - a).slice(0, 5).filter(a => a);
        });
        builder.addMatcher(alorApi.endpoints.getUserInfo.matchFulfilled, (state, {payload}) => {
            state.agreementsMap = payload?.agreements?.reduce((acc, curr) => ({
                ...acc,
                [curr.agreementNumber]: curr
            }), {}) || {};
        });
        // builder.addMatcher(goApi.endpoints.editCampaign.matchPending, _resetEditCampaignError);
    },
});

export const {initApi, setSettings} = alorSlice.actions;