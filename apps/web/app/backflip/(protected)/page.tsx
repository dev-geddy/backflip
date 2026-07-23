import { DashboardChart } from "./_components/dashboard-chart"
import { RecentTable } from "./_components/recent-table"
import { SectionCards } from "./_components/section-cards"

/**
 * /backflip — admin dashboard. Cards + chart + table, rendered inside the
 * authenticated shell (see layout).
 */
export default function BackflipDashboardPage() {
  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <SectionCards />
      <DashboardChart />
      <RecentTable />
    </div>
  )
}
