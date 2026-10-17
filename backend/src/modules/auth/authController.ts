import { Request, Response } from 'express';
import { authService } from './authService';

export async function loginController(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({
      success: false,
      message: 'Both email and password are required.',
    });
    return;
  }

  const result = await authService.authenticate(email, password);
  if (!result) {
    res.status(401).json({
      success: false,
      message: 'Invalid credentials. Please verify your email and password.',
    });
    return;
  }

  // Set secure cookie
  res.cookie('ceylon_token', result.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000,
  });

  res.json({
    success: true,
    message: 'Authentication successful',
    token: result.token,
    user: result.user,
  });
}

export function logoutController(_req: Request, res: Response): void {
  res.clearCookie('ceylon_token');
  res.json({
    success: true,
    message: 'Logged out successfully',
  });
}

export function getMeController(req: Request, res: Response): void {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Not authenticated' });
    return;
  }
  res.json({
    success: true,
    user: req.user,
  });
}

export function getDevSeedAccounts(_req: Request, res: Response): void {
  res.json({
    success: true,
    accounts: [
      { role: 'Admin', email: 'admin@ceylonintelligence.lk', pass: 'CeylonAdmin2026!' },
      { role: 'Export Manager', email: 'export.manager@ceylonintelligence.lk', pass: 'ExportMgr2026!' },
      { role: 'Logistics Coordinator', email: 'logistics@ceylonintelligence.lk', pass: 'Logistics2026!' },
      { role: 'Research Analyst', email: 'analyst@ceylonintelligence.lk', pass: 'Analyst2026!' },
    ],
  });
}
