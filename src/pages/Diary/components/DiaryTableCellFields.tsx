import React, { ChangeEventHandler, FC } from 'react';
import { selectOptions } from '../../../App';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectGroup,
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

const OTHER_REASON_VALUE = '__other__';

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
      onValueChange={(nextValue) => {
        onChange(nextValue === OTHER_REASON_VALUE ? undefined : nextValue);
      }}
    >
      <SelectTrigger size="sm" className="w-[180px]">
        <SelectValue placeholder="Выберите причину..." />
      </SelectTrigger>
      <SelectContent align="start" className="max-h-60">
        <SelectGroup>
          {selectOptions.map((option) => (
            <SelectItem
              key={String(option.label)}
              value={String(option.value ?? OTHER_REASON_VALUE)}
            >
              {option.label}
            </SelectItem>
          ))}
        </SelectGroup>
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
    placeholder="Добавить комментарий..."
    className="h-7 text-sm"
  />
);
