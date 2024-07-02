import Spinner from "../../../common/Spinner";
import HighchartsReact from "highcharts-react-official";
import * as Highcharts from "highcharts";
import NoResult from "../../../common/NoResult";
import React, {useMemo} from "react";

const SymbolsWidget = ({nightMode, darkColors, nonSummaryPositions, isLoading}) => {

    const symbolPnlMap: {[reason: string]: number} = useMemo(() => nonSummaryPositions.reduce((acc, curr) => ({...acc, [curr.symbol]: (acc[curr.symbol] || 0) +  curr.PnL  }), {} as {[reason: string]: number}), [nonSummaryPositions])

    const symbolCategories = useMemo(() => Object.entries(symbolPnlMap).sort((a, b) => a[1] - b[1]), [symbolPnlMap])

    const symbolSeries: any = useMemo(() => [{
        data: symbolCategories.map(([key]) => [key, Math.floor(symbolPnlMap[key])]),
        // size: '80%',
        innerSize: '70%',
    }], [symbolPnlMap, symbolCategories]);

    const symbolOptions: Highcharts.Options = {
        chart: {
            // type: 'pie',
            type: 'column',
            backgroundColor: nightMode && darkColors.backgroundColor,
        },
        title: null,
        xAxis: {
            categories: symbolCategories.map(([key]) => key),
            title: {
                text: null
            },
            gridLineColor: nightMode && darkColors.borderColor,
            gridLineWidth: 1,
            lineWidth: 0,
            labels: {
                style: {
                    color: nightMode && darkColors.color
                }
            }
        },
        yAxis: {
            labels: {
                style: {
                    color: nightMode && darkColors.color
                }
            },
            title: {
                text: null
            },

            gridLineColor: nightMode && darkColors.borderColor,
        },
        plotOptions: {
            pie: {
                allowPointSelect: true,
                cursor: 'pointer',
                dataLabels: {
                    enabled: false
                },
                showInLegend: true
            },
            column: {
                negativeColor: "rgba(var(--table-loss-color),1)",
                color: "rgba(var(--table-profit-color),1)",
                // colors: {
                //     ranges: [
                //         {
                //             from: -Infinity, // Any value less than this will be red
                //             to: 0,
                //             color: "#e85347" // Red color
                //         },
                //         {
                //             from: 0,
                //             to: Infinity, // Any value greater than this will be green
                //             color: "#1ee0ac" // Green color
                //         }
                //     ]
                // },
                borderColor: 'transparent',
                dataLabels: {
                    enabled: true
                },
                // color: 'rgb(51,111,238)',
                groupPadding: 0.1
            }
        },
        credits: {
            enabled: false
        },
        legend: {
            enabled: false,
            layout: 'vertical',
            align: 'right',
            verticalAlign: 'middle',
            itemMarginTop: 10,
            itemMarginBottom: 10,
            itemStyle: {
                color: darkColors.color
            }
        },
        series: symbolSeries
    }

    return <div className="widget" style={{height: 460, width: '100%'}}>
        <div className="widget_header">По инструментам</div>
        {isLoading ? <Spinner/> : symbolCategories.length ?
            <HighchartsReact
                highcharts={Highcharts}
                options={symbolOptions}
            /> : <NoResult text="Нет данных"/>}
    </div>
}

export default SymbolsWidget;