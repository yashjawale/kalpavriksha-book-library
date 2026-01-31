import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/bulkadd')({
  component: BulkAdd
})

function BulkAdd() {
  return <div className="p-2">Hello from BulkAdd!</div>
}
