import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { BrowserRouter, HashRouter } from 'react-router-dom';
import 'moment/locale/ru'
import moment from "moment/moment";  // without this line it didn't work
import ru_RU from 'antd/es/locale/ru_RU';
import {ConfigProvider} from "antd";

import dayjs from "dayjs";
import "dayjs/locale/ru";
import updateLocale from "dayjs/plugin/updateLocale";

dayjs.extend(updateLocale);
dayjs.updateLocale("zh-cn", {
    weekStart: 0
});

moment().locale('ru');

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(
  <React.StrictMode>
      <ConfigProvider locale={ru_RU}>
    <HashRouter>
      <App />
    </HashRouter>
      </ConfigProvider>
  </React.StrictMode>,
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
