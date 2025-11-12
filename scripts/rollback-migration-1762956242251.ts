/**
 * Script de Rollback: EN → PT
 * 
 * Reverte a migração dos campos de inglês para português
 * Gerado automaticamente em: 2025-11-12T14:04:02.251Z
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../.env') });

async function rollback() {
  try {
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log('✅ Conectado ao MongoDB');
    
    const Note = mongoose.connection.collection('notes');
    
    // Reverte campos principais
    const result = await Note.updateMany(
      {},
      {
        $rename: {
          'title': 'titulo',
          'content': 'conteudo',
          'createdAt': 'dataCriacao',
          'updatedAt': 'dataUltimaEdicao',
          'reminders': 'lembretes',
          'collaborators': 'colaboradores'
        }
      }
    );
    
    console.log(`✅ Rollback concluído: ${result.modifiedCount} notas revertidas`);
    
    // Reverte campos dos lembretes
    const notesWithReminders = await Note.find({ 'lembretes': { $exists: true, $ne: [] } }).toArray();
    
    for (const note of notesWithReminders) {
      if (note.lembretes && Array.isArray(note.lembretes)) {
        const revertedReminders = note.lembretes.map((reminder: any) => ({
          id: reminder.id,
          dataHora: reminder.dateTime || reminder.dataHora,
          texto: reminder.text || reminder.texto
        }));
        
        await Note.updateOne(
          { _id: note._id },
          { $set: { lembretes: revertedReminders } }
        );
      }
    }
    
    console.log(`✅ Lembretes revertidos: ${notesWithReminders.length} notas`);
    
    await mongoose.disconnect();
    console.log('✅ Rollback completo!');
  } catch (error) {
    console.error('❌ Erro no rollback:', error);
    process.exit(1);
  }
}

rollback();
