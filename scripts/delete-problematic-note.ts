import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { Note } from '../src/models/Note.js';

// Carregar variáveis de ambiente
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/notes-app';
const PROBLEMATIC_NOTE_ID = '691340e59934f996fbfc34c6';

async function deleteProblematicNote() {
  try {
    console.log('🔌 Conectando ao MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado ao MongoDB\n');

    // Buscar a nota problemática
    const note = await Note.findById(PROBLEMATIC_NOTE_ID);
    
    if (!note) {
      console.log('❌ Nota não encontrada!');
      return;
    }

    console.log('📝 Nota encontrada:');
    console.log(`   ID: ${note._id}`);
    console.log(`   Título: ${note.titulo}`);
    console.log(`   User: ${note.userId}`);
    console.log(`   Criada em: ${note.dataCriacao}`);
    console.log('');

    // Deletar a nota
    await Note.findByIdAndDelete(PROBLEMATIC_NOTE_ID);
    console.log('✅ Nota deletada com sucesso!');
    console.log('');
    console.log('💡 Esta nota foi criptografada com uma chave diferente e não podia ser lida.');
    console.log('   O usuário poderá criar uma nova nota normalmente.');

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Desconectado do MongoDB');
  }
}

// Executar
deleteProblematicNote();
