import { FC, useMemo } from 'react';

interface IProps {
  xAxisStep: number;
  dataContext: any;
  cluster: any;
}

const ngClass = (obj: any) => ({ className: '' });

type ClusterItem = any;

const AtsTradeClusters: FC<IProps> = ({ dataContext, xAxisStep, cluster }) => {
  const getVolume = (item: ClusterItem) => {
    return Math.round(item.buyQty + item.sellQty);
  };

  const displayItems = useMemo(() => {
    if (!!dataContext.displayRange) {
      return [];
    }

    const displayRows = dataContext.orderBookBody.slice(
      dataContext.displayRange!.start,
      Math.min(
        dataContext.displayRange!.end + 1,
        dataContext.orderBookBody.length,
      ),
    );

    const maxVolume =
      !!cluster && cluster.tradeClusters.length > 0
        ? Math.max(...cluster.tradeClusters.map((c) => getVolume(c)))
        : null;

    return displayRows.map((r) => {
      if (!cluster) {
        return null;
      }

      const mappedItem = cluster.tradeClusters.find((x) => x.price === r.price);
      if (!mappedItem) {
        return null;
      }

      const itemVolume = getVolume(mappedItem);

      return {
        volume: itemVolume,
        isMaxVolume: itemVolume === maxVolume,
      };
    });
  }, [dataContext.orderBookBody, dataContext.displayRange]);

  return displayItems.map((item, i) => (
    <div
      {...ngClass({
        'volume-cell': true,
        'border-bottom': (i + 1) % 5 === 0,
        'max-volume': item?.isMaxVolume,
      })}
      style={{
        height: xAxisStep + 'px',
        lineHeight: xAxisStep + 'px',
      }}
    >
      <span>{item?.volume}</span>
    </div>
  ));
};

export default AtsTradeClusters;
