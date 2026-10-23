import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { verifyPatch, root } from './braces-patch.mjs'

export function remainingAdvisories(report) {
  if (report.error || !report.vulnerabilities) throw new Error('npm audit report unavailable')
  const vulnerabilities = report.vulnerabilities
  const mitigated = (name, visiting = new Set()) => {
    if (visiting.has(name)) return false
    const entry = vulnerabilities[name]
    if (!entry || !Array.isArray(entry.via) || !entry.via.length) return false
    const next = new Set([...visiting, name])
    return entry.via.every((via) => typeof via === 'string'
      ? mitigated(via, next)
      : name === 'braces' && via.name === 'braces' && via.url === 'https://github.com/advisories/GHSA-vfj7-8cjw-p6xm')
  }
  return Object.keys(vulnerabilities).filter((name) => !mitigated(name))
}

export function audit() {
  verifyPatch()
  if (!process.env.npm_execpath) throw new Error('Run this audit through npm run audit')
  const result = spawnSync(process.execPath, [process.env.npm_execpath, 'audit', '--json'], {
    cwd: root, encoding: 'utf8', maxBuffer: 10 * 1024 * 1024,
  })
  if (result.error || ![0, 1].includes(result.status)) throw new Error(`npm audit failed: ${result.stderr}`)
  const report = JSON.parse(result.stdout)
  const remaining = remainingAdvisories(report)
  if (remaining.length) throw new Error(`Unmitigated dependency advisories: ${remaining.join(', ')}`)
  console.log(`Audit passed: ${Object.keys(report.vulnerabilities).length} dependency graph entries are covered by the verified braces depth patch; no other advisories.`)
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) audit()
