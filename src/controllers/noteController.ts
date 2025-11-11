import { Request, Response, NextFunction } from 'express';
import { Note } from '../models/Note.js';
import { CreateNoteDto, UpdateNoteDto } from '../types/note.js';
import { SearchNotesSchema } from '../validation/noteSchemas.js';
import { User } from '../models/User.js';
import { sendCollaboratorAddedEmail } from '../services/emailService.js';

// GET /api/notes - List all notes with optional filtering
export const getNotes = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { archived = 'false', pinned, page = 1, limit = 50 } = req.query;
    
    const userEmail = req.user?.email; // Email do usuário autenticado
    const userId = req.user?.userId;
    
    // Filtro base: notas que o usuário criou OU onde ele é colaborador
    const filter: any = {
      $or: [
        { userId },                        // Notas que o usuário criou
        { colaboradores: userEmail }       // Notas onde ele é colaborador
      ]
    };
    
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
// GET /api/notes/:id - Get single note (requer autenticação ou nota pública)
export const getNoteById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const userEmail = req.user?.email;
    const userId = req.user?.userId;
    
    // Primeiro tenta buscar nota onde usuário tem acesso OU nota é pública
    const note = await Note.findOne({ 
      _id: id,
      $or: [
        { userId },
        { colaboradores: userEmail },
        { isPublic: true }  // Permite acesso se nota for pública
      ]
    }).lean();
    
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
    
    // Se a nota será pública, gerar shareToken
    const shareToken = noteData.isPublic ? (Note as any).generateShareToken() : undefined;
    
    // Adicionar o userId, order e shareToken (se público)
    const note = new Note({
      ...noteData,
      userId: req.user?.userId,
      order: nextOrder,
      shareToken
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
    const userEmail = req.user?.email;
    const userId = req.user?.userId;
    
    // Remove id from update data if present
    if ('id' in updateData) {
      delete (updateData as any).id;
    }
    
    // Atualizar se usuário é dono OU colaborador
    const updatedNote = await Note.findOneAndUpdate(
      { 
        _id: id,
        $or: [
          { userId },
          { colaboradores: userEmail }
        ]
      },
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
    const userId = req.user?.userId;
    
    // APENAS o dono pode deletar (colaboradores NÃO podem)
    const deletedNote = await Note.findOneAndDelete({ _id: id, userId }).lean();
    
    if (!deletedNote) {
      res.status(404).json({
        error: 'Note not found',
        message: `No note found with ID: ${id} or you are not the owner`
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

export const addCollaborator = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { noteId, email } = req.body;

    // Validar noteId
    if (!noteId) {
      res.status(400).json({
        error: 'Missing noteId',
        message: 'noteId is required in request body'
      });
      return;
    }

    // Validar formato do ObjectId
    if (!noteId.match(/^[0-9a-fA-F]{24}$/)) {
      res.status(400).json({
        error: 'Invalid noteId format',
        message: 'The provided noteId is not a valid MongoDB ObjectId'
      });
      return;
    }

    // Validar email
    if (!email) {
      res.status(400).json({
        error: 'Missing email',
        message: 'Collaborator email is required'
      });
      return;
    }

    // Buscar apenas se a nota pertence ao usuário (APENAS dono pode adicionar)
    const note = await Note.findOne({ _id: noteId, userId: req.user?.userId });

    const existentUser = await User.findOne({ email: email.toLowerCase() });

    if (!existentUser) {
      res.status(404).json({
        error: 'User not found',
        message: `No user found with email: ${email}`
      });
      return;
    }

    if (!note) {
      res.status(404).json({
        error: 'Note not found',
        message: `No note found with ID: ${noteId} or you are not the owner`
      });
      return;
    }

    // Adicionar colaborador se não existir
    if (!note.colaboradores.includes(email)) {
      note.colaboradores.push(email);
      note.dataUltimaEdicao = new Date();
      const updatedNote = await note.save();
      
      // Enviar email para o colaborador
      try {
        // Buscar dados do dono da nota para incluir o nome no email
        const owner = await User.findById(req.user?.userId);
        
        await sendCollaboratorAddedEmail({
          collaboratorEmail: email,
          ownerName: owner?.username || 'Um usuário',
          noteTitle: note.titulo,
          noteId: String(note._id)
        });
      } catch (emailError) {
        console.error('Erro ao enviar email de colaboração:', emailError);
        // Continua mesmo se o email falhar
      }
      
      res.json({
        message: 'Collaborator added successfully',
        note: updatedNote.toJSON()
      });
    } else {
      res.status(409).json({
        error: 'Collaborator already added',
        message: `Collaborator with email: ${email} is already added`
      });
    }
  } catch (error) {
    next(error);
  }
};

// Remove collaborator from note
export const removeCollaborator = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { noteId, email } = req.body;

    // Validar noteId
    if (!noteId) {
      res.status(400).json({
        error: 'Missing noteId',
        message: 'noteId is required in request body'
      });
      return;
    }

    // Validar formato do ObjectId
    if (!noteId.match(/^[0-9a-fA-F]{24}$/)) {
      res.status(400).json({
        error: 'Invalid noteId format',
        message: 'The provided noteId is not a valid MongoDB ObjectId'
      });
      return;
    }

    // Validar email
    if (!email) {
      res.status(400).json({
        error: 'Missing email',
        message: 'Collaborator email is required'
      });
      return;
    }

    // Buscar apenas se a nota pertence ao usuário (APENAS dono pode remover)
    const note = await Note.findOne({ _id: noteId, userId: req.user?.userId });

    if (!note) {
      res.status(404).json({
        error: 'Note not found',
        message: `No note found with ID: ${noteId} or you are not the owner`
      });
      return;
    }

    // Remover colaborador
    const index = note.colaboradores.indexOf(email);
    if (index > -1) {
      note.colaboradores.splice(index, 1);
      note.dataUltimaEdicao = new Date();
      const updatedNote = await note.save();
      res.json({
        message: 'Collaborator removed successfully',
        note: updatedNote.toJSON()
      });
    } else {
      res.status(404).json({
        error: 'Collaborator not found',
        message: `Collaborator with email: ${email} is not in this note`
      });
    }
  } catch (error) {
    next(error);
  }
};

// GET /api/notes/public/:shareToken - Acesso público via token (SEM autenticação)
export const getPublicNoteByToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { shareToken } = req.params;
    
    // Buscar nota pública pelo shareToken (SEM .lean() para executar hooks de descriptografia)
    const note = await Note.findOne({ 
      shareToken,
      isPublic: true  // Deve ser pública
    });
    
    if (!note) {
      res.status(404).json({
        error: 'Note not found',
        message: 'Public note not found or link is invalid'
      });
      return;
    }
    
    // Retornar apenas campos públicos (sem dados sensíveis)
    const publicNote = {
      id: note.id,
      titulo: note.titulo,
      conteudo: note.conteudo,
      cor: note.cor,
      tags: note.tags,
      dataCriacao: note.dataCriacao,
      dataUltimaEdicao: note.dataUltimaEdicao,
      isPublic: note.isPublic,
      shareToken: note.shareToken
    };
    
    res.json(publicNote);
  } catch (error) {
    next(error);
  }
};

// PATCH /api/notes/:id/toggle-public - Alternar status público da nota
export const togglePublicNote = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;
    
    // Buscar nota (apenas dono pode tornar pública)
    const note = await Note.findOne({ _id: id, userId });
    
    if (!note) {
      res.status(404).json({
        error: 'Note not found',
        message: 'Note not found or you are not the owner'
      });
      return;
    }
    
    // Alternar status público
    note.isPublic = !note.isPublic;
    
    // Se estiver tornando pública e não tiver shareToken, gerar um
    if (note.isPublic && !note.shareToken) {
      note.shareToken = (Note as any).generateShareToken();
    }
    
    note.dataUltimaEdicao = new Date();
    const updatedNote = await note.save();
    
    res.json({
      message: note.isPublic ? 'Note is now public' : 'Note is now private',
      note: updatedNote.toJSON(),
      shareUrl: note.isPublic && note.shareToken 
        ? `${process.env.FRONTEND_URL || 'http://localhost:5173'}/public-note/${note.shareToken}`
        : null
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/notes/:id/regenerate-share-token - Regenerar token de compartilhamento
export const regenerateShareToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;
    
    // Buscar nota (apenas dono pode regenerar)
    const note = await Note.findOne({ _id: id, userId });
    
    if (!note) {
      res.status(404).json({
        error: 'Note not found',
        message: 'Note not found or you are not the owner'
      });
      return;
    }
    
    // Gerar novo token
    note.shareToken = (Note as any).generateShareToken();
    note.dataUltimaEdicao = new Date();
    const updatedNote = await note.save();
    
    res.json({
      message: 'Share token regenerated successfully',
      note: updatedNote.toJSON(),
      shareUrl: note.isPublic && note.shareToken 
        ? `${process.env.FRONTEND_URL || 'http://localhost:5173'}/public/${note.shareToken}`
        : null
    });
  } catch (error) {
    next(error);
  }
};
  