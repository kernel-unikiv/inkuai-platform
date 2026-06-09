'use strict';
require('dotenv').config();

const app     = require('./src/app');
const logger  = require('./src/utils/logger');

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    // ── Diagnóstico de variáveis de ambiente ──
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🚀 INKU·AI Platform a iniciar...');
    console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
    console.log(`   DATABASE_URL: ${process.env.DATABASE_URL ? '✅ Configurada' : '⚠️  Não configurada'}`);
    console.log(`   ANTHROPIC_API_KEY: ${process.env.ANTHROPIC_API_KEY ? '✅ Configurada (' + process.env.ANTHROPIC_API_KEY.substring(0,12) + '...)' : '❌ NÃO CONFIGURADA — Adicione no Render → Environment'}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    const { sequelize } = require('./src/config/database');
    const connectMongoDB = require('./src/config/mongodb');

    // Tentar ligar à base de dados
    try {
      await sequelize.authenticate();
      await sequelize.sync({ alter: true });
      logger.info('✅ Base de dados PostgreSQL pronta');
    } catch (dbErr) {
      logger.error('');
      logger.error('════════════════════════════════════════════════════');
      logger.error('  ❌ ERRO: Base de dados não configurada!');
      logger.error('  Configure DATABASE_URL no ficheiro .env');
      logger.error('  Use o Supabase GRATUITO: https://supabase.com');
      logger.error('  Consulte GUIA_DEPLOY.md para instruções detalhadas');
      logger.error('════════════════════════════════════════════════════');
      logger.error('');
      logger.error('Detalhe técnico:', dbErr.message);
      process.exit(1);
    }

    // MongoDB opcional
    await connectMongoDB();

    // Seed automático se pedido
    if (process.env.AUTO_SEED === 'true') {
      try {
        const { User } = require('./src/models/sql/index');
        const count = await User.count();
        if (count === 0) {
          logger.info('🌱 A criar contas iniciais...');
          await require('./src/seeders/admin.seeder').run();
        }
      } catch (e) {
        logger.warn('Seed automático falhou (não crítico):', e.message);
      }
    }

    app.listen(PORT, () => {
      logger.info('');
      logger.info('╔══════════════════════════════════════════════╗');
      logger.info('║         INKU·AI Platform iniciada! 🚀        ║');
      logger.info('║                                              ║');
      logger.info(`║  📡 API:  http://localhost:${PORT}/api/v1      ║`);
      logger.info(`║  🌍 App:  http://localhost:${PORT}             ║`);
      logger.info('║  📖 Docs: http://localhost:5000/api/docs     ║');
      logger.info('║                                              ║');
      logger.info('║  IP/UNIKIVI · FUNDECIT Edital Nº 1/2026     ║');
      logger.info('╚══════════════════════════════════════════════╝');
      logger.info('');
    });

  } catch (error) {
    logger.error('❌ Falha crítica ao iniciar servidor:', error.message);
    process.exit(1);
  }
}

process.on('SIGTERM', () => process.exit(0));
process.on('unhandledRejection', (r) => {
  logger.error('Unhandled rejection:', r);
});

startServer();
