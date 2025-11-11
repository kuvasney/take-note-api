import mongoose, { Schema, Document } from 'mongoose';
import crypto from 'crypto';

export interface IPasswordResetToken extends Document {
  userId: mongoose.Types.ObjectId;
  token: string;
  expiresAt: Date;
  used: boolean;
  createdAt: Date;
}

const PasswordResetTokenSchema = new Schema<IPasswordResetToken>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  token: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  expiresAt: {
    type: Date,
    required: true,
    index: true
  },
  used: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 3600 // Auto-delete after 1 hour (TTL index)
  }
});

// Método estático para gerar token
PasswordResetTokenSchema.statics.generateToken = function(): string {
  return crypto.randomBytes(32).toString('hex');
};

// Método para verificar se token é válido
PasswordResetTokenSchema.methods.isValid = function(): boolean {
  return !this.used && this.expiresAt > new Date();
};

export const PasswordResetToken = mongoose.model<IPasswordResetToken>('PasswordResetToken', PasswordResetTokenSchema);
