import mongoose from 'mongoose';
import { Note } from '../src/models/Note.js';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

/**
 * Script de migração para adicionar campos isPublic e shareToken
 * em notas existentes no banco de dados
 */
async function migrateNotes() {
  try {
    console.log('🔄 Iniciando migração...');
    
    // Conectar ao MongoDB
    await mongoose.connect(process.env.MONGODB_URI || '');
    console.log('✅ Conectado ao MongoDB');
    
    // Buscar todas as notas que não têm o campo isPublic
    const notesWithoutIsPublic = await Note.find({ 
      isPublic: { $exists: false } 
    });
    
    console.log(`📊 Encontradas ${notesWithoutIsPublic.length} notas sem campo isPublic`);
    
    if (notesWithoutIsPublic.length === 0) {
      console.log('✅ Todas as notas já possuem o campo isPublic');
      return;
    }
    
    // Atualizar todas de uma vez
    const result = await Note.updateMany(
      { isPublic: { $exists: false } },
      { 
        $set: { 
          isPublic: false  // Por padrão, todas as notas são privadas
          // shareToken não é definido (apenas gerado quando tornar pública)
        } 
      }
    );
    
    console.log(`✅ Migração concluída!`);
    console.log(`   - Notas atualizadas: ${result.modifiedCount}`);
    console.log(`   - Status: Todas as notas existentes agora são PRIVADAS por padrão`);
    console.log(`   - Os usuários podem torná-las públicas manualmente`);
    
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
migrateNotes()
  .then(() => {
    console.log('🎉 Migração finalizada com sucesso!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Erro fatal na migração:', error);
    process.exit(1);
  });
