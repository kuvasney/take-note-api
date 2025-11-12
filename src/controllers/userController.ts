import { Request, Response, NextFunction } from 'express';
import { User } from '../models/User.js';
import { PasswordResetToken } from '../models/PasswordResetToken.js';
import { CreateUserDto, UpdateUserDto, LoginDto } from '../types/user.js';
import { generateTokens, verifyRefreshToken } from '../utils/jwt.js';
import { sendPasswordResetEmail, sendPasswordChangedEmail } from '../services/emailService.js';

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
    
    // Se password vier vazio ou undefined, remover do update
    if (!sanitizedData.password || sanitizedData.password.trim() === '') {
      delete (sanitizedData as any).password;
    }
    
    // Se estiver alterando a senha, usar save() para disparar o hook de hash
    // Se não, usar findByIdAndUpdate para melhor performance
    let updatedUser;
    
    if (sanitizedData.password) {
      // Buscar usuário
      const user = await User.findById(id);
      
      if (!user) {
        res.status(404).json({
          error: 'User not found',
          message: 'Usuário não encontrado'
        });
        return;
      }
      
      // Atualizar campos (incluindo senha)
      Object.assign(user, sanitizedData);
      user.dataUltimaAtualizacao = new Date();
      
      // Save vai disparar o hook pre('save') que faz o hash da senha
      await user.save();
      
      updatedUser = user.toJSON();
    } else {
      // Sem mudança de senha, usar findByIdAndUpdate
      updatedUser = await User.findByIdAndUpdate(
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
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    
    const users = await User.find(filter)
      .sort({ createdAt: -1 })
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

// POST /api/users/forgot-password - Solicitar recuperação de senha
export const requestPasswordReset = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email } = req.body;
    
    if (!email) {
      res.status(400).json({
        error: 'Email required',
        message: 'Email é obrigatório'
      });
      return;
    }
    
    // Buscar usuário
    const user = await User.findOne({ email: email.toLowerCase() });
    
    // Por segurança, sempre retorna sucesso mesmo se email não existir
    // Isso previne que atacantes descubram quais emails estão cadastrados
    if (!user) {
      res.json({
        message: 'Se o email existir em nossa base, você receberá instruções para recuperação de senha'
      });
      return;
    }
    
    // Verificar se usuário está ativo
    if (!user.ativo) {
      res.json({
        message: 'Se o email existir em nossa base, você receberá instruções para recuperação de senha'
      });
      return;
    }
    
    // Invalidar tokens anteriores do usuário
    await PasswordResetToken.updateMany(
      { userId: user._id, used: false },
      { used: true }
    );
    
    // Gerar novo token
    const resetToken = (PasswordResetToken as any).generateToken();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hora
    
    // Salvar token no banco
    await PasswordResetToken.create({
      userId: user._id,
      token: resetToken,
      expiresAt,
      used: false
    });
    
    // Montar URL de reset
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;
    
    // Enviar email
    await sendPasswordResetEmail({
      user: user.toJSON(),
      resetToken,
      resetUrl
    });
    
    res.json({
      message: 'Se o email existir em nossa base, você receberá instruções para recuperação de senha'
    });
  } catch (error) {
    console.error('Erro ao solicitar reset de senha:', error);
    next(error);
  }
};

// POST /api/users/reset-password - Resetar senha com token
export const resetPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { token, newPassword } = req.body;
    
    if (!token) {
      res.status(400).json({
        error: 'Token required',
        message: 'Token é obrigatório'
      });
      return;
    }
    
    if (!newPassword) {
      res.status(400).json({
        error: 'Password required',
        message: 'Nova senha é obrigatória'
      });
      return;
    }
    
    // Validar senha
    if (newPassword.length < 6) {
      res.status(400).json({
        error: 'Invalid password',
        message: 'Senha deve ter pelo menos 6 caracteres'
      });
      return;
    }
    
    // Buscar token
    const resetToken = await PasswordResetToken.findOne({ token });
    
    if (!resetToken) {
      res.status(400).json({
        error: 'Invalid token',
        message: 'Token inválido ou expirado'
      });
      return;
    }
    
    // Verificar se token é válido
    if (!(resetToken as any).isValid()) {
      res.status(400).json({
        error: 'Invalid token',
        message: 'Token inválido ou expirado'
      });
      return;
    }
    
    // Buscar usuário
    const user = await User.findById(resetToken.userId);
    
    if (!user || !user.ativo) {
      res.status(404).json({
        error: 'User not found',
        message: 'Usuário não encontrado'
      });
      return;
    }
    
    // Atualizar senha
    user.password = newPassword;
    await user.save();
    
    // Marcar token como usado
    resetToken.used = true;
    await resetToken.save();
    
    // Enviar email de confirmação
    await sendPasswordChangedEmail(user.toJSON());
    
    res.json({
      message: 'Senha alterada com sucesso'
    });
  } catch (error) {
    console.error('Erro ao resetar senha:', error);
    next(error);
  }
};