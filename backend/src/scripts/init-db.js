const { sequelize } = require("../config/database");
require("../models/sql");

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled rejection during DB initialization:", reason);
  process.exit(1);
});

(async () => {
  try {
    await sequelize.authenticate();
    await sequelize.sync({ alter: true });
    console.log("Tabelas criadas");
    process.exit(0);
  } catch (err) {
    console.error("❌ Falha ao inicializar o banco de dados");
    console.error(err && err.message ? err.message : err);
    if (err && err.stack) console.error(err.stack);
    process.exit(1);
  }
})();
