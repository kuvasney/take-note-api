import { Request, Response, NextFunction } from 'express';
import { Note } from '../models/Note.js';
import { CreateNoteDto, UpdateNoteDto } from '../types/note.js';
import { SearchNotesSchema } from '../validation/noteSchemas.js';

// GET /api/notes - List all notes with optional filtering
export const getNotes = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { archived = 'false', pinned, page = 1, limit = 50 } = req.query;
    
    // Filtro base: apenas notas do usuário autenticado
    const filter: any = { userId: req.user?.userId };
    
    // Filter by archived status
    if (archived === 'true') {
      filter.archived = true;
    } else if (archived === 'false') {
      filter.archived = false;
    }
    
    // Filter by pinned status
    if (pinned === 'true') {
      filter.pinned = true;
    } else if (pinned === 'false') {
      filter.pinned = false;
    }
    
    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(100, Math.max(1, Number(limit)));
    const skip = (pageNum - 1) * limitNum;
    
    // Sort: pinned notes first, then by order (desc), then by last edit date
    const notes = await Note.find(filter)
      .sort({ pinned: -1, order: -1, dataUltimaEdicao: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();
    
    const total = await Note.countDocuments(filter);
    
    res.json({
      notes,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/notes/search - Search notes
export const searchNotes = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const validation = SearchNotesSchema.safeParse(req.query);
    
    if (!validation.success) {
      res.status(400).json({
        error: 'Invalid search parameters',
        details: validation.error.errors
      });
      return;
    }
    
    const { search, tags, archived = 'false', pinned, page = 1, limit = 50 } = validation.data;
    
    // Filtro base: apenas notas do usuário autenticado
    const filter: any = { userId: req.user?.userId };
    
    // Text search
    if (search) {
      filter.$text = { $search: search };
    }
    
    // Filter by tags
    if (tags) {
      const tagArray = tags.split(',').map(tag => tag.trim()).filter(Boolean);
      if (tagArray.length > 0) {
        filter.tags = { $in: tagArray };
      }
    }
    
    // Filter by archived status
    if (archived === 'true') {
      filter.archived = true;
    } else if (archived === 'false') {
      filter.archived = false;
    }
    
    // Filter by pinned status
    if (pinned === 'true') {
      filter.pinned = true;
    } else if (pinned === 'false') {
      filter.pinned = false;
    }
    
    const pageNum = Math.max(1, page);
    const limitNum = Math.min(100, Math.max(1, limit));
    const skip = (pageNum - 1) * limitNum;
    
    const sortCriteria: any = { pinned: -1, dataUltimaEdicao: -1 };
    
    // If text search, include relevance score
    if (search) {
      sortCriteria.score = { $meta: 'textScore' };
    }
    
    const notes = await Note.find(filter)
      .sort(sortCriteria)
      .skip(skip)
      .limit(limitNum)
      .lean();
    
    const total = await Note.countDocuments(filter);
    
    res.json({
      notes,
      searchTerm: search,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/notes/:id - Get specific note
export const getNoteById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    
    // Buscar apenas se a nota pertence ao usuário
    const note = await Note.findOne({ _id: id, userId: req.user?.userId }).lean();
    
    if (!note) {
      res.status(404).json({
        error: 'Note not found',
        message: `No note found with ID: ${id}`
      });
      return;
    }
    
    res.json(note);
  } catch (error) {
    next(error);
  }
};

// POST /api/notes - Create new note
export const createNote = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const noteData: CreateNoteDto = req.body;
    
    // Buscar o maior order do usuário para colocar no topo
    const maxOrderNote = await Note.findOne({ userId: req.user?.userId })
      .sort({ order: -1 })
      .select('order')
      .lean();
    
    const nextOrder = maxOrderNote?.order !== undefined ? maxOrderNote.order + 1 : 0;
    
    // Adicionar o userId e order do usuário autenticado
    const note = new Note({
      ...noteData,
      userId: req.user?.userId,
      order: nextOrder
    });
    const savedNote = await note.save();
    
    res.status(201).json(savedNote.toJSON());
  } catch (error) {
    next(error);
  }
};

// PUT /api/notes/:id - Update existing note
export const updateNote = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const updateData: UpdateNoteDto = req.body;
    
    // Remove id from update data if present
    if ('id' in updateData) {
      delete (updateData as any).id;
    }
    
    // Atualizar apenas se a nota pertence ao usuário
    const updatedNote = await Note.findOneAndUpdate(
      { _id: id, userId: req.user?.userId },
      { ...updateData, dataUltimaEdicao: new Date() },
      { 
        new: true, 
        runValidators: true,
        lean: true
      }
    );
    
    if (!updatedNote) {
      res.status(404).json({
        error: 'Note not found',
        message: `No note found with ID: ${id}`
      });
      return;
    }
    
    res.json(updatedNote);
  } catch (error) {
    next(error);
  }
};

// PATCH /api/notes/:id/pin - Toggle pin status
export const togglePin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    
    // Buscar apenas se a nota pertence ao usuário
    const note = await Note.findOne({ _id: id, userId: req.user?.userId });
    
    if (!note) {
      res.status(404).json({
        error: 'Note not found',
        message: `No note found with ID: ${id}`
      });
      return;
    }
    
    note.pinned = !note.pinned;
    note.dataUltimaEdicao = new Date();
    
    const updatedNote = await note.save();
    
    res.json(updatedNote.toJSON());
  } catch (error) {
    next(error);
  }
};

// PATCH /api/notes/:id/archive - Toggle archive status
export const toggleArchive = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    
    // Buscar apenas se a nota pertence ao usuário
    const note = await Note.findOne({ _id: id, userId: req.user?.userId });
    
    if (!note) {
      res.status(404).json({
        error: 'Note not found',
        message: `No note found with ID: ${id}`
      });
      return;
    }
    
    note.archived = !note.archived;
    note.dataUltimaEdicao = new Date();
    
    const updatedNote = await note.save();
    
    res.json(updatedNote.toJSON());
  } catch (error) {
    next(error);
  }
};

// DELETE /api/notes/:id - Delete note
export const deleteNote = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    
    // Deletar apenas se a nota pertence ao usuário
    const deletedNote = await Note.findOneAndDelete({ _id: id, userId: req.user?.userId }).lean();
    
    if (!deletedNote) {
      res.status(404).json({
        error: 'Note not found',
        message: `No note found with ID: ${id}`
      });
      return;
    }
    
    res.json({
      message: 'Note deleted successfully',
      id: deletedNote.id
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/notes/reorder - Reorder notes
export const reorderNotes = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { noteIds } = req.body;
    
    if (!Array.isArray(noteIds)) {
      res.status(400).json({
        error: 'Invalid request',
        message: 'noteIds must be an array'
      });
      return;
    }
    
    const userId = req.user?.userId;
    
    // Update each note's order based on position in array
    // First item (index 0) gets highest order number
    const updatePromises = noteIds.map((id: string, index: number) => 
      Note.findOneAndUpdate(
        { _id: id, userId },
        { order: noteIds.length - index - 1 },
        { new: true }
      )
    );
    
    const updatedNotes = await Promise.all(updatePromises);
    
    res.json({
      message: 'Notes reordered successfully',
      count: noteIds.length,
      notes: updatedNotes.filter(Boolean).map(n => n?.toJSON())
    });
  } catch (error) {
    next(error);
  }
};