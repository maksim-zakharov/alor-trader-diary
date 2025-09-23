import { AlorApi, Exchange } from 'alor-api';
import { catchError, from, map, mergeMap, Observable, pluck, retryWhen, shareReplay, throwError, timer } from 'rxjs';
import { PeriodParams, ResolutionString } from '../assets/charting_library';

export class DataService {
  private serverTimeCache$: Observable<any>;

  constructor(public readonly alorApi: AlorApi) {
  }

  get serverTime$() {
    if (!this.serverTimeCache$) {
      this.serverTimeCache$ = from(this.alorApi.http.get(`https://api.alor.ru/md/v2/time`)).pipe(
        pluck('data'),
        shareReplay({ bufferSize: 1, refCount: true }),
      );
    }
    return this.serverTimeCache$;
  }

  getSymbol(symbol: string) {
    if (symbol.includes('_xp')) {
      return Promise.resolve({
        symbol: symbol,
        exchange: 'XPBEE',
        currency: 'USDT',
        minstep: 0.001,
        type: '',
      });
    }
    if (symbol.includes(':')) {
      const exchange = symbol.split(':')[0];

      return Promise.resolve({
        symbol: symbol,
        exchange,
        currency: 'USDT',
        minstep: 0.0001,
        type: '',
      });
    }

    return this.alorApi.instruments.getSecurityByExchangeAndSymbol({
      symbol: symbol,
      exchange: Exchange.MOEX,
      format: 'Simple',
    });
  }

  getChartData(ticker: string, resolution: ResolutionString, periodParams: PeriodParams) {
    let request$;
    request$ = from(
        this.alorApi.instruments.getHistory({
          symbol: ticker,
          exchange: 'MOEX',
          from: Math.max(periodParams.from, 0),
          to: Math.max(periodParams.to, 1),
          tf: this.parseTimeframe(resolution),
          countBack: periodParams.countBack,
        }),
    );

    return request$.pipe(
      retryWhen((errors) =>
        errors.pipe(
          mergeMap((error, attempt) => {
            // Можно добавить логирование ошибок
            console.warn(`Attempt ${attempt + 1} failed:`, error.message);

            // Если превышено максимальное количество попыток, пробрасываем ошибку
            // if (attempt >= 10) {
            //   // Максимум 10 попыток
            //   return throwError(() => error);
            // }

            // Ретраим каждые 5 секунд
            return timer(5000);
          }),
        ),
      ),
    );
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
