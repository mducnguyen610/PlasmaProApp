/* global __dirname */
// Chạy: node src/lib/device/checksum.test.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const cache = {};
function load(file) {
  const full = path.resolve(__dirname, file + '.ts');
  if (cache[full]) return cache[full];
  const mod = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(full, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  new Function('require', 'module', 'exports', code)(name => load(path.relative(__dirname, path.resolve(path.dirname(full), name))), mod, mod.exports);
  cache[full] = mod.exports;
  return mod.exports;
}
const { checksumBytes, checksumWidth } = load('checksum');
const { asciiToBytes, toHex, fromHex, bytesToAscii, concat } = load('bytes');

const check = asciiToBytes('123456789');
// Giá trị kiểm chuẩn của danh mục CRC RevEng.
assert.equal(checksumBytes('crc16_ccitt_false', check), 0x29b1);
assert.equal(checksumBytes('crc16_modbus', check), 0x4b37);

// 'CFG,BN001': C=0x43 F=0x46 G=0x47 ,=0x2C B=0x42 N=0x4E 0=0x30 0=0x30 1=0x31
// XOR: 43^46=05, ^47=42, ^2C=6E, ^42=2C, ^4E=62, ^30=52, ^30=62, ^31=53
assert.equal(checksumBytes('xor8', asciiToBytes('CFG,BN001')), 0x53);
// Tổng: 43+46+47+2C+42+4E+30+30+31 = 0x21D, modulo 256 = 0x1D
assert.equal(checksumBytes('sum8', asciiToBytes('CFG,BN001')), 0x1d);
assert.equal(checksumWidth('none'), 0);
assert.equal(checksumWidth('xor8'), 1);
assert.equal(checksumWidth('crc16_modbus'), 2);

assert.equal(toHex(fromHex('aa 55 01')), 'AA 55 01');
assert.throws(() => asciiToBytes('ơ'));
assert.throws(() => fromHex('ABC'));
assert.equal(bytesToAscii(asciiToBytes('$ACK\r\n')), '$ACK\r\n');
assert.equal(toHex(concat(fromHex('01'), fromHex('02 03'))), '01 02 03');
console.log('checksum.test: ok');
