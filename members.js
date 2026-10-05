const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const accounts = require('./accounts');
const sessions = new Map(), attempts = new Map();
const file = path.join(path.dirname(process.env.AMABA_DATA_FILE || path.join(__dirname, 'data', 'conteudo.json')), 'familias.json');
const save = users => { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file + '.tmp', JSON.stringify(users, null, 2)); fs.renameSync(file + '.tmp', file); };
const read = () => {
  const users = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : [];
  let changed = false;
  for (const user of users) if (user.acolhimento && Date.parse(user.acolhimento.expiraEm) <= Date.now()) { delete user.acolhimento; changed = true; }
  if (changed) save(users);
  return users;
};
const profile = user => ({ nome: user.nome, email: user.email, perfil: user.perfil });
const dummy = accounts.hash(crypto.randomBytes(32).toString('hex'));
setInterval(() => {
  for (const [key, value] of sessions) if (value.expires < Date.now()) sessions.delete(key);
  for (const [key, value] of attempts) if (value.until < Date.now()) attempts.delete(key);
}, 60000).unref();
module.exports = async function members(req, res, url, body, json) {
  const route = url.pathname;
  const token = /(?:^|;\s*)amaba_familia=([a-f0-9]+)/.exec(req.headers.cookie || '')?.[1];
  const session = sessions.get(token);
  const user = session && session.expires > Date.now() ? read().find(u => u.id === session.id) : null;
  const cookie = value => res.setHeader('Set-Cookie', `amaba_familia=${value}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${value ? 28800 : 0}${process.env.AMABA_SECURE_COOKIE === '1' ? '; Secure' : ''}`);
  if (route === '/api/familias/session' && req.method === 'GET') return json(res, user ? 200 : 401, user ? { ...profile(user), csrf: session.csrf } : { erro: 'Entre para acessar sua conta.' });
  if (route === '/api/familias/acolhimento') {
    if (!user) return json(res, 401, { erro: 'Entre para preencher seu formulário.' });
    if (req.method === 'GET') return json(res, 200, { conta: profile(user), csrf: session.csrf, acolhimento: user.acolhimento || null });
    if (!['PUT', 'DELETE'].includes(req.method)) return json(res, 405, { erro: 'Método não permitido.' });
    if (req.headers['x-csrf-token'] !== session.csrf) return json(res, 403, { erro: 'Sessão inválida. Entre novamente.' });
    const input = req.method === 'PUT' ? await body(req, 5000) : null;
    let record;
    if (input) {
      const allowed = ['cidade', 'uf', 'telefone', 'canal', 'interesses', 'consentimento', 'maioridade'];
      const interests = ['acolhimento', 'informacoes', 'atividades', 'rede'];
      if (typeof input !== 'object' || Array.isArray(input) || Object.keys(input).some(key => !allowed.includes(key)) || input.consentimento !== true || input.maioridade !== true) return json(res, 400, { erro: 'Confirme sua maioridade e a autorização específica para este formulário. Envie apenas os campos solicitados.' });
      const cidade = typeof input.cidade === 'string' ? input.cidade.trim() : '';
      const uf = typeof input.uf === 'string' ? input.uf : '';
      const telefone = typeof input.telefone === 'string' ? input.telefone.replace(/[ ()+-]/g, '') : '';
      if (cidade.length > 80 || (cidade && !/^[\p{L}\s.'-]+$/u.test(cidade)) || (uf && !['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'].includes(uf)) || (telefone && !/^(?:55)?\d{10,11}$/.test(telefone)) || !['email', 'telefone', 'whatsapp'].includes(input.canal) || (input.canal !== 'email' && !telefone) || !Array.isArray(input.interesses) || input.interesses.length > 4 || input.interesses.some(value => !interests.includes(value))) return json(res, 400, { erro: 'Confira a cidade, o estado, o telefone e as opções selecionadas.' });
      const now = new Date();
      record = { cidade, uf, telefone, canal: input.canal, interesses: [...new Set(input.interesses)], consentimento: { versao: 'acolhimento-2026-10-04', finalidade: 'Organizar o primeiro acolhimento e entrar em contato pelo canal escolhido.', aceitoEm: now.toISOString(), maioridade: true }, atualizadoEm: now.toISOString(), expiraEm: new Date(now.getTime() + 180 * 86400000).toISOString() };
    } else if (req.method === 'PUT') return json(res, 400, { erro: 'Informe os dados do formulário.' });
    const users = read(), member = users.find(u => u.id === user.id);
    if (record) member.acolhimento = record; else delete member.acolhimento;
    save(users);
    return json(res, 200, { acolhimento: record || null, ok: true });
  }
  if (route === '/api/familias/logout' && req.method === 'POST') {
    if (!user) return json(res, 401, { erro: 'Entre para acessar sua conta.' });
    if (req.headers['x-csrf-token'] !== session.csrf) return json(res, 403, { erro: 'Sessão inválida. Entre novamente.' });
    sessions.delete(token); cookie(''); return json(res, 200, { ok: true });
  }
  if (!['/api/familias/login', '/api/familias/cadastro'].includes(route)) return json(res, 404, { erro: 'Rota não encontrada.' });
  if (req.method !== 'POST') return json(res, 405, { erro: 'Método não permitido.' });
  const ip = req.socket.remoteAddress;
  const entry = attempts.get(ip) || { count: 0, until: Date.now() + 900000 };
  if (entry.until < Date.now()) { entry.count = 0; entry.until = Date.now() + 900000; }
  if (entry.count >= 10) return json(res, 429, { erro: 'Aguarde 15 minutos para tentar novamente.' });
  entry.count++; attempts.set(ip, entry);
  const input = await body(req, 10000);
  if (!input || typeof input !== 'object') return json(res, 400, { erro: 'Informe seus dados.' });
  const email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : '';
  const senha = input.senha;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || typeof senha !== 'string' || senha.length > 200) return json(res, 400, { erro: 'Informe um e-mail e uma senha válidos.' });
  const users = read();
  let member = users.find(u => u.email === email);
  if (route.endsWith('/cadastro')) {
    const nome = typeof input.nome === 'string' ? input.nome.trim() : '';
    if (nome.length < 2 || nome.length > 100 || !['mae', 'cuidadora', 'mae-cuidadora'].includes(input.perfil) || senha.length < 12 || input.consentimento !== true) return json(res, 400, { erro: 'Informe seu nome, perfil, uma senha de pelo menos 12 caracteres e aceite os termos e a política de privacidade.' });
    if (member) return json(res, 409, { erro: 'Não foi possível criar a conta com este e-mail. Tente entrar ou fale com a AMABA.' });
    member = { id: crypto.randomUUID(), nome, email, perfil: input.perfil, criadoEm: new Date().toISOString(), consentimentoEm: new Date().toISOString(), ...accounts.hash(senha) };
    users.push(member); fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file + '.tmp', JSON.stringify(users, null, 2)); fs.renameSync(file + '.tmp', file);
  } else {
    const valid = accounts.verify(senha, member || dummy);
    if (!member || !valid) return json(res, 401, { erro: 'E-mail ou senha incorretos.' });
  }
  if (token) sessions.delete(token);
  const next = crypto.randomBytes(32).toString('hex'), csrf = crypto.randomBytes(24).toString('hex');
  sessions.set(next, { id: member.id, csrf, expires: Date.now() + 28800000 }); cookie(next);
  return json(res, route.endsWith('/cadastro') ? 201 : 200, { ...profile(member), csrf });
};
