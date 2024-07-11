Бестпрактис описан тут: https://auth0.com/docs/get-started/authentication-and-authorization-flow/authorization-code-flow

## Авторизация для разработчиков (as is):

1. На моем сайте пользователь тыкает кнопку "войти по ссо" которая редиректит на следующую ссылку
   https://oauth.alor.ru/authorize?client_id={{client_id}}&redirect_uri={{redirect}}&response_type=code&state=&scope=ordersread%20trades%20personal

2. На вашем сайте для разработчиков авторизовываюсь через логин пароль
   get https://lk-api.alor.ru/auth/actions/2factor/?login={{login}}
   post https://lk-api.alor.ru/auth/actions/login

```json
{
  "credentials": {
    "login": "login",
    "password": "password",
    "twoFactorPin": null
  },
  "requiredServices": [
    "clientApi",
    "Warp"
  ]
}
```

3. Даю доступ к приложени по правам
   post https://devs.alor.ru/devapi/v1/oauth/code

```json
[
  "ordersread",
  "trades",
  "personal"
]
```

4. Сайт редиректит по моему redirectUri с переданным вашим code
5. Запрашиваю уже на своем сайте
   post https://oauth.alor.ru/token отдавая полученный code, получаю access/refresh token

```
code: {{code}}
grant_type: authorization_code
redirect_uri: {{redirectUri}}
client_id: {{client_id}}
client_secret: {{client_secret}}
```

## Авторизация в личном кабинете (as is)

1. Заходим на https://login.alor.ru/?url=https://lk.alor.ru/main&scope=ClientAccount
2. Вводим логин пароль
3. Отправляется запрос GET https://lk-api.alor.ru/auth/actions/2factor/?login={{login}}
4. POST https://lk-api.alor.ru/sso-auth/client
   ```json
   {"credentials":{"login":"login","password":"password","twoFactorPin":null},"client_id":"SingleSignOn","redirect_url":"//lk.alor.ru/"}
   ```
5. POST https://lk-api.alor.ru/auth/actions/refresh отдаю refreshToken (пока не понял откуда) и в ответ получаю jwt

## Общая авторизация для всех SSO (as to be)
1. Заходим на любой сайт (лк, терминал или доверенный сайт разработчика)
2. Делаем с текущего сайта запрос на авторизационный сайт за токеном
3. Запрос падает, редиректим на сайт авторизации
```
https://{yourDomain}/authorize?
    response_type=code&
    client_id={yourClientId}&
    redirect_uri={https://yourApp/callback}&
    scope={scope}&
    state={state}
```
В ответ нам отдается 302 с Location Location: {https://yourApp/callback}?code={authorizationCode}&state=xyzABC123 который автоматом редиректит нас по указанной ссылке
4. Логинимся на авторизационном сайте, он редиректит нас на наш сайт передавая нам code И вешает куку-сессию как признак авторизации на сайт авторизации. Если мы уже были на нем залогинены (есть кука, то нас автоматически редиректит)
5. С этим code мы запрашиваем уже токен и работаем с ним
```
   curl --request POST \
   --url 'https://{yourDomain}/oauth/token' \
   --header 'content-type: application/x-www-form-urlencoded' \
   --data grant_type=authorization_code \
   --data 'client_id={yourClientId}' \
   --data 'client_secret={yourClientSecret}' \
   --data 'code=yourAuthorizationCode}' \
   --data 'redirect_uri={https://yourApp/callback}'
```