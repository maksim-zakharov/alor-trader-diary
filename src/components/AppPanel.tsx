import React from 'react';
import { cn } from '@/lib/utils';

interface AppPanelProps {
  /** Содержимое панели */
  children: React.ReactNode;
  /** Дополнительные CSS-классы */
  className?: string;
  /** Без внутренних отступов — для таблиц и каруселей */
  flush?: boolean;
}

/**
 * Контейнер-панель с фоном как у шапки и футера.
 */
export function AppPanel({ children, className, flush }: AppPanelProps) {
  return (
    <div
      className={cn(
        'overflow-hidden bg-app-header-bg text-app-text',
        !flush && 'p-4',
        className,
      )}
    >
      {children}
    </div>
  );
}
