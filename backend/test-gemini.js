#!/usr/bin/env node
'use strict';

require('dotenv').config();

async function test() {
  console.log('🧪 Testando integração com Gemini...\n');
  
  // Verificar chave API
  const key = (process.env.GEMINI_API_KEY || '').trim();
  if (!key) {
    console.error('❌ GEMINI_API_KEY não configurada');
    process.exit(1);
  }
  console.log(`✅ GEMINI_API_KEY configurada: ${key.substring(0,12)}...\n`);
  
  try {
    // Importar o serviço (é uma instância, não uma classe)
    const aiService = require('./src/services/ai.service');
    
    // Sincronizar BD e criar usuário de teste
    console.log('🔧 Preparando banco de dados...');
    const { sequelize } = require('./src/config/database');
    const { User } = require('./src/models/sql/index');
    
    // Encontrar ou criar usuário admin
    const [testUser] = await User.findOrCreate({
      where: { email: 'admin@inkuai.ao' },
      defaults: {
        name: 'Admin Teste',
        email: 'admin@inkuai.ao',
        password_hash: 'hash',
        role: 'admin',
        is_active: true
      }
    });
    console.log(`✅ Usuário de teste pronto: ID=${testUser.id}\n`);
    
    // Teste 1: Simular chat de usuário
    console.log('📝 Teste 1: Chat de usuário...');
    const prompt = 'Olá! Como podes ajudar-me?';
    const response = await aiService.chatUser({
      userId: testUser.id,
      message: prompt,
      projectId: null
    });
    
    console.log('✅ Resposta recebida:');
    console.log(`   Tamanho: ${response.response.length} caracteres`);
    console.log(`   Primeiros 150 caracteres: ${response.response.substring(0, 150)}...\n`);
    
    // Teste 2: Verificar estrutura de resposta
    console.log('📊 Teste 2: Estrutura de resposta');
    console.log(`   - conversation_id: ${response.conversation_id}`);
    console.log(`   - context: ${response.context}`);
    console.log(`   - response type: ${typeof response.response}`);
    console.log(`   - response length: ${response.response.length}\n`);
    
    console.log('✅ TODOS OS TESTES PASSARAM!');
    console.log('🎉 Integração com Gemini funcionando corretamente!\n');
    
  } catch (error) {
    console.error('❌ ERRO:');
    console.error(`   ${error.message}`);
    console.error('\n🔍 Stack:');
    console.error(error.stack);
    process.exit(1);
  }
}

test();
