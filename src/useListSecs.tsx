import axios from "axios";
import {useEffect, useState} from "react";

// https://iss.moex.com/iss/engines/stock/markets/shares/boards/ИДЕНТИФИКАТОР/securities.xml?iss.meta=off&iss.only=securities&securities.columns=SECID,LISTLEVEL

const getSiteAdmittedSecs = (): Promise<any[]> => {
    return axios
        .get<any[]>(
            `/iss/engines/stock/markets/shares/boards/TQBR/securities.json?iss.meta=off&iss.only=securities&securities.columns=SECID,LISTLEVEL,ISIN`,
            {
                baseURL: "https://iss.moex.com",
            },
        )
        .then((res: any) => res.data.securities.data);
}

const useListSecs = () => {

    const [symbolListSecs, setSymbolListSecs] = useState<{[symbol: string]: string | undefined}>({});
    const [symbolIsinsList, setSymbolIsinsList] = useState<{[symbol: string]: string | undefined}>({});

    useEffect(() => {
        loadListSections();
    }, [])

    const loadListSections = async () => {
        const result: any[] = await getSiteAdmittedSecs();

        for (let i = 0; i < result.length; i++) {
            const [symbol, listing, isin] = result[i];
            symbolListSecs[symbol] = listing;
            symbolIsinsList[symbol] = isin;
        }
        setSymbolListSecs(symbolListSecs);
        setSymbolIsinsList(symbolIsinsList);
    };

    const getListSectionBySymbol = (symbol: string) => {
        return symbolListSecs[symbol];
    }

    const getIsinBySymbol = (symbol: string) => {
        return symbolIsinsList[symbol];
    }

    return {getListSectionBySymbol, getIsinBySymbol};
}

export default useListSecs;