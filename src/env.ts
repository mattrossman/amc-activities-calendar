import dotenv from "dotenv"
import { resolve } from "node:path"
import { z } from "zod"

dotenv.config({ path: resolve(import.meta.dirname, "../.env") })

/**
 * Populate variables in `.env` file.
 * Define schema here then access on `env` object.
 *
 * import { env } from "~/env"
 */
const schema = z.object({
  MY_VARIABLE: z.string().default("world"),
})

// eslint-disable-next-line no-restricted-properties
const parsed = schema.safeParse(process.env)

if (!parsed.success) {
  console.error(
    "❌ Invalid environment variables:",
    JSON.stringify(parsed.error.format(), null, 4)
  )
  process.exit(1)
}

export const env = parsed.data
