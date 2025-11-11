import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

// Schema simplificado
const UserSchema = new mongoose.Schema({
  email: String,
  username: String,
  password: String
});

const User = mongoose.model('User', UserSchema);

/**
 * Script para identificar e alertar sobre senhas não hasheadas
 * 
 * IMPORTANTE: Este script apenas IDENTIFICA senhas sem hash.
 * Não é possível fazer hash de senhas já salvas em texto plano,
 * pois não temos a senha original para hashear novamente.
 * 
 * Os usuários afetados precisarão RESETAR suas senhas.
 */
async function checkPasswordHashes() {
  try {
    console.log('🔍 Verificando senhas no banco...\n');
    
    await mongoose.connect(process.env.MONGODB_URI || '');
    console.log('✅ Conectado ao MongoDB\n');
    
    const users = await User.find({}).select('+password');
    
    console.log(`📊 Total de usuários: ${users.length}\n`);
    
    const problematicUsers: any[] = [];
    
    for (const user of users) {
      if (user.password) {
        // Senhas hasheadas com bcrypt têm formato específico:
        // $2a$12$... ou $2b$12$... (60 caracteres)
        const isBcryptHash = /^\$2[aby]\$\d{2}\$.{53}$/.test(user.password);
        
        if (!isBcryptHash) {
          problematicUsers.push({
            id: user._id,
            username: user.username,
            email: user.email,
            passwordLength: user.password.length
          });
        }
      }
    }
    
    if (problematicUsers.length === 0) {
      console.log('✅ Todas as senhas estão hasheadas corretamente!\n');
    } else {
      console.log('⚠️  ATENÇÃO: Senhas sem hash encontradas:\n');
      
      problematicUsers.forEach(u => {
        console.log(`  - User: ${u.username} (${u.email})`);
        console.log(`    ID: ${u.id}`);
        console.log(`    Tamanho da senha: ${u.passwordLength} caracteres`);
        console.log('');
      });
      
      console.log(`\n📌 Total de usuários afetados: ${problematicUsers.length}\n`);
      
      console.log('🔧 SOLUÇÃO RECOMENDADA:');
      console.log('   1. Enviar email de reset de senha para os usuários afetados');
      console.log('   2. OU resetar manualmente as senhas desses usuários\n');
      
      console.log('💡 Para resetar manualmente via MongoDB:');
      console.log('   1. Entre no MongoDB');
      console.log('   2. Execute: db.users.updateOne(');
      console.log('      { _id: ObjectId("USER_ID") },');
      console.log('      { $set: { password: "$2a$12$HASH_GERADO_AQUI" } }');
      console.log('   )');
      console.log('   3. Ou use o endpoint POST /api/users/forgot-password\n');
    }
    
  } catch (error) {
    console.error('❌ Erro ao verificar senhas:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Desconectado do MongoDB');
  }
}

checkPasswordHashes()
  .then(() => {
    console.log('\n🎉 Verificação concluída!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Erro fatal:', error);
    process.exit(1);
  });
