import React, { useMemo } from 'react';
import MoneyOutputIcon from '../../../assets/money-output';
import MoneyInputIcon from '../../../assets/money-input';
import moment from 'moment';
import { Status } from 'alor-api/dist/services/ClientInfoService/ClientInfoService';
import { moneyFormat, virtualListStyles } from '../../../common/utils';
import { ClockCircleOutlined } from '@ant-design/icons';
import { useGetOperationsQuery } from '../../../api/alor.api';
import { useAppSelector } from '../../../store';
import List from 'rc-virtual-list';
import useWindowDimensions from '../../../common/useWindowDimensions';
import TickerItem from '../../../common/TickerItem';
import { AppDrawer } from '@/components/AppDrawer';

const OperationsDrawer = ({ onClose, isOpened }) => {
  const { height, isMobile } = useWindowDimensions();
  const settings = useAppSelector((state) => state.alorSlice.settings);
  const userInfo = useAppSelector((state) => state.alorSlice.userInfo);

  const { data: operations = [] } = useGetOperationsQuery(settings.agreement, {
    skip: !userInfo || !settings.agreement,
  });

  const listHeight = useMemo(() => (isMobile ? height - 140 : height - 72), [isMobile, height]);

  const moneyOperations = useMemo(
    () => operations.filter((o) => ['money_input', 'money_withdrawal'].includes(o.subType)),
    [operations],
  );

  const withoutYear = (date) => {
    const format = moment(date).format('LL');

    return format.slice(0, format.length - 8);
  };

  return (
    <AppDrawer
      title="Операции"
      open={isOpened}
      onClose={onClose}
      isMobile={isMobile}
      className="operation-modal"
      contentClassName="overflow-hidden px-0 py-0"
    >
      <List
        data={moneyOperations}
        styles={virtualListStyles}
        height={listHeight}
        itemHeight={52}
        itemKey="id"
      >
        {(getMaxLossTrade) => (
          <TickerItem
            key={getMaxLossTrade.id}
            logo={
              getMaxLossTrade.subType === 'money_withdrawal' ? (
                <MoneyOutputIcon />
              ) : (
                <MoneyInputIcon />
              )
            }
            title={
              getMaxLossTrade.subType === 'money_withdrawal'
                ? 'Вывод с брокерского счета'
                : 'Пополнение брокерского счета'
            }
            description={`${withoutYear(getMaxLossTrade.date)} ${moment(getMaxLossTrade?.date).format('HH:mm:ss')}`}
            actionTitle={
              <>
                {getMaxLossTrade.subType === 'money_input' ? '+' : '-'}
                {moneyFormat(getMaxLossTrade?.data?.amount || 0, 0)}
                {getMaxLossTrade.status === Status.executing && (
                  <ClockCircleOutlined style={{ marginLeft: '4px' }} />
                )}
              </>
            }
            actionTitleColor={
              [Status.Refused, Status.Overdue].includes(getMaxLossTrade.status)
                ? 'rgba(var(--table-loss-color),1)'
                : getMaxLossTrade.status === Status.Resolved
                  ? 'rgba(var(--table-profit-color),1)'
                  : undefined
            }
            actionDescription={getMaxLossTrade?.data?.accountFrom}
          />
        )}
      </List>
    </AppDrawer>
  );
};

export default OperationsDrawer;
