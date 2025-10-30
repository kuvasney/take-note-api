import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, extractTokenFromHeader, JwtPayload } from '../utils/jwt.js';
import { User } from '../models/User.js';

// Expandir interface Request para incluir user
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        email: string;
        user?: any; // Dados completos do usuário quando necessário
      };
    }
  }
}

/**
 * Middleware de autenticação JWT
 * Verifica se o token é válido e adiciona dados do usuário à requisição
 */
export const authenticateToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const token = extractTokenFromHeader(req.headers.authorization);
    
    if (!token) {
      res.status(401).json({
        error: 'Access denied',
        message: 'Token de acesso é obrigatório'
      });
      return;
    }
    
    // Verificar e decodificar o token
    const decoded: JwtPayload = verifyAccessToken(token);
    
    // Verificar se o usuário ainda existe e está ativo
    const user = await User.findById(decoded.userId);
    
    if (!user || !user.ativo) {
      res.status(401).json({
        error: 'Access denied',
        message: 'Usuário não encontrado ou inativo'
      });
      return;
    }
    
    // Adicionar dados do usuário à requisição
    req.user = {
      userId: decoded.userId,
      email: decoded.email
    };
    
    next();
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Token expirado') {
        res.status(401).json({
          error: 'Token expired',
          message: 'Token expirado. Use o refresh token para obter um novo.'
        });
        return;
      } else if (error.message === 'Token inválido') {
        res.status(401).json({
          error: 'Invalid token',
          message: 'Token inválido'
        });
        return;
      }
    }
    
    res.status(500).json({
      error: 'Authentication error',
      message: 'Erro interno na autenticação'
    });
  }
};

/**
 * Middleware para incluir dados completos do usuário
 * Use após authenticateToken quando precisar dos dados completos
 */
export const loadUserData = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user?.userId) {
      res.status(401).json({
        error: 'Authentication required',
        message: 'Autenticação é obrigatória'
      });
      return;
    }
    
    const user = await User.findById(req.user.userId);
    
    if (!user || !user.ativo) {
      res.status(401).json({
        error: 'User not found',
        message: 'Usuário não encontrado ou inativo'
      });
      return;
    }
    
    // Adicionar dados completos do usuário
    req.user.user = user.toJSON();
    
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware opcional de autenticação
 * Tenta autenticar, mas não falha se não houver token
 */
export const optionalAuth = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
  try {
    const token = extractTokenFromHeader(req.headers.authorization);
    
    if (token) {
      try {
        const decoded: JwtPayload = verifyAccessToken(token);
        const user = await User.findById(decoded.userId);
        
        if (user && user.ativo) {
          req.user = {
            userId: decoded.userId,
            email: decoded.email
          };
        }
      } catch (error) {
        // Ignora erros de token em auth opcional
      }
    }
    
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware para verificar se usuário é dono do recurso
 * Compara req.user.userId com req.params.id
 */
export const requireOwnership = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user?.userId) {
    res.status(401).json({
      error: 'Authentication required',
      message: 'Autenticação é obrigatória'
    });
    return;
  }
  
  const { id } = req.params;
  
  if (req.user.userId !== id) {
    res.status(403).json({
      error: 'Access forbidden',
      message: 'Você só pode acessar seus próprios dados'
    });
    return;
  }
  
  next();
};