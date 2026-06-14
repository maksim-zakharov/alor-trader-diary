import React, { ReactNode } from 'react';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface AppDrawerProps {
  /** Открыт ли drawer */
  open: boolean;
  /** Закрытие drawer */
  onClose: () => void;
  /** Заголовок */
  title: ReactNode;
  /** Содержимое */
  children: ReactNode;
  /** Дополнительные классы контейнера drawer */
  className?: string;
  /** Дополнительные классы области контента */
  contentClassName?: string;
  /** Мобильный режим — drawer снизу */
  isMobile?: boolean;
}

/**
 * Боковая/нижняя панель на shadcn/ui Drawer (vaul).
 */
export function AppDrawer({
  open,
  onClose,
  title,
  children,
  className,
  contentClassName,
  isMobile = false,
}: AppDrawerProps) {
  return (
    <Drawer
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          onClose();
        }
      }}
      direction={isMobile ? 'bottom' : 'right'}
    >
      <DrawerContent className={cn(isMobile ? 'max-h-[85vh]' : 'sm:max-w-md', className)}>
        <DrawerHeader className="flex flex-row items-center justify-between gap-4 border-b border-border px-4 py-3 text-left">
          <DrawerTitle className="text-base font-semibold">{title}</DrawerTitle>
          <Button variant="ghost" size="sm" className="h-8 shrink-0 px-2" onClick={onClose}>
            Закрыть
          </Button>
        </DrawerHeader>
        <div className={cn('min-h-0 flex-1 overflow-y-auto p-4', contentClassName)}>{children}</div>
      </DrawerContent>
    </Drawer>
  );
}
