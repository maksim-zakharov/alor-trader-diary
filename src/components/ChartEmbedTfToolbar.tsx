import React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/** Стиль кнопок ТФ как у smartmoney-client. */
export const CHART_EMBED_TF_BTN =
  'h-auto min-w-0 gap-0 rounded-none p-2 text-[11px] font-medium leading-none text-bds-gray-t2 hover:text-bds-static-white aria-pressed:text-bds-brand-700-normal aria-pressed:hover:text-bds-brand-700-normal';

/** Вариант таймфрейма. */
export interface ChartEmbedTfOption {
  /** Значение */
  value: string;
  /** Подпись */
  label: string;
}

export interface ChartEmbedTfToolbarProps {
  /** Список ТФ */
  options: readonly ChartEmbedTfOption[];
  /** Текущее значение */
  value: string | null;
  /** Смена ТФ */
  onChange: (value: string) => void;
  /** disabled */
  disabled?: boolean;
  /** className */
  className?: string;
  /** aria-label */
  'aria-label'?: string;
}

/**
 * Переключение таймфреймов — UI как у smartmoney-client.
 */
export function ChartEmbedTfToolbar({
  options,
  value,
  onChange,
  disabled = false,
  className,
  'aria-label': ariaLabel = 'Таймфрейм',
}: ChartEmbedTfToolbarProps): React.ReactElement {
  return (
    <div
      data-embed-tf-toolbar
      className={cn('pointer-events-auto flex items-center bg-background/90', className)}
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
      onWheel={(event) => event.stopPropagation()}
      role="group"
      aria-label={ariaLabel}
    >
      {options.map((opt) => {
        const pressed = value === opt.value;
        return (
          <Button
            key={opt.value}
            type="button"
            variant="ghost"
            size="xs"
            className={CHART_EMBED_TF_BTN}
            aria-pressed={pressed}
            disabled={disabled}
            onClick={() => {
              if (!disabled && opt.value !== value) onChange(opt.value);
            }}
          >
            {opt.label}
          </Button>
        );
      })}
    </div>
  );
}
