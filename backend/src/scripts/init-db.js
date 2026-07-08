'use strict';
require('dotenv').config();
const { sequelize } = require('../config/database');
require('../models/sql');

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason);
  process.exit(1);
});

// Colunas novas em tabelas existentes (idempotente — ADD COLUMN IF NOT EXISTS)
const PENDING_COLUMNS = [
  { table: 'users', column: 'expertise_areas', definition: "TEXT DEFAULT '[]'" },
  { table: 'users', column: 'mentor_bio',       definition: 'TEXT' },
  { table: 'projects', column: 'cover_url',     definition: 'TEXT' },
  { table: 'projects', column: 'demo_url',      definition: 'TEXT' },
  { table: 'projects', column: 'current_phase', definition: "VARCHAR(30) DEFAULT 'ideacao'" },
  { table: 'projects', column: 'incubation_score', definition: 'FLOAT DEFAULT 0' },
  { table: 'projects', column: 'views',         definition: 'INTEGER DEFAULT 0' },
];

async function addMissingColumns() {
  const qi = sequelize.getQueryInterface();
  for (const { table, column, definition } of PENDING_COLUMNS) {
    try {
      const desc = await qi.describeTable(table).catch(() => null);
      if (!desc) continue; // tabela não existe ainda — sync() vai criá-la
      if (desc[column]) { console.log(`↳ já existe: ${table}.${column}`); continue; }
      await sequelize.query(`ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS "${column}" ${definition};`);
      console.log(`✅ coluna adicionada: ${table}.${column}`);
    } catch (err) {
      console.warn(`⚠️  ${table}.${column}: ${err.message}`);
    }
  }
}

(async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Ligação à base de dados estabelecida');
    await sequelize.sync({ force: false });
    console.log('✅ Tabelas sincronizadas');
    await addMissingColumns();
    console.log('✅ Colunas verificadas');
    process.exit(0);
  } catch (err) {
    console.error('❌ Falha:', err?.message || err);
    process.exit(1);
  }
})();
