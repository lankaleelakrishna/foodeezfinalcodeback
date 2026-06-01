const fs = require('fs');
const { Client } = require('pg');
const envText = fs.readFileSync('.env', 'utf8');
const env = {};
envText.split('\n').forEach(line => {
  const t = line.trim();
  if (!t || t.startsWith('#')) return;
  const idx = line.indexOf('=');
  env[line.slice(0, idx)] = line.slice(idx + 1).replace(/^"|"$/g, '');
});
const client = new Client({ connectionString: env.DATABASE_URL });
client.connect()
  .then(() => client.query("SELECT table_name, column_name, data_type FROM information_schema.columns WHERE table_name='Document' ORDER BY ordinal_position;"))
  .then(res => {
    console.log(JSON.stringify(res.rows, null, 2));
    return client.end();
  })
  .catch(e => {
    console.error(e);
    process.exit(1);
  });
