import { FC, useEffect, useMemo, useState } from 'react';
import { AlorApi, Exchange, Position } from 'alor-api';
import { moneyFormat } from '../../common/utils';

interface IProps {
  symbol: string;
  api: AlorApi;
  orderBookPosition: any;
}

const AtsCurrentPositionPanel: FC<IProps> = ({
  symbol,
  api,
  orderBookPosition,
}) => {
  const [lossOrProfitDisplayType, setLossOrProfitDisplayType] = useState<
    'points' | 'percentage'
  >('percentage');

  const changeLossOrProfitDisplayType = () =>
    setLossOrProfitDisplayType((prevState) =>
      prevState === 'points' ? 'percentage' : 'points',
    );

  return (
    orderBookPosition && (
      <div className="container">
        <div className="position-price">{orderBookPosition.avgPrice}</div>
        <div
          className={`qty ${
            orderBookPosition.qty >= 0 ? 'positive' : 'negative'
          }`}
        >
          {orderBookPosition.qty}л.
        </div>
        <div
          onClick={() => changeLossOrProfitDisplayType()}
          className={`loss-or-profit ${
            orderBookPosition.lossOrProfitPoints > 0 ? 'positive' : 'negative'
          }`}
        >
          {lossOrProfitDisplayType === 'points' && (
            <span>{moneyFormat(orderBookPosition.lossOrProfitPoints)}</span>
          )}
          {lossOrProfitDisplayType === 'percentage' && (
            <span>{orderBookPosition.lossOrProfitPercent}%</span>
          )}
        </div>
      </div>
    )
  );
};

export default AtsCurrentPositionPanel;
