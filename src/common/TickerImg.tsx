import React, {useEffect} from "react";

const TickerImg = ({symbol, getIsinBySymbol}) => {

    const key = `logoSrc-${symbol}`;

    const [logoSrc, setLogoSrc] = React.useState<string>(localStorage.getItem(key) || `https://invest-brands.cdn-tinkoff.ru/${getIsinBySymbol(symbol)}x160.png`);

    const changeSrc = (src: string) => {
        localStorage.setItem(key, src);
        setLogoSrc(src)
    }

    return <img className="ticker_logo" src={logoSrc}
         onError={({ currentTarget }) => {
             currentTarget.onerror = null; // prevents looping
             changeSrc(`https://storage.alorbroker.ru/icon/${symbol}.png`)
             // currentTarget.src=`https://storage.alorbroker.ru/icon/${symbol}.png`;
         }}
         alt={symbol}/>
}

export default TickerImg;