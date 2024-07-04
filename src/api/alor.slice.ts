import {createSlice, PayloadAction} from "@reduxjs/toolkit";
import {AlorApi, Endpoint, WssEndpoint, WssEndpointBeta} from "alor-api";

const initialState = {
    api: undefined,
    settings: JSON.parse(localStorage.getItem('settings') || '{}')
} as {api: undefined | AlorApi, settings: {
        token: string;
        portfolio: string;
        commissionType: string;
    }};

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
        }
    },
    // extraReducers: (builder) => {
    //     builder.addMatcher(goApi.endpoints.getAdGroup.matchPending, _resetAdGroupError);
    //     builder.addMatcher(goApi.endpoints.editAdGroup.matchPending, _resetAdGroupError);
    //     builder.addMatcher(goApi.endpoints.getCampaign.matchFulfilled, _resetEditCampaignError);
    //     builder.addMatcher(goApi.endpoints.editCampaign.matchPending, _resetEditCampaignError);
    // },
});

export const { initApi } = alorSlice.actions;