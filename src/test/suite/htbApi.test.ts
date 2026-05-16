import * as assert from 'assert';
import * as sinon from 'sinon';
import {
  HtbApiClient,
  HtbAuthError,
  HtbApiError,
  HtbRateLimitError,
} from '../../services/htbApi.js';
import type { Logger } from '../../utils/logger.js';

const noopLogger: Logger = {
  info: () => {},
  warn: () => {},
  error: () => {},
  debug: () => {},
  show: () => {},
  dispose: () => {},
};

type FetchStub = sinon.SinonStub<Parameters<typeof fetch>, ReturnType<typeof fetch>>;

function makeFetchResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

suite('HtbApiClient', function () {
  let fetchStub: FetchStub;

  setup(() => {
    fetchStub = sinon.stub(globalThis, 'fetch') as FetchStub;
  });

  teardown(() => sinon.restore());

  test('throws HtbAuthError when no token configured', async () => {
    const client = new HtbApiClient(async () => undefined, noopLogger);
    await assert.rejects(
      () => client.verifyToken(),
      (err: Error) => err.name === 'HtbAuthError',
    );
    assert.strictEqual(fetchStub.callCount, 0);
  });

  test('verifyToken returns profile on 200', async () => {
    const mockProfile = {
      id: 42,
      name: 'tester',
      rank: 'Hacker',
      points: 200,
      ownership: 30,
      subscription: 'vip',
    };
    fetchStub.resolves(makeFetchResponse({ info: mockProfile }));

    const client = new HtbApiClient(async () => 'test-token', noopLogger);
    const profile = await client.verifyToken();

    assert.strictEqual(profile.name, 'tester');
    assert.strictEqual(profile.rank, 'Hacker');
  });

  test('throws HtbAuthError on 401', async () => {
    fetchStub.resolves(makeFetchResponse({ message: 'Unauthenticated' }, 401));
    const client = new HtbApiClient(async () => 'bad-token', noopLogger);
    await assert.rejects(
      () => client.verifyToken(),
      (err: Error) => err.name === 'HtbAuthError',
    );
  });

  test('throws HtbRateLimitError on 429', async () => {
    fetchStub.resolves(makeFetchResponse({ message: 'Too Many Requests' }, 429));
    const client = new HtbApiClient(async () => 'token', noopLogger);
    await assert.rejects(
      () => client.verifyToken(),
      (err: Error) => err.name === 'HtbRateLimitError',
    );
  });

  test('throws HtbApiError on 500', async () => {
    fetchStub.resolves({
      ok: false,
      status: 500,
      text: async () => 'Internal Server Error',
    } as unknown as Response);
    const client = new HtbApiClient(async () => 'token', noopLogger);
    await assert.rejects(
      () => client.verifyToken(),
      (err: Error) => err.name === 'HtbApiError',
    );
  });

  test('getActiveMachine returns null on 404', async () => {
    fetchStub.resolves({
      ok: false,
      status: 404,
      text: async () => 'Not Found',
    } as unknown as Response);
    const client = new HtbApiClient(async () => 'token', noopLogger);
    const result = await client.getActiveMachine();
    assert.strictEqual(result, null);
  });

  test('listActiveMachines returns empty array on empty data', async () => {
    fetchStub.resolves(makeFetchResponse({ data: [] }));
    const client = new HtbApiClient(async () => 'token', noopLogger);
    const result = await client.listActiveMachines();
    assert.deepStrictEqual(result, []);
  });

  test('request sets Authorization header', async () => {
    fetchStub.resolves(makeFetchResponse({ info: { id: 1 } }));
    const client = new HtbApiClient(async () => 'my-secret-token', noopLogger);
    await client.verifyToken().catch(() => {});

    const headers = fetchStub.firstCall.args[1]?.headers as Headers;
    assert.ok(headers instanceof Headers);
    assert.strictEqual(headers.get('Authorization'), 'Bearer my-secret-token');
  });
});

suite('Error classes', () => {
  test('HtbAuthError has correct name', () => {
    const err = new HtbAuthError('test');
    assert.strictEqual(err.name, 'HtbAuthError');
    assert.ok(err instanceof Error);
  });

  test('HtbApiError stores statusCode', () => {
    const err = new HtbApiError('test', 422);
    assert.strictEqual(err.statusCode, 422);
  });

  test('HtbRateLimitError has correct name', () => {
    const err = new HtbRateLimitError('test');
    assert.strictEqual(err.name, 'HtbRateLimitError');
  });
});
