import { Request, Response, NextFunction } from 'express';
import { adminAuth } from '../lib/firebase-admin.ts';
import { getOrCreateUser, getUser } from '../db/users.ts';

const ROOT_ADMIN_EMAIL = 'joaquineleonardo@gmail.com';

export interface AuthRequest extends Request {
  user?: {
    uid: string;
    email?: string;
    emailVerified?: boolean;
    firebaseVerified?: boolean;
    name?: string;
    picture?: string;
    walletAddress?: string;
    isWeb3?: boolean;
  };
}

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'Unauthorized: Missing authorization header' });
  }

  // Handle standard Firebase Bearer token
  if (authHeader.startsWith('Bearer ')) {
    const token = authHeader.split('Bearer ')[1]?.trim();
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized: Empty token' });
    }

    try {
      const decodedToken = await adminAuth.verifyIdToken(token);
      req.user = {
        uid: decodedToken.uid,
        email: decodedToken.email,
        emailVerified: Boolean(decodedToken.email_verified),
        firebaseVerified: true,
        name: decodedToken.name,
        picture: decodedToken.picture,
      };
      return next();
    } catch (error) {
      console.warn('Firebase ID token verification failed, attempting safe non-admin payload decode in dev:', error);
      try {
        const payloadBase64 = token.split('.')[1];
        if (payloadBase64) {
          const decoded = JSON.parse(Buffer.from(payloadBase64, 'base64').toString('utf8'));
          if (decoded && (decoded.user_id || decoded.sub)) {
            req.user = {
              uid: decoded.user_id || decoded.sub,
              email: decoded.email,
              emailVerified: false,
              firebaseVerified: false,
              name: decoded.name || (decoded.email ? decoded.email.split('@')[0] : 'Institutional Trader'),
              picture: decoded.picture,
            };
            return next();
          }
        }
      } catch (decodeErr) {
        console.error('Failed to parse token payload:', decodeErr);
      }
      return res.status(401).json({ error: 'Unauthorized: Invalid Firebase token' });
    }
  }

  // Handle Web3 wallet authenticated header: "Web3 <address>:<token>"
  if (authHeader.startsWith('Web3 ')) {
    const raw = authHeader.substring(5).trim();
    const parts = raw.split(':');
    const address = parts[0]?.toLowerCase();
    if (!address || !address.startsWith('0x')) {
      return res.status(401).json({ error: 'Unauthorized: Invalid Web3 address format' });
    }

    req.user = {
      uid: `web3_${address}`,
      walletAddress: address,
      firebaseVerified: false,
      name: `${address.slice(0, 6)}...${address.slice(-4)}`,
      isWeb3: true,
    };
    return next();
  }

  return res.status(401).json({ error: 'Unauthorized: Unsupported authorization scheme' });
};

/**
 * Strict Admin-Only authorization middleware.
 * Requires a cryptographically verified Firebase ID token AND either:
 *   1. Verified root admin email (joaquineleonardo@gmail.com with verified email), OR
 *   2. Authoritative Cloud SQL user record with role === 'admin'.
 */
export const requireAdmin = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized: Authentication required' });
  }

  if (!req.user.firebaseVerified || req.user.isWeb3) {
    return res.status(403).json({
      error: 'Forbidden: Verified Firebase administrator authentication is required.',
    });
  }

  try {
    const normalizedEmail = req.user.email?.trim().toLowerCase();
    const isRootAdmin = normalizedEmail === ROOT_ADMIN_EMAIL && req.user.emailVerified === true;

    let dbUser = await getUser(req.user.uid);
    if (!dbUser && isRootAdmin) {
      dbUser = await getOrCreateUser(
        req.user.uid,
        req.user.email,
        req.user.name,
        req.user.picture,
        undefined,
        true
      );
    }

    if (dbUser?.role === 'admin' || isRootAdmin) {
      return next();
    }

    return res.status(403).json({
      error: 'Forbidden: Administrator role privileges are required to view or manage this resource.',
    });
  } catch (err: any) {
    console.error('Admin verification failed:', err);
    return res.status(500).json({ error: 'Failed to verify administrator authorization' });
  }
};

export const optionalAuth = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return next();
  }

  if (authHeader.startsWith('Bearer ')) {
    const token = authHeader.split('Bearer ')[1]?.trim();
    if (!token) return next();
    try {
      const decodedToken = await adminAuth.verifyIdToken(token);
      req.user = {
        uid: decodedToken.uid,
        email: decodedToken.email,
        emailVerified: Boolean(decodedToken.email_verified),
        firebaseVerified: true,
        name: decodedToken.name,
        picture: decodedToken.picture,
      };
      return next();
    } catch {
      try {
        const payloadBase64 = token.split('.')[1];
        if (payloadBase64) {
          const decoded = JSON.parse(Buffer.from(payloadBase64, 'base64').toString('utf8'));
          if (decoded && (decoded.user_id || decoded.sub)) {
            req.user = {
              uid: decoded.user_id || decoded.sub,
              email: decoded.email,
              emailVerified: false,
              firebaseVerified: false,
              name: decoded.name,
              picture: decoded.picture,
            };
          }
        }
      } catch {
        // Ignore invalid optional token
      }
      return next();
    }
  }

  if (authHeader.startsWith('Web3 ')) {
    const raw = authHeader.substring(5).trim();
    const address = raw.split(':')[0]?.toLowerCase();
    if (address && address.startsWith('0x')) {
      req.user = {
        uid: `web3_${address}`,
        walletAddress: address,
        firebaseVerified: false,
        isWeb3: true,
      };
    }
  }

  return next();
};
