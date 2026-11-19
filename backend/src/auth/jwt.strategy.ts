import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

import { getJwtSecret } from './jwt.config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: getJwtSecret(),
    });
  }

  async validate(payload: {
    id: string;
    email: string;
    rol?: string;
    tokenVersion?: number;
    sessionStart?: number;
  }) {
    const user = await this.prisma.usuario.findUnique({
      where: { id: payload.id },
    });

    if (!user) {
      throw new UnauthorizedException('Token inválido: usuario no encontrado');
    }

    if (!user.activo) {
      throw new UnauthorizedException('Cuenta desactivada o bloqueada por seguridad');
    }

    // Revocación inmediata por tokenVersion (SEC-08)
    if (
      payload.tokenVersion !== undefined &&
      user.tokenVersion !== payload.tokenVersion
    ) {
      throw new UnauthorizedException(
        'Sesión revocada o cerrada en otro dispositivo. Por favor ingresa nuevamente.',
      );
    }

    // Tope absoluto de sesión de 8 horas (SEC-08)
    const MAX_SESSION_DURATION_MS = 8 * 60 * 60 * 1000;
    if (
      payload.sessionStart &&
      Date.now() - payload.sessionStart > MAX_SESSION_DURATION_MS
    ) {
      throw new UnauthorizedException(
        'Tope máximo de sesión alcanzado (8 horas continuas). Por favor inicia sesión nuevamente.',
      );
    }

    const { password, ...result } = user;
    return {
      ...result,
      sessionStart: payload.sessionStart || Date.now(),
    };
  }
}
