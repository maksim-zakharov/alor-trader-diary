import {Button} from "antd";
import MoneyOutputIcon from "../../../assets/money-output";
import MoneyInputIcon from "../../../assets/money-input";
import moment from "moment";
import {Status} from "alor-api/dist/services/ClientInfoService/ClientInfoService";
import {moneyFormat, virtualListStyles} from "../../../common/utils";
import {ClockCircleOutlined} from "@ant-design/icons";
import React, {useMemo} from "react";
import {useGetOperationsQuery} from "../../../api/alor.api";
import {useAppSelector} from "../../../store";
import List from 'rc-virtual-list';
import DraggableDrawer from "../../../common/DraggableDrawerHOC";
import useWindowDimensions from "../../../common/useWindowDimensions";
import TickerItem from "../../../common/TickerItem";

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

    const title = 'Операции'

    return <DraggableDrawer title={title} open={isOpened} placement={isMobile ? "bottom" : "right"}
                            closeIcon={<Button type="link"
                                               onClick={onClose}>Закрыть</Button>}
                            onClose={onClose} className="operation-modal">
        <List data={moneyOperations} styles={virtualListStyles} height={listHeight} itemHeight={52} itemKey="id">
            {(getMaxLossTrade =>
                    <TickerItem
                        key={getMaxLossTrade.id}
                        logo={getMaxLossTrade.subType === 'money_withdrawal' ? <MoneyOutputIcon/> : <MoneyInputIcon/>}
                        title={getMaxLossTrade.subType === 'money_withdrawal' ? 'Вывод с брокерского счета' : 'Пополнение брокерского счета'}
                        description={`${withoutYear(getMaxLossTrade.date)} ${moment(getMaxLossTrade?.date).format('HH:mm:ss')}`}
                        actionTitle={
                            <>
                                {getMaxLossTrade.subType === 'money_input' ? '+' : '-'}{moneyFormat(getMaxLossTrade?.data?.amount || 0, 0)}{getMaxLossTrade.status === Status.executing &&
                                <ClockCircleOutlined style={{marginLeft: '4px'}}/>}
                            </>
                        }
                        actionTitleColor={[Status.Refused, Status.Overdue].includes(getMaxLossTrade.status) ? 'rgba(var(--table-loss-color),1)' : getMaxLossTrade.status === Status.Resolved ? 'rgba(var(--table-profit-color),1)' : undefined}
                        actionDescription={getMaxLossTrade?.data?.accountFrom}
                    />
            )}
        </List>
    </DraggableDrawer>
}

export default OperationsDrawer;