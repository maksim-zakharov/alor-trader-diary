import React, { ChangeEventHandler, FC, useMemo } from 'react';
import { ArrowDownOutlined, ArrowUpOutlined, RetweetOutlined } from '@ant-design/icons';
import moment from 'moment/moment';
import { selectOptions } from '../../../App';
import { moneyFormat, shortNumberFormat } from '../../../common/utils';
import { humanize, numberToPercent } from '../../../utils';
import ASelect from '../../../common/Select';
import { Input } from 'antd';
import { SelectProps } from 'antd';
import { useAppSelector } from '../../../store';
import { selectCurrentPortfolio } from '../../../api/alor.slice';
import { DataTable, DataTableColumn } from '@/uikit/DataTable';
import PositionDetails from './PositionDetails';

interface DiaryPositionRow {
  id: string;
  type?: string;
  symbol?: string;
  openDate?: string;
  side?: string;
  PnLPercent?: number;
  PnL?: number;
  volume?: number;
  openVolume?: number;
  closeVolume?: number;
  Fee?: number;
  [key: string]: unknown;
}

interface DiaryPositionsTableProps {
  /** Позиции для отображения */
  positions: DiaryPositionRow[];
  /** Загрузка данных */
  isLoading: boolean;
  /** Мобильный режим */
  isMobile: number;
  /** Эшелон по символу */
  getListSectionBySymbol: (symbol: string) => string | undefined;
  /** Копирование тикера */
  onCopyTicker: (symbol: string) => void;
  /** Причины сделок */
  reasons: Record<string, string>;
  /** Обновление причины */
  onReasonChange: (positionId: string, value: string) => void;
  /** Комментарии */
  comments: Record<string, string>;
  /** Обновление комментария */
  onCommentChange: (positionId: string, value: string) => void;
  /** Скрытие объёма в деньгах / лотах */
  hidenMap: Record<string, boolean>;
  /** Переключение отображения объёма */
  onToggleVolumeView: (rowId: string) => void;
  /** Тёмная тема */
  nightMode: boolean;
}

const DiaryPositionsTable: FC<DiaryPositionsTableProps> = ({
  positions,
  isLoading,
  isMobile,
  getListSectionBySymbol,
  onCopyTicker,
  reasons,
  onReasonChange,
  comments,
  onCommentChange,
  hidenMap,
  onToggleVolumeView,
  nightMode,
}) => {
  const currentPortfolio = useAppSelector(selectCurrentPortfolio);

  const selectProps = (position: DiaryPositionRow): SelectProps => ({
    value: reasons[position.id],
    defaultValue: reasons[position.id],
    options: selectOptions,
    onSelect: (value) => onReasonChange(position.id, String(value)),
  });

  const inputProps = (position: DiaryPositionRow) => {
    const onChange: ChangeEventHandler<HTMLInputElement> = (e) => {
      onCommentChange(position.id, e.target.value);
    };

    return {
      value: comments[position.id],
      defaultValue: comments[position.id],
      onChange,
    };
  };

  const renderVolume = (row: DiaryPositionRow) => {
    if (row.type === 'summary') {
      return shortNumberFormat(row.volume, 0, 2);
    }

    if (!hidenMap[row.id]) {
      return (
        <>
          {shortNumberFormat(row.openVolume, 0, 2)} / {shortNumberFormat(row.closeVolume, 0, 2)}{' '}
          <RetweetOutlined style={{ cursor: 'pointer' }} onClick={() => onToggleVolumeView(row.id)} />
        </>
      );
    }

    return (
      <>
        {moneyFormat(row.openVolume, 0)} / {moneyFormat(row.closeVolume, 0)}{' '}
        <RetweetOutlined style={{ cursor: 'pointer' }} onClick={() => onToggleVolumeView(row.id)} />
      </>
    );
  };

  const columns = useMemo(() => {
    const allColumns: (DataTableColumn<DiaryPositionRow> | false)[] = [
      {
        key: 'symbol',
        title: 'Тикер',
        dataIndex: 'symbol',
        width: 60,
        align: 'center',
        render: (_, row) =>
          row.type !== 'summary' && (
            <span
              className="link-color cursor-pointer"
              onClick={() => onCopyTicker(String(row.symbol))}
            >
              ${row.symbol}
            </span>
          ),
      },
      {
        key: 'openDate',
        title: 'Время открытия',
        dataIndex: 'openDate',
        width: 160,
        align: 'center',
        render: (_, row) =>
          row.type !== 'summary'
            ? moment(row.openDate).format('HH:mm:ss')
            : moment(row.openDate).format('DD.MM.YYYY'),
      },
      currentPortfolio?.marketType === 'FOND' && {
        key: 'listSection',
        title: 'Эшелон',
        dataIndex: 'symbol',
        width: 70,
        align: 'center',
        render: (_, row) =>
          row.type !== 'summary' && (getListSectionBySymbol(String(row.symbol)) || 'Not found'),
      },
      {
        key: 'duration',
        title: 'Длительность',
        dataIndex: 'duration',
        width: 230,
        align: 'center',
        render: (_, row) => row.type !== 'summary' && humanize(moment.duration(_, 'seconds')),
      },
      {
        key: 'side',
        title: 'L/S',
        dataIndex: 'side',
        align: 'center',
        render: (_, row) =>
          row.type !== 'summary' && (row.side === 'sell' ? <ArrowDownOutlined /> : <ArrowUpOutlined />),
      },
      {
        key: 'PnLPercent',
        title: 'PnL %',
        dataIndex: 'PnLPercent',
        align: 'center',
        render: (val: number, row) => row.type !== 'summary' && `${numberToPercent(val)}%`,
      },
      {
        key: 'PnL',
        title: 'PnL',
        dataIndex: 'PnL',
        align: 'center',
        onCell: (record) => ({
          className: record.type !== 'summary' ? (record.PnL > 0 ? 'profit' : 'loss') : undefined,
          style: { textAlign: 'center' },
        }),
        render: (val, row) =>
          row.type !== 'summary' ? moneyFormat(val as number) : <strong>{moneyFormat(val as number)}</strong>,
      },
      {
        key: 'volume',
        title: 'Объем',
        dataIndex: 'volume',
        align: 'center',
        render: (_, row) =>
          row.type !== 'summary' ? renderVolume(row) : <strong>{renderVolume(row)}</strong>,
      },
      {
        key: 'Fee',
        title: 'Комиссия',
        dataIndex: 'Fee',
        align: 'center',
        render: (val: number, row) =>
          `${moneyFormat(val)} ${
            row.type !== 'summary'
              ? `(${((val * 100) / ((row.openVolume as number) + (row.closeVolume as number))).toFixed(3)}%)`
              : ''
          }`,
      },
      {
        key: 'reason',
        title: 'Причина',
        dataIndex: 'reason',
        width: 200,
        render: (_, row) =>
          row.type !== 'summary' && (
            <ASelect
              key={`${row.id}-reason-select`}
              size="small"
              style={{ width: '180px' }}
              allowClear
              placeholder="Выберите причину..."
              {...selectProps(row)}
            />
          ),
      },
      {
        key: 'comment',
        title: 'Комментарий',
        dataIndex: 'comment',
        render: (_, row) =>
          row.type !== 'summary' && (
            <Input
              key={`${row.id}-comment-input`}
              size="small"
              allowClear
              placeholder="Добавьте комментарий..."
              {...inputProps(row)}
            />
          ),
      },
    ];

    return allColumns.filter(
      (column) =>
        !!column &&
        (!isMobile || !['comment', 'reason', 'side', 'PnLPercent', 'Fee'].includes(column.dataIndex ?? column.key)),
    ) as DataTableColumn<DiaryPositionRow>[];
  }, [
    isMobile,
    hidenMap,
    currentPortfolio,
    reasons,
    comments,
    getListSectionBySymbol,
    onCopyTicker,
    onReasonChange,
    onCommentChange,
    onToggleVolumeView,
  ]);

  return (
    <DataTable
      className="DesktopPositions"
      rowKey="id"
      columns={columns}
      data={positions}
      loading={isLoading}
      onRow={(row) =>
        row.type === 'summary' ? { className: row.PnL > 0 ? 'profit' : 'loss' } : undefined
      }
      expandable={{
        expandedRowRender: (row) => <PositionDetails row={row} nightMode={nightMode} />,
        rowExpandable: (row) => row.type !== 'summary',
        defaultExpandedRowKeys: ['0'],
      }}
    />
  );
};

export default DiaryPositionsTable;
