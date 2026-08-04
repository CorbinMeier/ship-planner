import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { drizzle } from 'drizzle-orm/d1'
import { users } from './db/schema'
import type { Bindings, Variables } from './types'

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>().basePath('/api')

app.use('*', cors())

app.get('/health', (c) => c.json({ ok: true }))

app.get('/users/count', async (c) => {
  const db = drizzle(c.env.DB)
  const rows = await db.select().from(users).all()
  return c.json({ count: rows.length })
})

export default app
