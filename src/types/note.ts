export interface IReminder {
  id: string;
  dateTime: string;
  text: string;
}

export interface INote {
  id?: string;
  userId: string;  // Note owner
  order: number;   // Display order (higher = top)
  title: string;
  content: string;
  createdAt?: Date;
  updatedAt?: Date;
  archived: boolean;
  color: string;
  tags: string[];
  pinned: boolean;
  reminders: IReminder[];
  collaborators: string[];
  isPublic: boolean;      // Whether the note is public
  shareToken?: string;    // Unique token for secure sharing
}

export type CreateNoteDto = Omit<INote, 'id' | 'createdAt' | 'updatedAt' | 'userId' | 'order'>;
export type UpdateNoteDto = Partial<CreateNoteDto> & { id?: string };