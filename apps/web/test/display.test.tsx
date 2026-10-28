import {test} from 'node:test';
import assert from 'node:assert/strict';
import {money,visualNumber} from '../src/lib/display';
test('formatting uses exact string/BigInt, half-even and signed loss without money floats',()=>{assert.equal(money('9007199254740993.000000000000'),'R$ 9.007.199.254.740.993,00');assert.equal(money('1.005000000000'),'R$ 1,00');assert.equal(money('1.015000000000'),'R$ 1,02');assert.equal(money('-10.000000000000'),'−R$ 10,00');assert.equal(money(null),'Indisponível');});
test('visual conversion rejects unsupported ranges rather than inventing plotted values',()=>{assert.equal(visualNumber('0.000000000001'),null);assert.equal(visualNumber('9007199254740993.000000000000'),null);assert.equal(visualNumber('-10.000000000000'),-10);assert.equal(visualNumber('NaN'),null);});
