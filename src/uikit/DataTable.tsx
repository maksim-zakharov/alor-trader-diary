import React, { useMemo, useState } from 'react';
import { ChevronDownIcon, ChevronRightIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible';
import Spinner from '@/common/Spinner';

/** Выравнивание содержимого колонки */
export type DataTableAlign = 'left' | 'center' | 'right';

/** Описание колонки таблицы */
export interface DataTableColumn<T> {
  /** Уникальный ключ колонки */
  key: string;
  /** Заголовок колонки */
  title: React.ReactNode;
  /** Поле строки для значения по умолчанию */
  dataIndex?: string;
  /** Ширина колонки */
  width?: number | string;
  /** Выравнивание */
  align?: DataTableAlign;
  /** Кастомный рендер ячейки */
  render?: (value: unknown, row: T, index: number) => React.ReactNode;
  /** Дополнительные атрибуты ячейки */
  onCell?: (row: T, index: number) => { className?: string; style?: React.CSSProperties };
}

/** Настройки раскрывающихся строк */
export interface DataTableExpandable<T> {
  /** Контент раскрытой строки */
  expandedRowRender: (row: T) => React.ReactNode;
  /** Можно ли раскрыть строку */
  rowExpandable?: (row: T) => boolean;
  /** Ключи строк, раскрытых по умолчанию */
  defaultExpandedRowKeys?: string[];
}

/** Пропсы китовой таблицы */
export interface DataTableProps<T extends Record<string, unknown>> {
  /** Колонки */
  columns: DataTableColumn<T>[];
  /** Данные */
  data: T[];
  /** Ключ строки */
  rowKey: keyof T | ((row: T) => string);
  /** Состояние загрузки */
  loading?: boolean;
  /** CSS-класс контейнера */
  className?: string;
  /** Атрибуты строки */
  onRow?: (row: T) => { className?: string } | undefined;
  /** Раскрывающиеся строки */
  expandable?: DataTableExpandable<T>;
}

const alignClassName: Record<DataTableAlign, string> = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
};

function getRowKey<T extends Record<string, unknown>>(
  row: T,
  rowKey: keyof T | ((row: T) => string),
): string {
  if (typeof rowKey === 'function') {
    return rowKey(row);
  }

  return String(row[rowKey]);
}

function getCellValue<T extends Record<string, unknown>>(row: T, dataIndex?: string): unknown {
  if (!dataIndex) {
    return undefined;
  }

  return row[dataIndex];
}

/**
 * Китовая таблица на базе shadcn/ui.
 */
export function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  rowKey,
  loading = false,
  className,
  onRow,
  expandable,
}: DataTableProps<T>) {
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(
    () => new Set(expandable?.defaultExpandedRowKeys ?? []),
  );

  const hasExpandColumn = useMemo(
    () => Boolean(expandable && data.some((row) => expandable.rowExpandable?.(row) ?? true)),
    [data, expandable],
  );

  const toggleExpanded = (key: string) => {
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  return (
    <div className={cn('relative w-full', className)}>
      {loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/60">
          <Spinner />
        </div>
      )}
      <Table>
        <TableHeader>
          <TableRow>
            {hasExpandColumn && <TableHead className="w-8" />}
            {columns.map((column) => (
              <TableHead
                key={column.key}
                className={cn(alignClassName[column.align ?? 'left'])}
                style={column.width ? { width: column.width } : undefined}
              >
                {column.title}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row, rowIndex) => {
            const key = getRowKey(row, rowKey);
            const rowProps = onRow?.(row);
            const canExpand = expandable ? (expandable.rowExpandable?.(row) ?? true) : false;
            const isExpanded = expandedKeys.has(key);

            return (
              <React.Fragment key={key}>
                <TableRow className={rowProps?.className}>
                  {hasExpandColumn && (
                    <TableCell className="w-8 p-1">
                      {canExpand ? (
                        <button
                          type="button"
                          aria-expanded={isExpanded}
                          aria-label={isExpanded ? 'Свернуть строку' : 'Развернуть строку'}
                          className="inline-flex size-6 items-center justify-center rounded-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                          onClick={() => toggleExpanded(key)}
                        >
                          {isExpanded ? <ChevronDownIcon /> : <ChevronRightIcon />}
                        </button>
                      ) : null}
                    </TableCell>
                  )}
                  {columns.map((column) => {
                    const value = getCellValue(row, column.dataIndex);
                    const cellProps = column.onCell?.(row, rowIndex);

                    return (
                      <TableCell
                        key={column.key}
                        className={cn(alignClassName[column.align ?? 'left'], cellProps?.className)}
                        style={cellProps?.style}
                      >
                        {column.render ? column.render(value, row, rowIndex) : (value as React.ReactNode)}
                      </TableCell>
                    );
                  })}
                </TableRow>
                {canExpand && expandable && (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={columns.length + 1} className="p-0">
                      <Collapsible open={isExpanded}>
                        <CollapsibleContent>
                          {isExpanded ? expandable.expandedRowRender(row) : null}
                        </CollapsibleContent>
                      </Collapsible>
                    </TableCell>
                  </TableRow>
                )}
              </React.Fragment>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
