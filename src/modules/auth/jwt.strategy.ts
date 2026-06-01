import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

const extractTokenFromHeader = (header: string): string | null => {
  if (!header) return null;
  const parts = header.trim().split(/\s+/);
  if (parts.length === 2 && /^bearer$/i.test(parts[0])) {
    return parts[1].trim();
  }
  return header.trim();
};

const jwtExtractor = (req: any): string | null => {
  if (!req) return null;

  const header =
    req.headers?.authorization ||
    req.headers?.Authorization ||
    req.headers?.['x-access-token'] ||
    req.headers?.['x-auth-token'];

  if (typeof header === 'string') {
    return extractTokenFromHeader(header);
  }

  if (req.query?.token) return String(req.query.token);
  if (req.query?.access_token) return String(req.query.access_token);
  if (req.query?.auth_token) return String(req.query.auth_token);
  if (req.body?.token) return String(req.body.token);
  if (req.body?.access_token) return String(req.body.access_token);
  if (req.body?.auth_token) return String(req.body.auth_token);
  return null;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        jwtExtractor,
        ExtractJwt.fromUrlQueryParameter('token'),
        ExtractJwt.fromBodyField('token'),
      ]),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET', 'change-me'),
    });
  }

  async validate(payload: { sub: string; role: string }) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { restaurant: true },
    });

    return {
      id: user?.id ?? payload.sub,
      role: payload.role,
      restaurant: user?.restaurant ? { id: user.restaurant.id } : null,
    };
  }
}