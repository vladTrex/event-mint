import {
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

import { AuthService } from './auth.service';
import { InternalAccountService } from './internal/account/account.service';
import { REDIS_TOKEN } from './config/redis/redis.constant';

describe('AuthService', () => {
  let service: AuthService;
  let redis: {
    get: jest.Mock;
    set: jest.Mock;
    exists: jest.Mock;
    getdel: jest.Mock;
    incr: jest.Mock;
    del: jest.Mock;
    multi: jest.Mock;
  };
  let tx: { del: jest.Mock; set: jest.Mock; exec: jest.Mock };
  let internalAccountService: {
    verification: jest.Mock;
    getUsersByFilter: jest.Mock;
    setPassword: jest.Mock;
  };
  let jwtService: { sign: jest.Mock; verify: jest.Mock };

  const config: Record<string, string> = {
    JWT_ACCESS_SECRET: 'accessSecret',
    JWT_REFRESH_SECRET: 'refreshSecret',
    JWT_ALG: 'HS256',
    JWT_ACCESS_EXP: '1h',
    JWT_REFRESH_EXP: '24h',
    NODE_ENV: 'local',
  };

  beforeEach(async () => {
    config.NODE_ENV = 'local';
    tx = { del: jest.fn(), set: jest.fn(), exec: jest.fn() };
    tx.del.mockReturnValue(tx);
    tx.set.mockReturnValue(tx);
    redis = {
      get: jest.fn(),
      set: jest.fn(),
      exists: jest.fn(),
      getdel: jest.fn(),
      incr: jest.fn(),
      del: jest.fn().mockResolvedValue(1),
      multi: jest.fn().mockReturnValue(tx),
    };
    internalAccountService = {
      verification: jest.fn(),
      getUsersByFilter: jest.fn(),
      setPassword: jest.fn(),
    };
    jwtService = { sign: jest.fn(), verify: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: REDIS_TOKEN, useValue: redis },
        { provide: InternalAccountService, useValue: internalAccountService },
        { provide: JwtService, useValue: jwtService },
        {
          provide: ConfigService,
          useValue: { get: (key: string) => config[key] },
        },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  describe('login', () => {
    it('throws Unauthorized when password verification fails', async () => {
      internalAccountService.verification.mockResolvedValue(false);

      await expect(
        service.login({ login: 'johndoe', password: 'wrong' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);

      expect(internalAccountService.getUsersByFilter).not.toHaveBeenCalled();
    });

    it('reuses cached userId from redis without calling account service', async () => {
      internalAccountService.verification.mockResolvedValue(true);
      redis.get.mockResolvedValue('cached-user-id');
      jwtService.sign
        .mockReturnValueOnce('access-token')
        .mockReturnValueOnce('refresh-token');

      const result = await service.login({
        login: 'johndoe',
        password: 'securePassword123',
      });

      expect(internalAccountService.getUsersByFilter).not.toHaveBeenCalled();
      expect(redis.set).not.toHaveBeenCalled();
      expect(result).toEqual({
        access: 'access-token',
        refresh: 'refresh-token',
      });
      expect(jwtService.sign).toHaveBeenNthCalledWith(
        1,
        {
          login: 'johndoe',
          userId: 'cached-user-id',
          sid: expect.any(String),
          ep: 0,
        },
        expect.objectContaining({ secret: 'accessSecret' }),
      );
      expect(jwtService.sign).toHaveBeenNthCalledWith(
        2,
        {
          login: 'johndoe',
          userId: 'cached-user-id',
          sid: expect.any(String),
          ep: 0,
        },
        expect.objectContaining({ secret: 'refreshSecret' }),
      );
    });

    it('resolves and caches userId via account service on cache miss', async () => {
      internalAccountService.verification.mockResolvedValue(true);
      redis.get.mockResolvedValue(null);
      internalAccountService.getUsersByFilter.mockResolvedValue({
        items: [{ userId: 'fresh-user-id' }],
        total: 1,
      });
      jwtService.sign
        .mockReturnValueOnce('access-token')
        .mockReturnValueOnce('refresh-token');

      const result = await service.login({
        login: 'johndoe',
        password: 'securePassword123',
      });

      expect(internalAccountService.getUsersByFilter).toHaveBeenCalledWith({
        login: 'johndoe',
      });
      expect(redis.set).toHaveBeenCalledWith(
        'johndoe',
        'fresh-user-id',
        'PX',
        86400,
      );
      expect(result).toEqual({
        access: 'access-token',
        refresh: 'refresh-token',
      });
    });
  });

  describe('refreshToken', () => {
    it('throws Unauthorized when the refresh token is invalid or expired', async () => {
      jwtService.verify.mockImplementation(() => {
        throw new Error('jwt expired');
      });

      await expect(
        service.refreshToken({ refresh: 'bad-token' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);

      expect(internalAccountService.getUsersByFilter).not.toHaveBeenCalled();
    });

    it('throws NotFound when the token user no longer exists', async () => {
      jwtService.verify.mockReturnValue({
        userId: 'ghost-user-id',
        login: 'johndoe',
        sid: 'sid-1',
        ep: 0,
      });
      internalAccountService.getUsersByFilter.mockResolvedValue({
        items: [],
        total: 0,
      });

      await expect(
        service.refreshToken({ refresh: 'valid-token' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('issues a fresh token pair for a valid refresh token', async () => {
      jwtService.verify.mockReturnValue({
        userId: 'user-id',
        login: 'johndoe',
        sid: 'sid-1',
        ep: 0,
      });
      internalAccountService.getUsersByFilter.mockResolvedValue({
        items: [{ userId: 'user-id', login: 'johndoe' }],
        total: 1,
      });
      jwtService.sign
        .mockReturnValueOnce('new-access-token')
        .mockReturnValueOnce('new-refresh-token');

      const result = await service.refreshToken({ refresh: 'valid-token' });

      expect(jwtService.verify).toHaveBeenCalledWith('valid-token', {
        secret: 'refreshSecret',
        algorithms: ['HS256'],
      });
      expect(internalAccountService.getUsersByFilter).toHaveBeenCalledWith({
        userIds: ['user-id'],
      });
      expect(result).toEqual({
        access: 'new-access-token',
        refresh: 'new-refresh-token',
      });
      expect(jwtService.sign).toHaveBeenCalledWith(
        { login: 'johndoe', userId: 'user-id', sid: 'sid-1', ep: 0 },
        expect.anything(),
      );
    });

    it('throws Unauthorized when the token has no sid', async () => {
      jwtService.verify.mockReturnValue({
        userId: 'user-id',
        login: 'johndoe',
      });

      await expect(
        service.refreshToken({ refresh: 'legacy-token' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);

      expect(internalAccountService.getUsersByFilter).not.toHaveBeenCalled();
    });

    it('throws Unauthorized when the session is revoked', async () => {
      jwtService.verify.mockReturnValue({
        userId: 'user-id',
        login: 'johndoe',
        sid: 'sid-1',
        ep: 0,
      });
      redis.exists.mockResolvedValue(1);

      await expect(
        service.refreshToken({ refresh: 'valid-token' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);

      expect(redis.exists).toHaveBeenCalledWith('revoked:sid:sid-1');
      expect(internalAccountService.getUsersByFilter).not.toHaveBeenCalled();
    });
  });

  describe('login sessions', () => {
    it('gives each login its own sid', async () => {
      internalAccountService.verification.mockResolvedValue(true);
      redis.get.mockResolvedValue('user-id');
      jwtService.sign.mockReturnValue('t');

      await service.login({ login: 'johndoe', password: 'p' });
      await service.login({ login: 'johndoe', password: 'p' });

      const sids = jwtService.sign.mock.calls.map(([payload]) => payload.sid);
      expect(sids[0]).toBe(sids[1]);
      expect(sids[1]).not.toBe(sids[2]);
      expect(sids[2]).toBe(sids[3]);
    });
  });

  describe('logout', () => {
    const exp = () => Math.floor(Date.now() / 1000) + 3600;

    it('revokes the session until the refresh token expires', async () => {
      jwtService.verify.mockReturnValue({ sid: 'sid-1', ep: 0, exp: exp() });

      await service.logout({ refresh: 'valid-token' });

      expect(redis.set).toHaveBeenCalledWith(
        'revoked:sid:sid-1',
        '1',
        'EX',
        expect.any(Number),
      );
      const ttl = redis.set.mock.calls[0][3];
      expect(ttl).toBeGreaterThan(0);
      expect(ttl).toBeLessThanOrEqual(3600);
    });

    it('succeeds when the same session is logged out twice', async () => {
      jwtService.verify.mockReturnValue({ sid: 'sid-1', ep: 0, exp: exp() });

      await service.logout({ refresh: 'valid-token' });
      await expect(
        service.logout({ refresh: 'valid-token' }),
      ).resolves.toBeUndefined();
    });

    it('succeeds without writing when the token expires this second', async () => {
      jwtService.verify.mockReturnValue({
        sid: 'sid-1',
        ep: 0,
        exp: Math.floor(Date.now() / 1000),
      });

      await expect(
        service.logout({ refresh: 'valid-token' }),
      ).resolves.toBeUndefined();
      expect(redis.set).not.toHaveBeenCalled();
    });

    it('throws Unauthorized for an invalid or expired token', async () => {
      jwtService.verify.mockImplementation(() => {
        throw new Error('jwt expired');
      });

      await expect(
        service.logout({ refresh: 'bad-token' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(redis.set).not.toHaveBeenCalled();
    });

    it('throws Unauthorized when the token has no sid', async () => {
      jwtService.verify.mockReturnValue({ sid: undefined, ep: 0, exp: exp() });

      await expect(
        service.logout({ refresh: 'legacy-token' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(redis.set).not.toHaveBeenCalled();
    });
  });

  describe('epoch', () => {
    it('login signs the current epoch', async () => {
      internalAccountService.verification.mockResolvedValue(true);
      redis.get.mockImplementation(async (key: string) =>
        key === 'session:epoch:user-id' ? '3' : 'user-id',
      );
      jwtService.sign.mockReturnValue('t');

      await service.login({ login: 'johndoe', password: 'p' });

      expect(jwtService.sign.mock.calls[0][0]).toMatchObject({ ep: 3 });
    });

    it('refresh rejects a stale epoch before the account lookup', async () => {
      jwtService.verify.mockReturnValue({
        userId: 'user-id',
        login: 'johndoe',
        sid: 'sid-1',
        ep: 0,
      });
      redis.get.mockResolvedValue('1');

      await expect(
        service.refreshToken({ refresh: 'old-token' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(internalAccountService.getUsersByFilter).not.toHaveBeenCalled();
    });

    it('refresh and logout reject a token without ep', async () => {
      jwtService.verify.mockReturnValue({
        userId: 'user-id',
        sid: 'sid-1',
        exp: Math.floor(Date.now() / 1000) + 60,
      });

      await expect(
        service.refreshToken({ refresh: 'no-ep' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      await expect(service.logout({ refresh: 'no-ep' })).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      expect(redis.set).not.toHaveBeenCalled();
    });

    it('refresh keeps a non-zero ep that matches', async () => {
      jwtService.verify.mockReturnValue({
        userId: 'user-id',
        login: 'johndoe',
        sid: 'sid-1',
        ep: 2,
      });
      redis.get.mockResolvedValue('2');
      internalAccountService.getUsersByFilter.mockResolvedValue({
        items: [{ userId: 'user-id', login: 'johndoe' }],
        total: 1,
      });
      jwtService.sign.mockReturnValue('t');

      await service.refreshToken({ refresh: 'valid-token' });

      expect(jwtService.sign.mock.calls[0][0]).toMatchObject({ ep: 2 });
    });
  });

  describe('requestPasswordReset', () => {
    it('stores hashed token keys with 15 min expiry and a dev copy', async () => {
      internalAccountService.getUsersByFilter.mockResolvedValue({
        items: [{ userId: 'user-id' }],
        total: 1,
      });
      redis.get.mockResolvedValue('old-hash');

      await service.requestPasswordReset({ email: 'a@x.com' });

      expect(internalAccountService.getUsersByFilter).toHaveBeenCalledWith({
        email: 'a@x.com',
      });
      expect(tx.del).toHaveBeenCalledWith('reset:token:old-hash');
      const [tokenKey, id, ex, ttl] = tx.set.mock.calls[0];
      expect([id, ex, ttl]).toEqual(['user-id', 'EX', 900]);
      const hash = tokenKey.replace('reset:token:', '');
      expect(tx.set).toHaveBeenCalledWith(
        'reset:user:user-id',
        hash,
        'EX',
        900,
      );
      const devCall = tx.set.mock.calls.find(
        ([key]) => key === 'dev:reset-token:user-id',
      );
      expect(devCall[1]).toHaveLength(64);
      expect(devCall[1]).not.toBe(hash);
      expect(tx.exec).toHaveBeenCalled();
    });

    it('skips the dev copy in production', async () => {
      config.NODE_ENV = 'production';
      internalAccountService.getUsersByFilter.mockResolvedValue({
        items: [{ userId: 'user-id' }],
        total: 1,
      });

      await service.requestPasswordReset({ email: 'a@x.com' });

      expect(tx.set.mock.calls.map(([key]) => key)).not.toContain(
        'dev:reset-token:user-id',
      );
      expect(tx.del).not.toHaveBeenCalled();
    });

    it('writes nothing for an unknown email', async () => {
      internalAccountService.getUsersByFilter.mockResolvedValue({
        items: [],
        total: 0,
      });

      await expect(
        service.requestPasswordReset({ email: 'nobody@x.com' }),
      ).resolves.toBeUndefined();
      expect(redis.multi).not.toHaveBeenCalled();
    });
  });

  describe('resetPassword', () => {
    it('consumes the token, bumps the epoch, then sets the password', async () => {
      const calls: string[] = [];
      redis.getdel.mockImplementation(async () => {
        calls.push('getdel');
        return 'user-id';
      });
      redis.incr.mockImplementation(async () => calls.push('incr'));
      internalAccountService.setPassword.mockImplementation(async () => {
        calls.push('setPassword');
      });

      await service.resetPassword({ token: 'tok', password: 'new' });

      expect(calls).toEqual(['getdel', 'incr', 'setPassword']);
      expect(redis.incr).toHaveBeenCalledWith('session:epoch:user-id');
      expect(internalAccountService.setPassword).toHaveBeenCalledWith(
        'user-id',
        'new',
      );
    });

    it('rejects an unknown, used or expired token without side effects', async () => {
      redis.getdel.mockResolvedValue(null);

      await expect(
        service.resetPassword({ token: 'tok', password: 'new' }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(redis.incr).not.toHaveBeenCalled();
      expect(internalAccountService.setPassword).not.toHaveBeenCalled();
    });
  });
});
