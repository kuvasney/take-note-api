import { Request, Response, NextFunction } from 'express';
import { Note } from '../models/Note.js';
import { CreateNoteDto, UpdateNoteDto } from '../types/note.js';
import { SearchNotesSchema } from '../validation/noteSchemas.js';

// GET /api/notes - List all notes with optional filtering
export const getNotes = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { archived = 'false', pinned, page = 1, limit = 50 } = req.query;
    
    const filter: any = {};
    
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
    
    // Sort: pinned notes first, then by last modified date
    const notes = await Note.find(filter)
      .sort({ pinned: -1, dataUltimaEdicao: -1 })
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
export const searchNotes = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validation = SearchNotesSchema.safeParse(req.query);
    
    if (!validation.success) {
      return res.status(400).json({
        error: 'Invalid search parameters',
        details: validation.error.errors
      });
    }
    
    const { search, tags, archived = 'false', pinned, page = 1, limit = 50 } = validation.data;
    
    const filter: any = {};
    
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
export const getNoteById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    
    const note = await Note.findById(id).lean();
    
    if (!note) {
      return res.status(404).json({
        error: 'Note not found',
        message: `No note found with ID: ${id}`
      });
    }
    
    res.json(note);
  } catch (error) {
    next(error);
  }
};

// POST /api/notes - Create new note
export const createNote = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const noteData: CreateNoteDto = req.body;
    
    const note = new Note(noteData);
    const savedNote = await note.save();
    
    res.status(201).json(savedNote.toJSON());
  } catch (error) {
    next(error);
  }
};

// PUT /api/notes/:id - Update existing note
export const updateNote = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const updateData: UpdateNoteDto = req.body;
    
    // Remove id from update data if present
    delete updateData.id;
    
    const updatedNote = await Note.findByIdAndUpdate(
      id,
      { ...updateData, dataUltimaEdicao: new Date() },
      { 
        new: true, 
        runValidators: true,
        lean: true
      }
    );
    
    if (!updatedNote) {
      return res.status(404).json({
        error: 'Note not found',
        message: `No note found with ID: ${id}`
      });
    }
    
    res.json(updatedNote);
  } catch (error) {
    next(error);
  }
};

// PATCH /api/notes/:id/pin - Toggle pin status
export const togglePin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    
    const note = await Note.findById(id);
    
    if (!note) {
      return res.status(404).json({
        error: 'Note not found',
        message: `No note found with ID: ${id}`
      });
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
export const toggleArchive = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    
    const note = await Note.findById(id);
    
    if (!note) {
      return res.status(404).json({
        error: 'Note not found',
        message: `No note found with ID: ${id}`
      });
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
export const deleteNote = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    
    const deletedNote = await Note.findByIdAndDelete(id).lean();
    
    if (!deletedNote) {
      return res.status(404).json({
        error: 'Note not found',
        message: `No note found with ID: ${id}`
      });
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
export const reorderNotes = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { noteIds } = req.body;
    
    if (!Array.isArray(noteIds)) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'noteIds must be an array'
      });
    }
    
    // This is a simplified implementation
    // In a real app, you might want to add a position/order field to the schema
    // For now, we'll just update the dataUltimaEdicao to reflect the new order
    const updatePromises = noteIds.map((id: string, index: number) => 
      Note.findByIdAndUpdate(
        id,
        { dataUltimaEdicao: new Date(Date.now() - (noteIds.length - index) * 1000) },
        { new: true }
      )
    );
    
    await Promise.all(updatePromises);
    
    res.json({
      message: 'Notes reordered successfully',
      count: noteIds.length
    });
  } catch (error) {
    next(error);
  }
};