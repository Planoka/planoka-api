import {
  Controller,
  Get,
  Patch,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Ip,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { ReportsService } from '../reports/reports.service';
import { RolesGuard } from '../auth/roles.guard';
import { Roles, Public } from '../auth/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../auth/current-user.decorator';
import { RedisService } from '../../redis/redis.service';
import { AdminLoginDto } from './dto/admin-login.dto';
import { CreateAdminUserDto } from './dto/create-admin-user.dto';
import { AssignRoleDto } from './dto/assign-role.dto';
import { UpdateAdminUserDto } from './dto/update-admin-user.dto';
import { Role } from '@prisma/client';

@ApiTags('admin')
@Controller('admin')
@UseGuards(RolesGuard)
@Roles('ADMIN')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly reportsService: ReportsService,
    private readonly redis: RedisService,
  ) {}

  // ─── Authentification Administrateur (Sans Clerk) ───────────

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Connexion administrateur avec email et mot de passe (sans Clerk)',
    description:
      'Authentifie un compte ADMIN avec son adresse email et mot de passe hashé. Protégé contre les attaques par force brute (verrouillage temporaire après 5 échecs).',
  })
  @ApiResponse({ status: 200, description: 'Connexion réussie, retourne le token JWT et le profil admin.' })
  @ApiResponse({ status: 401, description: 'Email ou mot de passe incorrect.' })
  @ApiResponse({ status: 403, description: 'Compte non-administrateur refusé.' })
  @ApiResponse({ status: 429, description: 'Trop de tentatives infructueuses (rate limiting).' })
  async login(@Body() body: AdminLoginDto, @Ip() ip: string) {
    return this.adminService.login(body, ip);
  }

  @Get('me')
  @ApiBearerAuth('Clerk JWT')
  @ApiOperation({ summary: 'Récupérer le profil de l’administrateur connecté' })
  @ApiResponse({ status: 200, description: 'Profil de l’administrateur courant.' })
  async getMe(@CurrentUser() admin: AuthenticatedUser) {
    return this.adminService.getMe(admin.id);
  }

  // ─── Gestion des Utilisateurs & Rôles ─────────────────────────

  @Post('users')
  @ApiBearerAuth('Clerk JWT')
  @ApiOperation({
    summary: 'Créer un utilisateur et lui attribuer un rôle',
    description:
      'Permet à un administrateur de créer un compte utilisateur dans le système (USER, MODERATOR ou ADMIN) avec ou sans mot de passe local.',
  })
  @ApiResponse({ status: 201, description: 'Utilisateur créé avec succès.' })
  @ApiResponse({ status: 409, description: 'Email ou identifiant Clerk déjà utilisé.' })
  async createUser(@Body() dto: CreateAdminUserDto) {
    return this.adminService.createUser(dto);
  }

  @Get('users')
  @ApiBearerAuth('Clerk JWT')
  @ApiOperation({ summary: 'Liste paginée des utilisateurs avec filtres' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiQuery({ name: 'role', required: false, enum: Role })
  @ApiQuery({ name: 'search', required: false, description: 'Recherche par nom ou email' })
  async getUsers(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('role') role?: Role,
    @Query('search') search?: string,
  ) {
    return this.adminService.getUsers(+page, +limit, role, search);
  }

  @Get('users/:id')
  @ApiBearerAuth('Clerk JWT')
  @ApiOperation({ summary: 'Détails complets d’un utilisateur par son ID' })
  @ApiResponse({ status: 200, description: 'Informations détaillées de l’utilisateur.' })
  @ApiResponse({ status: 404, description: 'Utilisateur introuvable.' })
  async getUserById(@Param('id') id: string) {
    return this.adminService.getUserById(id);
  }

  @Patch('users/:id/role')
  @ApiBearerAuth('Clerk JWT')
  @ApiOperation({
    summary: 'Attribuer un rôle spécifique à un utilisateur',
    description:
      'Modifie le rôle d’un utilisateur dans le système (USER, MODERATOR, ADMIN). Empêche l’auto-rétrogradation de l’administrateur courant.',
  })
  @ApiResponse({ status: 200, description: 'Rôle mis à jour avec succès.' })
  @ApiResponse({ status: 400, description: 'Tentative d’auto-rétrogradation refusée.' })
  @ApiResponse({ status: 404, description: 'Utilisateur introuvable.' })
  async assignRole(
    @Param('id') id: string,
    @Body() dto: AssignRoleDto,
    @CurrentUser() admin: AuthenticatedUser,
  ) {
    return this.adminService.assignRole(id, dto, admin?.id);
  }

  @Patch('users/:id')
  @ApiBearerAuth('Clerk JWT')
  @ApiOperation({ summary: 'Modifier les informations ou le rôle d’un utilisateur' })
  async updateUser(
    @Param('id') id: string,
    @Body() dto: UpdateAdminUserDto,
    @CurrentUser() admin: AuthenticatedUser,
  ) {
    return this.adminService.updateUser(id, dto, admin?.id);
  }

  @Delete('users/:id')
  @ApiBearerAuth('Clerk JWT')
  @ApiOperation({ summary: 'Supprimer définitivement un utilisateur' })
  @ApiResponse({ status: 200, description: 'Utilisateur supprimé.' })
  @ApiResponse({ status: 400, description: 'Tentative de suppression de son propre compte refusée.' })
  @ApiResponse({ status: 404, description: 'Utilisateur introuvable.' })
  async deleteUser(
    @Param('id') id: string,
    @CurrentUser() admin: AuthenticatedUser,
  ) {
    return this.adminService.deleteUser(id, admin?.id);
  }

  // ─── KPIs globaux ──────────────────────────────────────────────
  @Get('stats')
  @ApiBearerAuth('Clerk JWT')
  @ApiOperation({ summary: 'Statistiques globales (KPIs)' })
  getStats() {
    return this.adminService.getStats();
  }

  // ─── Signalements ──────────────────────────────────────────────
  @Get('reports')
  @ApiBearerAuth('Clerk JWT')
  @ApiOperation({ summary: 'Liste de tous les signalements' })
  getReports() {
    return this.reportsService.findAll();
  }

  // ─── Sessions journalières ──────────────────────────────────────
  @Get('stats/sessions/daily')
  @ApiBearerAuth('Clerk JWT')
  @ApiOperation({ summary: 'Sessions journalières sur les 7 derniers jours' })
  getDailyStats() {
    return this.adminService.getDailyStats();
  }

  // ─── Répartition géographique ──────────────────────────────────
  @Get('stats/sessions/geo')
  @ApiBearerAuth('Clerk JWT')
  @ApiOperation({ summary: 'Répartition géographique des utilisateurs' })
  getGeoStats() {
    return this.adminService.getGeoStats();
  }

  // ─── Utilisateurs actifs en ce moment ─────────────────────────
  @Get('stats/sessions/active')
  @ApiBearerAuth('Clerk JWT')
  @ApiOperation({ summary: 'Utilisateurs actifs dans les 10 dernières minutes' })
  getActiveUsers() {
    return this.adminService.getActiveUsers();
  }

  // ─── Modération des plans ──────────────────────────────────────
  @Get('plans')
  @ApiBearerAuth('Clerk JWT')
  @ApiOperation({ summary: 'Liste des plans pour modération' })
  getPlans(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('status') status?: string,
  ) {
    return this.adminService.getPlans(+page, +limit, status);
  }

  @Patch('plans/:id')
  @ApiBearerAuth('Clerk JWT')
  @ApiOperation({ summary: 'Modérer un plan (statut ou mise en avant)' })
  updatePlan(
    @Param('id') id: string,
    @Body() body: { status?: string; isFeatured?: boolean },
  ) {
    return this.adminService.updatePlan(id, body);
  }

  // ─── Recalcul du cache feed ────────────────────────────────────
  @Post('feed/refresh')
  @ApiBearerAuth('Clerk JWT')
  @ApiOperation({ summary: 'Invalider et rafraîchir le cache du feed' })
  async refreshFeedCache() {
    const keys = await this.redis.keys('feed:recommended:*');
    if (keys.length > 0) {
      await Promise.all(keys.map((k) => this.redis.del(k)));
    }
    return { success: true, message: `${keys.length} cache(s) invalidé(s)` };
  }
}
