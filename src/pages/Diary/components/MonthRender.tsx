import React, {useMemo} from "react";
import moment from "moment";
import {summ} from "../../../App";
import {moneyFormat} from "../../../common/utils";
import {Card, Col, Descriptions, Row} from "antd";
import {numberToPercent} from "../../../utils";

const MonthRender = ({month, year, isMobile, weeks}) => {
    const weeksByMonth = useMemo(() => weeks.filter(([_, week]) => week.month === month && week.year === year), [month, weeks]);

    const weeksRows = useMemo(() => {
        const rows = [];
        const offset = isMobile || 3; //  ? 1 : 3
        for (let i = 0; i < weeksByMonth.length; i += offset) {
            const row = weeksByMonth.slice(i, i + offset);
            rows.push(row)
        }

        return rows;
    }, [weeksByMonth, isMobile]);

    const title = useMemo(() => moment(weeksByMonth[0][1].trades[0].openDate).startOf('week').format('MMMM'), [month]);

    const monthTotalResult = useMemo(() => summ(weeksByMonth.map(([_, week]) => week.PnL)), [weeksByMonth]);

    return <>
        <div className="MonthRenderTitle">{title}<span
            style={{color: monthTotalResult > 0 ? 'rgba(var(--table-profit-color),1)' : 'rgba(var(--table-loss-color),1)'}}>{moneyFormat(monthTotalResult)}</span>
        </div>
        {weeksRows.map(row => <Row gutter={16}>
            {row.map(([weekNumber, week]) => <Col span={isMobile ? 24 / isMobile : 8}>
                <Card title={`${week.from} - ${week.to}`} bordered={false}
                      className={`MonthRenderCard ${week.PnL > 0 ? 'profit' : 'loss'}`}>
                    <Descriptions column={isMobile ? 2 : 4} layout="vertical">
                        <Descriptions.Item label="Чистая прибыль">
                            <div
                                style={{color: week.PnL > 0 ? 'rgba(var(--table-profit-color),1)' : 'rgba(var(--table-loss-color),1)'}}>{moneyFormat(week.PnL)}</div>
                        </Descriptions.Item>
                        <Descriptions.Item label="Сделок">
                            {week.tradesCount}
                        </Descriptions.Item>
                        <Descriptions.Item label="Объем">
                            {moneyFormat(week.volume, 0)}
                        </Descriptions.Item>
                        <Descriptions.Item label="Процент побед">
                            {numberToPercent(week.winRate)}%
                        </Descriptions.Item>
                    </Descriptions>
                </Card>
            </Col>)}
        </Row>)}
    </>
}

export default MonthRender;