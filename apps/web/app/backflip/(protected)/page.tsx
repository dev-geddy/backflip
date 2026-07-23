import { DashboardChart } from "./_components/dashboard-chart"
import { RecentTable } from "./_components/recent-table"
import { SectionCards } from "./_components/section-cards"

/**
 * /backflip — admin dashboard. Cards + chart + table inside the shell (layout
 * provides padding + vertical rhythm).
 */
export default function BackflipDashboardPage() {
  return (
    <>
      <SectionCards />
      <DashboardChart />
      <RecentTable />
    </>
  )
}
