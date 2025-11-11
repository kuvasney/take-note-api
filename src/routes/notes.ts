import { Router } from 'express';
import * as noteController from '../controllers/noteController.js';
import { validateRequest, validateObjectId } from '../middleware/validation.js';
import { CreateNoteSchema, UpdateNoteSchema } from '../validation/noteSchemas.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

// Rotas PÚBLICAS (sem autenticação obrigatória)
// GET /api/notes/public/:shareToken - Acesso público via token
router.get('/public/:shareToken', noteController.getPublicNoteByToken);

// Aplicar autenticação a todas as outras rotas de notas
router.use(authenticateToken);

// GET /api/notes - List all notes with optional filtering
router.get('/', noteController.getNotes);

// GET /api/notes/search - Search notes
router.get('/search', noteController.searchNotes);

// POST /api/notes/reorder - Reorder notes (ANTES de rotas com :id)
router.post('/reorder', noteController.reorderNotes);

// PUT /api/notes/addCollaborator - Add collaborator to note (ANTES de rotas com :id)
router.put('/addCollaborator', noteController.addCollaborator);

// DELETE /api/notes/removeCollaborator - Remove collaborator from note (ANTES de rotas com :id)
router.delete('/removeCollaborator', noteController.removeCollaborator);

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

// PATCH /api/notes/:id/toggle-public - Toggle public status
router.patch('/:id/toggle-public', validateObjectId, noteController.togglePublicNote);

// POST /api/notes/:id/regenerate-share-token - Regenerar token de compartilhamento
router.post('/:id/regenerate-share-token', validateObjectId, noteController.regenerateShareToken);

// DELETE /api/notes/:id - Delete note
router.delete('/:id', validateObjectId, noteController.deleteNote);

export default router;