import { validateEnv } from './env.validation';

// The validator is the single guarantee that a mis-configured deploy fails
// at boot instead of at first request. Any regression here means silent prod
// breakage — cover every failure mode.

describe('validateEnv', () => {
  const goodEnv = {
    NODE_ENV: 'development',
    DATABASE_URL: 'postgresql://u:p@localhost:5432/db',
    JWT_ACCESS_SECRET: 'x'.repeat(32),
    JWT_REFRESH_SECRET: 'y'.repeat(32),
  };

  it('accepts a minimal valid env', () => {
    expect(() => validateEnv(goodEnv)).not.toThrow();
  });

  it('rejects a missing DATABASE_URL', () => {
    const { DATABASE_URL: _drop, ...env } = goodEnv;
    expect(() => validateEnv(env)).toThrow(/DATABASE_URL/);
  });

  it('rejects a short JWT_ACCESS_SECRET', () => {
    expect(() =>
      validateEnv({ ...goodEnv, JWT_ACCESS_SECRET: 'short' }),
    ).toThrow(/JWT_ACCESS_SECRET/);
  });

  it('rejects a short JWT_REFRESH_SECRET', () => {
    expect(() =>
      validateEnv({ ...goodEnv, JWT_REFRESH_SECRET: 'short' }),
    ).toThrow(/JWT_REFRESH_SECRET/);
  });

  it('rejects a bogus CLOUDINARY_URL protocol', () => {
    expect(() =>
      validateEnv({ ...goodEnv, CLOUDINARY_URL: 'https://not-cloudinary/x' }),
    ).toThrow(/CLOUDINARY_URL/);
  });

  it('accepts a well-formed CLOUDINARY_URL', () => {
    expect(() =>
      validateEnv({
        ...goodEnv,
        CLOUDINARY_URL: 'cloudinary://12345:abcdef@my-cloud',
      }),
    ).not.toThrow();
  });

  it('reports every failure together in a single throw', () => {
    let msg = '';
    try {
      validateEnv({ NODE_ENV: 'development' });
    } catch (e) {
      msg = (e as Error).message;
    }
    expect(msg).toMatch(/DATABASE_URL/);
    expect(msg).toMatch(/JWT_ACCESS_SECRET/);
    expect(msg).toMatch(/JWT_REFRESH_SECRET/);
  });
});
