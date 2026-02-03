import { Button } from '@renderer/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@renderer/components/ui/card'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/managedata')({
  component: ManageData
})

export default function ManageData() {
  return (
    <>
      <h1 className="text-2xl font-bold pb-6 pt-4">Manage Data</h1>

      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Data & Reports</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Export your library data for reporting or backup purposes. Choose from CSV or PDF
            formats.
          </p>
          <div className="flex">
            <Button className="mr-2 mt-4">Book Catalog as CSV</Button>
            <Button className="mr-2 mt-4">Book Catalog as PDF</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Backup & Restore</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Backup and restore database to prevent data loss and ensure data integrity.
          </p>
          <div className="flex">
            <Button className="mr-2 mt-4">Export backup</Button>
            <Button className="mt-4">Restore a backup file</Button>
          </div>
        </CardContent>
      </Card>
    </>
  )
}
