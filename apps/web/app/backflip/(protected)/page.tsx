import { DashboardChart } from "./_components/dashboard-chart"
import { RecentTable } from "./_components/recent-table"
import { SectionCards } from "./_components/section-cards"

/**
 * /backflip — admin overview. Cards + chart + table. Padded page (the shell is
 * full-bleed, so this page owns its padding + vertical rhythm).
 */
export default function BackflipDashboardPage() {
  return (
    <div className="flex flex-col gap-4 p-4 md:gap-6 md:p-6">
      <SectionCards />
      <DashboardChart />
      <RecentTable />
    </div>
  )
}
