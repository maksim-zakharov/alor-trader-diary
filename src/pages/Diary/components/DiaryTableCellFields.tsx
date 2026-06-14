import React, { ChangeEventHandler, FC } from 'react';
import { selectOptions } from '../../../App';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface DiaryPositionReasonSelectProps {
  /** Выбранная причина сделки */
  value?: string;
  /** Обработчик смены причины */
  onChange: (value: string | undefined) => void;
}

/**
 * Выпадающий список причины сделки в строке таблицы дневника.
 */
export const DiaryPositionReasonSelect: FC<DiaryPositionReasonSelectProps> = ({
  value,
  onChange,
}) => {
  const selectValue = value ?? '';

  return (
    <Select
      value={selectValue}
      onValueChange={(nextValue) => onChange(nextValue || undefined)}
    >
      <SelectTrigger size="sm" className="w-[180px]">
        <SelectValue placeholder="Выберите причину..." />
      </SelectTrigger>
      <SelectContent align="start" className="max-h-60">
        {selectOptions.map((option) => (
          <SelectItem key={String(option.label)} value={String(option.value ?? '')}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

interface DiaryPositionCommentInputProps {
  /** Текст комментария */
  value?: string;
  /** Обработчик изменения комментария */
  onChange: ChangeEventHandler<HTMLInputElement>;
}

/**
 * Поле комментария в строке таблицы дневника.
 */
export const DiaryPositionCommentInput: FC<DiaryPositionCommentInputProps> = ({
  value,
  onChange,
}) => (
  <Input
    value={value ?? ''}
    onChange={onChange}
    placeholder="Добавьте комментарий..."
    className="h-7 text-sm"
  />
);
