import { spawnSync } from 'node:child_process'
import process from 'node:process'

if (process.platform === 'win32') {
  const cwd = process.cwd()
  const fixed = cwd.replace(/^([a-z]):/, (_, drive) => `${drive.toUpperCase()}:`)
  if (fixed !== cwd) {
    process.chdir(fixed)
  }
}

const args = process.argv.slice(2)
const result = spawnSync('vitepress', args, {
  stdio: 'inherit',
  shell: true,
  cwd: process.cwd(),
  env: process.env
})

process.exit(result.status ?? 1)
