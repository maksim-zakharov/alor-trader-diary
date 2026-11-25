import * as React from 'react';
import { ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import { enUS, ru } from 'date-fns/locale';
import {
  DayButton,
  DayPicker,
  getDefaultClassNames,
  type DropdownProps,
} from 'react-day-picker';

import { cn } from '@/lib/utils';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

/** Стабильные компоненты: DayPicker useMemo зависит от identity props.components. */
function CalendarRoot({
  className,
  rootRef,
  ...props
}: React.ComponentProps<'div'> & {
  rootRef?: React.Ref<HTMLDivElement>;
}) {
  return <div data-slot="calendar" ref={rootRef} className={cn(className)} {...props} />;
}

function CalendarChevron({
  className,
  orientation,
  ...props
}: React.ComponentProps<'svg'> & {
  orientation?: 'left' | 'right' | 'up' | 'down';
}) {
  if (orientation === 'left') {
    return <ChevronLeftIcon className={cn('size-4', className)} {...props} />;
  }

  if (orientation === 'right') {
    return <ChevronRightIcon className={cn('size-4', className)} {...props} />;
  }

  return <ChevronDownIcon className={cn('size-4', className)} {...props} />;
}

function CalendarWeekNumber({ children, ...props }: React.ComponentProps<'td'>) {
  return (
    <td {...props}>
      <div className="flex size-(--cell-size) items-center justify-center text-center">{children}</div>
    </td>
  );
}

/** Месяц/год через Select из кита вместо нативного select react-day-picker. */
function CalendarDropdown({
  options,
  value,
  onChange,
  disabled,
  'aria-label': ariaLabel,
}: DropdownProps) {
  const handleValueChange = (next: string) => {
    if (!onChange) {
      return;
    }
    onChange({
      target: { value: next },
    } as React.ChangeEvent<HTMLSelectElement>);
  };

  return (
    <Select
      value={value != null ? String(value) : undefined}
      onValueChange={handleValueChange}
      disabled={disabled}
    >
      <SelectTrigger
        size="sm"
        aria-label={ariaLabel}
        className="h-8 min-w-0 gap-1 border-input px-2 text-sm font-medium shadow-xs"
      >
        <SelectValue />
      </SelectTrigger>
      {/* Выше Popover RangeDatePicker/DatePicker (z-[100]) */}
      <SelectContent className="z-[110] max-h-60">
        {options?.map((option) => (
          <SelectItem key={option.value} value={String(option.value)} disabled={option.disabled}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  captionLayout = 'label',
  buttonVariant = 'ghost',
  formatters,
  components,
  locale: localeProp,
  weekStartsOn: weekStartsOnProp,
  today: todayProp,
  ...props
}: React.ComponentProps<typeof DayPicker> & {
  buttonVariant?: React.ComponentProps<typeof Button>['variant'];
}) {
  const locale = localeProp ?? ru;
  const weekStartsOn = weekStartsOnProp ?? 1;
  const monthLocaleTag = locale === enUS ? 'en-US' : 'ru-RU';
  // иначе DayPicker каждый рендер ставит new Date() → лишние обновления модификаторов
  const todayRef = React.useRef(todayProp ?? new Date());
  if (todayProp != null) {
    todayRef.current = todayProp;
  }
  const today = todayRef.current;

  const mergedFormatters = React.useMemo(
    () => ({
      formatMonthDropdown: (date: Date) => date.toLocaleString(monthLocaleTag, { month: 'short' }),
      ...formatters,
    }),
    [monthLocaleTag, formatters],
  );

  const mergedClassNames = React.useMemo(() => {
    const defaultClassNames = getDefaultClassNames();
    return {
      root: cn('w-fit', defaultClassNames.root),
      months: cn('relative flex flex-col gap-4 md:flex-row', defaultClassNames.months),
      month: cn('flex w-full flex-col gap-4', defaultClassNames.month),
      nav: cn(
        // иначе absolute nav перехватывает клики по Select месяца/года
        'pointer-events-none absolute inset-x-0 top-0 flex w-full items-center justify-between gap-1',
        defaultClassNames.nav,
      ),
      button_previous: cn(
        buttonVariants({ variant: buttonVariant }),
        'pointer-events-auto size-(--cell-size) p-0 select-none aria-disabled:opacity-50',
        defaultClassNames.button_previous,
      ),
      button_next: cn(
        buttonVariants({ variant: buttonVariant }),
        'pointer-events-auto size-(--cell-size) p-0 select-none aria-disabled:opacity-50',
        defaultClassNames.button_next,
      ),
      month_caption: cn(
        'flex h-(--cell-size) w-full items-center justify-center px-(--cell-size)',
        defaultClassNames.month_caption,
      ),
      dropdowns: cn(
        'flex h-(--cell-size) w-full items-center justify-center gap-1.5 text-sm font-medium',
        defaultClassNames.dropdowns,
      ),
      dropdown_root: cn('relative', defaultClassNames.dropdown_root),
      dropdown: cn(defaultClassNames.dropdown),
      caption_label: cn(
        'font-medium select-none',
        captionLayout === 'label'
          ? 'text-sm'
          : 'flex h-8 items-center gap-1 rounded-md pr-1 pl-2 text-sm [&>svg]:size-3.5 [&>svg]:text-muted-foreground',
        defaultClassNames.caption_label,
      ),
      table: 'w-full border-collapse',
      weekdays: cn('flex', defaultClassNames.weekdays),
      weekday: cn(
        'flex-1 rounded-md text-[0.8rem] font-normal text-muted-foreground select-none',
        defaultClassNames.weekday,
      ),
      week: cn('mt-2 flex w-full', defaultClassNames.week),
      week_number_header: cn('w-(--cell-size) select-none', defaultClassNames.week_number_header),
      week_number: cn(
        'text-[0.8rem] text-muted-foreground select-none',
        defaultClassNames.week_number,
      ),
      day: cn(
        'group/day relative aspect-square h-full w-full p-0 text-center select-none [&:last-child[data-selected=true]_button]:rounded-r-md',
        props.showWeekNumber
          ? '[&:nth-child(2)[data-selected=true]_button]:rounded-l-md'
          : '[&:first-child[data-selected=true]_button]:rounded-l-md',
        defaultClassNames.day,
      ),
      range_start: cn('rounded-l-md bg-accent', defaultClassNames.range_start),
      range_middle: cn('rounded-none', defaultClassNames.range_middle),
      range_end: cn('rounded-r-md bg-accent', defaultClassNames.range_end),
      today: cn(
        'rounded-md bg-accent text-accent-foreground data-[selected=true]:rounded-none',
        defaultClassNames.today,
      ),
      outside: cn(
        'text-muted-foreground aria-selected:text-muted-foreground',
        defaultClassNames.outside,
      ),
      disabled: cn('text-muted-foreground opacity-50', defaultClassNames.disabled),
      hidden: cn('invisible', defaultClassNames.hidden),
      ...classNames,
    };
  }, [buttonVariant, captionLayout, classNames, props.showWeekNumber]);

  const mergedComponents = React.useMemo(
    () => ({
      Root: CalendarRoot,
      Chevron: CalendarChevron,
      DayButton: CalendarDayButton,
      Dropdown: CalendarDropdown,
      WeekNumber: CalendarWeekNumber,
      ...components,
    }),
    [components],
  );

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      locale={locale}
      weekStartsOn={weekStartsOn}
      today={today}
      className={cn(
        'group/calendar bg-background p-3 [--cell-size:--spacing(8)] [[data-slot=card-content]_&]:bg-transparent [[data-slot=popover-content]_&]:bg-transparent',
        String.raw`rtl:**:[.rdp-button\_next>svg]:rotate-180`,
        String.raw`rtl:**:[.rdp-button\_previous>svg]:rotate-180`,
        className,
      )}
      captionLayout={captionLayout}
      formatters={mergedFormatters}
      classNames={mergedClassNames}
      components={mergedComponents}
      {...props}
    />
  );
}

function CalendarDayButton({
  className,
  day,
  modifiers,
  ...props
}: React.ComponentProps<typeof DayButton>) {
  const defaultClassNames = getDefaultClassNames();

  const ref = React.useRef<HTMLButtonElement>(null);
  React.useEffect(() => {
    if (modifiers.focused) ref.current?.focus();
  }, [modifiers.focused]);

  return (
    <Button
      ref={ref}
      variant="ghost"
      size="icon"
      data-day={day.date.toLocaleDateString()}
      data-selected-single={
        modifiers.selected && !modifiers.range_start && !modifiers.range_end && !modifiers.range_middle
      }
      data-range-start={modifiers.range_start}
      data-range-end={modifiers.range_end}
      data-range-middle={modifiers.range_middle}
      className={cn(
        // selected: primary; hover ghost/dark:hover не должны снимать выделение (иначе «мигание» после клика)
        'data-[selected-single=true]:bg-primary data-[selected-single=true]:text-primary-foreground data-[selected-single=true]:hover:bg-primary data-[selected-single=true]:hover:text-primary-foreground data-[selected-single=true]:dark:hover:bg-primary data-[selected-single=true]:dark:hover:text-primary-foreground',
        'data-[range-middle=true]:bg-accent data-[range-middle=true]:text-accent-foreground data-[range-middle=true]:hover:bg-accent data-[range-middle=true]:hover:text-accent-foreground',
        'data-[range-start=true]:bg-primary data-[range-start=true]:text-primary-foreground data-[range-start=true]:hover:bg-primary data-[range-start=true]:hover:text-primary-foreground data-[range-start=true]:dark:hover:bg-primary data-[range-start=true]:dark:hover:text-primary-foreground',
        'data-[range-end=true]:bg-primary data-[range-end=true]:text-primary-foreground data-[range-end=true]:hover:bg-primary data-[range-end=true]:hover:text-primary-foreground data-[range-end=true]:dark:hover:bg-primary data-[range-end=true]:dark:hover:text-primary-foreground',
        'flex aspect-square size-auto w-full min-w-(--cell-size) flex-col gap-1 leading-none font-normal group-data-[focused=true]/day:relative group-data-[focused=true]/day:z-10 group-data-[focused=true]/day:border-ring group-data-[focused=true]/day:ring-[3px] group-data-[focused=true]/day:ring-ring/50 data-[range-end=true]:rounded-md data-[range-end=true]:rounded-r-md data-[range-middle=true]:rounded-none data-[range-start=true]:rounded-md data-[range-start=true]:rounded-l-md dark:hover:text-accent-foreground [&>span]:text-xs [&>span]:opacity-70',
        defaultClassNames.day,
        className,
      )}
      {...props}
    />
  );
}

export { Calendar, CalendarDayButton };
