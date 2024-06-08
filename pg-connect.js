const { PG_PASSWORD } = process.env;
const { Client } = require("pg");

const client = new Client({
  database: "nhanify",
  password: `${PG_PASSWORD}`,
});

async function connectDb() {
  try {
    await client.connect();
    console.log("Database connected successfully");
  } catch (error) {
    console.error("Database connection failed:", err.stack);
  }
}

connectDb();

module.exports = client;
