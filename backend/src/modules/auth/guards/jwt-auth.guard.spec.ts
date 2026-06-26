import { ExecutionContext } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';

function contextWithCookie(cookie: string): ExecutionContext {
  const request = {
    header: jest.fn((name: string) => (name === 'cookie' ? cookie : undefined)),
  };

  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as unknown as ExecutionContext;
}

describe('JwtAuthGuard', () => {
  it('uses the HttpOnly access cookie as the primary token source', async () => {
    const jwt = {
      verifyAsync: jest.fn().mockResolvedValue({
        sub: 'user-1',
        email: 'admin@demo.com',
        rol: 'ADMIN_NEGOCIO',
        tenantId: 'tenant-1',
        isSuperAdmin: false,
        impersonatedBy: null,
      }),
    };
    const config = {
      get: jest.fn(() => 'secret'),
    };
    const tenantContext = {
      set: jest.fn(),
    };
    const guard = new JwtAuthGuard(jwt as never, config as never, tenantContext as never);
    const context = contextWithCookie('mocoa-access=cookie.jwt.value');

    await expect(guard.canActivate(context)).resolves.toBe(true);

    expect(jwt.verifyAsync).toHaveBeenCalledWith('cookie.jwt.value', { secret: 'secret' });
    expect(tenantContext.set).toHaveBeenCalledWith({
      tenantId: 'tenant-1',
      userId: 'user-1',
      isSuperAdmin: false,
      isImpersonating: false,
    });
  });
});
