const { sequelize } = require("../config/database");
require("../models/sql");

(async () => {
  await sequelize.authenticate();
  await sequelize.sync({ alter: true });
  console.log("Tabelas criadas");
  process.exit(0);
})();
