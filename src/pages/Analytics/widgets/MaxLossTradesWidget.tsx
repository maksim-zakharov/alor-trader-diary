import * as moment from "moment/moment";
import {moneyFormat} from "../../../common/utils";
import React, {useMemo} from "react";
import {Skeleton} from "antd";

const MaxLossTradesWidget = ({nonSummaryPositions, isLoading}) => {
    const getMaxLossTrades = useMemo(() => nonSummaryPositions.sort((a, b) => a.PnL - b.PnL).slice(0, 3), [nonSummaryPositions])

    return <div className="widget">
        <div className="widget_header">Top loss trades</div>
        {isLoading ? <Skeleton title={false} paragraph={{
            rows: 4
        }} /> :<div>
            {getMaxLossTrades.map(getMaxLossTrade => <div className="ticker-info">
                <div style={{display: 'flex'}}>
                    <img className="ticker_logo" src={`https://storage.alorbroker.ru/icon/${getMaxLossTrade?.symbol}.png`} alt={getMaxLossTrade?.symbol}/>
                    <div className="ticker_name">
                        <div className="ticker_name_title">{getMaxLossTrade?.symbol}</div>
                        <div className="ticker_name_description">
                            {moment(getMaxLossTrade?.openDate).format('DD.MM.YYYY HH:mm:ss')}
                        </div>
                    </div>
                </div>
                <div className="ticker_actions">
                    <div className="ticker_name_title" style={{ color: 'rgb( 255,117,132)' }}>{moneyFormat(getMaxLossTrade?.PnL || 0)}</div>
                    <div className="ticker_name_description">на сумму {moneyFormat(getMaxLossTrade?.volume, 0)}</div>
                </div>
            </div>)}
        </div>}
    </div>
}

export default MaxLossTradesWidget;