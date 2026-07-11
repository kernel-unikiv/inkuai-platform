'use strict';
require('dotenv').config();
const { sequelize } = require('../config/database');
require('../models/sql');

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason);
  process.exit(1);
});

// Colunas novas em tabelas existentes — idempotente (ADD COLUMN IF NOT EXISTS)
const PENDING_COLUMNS = [
  // users
  { table: 'users', column: 'expertise_areas',  definition: "TEXT DEFAULT '[]'" },
  { table: 'users', column: 'mentor_bio',        definition: 'TEXT' },
  { table: 'users', column: 'linkedin_url',      definition: 'TEXT' },
  { table: 'users', column: 'website_url',       definition: 'TEXT' },
  { table: 'users', column: 'location',          definition: 'VARCHAR(100)' },
  { table: 'users', column: 'portfolio_url',     definition: 'TEXT' },
  { table: 'users', column: 'skills_json',       definition: "TEXT DEFAULT '[]'" },
  { table: 'users', column: 'avatar_url',        definition: 'TEXT' },
  // projects
  { table: 'projects', column: 'cover_url',        definition: 'TEXT' },
  { table: 'projects', column: 'logo_url',         definition: 'TEXT' },
  { table: 'projects', column: 'gallery_json',     definition: "TEXT DEFAULT '[]'" },
  { table: 'projects', column: 'video_url',        definition: 'TEXT' },
  { table: 'projects', column: 'demo_url',         definition: 'TEXT' },
  { table: 'projects', column: 'docs_url',         definition: 'TEXT' },
  { table: 'projects', column: 'current_phase',    definition: "VARCHAR(30) DEFAULT 'ideacao'" },
  { table: 'projects', column: 'incubation_score', definition: 'FLOAT DEFAULT 0' },
  { table: 'projects', column: 'views',            definition: 'INTEGER DEFAULT 0' },
  { table: 'projects', column: 'likes',            definition: 'INTEGER DEFAULT 0' },
  { table: 'projects', column: 'downloads',        definition: 'INTEGER DEFAULT 0' },
  { table: 'projects', column: 'avg_stars',        definition: 'FLOAT DEFAULT 0' },
  { table: 'projects', column: 'eval_count',       definition: 'INTEGER DEFAULT 0' },
  // evaluations
  { table: 'evaluations', column: 'stars',               definition: 'INTEGER DEFAULT 0' },
  { table: 'evaluations', column: 'innovation_score',    definition: 'INTEGER DEFAULT 0' },
  { table: 'evaluations', column: 'viability_score',     definition: 'INTEGER DEFAULT 0' },
  { table: 'evaluations', column: 'impact_score',        definition: 'INTEGER DEFAULT 0' },
  { table: 'evaluations', column: 'presentation_score',  definition: 'INTEGER DEFAULT 0' },
];

async function addMissingColumns() {
  const qi = sequelize.getQueryInterface();
  for (const { table, column, definition } of PENDING_COLUMNS) {
    try {
      const desc = await qi.describeTable(table).catch(() => null);
      if (!desc) continue;
      if (desc[column]) { continue; }
      await sequelize.query(`ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS "${column}" ${definition};`);
      console.log(`  ✅ ${table}.${column} adicionada`);
    } catch (err) {
      console.warn(`  ⚠️  ${table}.${column}: ${err.message}`);
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
