import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { m4Config } from '../config/m4Config';

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role: 'Admin' | 'Export Manager' | 'Logistics Coordinator' | 'Research Analyst';
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export function authenticateJWT(req: Request, res: Response, next: NextFunction): void {
  // Check authorization header or cookie
  const authHeader = req.headers.authorization;
  let token: string | undefined;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else if (req.headers.cookie) {
    const cookies = req.headers.cookie.split(';');
    for (const c of cookies) {
      const [k, v] = c.trim().split('=');
      if (k === 'ceylon_token') {
        token = v;
        break;
      }
    }
  }

  if (!token) {
    res.status(401).json({
      success: false,
      message: 'Authentication required. Please sign in.',
    });
    return;
  }

  try {
    const decoded = jwt.verify(token, m4Config.jwtSecret) as AuthenticatedUser;
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Session expired or invalid token. Please sign in again.',
    });
    return;
  }
}
