import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { cpSync, mkdtempSync, readFileSync, rmSync, appendFileSync } from 'node:fs'
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

test('audit policy accepts only the exact mitigated advisory and its dependency chain', () => {
  const advisory = { name: 'braces', url: 'https://github.com/advisories/GHSA-vfj7-8cjw-p6xm' }
  const vulnerabilities = { braces: { via: [advisory] }, micromatch: { via: ['braces'] }, tailwindcss: { via: ['micromatch'] } }
  assert.deepEqual(remainingAdvisories({ vulnerabilities }), [])
  vulnerabilities.braces.via.push({ name: 'braces', url: 'https://github.com/advisories/unknown' })
  assert.deepEqual(remainingAdvisories({ vulnerabilities }).sort(), ['braces', 'micromatch', 'tailwindcss'])
  assert.throws(() => remainingAdvisories({ error: 'network failure' }), /unavailable/)
  assert.deepEqual(remainingAdvisories({ vulnerabilities: { a: { via: ['b'] }, b: { via: ['a'] } } }).sort(), ['a', 'b'])
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
