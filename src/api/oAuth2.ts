import ClientOAuth2 from "client-oauth2";

// @ts-ignore
export const getEnv = (env: string) => process.env[env];

export const redirectUri = 'https://maksim-zakharov.github.io/alor-trader-diary/';

export const oAuth2Client = new ClientOAuth2({
    clientId: getEnv('SSO_CLIENT_ID'),
    clientSecret: getEnv('SSO_CLIENT_SECRET'),
    accessTokenUri: 'https://oauth.alor.ru/token',
    authorizationUri: 'https://oauth.alor.ru/authorize',
    redirectUri,
    scopes: ['ordersread', 'trades', 'personal']
})
