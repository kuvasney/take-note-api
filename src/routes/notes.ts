import { Router } from 'express';
import * as noteController from '../controllers/noteController.js';
import { validateRequest, validateObjectId } from '../middleware/validation.js';
import { CreateNoteSchema, UpdateNoteSchema } from '../validation/noteSchemas.js';

const router = Router();

// GET /api/notes - List all notes with optional filtering
router.get('/', noteController.getNotes);

// GET /api/notes/search - Search notes
router.get('/search', noteController.searchNotes);

// GET /api/notes/:id - Get specific note
router.get('/:id', validateObjectId, noteController.getNoteById);

// POST /api/notes - Create new note
router.post('/', validateRequest(CreateNoteSchema), noteController.createNote);

// PUT /api/notes/:id - Update existing note
router.put('/:id', validateObjectId, validateRequest(UpdateNoteSchema), noteController.updateNote);

// PATCH /api/notes/:id/pin - Toggle pin status
router.patch('/:id/pin', validateObjectId, noteController.togglePin);

// PATCH /api/notes/:id/archive - Toggle archive status
router.patch('/:id/archive', validateObjectId, noteController.toggleArchive);

// DELETE /api/notes/:id - Delete note
router.delete('/:id', validateObjectId, noteController.deleteNote);

// POST /api/notes/reorder - Reorder notes
router.post('/reorder', noteController.reorderNotes);

export default router;