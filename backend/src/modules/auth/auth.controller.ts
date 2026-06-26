import { Body, Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'node:crypto';
import { Request, Response } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ACCESS_COOKIE, CSRF_COOKIE, getCookie, REFRESH_COOKIE } from '../../common/security/cookies';
import { RequestUser } from '../../common/types/request-user';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Post('login')
  async login(@Body() dto: LoginDto, @Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const tokens = await this.authService.login(dto, request.ip, request.header('user-agent'));
    this.setAuthCookies(response, tokens.accessToken, tokens.refreshToken);
    return this.authService.toSession(tokens);
  }

  @Post('refresh')
  async refresh(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const tokens = await this.authService.refresh(
      getCookie(request, REFRESH_COOKIE),
      request.ip,
      request.header('user-agent'),
    );
    this.setAuthCookies(response, tokens.accessToken, tokens.refreshToken);
    return this.authService.toSession(tokens);
  }

  @Post('logout')
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    await this.authService.logout(getCookie(request, REFRESH_COOKIE));
    this.clearAuthCookies(response);
    return { ok: true };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: RequestUser) {
    return user;
  }

  private setAuthCookies(response: Response, accessToken: string, refreshToken: string): void {
    const secure = this.config.get<string>('nodeEnv') === 'production';
    const accessTtl = this.config.get<number>('jwt.accessTtl') ?? 900;
    const refreshTtl = this.config.get<number>('jwt.refreshTtl') ?? 604800;
    const csrfToken = randomBytes(32).toString('base64url');

    response.cookie(ACCESS_COOKIE, accessToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure,
      path: '/',
      maxAge: accessTtl * 1000,
    });
    response.cookie(REFRESH_COOKIE, refreshToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure,
      path: '/',
      maxAge: refreshTtl * 1000,
    });
    response.cookie(CSRF_COOKIE, csrfToken, {
      httpOnly: false,
      sameSite: 'lax',
      secure,
      path: '/',
      maxAge: refreshTtl * 1000,
    });
  }

  private clearAuthCookies(response: Response): void {
    const secure = this.config.get<string>('nodeEnv') === 'production';
    for (const name of [ACCESS_COOKIE, REFRESH_COOKIE, CSRF_COOKIE]) {
      response.clearCookie(name, {
        sameSite: 'lax',
        secure,
        path: '/',
      });
    }
  }
}
