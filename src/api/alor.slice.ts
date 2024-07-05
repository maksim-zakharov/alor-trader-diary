import {createSlice, PayloadAction} from "@reduxjs/toolkit";
import {AlorApi, Endpoint, WssEndpoint, WssEndpointBeta} from "alor-api";
import {alorApi} from "./alor.api";

const initialState = {
    api: undefined,
    agreementsMap: {},
    settings: JSON.parse(localStorage.getItem('settings') || '{}')
} as {api: undefined | AlorApi, settings: {
        token: string;
        portfolio: string;
        commissionType: string;
        agreement: string;
    }, agreementsMap: any};

export const alorSlice = createSlice({
    name: 'alorSlice',
    initialState,
    reducers: {
        initApi(state, action: PayloadAction<{ token: string}>) {
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
        // builder.addMatcher(goApi.endpoints.editAdGroup.matchPending, _resetAdGroupError);
        builder.addMatcher(alorApi.endpoints.getUserInfo.matchFulfilled, (state, { payload }) => {
            state.agreementsMap = payload?.agreements?.reduce((acc, curr) => ({...acc, [curr.agreementNumber]: curr}), {}) || {};
        });
        // builder.addMatcher(goApi.endpoints.editCampaign.matchPending, _resetEditCampaignError);
    },
});

export const { initApi, setSettings } = alorSlice.actions;