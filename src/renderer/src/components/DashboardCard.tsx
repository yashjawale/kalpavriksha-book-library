import { Card, CardContent, CardHeader, CardTitle } from '@renderer/components/ui/card'

interface DashboardCardProps {
  value: string
  label: string
}

export function DashboardCard({ value, label }: DashboardCardProps) {
  return (
    <Card className="bg-primary/5">
      <CardHeader>
        <CardTitle>{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-7xl">{value ?? '-'}</p>
      </CardContent>
    </Card>
  )
}
