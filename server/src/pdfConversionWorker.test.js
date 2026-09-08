const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs').promises;
const { createPdfConversionWorker, secureEquals } = require('./pdfConversionWorker');

async function startWorker(options) {
  const app = createPdfConversionWorker(options);
  const server = await new Promise((resolve) => {
    const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
  });
  const address = server.address();
  return {
    url: `http://127.0.0.1:${address.port}`,
    close: () => new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())))
  };
}

test('PDF 转换节点要求正确的 bearer 密钥', async () => {
  const worker = await startWorker({ apiKey: 'test-secret', convert: async () => true });
  try {
    assert.equal((await fetch(`${worker.url}/health`)).status, 401);
    const response = await fetch(`${worker.url}/health`, {
      headers: { authorization: 'Bearer test-secret' }
    });
    assert.equal(response.status, 200);
    assert.equal((await response.json()).engine, 'microsoft-word');
  } finally {
    await worker.close();
  }
});

test('PDF 转换节点串行处理并返回转换后的 PDF', async () => {
  let active = 0;
  let maximumActive = 0;
  const worker = await startWorker({
    apiKey: 'test-secret',
    convert: async (_inputPath, outputPath) => {
      active += 1;
      maximumActive = Math.max(maximumActive, active);
      await new Promise((resolve) => setTimeout(resolve, 20));
      await fs.writeFile(outputPath, Buffer.from('%PDF-1.4\n%%EOF'));
      active -= 1;
      return true;
    }
  });

  try {
    const request = () => fetch(`${worker.url}/convert`, {
      method: 'POST',
      headers: {
        authorization: 'Bearer test-secret',
        'content-type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      },
      body: Buffer.from('fake-docx')
    });
    const responses = await Promise.all([request(), request()]);
    assert.deepEqual(responses.map((response) => response.status), [200, 200]);
    assert.equal(maximumActive, 1);
    assert.ok(Buffer.from(await responses[0].arrayBuffer()).subarray(0, 5).equals(Buffer.from('%PDF-')));
  } finally {
    await worker.close();
  }
});

test('密钥比较支持任意长度且结果正确', () => {
  assert.equal(secureEquals('same-value', 'same-value'), true);
  assert.equal(secureEquals('short', 'a-much-longer-value'), false);
});
