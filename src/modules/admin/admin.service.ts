import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthRateLimiterService } from './auth-rate-limiter.service';
import { AdminLoginDto } from './dto/admin-login.dto';
import { CreateAdminUserDto } from './dto/create-admin-user.dto';
import { AssignRoleDto } from './dto/assign-role.dto';
import { UpdateAdminUserDto } from './dto/update-admin-user.dto';
import { Role, Prisma } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly rateLimiter: AuthRateLimiterService,
  ) {}

  // ─── Authentification Administrateur ─────────────────────────
  /**
   * Connexion sécurisée de l'administrateur avec email et mot de passe (sans Clerk)
   */
  async login(dto: AdminLoginDto, clientIp = '127.0.0.1') {
    const normalizedEmail = dto.email.trim().toLowerCase();
    const rateLimitKey = `${clientIp}:${normalizedEmail}`;

    // 1. Vérification anti brute-force
    await this.rateLimiter.checkLimit(rateLimitKey);

    // 2. Recherche de l'utilisateur par email
    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    // 3. Vérification de l'existence et du hash de mot de passe
    if (!user || !user.passwordHash) {
      await this.rateLimiter.recordFailedAttempt(rateLimitKey);
      throw new UnauthorizedException('Email ou mot de passe incorrect');
    }

    // 4. Comparaison sécurisée du mot de passe avec bcrypt
    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      await this.rateLimiter.recordFailedAttempt(rateLimitKey);
      throw new UnauthorizedException('Email ou mot de passe incorrect');
    }

    // 5. Vérification du rôle d'administration (seuls les ADMIN sont autorisés sur ce portail)
    if (user.role !== Role.ADMIN) {
      this.logger.warn(
        `Tentative de connexion au portail admin refusée pour le compte non-admin: ${user.email} (rôle: ${user.role})`,
      );
      throw new ForbiddenException(
        'Accès refusé : Seuls les comptes administrateurs peuvent accéder à cet espace',
      );
    }

    // 6. Succès : réinitialiser le limiteur de tentatives
    await this.rateLimiter.clearAttempts(rateLimitKey);

    // 7. Génération du JWT signé
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      nom: user.nom,
      type: 'admin_session',
    };

    const accessToken = await this.jwtService.signAsync(payload);

    this.logger.log(`Connexion réussie de l'administrateur : ${user.email} (id: ${user.id})`);

    return {
      accessToken,
      user: {
        id: user.id,
        nom: user.nom,
        email: user.email,
        role: user.role,
        avatarUrl: user.avatarUrl,
        ville: user.ville,
        langue: user.langue,
        theme: user.theme,
        createdAt: user.createdAt,
      },
    };
  }

  /**
   * Récupère le profil de l'administrateur actuellement connecté
   */
  async getMe(adminId: string) {
    const admin = await this.prisma.user.findUnique({
      where: { id: adminId },
      select: {
        id: true,
        nom: true,
        email: true,
        role: true,
        avatarUrl: true,
        ville: true,
        langue: true,
        theme: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!admin) {
      throw new NotFoundException('Administrateur introuvable');
    }

    return admin;
  }

  // ─── Gestion des Utilisateurs & Rôles ─────────────────────────

  /**
   * Créer un utilisateur et lui attribuer un rôle dans le système
   */
  async createUser(dto: CreateAdminUserDto) {
    const normalizedEmail = dto.email.trim().toLowerCase();

    // 1. Vérifier si l'email existe déjà
    const existingEmail = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });
    if (existingEmail) {
      throw new ConflictException('Un utilisateur avec cette adresse email existe déjà');
    }

    // 2. Vérifier si un clerkId a été fourni et s'il est déjà pris
    if (dto.clerkId) {
      const existingClerk = await this.prisma.user.findUnique({
        where: { clerkId: dto.clerkId },
      });
      if (existingClerk) {
        throw new ConflictException('Un utilisateur avec cet identifiant Clerk existe déjà');
      }
    }

    // 3. Hachage du mot de passe s'il est fourni
    let passwordHash: string | null = null;
    if (dto.password) {
      passwordHash = await bcrypt.hash(dto.password, 12);
    }

    // 4. Création en base
    const user = await this.prisma.user.create({
      data: {
        nom: dto.nom.trim(),
        email: normalizedEmail,
        passwordHash,
        role: dto.role || Role.USER,
        ville: dto.ville?.trim() || null,
        avatarUrl: dto.avatarUrl || null,
        langue: dto.langue,
        theme: dto.theme,
        clerkId: dto.clerkId || null,
      },
      select: {
        id: true,
        nom: true,
        email: true,
        role: true,
        ville: true,
        avatarUrl: true,
        langue: true,
        theme: true,
        clerkId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    this.logger.log(`Nouvel utilisateur créé par admin: ${user.email} (rôle: ${user.role})`);
    return user;
  }

  /**
   * Attribuer ou modifier le rôle d'un utilisateur
   */
  async assignRole(userId: string, dto: AssignRoleDto, currentAdminId?: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Utilisateur introuvable');
    }

    // Empêcher l'administrateur de s'auto-rétrograder
    if (currentAdminId && user.id === currentAdminId && dto.role !== Role.ADMIN) {
      throw new BadRequestException(
        "Action refusée : Vous ne pouvez pas révoquer vos propres privilèges d'administrateur",
      );
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { role: dto.role },
      select: {
        id: true,
        nom: true,
        email: true,
        role: true,
        updatedAt: true,
      },
    });

    this.logger.log(`Rôle de l'utilisateur ${user.email} modifié en: ${dto.role}`);
    return updated;
  }

  /**
   * Consulter les détails complets d'un utilisateur
   */
  async getUserById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        nom: true,
        email: true,
        role: true,
        ville: true,
        avatarUrl: true,
        langue: true,
        theme: true,
        clerkId: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            plans: true,
            boosts: true,
            favorites: true,
            comments: true,
            reports: true,
            following: true,
            followers: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('Utilisateur introuvable');
    }

    return user;
  }

  /**
   * Modifier les données d'un utilisateur (nom, email, ville, mot de passe, rôle)
   */
  async updateUser(id: string, dto: UpdateAdminUserDto, currentAdminId?: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('Utilisateur introuvable');
    }

    // Vérifier si tentative d'auto-rétrogradation
    if (currentAdminId && user.id === currentAdminId && dto.role && dto.role !== Role.ADMIN) {
      throw new BadRequestException(
        "Action refusée : Vous ne pouvez pas révoquer vos propres privilèges d'administrateur",
      );
    }

    const updateData: Prisma.UserUpdateInput = {};

    if (dto.nom !== undefined) updateData.nom = dto.nom.trim();
    if (dto.ville !== undefined) updateData.ville = dto.ville.trim();
    if (dto.avatarUrl !== undefined) updateData.avatarUrl = dto.avatarUrl;
    if (dto.langue !== undefined) updateData.langue = dto.langue;
    if (dto.theme !== undefined) updateData.theme = dto.theme;
    if (dto.role !== undefined) updateData.role = dto.role;

    if (dto.email !== undefined) {
      const normalizedEmail = dto.email.trim().toLowerCase();
      if (normalizedEmail !== user.email) {
        const existing = await this.prisma.user.findUnique({
          where: { email: normalizedEmail },
        });
        if (existing) {
          throw new ConflictException('Cette adresse email est déjà utilisée par un autre compte');
        }
        updateData.email = normalizedEmail;
      }
    }

    if (dto.password) {
      updateData.passwordHash = await bcrypt.hash(dto.password, 12);
    }

    return this.prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        nom: true,
        email: true,
        role: true,
        ville: true,
        avatarUrl: true,
        langue: true,
        theme: true,
        updatedAt: true,
      },
    });
  }

  /**
   * Supprimer un compte utilisateur
   */
  async deleteUser(id: string, currentAdminId?: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('Utilisateur introuvable');
    }

    if (currentAdminId && user.id === currentAdminId) {
      throw new BadRequestException(
        'Action refusée : Vous ne pouvez pas supprimer votre propre compte administrateur',
      );
    }

    await this.prisma.user.delete({ where: { id } });
    return { success: true, message: `Utilisateur ${user.email} supprimé avec succès` };
  }

  /**
   * Liste des utilisateurs avec pagination, filtre par rôle et recherche
   */
  async getUsers(page = 1, limit = 20, role?: Role, search?: string) {
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = {};

    if (role) {
      where.role = role;
    }

    if (search && search.trim().length > 0) {
      const cleanSearch = search.trim();
      where.OR = [
        { nom: { contains: cleanSearch, mode: 'insensitive' } },
        { email: { contains: cleanSearch, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: {
          id: true,
          nom: true,
          email: true,
          role: true,
          ville: true,
          createdAt: true,
          avatarUrl: true,
          _count: { select: { plans: true, boosts: true, reports: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        lastPage: Math.ceil(total / limit) || 1,
      },
    };
  }

  // ─── KPIs globaux ──────────────────────────────────────────────
  async getStats() {
    const [usersCount, plansCount, reportsCount, boostsCount, commentsCount] =
      await Promise.all([
        this.prisma.user.count(),
        this.prisma.plan.count(),
        this.prisma.report.count(),
        this.prisma.boost.count(),
        this.prisma.comment.count(),
      ]);

    return {
      users: usersCount,
      plans: plansCount,
      reports: reportsCount,
      boosts: boostsCount,
      comments: commentsCount,
    };
  }

  // ─── Connexions par jour (7 derniers jours) ────────────────────
  async getDailyStats() {
    const since = new Date();
    since.setDate(since.getDate() - 7);

    const events = await this.prisma.userEvent.findMany({
      where: { createdAt: { gte: since } },
      select: { createdAt: true, userId: true },
    });

    const byDay: Record<string, Set<string>> = {};
    for (const e of events) {
      const day = e.createdAt.toISOString().split('T')[0];
      if (!byDay[day]) byDay[day] = new Set();
      byDay[day].add(e.userId);
    }

    return Object.entries(byDay)
      .map(([date, users]) => ({ date, activeUsers: users.size }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  // ─── Répartition géographique des utilisateurs ────────────────
  async getGeoStats() {
    const users = await this.prisma.user.groupBy({
      by: ['ville'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 20,
    });

    return users.map((u) => ({
      ville: u.ville || 'Non renseignée',
      count: u._count.id,
    }));
  }

  // ─── Utilisateurs actifs dans les 10 dernières minutes ─────────
  async getActiveUsers() {
    const since = new Date(Date.now() - 10 * 60 * 1000);
    const active = await this.prisma.userEvent.findMany({
      where: { createdAt: { gte: since } },
      distinct: ['userId'],
      select: { user: { select: { id: true, nom: true, avatarUrl: true } } },
    });
    return { count: active.length, users: active.map((e) => e.user) };
  }

  // ─── Liste des plans pour modération ──────────────────────────
  async getPlans(page = 1, limit = 20, status?: string) {
    const skip = (page - 1) * limit;
    const where = status ? { status: status as any } : {};
    const [data, total] = await Promise.all([
      this.prisma.plan.findMany({
        where,
        include: { user: { select: { nom: true, email: true } }, categories: true },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.plan.count({ where }),
    ]);
    return { data, meta: { total, page, lastPage: Math.ceil(total / limit) } };
  }

  // ─── Modérer un plan (changer status / featured) ──────────────
  async updatePlan(id: string, data: { status?: string; isFeatured?: boolean }) {
    return this.prisma.plan.update({ where: { id }, data: data as any });
  }
}
