import mongoose, { Document, Schema } from 'mongoose';
import { INote, IReminder } from '../types/note.js';
import crypto from 'crypto';
import { encrypt, decrypt } from '../utils/encryption.js';

export interface INoteDocument extends INote, Document {
  id: string;
}

const ReminderSchema = new Schema<IReminder>({
  id: { type: String, required: true },
  dateTime: { type: String, required: true },
  text: { type: String, required: true }
}, { _id: false });

const NoteSchema = new Schema<INoteDocument>({
  userId: {
    type: String,
    required: [true, 'User ID is required'],
    index: true  // Index for better query performance
  },
  order: {
    type: Number,
    required: true,
    default: 0,
    index: true  // Index for fast ordering
  },
  title: { 
    type: String, 
    required: [true, 'Title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  content: { 
    type: String, 
    required: [true, 'Content is required'],
    trim: true
  },
  archived: { 
    type: Boolean, 
    default: false 
  },
  color: { 
    type: String, 
    default: '#ffffff',
    match: [/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Color must be a valid hexadecimal code']
  },
  tags: [{ 
    type: String, 
    trim: true,
    maxlength: [50, 'Tag cannot exceed 50 characters']
  }],
  pinned: { 
    type: Boolean, 
    default: false 
  },
  reminders: [ReminderSchema],
  collaborators: [{ 
    type: String, 
    trim: true 
  }],
  isPublic: {
    type: Boolean,
    default: false,
    index: true  // Index for public notes queries
  },
  shareToken: {
    type: String,
    unique: true,
    sparse: true,  // Allows multiple documents with null
    index: true    // Index for fast token lookup
  }
}, {
  timestamps: { 
    createdAt: 'createdAt', 
    updatedAt: 'updatedAt' 
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
  title: 'text', 
  content: 'text',
  tags: 'text'
});

// Index for better performance on common queries
NoteSchema.index({ userId: 1, pinned: -1, order: -1 });
NoteSchema.index({ userId: 1, archived: 1, order: -1 });
NoteSchema.index({ userId: 1, tags: 1 });

// Hook: Encrypt content before saving
NoteSchema.pre('save', function(next) {
  if (this.isModified('content') && this.content) {
    try {
      // Only encrypt if NOT already encrypted
      if (!this.content.startsWith('U2FsdGVk')) {
        this.content = encrypt(this.content);
      }
    } catch (error) {
      console.error('Error encrypting content:', error);
    }
  }
  next();
});

// Hook: Decrypt content after fetching (for findOne, findById)
NoteSchema.post('find', function(docs: any[]) {
  if (Array.isArray(docs)) {
    docs.forEach((doc, index) => {
      if (doc.content) {
        try {
          const original = doc.content;
          doc.content = decrypt(doc.content);
          
          // If returned the same encrypted text, decryption failed
          if (doc.content === original && original.startsWith('U2FsdGVk')) {
            console.warn(`⚠️  Note ${doc._id} could not be decrypted (index ${index})`);
          }
        } catch (error) {
          console.error(`❌ Error decrypting note ${doc._id}:`, error);
          // Keep original content if decryption fails
        }
      }
    });
  }
});

NoteSchema.post('findOne', function(doc: any) {
  if (doc && doc.content) {
    try {
      const original = doc.content;
      doc.content = decrypt(doc.content);
      
      // If returned the same encrypted text, decryption failed
      if (doc.content === original && original.startsWith('U2FsdGVk')) {
        console.warn(`⚠️  Note ${doc._id} could not be decrypted`);
      }
    } catch (error) {
      console.error(`❌ Error decrypting note ${doc._id}:`, error);
      // Keep original content if decryption fails
    }
  }
});

// Hook: Decrypt after save
NoteSchema.post('save', function(doc: any) {
  if (doc && doc.content) {
    try {
      // Temporarily decrypt to return to client
      // Value in DB remains encrypted
      const decrypted = decrypt(doc.content);
      doc.content = decrypted;
    } catch (error) {
      console.error('Error decrypting:', error);
      // Keep original content if decryption fails
    }
  }
});

// Static method to generate unique shareToken
NoteSchema.statics.generateShareToken = function(): string {
  return crypto.randomBytes(16).toString('hex'); // 32 characters
};

export const Note = mongoose.model<INoteDocument>('Note', NoteSchema);