import React, {FC, useEffect, useMemo} from "react";
import {resolveTinkoffInstrumentIconKey} from "./resolveTinkoffInstrumentIconKey";

const TickerImg: FC<{symbol: string, getIsinBySymbol: any, board?: string}> = ({symbol, getIsinBySymbol, board}) => {

    const key = `logoSrc-${symbol}`;

    const mappedIconKey = useMemo(() => resolveTinkoffInstrumentIconKey(symbol), [symbol]);

    const tinkoffIconKey = useMemo(() => {
        if (mappedIconKey) {
            return mappedIconKey;
        }
        return board === 'TQOB' ? 'minfin' : getIsinBySymbol(symbol) || symbol;
    }, [mappedIconKey, board, getIsinBySymbol, symbol]);

    const bksIdentifier = getIsinBySymbol(symbol) || symbol.split('-')[0] || symbol;
    const bksUrl = `https://mybroker.storage.bcs.ru/FinInstrumentLogo/${bksIdentifier}.png`;
    const tinkoffUrl = `https://invest-brands.cdn-tinkoff.ru/${tinkoffIconKey}x160.png`;
    const alorUrl = `https://storage.alorbroker.ru/icon/${symbol}.png`;

    const [logoSrc, setLogoSrc] = React.useState<string>(mappedIconKey ? tinkoffUrl : bksUrl);
    // const [logoSrc, setLogoSrc] = React.useState<string>(board !== 'TQOB' && localStorage.getItem(key) || `https://invest-brands.cdn-tinkoff.ru/${board === 'TQOB' ? 'minfin' : getIsinBySymbol(symbol)}x160.png`);

    const [placeholder, setPlaceholder] = React.useState<boolean>(false);

    useEffect(() => {
        setPlaceholder(false);
        setLogoSrc(mappedIconKey ? tinkoffUrl : bksUrl);
    }, [symbol, mappedIconKey, tinkoffUrl, bksUrl]);

    const changeSrc = (src: string) => {
        localStorage.setItem(key, src);
        setLogoSrc(src)
    }

    const shortedSymbol = useMemo(() => {
        const base = symbol.split('-')[0].trim() || symbol;
        return base.slice(0, 4);
    }, [symbol]);

    if(placeholder)
    return <div className="ticker_placeholder" key={shortedSymbol}>
        {shortedSymbol}
    </div>

    return <img className="ticker_logo" src={logoSrc}
         onError={({ currentTarget }) => {
             if(logoSrc === alorUrl){
                 currentTarget.onerror = null; // prevents looping
                 setPlaceholder(true);
             }
             if(logoSrc === tinkoffUrl){
                 changeSrc(alorUrl)
             }
             if(logoSrc === bksUrl){
                 changeSrc(tinkoffUrl)
             }
             // currentTarget.src=`https://storage.alorbroker.ru/icon/${symbol}.png`;
         }}
                key={symbol}
         alt={symbol}/>
}

export default TickerImg;