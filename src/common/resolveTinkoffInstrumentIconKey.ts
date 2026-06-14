/** Маппинг базового тикера MOEX → ключ иконки Tinkoff invest-brands (как в smartmoney-client AlorLabel). */
const ICON_MAP: Record<string, string> = {
  GOLD: 'GoldFut2',
  SILV: 'SilverFut',
  NG: 'NG',
  SILVER: 'SilverFut',
  BR: 'OilFut',
  PLD: 'Palladium',
  PLT: 'Platinum',
  UCNY: 'USDCNY',
  CNY: 'CNYRUR',
  CNYRUBF: 'CNYRUR',
  SI: 'USD1',
  ED: 'EURUSD3',
  EU: 'EUR1',
  Eu: 'EUR1',
  RUB: 'ruble',
  GLDRUBF: 'GoldFut2',
  RGBIF: 'ruble',
  RGBI: 'ruble',
  NASD: 'NASDAQ100',
  XYZ100: 'NASDAQ100',
};

/**
 * Ключ иконки Tinkoff invest-brands для тикера (в т.ч. фьючерса вида PLD-3.26).
 */
export function resolveTinkoffInstrumentIconKey(symbol: string): string | undefined {
  const base = symbol.split('-')[0].trim();
  return ICON_MAP[base] ?? ICON_MAP[symbol.trim()];
}
