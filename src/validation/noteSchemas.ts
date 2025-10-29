import { z } from 'zod';

const ReminderSchema = z.object({
  id: z.string().min(1, 'ID do lembrete é obrigatório'),
  dataHora: z.string().datetime('Data/hora deve estar no formato ISO'),
  texto: z.string().min(1, 'Texto do lembrete é obrigatório').max(500, 'Texto não pode exceder 500 caracteres')
});

export const CreateNoteSchema = z.object({
  titulo: z.string()
    .min(1, 'Título é obrigatório')
    .max(200, 'Título não pode exceder 200 caracteres')
    .trim(),
  conteudo: z.string()
    .min(1, 'Conteúdo é obrigatório')
    .trim(),
  archived: z.boolean().default(false),
  cor: z.string()
    .regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Cor deve ser um código hexadecimal válido')
    .default('#ffffff'),
  tags: z.array(
    z.string()
      .trim()
      .max(50, 'Tag não pode exceder 50 caracteres')
  ).default([]),
  pinned: z.boolean().default(false),
  lembretes: z.array(ReminderSchema).default([]),
  colaboradores: z.array(z.string().trim()).default([])
});

export const UpdateNoteSchema = CreateNoteSchema.partial().extend({
  id: z.string().optional()
});

export const NoteParamsSchema = z.object({
  id: z.string().min(1, 'ID da nota é obrigatório')
});

export const SearchNotesSchema = z.object({
  search: z.string().optional(),
  tags: z.string().optional(), // comma-separated tags
  archived: z.enum(['true', 'false']).optional(),
  pinned: z.enum(['true', 'false']).optional(),
  page: z.string().regex(/^\d+$/).transform(Number).optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).optional()
});