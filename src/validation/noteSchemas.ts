import { z } from 'zod';

const ReminderSchema = z.object({
  id: z.string().min(1, 'Reminder ID is required'),
  dateTime: z.string().datetime('Date/time must be in ISO format'),
  text: z.string().min(1, 'Reminder text is required').max(500, 'Text cannot exceed 500 characters')
});

export const CreateNoteSchema = z.object({
  title: z.string()
    .min(1, 'Title is required')
    .max(200, 'Title cannot exceed 200 characters')
    .trim(),
  content: z.string()
    .min(1, 'Content is required')
    .trim(),
  archived: z.boolean().default(false),
  color: z.string()
    .regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Color must be a valid hexadecimal code')
    .default('#ffffff'),
  tags: z.array(
    z.string()
      .trim()
      .max(50, 'Tag cannot exceed 50 characters')
  ).default([]),
  pinned: z.boolean().default(false),
  reminders: z.array(ReminderSchema).default([]),
  collaborators: z.array(z.string().trim()).default([])
});

export const UpdateNoteSchema = CreateNoteSchema.partial().extend({
  id: z.string().optional()
});

export const NoteParamsSchema = z.object({
  id: z.string().min(1, 'Note ID is required')
});

export const SearchNotesSchema = z.object({
  search: z.string().optional(),
  tags: z.string().optional(), // comma-separated tags
  archived: z.enum(['true', 'false']).optional(),
  pinned: z.enum(['true', 'false']).optional(),
  page: z.string().regex(/^\d+$/).transform(Number).optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).optional()
});