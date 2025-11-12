/**
 * Script de Migração: Campos PT → EN
 * 
 * Renomeia campos do schema de notas de português para inglês:
 * - titulo → title
 * - conteudo → content
 * - dataCriacao → createdAt
 * - dataUltimaEdicao → updatedAt
 * - lembretes → reminders
 *   - lembretes.dataHora → reminders.dateTime
 *   - lembretes.texto → reminders.text
 * - colaboradores → collaborators
 * 
 * IMPORTANTE: 
 * - Faz backup automático antes da migração
 * - Pode ser revertido com o script rollback gerado
 * - Execute primeiro em ambiente de desenvolvimento!
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Carrega variáveis de ambiente
dotenv.config({ path: join(__dirname, '../.env') });

interface MigrationStats {
  totalNotes: number;
  migratedNotes: number;
  failedNotes: number;
  errors: Array<{ noteId: string; error: string }>;
  startTime: Date;
  endTime?: Date;
}

const stats: MigrationStats = {
  totalNotes: 0,
  migratedNotes: 0,
  failedNotes: 0,
  errors: [],
  startTime: new Date()
};

async function connectDB() {
  try {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      throw new Error('MONGODB_URI não está definida no .env');
    }

    await mongoose.connect(uri);
    console.log('✅ Conectado ao MongoDB');
  } catch (error) {
    console.error('❌ Erro ao conectar ao MongoDB:', error);
    process.exit(1);
  }
}

async function createBackup() {
  console.log('\n📦 Criando backup das notas...');
  
  try {
    const Note = mongoose.connection.collection('notes');
    const allNotes = await Note.find({}).toArray();
    
    stats.totalNotes = allNotes.length;
    console.log(`   Encontradas ${stats.totalNotes} notas`);
    
    const backupPath = join(__dirname, `backup-notes-${Date.now()}.json`);
    await fs.writeFile(backupPath, JSON.stringify(allNotes, null, 2));
    
    console.log(`✅ Backup criado: ${backupPath}`);
    return backupPath;
  } catch (error) {
    console.error('❌ Erro ao criar backup:', error);
    throw error;
  }
}

async function createRollbackScript() {
  console.log('\n📝 Criando script de rollback...');
  
  const rollbackContent = `/**
 * Script de Rollback: EN → PT
 * 
 * Reverte a migração dos campos de inglês para português
 * Gerado automaticamente em: ${new Date().toISOString()}
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
          'collaborators': 'colaboradores',
          'color': 'cor'
        }
      }
    );
    
    console.log(\`✅ Rollback concluído: \${result.modifiedCount} notas revertidas\`);
    
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
    
    console.log(\`✅ Lembretes revertidos: \${notesWithReminders.length} notas\`);
    
    await mongoose.disconnect();
    console.log('✅ Rollback completo!');
  } catch (error) {
    console.error('❌ Erro no rollback:', error);
    process.exit(1);
  }
}

rollback();
`;

  const rollbackPath = join(__dirname, `rollback-migration-${Date.now()}.ts`);
  await fs.writeFile(rollbackPath, rollbackContent);
  
  console.log(`✅ Script de rollback criado: ${rollbackPath}`);
  return rollbackPath;
}

async function migrateNotes() {
  console.log('\n🔄 Iniciando migração dos campos...\n');
  
  try {
    const Note = mongoose.connection.collection('notes');
    
    // 1. Renomeia campos principais
    console.log('1️⃣  Renomeando campos principais...');
    const mainFieldsResult = await Note.updateMany(
      {},
      {
        $rename: {
          'titulo': 'title',
          'conteudo': 'content',
          'dataCriacao': 'createdAt',
          'dataUltimaEdicao': 'updatedAt',
          'lembretes': 'reminders',
          'colaboradores': 'collaborators',
          'cor': 'color'
        }
      }
    );
    
    console.log(`   ✅ ${mainFieldsResult.modifiedCount} notas atualizadas\n`);
    stats.migratedNotes = mainFieldsResult.modifiedCount;
    
    // 2. Migra campos dos lembretes (se existirem)
    console.log('2️⃣  Migrando campos dos lembretes...');
    const notesWithReminders = await Note.find({ 
      'reminders': { $exists: true, $ne: [] } 
    }).toArray();
    
    let remindersUpdated = 0;
    
    for (const note of notesWithReminders) {
      try {
        if (note.reminders && Array.isArray(note.reminders)) {
          const updatedReminders = note.reminders.map((reminder: any) => ({
            id: reminder.id,
            dateTime: reminder.dataHora || reminder.dateTime,
            text: reminder.texto || reminder.text
          }));
          
          await Note.updateOne(
            { _id: note._id },
            { $set: { reminders: updatedReminders } }
          );
          
          remindersUpdated++;
        }
      } catch (error) {
        console.error(`   ⚠️  Erro ao migrar lembretes da nota ${note._id}:`, error);
        stats.failedNotes++;
        stats.errors.push({
          noteId: note._id.toString(),
          error: error instanceof Error ? error.message : 'Erro desconhecido'
        });
      }
    }
    
    console.log(`   ✅ ${remindersUpdated} notas com lembretes atualizadas\n`);
    
  } catch (error) {
    console.error('❌ Erro durante a migração:', error);
    throw error;
  }
}

async function verifyMigration() {
  console.log('\n🔍 Verificando migração...\n');
  
  try {
    const Note = mongoose.connection.collection('notes');
    
    // Verifica se ainda existem campos antigos
    const oldFieldsCount = await Note.countDocuments({
      $or: [
        { 'titulo': { $exists: true } },
        { 'conteudo': { $exists: true } },
        { 'dataCriacao': { $exists: true } },
        { 'dataUltimaEdicao': { $exists: true } },
        { 'lembretes': { $exists: true } },
        { 'colaboradores': { $exists: true } },
        { 'cor': { $exists: true } }
      ]
    });
    
    // Verifica se os campos novos existem
    const newFieldsCount = await Note.countDocuments({
      $and: [
        { 'title': { $exists: true } },
        { 'content': { $exists: true } }
      ]
    });
    
    console.log(`   📊 Notas com campos antigos: ${oldFieldsCount}`);
    console.log(`   📊 Notas com campos novos: ${newFieldsCount}`);
    
    if (oldFieldsCount === 0 && newFieldsCount === stats.totalNotes) {
      console.log('\n   ✅ Migração verificada com sucesso!\n');
      return true;
    } else {
      console.log('\n   ⚠️  Verificação encontrou inconsistências\n');
      return false;
    }
  } catch (error) {
    console.error('❌ Erro ao verificar migração:', error);
    return false;
  }
}

async function printSummary(backupPath: string, rollbackPath: string) {
  stats.endTime = new Date();
  const duration = (stats.endTime.getTime() - stats.startTime.getTime()) / 1000;
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 RESUMO DA MIGRAÇÃO');
  console.log('='.repeat(60));
  console.log(`⏱️  Duração: ${duration.toFixed(2)}s`);
  console.log(`📝 Total de notas: ${stats.totalNotes}`);
  console.log(`✅ Notas migradas: ${stats.migratedNotes}`);
  console.log(`❌ Notas com erro: ${stats.failedNotes}`);
  console.log(`📦 Backup: ${backupPath}`);
  console.log(`🔙 Rollback: ${rollbackPath}`);
  
  if (stats.errors.length > 0) {
    console.log('\n⚠️  ERROS:');
    stats.errors.forEach(err => {
      console.log(`   Nota ${err.noteId}: ${err.error}`);
    });
  }
  
  console.log('='.repeat(60) + '\n');
}

async function main() {
  console.log('\n' + '='.repeat(60));
  console.log('🚀 MIGRAÇÃO: Campos PT → EN');
  console.log('='.repeat(60) + '\n');
  
  try {
    // 1. Conecta ao banco
    await connectDB();
    
    // 2. Cria backup
    const backupPath = await createBackup();
    
    // 3. Cria script de rollback
    const rollbackPath = await createRollbackScript();
    
    // 4. Confirma com usuário
    console.log('\n⚠️  ATENÇÃO: Esta operação irá modificar TODAS as notas!');
    console.log('   Backup criado em:', backupPath);
    console.log('   Script de rollback:', rollbackPath);
    console.log('\n   Pressione Ctrl+C para cancelar ou Enter para continuar...\n');
    
    // Aguarda confirmação
    await new Promise(resolve => {
      process.stdin.once('data', resolve);
    });
    
    // 5. Executa migração
    await migrateNotes();
    
    // 6. Verifica resultado
    const success = await verifyMigration();
    
    // 7. Mostra resumo
    await printSummary(backupPath, rollbackPath);
    
    // 8. Desconecta
    await mongoose.disconnect();
    console.log('✅ Desconectado do MongoDB\n');
    
    if (success) {
      console.log('🎉 Migração concluída com sucesso!\n');
      process.exit(0);
    } else {
      console.log('⚠️  Migração concluída com avisos. Verifique os logs.\n');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('\n❌ Erro fatal:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

main();
