import { app, BrowserWindow } from 'electron'
import { google } from 'googleapis'
import * as http from 'http'
import * as url from 'url'
import * as fs from 'fs'
import * as path from 'path'
import { getSettings } from './settings'

let oauth2Client: InstanceType<typeof google.auth.OAuth2> | null = null
let currentUser: { name: string; email: string; token: unknown } | null = null
let isRestoring = false

const TOKENS_PATH = path.join(app.getPath('userData'), 'auth-tokens.json')

function saveTokens(tokens: unknown, user: { name: string; email: string }) {
  try {
    const dir = path.dirname(TOKENS_PATH)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(TOKENS_PATH, JSON.stringify({ tokens, user }, null, 2), 'utf-8')
  } catch (e) {
    console.error('Failed to save auth tokens:', e)
  }
}

function loadTokens(): { tokens: unknown; user: { name: string; email: string } } | null {
  try {
    if (fs.existsSync(TOKENS_PATH)) {
      return JSON.parse(fs.readFileSync(TOKENS_PATH, 'utf-8'))
    }
  } catch (e) {
    console.error('Failed to load auth tokens:', e)
  }
  return null
}

function deleteTokens() {
  try {
    if (fs.existsSync(TOKENS_PATH)) fs.unlinkSync(TOKENS_PATH)
  } catch (e) {
    console.error('Failed to delete auth tokens:', e)
  }
}

export function getOAuthClient() {
  if (!oauth2Client) {
    const { googleClientId, googleClientSecret } = getSettings()
    oauth2Client = new google.auth.OAuth2(
      googleClientId,
      googleClientSecret,
      'http://127.0.0.1:8081/oauth2callback'
    )
  }
  return oauth2Client
}

export const authController = {
  login: async () => {
    return new Promise<{ success: boolean; user?: Record<string, unknown> | null; error?: string }>(
      (resolve) => {
        const { googleClientId, googleClientSecret } = getSettings()
        if (!googleClientId || !googleClientSecret) {
          resolve({
            success: false,
            error: 'Missing Google OAuth configuration. Please set it in the Settings page.'
          })
          return
        }

        const client = getOAuthClient()
        const scopes = [
          'https://www.googleapis.com/auth/userinfo.profile',
          'https://www.googleapis.com/auth/userinfo.email',
          'https://www.googleapis.com/auth/admin.directory.user.readonly',
          'https://www.googleapis.com/auth/gmail.send'
        ]

        const authUrl = client.generateAuthUrl({
          access_type: 'offline',
          scope: scopes,
          prompt: 'consent'
        })

        const authWindow = new BrowserWindow({
          width: 600,
          height: 700,
          show: false,
          webPreferences: {
            nodeIntegration: false,
            contextIsolation: true
          }
        })

        // Start local server to receive callback
        const server = http
          .createServer(async (req, res) => {
            try {
              if (req.url && req.url.startsWith('/oauth2callback')) {
                const qs = new url.URL(req.url, 'http://127.0.0.1:8081').searchParams
                const code = qs.get('code')

                if (code) {
                  const { tokens } = await client.getToken(code)
                  client.setCredentials(tokens)

                  const oauth2 = google.oauth2({ version: 'v2', auth: client })
                  const userInfo = await oauth2.userinfo.get()

                  const userData = {
                    name: userInfo.data.name || '',
                    email: userInfo.data.email || ''
                  }
                  currentUser = {
                    name: userData.name,
                    email: userData.email,
                    token: tokens as unknown as Record<string, unknown>
                  }

                  saveTokens(tokens, userData)

                  res.end('Authentication successful! You can close this window now.')

                  authWindow.close()
                  server.close()
                  resolve({ success: true, user: currentUser })
                } else {
                  res.end('Authentication failed!')
                  server.close()
                  resolve({ success: false, error: 'No code provided' })
                }
              }
            } catch (e: unknown) {
              console.error(e)
              res.end('Authentication error!')
              server.close()
              const msg = e instanceof Error ? e.message : 'Unknown error'
              resolve({ success: false, error: msg })
            }
          })
          .on('error', (e: Error) => {
            console.error('Local server error:', e)
            resolve({ success: false, error: 'Local server error: ' + e.message })
            authWindow.close()
          })
          .listen(8081, () => {
            authWindow.loadURL(authUrl)
            authWindow.show()
          })

        authWindow.on('closed', () => {
          if (server.listening) {
            server.close()
            if (!currentUser) {
              resolve({ success: false, error: 'Window closed before auth finished' })
            }
          }
        })
      }
    )
  },

  logout: async () => {
    currentUser = null
    deleteTokens()
    if (oauth2Client) {
      oauth2Client.revokeCredentials()
      oauth2Client = null
    }
    return { success: true }
  },

  getStatus: async () => {
    if (currentUser) {
      return { loggedIn: true, user: currentUser }
    }

    if (isRestoring) return { loggedIn: false }

    isRestoring = true
    try {
      const saved = loadTokens()
      if (saved) {
        const client = getOAuthClient()
        if (client) {
          client.setCredentials(saved.tokens as { access_token?: string; refresh_token?: string })
          const oauth2 = google.oauth2({ version: 'v2', auth: client })
          await oauth2.userinfo.get()
          currentUser = {
            name: saved.user.name,
            email: saved.user.email,
            token: saved.tokens
          }
          return { loggedIn: true, user: currentUser }
        }
      }
    } catch (e) {
      console.error('Failed to restore auth session:', e)
      deleteTokens()
    } finally {
      isRestoring = false
    }

    return { loggedIn: false }
  },

  searchUsers: async (query: string): Promise<Array<{ name: string; email: string }>> => {
    if (!currentUser) return []
    try {
      const client = getOAuthClient()
      const service = google.admin({ version: 'directory_v1', auth: client })
      const res = await service.users.list({
        customer: 'my_customer',
        maxResults: 10,
        query: query
      })
      return (res.data.users || []).map((u) => ({
        name: u.name?.fullName || '',
        email: u.primaryEmail || ''
      }))
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error(`Error searching Google Directory: ${error.message}`)
      } else {
        console.error('Error searching Google Directory:', error)
      }
      return []
    }
  },

  getUserDetails: async (email: string) => {
    if (!currentUser) return null
    try {
      const client = getOAuthClient()
      const service = google.admin({ version: 'directory_v1', auth: client })
      const res = await service.users.get({ userKey: email })
      return {
        name: res.data.name?.fullName || '',
        orgUnitPath: res.data.orgUnitPath || ''
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error(`Error fetching user details from Google Directory: ${error.message}`)
      } else {
        console.error('Error fetching user details from Google Directory:', error)
      }
      return null
    }
  }
}

export async function fetchGoogleUserName(email: string): Promise<string | null> {
  if (!currentUser) return null
  try {
    const client = getOAuthClient()
    const service = google.admin({ version: 'directory_v1', auth: client })
    const res = await service.users.get({ userKey: email })
    return res.data.name?.fullName || null
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error(`Error fetching user from Google Directory: ${error.message}`)
    } else {
      console.error('Error fetching user from Google Directory:', error)
    }
    return null
  }
}

export async function sendTransactionEmail(
  to: string,
  subject: string,
  messageText: string
): Promise<boolean> {
  if (!currentUser) return false
  try {
    const client = getOAuthClient()
    const gmail = google.gmail({ version: 'v1', auth: client })

    // Construct email according to RFC 2822
    const utf8Subject = `=?utf-8?B?${Buffer.from(subject).toString('base64')}?=`
    const messageParts = [
      `To: ${to}`,
      `Subject: ${utf8Subject}`,
      'Content-Type: text/plain; charset=utf-8',
      'MIME-Version: 1.0',
      '',
      messageText
    ]
    const message = messageParts.join('\n')
    const encodedMessage = Buffer.from(message)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')

    await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedMessage
      }
    })
    return true
  } catch (error) {
    console.error('Failed to send email:', error)
    return false
  }
}
