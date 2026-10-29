import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { cpSync, mkdtempSync, readFileSync, rmSync, appendFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import test from 'node:test'
import { applyPatch, bracesDir, root, verifyPatch, verifySourceFiles } from './braces-patch.mjs'
import { remainingAdvisories } from './audit.mjs'

const require = createRequire(import.meta.url)
const braces = require('braces')

test('installed upstream 3.0.3 source is digest-bound and its real consumer uses the patch', () => {
  assert.equal(verifyPatch(), true)
  const lock = JSON.parse(readFileSync(resolve(root, 'package-lock.json')))
  const manifest = JSON.parse(readFileSync(resolve(root, 'patches/braces-source.json')))
  assert.equal(lock.packages['node_modules/braces'].version, '3.0.3')
  assert.equal(lock.packages['node_modules/braces'].integrity, manifest.npm_integrity)
  assert.doesNotThrow(applyPatch)
})

test('source verification rejects modified installed code even if the package version is unchanged', () => {
  const directory = mkdtempSync(resolve(tmpdir(), 'cct-braces-integrity-'))
  try {
    cpSync(bracesDir, directory, { recursive: true })
    assert.doesNotThrow(() => verifySourceFiles(directory))
    appendFileSync(resolve(directory, 'lib/parse.js'), '\n// modified fixture\n')
    assert.throws(() => verifySourceFiles(directory), /source verification failed: lib\/parse.js/)
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
})

test('ordinary brace compilation, expansion, quoting and escapes remain compatible', () => {
  for (const [input, compiled, expanded] of [
    ['a/{b,c}/d', ['a/(b|c)/d'], ['a/b/d', 'a/c/d']],
    ['x{1..3}y', ['x([1-3])y'], ['x1y', 'x2y', 'x3y']],
    ['{a,{b,c},d}', ['(a|(b|c)|d)'], ['a', 'b', 'c', 'd']],
    ['{a,b}/{c,d}', ['(a|b)/(c|d)'], ['a/c', 'a/d', 'b/c', 'b/d']],
    ['a\\{b,c}d', ['a{b,c}d'], ['a{b,c}d']],
    ['quoted-{"x,y"}', ['quoted-{x,y}'], ['quoted-{x,y}']],
  ]) {
    assert.deepEqual(braces(input), compiled)
    assert.deepEqual(braces(input, { expand: true }), expanded)
  }
  assert.equal(braces.stringify(braces.parse('a/{b,c}/d')), 'a/{b,c}/d')
})

test('nested input rejects deliberately at depth 101 while depth 100 is accepted', () => {
  for (const [left, right] of [['{', '}'], ['(', ')']]) {
    assert.doesNotThrow(() => braces(left.repeat(100) + 'a' + right.repeat(100)))
    for (const depth of [101, 3500]) {
      for (const run of [braces, braces.parse, braces.expand]) {
        assert.throws(() => run(left.repeat(depth) + 'a' + right.repeat(depth)), /Input nesting depth exceeds maximum \(100\)/)
      }
    }
  }
})

test('deep and cyclic ASTs terminate in a bounded child process', () => {
  const child = `
    const braces = require(process.argv[1]);
    const assert = require('node:assert/strict');
    const deep = () => { let n = {type:'text',value:'x'}; for(let i=0;i<50000;i++) n={type:'brace',nodes:[n]}; return {type:'root',nodes:[n]}; };
    const cycle = {type:'text',nodes:[]}; cycle.nodes.push(cycle);
    for (const method of ['compile','stringify','expand']) {
      for (const input of [deep(), {type:'root',nodes:[cycle]}]) {
        assert.throws(() => braces[method](input), /Input nesting depth exceeds maximum/);
      }
    }
    const inner={type:'text',nodes:[{type:'text',value:'x'}]};
    const outer={type:'text',nodes:[inner]}; inner.parent=outer; outer.parent=inner;
    assert.throws(() => braces.expand({type:'root',nodes:[outer]}), /Input nesting depth exceeds maximum/);
  `
  const result = spawnSync(process.execPath, ['-e', child, bracesDir], { timeout: 5000, encoding: 'utf8' })
  assert.equal(result.status, 0, result.stderr || result.error?.message)
})

const dependencyLock = JSON.parse(readFileSync(resolve(root, 'package-lock.json')))
const advisory = {
  source: 1240992, name: 'braces', dependency: 'braces', severity: 'high', range: '<=3.0.3',
  title: 'braces stack exhaustion', url: 'https://github.com/advisories/GHSA-vfj7-8cjw-p6xm',
}
const entry = (name, via) => ({ name, severity: 'high', isDirect: false, range: '*', effects: [], nodes: [`node_modules/${name}`], fixAvailable: false, via })
const reportFor = (vulnerabilities) => {
  const counts = { info: 0, low: 0, moderate: 0, high: 0, critical: 0, total: Object.keys(vulnerabilities).length }
  for (const value of Object.values(vulnerabilities)) counts[value.severity] += 1
  return {
    auditReportVersion: 2, vulnerabilities,
    metadata: { vulnerabilities: counts, dependencies: { prod: Object.keys(dependencyLock.packages).filter(Boolean).length, dev: 0, optional: 0, peer: 0, peerOptional: 0, total: Object.keys(dependencyLock.packages).filter(Boolean).length } },
  }
}
const fixture = () => reportFor({ braces: entry('braces', [{ ...advisory }]), micromatch: entry('micromatch', ['braces']), tailwindcss: entry('tailwindcss', ['micromatch']) })

test('audit policy accepts only the exact mitigated advisory and its dependency chain', () => {
  const report = fixture()
  assert.deepEqual(remainingAdvisories(report), [])
  report.vulnerabilities.braces.via.push({ ...advisory, url: 'https://github.com/advisories/unknown' })
  assert.deepEqual(remainingAdvisories(report).sort(), ['braces', 'micromatch', 'tailwindcss'])
  assert.deepEqual(remainingAdvisories(reportFor({ micromatch: entry('micromatch', ['tailwindcss']), tailwindcss: entry('tailwindcss', ['micromatch']) })).sort(), ['micromatch', 'tailwindcss'])
})

test('empty, missing and malformed audit reports fail closed', () => {
  for (const report of [null, {}, { vulnerabilities: {} }, { auditReportVersion: 2, vulnerabilities: {}, metadata: {} }, { error: 'network failure' }]) {
    assert.throws(() => remainingAdvisories(report), /Incomplete or inconsistent/)
  }
  for (const mutate of [
    (r) => { delete r.metadata.vulnerabilities.high },
    (r) => { delete r.metadata.dependencies.total },
    (r) => { r.auditReportVersion = 1 },
    (r) => { r.vulnerabilities.braces.via = [] },
    (r) => { r.vulnerabilities.braces.nodes = [] },
    (r) => { r.vulnerabilities.braces.via = ['missing-package'] },
    (r) => { r.vulnerabilities.braces.severity = 'unknown' },
  ]) {
    const report = fixture(); mutate(report)
    assert.throws(() => remainingAdvisories(report), /Incomplete or inconsistent/)
  }
})

test('audit severity and dependency counts must match the full report and frozen lock', () => {
  for (const mutate of [
    (r) => { r.metadata.vulnerabilities.total = 0 },
    (r) => { r.metadata.vulnerabilities.high = 0 },
    (r) => { r.metadata.vulnerabilities.high = '3' },
    (r) => { r.metadata.vulnerabilities.low = -1 },
    (r) => { r.metadata.dependencies.total += 1 },
    (r) => { r.metadata.dependencies.prod = NaN },
    (r) => { r.metadata.dependencies.prod = r.metadata.dependencies.total + 1 },
    (r) => { r.metadata.dependencies.prod = 0 },
  ]) {
    const report = fixture(); mutate(report)
    assert.throws(() => remainingAdvisories(report), /Incomplete or inconsistent/)
  }
})

test('unknown nested braces report nodes and additional locked copies cannot use the mitigation', () => {
  for (const nodes of [
    ['node_modules/braces', 'node_modules/micromatch/node_modules/braces'],
    ['node_modules/micromatch/node_modules/braces'],
    ['../node_modules/braces'],
  ]) {
    const report = fixture(); report.vulnerabilities.braces.nodes = nodes
    assert.throws(() => remainingAdvisories(report), /Incomplete or inconsistent|unverified braces/)
  }
  for (const [path, value] of [
    ['node_modules/micromatch/node_modules/braces', { version: '3.0.3' }],
    ['node_modules/braces-alias', { name: 'braces', version: '3.0.3' }],
  ]) {
    const lock = structuredClone(dependencyLock); lock.packages[path] = value
    assert.throws(() => remainingAdvisories(fixture(), lock), /Unverified braces copy/)
  }
})

test('audit retains raw responses on rejection and preserves the high severity threshold', () => {
  const directory = mkdtempSync(resolve(tmpdir(), 'cct-audit-evidence-'))
  try {
    cpSync(resolve(root, 'scripts'), resolve(directory, 'scripts'), { recursive: true })
    cpSync(resolve(root, 'patches'), resolve(directory, 'patches'), { recursive: true })
    cpSync(resolve(root, 'package-lock.json'), resolve(directory, 'package-lock.json'))
    mkdirSync(resolve(directory, 'node_modules'), { recursive: true })
    cpSync(bracesDir, resolve(directory, 'node_modules/braces'), { recursive: true })
    writeFileSync(resolve(directory, 'package.json'), '{"type":"module"}')
    const scanner = resolve(directory, 'scanner.cjs')
    const unknown = (severity) => reportFor({ postcss: {
      ...entry('postcss', [{ ...advisory, name: 'postcss', dependency: 'postcss', severity, url: 'https://github.com/advisories/unexpected' }]), severity,
    } })
    for (const [raw, exit, rejects] of [
      ['{\n  "vulnerabilities": {}\n}\n', 1, /Incomplete or inconsistent npm audit report/],
      [JSON.stringify(unknown('high')), 1, /Unmitigated dependency advisories: postcss/],
      [JSON.stringify(unknown('moderate')), 0, null],
    ]) {
      writeFileSync(scanner, `process.stdout.write(${JSON.stringify(raw)}); process.stderr.write('scanner diagnostic'); process.exitCode = ${exit}`)
      const result = spawnSync(process.execPath, [resolve(directory, 'scripts/audit.mjs')], {
        env: { ...process.env, npm_execpath: scanner }, encoding: 'utf8', timeout: 5000,
      })
      if (rejects) {
        assert.notEqual(result.status, 0)
        assert.match(result.stderr, rejects)
      } else assert.equal(result.status, 0, result.stderr)
      assert.equal(readFileSync(resolve(directory, '.audit/npm-audit.raw.json'), 'utf8'), raw)
      assert.equal(readFileSync(resolve(directory, '.audit/npm-audit.stderr.log'), 'utf8'), 'scanner diagnostic')
      assert.equal(JSON.parse(readFileSync(resolve(directory, '.audit/execution.json'))).status, exit)
    }
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
})

test('Tailwind 3, typography, arbitrary variants and apply remain compatible with the selector override', async () => {
  const postcss = require('postcss')
  const tailwind = require('tailwindcss')
  const typography = require('@tailwindcss/typography')
  const autoprefixer = require('autoprefixer')
  assert.match(require('tailwindcss/package.json').version, /^3\./)
  const result = await postcss([tailwind({
    content: [{ raw: '<article class="prose flex hover:text-red-500 [&>p]:mt-2"><p>Example</p></article>' }],
    plugins: [typography],
  }), autoprefixer]).process('@tailwind base; @tailwind components; @tailwind utilities; .example { @apply flex; }', { from: undefined })
  assert.match(result.css, /display: flex/)
  assert.match(result.css, /\.prose/)
  assert.match(result.css, /:hover/)
  assert.match(result.css, /margin-top: 0\.5rem/)
})
