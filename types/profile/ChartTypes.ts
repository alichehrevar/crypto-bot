type PieChart = {
  id: string;
  label: string;
  value: number;
  color: string;
}
export type PieChartType = PieChart[];

type BarChart = {
  [key: string]: string | number;
}
export type BarChartType = BarChart[]

type RadialBarItem = {
  [key: string]: string | number;
};

type RadialBarGroup = {
  [key: string]: string | RadialBarItem[];
};

export type RadialBarChartType = RadialBarGroup[];


