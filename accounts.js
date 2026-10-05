const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const dataFile = process.env.AMABA_DATA_FILE || path.join(__dirname, 'data', 'conteudo.json');
const file = path.join(path.dirname(dataFile), 'usuarios.json');
function hash(password) { const salt = crypto.randomBytes(16).toString('hex'); return { salt, hash: crypto.scryptSync(password, salt, 64).toString('hex') }; }
function verify(password, user) { const actual = crypto.scryptSync(String(password), user.salt, 64); const expected = Buffer.from(user.hash, 'hex'); return expected.length === actual.length && crypto.timingSafeEqual(actual, expected); }
let bootstrap;
function read() {
  if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!bootstrap) {
    const password = process.env.AMABA_ADMIN_PASSWORD;
    if (!password || password.length < 12) throw new Error('Defina AMABA_ADMIN_PASSWORD com pelo menos 12 caracteres antes de iniciar.');
    bootstrap = [{ username: 'admin', role: 'admin', ...hash(password) }];
  }
  return bootstrap.map(user => ({ ...user }));
}
function save(users) { fs.mkdirSync(path.dirname(file), { recursive: true }); if (fs.existsSync(file)) fs.copyFileSync(file, file + '.bak'); fs.writeFileSync(file + '.tmp', JSON.stringify(users, null, 2)); fs.renameSync(file + '.tmp', file); }
module.exports = { read, save, hash, verify, file };
