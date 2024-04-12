import axios from "axios";
import {useEffect, useState} from "react";

// https://iss.moex.com/iss/engines/stock/markets/shares/boards/ИДЕНТИФИКАТОР/securities.xml?iss.meta=off&iss.only=securities&securities.columns=SECID,LISTLEVEL

const getSiteAdmittedSecs = (): Promise<any[]> => {
    return axios
        .get<any[]>(
            `/iss/engines/stock/markets/shares/boards/TQBR/securities.json?iss.meta=off&iss.only=securities&securities.columns=SECID,LISTLEVEL`,
            {
                baseURL: "https://iss.moex.com",
            },
        )
        .then((res: any) => res.data.securities.data);
}

const useListSecs = () => {

    const [symbolListSecs, setSymbolListSecs] = useState<{[symbol: string]: string | undefined}>({});

    useEffect(() => {
        loadListSections();
    }, [])

    const loadListSections = async () => {
        const result: any[] = await getSiteAdmittedSecs();

        for (let i = 0; i < result.length; i++) {
            const [symbol, listing] = result[i];
            symbolListSecs[symbol] = listing;
        }
        setSymbolListSecs(symbolListSecs);
    };

    const getListSectionBySymbol = (symbol: string) => {
        return symbolListSecs[symbol];
    }

    return {getListSectionBySymbol};
}

export default useListSecs;