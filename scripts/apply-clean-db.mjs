import { execSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'

// Prepares the packaged Electron app (release/win-unpacked) for customer
// delivery: regenerates a clean database (admin login + reference data only)
// and swaps it into the package, then clears any uploaded files.
const root = process.cwd()
const cleanDb = join(root, 'prisma', 'clean-delivery.db')
const standalone = join(root, 'release', 'win-unpacked', 'resources', 'standalone')
const pkgPrisma = join(standalone, 'prisma')
const pkgUploads = join(standalone, 'private-uploads')

if (!existsSync(pkgPrisma)) {
  console.error('Packaged app not found at release/win-unpacked. Run "npm run electron:build:dir" first.')
  process.exit(1)
}

// 1. Always regenerate a fresh clean DB so no stale data ships.
console.log('Generating clean delivery database...')
rmSync(cleanDb, { force: true })
rmSync(`${cleanDb}-journal`, { force: true })
const env = { ...process.env, DATABASE_URL: 'file:./clean-delivery.db' }
execSync('npx prisma db push --skip-generate', { stdio: 'inherit', env, cwd: root })
execSync('npx tsx prisma/seed-clean.ts', { stdio: 'inherit', env, cwd: root })

// 2. Swap the clean DB into the packaged app.
try {
  for (const f of ['dev.db', 'dev.db-journal', 'dev.db-wal', 'dev.db-shm']) {
    rmSync(join(pkgPrisma, f), { force: true })
  }
  copyFileSync(cleanDb, join(pkgPrisma, 'dev.db'))
} catch (e) {
  if (e && e.code === 'EPERM') {
    console.error('\nCould not replace the database: it is locked by a running process.')
    console.error('Close the "Riman HR Management" desktop app (and any running instance) and re-run this command.')
    process.exit(1)
  }
  throw e
}
console.log('Swapped clean database into the packaged app.')

// 3. Clear packaged uploads so no test files ship.
rmSync(pkgUploads, { recursive: true, force: true })
mkdirSync(pkgUploads, { recursive: true })
console.log('Cleared packaged private-uploads.')

console.log('')
console.log('Packaged app is ready for delivery: release/win-unpacked')
console.log('Admin login: admin@riman.com / Admin@123')
