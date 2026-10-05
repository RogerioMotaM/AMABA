const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
function restore(source, target) {
  const text = fs.readFileSync(source, 'utf8');
  const data = JSON.parse(text);
  for (const collection of ['publicacoes','projetos','parceiros']) {
    if (!Array.isArray(data[collection]) || data[collection].some(item => !item || typeof item.id !== 'string' || typeof item.publicado !== 'boolean')) throw new Error('Backup inválido. Nenhum arquivo foi alterado.');
  }
  fs.mkdirSync(path.dirname(target), { recursive: true });
  if (fs.existsSync(target)) fs.copyFileSync(target, target + `.antes-restauracao-${crypto.randomUUID()}.json`);
  fs.writeFileSync(target + '.tmp', JSON.stringify(data, null, 2)); fs.renameSync(target + '.tmp', target);
}
if (require.main === module) {
  if (!process.argv[2]) throw new Error('Uso: node scripts/restore.js caminho-do-backup.json (com o servidor parado)');
  restore(path.resolve(process.argv[2]), process.env.AMABA_DATA_FILE || path.join(__dirname, '..', 'data', 'conteudo.json'));
  console.log('Conteúdo restaurado. Uma cópia do estado anterior foi preservada.');
}
module.exports = restore;
