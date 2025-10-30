import { z } from 'zod';

export const CreateUserSchema = z.object({
  nome: z.string()
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(100, 'Nome deve ter no máximo 100 caracteres')
    .trim(),
  
  email: z.string()
    .email('Email deve ter um formato válido')
    .toLowerCase()
    .trim(),
  
  password: z.string()
    .min(6, 'Senha deve ter pelo menos 6 caracteres')
    .max(128, 'Senha deve ter no máximo 128 caracteres')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Senha deve conter pelo menos uma letra minúscula, uma maiúscula e um número'
    )
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
  nome: z.string()
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(100, 'Nome deve ter no máximo 100 caracteres')
    .trim()
    .optional(),
  
  password: z.string()
    .min(6, 'Senha deve ter pelo menos 6 caracteres')
    .max(128, 'Senha deve ter no máximo 128 caracteres')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Senha deve conter pelo menos uma letra minúscula, uma maiúscula e um número'
    )
    .optional()
}).refine(
  (data) => Object.values(data).some(value => value !== undefined),
  'Pelo menos um campo deve ser fornecido para atualização'
);