import {Button, Drawer} from "antd";
import MoneyOutputIcon from "../../../assets/money-output";
import MoneyInputIcon from "../../../assets/money-input";
import moment from "moment";
import {Status} from "alor-api/dist/services/ClientInfoService/ClientInfoService";
import {moneyFormat} from "../../../common/utils";
import {ClockCircleOutlined} from "@ant-design/icons";
import React, {useMemo, useRef, useState} from "react";
import {useGetOperationsQuery} from "../../../api/alor.api";
import {useAppSelector} from "../../../store";
import List from 'rc-virtual-list';
import {useWindowDimensions} from "../../../App";
import useMousePosition from "../../../common/useMousePosition";

const OperationsDrawer = ({onClose, isOpened}) => {
    const {height, width, isMobile} = useWindowDimensions();

    const [top, setTop] = useState(0);
    // const [title, setTitle] = useState<string>('Операции');

    function onMouseDown(event) {
        event.target.closest('.ant-drawer-content-wrapper').classList.add('ant-drawer-content-wrapper-dragger');
    }

    const onMouseMove = (event) => {
        var touch = event.touches[0];
        var y = touch.pageY;
        // setTitle(touch.pageY);
        setTop(y - 24)
        event.target.closest('.ant-drawer-content-wrapper').style.top = `${y - 24}px`;
    }

    function onMouseUp(event) {
        // console.log(event.target.closest('.ant-drawer-content-wrapper'))
        event.target.closest('.ant-drawer-content-wrapper').classList.remove('ant-drawer-content-wrapper-dragger');
        var touch = event.changedTouches[0];
        var y = touch.pageY;

        const diff = y / height;
        if (diff >= 0.40) {
            onClose();
            setTimeout(() => event.target.closest('.ant-drawer-content-wrapper').style.removeProperty('top'), 500);
        } else {
            event.target.closest('.ant-drawer-content-wrapper').style.removeProperty('top')
        }
    }

    const {x, y} = useMousePosition('touchmove');

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

    const ref = useRef<HTMLDivElement>();

    const title = 'Операции'

    const pipka = () => {

        return <div className="drawer-slider"/>
    }

    const renderTitle = useMemo(() => <div onMouseDown={onMouseDown} onMouseUp={onMouseUp} onTouchMove={onMouseMove} onTouchStart={onMouseDown}
                                           onTouchEnd={onMouseUp}>
        {pipka()}
        {title}
    </div>, [title]);

    return <Drawer title={renderTitle} panelRef={ref} open={isOpened} placement={isMobile ? "bottom" : "right"}
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