import sqlite3 from "sqlite3";
import { open } from "sqlite";

export async function openDb() {
  return open({
    filename: "./voicebridge.db",
    driver: sqlite3.Database
  });
}

export async function initDb() {
  const db = await openDb();

  //commands table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS commands (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      script_id TEXT UNIQUE
    );
  `);

  //recordings table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS recordings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      command_id INTEGER NOT NULL,
      version INTEGER NOT NULL,
      file_data BLOB NOT NULL,
      FOREIGN KEY (command_id) REFERENCES commands(id)
    );
  `);

  return db;
}
