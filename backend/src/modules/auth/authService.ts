import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { m4Config } from '../../config/m4Config';
import { SEED_USERS, SeedUser } from '../users/userSeed';
import { pool } from '../../database/pool';

export interface AuthTokenResponse {
  token: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: SeedUser['role'];
    organization: string;
  };
}

export class AuthService {
  async findUserByEmail(email: string): Promise<SeedUser | null> {
    const normalized = email.trim().toLowerCase();

    // Check PostgreSQL users table first if available
    try {
      const res = await pool.query(
        'SELECT id, email, password_hash AS "passwordHash", name, role, organization FROM users WHERE LOWER(email) = $1 LIMIT 1',
        [normalized]
      );
      if (res.rows.length > 0) {
        return res.rows[0] as SeedUser;
      }
    } catch (dbErr) {
      // If table does not exist yet or connection fails, use deterministic seed users
    }

    // Fallback to verified seed users list
    const found = SEED_USERS.find((u) => u.email.toLowerCase() === normalized);
    return found || null;
  }

  async authenticate(email: string, passwordPlain: string): Promise<AuthTokenResponse | null> {
    const user = await this.findUserByEmail(email);
    if (!user) {
      return null;
    }

    const isMatch = await bcrypt.compare(passwordPlain, user.passwordHash);
    if (!isMatch) {
      return null;
    }

    const payload = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      organization: user.organization,
    };

    const token = jwt.sign(payload, m4Config.jwtSecret, {
      expiresIn: '24h',
    });

    return {
      token,
      user: payload,
    };
  }

  verifyToken(token: string) {
    try {
      return jwt.verify(token, m4Config.jwtSecret);
    } catch {
      return null;
    }
  }
}

export const authService = new AuthService();
