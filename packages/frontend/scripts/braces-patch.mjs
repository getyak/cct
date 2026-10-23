import { createHash } from 'node:crypto'
import { readFileSync, realpathSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

export const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(import.meta.url)
const loadManifest = () => JSON.parse(readFileSync(resolve(root, 'patches/braces-source.json')))
export const bracesDir = resolve(root, 'node_modules/braces')
const digest = (path) => createHash('sha256').update(readFileSync(path)).digest('hex')

export function verifySourceFiles(directory) {
  const manifest = loadManifest()
  for (const [file, hashes] of Object.entries(manifest.files)) {
    if (digest(resolve(directory, file)) !== hashes.patched) {
      throw new Error(`braces source verification failed: ${file}`)
    }
  }
}

export function verifyLockfile(lock) {
  const manifest = loadManifest()
  if (!lock || !lock.packages || Array.isArray(lock.packages)) throw new Error('Missing dependency lock packages')
  const copies = Object.entries(lock.packages).filter(([path, entry]) =>
    /(^|\/)node_modules\/braces$/.test(path) || entry.name === 'braces')
  if (copies.length !== 1 || copies[0][0] !== 'node_modules/braces') {
    throw new Error('Unverified braces copy in dependency lock')
  }
  const entry = copies[0][1]
  if (entry.version !== '3.0.3' || entry.integrity !== manifest.npm_integrity) {
    throw new Error('Unexpected locked braces source')
  }
  return ['node_modules/braces']
}

export function verifyPatch() {
  const manifest = loadManifest()
  const lock = JSON.parse(readFileSync(resolve(root, 'package-lock.json')))
  verifyLockfile(lock)
  if (digest(resolve(root, 'patches/braces@3.0.3.patch')) !== manifest.patch_sha256) {
    throw new Error('braces patch digest changed')
  }
  const installed = JSON.parse(readFileSync(resolve(bracesDir, 'package.json')))
  if (installed.version !== '3.0.3') throw new Error('Unexpected braces version')
  verifySourceFiles(bracesDir)
  // Verify every locked direct consumer, including chokidar and micromatch.
  for (const [path, entry] of Object.entries(lock.packages)) {
    if (!entry.dependencies?.braces && !entry.optionalDependencies?.braces) continue
    const consumer = createRequire(resolve(root, path, 'package.json'))
    if (realpathSync(consumer.resolve('braces/package.json')) !== realpathSync(resolve(bracesDir, 'package.json'))) {
      throw new Error(`${path} resolves an unverified braces installation`)
    }
  }
  return true
}

export function applyPatch() {
  const manifest = loadManifest()
  if (digest(resolve(root, 'patches/braces@3.0.3.patch')) !== manifest.patch_sha256) {
    throw new Error('braces patch digest changed')
  }
  const states = Object.entries(manifest.files).map(([file, hashes]) => {
    const actual = digest(resolve(bracesDir, file))
    if (actual !== hashes.original && actual !== hashes.patched) {
      throw new Error(`Unexpected upstream braces source: ${file}`)
    }
    return actual === hashes.patched
  })
  if (!states.every(Boolean)) {
    // An interrupted or partially modified installation must not be accepted.
    for (const [file, hashes] of Object.entries(manifest.files)) {
      if (digest(resolve(bracesDir, file)) !== hashes.original) throw new Error('Partial braces patch')
    }
    const result = spawnSync('git', ['apply', '--directory=packages/frontend/node_modules/braces', 'packages/frontend/patches/braces@3.0.3.patch'], {
      cwd: resolve(root, '../..'), encoding: 'utf8',
    })
    if (result.status !== 0) throw new Error(`Cannot apply braces patch: ${result.stderr}`)
  }
  verifyPatch()
}

if (process.argv[1] && realpathSync(resolve(process.argv[1])) === fileURLToPath(import.meta.url)) {
  if (process.argv[2] === 'apply') applyPatch()
  else verifyPatch()
}
