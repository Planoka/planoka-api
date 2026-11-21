import { Test, TestingModule } from '@nestjs/testing';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { ReportsService } from '../reports/reports.service';
import { RedisService } from '../../redis/redis.service';
import { PrismaService } from '../../prisma/prisma.service';
import { RolesGuard } from '../auth/roles.guard';
import { Role } from '@prisma/client';

describe('AdminController', () => {
  let controller: AdminController;
  let adminService: any;
  let reportsService: any;
  let redisService: any;

  beforeEach(async () => {
    adminService = {
      login: jest.fn().mockResolvedValue({
        accessToken: 'mock-jwt-token',
        user: { id: 'admin-1', email: 'admin@planoka.com', role: Role.ADMIN },
      }),
      getMe: jest.fn().mockResolvedValue({ id: 'admin-1', email: 'admin@planoka.com', role: Role.ADMIN }),
      createUser: jest.fn().mockResolvedValue({ id: 'new-user', email: 'new@planoka.com', role: Role.USER }),
      getUsers: jest.fn().mockResolvedValue({ data: [], meta: { total: 0, page: 1, limit: 20, lastPage: 1 } }),
      getUserById: jest.fn().mockResolvedValue({ id: 'user-1' }),
      assignRole: jest.fn().mockResolvedValue({ id: 'user-1', role: Role.MODERATOR }),
      updateUser: jest.fn().mockResolvedValue({ id: 'user-1', nom: 'Updated' }),
      deleteUser: jest.fn().mockResolvedValue({ success: true, message: 'Deleted' }),
      getStats: jest.fn().mockResolvedValue({ users: 10, plans: 5 }),
      getDailyStats: jest.fn().mockResolvedValue([]),
      getGeoStats: jest.fn().mockResolvedValue([]),
      getActiveUsers: jest.fn().mockResolvedValue({ count: 0, users: [] }),
      getPlans: jest.fn().mockResolvedValue({ data: [], meta: {} }),
      updatePlan: jest.fn().mockResolvedValue({ id: 'plan-1' }),
    };

    reportsService = {
      findAll: jest.fn().mockResolvedValue([]),
    };

    redisService = {
      keys: jest.fn().mockResolvedValue([]),
      del: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminController],
      providers: [
        { provide: AdminService, useValue: adminService },
        { provide: ReportsService, useValue: reportsService },
        { provide: RedisService, useValue: redisService },
        { provide: PrismaService, useValue: {} },
      ],
    })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AdminController>(AdminController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should login admin without clerk', async () => {
    const res = await controller.login(
      { email: 'admin@planoka.com', password: 'Password123!' },
      '127.0.0.1',
    );
    expect(res.accessToken).toBe('mock-jwt-token');
    expect(adminService.login).toHaveBeenCalledWith(
      { email: 'admin@planoka.com', password: 'Password123!' },
      '127.0.0.1',
    );
  });

  it('should get current admin info', async () => {
    const admin: any = { id: 'admin-1', role: Role.ADMIN };
    const res = await controller.getMe(admin);
    expect(res.email).toBe('admin@planoka.com');
    expect(adminService.getMe).toHaveBeenCalledWith('admin-1');
  });

  it('should create user', async () => {
    const res = await controller.createUser({
      email: 'new@planoka.com',
      nom: 'New User',
      role: Role.USER,
    });
    expect(res.id).toBe('new-user');
    expect(adminService.createUser).toHaveBeenCalled();
  });

  it('should assign role to user', async () => {
    const admin: any = { id: 'admin-1', role: Role.ADMIN };
    const res = await controller.assignRole('user-1', { role: Role.MODERATOR }, admin);
    expect(res.role).toBe(Role.MODERATOR);
    expect(adminService.assignRole).toHaveBeenCalledWith('user-1', { role: Role.MODERATOR }, 'admin-1');
  });

  it('should delete user', async () => {
    const admin: any = { id: 'admin-1', role: Role.ADMIN };
    const res = await controller.deleteUser('user-1', admin);
    expect(res.success).toBe(true);
    expect(adminService.deleteUser).toHaveBeenCalledWith('user-1', 'admin-1');
  });
});
