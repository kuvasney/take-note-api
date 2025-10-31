import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';
import { IUser } from '../types/user.js';

export interface IUserDocument extends Omit<IUser, 'id'>, Document {
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const userSchema = new Schema<IUserDocument>({
  username: {
    type: String,
    required: [true, 'Nome é obrigatório'],
    trim: true,
    minlength: [2, 'Nome deve ter pelo menos 2 caracteres'],
    maxlength: [100, 'Nome deve ter no máximo 100 caracteres']
  },
  
  email: {
    type: String,
    required: [true, 'Email é obrigatório'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      'Email deve ter um formato válido'
    ]
  },
  
  password: {
    type: String,
    required: [true, 'Senha é obrigatória'],
    minlength: [6, 'Senha deve ter pelo menos 6 caracteres'],
    select: false // Por padrão não incluir a senha nas consultas
  },
  
  dataCriacao: {
    type: Date,
    default: Date.now
  },
  
  dataUltimaAtualizacao: {
    type: Date,
    default: Date.now
  },
  
  ativo: {
    type: Boolean,
    default: true
  },
  
  emailVerificado: {
    type: Boolean,
    default: false
  },
  
  // Para futuro SSO
  googleId: {
    type: String,
    sparse: true // Permite múltiplos documentos com valor null
  },
  
  microsoftId: {
    type: String,
    sparse: true
  }
}, {
  timestamps: {
    createdAt: 'dataCriacao',
    updatedAt: 'dataUltimaAtualizacao'
  },
  toJSON: {
    transform: function(_doc, ret) {
      ret.id = ret._id;
      delete ret._id;
      delete (ret as any).__v;
      delete (ret as any).password; // Nunca retornar a senha
      return ret;
    }
  }
});

// Índice para email já é criado automaticamente pelo unique: true

// Hash da senha antes de salvar
userSchema.pre('save', async function(next) {
  // Só hash se a senha foi modificada
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error as Error);
  }
});

// Método para comparar senhas
userSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

export const User = mongoose.model<IUserDocument>('User', userSchema);