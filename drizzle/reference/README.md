# Reference SQL

These files are **not** migrations. They are kept for reference only and are
never read by `db/migrate.ts` or `drizzle-kit`, because only the entries in
`../meta/_journal.json` are applied.

- `0014_schema_enhancements.sql` — proposed (unadopted) columns for conditional
  rule filtering and canvas checksums. To adopt it, add the columns to
  `db/schema.ts`, then run `pnpm db:generate` so Drizzle produces a journaled
  migration.
- `0015_wal_mode_pragmas.sql` — notes on SQLite PRAGMAs. The PRAGMAs that are
  actually used are applied at connection time in `db/index.ts`.

Future migrations belong in `drizzle/` with a matching journal entry; do not add
numbered `.sql` files to that folder by hand.
