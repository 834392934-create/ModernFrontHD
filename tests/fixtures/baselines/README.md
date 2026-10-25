# Frozen differential-test baselines

These are byte-for-byte snapshots of this project's own pre-optimization implementations. They are test inputs, not game runtime modules. Keep them unchanged when updating the current implementation.

The raycast and personnel-animation tests compare current behavior against these independent historical sources. Keeping the snapshots here makes the checks work in a shallow clone or source archive, without a Git executable or old author-history objects. No assertion has been removed or skipped.

| Fixture | Original source | Original commit | Git blob | SHA-256 |
|---|---|---|---|---|
| direct-control.pre-raycast-cache.js | src/direct-control.js | 3b758f1d90a28625c23d6e82cb2e2da3f6757e63 | b08a1958c8a9a10c91527c57281b9415b072b17b | 5e27a1e3fb1ce837e10510c7c18de32a86bca6177944a4531780e61090ca637a |
| personnel-animation.pre-pose-cache.js | src/personnel-animation.js | 2de5cd59e2cae1b066393e0f175a40c59464df47 | 6e6f5c97c08037af75249deb6afdbcb1c67ff2b8 | 1039b6a68383d585fb43dbf1594e76165811951f7249ad2d5eb6d88164f81111 |

Original commit identifiers document provenance; the tests do not resolve them at runtime. The project MIT license applies to these source snapshots.
