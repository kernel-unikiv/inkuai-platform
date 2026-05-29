'use strict';
require('dotenv').config();

async function run() {
  const { User } = require('../models/sql/index');
  const users = [
    { name:'Administrador INKU·AI',  email:'admin@inkuai.ao',             password:'Admin@12345',   role:'admin' },
    { name:'Mestre Nkanga Pedro',    email:'nkanga.pedro@ip.unikivi.ao',  password:'Mentor@12345',  role:'mentor' },
    { name:'Estudante Demo',         email:'estudante@ip.unikivi.ao',     password:'Student@12345', role:'student' },
  ];
  for (const u of users) {
    const existing = await User.findOne({ where: { email: u.email } });
    if (!existing) {
      await User.create({ name:u.name, email:u.email, password_hash:u.password,
        role:u.role, institution:'IP/UNIKIVI', is_verified:true, is_active:true });
      console.log(`✅ Criado: ${u.email} (${u.role})`);
    } else {
      console.log(`ℹ️  Já existe: ${u.email}`);
    }
  }
}

module.exports = { run };

// Execução directa: node src/seeders/admin.seeder.js
if (require.main === module) {
  (async () => {
    try {
      const { sequelize } = require('../config/database');
      const connectMongoDB = require('../config/mongodb');
      await sequelize.authenticate();
      await sequelize.sync({ alter: true });
      await connectMongoDB();

      console.log('\n╔══════════════════════════════════════╗');
      console.log('║   INKU·AI — Criar dados iniciais     ║');
      console.log('╚══════════════════════════════════════╝\n');

      await run();

      console.log('\n╔════════════════════════════════════════════════════╗');
      console.log('║             CONTAS CRIADAS COM SUCESSO!            ║');
      console.log('╠════════════════════════════════════════════════════╣');
      console.log('║  Admin:      admin@inkuai.ao        Admin@12345   ║');
      console.log('║  Mentor:     nkanga.pedro@ip.unikivi.ao           ║');
      console.log('║              password: Mentor@12345               ║');
      console.log('║  Estudante:  estudante@ip.unikivi.ao Student@12345║');
      console.log('╚════════════════════════════════════════════════════╝\n');
      process.exit(0);
    } catch (err) {
      console.error('❌ Seed falhou:', err.message);
      if (err.message.includes('DATABASE_URL')) {
        console.error('   Configure DATABASE_URL no ficheiro .env');
        console.error('   Veja GUIA_DEPLOY.md para obter PostgreSQL gratuito');
      }
      process.exit(1);
    }
  })();
}
