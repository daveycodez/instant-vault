import { createFileRoute } from "@tanstack/react-router"

import { DashboardToolbar } from "#/widgets/dashboard/dashboard-toolbar"
import { EmployeesTable } from "#/widgets/dashboard/employees-table"
import { KpiRow } from "#/widgets/dashboard/kpi-row"
import { SalesPerformanceCard } from "#/widgets/dashboard/sales-performance-card"
import { TrafficSourceCard } from "#/widgets/dashboard/traffic-source-card"

export const Route = createFileRoute("/_dashboard/dashboard")({
  component: Dashboard,
})

function Dashboard() {
  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 pb-10 pt-4">
      <DashboardToolbar />
      <KpiRow />
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <SalesPerformanceCard />
        <TrafficSourceCard />
      </div>
      <EmployeesTable />
    </div>
  )
}
