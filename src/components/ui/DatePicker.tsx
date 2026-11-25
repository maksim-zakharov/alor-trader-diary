import React, { useCallback, useRef, useState } from 'react';
import { CalendarIcon, ChevronDownIcon } from 'lucide-react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Calendar } from './calendar';
import { Popover, PopoverContent, PopoverTrigger } from './popover';
import { cn } from '@/lib/utils';

const datePickerTriggerVariants = cva(
  [
    'flex w-full min-w-0 cursor-pointer items-center justify-between gap-2 border border-solid border-input bg-input px-3 py-1',
    'text-left text-foreground outline-none transition-[color,box-shadow,background-color]',
    'hover:bg-bds-gray-ele-border focus-visible:border-primary',
    'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
  ].join(' '),
  {
    variants: {
      size: {
        /** Как Input default — 40px */
        default: 'h-10 rounded-[var(--size-4,4px)] text-sm',
        /** Как Select sm / компактный тулбар — 32px */
        sm: 'h-8 rounded-[var(--size-4,4px)] text-sm',
      },
    },
    defaultVariants: {
      size: 'default',
    },
  },
);

export interface DatePickerProps extends VariantProps<typeof datePickerTriggerVariants> {
  /** Выбранная дата */
  value?: Date;
  /** Смена даты */
  onChange: (date: Date | undefined) => void;
  /** Плейсхолдер, если дата не выбрана */
  placeholder?: string;
  /** Локаль для toLocaleDateString */
  locale?: string;
  /** disabled триггера */
  disabled?: boolean;
  /** className на кнопку-триггер */
  className?: string;
  /** Выравнивание popover */
  align?: 'start' | 'center' | 'end';
  /** id триггера */
  id?: string;
  /** Месяц по умолчанию в календаре */
  defaultMonth?: Date;
  /** Доп. disabled дат в календаре */
  isDateDisabled?: (date: Date) => boolean;
  /** Кастомная подпись выбранной даты */
  formatValue?: (date: Date) => string;
  /** Контролируемое открытие */
  open?: boolean;
  /** Смена открытия */
  onOpenChange?: (open: boolean) => void;
  /** Скрыть иконку календаря в триггере */
  hideCalendarIcon?: boolean;
  /** Скрыть chevron в триггере */
  hideChevron?: boolean;
}

/** Клик по порталу Select не должен закрывать DatePicker. */
function isSelectOverlayTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) {
    return false;
  }
  return Boolean(
    target.closest('[data-slot="select-content"]') || target.closest('[data-radix-select-content]'),
  );
}

/**
 * Выбор одной даты в стиле smartmoney-client: Popover + Calendar (mode=single).
 */
export function DatePicker({
  value,
  onChange,
  placeholder = 'Выберите дату',
  locale = 'ru-RU',
  disabled = false,
  className,
  size = 'default',
  align = 'start',
  id,
  defaultMonth,
  isDateDisabled,
  formatValue,
  open: openProp,
  onOpenChange: onOpenChangeProp,
  hideCalendarIcon = false,
  hideChevron = false,
}: DatePickerProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const isControlled = openProp !== undefined;
  const open = isControlled ? openProp : uncontrolledOpen;

  const setOpen = useCallback(
    (next: boolean) => {
      if (!isControlled) {
        setUncontrolledOpen(next);
      }
      onOpenChangeProp?.(next);
    },
    [isControlled, onOpenChangeProp],
  );

  const hasValue = Boolean(value);
  const label = value
    ? formatValue
      ? formatValue(value)
      : value.toLocaleDateString(locale)
    : placeholder;
  const fallbackMonthRef = useRef(new Date());
  const resolvedDefaultMonth = defaultMonth ?? value ?? fallbackMonthRef.current;

  return (
    <Popover
      open={open}
      modal={false}
      onOpenChange={(next, eventDetails) => {
        if (
          !next &&
          eventDetails.reason === 'outsidePress' &&
          isSelectOverlayTarget(eventDetails.event?.target ?? null)
        ) {
          eventDetails.cancel();
          return;
        }
        setOpen(next);
      }}
    >
      <PopoverTrigger
        id={id}
        disabled={disabled}
        data-slot="date-picker-trigger"
        className={cn(
          datePickerTriggerVariants({ size }),
          !hasValue && 'text-[color:var(--placeholder)]',
          className,
        )}
      >
        <span className="flex min-w-0 items-center gap-2">
          {!hideCalendarIcon && <CalendarIcon className="size-4 shrink-0 opacity-50" />}
          <span className="truncate">{label}</span>
        </span>
        {!hideChevron && <ChevronDownIcon className="size-4 shrink-0 opacity-50" />}
      </PopoverTrigger>
      <PopoverContent
        className="z-[100] w-auto overflow-hidden border border-border bg-popover p-0 shadow-md ring-0"
        align={align}
      >
        <Calendar
          mode="single"
          captionLayout="dropdown"
          defaultMonth={resolvedDefaultMonth}
          selected={value}
          disabled={isDateDisabled}
          onSelect={(next) => {
            onChange(next);
            if (next) {
              setOpen(false);
            }
          }}
          className="rounded-lg border shadow-sm"
        />
      </PopoverContent>
    </Popover>
  );
}

export { datePickerTriggerVariants };
