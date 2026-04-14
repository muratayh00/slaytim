/* eslint-disable no-console */
require("dotenv").config();

const fs = require("fs");
const path = require("path");
const sqlite3 = require("sqlite3");
const { Client } = require("pg");

function quoteIdent(value) {
  return `"${String(value).replace(/"/g, "\"\"")}"`;
}

function normalizeEpochToDate(value) {
  const raw = typeof value === "string" ? value.trim() : value;
  if (raw === "" || raw === null || raw === undefined) return null;
  if (typeof raw === "number" && Number.isFinite(raw)) {
    if (raw > 10_000_000_000) return new Date(raw);
    if (raw > 0) return new Date(raw * 1000);
  }
  if (typeof raw === "string" && /^\d+$/.test(raw)) {
    const num = Number(raw);
    if (!Number.isNaN(num)) {
      if (num > 10_000_000_000) return new Date(num);
      if (num > 0) return new Date(num * 1000);
    }
  }
  return value;
}

function resolveSqlitePath(urlLike) {
  if (!urlLike) {
    return path.resolve(__dirname, "..", "prisma", "dev.db");
  }
  if (urlLike.startsWith("file:")) {
    return path.resolve(__dirname, "..", urlLike.replace(/^file:/, ""));
  }
  return path.resolve(urlLike);
}

function openSqlite(dbPath) {
  return new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY);
}

function sqliteAll(db, sql) {
  return new Promise((resolve, reject) => {
    db.all(sql, (err, rows) => {
      if (err) return reject(err);
      resolve(rows || []);
    });
  });
}

function sqliteClose(db) {
  return new Promise((resolve, reject) => {
    db.close((err) => {
      if (err) return reject(err);
      resolve();
    });
  });
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const resetTarget = process.argv.includes("--reset");

  const sqliteUrl = process.env.SQLITE_MIGRATION_URL || "file:./prisma/dev.db";
  const sqlitePath = resolveSqlitePath(sqliteUrl);
  const pgUrl = process.env.DATABASE_URL;

  if (!pgUrl || !pgUrl.startsWith("postgresql://")) {
    throw new Error("DATABASE_URL must be a PostgreSQL URL.");
  }
  if (!fs.existsSync(sqlitePath)) {
    throw new Error(`SQLite source DB not found: ${sqlitePath}`);
  }

  const sqlite = openSqlite(sqlitePath);
  const pg = new Client({ connectionString: pgUrl });
  await pg.connect();

  try {
    const sqliteTables = await sqliteAll(
      sqlite,
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name <> '_prisma_migrations' ORDER BY name"
    );
    const pgTablesResult = await pg.query(
      "SELECT tablename FROM pg_tables WHERE schemaname = 'public'"
    );
    const pgTableSet = new Set(pgTablesResult.rows.map((r) => r.tablename));

    const tables = sqliteTables
      .map((r) => r.name)
      .filter((name) => pgTableSet.has(name) && name !== "_prisma_migrations");

    if (tables.length === 0) {
      throw new Error("No common tables found between SQLite source and PostgreSQL target.");
    }

    console.log(`[migrate] source sqlite: ${sqlitePath}`);
    console.log(`[migrate] target postgres schema: public`);
    console.log(`[migrate] tables: ${tables.length}`);
    console.log(`[migrate] mode: ${dryRun ? "dry-run" : "write"}${resetTarget ? " + reset" : ""}`);

    if (dryRun) {
      for (const table of tables) {
        const countRows = await sqliteAll(sqlite, `SELECT COUNT(*) AS c FROM ${quoteIdent(table)}`);
        const count = countRows[0]?.c ?? 0;
        console.log(`[dry-run] ${table}: ${count} rows`);
      }
      return;
    }

    await pg.query("BEGIN");
    await pg.query("SET session_replication_role = replica");

    if (resetTarget) {
      const truncateTargets = tables.map(quoteIdent).join(", ");
      if (truncateTargets) {
        await pg.query(`TRUNCATE TABLE ${truncateTargets} RESTART IDENTITY CASCADE`);
      }
    }

    const stats = [];

    for (const table of tables) {
      const pragma = await sqliteAll(sqlite, `PRAGMA table_info(${quoteIdent(table)})`);
      const columns = pragma.map((c) => c.name);
      if (columns.length === 0) {
        stats.push({ table, rows: 0 });
        continue;
      }

      const columnMetaRes = await pg.query(
        `
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = $1
      `,
        [table]
      );
      const columnTypeMap = new Map(
        columnMetaRes.rows.map((r) => [r.column_name, String(r.data_type || "").toLowerCase()])
      );

      const selectColumns = columns.map(quoteIdent).join(", ");
      const rows = await sqliteAll(sqlite, `SELECT ${selectColumns} FROM ${quoteIdent(table)}`);
      if (rows.length === 0) {
        stats.push({ table, rows: 0 });
        continue;
      }

      const colSql = columns.map(quoteIdent).join(", ");
      const chunkSize = 500;
      let inserted = 0;

      for (let i = 0; i < rows.length; i += chunkSize) {
        const chunk = rows.slice(i, i + chunkSize);
        const params = [];
        const valuesSql = chunk
          .map((row, rowIdx) => {
            const placeholders = columns.map((col, colIdx) => {
              params.push(row[col]);
              const colType = columnTypeMap.get(col) || "";
              let value = row[col];
              if (value !== null && value !== undefined) {
                if (colType.includes("timestamp") || colType === "date") {
                  value = normalizeEpochToDate(value);
                } else if (colType === "boolean" && (value === 0 || value === 1 || value === "0" || value === "1")) {
                  value = value === 1 || value === "1";
                }
              }
              params[params.length - 1] = value;
              return `$${rowIdx * columns.length + colIdx + 1}`;
            });
            return `(${placeholders.join(", ")})`;
          })
          .join(", ");

        const sql = `INSERT INTO ${quoteIdent(table)} (${colSql}) VALUES ${valuesSql}`;
        await pg.query(sql, params);
        inserted += chunk.length;
      }

      stats.push({ table, rows: inserted });
      console.log(`[copy] ${table}: ${inserted} rows`);
    }

    for (const table of tables) {
      const hasId = await pg.query(
        `
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = $1
          AND column_name = 'id'
        LIMIT 1
      `,
        [table]
      );
      if (hasId.rowCount === 0) continue;

      const seqRes = await pg.query(
        `SELECT pg_get_serial_sequence($1, 'id') AS seq`,
        [`public.${table}`]
      );
      const seq = seqRes.rows[0]?.seq;
      if (!seq) continue;

      await pg.query(
        `SELECT setval($1, COALESCE((SELECT MAX(id) FROM ${quoteIdent(table)}), 1), (SELECT COUNT(*) > 0 FROM ${quoteIdent(table)}))`,
        [seq]
      );
    }

    await pg.query("SET session_replication_role = origin");
    await pg.query("COMMIT");

    const totalRows = stats.reduce((sum, s) => sum + s.rows, 0);
    console.log(`[done] ${stats.length} tables copied, ${totalRows} total rows.`);
  } catch (err) {
    try {
      await pg.query("ROLLBACK");
      await pg.query("SET session_replication_role = origin");
    } catch (_) {
      // ignore rollback cleanup errors
    }
    throw err;
  } finally {
    await sqliteClose(sqlite);
    await pg.end();
  }
}

main().catch((err) => {
  console.error("[migrate] failed:", err.message);
  process.exit(1);
});
