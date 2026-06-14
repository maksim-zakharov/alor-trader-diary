import React from 'react';
import { AppstoreOutlined, TableOutlined } from '@ant-design/icons';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface DiaryViewTabsProps {
  /** Текущий режим отображения */
  value: string;
  /** Обработчик смены режима */
  onChange: (value: string) => void;
  /** Размер табов */
  size?: 'default' | 'large';
}

/**
 * Переключатель вида дневника: таблица / неделя.
 */
export function DiaryViewTabs({ value, onChange, size = 'default' }: DiaryViewTabsProps) {
  return (
    <Tabs value={value} onValueChange={onChange}>
      <TabsList className={size === 'large' ? 'h-10' : undefined}>
        <TabsTrigger value="table" aria-label="Таблица">
          <TableOutlined />
        </TabsTrigger>
        <TabsTrigger value="week" aria-label="Неделя">
          <AppstoreOutlined />
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
