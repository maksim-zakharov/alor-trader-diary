import moment from "moment/moment";
import {moneyFormat} from "../../../common/utils";
import React, {useMemo} from "react";
import {Skeleton} from "antd";
import Spinner from "../../../common/Spinner";
import NoResult from "../../../common/NoResult";
import {numberToPercent} from "../../../utils";
import TickerImg from "../../../common/TickerImg";

const MaxProfitTradesWidget = ({nonSummaryPositions, isLoading, getIsinBySymbol}) => {
    const getMaxProfitTrades = useMemo(() => nonSummaryPositions.sort((a, b) => b.PnL - a.PnL).slice(0, 3).filter(p => p.PnL >= 0), [nonSummaryPositions])

    return <div className="widget">
        <div className="widget_header">Топ прибыльных сделок</div>
        {isLoading ? <Spinner/> : getMaxProfitTrades.length ? <div>
            {getMaxProfitTrades.map(getMaxProfitTrade => <div className="ticker-info">
                <div style={{display: 'flex'}}>
                    <TickerImg getIsinBySymbol={getIsinBySymbol} key={getMaxProfitTrade?.symbol} symbol={getMaxProfitTrade?.symbol}/>
                    <div className="ticker_name">
                        <div className="ticker_name_title">{getMaxProfitTrade?.symbol}</div>
                        <div className="ticker_name_description">
                            {moment(getMaxProfitTrade?.openDate).format('DD.MM.YYYY HH:mm:ss')}
                        </div>
                    </div>
                </div>
                <div className="ticker_actions">
                    <div className="ticker_name_title" style={{color: 'rgba(var(--table-profit-color),1)'}}>
                        <span>{moneyFormat(getMaxProfitTrade?.PnL || 0)}</span>
                        <span>{`${numberToPercent(getMaxProfitTrade?.PnLPercent)}%`}</span>
                    </div>
                    <div className="ticker_name_description">на сумму {moneyFormat(getMaxProfitTrade?.volume, 0)}</div>
                </div>
            </div>)}
        </div> : <NoResult text="Нет данных"/>}
    </div>
}

export default MaxProfitTradesWidget;