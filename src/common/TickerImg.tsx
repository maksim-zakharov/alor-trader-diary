import React, {FC, useEffect} from "react";

const TickerImg: FC<{symbol: string, getIsinBySymbol: any, board?: string}> = ({symbol, getIsinBySymbol, board}) => {

    const key = `logoSrc-${symbol}`;

    const [logoSrc, setLogoSrc] = React.useState<string>(board !== 'TQOB' && localStorage.getItem(key) || `https://invest-brands.cdn-tinkoff.ru/${board === 'TQOB' ? 'minfin' : getIsinBySymbol(symbol)}x160.png`);

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