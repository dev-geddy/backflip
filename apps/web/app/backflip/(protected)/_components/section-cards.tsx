import { Badge } from "@workspace/ui/components/badge"
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { RiArrowRightDownLine, RiArrowRightUpLine } from "@remixicon/react"

const cards = [
  {
    description: "Total Revenue",
    value: "$1,250.00",
    delta: "+12.5%",
    up: true,
    line: "Trending up this month",
    sub: "Visitors for the last 6 months",
  },
  {
    description: "New Customers",
    value: "1,234",
    delta: "-20%",
    up: false,
    line: "Down 20% this period",
    sub: "Acquisition needs attention",
  },
  {
    description: "Active Accounts",
    value: "45,678",
    delta: "+12.5%",
    up: true,
    line: "Strong user retention",
    sub: "Engagement exceeds targets",
  },
  {
    description: "Growth Rate",
    value: "4.5%",
    delta: "+4.5%",
    up: true,
    line: "Steady performance increase",
    sub: "Meets growth projections",
  },
]

export function SectionCards() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((c) => {
        const Trend = c.up ? RiArrowRightUpLine : RiArrowRightDownLine
        return (
          <Card key={c.description} className="@container/card">
            <CardHeader>
              <CardDescription>{c.description}</CardDescription>
              <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                {c.value}
              </CardTitle>
              <CardAction>
                <Badge variant="outline">
                  <Trend />
                  {c.delta}
                </Badge>
              </CardAction>
            </CardHeader>
            <CardFooter className="flex-col items-start gap-1.5 text-sm">
              <div className="line-clamp-1 flex gap-2 font-medium">
                {c.line} <Trend className="size-4" />
              </div>
              <div className="text-muted-foreground">{c.sub}</div>
            </CardFooter>
          </Card>
        )
      })}
    </div>
  )
}
