import { Card, ListBox, Select } from "@heroui/react"
import { BarChart, NumberValue, TrendChip } from "@heroui-pro/react"

import { SALES_CHART_DATA, SALES_MINI_KPIS } from "@/data/dashboard/sales"

export function SalesPerformanceCard() {
  return (
    <Card className="rounded-2xl">
      <Card.Header className="flex-row items-center justify-between">
        <Card.Title className="text-base">Sales Performance</Card.Title>
        <Select
          className="w-[140px]"
          defaultValue="last-2-weeks"
          variant="secondary"
        >
          <Select.Trigger className="h-auto min-h-0 px-3 py-1.5 text-xs font-medium">
            <Select.Value />
            <Select.Indicator className="size-3.5" />
          </Select.Trigger>
          <Select.Popover>
            <ListBox>
              <ListBox.Item id="last-week" textValue="Last week">
                Last week
                <ListBox.ItemIndicator />
              </ListBox.Item>
              <ListBox.Item id="last-2-weeks" textValue="Last 2 weeks">
                Last 2 weeks
                <ListBox.ItemIndicator />
              </ListBox.Item>
              <ListBox.Item id="last-month" textValue="Last month">
                Last month
                <ListBox.ItemIndicator />
              </ListBox.Item>
              <ListBox.Item id="last-3-months" textValue="Last 3 months">
                Last 3 months
                <ListBox.ItemIndicator />
              </ListBox.Item>
            </ListBox>
          </Select.Popover>
        </Select>
      </Card.Header>
      <Card.Content className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          {SALES_MINI_KPIS.map((kpi) => (
            <div key={kpi.label} className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <NumberValue
                  className="text-foreground text-lg font-semibold tabular-nums"
                  currency={kpi.currency}
                  maximumFractionDigits={0}
                  style={kpi.currency ? "currency" : "decimal"}
                  value={kpi.value}
                />
                <TrendChip className="bg-transparent" trend="up">
                  3.3%
                </TrendChip>
              </div>
              <span className="text-muted text-xs">{kpi.label}</span>
            </div>
          ))}
        </div>
        <BarChart data={[...SALES_CHART_DATA]} height={180}>
          <BarChart.Grid vertical={false} />
          <BarChart.XAxis dataKey="month" tickMargin={8} />
          <BarChart.YAxis domain={[0, 60]} ticks={[0, 20, 40, 60]} width={30} />
          <BarChart.Bar
            barSize={16}
            dataKey="sales"
            fill="var(--chart-3)"
            radius={[24, 24, 24, 24]}
          />
          <BarChart.Tooltip content={<BarChart.TooltipContent />} />
        </BarChart>
      </Card.Content>
    </Card>
  )
}
