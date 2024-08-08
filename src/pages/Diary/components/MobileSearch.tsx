import {useGetSecuritiesMutation} from "../../../api/alor.api";
import React, {useEffect, useMemo, useRef, useState} from "react";
import {Button, Input} from "antd";
import {SearchOutlined} from "@ant-design/icons";
import TickerImg from "../../../common/TickerImg";
import {useSearchParams} from "react-router-dom";
import {moneyFormat} from "../../../common/utils";

const MobileSearch = ({getIsinBySymbol}) => {
    const [searchParams, setSearchParams] = useSearchParams();
    const [getSecurities, {data = []}] = useGetSecuritiesMutation();
    const [focused, setFocused] = React.useState(false);
    const [value, setValue] = useState<string>('');
    const onFocus = () => setFocused(true)
    const onBlur = () => setFocused(false)
    const onChange = (event) => {
        // searchParams.set('query', event.target.value);
        // setSearchParams(searchParams);
        setValue(event.target.value)
    }

    const boardsWithLabel = [
        {label: 'Акции', value: 'TQBR'},
        {label: 'Фонды', value: 'TQTF'},
        {label: 'Паи', value: 'TQIF'},
        {label: 'Облигации', value: 'TQCB'},
        {label: 'Гос. облигации', value: 'TQOB'},
        {label: 'Фьючерсы', value: 'RFUD'},
        {label: 'Опционы', value: 'ROPD'},
    ]

    const securitiesGroupByBoard = useMemo(() => data.reduce((acc, curr) => {
        if (!acc[curr.primary_board]) {
            acc[curr.primary_board] = [];
        }

        // if (value
        //     &&
        //     (
        //         curr.description.toLowerCase().includes((value || '').toLowerCase())
        //         || curr.symbol.toLowerCase().includes((value || '').toLowerCase())
        //     )
        //
        // )
            acc[curr.primary_board].push(curr);

        return acc;
    }, {}), [data, value]);

    const ref = useRef(null);

    const debounce = (callback: (args) => any, ms: number) => {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                // @ts-ignore
                callback(...args);
            }, ms);
        }
    }
    const getData = (query: string) => getSecurities({
        query,
        limit: 500,
    }).unwrap();

    const getDataDebounce = useMemo(() => debounce(getData, 500), []);

    useEffect(() => {
        if (value) {
            getDataDebounce(value)
        }
    }, [value]);

    const [hideMap, setHideMap] = useState({});

    const handleSelectTicker = (position: any) => {
        searchParams.set('symbol', position.symbol);
        searchParams.set('exchange', position.exchange || 'MOEX');
        setSearchParams(searchParams);
    }

    const itemsWithValues = useMemo(() => boardsWithLabel.filter(bwl => securitiesGroupByBoard[bwl.value]?.length), [boardsWithLabel, securitiesGroupByBoard])

    return <div className="SearchContainer">
        <div className="input-container">
            <Input placeholder="Бумага" className="rounded" ref={ref} value={value} onChange={onChange}
                   prefix={<SearchOutlined/>}
                   onFocus={onFocus} onBlur={onBlur}/>
            {value && <Button type="link" onClick={() => setValue('')}>Отменить</Button>}
        </div>
        {itemsWithValues.length > 0 && value && <div className="search-result">
            {itemsWithValues.map(bwl =>
                <div className="MobilePosition" key={bwl.value}>
                    <div className="widget">
                        <div style={{display: 'flex', alignItems: 'end'}}>
                            <div className="title-container">
                                <div className="title">{bwl.label}</div>
                                {(securitiesGroupByBoard[bwl.value] || []).length > 3 && <div style={{
                                    display: 'inline-flex',
                                    alignItems: 'end'
                                }}>
                                    {!hideMap[bwl.value] && <Button type="link"
                                                                    onClick={() => setHideMap(prevState => ({
                                                                        ...prevState,
                                                                        [bwl.value]: true
                                                                    }))}>Больше</Button>}
                                    {hideMap[bwl.value] && <Button type="link" onClick={() => setHideMap(prevState => ({
                                        ...prevState,
                                        [bwl.value]: false
                                    }))}>Меньше</Button>}
                                </div>}
                            </div>
                        </div>
                        {(securitiesGroupByBoard[bwl.value] || []).filter((_, i) => !hideMap[bwl.value] ? i < 3 : true).map(dp =>
                            <div className={`ticker-info${[18, 2].includes(dp?.tradingStatus) ? ' blocked' : ''}`} key={dp.ISIN} onClick={() => handleSelectTicker(dp)}>
                                <div style={{display: 'flex'}}>
                                    <TickerImg getIsinBySymbol={getIsinBySymbol} key={dp?.symbol} board={dp?.primary_board}
                                               symbol={dp?.underlyingSymbol || dp?.symbol}/>
                                    <div className="ticker_name">
                                        <div className="ticker_name_title">
                                            {dp?.primary_board === "RFUD" ? dp?.symbol
                                            :dp?.primary_board === "ROPD" ? `${dp?.underlyingSymbol} ${dp?.optionSide?.toUpperCase()} ${moneyFormat(dp?.strikePrice || 0, 0, 0)}`: dp?.description}
                                        </div>
                                        <div className="ticker_name_description">
                                            {['RFUD', "ROPD"].includes(dp?.primary_board) ? dp?.shortname: dp?.symbol}
                                        </div>
                                    </div>
                                </div>
                                {dp?.theorPriceLimit > 0 && <div className="ticker_actions">
                                    <div className="ticker_name_title">
                                        <span>{moneyFormat(dp?.theorPriceLimit || 0)}</span>
                                        {/*<span>{`${numberToPercent(dp?.PnLPercent)}%`}</span>*/}
                                    </div>
                                </div>}
                            </div>)}

                    </div>
                </div>
            )}
        </div>}
    </div>
}

export default MobileSearch;