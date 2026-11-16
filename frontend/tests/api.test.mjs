import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';

const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
const values = new Map([['token', 'test-token']]);
globalThis.localStorage = { getItem: key => values.get(key), removeItem: key => values.delete(key) };
globalThis.window = { location: { pathname: '/login' } };
const { api, API_URL, assignmentAPI, noticeAPI } = await server.ssrLoadModule('/src/services/api.js');
after(() => server.close());

let request;
api.defaults.adapter = async config => {
  request = config;
  return { data: { success: true }, status: 200, statusText: 'OK', headers: {}, config };
};

test('defaults to the same-origin API', () => assert.equal(API_URL, '/api'));
test('file submissions preserve multipart data and authentication', async () => {
  const data = new FormData();
  data.append('file', new Blob(['assignment']), 'assignment.txt');
  await assignmentAPI.submit(12, data);
  assert.equal(request.url, '/assignments/12/submit');
  assert.equal(request.data, data);
  assert.equal(request.headers.Authorization, 'Bearer test-token');
  assert.notEqual(request.headers.getContentType(), 'application/json');
});
test('ordinary requests still serialize JSON', async () => {
  await noticeAPI.create({ title: 'Notice', content: 'Example', target_audience: 'student' });
  assert.equal(request.headers.getContentType(), 'application/json');
  assert.equal(JSON.parse(request.data).target_audience, 'student');
});
