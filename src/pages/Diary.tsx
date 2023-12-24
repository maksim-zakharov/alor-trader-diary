import {
  Button, Divider,
  Drawer,
  Form,
  Input, message,
  Select,
  SelectProps,
  Statistic,
  Switch,
  Table,
  TableColumnsType,
  Typography,
} from 'antd';
import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import FormItem from 'antd/es/form/FormItem';
import React, {ChangeEventHandler, memo, useEffect, useMemo, useState} from 'react';
import { ColumnsType } from 'antd/es/table';
import moment from 'moment/moment';
import Chart from '../Chart';
import { SwitchChangeEventHandler } from 'antd/es/switch';
import { selectOptions } from '../App';
import {moneyFormat, shortNumberFormat} from '../common/utils';

interface DataType {
  key: string;
  name: string;
  age: number;
  address: string;
  tags: string[];
}

interface ExpandedDataType {
  key: React.Key;
  date: string;
  name: string;
  upgradeNum: string;
}

interface DataType {
  key: string;
  name: string;
  age: number;
  tel: string;
  phone: number;
  address: string;
}
const sharedOnCell = (_: DataType, index: number) => {
  if (index === 1) {
    return { colSpan: 0 };
  }

  return {};
};

const Diary = ({ data, trades, api, isLoading, summary }) => {
  const [settings, setSettings] = useState<{
    token: string;
    portfolio: string;
  }>(JSON.parse(localStorage.getItem('settings') || '{}'));

  const [showSettings, setShowSettings] = useState(false);
  const [reasons, setReasons] = useState<{ [id: string]: string }>(
    JSON.parse(localStorage.getItem('reasons') || '{}'),
  );

  const [nightMode] = useState(
    Boolean(localStorage.getItem('night') === 'true'),
  );

  const [comments, setComments] = useState<{ [id: string]: string }>(
    JSON.parse(localStorage.getItem('state') || '{}'),
  );

  useEffect(() => {
    localStorage.setItem('state', JSON.stringify(comments));
  }, [comments]);

  useEffect(() => {
    localStorage.setItem('settings', JSON.stringify(settings));
  }, [settings]);

  const expandedRowRender = (row: any) => {
    const columns: TableColumnsType<ExpandedDataType> = [
      {
        title: 'Time',
        dataIndex: 'date',
        key: 'date',
        render: (_, row) => moment(row.date).format('HH:mm:ss'),
      },
      {
        title: 'Side',
        dataIndex: 'side',
        key: 'side',
        render: (_, row) =>
          // @ts-ignore
          row.side === 'sell' ? <ArrowDownOutlined /> : <ArrowUpOutlined />,
      },
      { title: 'Quantity', dataIndex: 'qty', key: 'qty' },
      {
        title: 'Price',
        dataIndex: 'price',
        key: 'price',
        render: (_, row) => moneyFormat(_),
      },
      {
        title: 'Amount',
        dataIndex: 'volume',
        key: 'volume',
        render: (_, row) => moneyFormat(_),
      },
      {
        title: 'Fee',
        dataIndex: 'commission',
        key: 'commission',
        render: (_, row) => moneyFormat(_),
      },
    ];

    const darkColors = {
      backgroundColor: 'rgb(30,44,57)',
      color: 'rgb(166,189,213)',
      borderColor: 'rgb(44,60,75)',
    };

    return (
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '800px auto',
          gap: '8px',
        }}
      >
        <Chart
          colors={nightMode && darkColors}
          trades={row.trades}
          symbol={row.symbol}
          api={api}
          from={row.trades[0].date}
          to={row.trades.slice(-1)[0].date}
        />
        <Input.TextArea placeholder="Add comment..." {...inputProps(row)} />
        <Table
          style={{ gridColumnStart: 1, gridColumnEnd: 3 }}
          columns={columns}
          dataSource={row.trades.sort((a: any, b: any) =>
            a.date.localeCompare(b.date),
          )}
          pagination={false}
        />
      </div>
    );
  };
  const selectProps = (position: any): SelectProps => {
    const onSelect: SelectProps['onSelect'] = (value) => {
      setReasons((prevState) => ({ ...prevState, [position.id]: value }));
    };

    return {
      value: reasons[position.id],
      defaultValue: reasons[position.id],
      options: selectOptions,
      onSelect,
    };
  };

  const inputProps = (position: any) => {
    const onChange: ChangeEventHandler = (e: any) => {
      const value = e.target.value;
      setComments((prevState) => ({ ...prevState, [position.id]: value }));
    };

    return {
      value: comments[position.id],
      defaultValue: comments[position.id],
      onChange,
    };
  };

  useEffect(() => {
    localStorage.setItem('reasons', JSON.stringify(reasons));
  }, [reasons]);

  const copyToClipboard = (symbol: string) => {
    navigator.clipboard.writeText(symbol);
    message.info(`Тикер ${symbol} скопирован.`);
  };

  const columns: ColumnsType<DataType> = [
    {
      title: 'Symbol',
      dataIndex: 'symbol',
      key: 'symbol',
      width: 60,
      align: 'center',
      // onCell: (record: any) => record.type === 'summary'  && ({className: record.PnL > 0 ? 'profit' : 'loss'}),
      // @ts-ignore
      render: (_, row) => row.type !== 'summary' && <span className="link-color" onClick={() => copyToClipboard(row.symbol)} style={{cursor: 'pointer'}}>${row.symbol}</span>,
    },
    {
      title: 'Time',
      dataIndex: 'openDate',
      key: 'openDate',
      width: 100,
      align: 'center',
      // onCell: (record: any) => record.type === 'summary'  && ({className: record.PnL > 0 ? 'profit' : 'loss'}),
      render: (_, row) =>
        // @ts-ignore
        row.type !== 'summary'
          ? // @ts-ignore
            moment(row.openDate).format('HH:mm:ss')
          : // @ts-ignore
            moment(row.openDate).format('DD.MM.YYYY'),
      // onCell: sharedOnCell,
    },
    {
      title: 'Duration',
      dataIndex: 'duration',
      key: 'duration',
      width: 110,
      align: 'center',
      // onCell: (record: any) => record.type === 'summary'  && ({className: record.PnL > 0 ? 'profit' : 'loss'}),
      render: (_, row) =>
        // @ts-ignore
        row.type !== 'summary' && moment.duration(_, 'seconds').humanize(),
      // onCell: sharedOnCell,
    },
    {
      title: 'L/S',
      dataIndex: 'side',
      key: 'side',
      align: 'center',
      // onCell: (record: any) => record.type === 'summary'  && ({className: record.PnL > 0 ? 'profit' : 'loss'}),
      render: (_, row) =>
        // @ts-ignore
        row.type !== 'summary' &&
        // @ts-ignore
        (row.side === 'sell' ? <ArrowDownOutlined /> : <ArrowUpOutlined />),
    },
    {
      title: 'PnL %',
      dataIndex: 'PnLPercent',
      key: 'PnLPercent',
      align: 'center',
      // onCell: (record: any) => record.type === 'summary'  && ({className: record.PnL > 0 ? 'profit' : 'loss'}),
      // onCell: (record: any, rowIndex) => ({className: record.PnLPercent > 0 ? 'profit' : 'loss'}),
      // render: (_, row) => moneyFormat(_)
      render: (val: number, row: any) =>
        row.type !== 'summary' && `${(val * 100).toFixed(2)}%`,
    },
    {
      title: 'PnL',
      dataIndex: 'PnL',
      key: 'PnL',
      align: 'center',
      onCell: (record: any, rowIndex) => ({
        className:
          record.type !== 'summary' && (record.PnL > 0 ? 'profit' : 'loss'),
        style: { textAlign: 'center' },
      }),
      render: (_, row: any) =>
        row.type !== 'summary' ? (
          moneyFormat(_)
        ) : (
          <strong>{moneyFormat(_)}</strong>
        ),
      // onCell: (_, index) => ({
      //     colSpan: index === 1 ? 4 : 1,
      // }),
    },
    {
      title: 'Volume',
      dataIndex: 'volume',
      key: 'volume',
      align: 'center',
      // onCell: (record: any) => record.type === 'summary'  && ({className: record.PnL > 0 ? 'profit' : 'loss'}),
      render: (_, row: any) => row.type !== 'summary' && moneyFormat(_, 0),
    },
    {
      title: 'Fee',
      dataIndex: 'Fee',
      key: 'Fee',
      align: 'center',
      // onCell: (record: any) => record.type === 'summary'  && ({className: record.PnL > 0 ? 'profit' : 'loss'}),
      render: (_, row) => moneyFormat(_),
    },
    {
      title: 'Reason',
      dataIndex: 'reason',
      key: 'reason',
      width: 200,
      // onCell: (record: any) => record.type === 'summary'  && ({className: record.PnL > 0 ? 'profit' : 'loss'}),
      render: (_, row: any) =>
        row.type !== 'summary' && (
          <Select
            key={`${row.id}-reason-select`}
            size="small"
            style={{ width: '180px' }}
            allowClear
            placeholder="Select reason..."
            {...selectProps(row)}
          />
        ),
    },
    {
      title: 'Comment',
      dataIndex: 'comment',
      key: 'comment',
      // onCell: (record: any) => record.type === 'summary'  && ({className: record.PnL > 0 ? 'profit' : 'loss'}),
      render: (_, row: any) =>
        row.type !== 'summary' && (
          <Input
            key={`${row.id}-comment-input`}
            size="small"
            allowClear
            placeholder="Add comment..."
            {...inputProps(row)}
          />
        ),
    },
  ];
  const settingsInputProps = (field: string) => {
    const onChange = (e: any) => {
      const value = e.target.value;
      setSettings((prevState) => ({ ...prevState, [field]: value }));
    };

    return {
      value: settings[field],
      defaultValue: settings[field],
      onChange,
      name: field,
      id: field,
    };
  };

  const netProfitPercent = useMemo(() => !summary ? 0 : data.totalPnL * 100 / (summary?.portfolioEvaluation - data.totalPnL), [data.totalPnL, summary?.portfolioEvaluation]);

  return (
    <>
      <div
        style={{
          display: 'flex',
          justifyContent: 'end',
          alignItems: 'center',
          marginBottom: '8px',
          marginTop: '-16px'
        }}
      >
        <div
          style={{
            display: 'flex',
            gap: '32px',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Statistic
              title="Trades"
              loading={isLoading}
              value={`${data.positions.filter(p => p.type !== 'summary').length} trades`}
              precision={2}
          />
          <Statistic
              title="Net Profit"
              loading={isLoading}
              value={`${moneyFormat(data.totalPnL)} (${shortNumberFormat(netProfitPercent)}%)`}
              precision={2}
              valueStyle={{
                color:
                    data.totalPnL > 0 ? 'rgb(44,232,156)' : 'rgb( 255,117,132)',
              }}
          />
          <Statistic
            title="Total Fee"
            loading={isLoading}
            value={moneyFormat(data.totalFee)}
            precision={2}
            valueStyle={{ color: 'rgb( 255,117,132)' }}
          />
          <Button
            type="text"
            icon={<SettingOutlined />}
            onClick={(f) => setShowSettings(true)}
          />
          <Drawer
            title="Settings"
            placement="right"
            onClose={() => setShowSettings(false)}
            open={showSettings}
          >
            <Form>
              <FormItem label="Alor Token">
                <Input placeholder="Token" {...settingsInputProps('token')} />
              </FormItem>
              <FormItem label="Alor Portfolio">
                <Input
                  placeholder="Portfolio"
                  {...settingsInputProps('portfolio')}
                />
              </FormItem>
            </Form>
          </Drawer>
        </div>
      </div>
      <Table
        onRow={(row: any) =>
          row.type === 'summary' && {
            className: row.PnL > 0 ? 'profit' : 'loss',
          }
        }
        rowKey="id"
        columns={columns}
        loading={isLoading}
        dataSource={data.positions}
        size="small"
        pagination={false}
        expandable={{
          expandedRowRender,
          defaultExpandedRowKeys: ['0'],
          rowExpandable: (row) => row.type !== 'summary',
        }}
      />
    </>
  );
};

export default Diary;
