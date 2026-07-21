import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@renderer/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@renderer/components/ui/card'
import { Input } from '@renderer/components/ui/input'
import { Label } from '@renderer/components/ui/label'
import { createFileRoute } from '@tanstack/react-router'
import { Spinner } from '@renderer/components/ui/spinner'
import { Download, Settings as SettingsIcon } from 'lucide-react'
import { pdf } from '@react-pdf/renderer'
import { BookCatalogPDF } from '@renderer/components/BookCatalogPDF'
import type { Book } from '@renderer/types/book'
import Logo from '../assets/images/logo.svg'
import Papa from 'papaparse'
import PageTitle from '@renderer/components/ui/page-title'
import { toast } from 'sonner'
import { format } from 'date-fns'

export const Route = createFileRoute('/settings')({
  component: Settings
})

function Settings() {
  const [isExporting, setIsExporting] = useState(false)
  const [googleClientId, setGoogleClientId] = useState('')
  const [googleClientSecret, setGoogleClientSecret] = useState('')
  const [enableEmails, setEnableEmails] = useState(false)
  const [databaseUrl, setDatabaseUrl] = useState('')
  const [isSavingSettings, setIsSavingSettings] = useState(false)

  // Fetch settings on mount
  useEffect(() => {
    let mounted = true
    window.api.settings.get().then((settings) => {
      if (mounted) {
        setGoogleClientId(settings.googleClientId || '')
        setGoogleClientSecret(settings.googleClientSecret || '')
        setEnableEmails(settings.enableEmails || false)
        setDatabaseUrl(settings.databaseUrl || '')
      }
    })
    return () => {
      mounted = false
    }
  }, [])

  const handleSaveSettings = async () => {
    setIsSavingSettings(true)
    try {
      await window.api.settings.update({
        googleClientId,
        googleClientSecret,
        enableEmails,
        databaseUrl
      })
      toast.success('Settings saved successfully!')
    } catch (error) {
      console.error('Error saving settings:', error)
      toast.error('Failed to save settings.')
    } finally {
      setIsSavingSettings(false)
    }
  }

  const { data: books = [], isLoading } = useQuery<Book[]>({
    queryKey: ['books'],
    queryFn: async () => {
      const result = await window.api.books.getAll(1, Number.MAX_SAFE_INTEGER)
      return result.books
    }
  })

  const handleExportCSV = () => {
    try {
      // Prepare data for CSV
      const csvData = books.map((book) => ({
        Title: book.title,
        ISBN: book.isbn,
        Stock: book.totalStock,
        'Date Added': format(new Date(book.createdAt), 'dd/MM/yy')
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
      toast.error('Failed to export CSV. Please try again.')
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
      toast.error('Failed to export PDF. Please try again.')
    } finally {
      setIsExporting(false)
    }
  }

  // Handlers for removed features were deleted.

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
              <Label htmlFor="databaseUrl">Supabase Database URL</Label>
              <Input
                id="databaseUrl"
                type="password"
                placeholder="postgresql://postgres.[project]:[pwd]..."
                value={databaseUrl}
                onChange={(e) => setDatabaseUrl(e.target.value)}
              />
              <p className="text-sm text-muted-foreground">
                Requires restart after changing. E.g.
                postgresql://postgres.xyz:password@aws-0-eu-central-1.pooler.supabase.com:6543/postgres
              </p>
            </div>

            <div className="grid gap-2 mt-2">
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
    </>
  )
}
