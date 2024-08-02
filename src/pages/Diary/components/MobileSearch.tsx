import {useGetSecuritiesMutation} from "../../../api/alor.api";
import React, {useEffect, useMemo, useRef, useState} from "react";
import {Button, Input} from "antd";
import {SearchOutlined} from "@ant-design/icons";
import TickerImg from "../../../common/TickerImg";
import {useSearchParams} from "react-router-dom";

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
    ]

    const securitiesGroupByBoard = useMemo(() => data.reduce((acc, curr) => {
        if (!acc[curr.primary_board]) {
            acc[curr.primary_board] = [];
        }

        if (value && curr.description.toLowerCase().includes((value || '').toLowerCase()))
            acc[curr.primary_board].push(curr);

        return acc;
    }, {}), [data, value]);

    const ref = useRef(null);

    const debounce = (callback: (args) => any, ms: number) => {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                callback(args);
            }, ms);
        }
    }
    const getData = (query: string) => getSecurities({
        query,
        limit: 1000,
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
        setSearchParams(searchParams);
    }

    return <div className="SearchContainer">
        <div className="input-container">
            <Input placeholder="Бумага" className="rounded" ref={ref} value={value} onChange={onChange}
                   prefix={<SearchOutlined/>}
                   onFocus={onFocus} onBlur={onBlur}/>
            {value && <Button type="link" onClick={() => setValue('')}>Отменить</Button>}
        </div>
        {boardsWithLabel.filter(bwl => securitiesGroupByBoard[bwl.value]?.length).map(bwl =>
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
                        <div className="ticker-info" key={dp.ISIN} onClick={() => handleSelectTicker(dp)}>
                            <div style={{display: 'flex'}}>
                                <TickerImg getIsinBySymbol={getIsinBySymbol} key={dp?.symbol} board={dp?.primary_board}
                                           symbol={dp?.symbol}/>
                                <div className="ticker_name">
                                    <div className="ticker_name_title">{dp?.description}</div>
                                    <div className="ticker_name_description">
                                        {dp?.symbol}
                                    </div>
                                </div>
                            </div>
                            {/*<div className="ticker_actions">*/}
                            {/*    <div className="ticker_name_title"*/}
                            {/*         style={{color: dp?.PnL > 0 ? 'rgba(var(--table-profit-color),1)' : 'rgba(var(--table-loss-color),1)'}}>*/}
                            {/*        <span>{moneyFormat(dp?.PnL || 0)}</span>*/}
                            {/*        <span>{`${numberToPercent(dp?.PnLPercent)}%`}</span>*/}
                            {/*    </div>*/}
                            {/*    <div className="ticker_name_description">на сумму {moneyFormat(dp?.volume, 0)}</div>*/}
                            {/*</div>*/}
                        </div>)}

                </div>
            </div>
        )}
    </div>
}

export default MobileSearch;