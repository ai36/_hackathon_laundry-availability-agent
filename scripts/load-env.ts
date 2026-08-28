// Side-effect module: load `.env` (see .env.example) before anything reads process.env.
// A missing file is fine — `--replay` needs no key.
try {
  process.loadEnvFile(".env");
} catch {
  /* no .env file */
}
