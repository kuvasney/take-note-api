import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Note } from '../src/models/Note.js';

// Carregar variáveis de ambiente
dotenv.config();

const migrateIndexNote = async () => {
  try {
    console.log('🔌 Conectando ao MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || '');
    console.log('✅ Conectado com sucesso!\n');
    
    // Buscar todos os usuários únicos
    const userIds = await Note.distinct('userId');
    console.log(`📊 Encontrados ${userIds.length} usuários\n`);
    
    let totalMigrated = 0;
    
    for (const userId of userIds) {
      // Buscar notas do usuário ordenadas por data de criação
      const notes = await Note.find({ userId })
        .sort({ dataCriacao: 1 })
        .exec();
      
      if (notes.length === 0) continue;
      
      // Atualizar cada nota com indexNote sequencial
      for (let i = 0; i < notes.length; i++) {
        await Note.findByIdAndUpdate(notes[i]._id, { 
          indexNote: i 
        });
      }
      
      totalMigrated += notes.length;
      console.log(`✅ Usuário ${userId}: ${notes.length} notas migradas`);
    }
    
    console.log(`\n🎉 Migração completa! Total: ${totalMigrated} notas`);
    
    // Verificar algumas notas
    console.log('\n📋 Primeiras 5 notas após migração:');
    const sampleNotes = await Note.find()
      .sort({ userId: 1, indexNote: 1 })
      .limit(5)
      .select('userId indexNote titulo')
      .lean();
    
    console.table(sampleNotes);
    
  } catch (error) {
    console.error('❌ Erro na migração:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Desconectado do MongoDB');
    process.exit(0);
  }
};

// Executar migração
migrateIndexNote();
