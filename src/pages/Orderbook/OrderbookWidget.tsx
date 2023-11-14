import React, { FC, useEffect, useMemo, useState } from 'react';
import AtsScalperOrderBookBody from './AtsScalperOrderBookBody';
import AtsCurrentPositionPanel from './AtsCurrentPositionPanel';
import { AlorApi, Exchange, Position } from 'alor-api';
import { useSearchParams } from 'react-router-dom';

interface IProps {
  api: AlorApi;
  symbol: string;
  showClusters?: boolean;
}

const OrderbookWidget: FC<IProps> = ({ api, symbol, showClusters }) => {
  const [searchParams, setSearchParams] = useSearchParams();

  if (!symbol) symbol = searchParams.get('symbol') || 'SBER';

  const [active, setActive] = useState(false);
  const [positions, setPositions] = useState([]);
  const [settings, setSettings] = useState<{
    token: string;
    portfolio: string;
  }>(JSON.parse(localStorage.getItem('settings') || '{}'));

  const orderBookPosition: any = useMemo(() => {
    const position: Position = positions.find((p) => p.symbol === symbol);
    if (!position || position.qty === 0) {
      return undefined;
    }

    return {
      ...position,
      lossOrProfitPoints: position.unrealisedPl,
      lossOrProfitPercent: (position.unrealisedPl / position.avgPrice).toFixed(
        2,
      ),
    };
  }, [positions, symbol]);

  useEffect(() => {
    if (active) {
      api.subscriptions.positions(
        {
          exchange: Exchange.MOEX,
          portfolio: settings.portfolio,
        },
        (position) =>
          setPositions((prevState) => {
            let exist = prevState.find((p) => p.symbol === position.symbol);
            if (!exist) {
              prevState.push(position);
            } else {
              prevState = prevState.map((p) =>
                p.symbol === position.symbol ? position : p,
              );
            }

            return prevState;
          }),
      );
    }
  }, [active]);

  useEffect(() => {
    if (api) {
      api.refresh().then(() => setActive(true));
    }
  }, [api]);

  return (
    active && (
      <>
        <div>
          {/*      <div class="header flex-gap-2">*/}
          {/*        <div class="d-flex flex-gap-2">*/}
          {/*          <div>*/}
          {/*              <AtsWorkingVolumesPanel selectedVolumeChanged={workingVolume$.next($event)} guid={guid} isActive={isActive}  />*/}
          {/*          </div>*/}
          {/*          <div class="mt-1">*/}
          {/*            <AtsModifiersIndicator/>*/}
          {/*          </div>*/}
          {/*        </div>*/}
          {/*</div>*/}
          <div className="order-book-body">
            <AtsScalperOrderBookBody
              showClusters={showClusters}
              symbol={symbol}
              api={api}
              orderBookPosition={orderBookPosition}
              workingVolume={0}
            />
          </div>
          <div className="footer">
            <AtsCurrentPositionPanel
              symbol={symbol}
              api={api}
              orderBookPosition={orderBookPosition}
            />
          </div>
        </div>
      </>
    )
  );
};

export default OrderbookWidget;
