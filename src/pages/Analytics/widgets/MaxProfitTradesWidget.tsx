import * as moment from "moment/moment";
import {moneyFormat} from "../../../common/utils";
import React, {useMemo} from "react";
import {Skeleton} from "antd";
import Spinner from "../../../common/Spinner";
import NoResult from "../../../common/NoResult";

const MaxProfitTradesWidget = ({nonSummaryPositions, isLoading}) => {
    const getMaxProfitTrades = useMemo(() => nonSummaryPositions.sort((a, b) => b.PnL - a.PnL).slice(0, 3), [nonSummaryPositions])

    return <div className="widget">
        <div className="widget_header">Top profit trades</div>
        {isLoading ? <Spinner/> : getMaxProfitTrades.length ? <div>
            {getMaxProfitTrades.map(getMaxProfitTrade => <div className="ticker-info">
                <div style={{display: 'flex'}}>
                    <img className="ticker_logo" src={`https://storage.alorbroker.ru/icon/${getMaxProfitTrade?.symbol}.png`} alt={getMaxProfitTrade?.symbol}/>
                    <div className="ticker_name">
                        <div className="ticker_name_title">{getMaxProfitTrade?.symbol}</div>
                        <div className="ticker_name_description">
                            {moment(getMaxProfitTrade?.openDate).format('DD.MM.YYYY HH:mm:ss')}
                        </div>
                    </div>
                </div>
                <div className="ticker_actions">
                    <div className="ticker_name_title" style={{ color: 'rgba(var(--table-profit-color),1)' }}>{moneyFormat(getMaxProfitTrade?.PnL || 0)} ({`${(getMaxProfitTrade?.PnLPercent * 100).toFixed(2)}%`})</div>
                    <div className="ticker_name_description">на сумму {moneyFormat(getMaxProfitTrade?.volume, 0)}</div>
                </div>
            </div>)}
        </div> : <NoResult text="Нет данных"/>}
    </div>
}

export default MaxProfitTradesWidget;