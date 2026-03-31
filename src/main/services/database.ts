import { app } from 'electron'
import { join } from 'path'
import Database from 'better-sqlite3'
import { initializeDatabase } from '../db/schema'
import { DatabaseQueries } from '../db/queries'

let db: Database.Database | null = null
let queries: DatabaseQueries | null = null

export function getDatabase(): Database.Database {
  if (!db) {
    const dbPath = join(app.getPath('userData'), 'chatcontrol.db')
    db = new Database(dbPath)
    initializeDatabase(db)
  }
  return db
}

export function getQueries(): DatabaseQueries {
  if (!queries) {
    queries = new DatabaseQueries(getDatabase())
  }
  return queries
}

export function closeDatabase(): void {
  if (db) {
    db.close()
    db = null
    queries = null
  }
}
