import React, { useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';
import { ru as ruDayPicker } from 'react-day-picker/locale';
import { CalendarIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { buttonVariants } from '@/components/ui/button';
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
 * Выбор даты начала периода на shadcn/ui Calendar + Popover.
 */
export function DiaryDatePicker({ value, onChange, compact = false, className }: DiaryDatePickerProps) {
  const [open, setOpen] = useState(false);

  const selectedDate = useMemo(() => {
    if (!value) {
      return undefined;
    }

    return parseISO(value);
  }, [value]);

  const formattedDate = useMemo(() => {
    if (!selectedDate) {
      return 'Выберите дату';
    }

    return format(selectedDate, 'dd.MM.yyyy', { locale: ru });
  }, [selectedDate]);

  const handleSelect = (date: Date | undefined) => {
    if (!date) {
      return;
    }

    onChange(format(date, 'yyyy-MM-dd'));
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen} modal={false}>
      <PopoverTrigger
        className={cn(
          buttonVariants({ variant: 'outline', size: compact ? 'xs' : 'sm' }),
          compact ? 'h-auto min-w-0 border-0 bg-transparent px-0 py-0 font-normal shadow-none hover:bg-transparent' : 'w-[120px] justify-start px-2.5 font-normal',
          className,
        )}
      >
        {compact ? (
          <span className="text-[13px] text-muted-foreground">от {formattedDate}</span>
        ) : (
          <>
            <CalendarIcon data-icon="inline-start" />
            {formattedDate}
          </>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-auto border-0 bg-[#333537] p-0 ring-foreground/10" align="start">
        <Calendar
          mode="single"
          locale={ruDayPicker}
          selected={selectedDate}
          onSelect={handleSelect}
          defaultMonth={selectedDate}
          captionLayout="dropdown"
        />
      </PopoverContent>
    </Popover>
  );
}
