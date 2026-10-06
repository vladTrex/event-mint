import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

import { AuthService } from './auth.service';
import { InternalAccountService } from './internal/account/account.service';
import { REDIS_TOKEN } from './config/redis/redis.constant';

describe('AuthService', () => {
  let service: AuthService;
  let redis: { get: jest.Mock; set: jest.Mock; exists: jest.Mock };
  let internalAccountService: {
    verification: jest.Mock;
    getUsersByFilter: jest.Mock;
  };
  let jwtService: { sign: jest.Mock; verify: jest.Mock };

  const config: Record<string, string> = {
    JWT_ACCESS_SECRET: 'accessSecret',
    JWT_REFRESH_SECRET: 'refreshSecret',
    JWT_ALG: 'HS256',
    JWT_ACCESS_EXP: '1h',
    JWT_REFRESH_EXP: '24h',
  };

  beforeEach(async () => {
    redis = { get: jest.fn(), set: jest.fn(), exists: jest.fn() };
    internalAccountService = {
      verification: jest.fn(),
      getUsersByFilter: jest.fn(),
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
        { login: 'johndoe', userId: 'cached-user-id', sid: expect.any(String) },
        expect.objectContaining({ secret: 'accessSecret' }),
      );
      expect(jwtService.sign).toHaveBeenNthCalledWith(
        2,
        { login: 'johndoe', userId: 'cached-user-id', sid: expect.any(String) },
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
        { login: 'johndoe', userId: 'user-id', sid: 'sid-1' },
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
      jwtService.verify.mockReturnValue({ sid: 'sid-1', exp: exp() });

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
      jwtService.verify.mockReturnValue({ sid: 'sid-1', exp: exp() });

      await service.logout({ refresh: 'valid-token' });
      await expect(
        service.logout({ refresh: 'valid-token' }),
      ).resolves.toBeUndefined();
    });

    it('succeeds without writing when the token expires this second', async () => {
      jwtService.verify.mockReturnValue({
        sid: 'sid-1',
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
      jwtService.verify.mockReturnValue({ exp: exp() });

      await expect(
        service.logout({ refresh: 'legacy-token' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(redis.set).not.toHaveBeenCalled();
    });
  });
});
