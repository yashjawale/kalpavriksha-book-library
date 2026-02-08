import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@renderer/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@renderer/components/ui/card'
import { createFileRoute } from '@tanstack/react-router'
import { Spinner } from '@renderer/components/ui/spinner'
import { Download, Upload } from 'lucide-react'
import { pdf } from '@react-pdf/renderer'
import { BookCatalogPDF } from '@renderer/components/BookCatalogPDF'
import type { Book } from '@renderer/types/book'
import Logo from '../assets/images/logo.svg'
import Papa from 'papaparse'
import PageTitle from '@renderer/components/ui/page-title'

export const Route = createFileRoute('/managedata')({
  component: ManageData
})

export default function ManageData() {
  const [isExporting, setIsExporting] = useState(false)

  const { data: books = [], isLoading } = useQuery<Book[]>({
    queryKey: ['books'],
    queryFn: async () => await window.api.books.getAll(1, Number.MAX_SAFE_INTEGER)
  })

  const handleExportCSV = () => {
    try {
      // Prepare data for CSV
      const csvData = books.map((book) => ({
        Title: book.title,
        ISBN: book.isbn,
        Stock: book.totalStock,
        'Date Added': new Date(book.createdAt).toLocaleDateString('en-IN')
      }))

      // Generate CSV using papaparse
      const csv = Papa.unparse(csvData)

      // Create and download file
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `book-catalog-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error exporting CSV:', error)
      alert('Failed to export CSV. Please try again.')
    }
  }

  const loadImageAsDataUrl = (src: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = img.width
        canvas.height = img.height
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Failed to get canvas context'))
          return
        }
        ctx.drawImage(img, 0, 0)
        resolve(canvas.toDataURL('image/png'))
      }
      img.onerror = reject
      img.src = src
    })
  }

  const handleExportPDF = async () => {
    if (isExporting) return

    try {
      setIsExporting(true)

      // Load logo as data URL
      const logoDataUrl = await loadImageAsDataUrl(Logo)

      // Generate PDF
      const blob = await pdf(<BookCatalogPDF books={books} logoDataUrl={logoDataUrl} />).toBlob()

      // Download
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `book-catalog-${new Date().toISOString().split('T')[0]}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error exporting PDF:', error)
      alert('Failed to export PDF. Please try again.')
    } finally {
      setIsExporting(false)
    }
  }

  const handleExportBackup = async () => {
    try {
      // Get the database file path from the main process
      const result = await window.electron.ipcRenderer.invoke('database:export')
      if (result.success) {
        alert('Database backup exported successfully!')
      } else {
        alert(`Failed to export backup: ${result.error}`)
      }
    } catch (error) {
      console.error('Error exporting backup:', error)
      alert('Failed to export backup. Please try again.')
    }
  }

  const handleRestoreBackup = async () => {
    try {
      // Create file input
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = '.db'
      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0]
        if (!file) return

        const confirmed = confirm(
          'Are you sure you want to restore from this backup?\n\nThis will replace all current data. Make sure you have a backup of your current data first.'
        )
        if (!confirmed) return

        try {
          const arrayBuffer = await file.arrayBuffer()
          const uint8Array = new Uint8Array(arrayBuffer)

          const result = await window.electron.ipcRenderer.invoke('database:import', uint8Array)
          if (result.success) {
            alert('Database restored successfully! The application will now restart.')
            window.location.reload()
          } else {
            alert(`Failed to restore backup: ${result.error}`)
          }
        } catch (error) {
          console.error('Error restoring backup:', error)
          alert('Failed to restore backup. Please try again.')
        }
      }
      input.click()
    } catch (error) {
      console.error('Error restoring backup:', error)
      alert('Failed to restore backup. Please try again.')
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Spinner className="size-16" />
      </div>
    )
  }
  return (
    <>
      <PageTitle title="Data & Reports" />
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Data & Reports</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Export library data for reporting or backup purposes. Choose from CSV or PDF formats.
          </p>
          <div className="flex">
            <Button className="mr-2 mt-4" onClick={handleExportCSV} disabled={books.length === 0}>
              <Download className="size-4 mr-2" />
              Book Catalog as CSV
            </Button>
            <Button
              className="mr-2 mt-4"
              onClick={handleExportPDF}
              disabled={isExporting || books.length === 0}
            >
              {isExporting ? (
                <>
                  <Spinner className="size-4 mr-2" />
                  Generating...
                </>
              ) : (
                <>
                  <Download className="size-4 mr-2" />
                  Book Catalog as PDF
                </>
              )}
            </Button>
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
            <Button className="mr-2 mt-4" onClick={handleExportBackup}>
              <Download className="size-4 mr-2" />
              Export backup
            </Button>
            <Button className="mt-4" onClick={handleRestoreBackup} variant="outline">
              <Upload className="size-4 mr-2" />
              Restore a backup file
            </Button>
          </div>
        </CardContent>
      </Card>
    </>
  )
}
