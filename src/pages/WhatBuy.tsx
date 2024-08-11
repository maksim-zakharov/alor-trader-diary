import useWindowDimensions from "../common/useWindowDimensions";
import TTitle from "../common/TTitle";
import React from "react";
import {useGetPublicOfferingByIdQuery, useGetPublicOfferingQuery} from "../api/alor.api";
import moment from "moment";
import MobileSearch from "./Diary/components/MobileSearch";
import {useSearchParams} from "react-router-dom";
import {PublicOfferingItem, Type} from "alor-api/dist/services/ClientInfoService/ClientInfoService";
import {Button} from "antd";
import {ShareAltOutlined} from "@ant-design/icons";
import DraggableDrawer from "../common/DraggableDrawerHOC";
import {moneyFormat} from "../common/utils";
import {humanize} from "../utils";

const WhatBuy = ({getIsinBySymbol}) => {
    const {isMobile} = useWindowDimensions();

    const [searchParams, setSearchParams] = useSearchParams();

    const type = searchParams.get('type') as Type;
    const id = searchParams.get('id') as any;

    const {data} = useGetPublicOfferingQuery({
        category: 'current'
    });

    const offers = data?.list || [];

    const {data: offerById} = useGetPublicOfferingByIdQuery({
        type,
        id
    }, {
        skip: !type || !id
    })

    const onSelectOffer = (offer: PublicOfferingItem) => {
        searchParams.set('type', offer.type);
        searchParams.set('id', offer.id.toString());
        setSearchParams(searchParams);
    }

    const hideOffer = () => {
        searchParams.delete('type');
        searchParams.delete('id');
        setSearchParams(searchParams);
    }

    const handleShareButtonClick = (data: Omit<ShareData, 'files'>) => {
        if (navigator.canShare) {
            navigator.share(data)
        }
    }

    return <>
        <TTitle isMobile={isMobile}>Что купить</TTitle>
        <MobileSearch getIsinBySymbol={getIsinBySymbol}/>

        <div className="pad-lr">
            <h3 style={{marginTop: 0}}>Сейчас размещаются</h3>
            <div className="ipo-container">
                {offers.map((offer) => <div className="ipo-card" key={offer.issuer}
                                            onClick={() => onSelectOffer(offer)}>
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

        <DraggableDrawer title="Размещение облигаций" open={offerById && id} placement={isMobile ? "bottom" : "right"}
                         closeIcon={<Button type="link"
                                            onClick={hideOffer}>Закрыть</Button>}
                         onClose={hideOffer}
                         extra={<Button onClick={() => handleShareButtonClick({
                             title: `${offerById?.issuer} | Trading Diary`,
                             text: `${window.location.host}/alor-trader-diary/#`,
                             url: `/alor-trader-diary/#/what_buy?type=${type}&id=${id}`,
                         })} icon={<ShareAltOutlined/>}/>}
        >
            <div className="description-container what-buy-container pad-lr">
                <img src={`https://storage.alorbroker.ru/${offerById?.logo}`} alt={offerById?.issuer}/>

                <div className="title">
                    <div>Облигации</div>
                    <div>{offerById?.issuer}</div>
                </div>

                <div className="status">
                    <div>{new Date(offerById?.collectApplicationDateTo) > new Date() ? 'Сбор поручений' : 'Сбор закончен'}</div>
                    <div>
                        <div>
                            до {moment(offerById?.collectApplicationDateTo).format('LL').split(',')[0].toLowerCase()} {moment(offerById?.collectApplicationDateTo).format('HH:mm')}
                        </div>
                        <span
                            className="description-span">{humanize(moment.duration(moment(offerById?.collectApplicationDateTo).diff(moment(), 'days'), 'days'))}</span>
                    </div>
                </div>

                <h2>{offerById?.potentialYield}%</h2>
                <span className="description-span">Ориентировочная ставка купона</span>

                <h2>{moneyFormat(offerById?.minParticipation, 0, 0)}</h2>
                <span className="description-span">Минимальный размер участия</span>

                <h2>{moment(offerById?.dateIssuance).format('LL').replaceAll(' г.', '')}</h2>
                <span className="description-span">Дата размещения</span>

                <h3>О компании</h3>
                <p dangerouslySetInnerHTML={{__html: offerById?.description}}/>

                <h3>Дополнительно</h3>
                <h4>Срок обращения</h4>
                <p>{offerById?.maturity}.</p>
                <h4>Тип купона</h4>
                <p>{offerById?.couponType === 'var' ? 'Переменный купон' : ''}.</p>
                <h4>Купонный период</h4>
                <p>{offerById?.couponPeriod}.</p>
                {/*<h4>Оферта</h4>*/}
                {/*<p></p>*/}
                {/*<h4>Амортизация</h4>*/}
                {/*<p></p>*/}
                <h4>Возможность отмены</h4>
                <p>До {moment(offerById?.collectApplicationDateTo).format('HH:mm')} мск {moment(offerById?.collectApplicationDateTo).format('LL').split(',')[0].toLowerCase()} поданное поручение может быть отменено. После этого времени Брокер приступает к исполнению поручения.</p>
                <h4>Брокерская комиссия за сделку</h4>
                <p>Брокерская комиссия за сделку составит {offerById?.transactionFee}</p>
                {!offerById?.termsParticipation && <>
                    <h4>Для квалифицированных инвесторов</h4>
                    <p>Участие в размещении доступно только для квалифицированных инвесторов</p>
                </>}
            </div>
        </DraggableDrawer>
    </>
}

export default WhatBuy;