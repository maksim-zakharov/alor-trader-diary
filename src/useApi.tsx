import {useEffect, useState} from "react";
import {AlorApi, Endpoint, WssEndpoint, WssEndpointBeta} from "alor-api";
import axios from 'axios'

export const useApi = (token: string): AlorApi => {

    const [client, setClient] = useState(undefined)

    useEffect(() => {
        if(token){
            // client.setMaxListeners({
            //     subscriptions: 300,
            // });
            setClient(new AlorApi({
                token,
                endpoint: Endpoint.PROD,
                wssEndpoint: WssEndpoint.PROD,
                wssEndpointBeta: WssEndpointBeta.PROD,
            }))
        }
    }, [token])

    return client;
}