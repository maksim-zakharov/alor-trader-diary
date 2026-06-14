import React, { useMemo } from 'react';
import moment from 'moment';
import { moneyFormat } from '../../../common/utils';
import TickerImg from '../../../common/TickerImg';
import { useGetSecurityByExchangeAndSymbolQuery } from '../../../api/alor.api';
import { TWChart } from '../../../common/TWChart';
import { getPositionChartVisibleRange, humanize, numberToPercent } from '../../../utils';
import { Side, Trades } from 'alor-api';
import { DiaryPositionCommentInput } from './DiaryTableCellFields';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface PositionDetailsProps {
  /** Строка позиции из таблицы дневника */
  row: Record<string, unknown>;
  /** ISIN по символу для иконки */
  getIsinBySymbol: (symbol: string) => string | undefined;
  /** Комментарий к позиции */
  comment?: string;
  /** Изменение комментария */
  onCommentChange: (value: string) => void;
}

const PositionDetails = ({ row, getIsinBySymbol, comment, onCommentChange }: PositionDetailsProps) => {
  const {
    trades,
    symbol,
    openDate,
    closeDate,
    openPrice,
    closePrice,
    PnL,
    duration,
  } = row as {
    trades: Trades;
    symbol: string;
    openDate: string;
    closeDate?: string;
    openPrice?: number;
    closePrice?: number;
    PnL?: number;
    duration?: number;
  };

  const { data: security } = useGetSecurityByExchangeAndSymbolQuery(
    { symbol, exchange: 'MOEX' },
    { skip: !symbol },
  );

  const digits = useMemo(
    () => (security ? `${security.minstep}`.split('.')[1]?.length : 0),
    [security],
  );

  const visibleRange = useMemo(
    () => getPositionChartVisibleRange(openDate, closeDate),
    [openDate, closeDate],
  );

  const sortedTrades = useMemo(
    () => [...trades].sort((a, b) => a.date.localeCompare(b.date)),
    [trades],
  );

  const durationLabel = duration != null
    ? humanize(moment.duration(duration, 'seconds'))
    : '';

  const pnlValue = PnL ?? 0;

  const markers = useMemo(
    () =>
      sortedTrades.map((trade) => {
        const isBuy = trade.side === Side.Buy || trade.side === 'buy';
        return {
          time: Math.floor(new Date(trade.date).getTime() / 1000),
          price: trade.price,
          type: isBuy ? ('entry' as const) : ('exit' as const),
          text: `${isBuy ? 'Покупка' : 'Продажа'} ${trade.qty}@${trade.price}`,
        };
      }),
    [sortedTrades],
  );

  return (
    <div className="collapsed-row">
      <div className="collapsed-row-chart">
        <TWChart
          key={`${symbol}-${openDate}`}
          ticker={symbol}
          height={420}
          visibleRange={visibleRange}
          markers={markers}
        />
      </div>

      <div className="collapsed-row-panel">
        <div className="position-details-header">
          <div className="position-details-header-main">
            <TickerImg getIsinBySymbol={getIsinBySymbol} symbol={symbol} />
            <span className="position-details-symbol">{symbol}</span>
            <span className={`result ${pnlValue >= 0 ? 'profit' : 'loss'}`}>
              PnL {moneyFormat(pnlValue)}
            </span>
          </div>
        </div>

        <div className="position-details-stats">
          <div className="position-details-stat">{durationLabel}</div>
          <div className="position-details-stat">
            Вход: {moneyFormat(openPrice ?? 0, digits, digits)}
          </div>
          <div className="position-details-stat">
            Выход: {moneyFormat(closePrice ?? 0, digits, digits)}
          </div>
        </div>

        <div className="position-details-comment">
          <DiaryPositionCommentInput
            value={comment}
            onChange={(e) => onCommentChange(e.target.value)}
          />
        </div>

        <div className="collapsed-row-details">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-center">UTC+03:00</TableHead>
                <TableHead className="text-center">Цена</TableHead>
                <TableHead className="text-center">Кол-во</TableHead>
                <TableHead className="text-center">Ком. %</TableHead>
                <TableHead className="text-center">Ком. ₽</TableHead>
                <TableHead className="text-right">Сумма ₽</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedTrades.map((trade) => {
                const isBuy = trade.side === Side.Buy || trade.side === 'buy';
                const commissionPercent = trade.volume
                  ? numberToPercent(trade.commission / trade.volume)
                  : numberToPercent(0);

                return (
                  <TableRow key={trade.id ?? `${trade.date}-${trade.price}`}>
                    <TableCell className="text-center text-xs">
                      {moment(trade.date).format('HH:mm:ss')}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className={isBuy ? 'text-[rgb(var(--table-profit-color))]' : 'text-[rgb(var(--table-loss-color))]'}>
                        {isBuy ? 'Покупка' : 'Продажа'}
                      </div>
                      <div>{moneyFormat(trade.price, digits, digits)}</div>
                    </TableCell>
                    <TableCell className="text-center">{trade.qty}</TableCell>
                    <TableCell className="text-center">{commissionPercent}%</TableCell>
                    <TableCell className="text-center">{moneyFormat(trade.commission)}</TableCell>
                    <TableCell className="text-right">{moneyFormat(trade.volume)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
};

export default PositionDetails;
