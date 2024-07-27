import {Button, Drawer} from "antd";
import MoneyOutputIcon from "../../../assets/money-output";
import MoneyInputIcon from "../../../assets/money-input";
import moment from "moment";
import {Status} from "alor-api/dist/services/ClientInfoService/ClientInfoService";
import {moneyFormat} from "../../../common/utils";
import {ClockCircleOutlined} from "@ant-design/icons";
import React, {useMemo} from "react";
import {useGetOperationsQuery} from "../../../api/alor.api";
import {useAppSelector} from "../../../store";
import List from 'rc-virtual-list';
import {useWindowDimensions} from "../../../App";

const OperationsDrawer = ({onClose, isOpened}) => {
    const {height, width, isMobile} = useWindowDimensions();

    const userInfo = useAppSelector(state => state.alorSlice.userInfo);
    const {data: operations = []} = useGetOperationsQuery(userInfo?.agreements[0]?.agreementNumber, {
        skip: !userInfo
    });

    const listHeight = useMemo(() => isMobile ? height - 106 : height - 56, [isMobile, height]);

    const moneyOperations = useMemo(() => operations.filter(o => ['money_input', 'money_withdrawal'].includes(o.subType)), [operations])

    const withoutYear = (date) => {
        const format = moment(date).format('LL');

        return format.slice(0, format.length - 8);
    }

    return <Drawer title="Операции" open={isOpened} placement={isMobile ? "bottom" : "right"}
                   closeIcon={<Button type="link"
                                      onClick={onClose}>Закрыть</Button>}
                   onClose={onClose} className="operation-modal">
        <List data={moneyOperations} styles={{
            verticalScrollBar: {
                width: 'calc(var(--scrollbar-width) - 2px)',
                height: 'var(--scrollbar-width)',
                background: 'rgba(var(--scrollbars-bg-color), var(--scrollbars-bg-opacity))',
                cursor: 'pointer'
            },
            verticalScrollBarThumb: {
                border: '2px solid transparent',
                backgroundColor: "rgba(var(--scrollbars-thumb-color), var(--scrollbars-thumb-opacity))",
                backgroundClip: "padding-box",
                borderRadius: "5px",
                cursor: "pointer",
                // -webkit-transition: "background-color .2s ease-in",
                transition: "background-color .2s ease-in"
            }
        }} height={listHeight} itemHeight={52} itemKey="id">
            {(getMaxLossTrade =>
                <div className="ticker-info" key={getMaxLossTrade.id}>
                    <div style={{display: 'flex'}}>
                        {getMaxLossTrade.subType === 'money_withdrawal' ? <MoneyOutputIcon/> : <MoneyInputIcon/>}
                        <div className="ticker_name">
                            <div
                                className="ticker_name_title">{getMaxLossTrade.subType === 'money_withdrawal' ? 'Вывод с брокерского счета' : 'Пополнение брокерского счета'}</div>
                            <div className="ticker_name_description">
                                {withoutYear(getMaxLossTrade.date)} {moment(getMaxLossTrade?.date).format('HH:mm:ss')}
                            </div>
                        </div>
                    </div>
                    <div className="ticker_actions">
                        <div className="ticker_name_title"
                             style={{color: [Status.Refused, Status.Overdue].includes(getMaxLossTrade.status) ? 'rgba(var(--table-loss-color),1)' : getMaxLossTrade.status === Status.Resolved ? 'rgba(var(--table-profit-color),1)' : undefined}}>{getMaxLossTrade.subType === 'money_input' ? '+' : '-'}{moneyFormat(getMaxLossTrade?.data?.amount || 0, 0)}{getMaxLossTrade.status === Status.executing &&
                            <ClockCircleOutlined style={{marginLeft: '4px'}}/>}</div>
                        <div className="ticker_name_description">{getMaxLossTrade?.data?.accountFrom}</div>
                    </div>
                </div>)}
        </List>
    </Drawer>
}

export default OperationsDrawer;