import moment from "moment/moment";
import {moneyFormat} from "../../../common/utils";
import React, {useMemo} from "react";
import Spinner from "../../../common/Spinner";
import NoResult from "../../../common/NoResult";
import {numberToPercent} from "../../../utils";
import TickerImg from "../../../common/TickerImg";
import TickerItem from "../../../common/TickerItem";

const MaxLossTradesWidget = ({nonSummaryPositions, isLoading, getIsinBySymbol}) => {
    const getMaxLossTrades = useMemo(() => nonSummaryPositions.sort((a, b) => a.PnL - b.PnL).slice(0, 3).filter(p => p.PnL <= 0), [nonSummaryPositions])

    return <div className="widget">
        <div className="widget_header">Топ убыточных сделок</div>
        {isLoading ? <Spinner/> : getMaxLossTrades.length ? <div>
            {getMaxLossTrades.map(getMaxLossTrade =>
                <TickerItem
                    logo={<TickerImg getIsinBySymbol={getIsinBySymbol} key={getMaxLossTrade?.symbol}
                                     symbol={getMaxLossTrade?.symbol}/>}
                    title={getMaxLossTrade?.symbol}
                    description={moment(getMaxLossTrade?.openDate).format('DD.MM.YYYY HH:mm:ss')}
                    actionTitle={<>
                        <span>{moneyFormat(getMaxLossTrade?.PnL || 0)}</span>
                        <span>{`${numberToPercent(getMaxLossTrade?.PnLPercent)}%`}</span>
                    </>}
                    actionTitleColor='rgba(var(--table-loss-color),1)'
                    actionDescription={`на сумму ${moneyFormat(getMaxLossTrade?.volume, 0)}`}
                />
            )}
        </div> : <NoResult text="Нет данных"/>}
    </div>
}

export default MaxLossTradesWidget;