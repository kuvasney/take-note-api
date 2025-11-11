import mongoose from 'mongoose';
import { Note } from '../src/models/Note.js';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Script para adicionar shareToken em notas públicas que não têm
 */
async function fixMissingShareTokens() {
  try {
    console.log('🔄 Iniciando correção...');
    
    await mongoose.connect(process.env.MONGODB_URI || '');
    console.log('✅ Conectado ao MongoDB');
    
    // Buscar notas públicas sem shareToken
    const publicNotesWithoutToken = await Note.find({ 
      isPublic: true,
      $or: [
        { shareToken: { $exists: false } },
        { shareToken: null },
        { shareToken: '' }
      ]
    });
    
    console.log(`📊 Encontradas ${publicNotesWithoutToken.length} notas públicas sem shareToken`);
    
    if (publicNotesWithoutToken.length === 0) {
      console.log('✅ Todas as notas públicas já possuem shareToken');
      return;
    }
    
    let fixed = 0;
    
    // Gerar shareToken para cada uma
    for (const note of publicNotesWithoutToken) {
      note.shareToken = (Note as any).generateShareToken();
      await note.save();
      fixed++;
      console.log(`  ✓ Token gerado para nota: ${note.titulo} (${note._id})`);
    }
    
    console.log(`\n✅ Correção concluída!`);
    console.log(`   - Notas corrigidas: ${fixed}`);
    console.log(`   - Todas as notas públicas agora têm shareToken único`);
    
  } catch (error) {
    console.error('❌ Erro na correção:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Desconectado do MongoDB');
  }
}

fixMissingShareTokens()
  .then(() => {
    console.log('🎉 Correção finalizada com sucesso!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Erro fatal:', error);
    process.exit(1);
  });
