import express from "express";
import cors from "cors";
import sqlite3 from "sqlite3";
import { open } from "sqlite";

const app = express();
app.use(cors());
app.use(express.json({ limit: "50mb" }));

//database connection
let db;

//initialize database tables
async function initDb() {
  console.log("✅ Database start");

  db = await open({
    filename: "./voicebridge.db",
    driver: sqlite3.Database,
  });

  //create commands table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS commands (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      script_id TEXT UNIQUE
    );
  `);

  //create recordings table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS recordings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      command_id INTEGER NOT NULL,
      version INTEGER NOT NULL,
      file_data BLOB NOT NULL,
      FOREIGN KEY (command_id) REFERENCES commands(id)
    );
  `);
}

await initDb();

//get all recordings with command titles
app.get("/recordings", async (req, res) => {
  const rows = await db.all(`
    SELECT r.id, r.version, r.file_data, c.title
    FROM recordings r
    JOIN commands c ON r.command_id = c.id
    ORDER BY c.id, r.version;
  `);
  res.json(rows);
});

//save 10 recordings for a command
app.post("/recordings/batch", async (req, res) => {
  const { title, recordings, scriptId } = req.body;

  if (!title || !recordings || recordings.length !== 10) {
    return res.status(400).send("Must provide 10 recordings and a title.");
  }

  //create new command
  const cmd = await db.run("INSERT INTO commands (title, script_id) VALUES (?, ?)", 
      [title, scriptId || null]);
  const commandId = cmd.lastID;

  //save all 10 recordings
  for (const rec of recordings) {
    const buffer = Buffer.from(rec.file_base64, "base64");
    await db.run(
      "INSERT INTO recordings (command_id, version, file_data) VALUES (?, ?, ?)",
      [commandId, rec.version, buffer]
    );
  }

  res.json({ success: true });
});

//check if command already exists
app.post("/commands/check", async (req, res) => {
  const { title } = req.body;

  if (!title) return res.json({ exists: false });

  const row = await db.get("SELECT * FROM commands WHERE title = ?", [title]);

  if (row) {
    return res.json({ exists: true });
  }

  return res.json({ exists: false });
});

//check if script ID already exists
app.post("/commands/check-script", async (req, res) => {
  const { scriptId } = req.body;

  if (!scriptId) return res.json({ exists: false });

  const row = await db.get("SELECT * FROM commands WHERE script_id = ?", [scriptId]);
  return res.json({ exists: !!row });
});

//delete command and all its recordings
app.delete("/recordings/title/:title", async (req, res) => {
  const { title } = req.params;

  //find command by title
  const cmd = await db.get("SELECT * FROM commands WHERE title = ?", [title]);
  if (!cmd) return res.json({ success: true });

  //delete recordings first then command
  await db.run("DELETE FROM recordings WHERE command_id = ?", [cmd.id]);
  await db.run("DELETE FROM commands WHERE id = ?", [cmd.id]);

  res.json({ success: true });
});

app.listen(3001, () => console.log("Server running on port 3001"));