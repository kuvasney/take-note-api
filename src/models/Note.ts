import mongoose, { Document, Schema } from 'mongoose';
import { INote, IReminder } from '../types/note.js';
import crypto from 'crypto';
import { encrypt, decrypt } from '../utils/encryption.js';

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
  order: {
    type: Number,
    required: true,
    default: 0,
    index: true  // Índice para ordenação rápida
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
  }],
  isPublic: {
    type: Boolean,
    default: false,
    index: true  // Índice para queries de notas públicas
  },
  shareToken: {
    type: String,
    unique: true,
    sparse: true,  // Permite múltiplos documentos com null
    index: true    // Índice para busca rápida por token
  }
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
NoteSchema.index({ userId: 1, pinned: -1, order: -1 });
NoteSchema.index({ userId: 1, archived: 1, order: -1 });
NoteSchema.index({ userId: 1, tags: 1 });

// Hook: Criptografar conteúdo antes de salvar
NoteSchema.pre('save', function(next) {
  if (this.isModified('conteudo') && this.conteudo) {
    try {
      this.conteudo = encrypt(this.conteudo);
    } catch (error) {
      console.error('Erro ao criptografar conteúdo:', error);
    }
  }
  next();
});

// Hook: Descriptografar conteúdo após buscar (para findOne, findById)
NoteSchema.post('find', function(docs: any[]) {
  if (Array.isArray(docs)) {
    docs.forEach(doc => {
      if (doc.conteudo) {
        try {
          doc.conteudo = decrypt(doc.conteudo);
        } catch (error) {
          console.error('Erro ao descriptografar:', error);
          // Mantém o conteúdo original se falhar (pode estar já descriptografado)
        }
      }
    });
  }
});

NoteSchema.post('findOne', function(doc: any) {
  if (doc && doc.conteudo) {
    try {
      doc.conteudo = decrypt(doc.conteudo);
    } catch (error) {
      console.error('Erro ao descriptografar:', error);
      // Mantém o conteúdo original se falhar
    }
  }
});

// Hook: Descriptografar após save
NoteSchema.post('save', function(doc: any) {
  if (doc && doc.conteudo) {
    try {
      // Descriptografar temporariamente para retornar ao cliente
      // O valor no DB permanece criptografado
      const decrypted = decrypt(doc.conteudo);
      doc.conteudo = decrypted;
    } catch (error) {
      console.error('Erro ao descriptografar:', error);
      // Mantém o conteúdo original se falhar
    }
  }
});

// Método estático para gerar shareToken único
NoteSchema.statics.generateShareToken = function(): string {
  return crypto.randomBytes(16).toString('hex'); // 32 caracteres
};

export const Note = mongoose.model<INoteDocument>('Note', NoteSchema);