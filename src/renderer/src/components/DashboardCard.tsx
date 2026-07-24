import { Card, CardContent, CardHeader, CardTitle } from '@renderer/components/ui/card'
import { Tooltip, TooltipContent, TooltipTrigger } from '@renderer/components/ui/tooltip'

interface DashboardCardProps {
  value: string
  label: string
  tooltip?: string
}

export function DashboardCard({ value, label, tooltip }: DashboardCardProps) {
  const card = (
    <Card className="bg-primary/5 h-full">
      <CardHeader>
        <CardTitle className="font-normal text-md">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-5xl">{value ?? '-'}</p>
      </CardContent>
    </Card>
  )

  if (tooltip) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{card}</TooltipTrigger>
        <TooltipContent className="whitespace-pre-line">
          <p>{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    )
  }

  return card
}
