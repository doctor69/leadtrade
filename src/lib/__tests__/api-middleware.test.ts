import { vi, describe, it, expect, beforeEach } from 'vitest';
import { withApiMiddleware, createApiResponse, withRateLimit } from '../api-middleware';

describe('API Middleware', () => {
  describe('withApiMiddleware', () => {
    it('should execute handler successfully and log request', async () => {
      const mockRequest = {
        method: 'GET',
        url: '/api/test',
        query: {},
        body: {}
      };

      const mockResponse = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
        headersSent: false
      };

      const mockHandler = vi.fn().mockResolvedValue({ success: true });
      const wrappedHandler = withApiMiddleware(mockHandler);

      await wrappedHandler(mockRequest as any, mockResponse as any);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({ success: true, data: { success: true } });
      expect(mockHandler).toHaveBeenCalledWith(mockRequest, mockResponse);
    });

    it('should handle validation errors', async () => {
      const mockRequest = {
        method: 'GET',
        url: '/api/test',
        query: {},
        body: {}
      };

      const mockResponse = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
        headersSent: false
      };

      const mockHandler = vi.fn().mockRejectedValue(new Error('Validation error'));
      const wrappedHandler = withApiMiddleware(mockHandler);

      await wrappedHandler(mockRequest as any, mockResponse as any);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Something went wrong. Our team has been notified and is working on a fix.',
          recoveryOptions: [],
          retryable: false
        }
      });
    });

    it('should handle authentication requirement', async () => {
      const mockRequest = {
        method: 'GET',
        url: '/api/test',
        query: {},
        body: {}
      };

      const mockResponse = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
        headersSent: false
      };

      const mockHandler = vi.fn().mockRejectedValue(new Error('Authentication required'));
      const wrappedHandler = withApiMiddleware(mockHandler);

      await wrappedHandler(mockRequest as any, mockResponse as any);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Something went wrong. Our team has been notified and is working on a fix.',
          recoveryOptions: [],
          retryable: false
        }
      });
    });
  });

  describe('createApiResponse', () => {
    it('should create successful API response', () => {
      const data = { id: 1, name: 'Test' };
      const { response, status } = createApiResponse(data, undefined, 201);

      expect(status).toBe(201);
      expect(response).toEqual({
        success: true,
        data: { id: 1, name: 'Test' }
      });
    });
  });

  describe('withRateLimit', () => {
    it('should allow requests within rate limit', async () => {
      const mockRequest = {
        method: 'GET',
        url: '/api/test',
        query: {},
        body: {},
        ip: '127.0.0.1'
      };

      const mockResponse = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
        headersSent: false
      };

      const mockHandler = vi.fn().mockResolvedValue({ success: true });
      const rateLimitMiddleware = withRateLimit(5, 1000);
      const wrappedHandler = rateLimitMiddleware(mockHandler);

      await wrappedHandler(mockRequest as any, mockResponse as any);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({ success: true, data: { success: true } });
    });

    it('should block requests exceeding rate limit', async () => {
      const mockRequest = {
        method: 'GET',
        url: '/api/test',
        query: {},
        body: {},
        ip: '127.0.0.1'
      };

      const mockResponse = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
        headersSent: false
      };

      const mockHandler = vi.fn().mockResolvedValue({ success: true });
      const rateLimitMiddleware = withRateLimit(1, 1000);
      const wrappedHandler = rateLimitMiddleware(mockHandler);
      
      // First request should succeed
      await wrappedHandler(mockRequest as any, mockResponse as any);
      
      // Second request should be rate limited
      await wrappedHandler(mockRequest as any, mockResponse as any);

      expect(mockResponse.status).toHaveBeenCalledWith(429);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests. Please wait before trying again.',
          recoveryOptions: [
            {
              action: 'retry',
              label: 'Try Again',
              description: 'Wait a few seconds and retry your request'
            }
          ],
          retryable: true
        }
      });
    });

    it('should use custom key generator', async () => {
      const mockRequest = {
        method: 'GET',
        url: '/api/test',
        query: {},
        body: {},
        headers: {
          'x-api-key': 'test-key'
        }
      };

      const mockResponse = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
        headersSent: false
      };

      const mockHandler = vi.fn().mockResolvedValue({ success: true });
      const keyGenerator = (req: any) => req.headers['x-api-key'];
      const rateLimitMiddleware = withRateLimit(1, 1000, keyGenerator);
      const wrappedHandler = rateLimitMiddleware(mockHandler);
      
      // First request should succeed
      await wrappedHandler(mockRequest as any, mockResponse as any);
      
      // Second request should be rate limited
      await wrappedHandler(mockRequest as any, mockResponse as any);

      expect(mockResponse.status).toHaveBeenCalledWith(429);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests. Please wait before trying again.',
          recoveryOptions: [
            {
              action: 'retry',
              label: 'Try Again',
              description: 'Wait a few seconds and retry your request'
            }
          ],
          retryable: true
        }
      });
    });
  });
});