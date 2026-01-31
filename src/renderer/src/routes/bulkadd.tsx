import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@renderer/components/ui/card'
import { createFileRoute } from '@tanstack/react-router'
import Bulk from '../assets/images/bulk.svg'
import { Switch } from '@renderer/components/ui/switch'
import { Label } from '@renderer/components/ui/label'
import { Spinner } from '@renderer/components/ui/spinner'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@renderer/components/ui/dialog'
import { Field, FieldGroup } from '@renderer/components/ui/field'
import { useState } from 'react'
import { Button } from '@renderer/components/ui/button'
import { Input } from '@renderer/components/ui/input'

export const Route = createFileRoute('/bulkadd')({
  component: BulkAdd
})

function BulkAdd() {
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingText, setProcessingText] = useState('Processing...')
  return (
    <>
      {/* Dialog for entering name manually */}
      <Dialog open={false}>
        <form>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Enter Book Title</DialogTitle>
              <DialogDescription>
                The book&apos;s title wasn&apos;t found through online sources. Please enter it
                manually.
              </DialogDescription>
            </DialogHeader>
            <FieldGroup>
              <Field>
                <Label htmlFor="title">Title</Label>
                <Input id="title" name="title" />
              </Field>
              <Field>
                <Label htmlFor="count">Count</Label>
                <Input id="count" name="count" type="number" defaultValue={1} min={1} />
              </Field>
            </FieldGroup>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button type="submit">Add book</Button>
            </DialogFooter>
          </DialogContent>
        </form>
      </Dialog>

      <Card className="bg-primary/8">
        <CardContent>
          <div className="flex items-center gap-4">
            {isProcessing ? (
              <Spinner className="size-16 text-primary" />
            ) : (
              <img src={Bulk} alt="Bulk Add Books" width={80} />
            )}
            <h1 className="text-lg font-medium max-w-md">
              {isProcessing ? processingText : 'Scan a barcode to begin adding books'}
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
