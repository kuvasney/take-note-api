import mongoose, { Document, Schema } from 'mongoose';
import { INote, IReminder } from '../types/note.js';

export interface INoteDocument extends INote, Document {
  id: string;
}

const ReminderSchema = new Schema<IReminder>({
  id: { type: String, required: true },
  dataHora: { type: String, required: true },
  texto: { type: String, required: true }
}, { _id: false });

const NoteSchema = new Schema<INoteDocument>({
  userId: {
    type: String,
    required: [true, 'ID do usuário é obrigatório'],
    index: true  // Índice para melhor performance nas queries
  },
  titulo: { 
    type: String, 
    required: [true, 'Título é obrigatório'],
    trim: true,
    maxlength: [200, 'Título não pode exceder 200 caracteres']
  },
  conteudo: { 
    type: String, 
    required: [true, 'Conteúdo é obrigatório'],
    trim: true
  },
  archived: { 
    type: Boolean, 
    default: false 
  },
  cor: { 
    type: String, 
    default: '#ffffff',
    match: [/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Cor deve ser um código hexadecimal válido']
  },
  tags: [{ 
    type: String, 
    trim: true,
    maxlength: [50, 'Tag não pode exceder 50 caracteres']
  }],
  pinned: { 
    type: Boolean, 
    default: false 
  },
  lembretes: [ReminderSchema],
  colaboradores: [{ 
    type: String, 
    trim: true 
  }]
}, {
  timestamps: { 
    createdAt: 'dataCriacao', 
    updatedAt: 'dataUltimaEdicao' 
  },
  toJSON: {
    transform: (_doc, ret: any) => {
      ret.id = ret._id.toString();
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  },
  toObject: {
    transform: (_doc, ret: any) => {
      ret.id = ret._id.toString();
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
});

// Index for search functionality
NoteSchema.index({ 
  titulo: 'text', 
  conteudo: 'text',
  tags: 'text'
});

// Index for better performance on common queries
NoteSchema.index({ userId: 1, pinned: -1, dataUltimaEdicao: -1 });
NoteSchema.index({ userId: 1, archived: 1, dataUltimaEdicao: -1 });
NoteSchema.index({ userId: 1, tags: 1 });

export const Note = mongoose.model<INoteDocument>('Note', NoteSchema);