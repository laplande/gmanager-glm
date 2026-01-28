/**
 * Authentication middleware
 * Verifies JWT tokens and attaches user info to request
 */

import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../services/auth.service.js';

/**
 * Middleware to authenticate requests using JWT
 */
export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized: No token provided' });
    return;
  }

  const token = authHeader.substring(7); // Remove 'Bearer ' prefix
  const result = verifyToken(token);

  if (!result.valid || !result.payload) {
    res.status(401).json({ error: 'Unauthorized: Invalid token' });
    return;
  }

  // Attach user info to request
  req.user = {
    userId: result.payload.userId as string,
    iat: result.payload.iat ?? 0,
    exp: result.payload.exp ?? 0
  };

  next();
}

/**
 * Optional authentication - doesn't fail if no token
 */
export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const result = verifyToken(token);

    if (result.valid && result.payload) {
      req.user = {
        userId: result.payload.userId as string,
        iat: result.payload.iat ?? 0,
        exp: result.payload.exp ?? 0
      };
    }
  }

  next();
}
