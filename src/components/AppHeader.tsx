import React, { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChevronDownIcon, CircleHelpIcon } from 'lucide-react';
import { Exchange } from 'alor-api';
import { useAppDispatch, useAppSelector } from '@/store';
import { setSettings } from '@/api/alor.slice';
import { useGetAllSummariesQuery } from '@/api/alor.api';
import { moneyFormat } from '@/common/utils';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import CheckIcon from '@/assets/check';
import PortfolioIcon from '@/assets/portfolio';

/** Пункт навигации в шапке */
export interface AppHeaderNavItem {
  /** Ключ маршрута */
  key: string;
  /** Подпись */
  label: string;
}

interface AppHeaderProps {
  /** Пункты навигации */
  navItems: AppHeaderNavItem[];
}

/**
 * Главная шапка приложения на shadcn/ui.
 */
export function AppHeader({ navItems }: AppHeaderProps) {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const settings = useAppSelector((state) => state.alorSlice.settings);
  const userInfo = useAppSelector((state) => state.alorSlice.userInfo);
  const currentMenuSelectedKey = location.pathname?.split('/')[1] || 'diary';

  const { data: summaries } = useGetAllSummariesQuery(
    {
      exchange: Exchange.MOEX,
      format: 'Simple',
      userInfo,
    },
    {
      skip: !userInfo,
    },
  );

  const accountSummariesMap = useMemo(
    () =>
      (summaries || []).reduce<Record<string, (typeof summaries)[number]>>(
        (acc, curr) => ({ ...acc, [curr.accountNumber]: curr }),
        {},
      ),
    [summaries],
  );

  const agreementSummariesMap = useMemo(
    () =>
      (summaries || []).reduce<Record<string, number>>((acc, curr) => {
        if (!acc[curr.agreementNumber]) {
          acc[curr.agreementNumber] = 0;
        }
        acc[curr.agreementNumber] += curr.portfolioLiquidationValue;
        return acc;
      }, {}),
    [summaries],
  );

  const totalSum = useMemo(
    () => (summaries || []).reduce((acc, curr) => acc + curr.portfolioLiquidationValue, 0),
    [summaries],
  );

  const onSelectNav = (key: string) => {
    let to = `/${key}`;
    if (location.search) {
      to += location.search;
    }
    navigate(to);
  };

  const onSelectPortfolio = (agreement: string, portfolio: string) => {
    dispatch(setSettings({ agreement, portfolio }));
  };

  return (
    <header className="AppHeader sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="menu-content">
        <div className="flex items-center gap-4">
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger
              className={cn(
                buttonVariants({ variant: 'ghost', size: 'sm' }),
                'SelectAccountDropdown gap-1 px-2 text-xs font-normal',
              )}
            >
              <span className="font-semibold">{settings.portfolio}</span>
              <ChevronDownIcon data-icon="inline-end" className="size-3.5 opacity-70" />
            </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="SelectAccountDropdownMenu w-[280px]">
            <div className="portfolio-item px-3 py-2">
              <div className="portfolio-summary">
                <span className="portfolio-description">Всего на всех счетах:</span>
              </div>
              <div className="portfolio-summary">{moneyFormat(totalSum, 0, 0)}</div>
            </div>
            <DropdownMenuSeparator />
            {(userInfo?.agreements || []).map((agreement) => {
              const portfolios = agreement.isEDP
                ? [{ accountNumber: `E${agreement.agreementNumber}`, service: 'ЕДП' }]
                : agreement.portfolios;

              return (
                <DropdownMenuGroup key={agreement.agreementNumber}>
                  <DropdownMenuLabel className="portfolio-item px-3 py-2 text-[13px] font-medium text-foreground">
                    <span>Договор {agreement.cid}</span>
                    {!agreement.isEDP && (
                      <div className="portfolio-summary mt-1 font-normal">
                        <span className="portfolio-description">
                          Всего на {agreement.portfolios.length} счетах:
                        </span>
                        {moneyFormat(agreementSummariesMap[agreement.agreementNumber], 0, 0)}
                      </div>
                    )}
                  </DropdownMenuLabel>
                  {portfolios.map((portfolio) => {
                    const itemKey = `${agreement.agreementNumber}-${portfolio.accountNumber}`;
                    const isSelected =
                      settings.agreement === agreement.agreementNumber &&
                      settings.portfolio === portfolio.accountNumber;

                    return (
                      <DropdownMenuItem
                        key={itemKey}
                        className="portfolio-menu-item min-h-14 cursor-pointer px-3 py-2"
                        onClick={() => onSelectPortfolio(agreement.agreementNumber, portfolio.accountNumber)}
                      >
                        <div className="portfolio-icon mr-3 shrink-0">
                          <PortfolioIcon />
                        </div>
                        <div className="portfolio-item min-w-0 flex-1">
                          <div className="flex items-center gap-2 text-[13px] leading-5">
                            <span>
                              {portfolio.accountNumber} ({portfolio.service})
                            </span>
                            {isSelected && <CheckIcon />}
                          </div>
                          <div className="portfolio-summary">
                            {moneyFormat(
                              accountSummariesMap[portfolio.accountNumber]?.portfolioLiquidationValue,
                              0,
                              0,
                            )}
                          </div>
                        </div>
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuGroup>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>

          <nav className="flex items-center gap-4">
            {navItems.map((item) => (
              <Button
                key={item.key}
                variant="ghost"
                size="sm"
                className={cn(
                  'h-8 px-0 text-base text-muted-foreground hover:bg-transparent hover:text-foreground',
                  currentMenuSelectedKey === item.key && 'font-bold text-foreground',
                )}
                onClick={() => onSelectNav(item.key)}
              >
                {item.label}
              </Button>
            ))}
          </nav>
        </div>

        <a
          href="https://t.me/+8KsjwdNHVzIwNDQy"
          target="_blank"
          rel="noreferrer"
          className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'header-support-link gap-2 px-2')}
        >
          <CircleHelpIcon data-icon="inline-start" />
          Поддержка
        </a>
      </div>
    </header>
  );
}
