'use strict';
require('dotenv').config();
const { sequelize } = require('../config/database');
require('../models/sql');

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection during DB initialization:', reason);
  process.exit(1);
});

// Colunas que podem faltar em tabelas já existentes em produção.
// Adicionadas via ALTER TABLE ... ADD COLUMN IF NOT EXISTS (idempotente e seguro).
const PENDING_COLUMNS = [
  { table: 'users', column: 'expertise_areas', definition: "TEXT DEFAULT '[]'" },
  { table: 'users', column: 'mentor_bio',      definition: 'TEXT' },
];

async function addMissingColumns() {
  const qi = sequelize.getQueryInterface();
  const dialect = sequelize.getDialect();

  for (const { table, column, definition } of PENDING_COLUMNS) {
    try {
      const tableDesc = await qi.describeTable(table).catch(() => null);
      if (!tableDesc) {
        // Tabela ainda não existe — será criada pelo sync() abaixo, já com a coluna.
        continue;
      }
      if (tableDesc[column]) {
        console.log(`↳ Coluna já existe: ${table}.${column}`);
        continue;
      }
      if (dialect === 'postgres') {
        await sequelize.query(`ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS "${column}" ${definition};`);
      } else {
        // SQLite / outros: usar addColumn do Sequelize
        await qi.addColumn(table, column, { type: sequelize.Sequelize.TEXT, defaultValue: null });
      }
      console.log(`✅ Coluna adicionada: ${table}.${column}`);
    } catch (err) {
      console.warn(`⚠️  Não foi possível adicionar ${table}.${column}: ${err.message}`);
    }
  }
}

(async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Ligação à base de dados estabelecida');

    // 1) Cria tabelas que ainda não existem (sem tocar nas existentes)
    await sequelize.sync({ force: false });
    console.log('✅ Tabelas sincronizadas (novas criadas, existentes mantidas)');

    // 2) Adiciona colunas novas em tabelas já existentes (idempotente)
    await addMissingColumns();
    console.log('✅ Colunas em falta verificadas/adicionadas');

    process.exit(0);
  } catch (err) {
    console.error('❌ Falha ao inicializar o banco de dados');
    console.error(err?.message || err);
    process.exit(1);
  }
})();
