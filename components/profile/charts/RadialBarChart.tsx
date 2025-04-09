import { RadialBarDatum, RadialBarSerie, ResponsiveRadialBar } from "@nivo/radial-bar";

const data: RadialBarSerie<RadialBarDatum>[] = [
  {
    "id": "line1",
    "data": [
      {
        "x": "Position 1",
        "y": 15
      },
    ]
  },
  {
    "id": "line2",
    "data": [
      {
        "x": "Position 2",
        "y": 35
      },
    ]
  },
  {
    "id": "line3",
    "data": [
      {
        "x": "Position 3",
        "y": 23
      },
    ]
  },
  {
    "id": "line4",
    "data": [
      {
        "x": "Position 4",
        "y": 33
      },
    ]
  }
];

// make sure parent container have a defined height when using
// responsive component, otherwise height will be 0 and
// no chart will be rendered.
const RadialBarChart = () => (
  <ResponsiveRadialBar
    borderColor={{
      from: 'color',
      modifiers: [
        [
          'darker',
          1.2
        ]
      ]
    }}
    circularAxisOuter={null}
    colors={{ scheme: 'accent' }}
    cornerRadius={32}
    data={data}
    enableCircularGrid={false}
    enableRadialGrid={false}
    endAngle={360}
    innerRadius={0.35}
    legends={[
      {
        anchor: 'right',
        direction: 'column',
        justify: false,
        translateX: 10,
        translateY: 0,
        itemsSpacing: 6,
        itemDirection: 'left-to-right',
        itemWidth: 100,
        itemHeight: 18,
        itemTextColor: '#999',
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
    padding={0.45}
    radialAxisStart={null}
  />
)

export default RadialBarChart;
