import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Copy, LogOut, Settings } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/store';
import { logout } from '@/api/alor.slice';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface UserMenuProps {
  /** Открыть настройки */
  onOpenSettings?: () => void;
  /** Колбэк открытия меню */
  onOpenChange?: (open: boolean) => void;
  /** Выравнивание popover аватара */
  popoverAlign?: 'start' | 'center' | 'end';
}

/** Инициалы для аватарки */
function getInitials(fullName?: string, phoneLogin?: string): string {
  if (fullName) {
    return fullName
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase();
  }
  if (phoneLogin) {
    return phoneLogin.charAt(0).toUpperCase();
  }
  return 'U';
}

/**
 * Меню пользователя в шапке — визуально как smartmoney-client UserMenu.
 */
export function UserMenu({
  onOpenSettings,
  onOpenChange,
  popoverAlign = 'end',
}: UserMenuProps) {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const userInfo = useAppSelector((state) => state.alorSlice.userInfo);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [copiedClientId, setCopiedClientId] = useState(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const copiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setMenuOpen = (open: boolean) => {
    setIsMenuOpen(open);
    onOpenChange?.(open);
  };

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
      }
      if (copiedTimerRef.current) {
        clearTimeout(copiedTimerRef.current);
      }
    };
  }, []);

  const clearCloseTimer = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  const scheduleClose = () => {
    clearCloseTimer();
    closeTimerRef.current = setTimeout(() => setMenuOpen(false), 150);
  };

  const keepOpen = () => {
    clearCloseTimer();
    setMenuOpen(true);
  };

  const handleLogout = () => {
    setIsLoggingOut(true);
    dispatch(logout());
    setMenuOpen(false);
    navigate('/login');
  };

  const handleCopyClientId = async () => {
    if (userInfo?.clientId == null) {
      return;
    }
    try {
      await navigator.clipboard.writeText(String(userInfo.clientId));
      setCopiedClientId(true);
      if (copiedTimerRef.current) {
        clearTimeout(copiedTimerRef.current);
      }
      copiedTimerRef.current = setTimeout(() => setCopiedClientId(false), 1500);
    } catch {
      // clipboard может быть недоступен без secure context
    }
  };

  const handleOpenSettings = () => {
    if (onOpenSettings) {
      onOpenSettings();
      setMenuOpen(false);
    }
  };

  const initials = getInitials(userInfo?.fullName, userInfo?.phoneLogin);

  return (
    <div className="flex items-center gap-2">
      <Popover
        open={isMenuOpen}
        modal={false}
        onOpenChange={(next) => {
          if (!next) {
            setMenuOpen(false);
          }
        }}
      >
        <PopoverTrigger
          type="button"
          className={cn(
            'inline-flex size-8 cursor-pointer items-center justify-center rounded text-sm font-medium text-foreground transition-colors',
            'hover:bg-transparent hover:text-tmp-ffb11a',
          )}
          title={userInfo?.fullName || 'Профиль'}
          aria-label={userInfo?.fullName || 'Профиль'}
          onMouseEnter={keepOpen}
          onMouseLeave={scheduleClose}
        >
          {initials}
        </PopoverTrigger>
        <PopoverContent
          align={popoverAlign}
          sideOffset={8}
          className="z-[100] w-64 space-y-3 bg-tmp-17181e p-3 text-foreground"
          onMouseEnter={keepOpen}
          onMouseLeave={() => setMenuOpen(false)}
        >
          <div className="space-y-2">
            {userInfo?.fullName && (
              <div className="text-sm font-medium">{userInfo.fullName}</div>
            )}
            {userInfo?.phoneLogin && (
              <div className="text-sm text-foreground">{userInfo.phoneLogin}</div>
            )}
            {userInfo?.clientId != null && (
              <div className="flex items-center gap-1">
                <span className="text-xs text-foreground">ID: {userInfo.clientId}</span>
                <button
                  type="button"
                  className="flex h-4 w-4 items-center justify-center rounded p-0 text-foreground transition-colors hover:bg-accent hover:text-tmp-ffb11a"
                  title={copiedClientId ? 'Скопировано' : 'Копировать'}
                  aria-label={copiedClientId ? 'Скопировано' : 'Копировать ID'}
                  onClick={handleCopyClientId}
                >
                  <Copy className="h-3 w-3" />
                </button>
              </div>
            )}
          </div>

          <div className="space-y-1 border-t border-border pt-2">
            {onOpenSettings && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full justify-start hover:text-tmp-ffb11a"
                onClick={handleOpenSettings}
              >
                <Settings className="mr-2 h-4 w-4" />
                Настройки
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full justify-start text-destructive hover:text-destructive"
              onClick={handleLogout}
              disabled={isLoggingOut}
            >
              <LogOut className="mr-2 h-4 w-4" />
              {isLoggingOut ? 'Выход…' : 'Выйти'}
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
