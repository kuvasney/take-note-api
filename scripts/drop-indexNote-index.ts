import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Note } from '../src/models/Note.js';

dotenv.config();

async function dropIndexNoteIndex() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    
    if (!mongoUri) {
      throw new Error('MONGODB_URI não definida no .env');
    }

    console.log('🔌 Conectando ao MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Conectado ao MongoDB Atlas\n');

    console.log('🗑️  Removendo índice composto userId_1_indexNote_1...');
    
    try {
      await Note.collection.dropIndex('userId_1_indexNote_1');
      console.log('✅ Índice removido com sucesso!');
    } catch (error: any) {
      if (error.code === 27 || error.message?.includes('index not found')) {
        console.log('ℹ️  Índice não encontrado (já foi removido ou não existe)');
      } else {
        throw error;
      }
    }

    console.log('\n🗑️  Removendo campo indexNote de todas as notas...');
    const result = await Note.updateMany(
      {},
      { $unset: { indexNote: '' } }
    );
    console.log(`✅ Campo indexNote removido de ${result.modifiedCount} notas`);

    console.log('\n✨ Limpeza concluída com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro durante a limpeza:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('👋 Desconectado do MongoDB');
  }
}

dropIndexNoteIndex();
