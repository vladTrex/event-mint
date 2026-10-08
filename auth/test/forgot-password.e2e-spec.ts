import { createHash, randomUUID } from 'node:crypto';
import Redis from 'ioredis';

// Runs against the live services started by /e2e-backend.
const ACCOUNT = 'http://localhost:9000/api/account';
const AUTH = 'http://localhost:9001/api/auth';

const post = (url: string, body: unknown) =>
  fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

describe('forgot-password (e2e)', () => {
  // login and phone are varchar(20) in account
  const id = randomUUID().replace(/-/g, '').slice(0, 12);
  const login = `e2e_${id}`;
  const email = `${login}@example.com`;
  const oldPassword = 'securePassword123';
  const newPassword = 'brandNewPassword456';
  const redis = new Redis({
    host: process.env.REDIS_HOST ?? 'localhost',
    port: +(process.env.REDIS_PORT ?? 6379),
    password: process.env.REDIS_PASSWORD ?? 'redis',
  });
  let userId: string;

  const signIn = async (password: string) => {
    const res = await post(`${AUTH}/login`, { login, password });
    return { status: res.status, ...(await res.json()) };
  };
  const forgot = (addr: string) =>
    post(`${AUTH}/password/forgot`, { email: addr });
  const reset = (token: unknown, password: unknown) =>
    post(`${AUTH}/password/reset`, { token, password });
  const devToken = () => redis.get(`dev:reset-token:${userId}`);
  const issueToken = async () => {
    expect((await forgot(email)).status).toBe(204);
    return devToken();
  };

  beforeAll(async () => {
    const res = await post(`${ACCOUNT}/user`, {
      login,
      password: oldPassword,
      phone: id,
      firstName: 'E2E',
      lastName: 'Reset',
      email,
    });
    expect(res.status).toBe(201);
    const found = await fetch(`${ACCOUNT}/user?login=${login}`);
    userId = (await found.json()).items[0].userId;
  });

  afterAll(async () => {
    if (userId) {
      await fetch(`${ACCOUNT}/user/${userId}`, { method: 'DELETE' });
    }
    redis.disconnect();
  });

  it('User requests a password reset', async () => {
    expect(await issueToken()).toHaveLength(64);
  });

  it('Reset request for an unknown email looks the same and stores nothing', async () => {
    const res = await forgot(`nobody_${id}@example.com`);

    expect(res.status).toBe(204);
    expect(await redis.keys(`*nobody_${id}*`)).toEqual([]);
  });

  it('Invalid password is rejected and the token stays usable', async () => {
    const token = await issueToken();

    expect((await reset(token, undefined)).status).toBe(400);
    expect(await devToken()).toBe(token);
  });

  it('Invalid reset token is rejected', async () => {
    expect((await reset('not-a-real-token', newPassword)).status).toBe(400);
  });

  it('Expired reset token is rejected', async () => {
    const token = await issueToken();
    await redis.del(
      `reset:token:${createHash('sha256').update(token).digest('hex')}`,
    );

    expect((await reset(token, newPassword)).status).toBe(400);
  });

  it('New reset request invalidates the previous token', async () => {
    const first = await issueToken();
    const second = await issueToken();

    expect(second).not.toBe(first);
    expect((await reset(first, newPassword)).status).toBe(400);
  });

  it('Reset sets the new password, ends sessions and cannot be reused', async () => {
    const session = await signIn(oldPassword);
    expect(session.status).toBe(201);
    const token = await issueToken();

    expect((await reset(token, newPassword)).status).toBe(204);

    expect((await signIn(newPassword)).status).toBe(201);
    expect((await signIn(oldPassword)).status).toBe(401);
    const refreshed = await post(`${AUTH}/refresh/token`, {
      refresh: session.refresh,
    });
    expect(refreshed.status).toBe(401);
    expect((await reset(token, 'anotherPassword789')).status).toBe(400);
    expect((await signIn(newPassword)).status).toBe(201);
  });

  it('Existing login flow keeps working after a reset (new session refreshes)', async () => {
    const session = await signIn(newPassword);
    const res = await post(`${AUTH}/refresh/token`, {
      refresh: session.refresh,
    });

    expect(res.status).toBe(201);
  });

  it('Creating a second user with an existing email is a conflict', async () => {
    const other = randomUUID().replace(/-/g, '').slice(0, 12);
    const res = await post(`${ACCOUNT}/user`, {
      login: `e2e_${other}`,
      password: oldPassword,
      phone: other,
      firstName: 'E2E',
      lastName: 'Dup',
      email,
    });

    expect(res.status).toBe(409);
  });
});
