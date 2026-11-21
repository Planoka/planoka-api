import { ClerkGuard } from './clerk.guard';
import { RolesGuard } from './roles.guard';
import { ExecutionContext, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';

describe('Auth Guards', () => {
  let reflector: Reflector;
  let jwtService: any;
  let prisma: any;
  let configService: any;

  beforeEach(() => {
    reflector = new Reflector();
    jwtService = {
      verifyAsync: jest.fn(),
    };
    prisma = {
      user: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
      },
    };
    configService = {
      get: jest.fn().mockImplementation((key: string) => {
        if (key === 'JWT_SECRET') return 'test-jwt-secret';
        if (key === 'CLERK_SECRET_KEY') return 'test-clerk-secret';
        return null;
      }),
    };
  });

  const createMockContext = (headers: Record<string, string> = {}, user?: any): ExecutionContext => {
    const request: any = { headers, user };
    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as any;
  };

  describe('ClerkGuard (Dual JWT & Clerk)', () => {
    let guard: ClerkGuard;

    beforeEach(() => {
      guard = new ClerkGuard(reflector, jwtService, prisma, configService);
    });

    it('should allow public routes without token', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);
      const ctx = createMockContext();
      const result = await guard.canActivate(ctx);
      expect(result).toBe(true);
    });

    it('should throw 401 when token is missing', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
      const ctx = createMockContext({});
      await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
    });

    it('should authenticate with local JWT token', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
      const ctx = createMockContext({ authorization: 'Bearer local-jwt-token' });

      jwtService.verifyAsync.mockResolvedValue({ sub: 'user-id-123' });
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-id-123',
        clerkId: null,
        nom: 'Admin User',
        email: 'admin@planoka.com',
        role: Role.ADMIN,
      });

      const result = await guard.canActivate(ctx);
      expect(result).toBe(true);
      const req: any = ctx.switchToHttp().getRequest();
      expect(req.user.id).toBe('user-id-123');
      expect(req.user.role).toBe(Role.ADMIN);
    });
  });

  describe('RolesGuard', () => {
    let guard: RolesGuard;

    beforeEach(() => {
      guard = new RolesGuard(reflector, prisma);
    });

    it('should allow public routes', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) => {
        if (key === 'isPublic') return true;
        return [Role.ADMIN];
      });

      const ctx = createMockContext({}, null);
      const result = await guard.canActivate(ctx);
      expect(result).toBe(true);
    });

    it('should allow if user has matching role', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) => {
        if (key === 'isPublic') return false;
        if (key === 'roles') return [Role.ADMIN];
        return undefined;
      });

      const ctx = createMockContext({}, { id: 'admin-id', role: Role.ADMIN });
      const result = await guard.canActivate(ctx);
      expect(result).toBe(true);
    });

    it('should reject if user lacks required role', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) => {
        if (key === 'isPublic') return false;
        if (key === 'roles') return [Role.ADMIN];
        return undefined;
      });

      const ctx = createMockContext({}, { id: 'user-id', role: Role.USER });
      await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
    });
  });
});
