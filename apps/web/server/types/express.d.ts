/**
 * Express type extensions
 * Extends Express Request to include user information from JWT
 */

import type { Request } from 'express';

export interface JwtPayload {
  /** User identifier (always 'master' for single-user mode) */
  userId: string;
  /** Token issued at timestamp */
  iat: number;
  /** Token expiration timestamp */
  exp: number;
}

export interface AuthenticatedRequest extends Request {
  /** JWT payload from authenticated user */
  user?: JwtPayload;
  /** Derived encryption key for data operations */
  encryptionKey?: Buffer;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
      encryptionKey?: Buffer;
    }
  }
}
