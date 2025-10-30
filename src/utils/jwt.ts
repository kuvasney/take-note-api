import jwt, { SignOptions } from 'jsonwebtoken';
import { IUser } from '../types/user.js';

// Tipos para JWT
export interface JwtPayload {
  userId: string;
  email: string;
  iat?: number;
  exp?: number;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

// Configurações JWT
const JWT_SECRET: string = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
const JWT_REFRESH_SECRET: string = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-change-in-production';
const JWT_EXPIRES_IN: string = process.env.JWT_EXPIRES_IN || '15m'; // Access token expira em 15 minutos
const JWT_REFRESH_EXPIRES_IN: string = process.env.JWT_REFRESH_EXPIRES_IN || '7d'; // Refresh token expira em 7 dias

/**
 * Gera tokens JWT (access e refresh)
 */
export const generateTokens = (user: IUser): TokenResponse => {
  const payload: JwtPayload = {
    userId: user.id!,
    email: user.email
  };
  
  // Access Token (vida curta)
  const accessTokenOptions: SignOptions = {
    expiresIn: JWT_EXPIRES_IN as any,
    issuer: 'notes-api',
    audience: 'notes-app'
  };
  const accessToken = jwt.sign(payload, JWT_SECRET, accessTokenOptions);
  
  // Refresh Token (vida longa)
  const refreshTokenOptions: SignOptions = {
    expiresIn: JWT_REFRESH_EXPIRES_IN as any,
    issuer: 'notes-api',
    audience: 'notes-app'
  };
  const refreshToken = jwt.sign(payload, JWT_REFRESH_SECRET, refreshTokenOptions);
  
  // Calcular tempo de expiração em segundos
  const expiresIn = getTokenExpirationTime(JWT_EXPIRES_IN);
  
  return {
    accessToken,
    refreshToken,
    expiresIn
  };
};

/**
 * Verifica se um access token é válido
 */
export const verifyAccessToken = (token: string): JwtPayload => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: 'notes-api',
      audience: 'notes-app'
    }) as JwtPayload;
    
    return decoded;
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Token inválido');
    } else if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Token expirado');
    } else {
      throw new Error('Erro na verificação do token');
    }
  }
};

/**
 * Verifica se um refresh token é válido
 */
export const verifyRefreshToken = (token: string): JwtPayload => {
  try {
    const decoded = jwt.verify(token, JWT_REFRESH_SECRET, {
      issuer: 'notes-api',
      audience: 'notes-app'
    }) as JwtPayload;
    
    return decoded;
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Refresh token inválido');
    } else if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Refresh token expirado');
    } else {
      throw new Error('Erro na verificação do refresh token');
    }
  }
};

/**
 * Decodifica um token sem verificar (para debug)
 */
export const decodeToken = (token: string): JwtPayload | null => {
  try {
    return jwt.decode(token) as JwtPayload;
  } catch (error) {
    return null;
  }
};

/**
 * Converte string de tempo em segundos
 */
function getTokenExpirationTime(expiresIn: string): number {
  const timeValue = parseInt(expiresIn.slice(0, -1));
  const timeUnit = expiresIn.slice(-1);
  
  switch (timeUnit) {
    case 's': return timeValue;
    case 'm': return timeValue * 60;
    case 'h': return timeValue * 60 * 60;
    case 'd': return timeValue * 24 * 60 * 60;
    default: return 900; // 15 minutos por padrão
  }
}

/**
 * Extrai token do header Authorization
 */
export const extractTokenFromHeader = (authHeader: string | undefined): string | null => {
  if (!authHeader) {
    return null;
  }
  
  // Formato esperado: "Bearer <token>"
  const parts = authHeader.split(' ');
  
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }
  
  return parts[1];
};