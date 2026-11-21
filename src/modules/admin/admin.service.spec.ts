import { Test, TestingModule } from '@nestjs/testing';
import { AdminService } from './admin.service';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { AuthRateLimiterService } from './auth-rate-limiter.service';
import { UnauthorizedException, ForbiddenException, ConflictException, BadRequestException, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

describe('AdminService', () => {
  let service: AdminService;
  let prisma: any;
  let jwtService: any;
  let rateLimiter: any;

  const mockAdminUser = {
    id: 'admin-uuid-1',
    nom: 'Admin Test',
    email: 'admin@planoka.com',
    passwordHash: '',
    role: Role.ADMIN,
    avatarUrl: null,
    ville: 'Paris',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockNormalUser = {
    id: 'user-uuid-1',
    nom: 'Normal User',
    email: 'user@planoka.com',
    passwordHash: '',
    role: Role.USER,
    avatarUrl: null,
    ville: 'Lyon',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeAll(async () => {
    mockAdminUser.passwordHash = await bcrypt.hash('AdminSecret123!', 10);
    mockNormalUser.passwordHash = await bcrypt.hash('UserSecret123!', 10);
  });

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
      plan: {
        count: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
      report: { count: jest.fn() },
      boost: { count: jest.fn() },
      comment: { count: jest.fn() },
      userEvent: { findMany: jest.fn() },
    };

    jwtService = {
      signAsync: jest.fn().mockResolvedValue('mock-jwt-token'),
    };

    rateLimiter = {
      checkLimit: jest.fn().mockResolvedValue(undefined),
      recordFailedAttempt: jest.fn().mockResolvedValue(undefined),
      clearAttempts: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwtService },
        { provide: AuthRateLimiterService, useValue: rateLimiter },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
  });

  describe('login without clerk', () => {
    it('should successfully log in an admin and return a JWT token', async () => {
      prisma.user.findUnique.mockResolvedValue(mockAdminUser);

      const result = await service.login(
        { email: 'admin@planoka.com', password: 'AdminSecret123!' },
        '127.0.0.1',
      );

      expect(result).toBeDefined();
      expect(result.accessToken).toBe('mock-jwt-token');
      expect(result.user.email).toBe('admin@planoka.com');
      expect(result.user.role).toBe(Role.ADMIN);
      expect(rateLimiter.clearAttempts).toHaveBeenCalled();
    });

    it('should reject invalid password with 401 Unauthorized', async () => {
      prisma.user.findUnique.mockResolvedValue(mockAdminUser);

      await expect(
        service.login(
          { email: 'admin@planoka.com', password: 'WrongPassword' },
          '127.0.0.1',
        ),
      ).rejects.toThrow(UnauthorizedException);

      expect(rateLimiter.recordFailedAttempt).toHaveBeenCalled();
    });

    it('should reject non-existent user with 401 Unauthorized', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.login(
          { email: 'unknown@planoka.com', password: 'AnyPassword' },
          '127.0.0.1',
        ),
      ).rejects.toThrow(UnauthorizedException);

      expect(rateLimiter.recordFailedAttempt).toHaveBeenCalled();
    });

    it('should reject non-admin user with 403 Forbidden', async () => {
      prisma.user.findUnique.mockResolvedValue(mockNormalUser);

      await expect(
        service.login(
          { email: 'user@planoka.com', password: 'UserSecret123!' },
          '127.0.0.1',
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('createUser', () => {
    it('should create a new user with hashed password and role', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockImplementation((args: any) => ({
        id: 'new-uuid',
        ...args.data,
      }));

      const newUser = await service.createUser({
        nom: 'Nouveau Modo',
        email: 'modo@planoka.com',
        password: 'Password123!',
        role: Role.MODERATOR,
        ville: 'Bordeaux',
      });

      expect(newUser).toBeDefined();
      expect(newUser.email).toBe('modo@planoka.com');
      expect(newUser.role).toBe(Role.MODERATOR);
      expect(prisma.user.create).toHaveBeenCalled();
    });

    it('should reject duplicate email with 409 Conflict', async () => {
      prisma.user.findUnique.mockResolvedValue(mockNormalUser);

      await expect(
        service.createUser({
          nom: 'Duplicate',
          email: 'user@planoka.com',
          password: 'Password123!',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('assignRole', () => {
    it('should update role of a user', async () => {
      prisma.user.findUnique.mockResolvedValue(mockNormalUser);
      prisma.user.update.mockResolvedValue({
        id: mockNormalUser.id,
        nom: mockNormalUser.nom,
        email: mockNormalUser.email,
        role: Role.MODERATOR,
        updatedAt: new Date(),
      });

      const updated = await service.assignRole(
        mockNormalUser.id,
        { role: Role.MODERATOR },
        'admin-uuid-1',
      );

      expect(updated.role).toBe(Role.MODERATOR);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: mockNormalUser.id },
        data: { role: Role.MODERATOR },
        select: expect.any(Object),
      });
    });

    it('should prevent admin from demoting themselves', async () => {
      prisma.user.findUnique.mockResolvedValue(mockAdminUser);

      await expect(
        service.assignRole(
          mockAdminUser.id,
          { role: Role.USER },
          mockAdminUser.id,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw 404 if user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.assignRole(
          'non-existent-id',
          { role: Role.MODERATOR },
          'admin-uuid-1',
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteUser', () => {
    it('should delete a user', async () => {
      prisma.user.findUnique.mockResolvedValue(mockNormalUser);
      prisma.user.delete.mockResolvedValue(mockNormalUser);

      const result = await service.deleteUser(mockNormalUser.id, mockAdminUser.id);
      expect(result.success).toBe(true);
    });

    it('should prevent admin from deleting own account', async () => {
      prisma.user.findUnique.mockResolvedValue(mockAdminUser);

      await expect(
        service.deleteUser(mockAdminUser.id, mockAdminUser.id),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
