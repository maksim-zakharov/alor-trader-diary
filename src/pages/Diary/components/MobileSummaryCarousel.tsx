import {Button, Carousel, Radio, Space} from "antd";
import React, {useEffect, useMemo, useRef, useState} from "react";
import Spinner from "../../../common/Spinner";
import {moneyFormat, shortNumberFormat} from "../../../common/utils";
import {EyeInvisibleOutlined, EyeOutlined, LogoutOutlined, SettingOutlined, SwapOutlined} from "@ant-design/icons";
import {setSettings} from "../../../api/alor.slice";
import dayjs from "dayjs";
import {useGetAllSummariesQuery} from "../../../api/alor.api";
import {Exchange} from "alor-api";
import {useAppDispatch, useAppSelector} from "../../../store";

const MobileSummaryCarousel = ({dateFrom, onChangeView, view, setShowOperationsModal, todayPnL, options, onChangeDate, totalPnL, netProfitPercent}) => {
    const userInfo = useAppSelector(state => state.alorSlice.userInfo);
    const settings = useAppSelector(state => state.alorSlice.settings);
    const dispatch = useAppDispatch();

    const {data: summaries = [], isLoading} = useGetAllSummariesQuery({
        exchange: Exchange.MOEX,
        format: 'Simple',
        userInfo
    }, {
        skip: !userInfo
    });

    const [initialSlide, setInitialSlide] = useState(0);

    const summaryValueMap = useMemo(() => {
        if (!summaries) {
            return 0;
        }
        if (!settings['summaryType'] || settings['summaryType'] === 'brokerSummary') {
            return summaries.reduce((acc, curr) => ({...acc, [curr.accountNumber]: curr.portfolioLiquidationValue || 0}), {});
        }

        return summaries.reduce((acc, curr) => ({...acc, [curr.accountNumber]: curr.buyingPowerAtMorning + todayPnL}), {});
    }, [summaries, settings['summaryType'], todayPnL]);

    const onCarouselChange = (current: number) => {
        if(current === initialSlide){
            return;
        }

        const sry = summaries[current];
        if(sry){
            setInitialSlide(current)
            dispatch(setSettings({agreement: sry.agreementNumber, portfolio: sry.accountNumber}));
        }
    }

    const ref = useRef(null);

    useEffect(() => {
        if(ref?.current){
            const index = summaries.findIndex(s => s.accountNumber === settings.portfolio);
            ref?.current?.goTo(index, true)
        }
    }, [ref])

    const MobileSummary = ({summary}) => <div className="MobileSummary widget">
        {isLoading && <Spinner/>}
        {!isLoading && <div className="summary-info">
            <div>
                <div className="summary__description">Счет {summary.accountNumber} ({summary.service})</div>
                <div className="summary">{settings['hideSummary'] ? '••••' : moneyFormat(summaryValueMap[summary.accountNumber], 0, 0)}</div>
                <div style={{
                    display: 'inline-flex',
                    alignItems: 'end'
                }}>
                    <div
                        className={`result ${totalPnL > 0 ? 'profit' : 'loss'}`}>{totalPnL > 0 ? '+' : ''}{moneyFormat(totalPnL)}
                        <span className='percent'>{shortNumberFormat(netProfitPercent)}%</span>
                    </div>
                    <MobileDatepicker/>
                </div>
            </div>

            <Space>
                <Button
                    type="text"
                    icon={settings['hideSummary'] ? <EyeOutlined/> : <EyeInvisibleOutlined/>}
                    className="vertical-button"
                    onClick={(f) => dispatch(setSettings(({['hideSummary']: !settings['hideSummary']})))}
                />
                <Button
                    type="text"
                    icon={<SettingOutlined/>}
                    className="vertical-button"
                    onClick={(f) => setShowOperationsModal('settings')(true)}
                />
            </Space>
        </div>}
        <div className="button-group">
            <Button
                type="text"
                icon={<SwapOutlined/>}
                className="vertical-button"
                onClick={(f) => setShowOperationsModal('operations')(true)}
            >Операции</Button>

            <Button
                type="text"
                icon={<LogoutOutlined/>}
                className="vertical-button"
                onClick={(f) => setShowOperationsModal('payout')(true)}
            >Вывести</Button>

            <Radio.Group options={options} onChange={e => onChangeView(e.target.value)} value={view} size="large"
                         optionType="button"/>
        </div>
    </div>

    const MobileDatepicker = () => <div className="MobileDatepicker">
        <label htmlFor="mobile-date">от {dateFrom}</label>
        <input type="date" id="mobile-date" value={dateFrom}
               onChange={date => onChangeDate(dayjs(date.target.value, 'YYYY-MM-DD'))}/>
    </div>

    return <Carousel ref={ref} initialSlide={initialSlide} afterChange={onCarouselChange} className="MobileSummaryCarousel">
        {summaries.map(summary =><MobileSummary summary={summary}/>)}
    </Carousel>
}

export default MobileSummaryCarousel;