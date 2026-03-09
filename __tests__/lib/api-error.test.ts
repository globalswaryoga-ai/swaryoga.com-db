import { apiError, apiSuccess, validateRequired, logError } from '@/lib/api-error';

describe('apiError', () => {
  it('returns correct status and error body for enum code', async () => {
    const res = apiError('UNAUTHORIZED');
    expect(res.status).toBe(401);

    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toBe('Unauthorized - Please login');
    expect(body.code).toBe('UNAUTHORIZED');
    expect(body.timestamp).toBeDefined();
  });

  it('accepts custom message with enum code', async () => {
    const res = apiError('NOT_FOUND', 'Lead not found');
    const body = await res.json();
    expect(res.status).toBe(404);
    expect(body.error).toBe('Lead not found');
  });

  it('legacy pattern: apiError(message, httpStatus)', async () => {
    const res = apiError('Something broke', 502);
    expect(res.status).toBe(502);

    const body = await res.json();
    expect(body.error).toBe('Something broke');
  });

  it('includes details when provided', async () => {
    const res = apiError('VALIDATION_ERROR', 'Invalid phone', 'Phone must be 10 digits');
    const body = await res.json();
    expect(body.details).toBe('Phone must be 10 digits');
  });
});

describe('apiSuccess', () => {
  it('returns 200 with success body', async () => {
    const res = apiSuccess({ leads: [] });
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toEqual({ leads: [] });
    expect(body.timestamp).toBeDefined();
  });

  it('supports custom status code', async () => {
    const res = apiSuccess({ id: '123' }, 201);
    expect(res.status).toBe(201);
  });
});

describe('validateRequired', () => {
  it('returns valid:true when all fields present', () => {
    const result = validateRequired({ name: 'John', phone: '1234' }, ['name', 'phone']);
    expect(result.valid).toBe(true);
    expect(result.missing).toBeUndefined();
  });

  it('returns missing fields', () => {
    const result = validateRequired({ name: 'John' }, ['name', 'phone', 'email']);
    expect(result.valid).toBe(false);
    expect(result.missing).toEqual(['phone', 'email']);
  });
});

describe('logError', () => {
  it('logs structured error to console.error', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const err = new Error('test error');
    logError('test-context', err, { extra: 'info' });

    expect(spy).toHaveBeenCalledWith('[test-context] Error:', expect.objectContaining({
      message: 'test error',
      extra: 'info',
    }));
    spy.mockRestore();
  });
});
