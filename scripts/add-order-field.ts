import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Note } from '../src/models/Note.js';

dotenv.config();

async function addOrderField() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    
    if (!mongoUri) {
      throw new Error('MONGODB_URI não definida no .env');
    }

    console.log('🔌 Conectando ao MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Conectado ao MongoDB Atlas\n');

    // Buscar todos os usuários únicos
    const userIds = await Note.distinct('userId');
    console.log(`📊 Encontrados ${userIds.length} usuários\n`);
    
    let totalUpdated = 0;
    
    for (const userId of userIds) {
      // Buscar notas do usuário ordenadas por data de criação (mais antigas primeiro)
      const notes = await Note.find({ userId })
        .sort({ dataCriacao: 1 })
        .exec();
      
      if (notes.length === 0) continue;
      
      console.log(`👤 Usuário ${userId}: ${notes.length} notas`);
      
      // Atualizar cada nota com order crescente (mais antigas = order menor)
      for (let i = 0; i < notes.length; i++) {
        await Note.findByIdAndUpdate(notes[i]._id, { 
          order: i 
        });
      }
      
      totalUpdated += notes.length;
      console.log(`   ✅ ${notes.length} notas atualizadas (order: 0 a ${notes.length - 1})`);
    }
    
    console.log(`\n🎉 Migração completa! Total: ${totalUpdated} notas atualizadas`);
    
    // Verificar algumas notas
    console.log('\n📋 Primeiras 5 notas após migração:');
    const sampleNotes = await Note.find()
      .sort({ userId: 1, order: -1 })
      .limit(5)
      .select('userId order titulo dataCriacao')
      .lean();
    
    console.table(sampleNotes);
    
  } catch (error) {
    console.error('❌ Erro na migração:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Desconectado do MongoDB');
    process.exit(0);
  }
}

addOrderField();
