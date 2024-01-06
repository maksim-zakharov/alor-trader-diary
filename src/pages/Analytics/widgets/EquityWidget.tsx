import Spinner from "../../../common/Spinner";
import TVChart from "../../../common/TVChart";
import React from "react";

const EquityWidget = ({data, isLoading, colors}) => {
    return <div className="widget" style={{height: 460, width: '100%'}}>
        <div className="widget_header">Equity</div>
        {isLoading ? <Spinner/> :<TVChart colors={colors} seriesType="baseLine" data={data} formatTime="ll"/>}
    </div>
}

export default EquityWidget;