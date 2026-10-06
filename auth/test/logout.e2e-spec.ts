import { randomUUID } from 'node:crypto';

// Runs against the live services started by /e2e-backend.
const ACCOUNT = 'http://localhost:9000/api/account';
const AUTH = 'http://localhost:9001/api/auth';

const post = (url: string, body: unknown) =>
  fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

describe('logout (e2e)', () => {
  // login and phone are varchar(20) in account
  const id = randomUUID().replace(/-/g, '').slice(0, 12);
  const login = `e2e_${id}`;
  const password = 'securePassword123';
  let userId: string;

  const signIn = async () => {
    const res = await post(`${AUTH}/login`, { login, password });
    return { status: res.status, ...(await res.json()) };
  };
  const refresh = (token: string) =>
    post(`${AUTH}/refresh/token`, { refresh: token });
  const logout = (token: string) => post(`${AUTH}/logout`, { refresh: token });

  beforeAll(async () => {
    const res = await post(`${ACCOUNT}/user`, {
      login,
      password,
      phone: id,
      firstName: 'E2E',
      lastName: 'Logout',
      email: `${login}@example.com`,
    });
    expect(res.status).toBe(201);
    const found = await fetch(`${ACCOUNT}/user?login=${login}`);
    userId = (await found.json()).items[0].userId;
  });

  afterAll(async () => {
    if (userId) {
      await fetch(`${ACCOUNT}/user/${userId}`, { method: 'DELETE' });
    }
  });

  it('Authenticated user logs out', async () => {
    const { refresh: token } = await signIn();

    expect((await logout(token)).status).toBe(204);
  });

  it('Session cannot be continued after logout', async () => {
    const { refresh: token } = await signIn();
    await logout(token);

    const res = await refresh(token);

    expect(res.status).toBe(401);
    expect(await res.json()).not.toHaveProperty('access');
  });

  // No endpoint in `auth` validates access tokens, so this is not testable over HTTP.
  it.todo('Already issued access token remains valid until expiration');

  it('Logout without valid session credentials', async () => {
    expect((await logout('not-a-jwt')).status).toBe(401);
    expect((await post(`${AUTH}/logout`, {})).status).toBe(400);
  });

  it('Logging out twice', async () => {
    const { refresh: token } = await signIn();

    expect((await logout(token)).status).toBe(204);
    expect((await logout(token)).status).toBe(204);
  });

  it('Logout does not affect other sessions', async () => {
    const first = await signIn();
    const second = await signIn();

    await logout(first.refresh);

    expect((await refresh(first.refresh)).status).toBe(401);
    expect((await refresh(second.refresh)).status).toBe(201);
  });

  it('Login after logout', async () => {
    const { refresh: token } = await signIn();
    await logout(token);

    const again = await signIn();

    expect(again.status).toBe(201);
    expect(again.access).toEqual(expect.any(String));
    expect(again.refresh).not.toBe(token);
  });

  it('Existing login flow is unchanged', async () => {
    const res = await signIn();

    expect(res.status).toBe(201);
    expect(res.access).toEqual(expect.any(String));
    expect(res.refresh).toEqual(expect.any(String));
  });

  it('Existing refresh flow for other sessions is unchanged', async () => {
    const { refresh: token } = await signIn();

    const res = await refresh(token);

    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({
      access: expect.any(String),
      refresh: expect.any(String),
    });
  });
});
