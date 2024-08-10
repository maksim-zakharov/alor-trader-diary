import moment from "moment/moment";
import {moneyFormat} from "../../../common/utils";
import React, {useMemo} from "react";
import Spinner from "../../../common/Spinner";
import NoResult from "../../../common/NoResult";
import {numberToPercent} from "../../../utils";
import TickerImg from "../../../common/TickerImg";
import TickerItem from "../../../common/TickerItem";
import Widget from "../../../common/Widget";

const MaxProfitTradesWidget = ({nonSummaryPositions, isLoading, getIsinBySymbol}) => {
    const getMaxProfitTrades = useMemo(() => nonSummaryPositions.sort((a, b) => b.PnL - a.PnL).slice(0, 3).filter(p => p.PnL >= 0), [nonSummaryPositions])

    return <Widget title="Топ прибыльных сделок">
        {isLoading ? <Spinner/> : getMaxProfitTrades.length ? <div>
            {getMaxProfitTrades.map(getMaxProfitTrade =>
                <TickerItem
                    logo={<TickerImg getIsinBySymbol={getIsinBySymbol} key={getMaxProfitTrade?.symbol}
                                     symbol={getMaxProfitTrade?.symbol}/>}
                    title={getMaxProfitTrade?.symbol}
                    description={moment(getMaxProfitTrade?.openDate).format('DD.MM.YYYY HH:mm:ss')}
                    actionTitle={<>
                        <span>{moneyFormat(getMaxProfitTrade?.PnL || 0)}</span>
                        <span>{`${numberToPercent(getMaxProfitTrade?.PnLPercent)}%`}</span>
                    </>}
                    actionTitleColor='rgba(var(--table-profit-color),1)'
                    actionDescription={`на сумму ${moneyFormat(getMaxProfitTrade?.volume, 0)}`}
                />
            )}
        </div> : <NoResult text="Нет данных"/>}
    </Widget>
}

export default MaxProfitTradesWidget;