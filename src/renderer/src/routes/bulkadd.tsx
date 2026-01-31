import { Card } from '@renderer/components/ui/card'
import { createFileRoute } from '@tanstack/react-router'
import Bulk from '../assets/images/bulk.svg'

export const Route = createFileRoute('/bulkadd')({
  component: BulkAdd
})

function BulkAdd() {
  return (
    <div className="p-2">
      <Card className="w-full">
        <img src={Bulk} alt="Bulk Add Books" width={100} />
      </Card>
    </div>
  )
}
