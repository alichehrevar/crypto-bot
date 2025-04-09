import { ResponsiveBar } from '@nivo/bar'

import { BarChartType } from "@/types/profile/ChartTypes";

const data: BarChartType = [
  {
    "date": "Jan 1",
    "Jan 1": 96,
    "Jan 1Color": "hsl(279, 70%, 50%)",
  },
  {
    "date": "Jan 12",
    "Jan 12": 102,
    "Jan 12Color": "hsl(279, 70%, 50%)",
  },
  {
    "date": "Jan 18",
    "Jan 18": 6,
    "Jan 18Color": "hsl(279, 70%, 50%)",
  },
  {
    "date": "Jan 22",
    "Jan 22": 89,
    "Jan 22Color": "hsl(279, 70%, 50%)",
  },
  {
    "date": "Jan 28",
    "Jan 28": 34,
    "Jan 28Color": "hsl(279, 70%, 50%)",
  },
  {
    "date": "Feb 5",
    "Feb 5": 45,
    "Feb 5Color": "hsl(279, 70%, 50%)",
  },
  {
    "date": "Feb 15",
    "Feb 15": 74,
    "Feb 15Color": "hsl(279, 70%, 50%)",
  }
]

// make sure parent container have a defined height when using
// responsive component, otherwise height will be 0 and
// no chart will be rendered.
const BarChart = () => (
  <ResponsiveBar
    ariaLabel="Date"
    axisBottom={{
      tickSize: 0,
      tickPadding: 10,
      tickRotation: 0,
      legendPosition: 'middle',
      legendOffset: 32,
      truncateTickAt: 0
    }}
    axisLeft={{
      tickSize: 0,
      tickPadding: 10,
      tickRotation: 0,
      legendPosition: 'middle',
      legendOffset: -40,
      truncateTickAt: 0
    }}
    axisRight={null}
    axisTop={null}
    barAriaLabel={e=>e.id+": "+e.formattedValue+" in date: "+e.indexValue}
    borderColor={{
      from: 'color',
      modifiers: [
        [
          'darker',
          2
        ]
      ]
    }}
    borderRadius={7}
    colors={{ scheme: 'blues' }}
    data={data}
    defs={[
      {
        id: 'dots',
        type: 'patternDots',
        background: 'inherit',
        color: '#38bcb2',
        size: 4,
        padding: 1,
        stagger: true
      },
      {
        id: 'lines',
        type: 'patternLines',
        background: 'inherit',
        color: '#eed312',
        rotation: -45,
        lineWidth: 6,
        spacing: 10
      }
    ]}
    enableGridY={false}
    enableLabel={false}
    indexBy="date"
    indexScale={{ type: 'band', round: true }}
    keys={[
      'Jan 1',
      'Jan 12',
      'Jan 18',
      'Jan 22',
      'Jan 28',
      'Feb 5',
      'Feb 15',
    ]}
    margin={{ top: 3, right: 0, bottom: 20, left: 30 }}
    padding={0.4}
    role="application"
    valueScale={{ type: 'linear' }}
  />
)

export default BarChart;
