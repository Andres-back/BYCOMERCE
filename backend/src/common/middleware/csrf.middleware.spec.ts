import { csrfMiddleware } from './csrf.middleware';

function responseMock() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  };
}

describe('csrfMiddleware', () => {
  it('allows safe methods without csrf', () => {
    const req = {
      method: 'GET',
      originalUrl: '/api/v1/products',
      url: '/api/v1/products',
      header: jest.fn(),
    };
    const res = responseMock();
    const next = jest.fn();

    csrfMiddleware(req as never, res as never, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('rejects mutating cookie-authenticated requests without matching csrf', () => {
    const req = {
      method: 'POST',
      originalUrl: '/api/v1/products',
      url: '/api/v1/products',
      header: jest.fn((name: string) => (name === 'cookie' ? 'mocoa-access=jwt;mocoa-csrf=abc' : undefined)),
    };
    const res = responseMock();
    const next = jest.fn();

    csrfMiddleware(req as never, res as never, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('allows mutating cookie-authenticated requests with matching csrf', () => {
    const req = {
      method: 'PATCH',
      originalUrl: '/api/v1/products/1',
      url: '/api/v1/products/1',
      header: jest.fn((name: string) => {
        if (name === 'cookie') return 'mocoa-access=jwt;mocoa-csrf=abc';
        if (name === 'x-csrf-token') return 'abc';
        return undefined;
      }),
    };
    const res = responseMock();
    const next = jest.fn();

    csrfMiddleware(req as never, res as never, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });
});
