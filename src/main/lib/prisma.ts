import 'dotenv/config'
import { createRequire } from 'module'
import { PrismaPg } from '@prisma/adapter-pg'
import { getSettings } from './settings.js'

const require = createRequire(import.meta.url)
const { PrismaClient } = require('../../generated/prisma/index.js')

const settings = getSettings()
const connectionString = process.env.DATABASE_URL || settings.databaseUrl || ''
process.env.DATABASE_URL = connectionString

export const isDbConfigured = !!connectionString

let prisma
if (isDbConfigured) {
  const adapter = new PrismaPg({ connectionString })
  prisma = new PrismaClient({ adapter })
} else {
  prisma = new Proxy(
    {},
    {
      get: function (_target, prop) {
        if (prop === '$disconnect') return async () => {}
        throw new Error('Database URL is not configured. Please set it in Settings.')
      }
    }
  )
}

export { prisma }
