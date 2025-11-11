import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { Note } from '../src/models/Note.js';
import { decrypt, isEncrypted } from '../src/utils/encryption.js';

// Carregar variáveis de ambiente
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/notes-app';

async function fixEncryptionIssues() {
  try {
    console.log('🔌 Conectando ao MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado ao MongoDB\n');

    // Buscar todas as notas SEM usar os hooks de descriptografia
    const notes = await Note.find().lean();
    console.log(`📊 Total de notas encontradas: ${notes.length}\n`);

    let encrypted = 0;
    let notEncrypted = 0;
    let problematic = 0;
    const problematicIds: string[] = [];

    for (const note of notes) {
      const conteudo = (note as any).conteudo;
      
      // Verificar se está criptografado
      if (isEncrypted(conteudo)) {
        encrypted++;
        
        // Tentar descriptografar para verificar se está OK
        try {
          const decrypted = decrypt(conteudo);
          
          // Se retornou o mesmo texto, houve problema
          if (decrypted === conteudo) {
            problematic++;
            problematicIds.push((note as any)._id.toString());
            console.log(`❌ Nota problemática: ${(note as any)._id}`);
            console.log(`   Título: ${(note as any).titulo}`);
            console.log(`   Conteúdo (primeiros 50 chars): ${conteudo.substring(0, 50)}...`);
            console.log('');
          }
        } catch (error) {
          problematic++;
          problematicIds.push((note as any)._id.toString());
          console.log(`❌ Erro ao descriptografar nota: ${(note as any)._id}`);
          console.log(`   Título: ${(note as any).titulo}`);
          console.log(`   Erro: ${error}`);
          console.log('');
        }
      } else {
        notEncrypted++;
        console.log(`⚠️  Nota não criptografada: ${(note as any)._id} - "${(note as any).titulo}"`);
      }
    }

    console.log('\n📊 RESUMO:');
    console.log(`✅ Notas criptografadas corretamente: ${encrypted - problematic}`);
    console.log(`⚠️  Notas não criptografadas: ${notEncrypted}`);
    console.log(`❌ Notas com problemas de criptografia: ${problematic}`);
    
    if (problematicIds.length > 0) {
      console.log('\n🔧 IDs das notas problemáticas:');
      problematicIds.forEach(id => console.log(`   - ${id}`));
      
      console.log('\n💡 Estas notas podem ter sido:');
      console.log('   1. Criptografadas com chave diferente');
      console.log('   2. Corrompidas durante migração');
      console.log('   3. Não criptografadas mas com prefixo "U2FsdGVk" acidental');
      console.log('\n⚠️  Você precisará decidir como tratar estas notas:');
      console.log('   - Deletar se não forem importantes');
      console.log('   - Restaurar de backup se disponível');
      console.log('   - Marcar como corrompidas no banco');
    }

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Desconectado do MongoDB');
  }
}

// Executar
fixEncryptionIssues();
