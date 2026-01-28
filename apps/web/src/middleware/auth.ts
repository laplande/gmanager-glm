/**
 * JWT Authentication Middleware for GManager Web
 *
 * This module provides JWT verification middleware to protect
 * authenticated routes. It verifies tokens and extracts the
 * session key for decrypting account data.
 */

import type { Request, RequestHandler, Response } from 'express';
import jwt from 'jsonwebtoken';

/**
 * JWT payload structure
 */
export interface JWTPayload {
  /** Unique session identifier */
  sessionId: string;
  /** Timestamp when the token was issued */
  iat: number;
  /** Token expiration timestamp */
  exp: number;
}

/**
 * Extended Request type with authenticated session data
 */
export interface AuthenticatedRequest extends Request {
  /** The authenticated session ID */
  sessionId?: string;
  /** The decrypted session key (base64 encoded) */
  sessionKey?: string;
}

/**
 * JWT secret key for signing tokens
 * In production, this should come from environment variable
 */
const JWT_SECRET = process.env.JWT_SECRET || 'gmanager-jwt-secret-change-in-production';
const JWT_ISSUER = 'gmanager-web';

/**
 * Generates a JWT token for an authenticated session
 *
 * @param sessionId - The unique session identifier
 * @param expiresIn - Token expiration time (default: 24 hours)
 * @returns The signed JWT token
 */
export function generateToken(
  sessionId: string,
  expiresIn: string | number = '24h'
): string {
  return jwt.sign(
    { sessionId },
    JWT_SECRET,
    {
      issuer: JWT_ISSUER,
      expiresIn,
    } as jwt.SignOptions
  );
}

/**
 * Verifies a JWT token and returns the payload
 *
 * @param token - The JWT token to verify
 * @returns The decoded payload if valid
 * @throws Error if token is invalid or expired
 */
export function verifyToken(token: string): JWTPayload {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: JWT_ISSUER,
    }) as JWTPayload;
    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Token has expired');
    } else if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid token');
    }
    throw error;
  }
}

/**
 * Extracts the JWT token from the Authorization header
 *
 * @param authHeader - The Authorization header value
 * @returns The extracted token or null if not found
 */
export function extractTokenFromHeader(authHeader: string | undefined): string | null {
  if (!authHeader) {
    return null;
  }

  // Support both "Bearer <token>" and direct token formats
  const parts = authHeader.split(' ');
  if (parts.length === 2 && parts[0] === 'Bearer') {
    return parts[1];
  } else if (parts.length === 1) {
    return parts[0];
  }

  return null;
}

/**
 * Express middleware to verify JWT authentication
 *
 * This middleware:
 * 1. Extracts the JWT from the Authorization header
 * 2. Verifies the token signature and expiration
 * 3. Attaches the session ID to the request object
 * 4. Returns 401 if authentication fails
 *
 * Usage:
 * ```ts
 * import { authenticate } from './middleware/auth.js';
 * app.get('/api/accounts', authenticate, accountsController.list);
 * ```
 *
 * @param req - Express request
 * @param res - Express response
 * @param next - Express next function
 */
export const authenticate: RequestHandler = (
  req: AuthenticatedRequest,
  res: Response,
  next
): void => {
  try {
    const token = extractTokenFromHeader(req.headers.authorization);

    if (!token) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Missing authorization token',
      });
      return;
    }

    const payload = verifyToken(token);

    // Attach session data to request
    req.sessionId = payload.sessionId;

    next();
  } catch (error) {
    res.status(401).json({
      error: 'Unauthorized',
      message: error instanceof Error ? error.message : 'Authentication failed',
    });
  }
};

/**
 * Optional authentication middleware
 *
 * Unlike authenticate(), this does not return 401 if no token is present.
 * It simply attaches session data if a valid token is provided.
 *
 * Use this for endpoints that have enhanced features for authenticated users
 * but also work for guests.
 */
export const optionalAuthenticate: RequestHandler = (
  req: AuthenticatedRequest,
  res: Response,
  next
): void => {
  try {
    const token = extractTokenFromHeader(req.headers.authorization);

    if (token) {
      const payload = verifyToken(token);
      req.sessionId = payload.sessionId;
    }

    next();
  } catch {
    // Silently ignore auth errors for optional authentication
    next();
  }
};
