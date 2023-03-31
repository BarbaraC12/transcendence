import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Config } from 'src/config.interface';

@Injectable()
export class AuthService {
  private readonly accessSecret: string;
  private readonly refreshSecret: string;

  constructor(private readonly jwt: JwtService, config: ConfigService<Config>) {
    this.accessSecret = config.getOrThrow('JWT_ACCESS_SECRET');
    this.refreshSecret = config.getOrThrow('JWT_REFRESH_SECRET');
  }

  async signAccessToken(id: number) {
    return this.jwt.signAsync(
      { id },
      {
        expiresIn: '1h',
        secret: this.accessSecret,
      },
    );
  }

  async signRefreshToken(id: number) {
    return this.jwt.signAsync(
      { id },
      {
        expiresIn: '7d',
        secret: this.refreshSecret,
      },
    );
  }
}
