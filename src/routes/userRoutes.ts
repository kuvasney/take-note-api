import { Router } from 'express';
import { 
  registerUser, 
  loginUser, 
  getUserProfile, 
  updateUser, 
  deactivateUser,
  getUsers,
  refreshTokens,
  requestPasswordReset,
  resetPassword
} from '../controllers/userController.js';
import { validateRequest, validateObjectId, validateUniqueEmail } from '../middleware/validation.js';
import { CreateUserSchema, LoginSchema, UpdateUserSchema } from '../validation/userSchemas.js';
import { authenticateToken, requireOwnership } from '../middleware/auth.js';

const userRoutes = Router();

// POST /api/users/register - Registrar novo usuário
userRoutes.post('/register', 
  validateRequest(CreateUserSchema),
  validateUniqueEmail,
  registerUser
);

// POST /api/users/login - Fazer login
userRoutes.post('/login',
  validateRequest(LoginSchema),
  loginUser
);

// POST /api/users/refresh - Renovar tokens
userRoutes.post('/refresh',
  refreshTokens
);

// POST /api/users/forgot-password - Solicitar recuperação de senha
userRoutes.post('/forgot-password',
  requestPasswordReset
);

// POST /api/users/reset-password - Resetar senha com token
userRoutes.post('/reset-password',
  resetPassword
);

// GET /api/users/:id/profile - Obter perfil do usuário (protegida)
userRoutes.get('/:id/profile',
  validateObjectId,
  authenticateToken,
  requireOwnership,
  getUserProfile
);

// PUT /api/users/:id - Atualizar usuário (protegida)
userRoutes.put('/:id',
  validateObjectId,
  authenticateToken,
  requireOwnership,
  validateRequest(UpdateUserSchema),
  updateUser
);

// DELETE /api/users/:id - Desativar usuário (protegida)
userRoutes.delete('/:id',
  validateObjectId,
  authenticateToken,
  requireOwnership,
  deactivateUser
);

// GET /api/users - Listar usuários (protegida - futuro: admin only)
userRoutes.get('/',
  authenticateToken,
  getUsers
);

export default userRoutes;