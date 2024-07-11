
import {OAuth2Client} from "@badgateway/oauth2-client";

// @ts-ignore
export const getEnv = (env: string) => process.env[env];

export const redirectUri = 'https://maksim-zakharov.github.io/alor-trader-diary';

export const oAuth2 = new OAuth2Client({

    // The base URI of your OAuth2 server
    server: 'https://oauth.alor.ru',

    // OAuth2 client id
    clientId: getEnv('SSO_CLIENT_ID'),

    // OAuth2 client secret. Only required for 'client_credentials', 'password'
    // flows. Don't specify this in insecure contexts, such as a browser using
    // the authorization_code flow.
    clientSecret: getEnv('SSO_CLIENT_SECRET'),


    // The following URIs are all optional. If they are not specified, we will
    // attempt to discover them using the oauth2 discovery document.
    // If your server doesn't have support this, you may need to specify these.
    // you may use relative URIs for any of these.


    // Token endpoint. Most flows need this.
    // If not specified we'll use the information for the discovery document
    // first, and otherwise default to /token
    tokenEndpoint: '/token',

    // Authorization endpoint.
    //
    // You only need this to generate URLs for authorization_code flows.
    // If not specified we'll use the information for the discovery document
    // first, and otherwise default to /authorize
    authorizationEndpoint: '/authorize',

    // OAuth2 Metadata discovery endpoint.
    //
    // This document is used to determine various server features.
    // If not specified, we assume it's on /.well-known/oauth2-authorization-server
    discoveryEndpoint: '/.well-known/oauth2-authorization-server',
});
