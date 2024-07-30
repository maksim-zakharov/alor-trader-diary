import React, {FC, useEffect, useMemo} from "react";

const TickerImg: FC<{symbol: string, getIsinBySymbol: any, board?: string}> = ({symbol, getIsinBySymbol, board}) => {

    const key = `logoSrc-${symbol}`;

    const [logoSrc, setLogoSrc] = React.useState<string>(board !== 'TQOB' && localStorage.getItem(key) || `https://invest-brands.cdn-tinkoff.ru/${board === 'TQOB' ? 'minfin' : getIsinBySymbol(symbol)}x160.png`);

    const [placeholder, setPlaceholder] = React.useState<boolean>(false);

    const changeSrc = (src: string) => {
        localStorage.setItem(key, src);
        setLogoSrc(src)
    }

    const shortedSymbol = useMemo(() => symbol.slice(0, 4), [symbol]);

    if(placeholder)
    return <div className="ticker_placeholder" key={shortedSymbol}>
        {shortedSymbol}
    </div>

    return <img className="ticker_logo" src={logoSrc}
         onError={({ currentTarget }) => {
             if(logoSrc === `https://storage.alorbroker.ru/icon/${symbol}.png`){
                 currentTarget.onerror = null; // prevents looping
                 setPlaceholder(true);
             }
             changeSrc(`https://storage.alorbroker.ru/icon/${symbol}.png`)
             // currentTarget.src=`https://storage.alorbroker.ru/icon/${symbol}.png`;
         }}
                key={symbol}
         alt={symbol}/>
}

export default TickerImg;