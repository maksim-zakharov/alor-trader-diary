import Chart from "./Chart";
import {Table, TableColumnsType} from "antd";
import React, {useEffect, useMemo, useState} from "react";
import moment from "moment";
import {ArrowDownOutlined, ArrowUpOutlined} from "@ant-design/icons";
import {moneyFormat} from "../../../common/utils";
import {fromTo, Security} from "alor-api";
import {useAppSelector} from "../../../store";

const PositionDetails = ({nightMode, trades, api, symbol}) => {
    const [security, setSecurity] = useState<Security | undefined>(undefined);

    const digits = useMemo(() => security ? `${security.minstep}`.split('.')[1]?.length : 0, [security]);

    const columns: TableColumnsType<any> = [
        {
            title: 'Время',
            dataIndex: 'date',
            key: 'date',
            align: 'center',
            render: (_, row) => moment(row.date).format('HH:mm:ss'),
        },
        {
            title: 'Направление',
            dataIndex: 'side',
            key: 'side',
            align: 'center',
            render: (_, row) =>
                // @ts-ignore
                row.side === 'sell' ? <ArrowDownOutlined /> : <ArrowUpOutlined />,
        },
        { title: 'Количество', dataIndex: 'qty',
            align: 'center',key: 'qty' },
        {
            title: 'Цена',
            dataIndex: 'price',
            key: 'price',
            align: 'center',
            render: (_, row) => moneyFormat(_, digits, digits),
        },
        {
            title: 'Объем',
            dataIndex: 'volume',
            key: 'volume',
            align: 'center',
            render: (_, row) => moneyFormat(_),
        },
        {
            title: 'Комиссия',
            dataIndex: 'commission',
            key: 'commission',
            align: 'center',
            render: (_, row) => moneyFormat(_),
        },
    ];

    useEffect(() => {
        api.instruments.getSecurityByExchangeAndSymbol({
            symbol,
            exchange: "MOEX",
        }).then(r => setSecurity(r));
    }, [symbol, api]);

    const darkColors = useAppSelector(state => state.alorSlice.darkColors);

    return <div className="collapsed-row">
        <Chart
            colors={nightMode && darkColors}
            trades={trades}
            symbol={symbol}
            digits={digits}
            security={security}
            api={api}
            from={trades[0].date}
            to={trades.slice(-1)[0].date}
        />
        <Table
            className="collapsed-row-details"
            style={{ gridColumnStart: 1, gridColumnEnd: 3 }}
            columns={columns}
            dataSource={trades.sort((a: any, b: any) =>
                a.date.localeCompare(b.date),
            )}
            pagination={false}
        />
    </div>
}

export default PositionDetails;