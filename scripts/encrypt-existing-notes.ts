import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { encrypt, isEncrypted } from '../src/utils/encryption.js';

// Carregar variáveis de ambiente
dotenv.config();

// Schema simplificado para migração
const NoteSchema = new mongoose.Schema({
  conteudo: String,
  titulo: String
});

const Note = mongoose.model('Note', NoteSchema);

/**
 * Script de migração para criptografar conteúdo de notas existentes
 */
async function migrateNoteEncryption() {
  try {
    console.log('🔄 Iniciando migração de criptografia...');
    
    // Conectar ao MongoDB
    await mongoose.connect(process.env.MONGODB_URI || '');
    console.log('✅ Conectado ao MongoDB');
    
    // Buscar todas as notas
    const notes = await Note.find({});
    
    console.log(`📊 Encontradas ${notes.length} notas no total`);
    
    let encrypted = 0;
    let alreadyEncrypted = 0;
    let errors = 0;
    
    for (const note of notes) {
      try {
        if (note.conteudo) {
          // Verificar se já está criptografado
          if (isEncrypted(note.conteudo)) {
            alreadyEncrypted++;
            console.log(`  ⏭️  Nota "${note.titulo}" já está criptografada`);
            continue;
          }
          
          // Criptografar conteúdo
          const encryptedContent = encrypt(note.conteudo);
          
          // Atualizar diretamente no banco (sem passar pelos hooks)
          await Note.updateOne(
            { _id: note._id },
            { $set: { conteudo: encryptedContent } }
          );
          
          encrypted++;
          console.log(`  ✓ Nota "${note.titulo}" criptografada`);
        }
      } catch (error) {
        errors++;
        console.error(`  ✗ Erro ao processar nota "${note.titulo}":`, error);
      }
    }
    
    console.log(`\n✅ Migração concluída!`);
    console.log(`   - Notas criptografadas: ${encrypted}`);
    console.log(`   - Notas já criptografadas: ${alreadyEncrypted}`);
    console.log(`   - Erros: ${errors}`);
    console.log(`   - Total processado: ${notes.length}`);
    
    if (errors > 0) {
      console.warn(`\n⚠️  Houve ${errors} erro(s) durante a migração. Verifique os logs acima.`);
    }
    
  } catch (error) {
    console.error('❌ Erro na migração:', error);
    throw error;
  } finally {
    // Desconectar do MongoDB
    await mongoose.disconnect();
    console.log('🔌 Desconectado do MongoDB');
  }
}

// Executar migração
migrateNoteEncryption()
  .then(() => {
    console.log('🎉 Migração finalizada com sucesso!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Erro fatal na migração:', error);
    process.exit(1);
  });
