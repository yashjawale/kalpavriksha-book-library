import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@renderer/components/ui/card'
import { createFileRoute } from '@tanstack/react-router'
import Bulk from '../assets/images/bulk.svg'
import { Switch } from '@renderer/components/ui/switch'
import { Label } from '@renderer/components/ui/label'

export const Route = createFileRoute('/bulkadd')({
  component: BulkAdd
})

function BulkAdd() {
  return (
    <>
      <Card className="bg-primary/8">
        <CardContent>
          <div className="flex items-center gap-4">
            <img src={Bulk} alt="Bulk Add Books" width={80} />
            <h1 className="text-lg font-medium w-1/3">
              Scan barcode to fetch book information automatically
            </h1>
          </div>
        </CardContent>
        <hr />
        <CardFooter className="flex flex-col items-start gap-3">
          <h3 className="font-medium">Auto Labels</h3>
          <div className="flex gap-8">
            <div className="flex items-center space-x-2">
              <Switch id="airplane-mode" />
              <Label htmlFor="airplane-mode">Airplane Mode</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch id="airplane-mode" />
              <Label htmlFor="airplane-mode">Airplane Mode</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch id="airplane-mode" />
              <Label htmlFor="airplane-mode">Airplane Mode</Label>
            </div>
          </div>
        </CardFooter>
      </Card>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Recently Activity</CardTitle>
        </CardHeader>
        <CardContent></CardContent>
      </Card>
    </>
  )
}
