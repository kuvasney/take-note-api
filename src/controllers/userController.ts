import { Request, Response, NextFunction } from 'express';
import { User } from '../models/User.js';
import { CreateUserDto, UpdateUserDto, LoginDto } from '../types/user.js';
import { generateTokens, verifyRefreshToken } from '../utils/jwt.js';

// POST /api/users/register - Criar nova conta de usuário
export const registerUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userData: CreateUserDto = req.body;
    
    // Criar novo usuário
    const user = new User({
      ...userData,
      ativo: true,
      emailVerificado: false
    });
    
    const savedUser = await user.save();
    
    // Gerar tokens JWT
    const tokens = generateTokens(savedUser.toJSON());
    
    res.status(201).json({
      message: 'Usuário criado com sucesso',
      user: savedUser.toJSON(),
      tokens
    });
  } catch (error) {
    // Tratar erro de email duplicado do MongoDB
    if (error instanceof Error && error.name === 'MongoServerError' && (error as any).code === 11000) {
      res.status(409).json({
        error: 'Email already exists',
        message: 'Um usuário com este email já existe'
      });
      return;
    }
    next(error);
  }
};

// POST /api/users/login - Fazer login
export const loginUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, password }: LoginDto = req.body;
    
    // Buscar usuário incluindo a senha
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    
    if (!user) {
      res.status(401).json({
        error: 'Invalid credentials',
        message: 'Email ou senha incorretos'
      });
      return;
    }
    
    // Verificar se o usuário está ativo
    if (!user.ativo) {
      res.status(401).json({
        error: 'Account inactive',
        message: 'Sua conta está inativa. Entre em contato com o suporte.'
      });
      return;
    }
    
    // Verificar senha
    const isPasswordValid = await user.comparePassword(password);
    
    if (!isPasswordValid) {
      res.status(401).json({
        error: 'Invalid credentials',
        message: 'Email ou senha incorretos'
      });
      return;
    }
    
    // Gerar tokens JWT
    const tokens = generateTokens(user.toJSON());
    
    res.json({
      message: 'Login realizado com sucesso',
      user: user.toJSON(),
      tokens
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/users/profile - Obter perfil do usuário (requer autenticação - implementar depois)
export const getUserProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Placeholder - implementar depois com JWT
    const { id } = req.params;
    
    const user = await User.findById(id);
    
    if (!user) {
      res.status(404).json({
        error: 'User not found',
        message: 'Usuário não encontrado'
      });
      return;
    }
    
    if (!user.ativo) {
      res.status(404).json({
        error: 'User not found',
        message: 'Usuário não encontrado'
      });
      return;
    }
    
    res.json(user.toJSON());
  } catch (error) {
    next(error);
  }
};

// PUT /api/users/:id - Atualizar perfil do usuário
export const updateUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const updateData: UpdateUserDto = req.body;
    
    // Remover campos que não devem ser atualizados diretamente
    const sanitizedData = { ...updateData };
    delete (sanitizedData as any).email; // Email não pode ser alterado por aqui
    delete (sanitizedData as any).ativo;
    delete (sanitizedData as any).emailVerificado;
    
    const updatedUser = await User.findByIdAndUpdate(
      id,
      { 
        ...sanitizedData,
        dataUltimaAtualizacao: new Date()
      },
      { 
        new: true, 
        runValidators: true,
        lean: true
      }
    );
    
    if (!updatedUser) {
      res.status(404).json({
        error: 'User not found',
        message: 'Usuário não encontrado'
      });
      return;
    }
    
    res.json({
      message: 'Perfil atualizado com sucesso',
      user: updatedUser
    });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/users/:id - Desativar conta (soft delete)
export const deactivateUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    
    const user = await User.findByIdAndUpdate(
      id,
      { 
        ativo: false,
        dataUltimaAtualizacao: new Date()
      },
      { new: true }
    );
    
    if (!user) {
      res.status(404).json({
        error: 'User not found',
        message: 'Usuário não encontrado'
      });
      return;
    }
    
    res.json({
      message: 'Conta desativada com sucesso'
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/users - Listar usuários (admin only - implementar depois)
export const getUsers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    
    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(100, Math.max(1, Number(limit)));
    const skip = (pageNum - 1) * limitNum;
    
    const filter: any = { ativo: true };
    
    // Busca por nome ou email
    if (search && typeof search === 'string') {
      filter.$or = [
        { nome: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    
    const users = await User.find(filter)
      .sort({ dataCriacao: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();
    
    const total = await User.countDocuments(filter);
    
    res.json({
      users,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/users/refresh - Renovar tokens com refresh token
export const refreshTokens = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      res.status(400).json({
        error: 'Refresh token required',
        message: 'Refresh token é obrigatório'
      });
      return;
    }
    
    // Verificar refresh token
    const decoded = verifyRefreshToken(refreshToken);
    
    // Buscar usuário
    const user = await User.findById(decoded.userId);
    
    if (!user || !user.ativo) {
      res.status(401).json({
        error: 'Invalid refresh token',
        message: 'Usuário não encontrado ou inativo'
      });
      return;
    }
    
    // Gerar novos tokens
    const newTokens = generateTokens(user.toJSON());
    
    res.json({
      message: 'Tokens renovados com sucesso',
      tokens: newTokens
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('token')) {
        res.status(401).json({
          error: 'Invalid refresh token',
          message: 'Refresh token inválido ou expirado'
        });
        return;
      }
    }
    next(error);
  }
};