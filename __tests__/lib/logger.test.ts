import { logger, withErrorLogging } from '@/lib/logger';

describe('logger', () => {
  const originalConsole = { ...console };

  beforeEach(() => {
    console.log = jest.fn();
    console.warn = jest.fn();
    console.error = jest.fn();
    console.debug = jest.fn();
  });

  afterEach(() => {
    Object.assign(console, originalConsole);
  });

  it('logger.info emits structured JSON to console.log', () => {
    logger.info('leads', 'Lead created', { leadId: '123' });

    expect(console.log).toHaveBeenCalledTimes(1);
    const line = (console.log as jest.Mock).mock.calls[0][0];
    const parsed = JSON.parse(line);

    expect(parsed.level).toBe('info');
    expect(parsed.domain).toBe('leads');
    expect(parsed.msg).toBe('Lead created');
    expect(parsed.ctx).toEqual({ leadId: '123' });
    expect(parsed.ts).toBeDefined();
    expect(parsed.epoch).toBeGreaterThan(0);
  });

  it('logger.error captures error message and stack', () => {
    const err = new Error('DB connection failed');
    logger.error('db', 'Connection failure', err, { host: 'localhost' });

    expect(console.error).toHaveBeenCalledTimes(1);
    const parsed = JSON.parse((console.error as jest.Mock).mock.calls[0][0]);

    expect(parsed.level).toBe('error');
    expect(parsed.err).toBe('DB connection failed');
    expect(parsed.stack).toContain('Error: DB connection failed');
    expect(parsed.ctx).toEqual({ host: 'localhost' });
  });

  it('logger.warn uses console.warn', () => {
    logger.warn('auth', 'Token expiring');
    expect(console.warn).toHaveBeenCalledTimes(1);
  });

  it('logger.error coerces non-Error to string', () => {
    logger.error('api', 'Bad thing', 'string error');

    const parsed = JSON.parse((console.error as jest.Mock).mock.calls[0][0]);
    expect(parsed.err).toBe('string error');
  });
});

describe('withErrorLogging', () => {
  beforeEach(() => {
    console.error = jest.fn();
  });

  it('returns handler response on success', async () => {
    const handler = withErrorLogging('api', async () => {
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    });

    const res = await handler(new Request('http://localhost/api/test'));
    expect(res.status).toBe(200);
  });

  it('catches thrown errors and returns 500 JSON', async () => {
    const handler = withErrorLogging('api', async () => {
      throw new Error('boom');
    });

    const res = await handler(new Request('http://localhost/api/test'));
    expect(res.status).toBe(500);

    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toBe('Internal server error');
    expect(console.error).toHaveBeenCalled();
  });
});
