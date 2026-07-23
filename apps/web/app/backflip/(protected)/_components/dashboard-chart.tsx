"use client"

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@workspace/ui/components/chart"
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts"

const chartData = [
  { month: "January", visitors: 1860 },
  { month: "February", visitors: 3050 },
  { month: "March", visitors: 2370 },
  { month: "April", visitors: 1730 },
  { month: "May", visitors: 2090 },
  { month: "June", visitors: 2640 },
]

const chartConfig = {
  visitors: { label: "Visitors", color: "var(--chart-1)" },
} satisfies ChartConfig

export function DashboardChart() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Visitors</CardTitle>
        <CardDescription>Last 6 months</CardDescription>
      </CardHeader>
      <ChartContainer
        config={chartConfig}
        className="aspect-auto h-[250px] w-full px-2 pb-4"
      >
        <AreaChart data={chartData} margin={{ left: 12, right: 12 }}>
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="month"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            tickFormatter={(value: string) => value.slice(0, 3)}
          />
          <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
          <Area
            dataKey="visitors"
            type="natural"
            fill="var(--color-visitors)"
            fillOpacity={0.4}
            stroke="var(--color-visitors)"
          />
        </AreaChart>
      </ChartContainer>
    </Card>
  )
}
