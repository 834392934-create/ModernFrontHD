const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// cmd.exe can split commands after a UTF-8 code-page change when a batch file
// contains LF-only lines. Git attributes do not normalize in-place Node writes.
for (const name of ['启动游戏.cmd', '启动独立版.cmd']) {
  test(`${name} remains directly executable by Windows cmd.exe`, () => {
    const text = fs.readFileSync(path.join(__dirname, '..', name), 'utf8');
    assert.ok(text.startsWith('@echo off\r\n'), 'no BOM; Windows CRLF required');
    assert.equal(/(?<!\r)\n/.test(text), false, 'LF-only batch lines cause startup failure');
    assert.ok(text.endsWith('\r\n'));
  });
}
