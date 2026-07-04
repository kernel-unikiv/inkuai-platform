'use strict';
require('dotenv').config();
const { sequelize } = require('../config/database');
require('../models/sql');

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection during DB initialization:', reason);
  process.exit(1);
});

(async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Ligação à base de dados estabelecida');

    // Usar sync sem alter — cria tabelas novas, não toca nas existentes
    // Isto evita o erro de ALTER COLUMN com REFERENCES inline no PostgreSQL
    await sequelize.sync({ force: false });
    console.log('✅ Tabelas sincronizadas (novas criadas, existentes mantidas)');
    process.exit(0);
  } catch (err) {
    console.error('❌ Falha ao inicializar o banco de dados');
    console.error(err?.message || err);
    process.exit(1);
  }
})();
