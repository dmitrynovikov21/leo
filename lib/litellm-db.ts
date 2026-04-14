import { Pool } from 'pg'

const litellmDbUrl = process.env.LITELLM_DATABASE_URL

let pool: Pool | null = null

export function getLitellmPool(): Pool | null {
  if (!litellmDbUrl) return null
  if (!pool) {
    pool = new Pool({ connectionString: litellmDbUrl, max: 3 })
  }
  return pool
}
