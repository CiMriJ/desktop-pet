import test from 'node:test';
import assert from 'node:assert/strict';
import { extOf, isAllowedImage, sniffImage } from '../src/logic/image-validate.js';
import { resolveTwoTier } from '../src/logic/two-tier-resolver.js';

function bufferOf(bytes) {
  return Buffer.from(bytes);
}

test('扩展名校验', () => {
  assert.equal(extOf('a/b/idle.PNG'), 'png');
  assert.equal(extOf('noext'), '');
  assert.equal(isAllowedImage('x.gif'), true);
  assert.equal(isAllowedImage('x.jpg'), false);
});

test('文件头识别 PNG / GIF', () => {
  const png = bufferOf([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]);
  const gif = bufferOf([...Buffer.from('GIF89a'), 0, 0]);
  const bad = bufferOf([0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07]);
  assert.equal(sniffImage(png), 'png');
  assert.equal(sniffImage(gif), 'gif');
  assert.equal(sniffImage(bad), null);
  assert.equal(sniffImage(bufferOf([1, 2])), null);
});

test('两级解析优先级：用户 PNG > 用户 GIF > 内置 PNG > 内置 GIF > 矢量', () => {
  const resolve = (userSet, builtinSet) => resolveTwoTier(
    'yier', 'idle',
    (ext) => userSet.includes(ext),
    (ext) => builtinSet.includes(ext),
  );
  assert.deepEqual(resolve(['png', 'gif'], ['png']), { type: 'image', source: 'user', ext: 'png' });
  assert.deepEqual(resolve(['gif'], ['png']), { type: 'image', source: 'user', ext: 'gif' });
  assert.deepEqual(resolve([], ['png', 'gif']), { type: 'image', source: 'builtin', ext: 'png' });
  assert.deepEqual(resolve([], ['gif']), { type: 'image', source: 'builtin', ext: 'gif' });
  assert.deepEqual(resolve([], []), { type: 'svg', pet: 'yier', state: 'idle' });
});
