import useWindowDimensions from "../common/useWindowDimensions";
import TTitle from "../common/TTitle";
import React from "react";
import {useGetPublicOfferingQuery} from "../api/alor.api";
import moment from "moment";
import MobileSearch from "./Diary/components/MobileSearch";

const WhatBuy = ({getIsinBySymbol}) => {
    const {isMobile} = useWindowDimensions();

    const {data} = useGetPublicOfferingQuery({
        category: 'current'
    });

    const offers = data?.list || [];

    return <>
        <TTitle isMobile={isMobile}>Что купить</TTitle>
        <MobileSearch getIsinBySymbol={getIsinBySymbol}/>

        <div className="pad-lr">
            <h3 style={{marginTop: 0}}>Сейчас размещаются</h3>
            <div className="ipo-container">
                {offers.map((offer) => <div className="ipo-card" key={offer.issuer}>
                    <img src={`https://storage.alorbroker.ru/${offer.logo}`} alt={offer.issuer}/>
                    <div>
                        <span
                            className="date">До {moment(offer.collectApplicationDateTo).format('LL').split(',')[0].toLowerCase()}</span>
                        <h4>
                            {offer.type === 'bond' ? 'Облигации' : 'Акции'}
                        </h4>
                        <h4>
                            {offer.issuer}
                        </h4>

                        <span className="desc">Заработать более {Math.floor(offer.potentialYield)}% на повышенной ключевой ставке</span>
                    </div>
                </div>)}
            </div>
        </div>
    </>
}

export default WhatBuy;