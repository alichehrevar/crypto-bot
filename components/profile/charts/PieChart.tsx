import { ResponsivePie } from '@nivo/pie'

import { PieChartType } from "@/types/profile/ChartTypes";

// make sure parent container have a defined height when using
// responsive component, otherwise height will be 0 and
// no chart will be rendered.
const AssetsPieChart = (props: {data: PieChartType}) => (
  <ResponsivePie
    activeOuterRadiusOffset={8}
    arcLabelsRadiusOffset={0.6}
    arcLabelsSkipAngle={8}
    arcLabelsTextColor={{
      from: 'color',
      modifiers: [
        [
          'darker',
          3
        ]
      ]
    }}
    arcLinkLabelsColor={{ from: 'color' }}
    arcLinkLabelsSkipAngle={10}
    arcLinkLabelsTextColor="#333333"
    arcLinkLabelsThickness={3}
    borderColor={{
      from: 'color',
      modifiers: [
        [
          'darker',
          3
        ]
      ]
    }}
    borderWidth={1}
    colors={{ scheme: 'accent' }}
    cornerRadius={13}
    data={props.data}
    defs={[
      {
        id: 'dots',
        type: 'patternDots',
        background: 'inherit',
        color: 'rgba(255, 255, 255, 0.3)',
        size: 4,
        padding: 1,
        stagger: true
      },
      {
        id: 'lines',
        type: 'patternLines',
        background: 'inherit',
        color: 'rgba(255, 255, 255, 0.3)',
        rotation: -45,
        lineWidth: 6,
        spacing: 10
      }
    ]}
    enableArcLabels={false}
    enableArcLinkLabels={false}
    innerRadius={0.4}
    legends={[
      {
        anchor: 'right',
        direction: 'column',
        justify: false,
        translateX: 30,
        translateY: 0,
        itemsSpacing: 20,
        itemWidth: 100,
        itemHeight: 18,
        itemTextColor: '#999',
        itemDirection: 'left-to-right',
        itemOpacity: 1,
        symbolSize: 18,
        symbolShape: 'circle',
        effects: [
          {
            on: 'hover',
            style: {
              itemTextColor: '#000'
            }
          }
        ]
      }
    ]}
    margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
    padAngle={2}
  />
)


export default AssetsPieChart;
