import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { cpSync, mkdtempSync, readFileSync, rmSync, appendFileSync, mkdirSync, writeFileSync, symlinkSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import test from 'node:test'
import { applyPatch, root, verifyPatch, verifyLockfile, verifyInstalledGraph } from './braces-patch.mjs'
import { remainingAdvisories } from './audit.mjs'

const require = createRequire(import.meta.url)
const dependencyLock = JSON.parse(readFileSync(resolve(root, 'package-lock.json')))
const manifest = JSON.parse(readFileSync(resolve(root, 'patches/braces-source.json')))
const legacyLock = structuredClone(dependencyLock)
legacyLock.packages['node_modules/braces'] = { version: '3.0.3', integrity: manifest.npm_integrity }
legacyLock.packages['node_modules/micromatch'] = { version: '4.0.8', dependencies: { braces: '^3.0.3' } }
const temporary = (run) => {
  const directory = mkdtempSync(resolve(tmpdir(), 'cct-security-'))
  try { return run(directory) } finally { rmSync(directory, { recursive: true, force: true }) }
}
const packageAt = (directory, path, name = 'braces') => {
  mkdirSync(resolve(directory, path), { recursive: true })
  writeFileSync(resolve(directory, path, 'package.json'), JSON.stringify({ name, version: '3.0.3' }))
}

test('Tailwind 4 installation has no braces and the retained patch is a verified, idempotent no-op', () => {
  assert.deepEqual(verifyLockfile(dependencyLock), [])
  assert.deepEqual(verifyInstalledGraph(dependencyLock), [])
  assert.equal(verifyPatch(), true)
  assert.doesNotThrow(applyPatch)
  assert.doesNotThrow(applyPatch)
})

test('missing, malformed and dangling braces lock graphs fail closed', () => {
  for (const lock of [null, {}, { packages: {} }, { lockfileVersion: 3, packages: [] },
    { lockfileVersion: 3, packages: { '': {}, 'node_modules/example': null } }]) {
    assert.throws(() => verifyLockfile(lock), /Missing dependency lock packages/)
  }
  for (const dependency of [{ braces: '^3.0.3' }, { alias: 'npm:braces@3.0.3' }]) {
    for (const group of ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies']) {
      const lock = structuredClone(dependencyLock)
      lock.packages['node_modules/example'] = { [group]: dependency }
      assert.throws(() => verifyLockfile(lock), /Unverified braces reference/)
    }
  }
  for (const references of [[], { alias: false }]) {
    const lock = structuredClone(dependencyLock)
    lock.packages['node_modules/example'] = { dependencies: references }
    assert.throws(() => verifyLockfile(lock), /Malformed dependency lock references/)
  }
})

test('residual, nested, deeply nested, scoped and aliased installed braces cannot use the no-op', () => {
  for (const path of ['node_modules/braces', 'node_modules/example/node_modules/braces',
    'node_modules/example/node_modules/child/node_modules/braces',
    'node_modules/@example/child/node_modules/braces', 'node_modules/braces-alias',
    'node_modules/@example/braces-alias', 'node_modules/@example/.braces-alias']) {
    temporary((directory) => {
      mkdirSync(resolve(directory, 'node_modules'))
      const parts = path.split('/node_modules/')
      for (let i = 0; i < parts.length - 1; i++) packageAt(directory, parts.slice(0, i + 1).join('/node_modules/'), 'example')
      packageAt(directory, path)
      assert.throws(() => verifyInstalledGraph(dependencyLock, directory), /Unverified braces copy/)
    })
  }
})

test('root, package, scope and nested node_modules symlinks are rejected without following external trees', () => {
  for (const path of ['node_modules', 'node_modules/alias', 'node_modules/@example', 'node_modules/example/node_modules']) {
    temporary((directory) => {
      if (path !== 'node_modules') mkdirSync(resolve(directory, 'node_modules'))
      if (path.includes('example/node_modules')) packageAt(directory, 'node_modules/example', 'example')
      symlinkSync(directory, resolve(directory, path), 'dir')
      assert.throws(() => verifyInstalledGraph(dependencyLock, directory), /Unverified installed package symlink/)
    })
  }
})

test('malformed installed manifests cannot hide an unknown or aliased package', () => {
  for (const manifest of [null, {}, [], true, 'braces', { name: '' }]) {
    temporary((directory) => {
      packageAt(directory, 'node_modules/alias')
      writeFileSync(resolve(directory, 'node_modules/alias/package.json'), JSON.stringify(manifest))
      assert.throws(() => verifyInstalledGraph(dependencyLock, directory), /Unverified installed package manifest/)
    })
  }
})

test('an unrelated scoped package named braces is not the unscoped patched package', () => temporary((directory) => {
  packageAt(directory, 'node_modules/@example/braces', '@example/braces')
  assert.deepEqual(verifyInstalledGraph(dependencyLock, directory), [])
}))

test('the retained legacy lock policy still accepts only its exact digest-bound 3.0.3 package', () => {
  assert.deepEqual(verifyLockfile(legacyLock), ['node_modules/braces'])
  for (const mutate of [
    (lock) => { lock.packages['node_modules/braces'].version = '3.0.4' },
    (lock) => { lock.packages['node_modules/braces'].integrity = 'unverified' },
    (lock) => { lock.packages['node_modules/example/node_modules/braces'] = { version: '3.0.3' } },
    (lock) => { lock.packages['node_modules/alias'] = { name: 'braces', version: '3.0.3' } },
  ]) {
    const lock = structuredClone(legacyLock); mutate(lock)
    assert.throws(() => verifyLockfile(lock), /Unexpected locked braces source|Unverified braces copy/)
  }
})

test('a removed dependency does not bypass retained patch digest verification', () => temporary((directory) => {
  cpSync(resolve(root, 'scripts'), resolve(directory, 'scripts'), { recursive: true })
  cpSync(resolve(root, 'patches'), resolve(directory, 'patches'), { recursive: true })
  cpSync(resolve(root, 'package-lock.json'), resolve(directory, 'package-lock.json'))
  mkdirSync(resolve(directory, 'node_modules'))
  writeFileSync(resolve(directory, 'package.json'), '{"type":"module"}')
  const run = () => spawnSync(process.execPath, [resolve(directory, 'scripts/braces-patch.mjs'), 'apply'], { encoding: 'utf8', timeout: 5000 })
  assert.equal(run().status, 0)
  appendFileSync(resolve(directory, 'patches/braces@3.0.3.patch'), '\nmodified fixture\n')
  const rejected = run()
  assert.notEqual(rejected.status, 0)
  assert.match(rejected.stderr, /braces patch digest changed/)
}))

const advisory = { source: 1240992, name: 'braces', dependency: 'braces', severity: 'high', range: '<=3.0.3', title: 'braces stack exhaustion', url: 'https://github.com/advisories/GHSA-vfj7-8cjw-p6xm' }
const entry = (name, via) => ({ name, severity: 'high', isDirect: false, range: '*', effects: [], nodes: [`node_modules/${name}`], fixAvailable: false, via })
const reportFor = (vulnerabilities, lock = dependencyLock) => {
  const counts = { info: 0, low: 0, moderate: 0, high: 0, critical: 0, total: Object.keys(vulnerabilities).length }
  for (const value of Object.values(vulnerabilities)) counts[value.severity] += 1
  const total = Object.keys(lock.packages).filter(Boolean).length
  return { auditReportVersion: 2, vulnerabilities, metadata: { vulnerabilities: counts, dependencies: { prod: total, dev: 0, optional: 0, peer: 0, peerOptional: 0, total } } }
}
const fixture = () => reportFor({ braces: entry('braces', [{ ...advisory }]), micromatch: entry('micromatch', ['braces']), tailwindcss: entry('tailwindcss', ['micromatch']) }, legacyLock)

test('audit accepts a complete empty report, and removed braces cannot claim a legacy exemption', () => {
  assert.deepEqual(remainingAdvisories(reportFor({})), [])
  assert.throws(() => remainingAdvisories(fixture()), /Incomplete or inconsistent|unverified braces/)
  const report = fixture()
  assert.deepEqual(remainingAdvisories(report, legacyLock), [])
  report.vulnerabilities.braces.via.push({ ...advisory, url: 'https://github.com/advisories/unknown' })
  assert.deepEqual(remainingAdvisories(report, legacyLock).sort(), ['braces', 'micromatch', 'tailwindcss'])
  assert.deepEqual(remainingAdvisories(reportFor({ micromatch: entry('micromatch', ['tailwindcss']), tailwindcss: entry('tailwindcss', ['micromatch']) }, legacyLock), legacyLock).sort(), ['micromatch', 'tailwindcss'])
})

test('empty, missing and malformed audit reports still fail closed', () => {
  for (const report of [null, {}, { vulnerabilities: {} }, { auditReportVersion: 2, vulnerabilities: {}, metadata: {} }, { error: 'network failure' }]) assert.throws(() => remainingAdvisories(report), /Incomplete or inconsistent/)
  for (const mutate of [
    (r) => { delete r.metadata.vulnerabilities.high }, (r) => { delete r.metadata.dependencies.total },
    (r) => { r.auditReportVersion = 1 }, (r) => { r.vulnerabilities.braces.via = [] },
    (r) => { r.vulnerabilities.braces.nodes = [] }, (r) => { r.vulnerabilities.braces.via = ['missing-package'] },
    (r) => { r.vulnerabilities.braces.severity = 'unknown' },
  ]) { const report = fixture(); mutate(report); assert.throws(() => remainingAdvisories(report, legacyLock), /Incomplete or inconsistent/) }
})

test('audit severity and dependency counts must still match the full report and frozen lock', () => {
  for (const mutate of [
    (r) => { r.metadata.vulnerabilities.total = 0 }, (r) => { r.metadata.vulnerabilities.high = 0 },
    (r) => { r.metadata.vulnerabilities.high = '3' }, (r) => { r.metadata.vulnerabilities.low = -1 },
    (r) => { r.metadata.dependencies.total += 1 }, (r) => { r.metadata.dependencies.prod = NaN },
    (r) => { r.metadata.dependencies.prod = r.metadata.dependencies.total + 1 }, (r) => { r.metadata.dependencies.prod = 0 },
  ]) { const report = fixture(); mutate(report); assert.throws(() => remainingAdvisories(report, legacyLock), /Incomplete or inconsistent/) }
})

test('unknown nested braces report nodes and additional locked copies cannot use the mitigation', () => {
  for (const nodes of [['node_modules/braces', 'node_modules/micromatch/node_modules/braces'], ['node_modules/micromatch/node_modules/braces'], ['../node_modules/braces']]) {
    const report = fixture(); report.vulnerabilities.braces.nodes = nodes
    assert.throws(() => remainingAdvisories(report, legacyLock), /Incomplete or inconsistent|unverified braces/)
  }
  for (const [path, value] of [['node_modules/micromatch/node_modules/braces', { version: '3.0.3' }], ['node_modules/braces-alias', { name: 'braces', version: '3.0.3' }]]) {
    const lock = structuredClone(legacyLock); lock.packages[path] = value
    assert.throws(() => remainingAdvisories(fixture(), lock), /Unverified braces copy/)
  }
})

test('audit retains raw responses and preserves the high severity threshold without braces installed', () => temporary((directory) => {
  cpSync(resolve(root, 'scripts'), resolve(directory, 'scripts'), { recursive: true })
  cpSync(resolve(root, 'patches'), resolve(directory, 'patches'), { recursive: true })
  cpSync(resolve(root, 'package-lock.json'), resolve(directory, 'package-lock.json'))
  mkdirSync(resolve(directory, 'node_modules'))
  writeFileSync(resolve(directory, 'package.json'), '{"type":"module"}')
  const scanner = resolve(directory, 'scanner.cjs')
  const unknown = (severity) => reportFor({ postcss: { ...entry('postcss', [{ ...advisory, name: 'postcss', dependency: 'postcss', severity, url: 'https://github.com/advisories/unexpected' }]), severity } })
  for (const [raw, exit, rejects] of [['{\n  "vulnerabilities": {}\n}\n', 1, /Incomplete or inconsistent npm audit report/], [JSON.stringify(unknown('high')), 1, /Unmitigated dependency advisories: postcss/], [JSON.stringify(unknown('moderate')), 0, null]]) {
    writeFileSync(scanner, `process.stdout.write(${JSON.stringify(raw)}); process.stderr.write('scanner diagnostic'); process.exitCode = ${exit}`)
    const result = spawnSync(process.execPath, [resolve(directory, 'scripts/audit.mjs')], { env: { ...process.env, npm_execpath: scanner }, encoding: 'utf8', timeout: 5000 })
    if (rejects) { assert.notEqual(result.status, 0); assert.match(result.stderr, rejects) } else assert.equal(result.status, 0, result.stderr)
    assert.equal(readFileSync(resolve(directory, '.audit/npm-audit.raw.json'), 'utf8'), raw)
    assert.equal(readFileSync(resolve(directory, '.audit/npm-audit.stderr.log'), 'utf8'), 'scanner diagnostic')
    assert.equal(JSON.parse(readFileSync(resolve(directory, '.audit/execution.json'))).status, exit)
  }
}))

test('the real Tailwind 4 PostCSS config compiles typography, arbitrary sizing, focus and apply', async () => {
  const postcss = require('postcss')
  const { default: config } = await import('../postcss.config.js')
  assert.match(require('tailwindcss/package.json').version, /^4\./)
  assert.deepEqual(Object.keys(config.plugins), ['@tailwindcss/postcss'])
  const plugins = Object.entries(config.plugins).map(([name, options]) => require(name)({ ...options, optimize: false }))
  const from = resolve(root, 'src/styles/globals.css')
  const result = await postcss(plugins).process(readFileSync(from, 'utf8'), { from })
  assert.match(result.css, /\.prose-cct/)
  assert.match(result.css, /--tw-prose-invert-body/)
  assert.match(result.css, /focus\\:outline-hidden/)
  const declarations = []
  result.root.walkDecls((decl) => declarations.push([decl.prop, decl.value]))
  assert.ok(declarations.some(([prop, value]) => prop === 'max-width' && value === '82%'))
  assert.ok(declarations.some(([prop, value]) => prop === '--color-gray-950' && value === '#030712'))
  assert.ok(declarations.some(([prop, value]) => prop === 'cursor' && value === 'pointer'))
})
