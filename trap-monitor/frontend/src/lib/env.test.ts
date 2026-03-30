import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// We cannot import env.ts directly at top level because it eagerly validates
// NEXT_PUBLIC_* vars and throws. Instead, we test validateVars via dynamic
// import after setting up the required env vars.

describe('validateVars', () => {
  let validateVars: typeof import('./env').validateVars;

  beforeEach(async () => {
    // Set required public env vars so the module-level validation passes
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test-anon-key');
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'http://localhost:3002');
    vi.stubEnv('NEXT_PUBLIC_VAPID_PUBLIC_KEY', 'test-vapid-key');

    // Reset module cache so env.ts re-evaluates
    vi.resetModules();
    const envModule = await import('./env');
    validateVars = envModule.validateVars;
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns no errors when all vars are present and valid', () => {
    const spec = {
      MY_VAR: undefined,
      MY_URL: { startsWith: 'https://' },
    };
    const source = {
      MY_VAR: 'some-value',
      MY_URL: 'https://example.com',
    };

    const { validated, errors } = validateVars(spec, source);
    expect(errors).toHaveLength(0);
    expect(validated.MY_VAR).toBe('some-value');
    expect(validated.MY_URL).toBe('https://example.com');
  });

  it('reports error when required var is missing', () => {
    const spec = { MISSING_VAR: undefined };
    const source: Record<string, string | undefined> = {};

    const { errors } = validateVars(spec, source);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('MISSING_VAR');
    expect(errors[0]).toContain('missing');
  });

  it('reports error when startsWith rule is violated', () => {
    const spec = { MY_URL: { startsWith: 'https://' } };
    const source = { MY_URL: 'http://not-secure.com' };

    const { errors } = validateVars(spec, source);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('MY_URL');
    expect(errors[0]).toContain('must start with');
    expect(errors[0]).toContain('https://');
  });

  it('collects multiple errors in single array', () => {
    const spec = {
      VAR_A: undefined,
      VAR_B: undefined,
      VAR_C: { startsWith: 'prefix:' },
    };
    const source: Record<string, string | undefined> = {};

    const { errors } = validateVars(spec, source);
    expect(errors).toHaveLength(3);
  });

  it('includes startsWith hint in missing var error when rule has startsWith', () => {
    const spec = { MY_URL: { startsWith: 'https://' } };
    const source: Record<string, string | undefined> = {};

    const { errors } = validateVars(spec, source);
    expect(errors[0]).toContain('must start with');
    expect(errors[0]).toContain('https://');
  });

  it('passes valid vars through even when some are invalid', () => {
    const spec = {
      GOOD_VAR: undefined,
      BAD_VAR: undefined,
    };
    const source = { GOOD_VAR: 'value' };

    const { validated, errors } = validateVars(spec, source);
    expect(errors).toHaveLength(1);
    expect(validated.GOOD_VAR).toBe('value');
    expect(validated.BAD_VAR).toBeUndefined();
  });

  it('treats empty string as missing', () => {
    const spec = { EMPTY_VAR: undefined };
    const source = { EMPTY_VAR: '' };

    const { errors } = validateVars(spec, source);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('EMPTY_VAR');
  });
});

describe('getServerEnv', () => {
  beforeEach(() => {
    // Set required public env vars so module-level validation passes
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test-anon-key');
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'http://localhost:3002');
    vi.stubEnv('NEXT_PUBLIC_VAPID_PUBLIC_KEY', 'test-vapid-key');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('returns ServerEnv when all server vars are set', async () => {
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-key');
    vi.stubEnv('TELSTRA_API_TOKEN', 'test-telstra-token');
    vi.stubEnv('DEFAULT_CMD_PIN', '1234');
    vi.stubEnv('VAPID_PRIVATE_KEY', 'test-vapid-private');
    vi.stubEnv('VAPID_EMAIL', 'mailto:test@example.com');
    vi.stubEnv('SUPABASE_WEBHOOK_SECRET', 'test-webhook-secret');

    vi.resetModules();
    const { getServerEnv } = await import('./env');
    const env = getServerEnv();

    expect(env.SUPABASE_SERVICE_ROLE_KEY).toBe('test-service-key');
    expect(env.TELSTRA_API_TOKEN).toBe('test-telstra-token');
    expect(env.DEFAULT_CMD_PIN).toBe('1234');
    expect(env.VAPID_PRIVATE_KEY).toBe('test-vapid-private');
    expect(env.VAPID_EMAIL).toBe('mailto:test@example.com');
    expect(env.SUPABASE_WEBHOOK_SECRET).toBe('test-webhook-secret');
  });

  it('throws Error when a required server var is missing', async () => {
    // Set some but not all
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-key');
    // TELSTRA_API_TOKEN intentionally missing

    vi.resetModules();
    const { getServerEnv } = await import('./env');

    expect(() => getServerEnv()).toThrow('Missing or invalid environment variables');
  });

  it('throws Error with var name when VAPID_EMAIL is missing mailto: prefix', async () => {
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-key');
    vi.stubEnv('TELSTRA_API_TOKEN', 'test-telstra-token');
    vi.stubEnv('DEFAULT_CMD_PIN', '1234');
    vi.stubEnv('VAPID_PRIVATE_KEY', 'test-vapid-private');
    vi.stubEnv('VAPID_EMAIL', 'test@example.com'); // missing mailto: prefix
    vi.stubEnv('SUPABASE_WEBHOOK_SECRET', 'test-webhook-secret');

    vi.resetModules();
    const { getServerEnv } = await import('./env');

    expect(() => getServerEnv()).toThrow('VAPID_EMAIL');
  });
});
