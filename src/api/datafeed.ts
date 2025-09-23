import {
  Bar,
  DatafeedConfiguration,
  DatafeedErrorCallback,
  DOMCallback,
  HistoryCallback,
  IBasicDataFeed,
  LibrarySymbolInfo,
  OnReadyCallback,
  PeriodParams,
  ResolutionString,
  ResolveCallback,
  SearchSymbolsCallback,
  ServerTimeCallback,
  SubscribeBarsCallback,
  SymbolResolveExtension,
} from '../assets/charting_library';
import { AlorApi, Format, HistoryObject } from 'alor-api';
import { getPrecision } from '../common/utils';
import { DataService } from './data.service';

const resolveOneSymbol = ({ dataService, symbolName }: { dataService: DataService; symbolName: string }) => {
  const exist = localStorage.getItem(`LibrarySymbolInfo-${symbolName}`);
  if (exist) {
    return Promise.resolve(JSON.parse(exist));
  }

  return dataService.getSymbol(symbolName).then((r) => {
    const precision = getPrecision(r.minstep);
    const priceScale = Number((10 ** precision).toFixed(precision));

    const resolve: LibrarySymbolInfo = {
      name: r.shortname,
      ticker: r.symbol,
      description: r.description,
      exchange: r.exchange,
      listed_exchange: r.exchange,
      currency_code: r.currency,
      minmov: Math.round(r.minstep * priceScale),
      pricescale: priceScale,
      format: 'price',
      type: r.type ?? '',
      has_empty_bars: false,
      has_intraday: true,
      has_seconds: true,
      has_weekly_and_monthly: true,
      weekly_multipliers: ['1', '2'],
      monthly_multipliers: ['1', '3', '6', '12'],
      timezone: 'Europe/Moscow',
      session: '0700-0000,0000-0200:1234567',
    };

    localStorage.setItem(`LibrarySymbolInfo-${symbolName}`, JSON.stringify(resolve));

    return resolve;
  });
};

export class DataFeed implements IBasicDataFeed {
  private readonly subscriptions = new Map<string, any[]>();
  private readonly api: AlorApi;
  private readonly dataService: DataService;
  private readonly data?: HistoryObject[];

  constructor(options: {
    data?: HistoryObject[];
    dataService: DataService;
  }) {
    this.api = options.dataService.alorApi;
    this.dataService = options.dataService;
    this.data = options.data;
  }

  getServerTime?(callback: ServerTimeCallback): void {
    this.dataService.serverTime$.subscribe(callback);
  }
  searchSymbols(userInput: string, exchange: string, symbolType: string, onResult: SearchSymbolsCallback): void {
    this.api.instruments
      .getSecurities({
        query: userInput.split('/')[0],
        format: 'Simple',
        exchange: exchange as any,
      })
      .then((results) => {
        const mapped = results.map((x) => ({
          symbol: x.symbol,
          exchange: x.exchange,
          ticker: `[${x.exchange}:${x.symbol}]`,
          description: x.description,
          type: '',
        }));

        const pref = results.find((r) => r.symbol.includes(`${userInput.split('/')[0]}P`));

        if (results.length && pref) {
          mapped.unshift({
            symbol: `${userInput.split('/')[0]}/${userInput.split('/')[0]}P`,
            exchange: results[0].exchange,
            ticker: `[${userInput.split('/')[0]}/${userInput.split('/')[0]}P]`,
            description: `${results[0].description}/${pref.description}`,
            type: '',
          });
        }

        return onResult(mapped);
      });
  }
  resolveSymbol(symbolName: string, onResolve: ResolveCallback, onError: DatafeedErrorCallback, extension?: SymbolResolveExtension): void {
    const isSentetic = symbolName.includes('/');
    if (!isSentetic) {
      resolveOneSymbol({
        dataService: this.dataService,
        symbolName,
      }).then(onResolve);
    } else {
      const exist = localStorage.getItem(`LibrarySymbolInfo-${symbolName}`);
      if (exist) {
        onResolve(JSON.parse(exist));
        return;
      }
      const parts = symbolName.split('/');
      Promise.all(parts.map((part) => this.dataService.getSymbol(part))).then((instruments) => {
        const obj = instruments.reduce(
          (acc, curr) =>
            ({
              name: acc.name ? `${acc.name}/${curr.symbol}` : curr.symbol,
              ticker: acc.ticker ? `${acc.ticker}/${curr.symbol}` : curr.symbol,
              description: acc.description ? `${acc.description}/${curr.symbol}` : curr.symbol,
              exchange: acc.exchange || curr.exchange,
              listed_exchange: acc.exchange || curr.exchange,
              currency_code: acc.currency_code || curr.currency,
              minstep: 0.00001, // Math.min(acc.minstep, curr.minstep),
              type: acc.type || curr.type,
            }) as Partial<LibrarySymbolInfo>,
          {
            name: '',
            ticker: '',
            description: '',
            exchange: '',
            listed_exchange: '',
            currency_code: '',
            minstep: Infinity,
            type: '',
          } as any,
        );

        const precision = getPrecision(obj.minstep);
        const priceScale = Number((10 ** 5).toFixed(5));

        const resolve: LibrarySymbolInfo = {
          ...obj,
          minmov: 100, // Math.round(obj.minstep * priceScale),
          pricescale: priceScale,
          format: 'price',
          has_empty_bars: false,
          has_intraday: true,
          has_seconds: true,
          has_weekly_and_monthly: true,
          weekly_multipliers: ['1', '2'],
          monthly_multipliers: ['1', '3', '6', '12'],
          timezone: 'Europe/Moscow',
          session: '0700-0000,0000-0200:1234567',
        };

        onResolve(resolve);

        localStorage.setItem(`LibrarySymbolInfo-${symbolName}`, JSON.stringify(resolve));
      });
    }
  }
  getBars(
    symbolInfo: LibrarySymbolInfo,
    resolution: ResolutionString,
    periodParams: PeriodParams,
    onResult: HistoryCallback,
    onError: DatafeedErrorCallback,
  ): void {
    if (this.data) {
      onResult(
        this.data.map(
          (x) =>
            ({
              ...x,
              time: x.time * 1000,
            }) as Bar,
        ),
      );
      return;
    }
    const isSentetic = symbolInfo.ticker.includes('/');
    if (!isSentetic) {
      this.dataService.getChartData(symbolInfo.ticker, resolution, periodParams).subscribe((res) => {
        const dataIsEmpty = res.history.length === 0;

        const nextTime = periodParams.firstDataRequest ? res.next : res.prev;
        onResult(
          res.history.map(
            (x) =>
              ({
                ...x,
                time: x.time * 1000,
              }) as Bar,
          ),
          {
            noData: dataIsEmpty,
            nextTime: dataIsEmpty ? nextTime : undefined,
          },
        );
      });
    }
  }
  subscribeBars(
    symbolInfo: LibrarySymbolInfo,
    resolution: ResolutionString,
    onTick: SubscribeBarsCallback,
    listenerGuid: string,
    onResetCacheNeededCallback: () => void,
  ): void {
    const secondProm = async (symbol: string, callback) => {
      const isForex = symbol.includes('_xp');
      // TODO Сделать отписки
      if (isForex) {
        return this.dataService.ctraderSubscribeCandles(symbol, resolution).subscribe((data) => {
          callback(data);
        });
        // TODO BYBIT крипо работают свечи в целом
      } else if (symbol.includes('BYBIT')) {
        this.dataService.bybitSubscribeCandles(symbol.split('BYBIT:')[1], resolution).subscribe((data) => {
          callback(data);
        });

        return () => this.dataService.bybitUnsubscribeCandles(symbol.split('BYBIT:')[1], resolution);
      } else if (symbol.includes('BINGX')) {
        this.dataService.bingxSubscribeCandles(symbol.split('BINGX:')[1], resolution).subscribe((data) => {
          callback(data);
        });

        return () => this.dataService.bingxUnsubscribeCandles(symbol.split('BINGX:')[1], resolution);
      } else if (symbol.includes('GATE')) {
        this.dataService.gateSubscribeCandles(symbol.split('GATE:')[1], resolution).subscribe((data) => {
          callback(data);
        });

        return () => this.dataService.gateUnsubscribeCandles(symbol.split('GATE:')[1], resolution);
        // TODO Сделать отписки для спота
      } else if (symbol.includes('MEXC')) {
        this.dataService.mexcSubscribeCandles(symbol.split('MEXC:')[1], resolution).subscribe((data) => {
          callback(data);
        });

        return () => this.dataService.mexcUnsubscribeCandles(symbol.split('MEXC:')[1], resolution);
        // TODO Сделать отписки
      } else if (symbol.includes('FINAM')) {
        return this.dataService.finamSubscribeCandles(symbol.split('FINAM:')[1], resolution).subscribe((data) => {
          callback(data);
        });
      } else if (symbol.includes('KUCOIN')) {
        this.dataService.kucoinSubscribeCandles(symbol.split('KUCOIN:')[1], resolution).subscribe((data) => {
          callback(data);
        });
        return () => this.dataService.kucoinUnsubscribeCandles(symbol.split('KUCOIN:')[1], resolution);
      } else {
        return this.api.subscriptions.candles(
          {
            code: symbol,
            exchange: symbolInfo.exchange,
            format: Format.Simple,
            tf: this.parseTimeframe(resolution),
          },
          (data) => callback(data),
        );
      }
    };

    const parts = symbolInfo.ticker.split('/');
    if (parts.length === 1) {
      secondProm(parts[0], (data) => onTick({ ...data, time: data.time * 1000 } as Bar)).then((unsubs) =>
        this.subscriptions.set(listenerGuid, [unsubs]),
      );
    }
  }
  unsubscribeBars(listenerGuid: string): void {
    this.subscriptions.get(listenerGuid)?.forEach((c) => c());
    this.subscriptions.delete(listenerGuid);
  }
  subscribeDepth?(symbol: string, callback: DOMCallback): string {
    throw new Error('Method not implemented.');
  }
  unsubscribeDepth?(subscriberUID: string): void {
    throw new Error('Method not implemented.');
  }
  getVolumeProfileResolutionForPeriod?(
    currentResolution: ResolutionString,
    from: number,
    to: number,
    symbolInfo: LibrarySymbolInfo,
  ): ResolutionString {
    debugger;
    throw new Error('Method not implemented.');
  }
  onReady(callback: OnReadyCallback): void {
    const config: DatafeedConfiguration = {
      supports_time: true,
      supported_resolutions: this.getSupportedResolutions(),
      exchanges: [].map((x) => ({
        value: x.exchange,
        name: x.exchange,
        desc: x.exchange,
      })),
    };

    setTimeout(() => callback(config), 0);
  }

  private getSupportedResolutions(): ResolutionString[] {
    return [
      '1S' as ResolutionString,
      '5S' as ResolutionString,
      '10S' as ResolutionString,
      '15S' as ResolutionString,
      '30S' as ResolutionString,
      '45S' as ResolutionString,
      '1' as ResolutionString,
      '2' as ResolutionString,
      '3' as ResolutionString,
      '5' as ResolutionString,
      '10' as ResolutionString,
      '15' as ResolutionString,
      '30' as ResolutionString,
      '45' as ResolutionString,
      '1H' as ResolutionString,
      '2H' as ResolutionString,
      '3H' as ResolutionString,
      '4h' as ResolutionString,
      '1D' as ResolutionString,
      '1W' as ResolutionString,
      '2W' as ResolutionString,
      '1M' as ResolutionString,
      '3M' as ResolutionString,
      '6M' as ResolutionString,
      '12M' as ResolutionString,
    ];
  }

  private parseTimeframe(resolution: ResolutionString): string {
    const code = resolution.slice(-1);
    if (['D', 'W', 'M', 'Y'].includes(code)) {
      return resolution;
    }

    const count = Number(resolution.substring(0, resolution.length - 1));

    if (code === 'S') {
      return count.toString();
    }

    if (code === 'H') {
      return (count * 60 * 60).toString();
    }

    // resolution contains minutes
    return (Number(resolution) * 60).toString();
  }
}
