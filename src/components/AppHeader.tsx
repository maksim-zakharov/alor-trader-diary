import React, { useMemo } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronDownIcon, CircleHelpIcon, EyeIcon, EyeOffIcon } from 'lucide-react';
import { Exchange } from 'alor-api';
import { useAppDispatch, useAppSelector } from '@/store';
import { setSettings } from '@/api/alor.slice';
import { useGetAllSummariesQuery, useGetSummaryQuery } from '@/api/alor.api';
import { moneyFormat } from '@/common/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { UserMenu } from '@/components/UserMenu';
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
  /** PnL за сегодня для альтернативного типа баланса */
  todayPnL?: number;
}

/** Класс пункта меню — 1:1 со smartmoney-client AppHeader / HeaderNavDropdown */
const headerNavItemClass = (active: boolean) =>
  cn(
    'inline-flex h-12 box-border cursor-pointer items-center gap-1 px-3 py-4 text-[14px] leading-none text-foreground transition-colors hover:bg-[rgba(255,255,255,0.06)] hover:text-tmp-ffb11a',
    active ? 'font-bold text-foreground' : 'font-medium',
  );

/**
 * Главная шапка приложения — визуально как smartmoney-client.
 */
export function AppHeader({ navItems, todayPnL = 0 }: AppHeaderProps) {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
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

  const { data: summary } = useGetSummaryQuery(
    {
      // @ts-ignore
      exchange: settings.portfolio?.startsWith('E') ? 'UNITED' : Exchange.MOEX,
      format: 'Simple',
      portfolio: settings.portfolio,
    },
    {
      skip: !userInfo || !settings.portfolio,
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

  const balanceValue = useMemo(() => {
    if (!summary) {
      return accountSummariesMap[settings.portfolio]?.portfolioLiquidationValue ?? 0;
    }

    if (!settings['summaryType'] || settings['summaryType'] === 'brokerSummary') {
      return summary.portfolioLiquidationValue || 0;
    }

    return summary.buyingPowerAtMorning + todayPnL;
  }, [summary, settings, todayPnL, accountSummariesMap]);

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

  const openDrawer = (drawer: 'operations' | 'payout' | 'settings') => {
    const next = new URLSearchParams(searchParams);
    next.set('drawer', drawer);
    setSearchParams(next);
  };

  return (
    <header
      className="AppHeader sticky top-0 z-50 flex w-full min-w-0 shrink-0 items-center gap-2 overflow-hidden bg-tmp-17181e px-2 pt-[env(safe-area-inset-top)] h-[calc(3rem+env(safe-area-inset-top))]"
      style={{ borderColor: 'rgba(166, 189, 213, 0.2)' }}
    >
      <div className="min-w-0 flex-1 overflow-x-auto overscroll-x-contain [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <nav className="-ml-1 flex w-max items-center gap-1">
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger className={cn(headerNavItemClass(false), 'SelectAccountDropdown gap-1')}>
              <span className="font-semibold">{settings.portfolio}</span>
              <ChevronDownIcon className="size-3.5 shrink-0 opacity-70" aria-hidden />
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              className="SelectAccountDropdownMenu w-[280px] bg-tmp-17181e text-foreground"
            >
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
                          onClick={() =>
                            onSelectPortfolio(agreement.agreementNumber, portfolio.accountNumber)
                          }
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

          {navItems.map((item) => (
            <button
              key={item.key}
              type="button"
              className={headerNavItemClass(currentMenuSelectedKey === item.key)}
              onClick={() => onSelectNav(item.key)}
            >
              {item.label}
            </button>
          ))}
          <button
            type="button"
            className={headerNavItemClass(searchParams.get('drawer') === 'operations')}
            onClick={() => openDrawer('operations')}
          >
            Операции
          </button>
          <button
            type="button"
            className={headerNavItemClass(searchParams.get('drawer') === 'payout')}
            onClick={() => openDrawer('payout')}
          >
            Вывести
          </button>
        </nav>
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-2">
        <a
          href="https://t.me/+8KsjwdNHVzIwNDQy"
          target="_blank"
          rel="noreferrer"
          className={cn(headerNavItemClass(false), 'header-support-link gap-1.5')}
        >
          <CircleHelpIcon className="size-3.5 shrink-0 opacity-70" aria-hidden />
          Поддержка
        </a>
        <div className="flex items-center gap-1">
          <span className="whitespace-nowrap text-[14px] font-semibold leading-5 text-foreground">
            {settings['hideSummary'] ? '••••••••' : moneyFormat(balanceValue)}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="text-muted-foreground hover:bg-transparent hover:text-tmp-ffb11a"
            aria-label={settings['hideSummary'] ? 'Показать баланс' : 'Скрыть баланс'}
            onClick={() => dispatch(setSettings({ hideSummary: !settings['hideSummary'] }))}
          >
            {settings['hideSummary'] ? <EyeIcon className="size-4" /> : <EyeOffIcon className="size-4" />}
          </Button>
        </div>
        <UserMenu onOpenSettings={() => openDrawer('settings')} />
      </div>
    </header>
  );
}
