'use strict';
const bcrypt = require('bcryptjs');

async function seed() {
  try {
    const { sequelize } = require('../config/database');
    await sequelize.authenticate();
    console.log('✅ Base de dados conectada');

    // Sync todos os modelos (cria tabelas se não existem)
    await sequelize.sync({ alter: true });
    console.log('✅ Tabelas sincronizadas (novas: messages, approvers, admin_actions)');

    const { User } = require('../models/sql/index');
    const hash = await bcrypt.hash('Admin@12345', 10);

    // Admin
    const [admin, cAdmin] = await User.findOrCreate({
      where: { email: 'admin@inkuai.ao' },
      defaults: {
        name: 'Administrador INKU·AI',
        email: 'admin@inkuai.ao',
        password_hash: hash,
        role: 'admin',
        institution: 'IP/UNIKIVI',
        is_verified: true,
        is_active: true,
        bio: 'Administrador da plataforma INKU·AI'
      }
    });
    console.log(`${cAdmin ? '✅ Criado' : '⚠️  Já existe'}: admin@inkuai.ao / Admin@12345`);

    // Mentor
    const hashM = await bcrypt.hash('Mentor@12345', 10);
    const [, cMentor] = await User.findOrCreate({
      where: { email: 'nkanga.pedro@ip.unikivi.ao' },
      defaults: {
        name: 'Nkanga Pedro',
        email: 'nkanga.pedro@ip.unikivi.ao',
        password_hash: hashM,
        role: 'mentor',
        institution: 'IP/UNIKIVI',
        is_verified: true,
        is_active: true,
        bio: 'Docente responsável — Data Science & AI-Based Decision Making'
      }
    });
    console.log(`${cMentor ? '✅ Criado' : '⚠️  Já existe'}: nkanga.pedro@ip.unikivi.ao / Mentor@12345`);

    // Estudante
    const hashE = await bcrypt.hash('Student@12345', 10);
    const [, cStudent] = await User.findOrCreate({
      where: { email: 'estudante@ip.unikivi.ao' },
      defaults: {
        name: 'Estudante Exemplo',
        email: 'estudante@ip.unikivi.ao',
        password_hash: hashE,
        role: 'student',
        institution: 'IP/UNIKIVI',
        is_verified: true,
        is_active: true
      }
    });
    console.log(`${cStudent ? '✅ Criado' : '⚠️  Já existe'}: estudante@ip.unikivi.ao / Student@12345`);

    console.log('\n🚀 INKU·AI — Seeder concluído com sucesso!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  Admin   : admin@inkuai.ao / Admin@12345');
    console.log('  Mentor  : nkanga.pedro@ip.unikivi.ao / Mentor@12345');
    console.log('  Estudante: estudante@ip.unikivi.ao / Student@12345');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    process.exit(0);
  } catch(err) {
    console.error('❌ Erro no seeder:', err.message);
    process.exit(1);
  }
}

seed();
