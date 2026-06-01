import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { CustomerEntity, CustomerStatus } from '../../../entities/customer.entity';

export interface CustomerJwtPayload {
  sub: string;
  phone: string;
  role: 'customer';
}

const extractTokenFromHeader = (header: string): string | null => {
  if (!header) return null;
  const parts = header.trim().split(/\s+/);
  if (parts.length === 2 && /^bearer$/i.test(parts[0])) {
    return parts[1].trim();
  }
  return header.trim();
};

const customerJwtExtractor = (req: any): string | null => {
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
export class CustomerJwtStrategy extends PassportStrategy(Strategy, 'customer-jwt') {
  constructor(
    config: ConfigService,
    @InjectRepository(CustomerEntity)
    private readonly customerRepo: Repository<CustomerEntity>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([customerJwtExtractor]),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('CUSTOMER_JWT_SECRET', config.get<string>('JWT_SECRET', 'change-me')),
    });
  }

  async validate(payload: CustomerJwtPayload): Promise<CustomerJwtPayload> {
    if (payload.role !== 'customer') throw new UnauthorizedException();

    const customer = await this.customerRepo.findOne({
      where: { id: payload.sub, deletedAt: IsNull() },
    });

    if (!customer) throw new UnauthorizedException('Customer not found');
    if (customer.status === CustomerStatus.BANNED) {
      throw new UnauthorizedException('Account has been banned');
    }

    return payload;
  }
}
