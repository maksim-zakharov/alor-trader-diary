import React, { useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';
import { DatePicker } from '@/components/ui/DatePicker';
import { cn } from '@/lib/utils';

interface DiaryDatePickerProps {
  /** Дата начала периода в формате YYYY-MM-DD */
  value: string;
  /** Обработчик смены даты */
  onChange: (value: string) => void;
  /** Компактный вид для мобильной карусели */
  compact?: boolean;
  /** Дополнительные классы триггера */
  className?: string;
}

/**
 * Выбор даты начала периода — DatePicker / Calendar как в smartmoney-client.
 */
export function DiaryDatePicker({ value, onChange, compact = false, className }: DiaryDatePickerProps) {
  const selectedDate = useMemo(() => {
    if (!value) {
      return undefined;
    }

    return parseISO(value);
  }, [value]);

  return (
    <DatePicker
      value={selectedDate}
      onChange={(date) => {
        if (!date) {
          return;
        }
        onChange(format(date, 'yyyy-MM-dd'));
      }}
      size="sm"
      locale="ru-RU"
      formatValue={(date) => {
        const formatted = format(date, 'dd.MM.yyyy', { locale: ru });
        return compact ? `от ${formatted}` : formatted;
      }}
      hideCalendarIcon={compact}
      hideChevron={compact}
      className={cn(
        compact
          ? 'h-auto min-w-0 w-auto border-0 bg-transparent px-0 py-0 font-normal shadow-none hover:bg-transparent'
          : 'w-[140px]',
        className,
      )}
    />
  );
}
