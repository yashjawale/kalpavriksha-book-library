import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@renderer/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@renderer/components/ui/card'
import { Input } from '@renderer/components/ui/input'
import { Label } from '@renderer/components/ui/label'
import { createFileRoute } from '@tanstack/react-router'
import { Spinner } from '@renderer/components/ui/spinner'
import { Download, Upload, AlertTriangle, Settings as SettingsIcon } from 'lucide-react'
import { pdf } from '@react-pdf/renderer'
import { BookCatalogPDF } from '@renderer/components/BookCatalogPDF'
import type { Book } from '@renderer/types/book'
import Logo from '../assets/images/logo.svg'
import Papa from 'papaparse'
import PageTitle from '@renderer/components/ui/page-title'

export const Route = createFileRoute('/settings')({
  component: Settings
})

function Settings() {
  const [isExporting, setIsExporting] = useState(false)
  const [googleClientId, setGoogleClientId] = useState('')
  const [googleClientSecret, setGoogleClientSecret] = useState('')
  const [enableEmails, setEnableEmails] = useState(false)
  const [isSavingSettings, setIsSavingSettings] = useState(false)

  // Fetch settings on mount
  useEffect(() => {
    let mounted = true
    window.api.settings.get().then((settings) => {
      if (mounted) {
        setGoogleClientId(settings.googleClientId || '')
        setGoogleClientSecret(settings.googleClientSecret || '')
        setEnableEmails(settings.enableEmails || false)
      }
    })
    return () => {
      mounted = false
    }
  }, [])

  const handleSaveSettings = async () => {
    setIsSavingSettings(true)
    try {
      await window.api.settings.update({ googleClientId, googleClientSecret, enableEmails })
      alert('Settings saved successfully!')
    } catch (error) {
      console.error('Error saving settings:', error)
      alert('Failed to save settings.')
    } finally {
      setIsSavingSettings(false)
    }
  }

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

  const handleClearDatabase = async () => {
    const confirmed = confirm(
      'Are you absolutely sure you want to clear the entire database?\n\nThis will permanently delete all books, tags, loans, and users. This action CANNOT be undone. Please ensure you have exported a backup first.'
    )
    if (!confirmed) return

    try {
      const result = await window.electron.ipcRenderer.invoke('database:clear')
      if (result.success) {
        alert('Database cleared successfully! The application will now reload.')
        window.location.reload()
      } else {
        alert(`Failed to clear database: ${result.error}`)
      }
    } catch (error) {
      console.error('Error clearing database:', error)
      alert('Failed to clear database. Please try again.')
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
      <PageTitle title="Settings" />

      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="flex items-center">
            <SettingsIcon className="size-5 mr-2" />
            Google OAuth Configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">
            Configure your Google OAuth credentials to enable Google Sign-In for users.
          </p>
          <div className="flex flex-col gap-4 max-w-xl">
            <div className="grid gap-2">
              <Label htmlFor="clientId">Client ID</Label>
              <Input
                id="clientId"
                type="text"
                placeholder="Enter Google Client ID"
                value={googleClientId}
                onChange={(e) => setGoogleClientId(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="clientSecret">Client Secret</Label>
              <Input
                id="clientSecret"
                type="password"
                placeholder="Enter Google Client Secret"
                value={googleClientSecret}
                onChange={(e) => setGoogleClientSecret(e.target.value)}
              />
            </div>

            <div className="flex items-center space-x-2 pt-2 pb-2">
              <input
                type="checkbox"
                id="enableEmails"
                className="w-4 h-4 rounded border-gray-300"
                checked={enableEmails}
                onChange={(e) => setEnableEmails(e.target.checked)}
              />
              <Label htmlFor="enableEmails" className="cursor-pointer">
                Enable Transactional Emails
              </Label>
            </div>
            <p className="text-sm text-muted-foreground -mt-2">
              Automatically send emails for new rentals, extensions, and returns from the logged-in
              Google account.
            </p>

            <Button onClick={handleSaveSettings} disabled={isSavingSettings} className="w-fit mt-2">
              {isSavingSettings ? (
                <>
                  <Spinner className="size-4 mr-2" />
                  Saving...
                </>
              ) : (
                'Save Configuration'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

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

      <Card className="mt-4 border-destructive/50">
        <CardHeader>
          <CardTitle className="text-destructive flex items-center">
            <AlertTriangle className="size-5 mr-2" />
            Danger Zone
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Permanently delete all data from the database. This action cannot be undone.
          </p>
          <Button variant="destructive" className="mt-4" onClick={handleClearDatabase}>
            <AlertTriangle className="size-4 mr-2" />
            Clear Database
          </Button>
        </CardContent>
      </Card>
    </>
  )
}
