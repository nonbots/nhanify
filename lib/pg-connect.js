const { PG_PASSWORD, PG_DATABASE, PG_USER } = process.env;
const { Client } = require("pg");

const client = new Client({
  database: PG_DATABASE,
  password: PG_PASSWORD,
  user: PG_USER
});

async function connectDb() {
  try {
    await client.connect();
    console.log("Database connected successfully");
  } catch (error) {
    console.error("Database connection failed:", error.stack);
  }
}

connectDb();

module.exports = client;
