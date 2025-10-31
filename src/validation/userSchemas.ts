import { z } from 'zod';

export const CreateUserSchema = z.object({
  username: z.string()
    .min(2, 'Nome de usuário deve ter pelo menos 2 caracteres')
    .max(100, 'Nome de usuário deve ter no máximo 100 caracteres')
    .trim(),
  
  email: z.string()
    .email('Email deve ter um formato válido')
    .toLowerCase()
    .trim(),
  
  password: z.string()
    .min(6, 'Senha deve ter pelo menos 6 caracteres')
    .max(128, 'Senha deve ter no máximo 128 caracteres')
});

export const LoginSchema = z.object({
  email: z.string()
    .email('Email deve ter um formato válido')
    .toLowerCase()
    .trim(),
  
  password: z.string()
    .min(1, 'Senha é obrigatória')
});

export const UpdateUserSchema = z.object({
  username: z.string()
    .min(2, 'Nome de usuário deve ter pelo menos 2 caracteres')
    .max(100, 'Nome de usuário deve ter no máximo 100 caracteres')
    .trim()
    .optional(),
  
  password: z.string()
    .min(6, 'Senha deve ter pelo menos 6 caracteres')
    .max(128, 'Senha deve ter no máximo 128 caracteres')
    .optional()
}).refine(
  (data) => Object.values(data).some(value => value !== undefined),
  'Pelo menos um campo deve ser fornecido para atualização'
);