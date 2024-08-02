import React, {useMemo} from "react";
import {useSearchParams} from "react-router-dom";
import moment from "moment";
import {moneyFormat} from "../../../common/utils";
import TickerImg from "../../../common/TickerImg";
import {numberToPercent} from "../../../utils";

const MobilePosition = ({positions, getIsinBySymbol}) => {
    const summary = useMemo(() => positions.find(p => p.type === 'summary'), [positions]);
    const dayPositions = useMemo(() => positions.filter(p => p.type !== 'summary'), [positions]);

    const [searchParams, setSearchParams] = useSearchParams();
    const selectKey = searchParams.get('selectedSymbolKey');

    const handleSelectTicker = (position: any) => {
        searchParams.set('symbol', position.symbol);
        searchParams.set('selectedSymbolKey', `${summary.openDate}-${position.openDate}-${position.symbol}`);
        setSearchParams(searchParams);
    }

    return <div className="MobilePosition" key={summary.openDate}>
        <div className="widget">
            <div style={{display: 'flex', alignItems: 'end'}}>
                <div className="title-container">
                    <div className="title">{moment(summary.openDate).format('DD.MM.YYYY')}</div>
                    <div style={{
                        display: 'inline-flex',
                        alignItems: 'end'
                    }}>
                        <div
                            className={`result ${summary.PnL > 0 ? 'profit' : 'loss'}`}>{summary.PnL > 0 ? '+' : ''}{moneyFormat(summary.PnL)}
                            {/*<span className='percent'>{shortNumberFormat(netProfitPercent)}%</span>*/}
                        </div>
                    </div>
                </div>
            </div>
            {dayPositions.map(dp =>
                <div
                    className={`ticker-info${selectKey === `${summary.openDate}-${dp.openDate}-${dp.symbol}` ? ' selected' : ''}`}
                    key={`${summary.openDate}-${dp.openDate}-${dp.symbol}`} onClick={() => handleSelectTicker(dp)}>
                    <div style={{display: 'flex'}}>
                        <TickerImg getIsinBySymbol={getIsinBySymbol} key={dp?.symbol} symbol={dp?.symbol}/>
                        <div className="ticker_name">
                            <div className="ticker_name_title">{dp?.symbol}</div>
                            <div className="ticker_name_description">
                                {moment(dp?.openDate).format('HH:mm:ss')}
                            </div>
                        </div>
                    </div>
                    <div className="ticker_actions">
                        <div className="ticker_name_title"
                             style={{color: dp?.PnL > 0 ? 'rgba(var(--table-profit-color),1)' : 'rgba(var(--table-loss-color),1)'}}>
                            <span>{moneyFormat(dp?.PnL || 0)}</span>
                            <span>{`${numberToPercent(dp?.PnLPercent)}%`}</span>
                        </div>
                        <div className="ticker_name_description">на сумму {moneyFormat(dp?.volume, 0)}</div>
                    </div>
                </div>)}
        </div>
    </div>
}

export default MobilePosition;