import { mkdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { verifyLockfile, verifyPatch, root } from './braces-patch.mjs'

const severities = ['info', 'low', 'moderate', 'high', 'critical']
const record = (value) => value !== null && typeof value === 'object' && !Array.isArray(value)
const count = (value) => Number.isSafeInteger(value) && value >= 0
const strings = (value) => Array.isArray(value) && value.every((item) => typeof item === 'string' && item.length > 0)
const fail = () => { throw new Error('Incomplete or inconsistent npm audit report') }

export function validateReport(report, lock) {
  if (!record(report) || report.error || report.auditReportVersion !== 2 || !record(report.vulnerabilities)
    || !record(report.metadata) || !record(report.metadata.vulnerabilities) || !record(report.metadata.dependencies)) fail()
  const verifiedNodes = verifyLockfile(lock)
  const totals = report.metadata.vulnerabilities
  const actual = Object.fromEntries(severities.map((severity) => [severity, 0]))
  for (const severity of [...severities, 'total']) if (!count(totals[severity])) fail()
  const dependencies = report.metadata.dependencies
  for (const type of ['prod', 'dev', 'optional', 'peer', 'peerOptional', 'total']) if (!count(dependencies[type])) fail()
  const categories = ['prod', 'dev', 'optional', 'peer', 'peerOptional']
  if (categories.some((type) => dependencies[type] > dependencies.total)
    || categories.reduce((sum, type) => sum + dependencies[type], 0) < dependencies.total) fail()
  // npm's category counts overlap, but total counts all non-root lock entries.
  if (dependencies.total !== Object.keys(lock.packages).filter(Boolean).length) fail()
  for (const [name, entry] of Object.entries(report.vulnerabilities)) {
    if (!record(entry) || entry.name !== name || !severities.includes(entry.severity) || typeof entry.isDirect !== 'boolean'
      || typeof entry.range !== 'string' || !strings(entry.effects) || !strings(entry.nodes) || entry.nodes.length === 0
      || new Set(entry.nodes).size !== entry.nodes.length || !Array.isArray(entry.via) || entry.via.length === 0) fail()
    if (typeof entry.fixAvailable !== 'boolean' && (!record(entry.fixAvailable)
      || typeof entry.fixAvailable.name !== 'string' || typeof entry.fixAvailable.version !== 'string'
      || typeof entry.fixAvailable.isSemVerMajor !== 'boolean')) fail()
    for (const node of entry.nodes) {
      if (node.includes('\\') || node.split('/').some((part) => part === '.' || part === '..')
        || !Object.hasOwn(lock.packages, node) || !node.endsWith(`node_modules/${name}`)) fail()
    }
    for (const via of entry.via) {
      if (typeof via === 'string') {
        if (!Object.hasOwn(report.vulnerabilities, via)) fail()
      } else if (!record(via) || !count(via.source) || typeof via.name !== 'string' || typeof via.dependency !== 'string'
        || typeof via.title !== 'string' || typeof via.url !== 'string' || !severities.includes(via.severity)
        || typeof via.range !== 'string') fail()
    }
    if (name === 'braces' && (entry.nodes.length !== verifiedNodes.length
      || entry.nodes.some((node) => !verifiedNodes.includes(node)))) {
      throw new Error('Audit report contains an unverified braces installation')
    }
    actual[entry.severity] += 1
  }
  for (const severity of severities) if (totals[severity] !== actual[severity]) fail()
  if (totals.total !== Object.keys(report.vulnerabilities).length
    || totals.total !== severities.reduce((sum, severity) => sum + totals[severity], 0)) fail()
}

export function remainingAdvisories(report, lock = JSON.parse(readFileSync(resolve(root, 'package-lock.json')))) {
  validateReport(report, lock)
  const vulnerabilities = report.vulnerabilities
  const mitigated = (name, visiting = new Set()) => {
    if (visiting.has(name)) return false
    const entry = vulnerabilities[name]
    if (!entry) return false
    const next = new Set([...visiting, name])
    return entry.via.every((via) => typeof via === 'string'
      ? mitigated(via, next)
      : name === 'braces' && via.name === 'braces' && via.dependency === 'braces'
        && via.range === '<=3.0.3' && via.url === 'https://github.com/advisories/GHSA-vfj7-8cjw-p6xm')
  }
  return Object.keys(vulnerabilities).filter((name) => !mitigated(name))
}

export function audit() {
  const output = resolve(root, '.audit')
  mkdirSync(output, { recursive: true })
  if (!process.env.npm_execpath) throw new Error('Run this audit through npm run audit')
  const result = spawnSync(process.execPath, [process.env.npm_execpath, 'audit', '--json', '--audit-level=high'], {
    cwd: root, encoding: 'utf8', maxBuffer: 10 * 1024 * 1024,
  })
  // Preserve the exact scanner response before any report/source validation.
  writeFileSync(resolve(output, 'npm-audit.raw.json'), result.stdout ?? '')
  writeFileSync(resolve(output, 'npm-audit.stderr.log'), result.stderr ?? '')
  writeFileSync(resolve(output, 'execution.json'), JSON.stringify({ status: result.status, error: result.error?.message ?? null }, null, 2))
  if (result.error || ![0, 1].includes(result.status)) throw new Error(`npm audit failed: ${result.stderr}`)
  verifyPatch()
  const report = JSON.parse(result.stdout)
  const remaining = remainingAdvisories(report)
  // Preserve the project's original npm audit --audit-level=high threshold.
  const blocked = remaining.filter((name) => ['high', 'critical'].includes(report.vulnerabilities[name].severity))
  if (blocked.length) throw new Error(`Unmitigated dependency advisories: ${blocked.join(', ')}`)
  console.log(`Audit passed at high threshold: ${Object.keys(report.vulnerabilities).length - remaining.length} graph entries covered by the verified braces patch; ${remaining.length} lower-severity entries remain. Raw report: .audit/npm-audit.raw.json`)
}

if (process.argv[1] && realpathSync(resolve(process.argv[1])) === fileURLToPath(import.meta.url)) audit()
