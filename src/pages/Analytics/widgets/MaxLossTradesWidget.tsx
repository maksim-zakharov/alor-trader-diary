import moment from "moment/moment";
import {moneyFormat} from "../../../common/utils";
import React, {useMemo} from "react";
import {Skeleton} from "antd";
import Spinner from "../../../common/Spinner";
import NoResult from "../../../common/NoResult";
import {numberToPercent} from "../../../utils";
import TickerImg from "../../../common/TickerImg";

const MaxLossTradesWidget = ({nonSummaryPositions, isLoading, getIsinBySymbol}) => {
    const getMaxLossTrades = useMemo(() => nonSummaryPositions.sort((a, b) => a.PnL - b.PnL).slice(0, 3).filter(p => p.PnL <= 0), [nonSummaryPositions])

    return <div className="widget">
        <div className="widget_header">Топ убыточных сделок</div>
        {isLoading ? <Spinner/> : getMaxLossTrades.length ? <div>
            {getMaxLossTrades.map(getMaxLossTrade => <div className="ticker-info">
                <div style={{display: 'flex'}}>
                    <TickerImg getIsinBySymbol={getIsinBySymbol} key={getMaxLossTrade?.symbol} symbol={getMaxLossTrade?.symbol}/>
                    <div className="ticker_name">
                        <div className="ticker_name_title">{getMaxLossTrade?.symbol}</div>
                        <div className="ticker_name_description">
                            {moment(getMaxLossTrade?.openDate).format('DD.MM.YYYY HH:mm:ss')}
                        </div>
                    </div>
                </div>
                <div className="ticker_actions">
                    <div className="ticker_name_title" style={{ color: 'rgba(var(--table-loss-color),1)' }}>
                        <span>{moneyFormat(getMaxLossTrade?.PnL || 0)}</span>
                        <span>{`${numberToPercent(getMaxLossTrade?.PnLPercent)}%`}</span>
                    </div>
                    <div className="ticker_name_description">на сумму {moneyFormat(getMaxLossTrade?.volume, 0)}</div>
                </div>
            </div>)}
        </div> : <NoResult text="Нет данных"/>}
    </div>
}

export default MaxLossTradesWidget;