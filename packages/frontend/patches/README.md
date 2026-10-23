# Local braces mitigation

`braces@3.0.3` is the latest published upstream version, and remains affected by
[GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm).
There is no published fixed version for [upstream issue 70](https://github.com/micromatch/braces/issues/70).

The local patch limits nested text and AST traversal to 100 container levels,
including cyclic node and parent links. Ordinary shallow patterns retain their
existing behavior. The package version remains 3.0.3; this is a local mitigation,
not a claim that upstream published a fixed release.

`npm ci` verifies the registry tarball integrity recorded in the lockfile. Its
postinstall step applies the patch only to the exact original source hashes in
`braces-source.json`, then verifies the patched source and micromatch's actual
resolution. Git must be available during installation. Modified or partial
installations fail closed. Repeated installation verification is idempotent.

`npm run test:security` tests real installed code, ordinary glob behavior,
depth boundaries, cyclic ASTs, and the Tailwind 3 selector integration.
`npm run audit` verifies the source again and accepts only this exact advisory
and dependency graph entries caused exclusively by it. Any new advisory,
modified source, incomplete report, or audit service failure rejects the check.
The raw scanner still reports the original version; inspect it with
`npm run audit:raw`. Remove this patch and policy when a verified upstream fix
becomes available.

`postcss-selector-parser` is overridden to 7.1.7 to fix both parser advisories;
Tailwind remains on version 3. The CSS integration test covers typography,
arbitrary selectors, hover variants, and `@apply` across this parser change.
