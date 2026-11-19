import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;
    
    const user = await this.prisma.usuario.findUnique({
      where: { email },
    });

    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    if (!user.activo) {
      throw new UnauthorizedException('Cuenta desactivada o bloqueada');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const sessionStart = Date.now();
    const payload = {
      id: user.id,
      email: user.email,
      rol: user.rol,
      tokenVersion: user.tokenVersion,
      sessionStart,
    };

    return {
      accessToken: this.jwtService.sign(payload),
      expiresIn: 1800, // 30 minutos (en segundos)
      sessionStart,
      user: {
        id: user.id,
        email: user.email,
        nombre: user.nombre,
        rol: user.rol,
      },
    };
  }

  /**
   * Cierre de sesión y revocación inmediata de tokens activos (SEC-08):
   * Incrementa tokenVersion en la base de datos, invalidando cualquier JWT previo.
   */
  async logout(userId: string) {
    await this.prisma.usuario.update({
      where: { id: userId },
      data: { tokenVersion: { increment: 1 } },
    });
    return {
      message: 'Sesión cerrada exitosamente. Tokens previos revocados de inmediato.',
    };
  }

  /**
   * Renovación de token por actividad con tope absoluto de 8 horas (SEC-08).
   */
  async refreshToken(user: any) {
    const sessionStart = user.sessionStart || Date.now();
    const MAX_SESSION_DURATION_MS = 8 * 60 * 60 * 1000; // 8 horas

    if (Date.now() - sessionStart > MAX_SESSION_DURATION_MS) {
      throw new UnauthorizedException(
        'Tope máximo de sesión alcanzado (8 horas continuas). Por favor inicia sesión nuevamente.',
      );
    }

    const freshUser = await this.prisma.usuario.findUnique({
      where: { id: user.id },
    });

    if (!freshUser || !freshUser.activo || freshUser.tokenVersion !== user.tokenVersion) {
      throw new UnauthorizedException('Sesión inválida o revocada');
    }

    const payload = {
      id: freshUser.id,
      email: freshUser.email,
      rol: freshUser.rol,
      tokenVersion: freshUser.tokenVersion,
      sessionStart,
    };

    return {
      accessToken: this.jwtService.sign(payload),
      expiresIn: 1800, // 30 minutos
      sessionStart,
    };
  }
}
