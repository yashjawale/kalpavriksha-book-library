import { useEffect, useState } from 'react'
import { Button } from '@renderer/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@renderer/components/ui/dialog'
import { SidebarMenuButton, SidebarMenuItem } from '@renderer/components/ui/sidebar'
import { Download, ExternalLink } from 'lucide-react'

const LATEST_RELEASE_API =
  'https://api.github.com/repos/yashjawale/kalpavriksha-library/releases/latest'
const RELEASES_PAGE = 'https://github.com/yashjawale/kalpavriksha-library/releases/latest'
const PREVIEW_UPDATE_KEY = 'preview-update-notice'
interface GitHubRelease {
  tag_name: string
  html_url: string
  prerelease: boolean
  assets: Array<{ name: string; browser_download_url: string }>
}

function compareVersions(currentVersion: string, latestVersion: string): number {
  const parse = (version: string) =>
    version
      .replace(/^v/i, '')
      .split(/[.+-]/)
      .slice(0, 3)
      .map((part) => Number.parseInt(part, 10) || 0)
  const current = parse(currentVersion)
  const latest = parse(latestVersion)

  for (let index = 0; index < 3; index += 1) {
    if (latest[index] !== current[index]) return latest[index] - current[index]
  }

  return 0
}

export function UpdateNotice() {
  const [open, setOpen] = useState(false)
  const [update, setUpdate] = useState<{
    version: string
    releaseUrl: string
    downloadUrl: string
    fileName: string | null
  } | null>(null)

  useEffect(() => {
    let cancelled = false

    const checkForUpdate = async () => {
      try {
        if (import.meta.env.DEV && localStorage.getItem(PREVIEW_UPDATE_KEY) === '1') {
          setUpdate({
            version: '99.0.0 (preview)',
            releaseUrl: RELEASES_PAGE,
            downloadUrl: RELEASES_PAGE,
            fileName: 'kalpavriksha-library-99.0.0.msi'
          })
          return
        }

        const [platform, currentVersion] = await Promise.all([
          window.api.app.getPlatform(),
          window.api.app.getVersion()
        ])
        if (platform !== 'win32') return

        const response = await fetch(LATEST_RELEASE_API, {
          headers: { Accept: 'application/vnd.github+json' }
        })
        if (!response.ok) return

        const release = (await response.json()) as GitHubRelease
        if (
          cancelled ||
          release.prerelease ||
          compareVersions(currentVersion, release.tag_name) >= 0
        ) {
          return
        }

        const installer = release.assets.find((asset) => asset.name.toLowerCase().endsWith('.msi'))
        setUpdate({
          version: release.tag_name.replace(/^v/i, ''),
          releaseUrl: release.html_url || RELEASES_PAGE,
          downloadUrl: installer?.browser_download_url || release.html_url || RELEASES_PAGE,
          fileName: installer?.name ?? null
        })
      } catch (error) {
        // Updates are optional; network/API failures should not interrupt app use.
        console.warn('Unable to check for app updates:', error)
      }
    }

    void checkForUpdate()
    return () => {
      cancelled = true
    }
  }, [])

  if (!update) return null

  return (
    <>
      <SidebarMenuItem>
        <SidebarMenuButton
          onClick={() => setOpen(true)}
          className="animate-pulse border border-yellow-400 bg-yellow-100 font-semibold text-yellow-950 hover:bg-yellow-200 dark:border-yellow-700 dark:bg-yellow-950/60 dark:text-yellow-200 dark:hover:bg-yellow-900/70"
        >
          <Download />
          <span>Update available · v{update.version}</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="border-primary/20 bg-card p-10 sm:max-w-xl sm:p-12">
          <DialogHeader className="space-y-4">
            <DialogTitle className="text-2xl font-bold text-primary sm:text-3xl">
              Update available: v{update.version}
            </DialogTitle>
            <DialogDescription className="text-base leading-relaxed">
              <ol className="list-decimal space-y-2 pl-5">
                <li>Download the Windows MSI installer below.</li>
                <li>
                  When the download finishes, quit Kalpavriksha Library completely before installing
                  the update.
                </li>
                <li>
                  Run the downloaded {update.fileName ? <strong>{update.fileName}</strong> : 'file'}{' '}
                  to update the app.
                </li>
                <li>Reopen Kalpavriksha Library from your desktop shortcut or Start menu.</li>
              </ol>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-2 sm:justify-start">
            <Button asChild>
              <a href={update.downloadUrl} target="_blank" rel="noreferrer">
                Download Windows MSI
                <ExternalLink />
              </a>
            </Button>
          </DialogFooter>
          {update.downloadUrl === update.releaseUrl && (
            <a
              href={RELEASES_PAGE}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-primary underline underline-offset-4"
            >
              View release
            </a>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
