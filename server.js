const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { renderDetail, renderListing, escape } = require('./public-view');
const accounts = require('./accounts');
const members = require('./members');
const root = __dirname;
const file = process.env.AMABA_DATA_FILE || path.join(root, 'data', 'conteudo.json');
accounts.read();
const sessions = new Map();
const attempts = new Map();
const collections = ['publicacoes', 'projetos', 'parceiros'];
function audit(user, action, collection, id) {
  const dir = path.dirname(file); fs.mkdirSync(dir, { recursive: true });
  fs.appendFileSync(path.join(dir, 'auditoria.ndjson'), JSON.stringify({ data: new Date().toISOString(), usuario: user, acao: action, colecao: collection, id }) + '\n');
}
setInterval(() => { for (const [key, value] of sessions) if (value.expires < Date.now()) sessions.delete(key); for (const [key, value] of attempts) if (value.until < Date.now()) attempts.delete(key); }, 60000).unref();
function read() { return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : Object.fromEntries(collections.map(k => [k, []])); }
function save(data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  if (fs.existsSync(file)) {
    const dir = path.join(path.dirname(file), 'backups');
    fs.mkdirSync(dir, { recursive: true });
    fs.copyFileSync(file, path.join(dir, `${Date.now()}-${crypto.randomUUID()}.json`));
    const backups = fs.readdirSync(dir).filter(name => name.endsWith('.json')).sort();
    for (const name of backups.slice(0, Math.max(0, backups.length - 30))) fs.unlinkSync(path.join(dir, name));
  }
  fs.writeFileSync(file + '.tmp', JSON.stringify(data, null, 2));
  fs.renameSync(file + '.tmp', file);
}
function validDate(value) { return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value + 'T12:00:00Z').toISOString().slice(0, 10) === value; }
function json(res, status, value) { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(value)); }
async function body(req, limit = 150000) { let text = ''; for await (const chunk of req) { text += chunk; if (Buffer.byteLength(text) > limit) throw new Error('Conteúdo muito grande.'); } return JSON.parse(text || '{}'); }
function session(req) { const token = /(?:^|;\s*)amaba_session=([a-f0-9]+)/.exec(req.headers.cookie || '')?.[1]; const value = sessions.get(token); if (!value || value.expires < Date.now()) { sessions.delete(token); return null; } const user = accounts.read().find(u => u.username === value.username); if (!user) { sessions.delete(token); return null; } return { ...value, role: user.role, token }; }
function validate(value, collection) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Informe dados válidos para o cadastro.');
  const item = {};
  item.revisao = Number.isInteger(value.revisao) ? value.revisao : 0;
  for (const key of ['titulo', 'resumo', 'data', 'tipo', 'imagem', 'imagemAlt', 'local', 'horario', 'dataEvento', 'horaEvento', 'nome', 'url']) item[key] = typeof value[key] === 'string' ? value[key].trim().slice(0, key === 'resumo' ? 2000 : 500) : '';
  item.publicado = value.publicado === true;
  item.paragrafos = Array.isArray(value.paragrafos) ? value.paragrafos.slice(0, 100).map(p => String(p).slice(0, 10000)) : [];
  if (!(collection === 'parceiros' ? item.nome : item.titulo)) throw new Error('Informe o título ou nome.');
  if (item.imagem && !/^(assets\/[^?#]+|https:\/\/[^\s]+)$/.test(item.imagem)) throw new Error('Use uma imagem de assets/ ou um endereço HTTPS.');
  if (item.url && !/^https:\/\/[^\s]+$/.test(item.url)) throw new Error('O link deve começar com https://.');
  if (collection === 'publicacoes' && (!['noticia', 'evento'].includes(item.tipo) || !validDate(item.data))) throw new Error('Informe um tipo e uma data válidos.');
  if (item.tipo === 'evento' && item.dataEvento && !validDate(item.dataEvento)) throw new Error('Informe uma data válida para o evento.');
  if (item.tipo === 'evento' && item.horaEvento && !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(item.horaEvento)) throw new Error('Informe um horário válido.');
  if (collection === 'publicacoes' && item.tipo === 'evento' && item.publicado && !item.dataEvento) throw new Error('Informe a data do evento antes de publicar.');
  if (item.imagem.startsWith('assets/')) {
    const target = path.resolve(root, decodeURIComponent(item.imagem));
    if (!target.startsWith(path.join(root, 'assets') + path.sep) || !fs.existsSync(target) || !/\.(jpg|jpeg|png|webp)$/i.test(target)) throw new Error('Use uma imagem existente na pasta assets.');
  }
  return item;
}
const server = http.createServer(async (req, res) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'same-origin');
  try {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname.startsWith('/api/')) {
      if (!['GET', 'HEAD'].includes(req.method) && (req.headers['sec-fetch-site'] === 'cross-site' || (req.headers.origin && new URL(req.headers.origin).host !== req.headers.host))) return json(res, 403, { erro: 'Origem não permitida.' });
      if (url.pathname.startsWith('/api/familias/')) return await members(req, res, url, body, json);
      if (url.pathname === '/api/login' && req.method === 'POST') {
        const ip = req.socket.remoteAddress;
        const entry = attempts.get(ip) || { count: 0, until: Date.now() + 900000 };
        if (entry.until < Date.now()) { entry.count = 0; entry.until = Date.now() + 900000; }
        if (entry.count >= 10) return json(res, 429, { erro: 'Aguarde 15 minutos para tentar novamente.' });
        entry.count++; attempts.set(ip, entry);
        const input = await body(req);
        const users = accounts.read();
        const user = users.find(u => u.username === (input.usuario || 'admin'));
        const valid = accounts.verify(String(input.senha || ''), user || users[0]);
        if (!user || !valid) return json(res, 401, { erro: 'Usuário ou senha incorretos.' });
        entry.count = Math.max(0, entry.count - 1);
        const token = crypto.randomBytes(32).toString('hex'), csrf = crypto.randomBytes(24).toString('hex');
        sessions.set(token, { csrf, username: user.username, expires: Date.now() + 28800000 });
        res.setHeader('Set-Cookie', `amaba_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800${process.env.AMABA_SECURE_COOKIE === '1' ? '; Secure' : ''}`);
        return json(res, 200, { csrf, usuario: user.username, role: user.role });
      }
      if (url.pathname === '/api/conteudo' && req.method === 'GET') { const data = read(); return json(res, 200, Object.fromEntries(collections.map(k => [k, data[k].filter(p => p.publicado)]))); }
      const auth = session(req);
      if (!auth) return json(res, 401, { erro: 'Entre na área administrativa.' });
      if (url.pathname === '/api/session' && req.method === 'GET') return json(res, 200, { csrf: auth.csrf, usuario: auth.username, role: auth.role });
      if (url.pathname === '/api/admin/conteudo' && req.method === 'GET') return json(res, 200, read());
      if (url.pathname === '/api/admin/usuarios' && req.method === 'GET') {
        if (auth.role !== 'admin') return json(res, 403, { erro: 'Somente administradores gerenciam usuários.' });
        return json(res, 200, accounts.read().map(({ username, role }) => ({ username, role })));
      }
      if (url.pathname === '/api/admin/auditoria' && req.method === 'GET') {
        if (auth.role !== 'admin') return json(res, 403, { erro: 'Somente administradores consultam o histórico.' });
        const log = path.join(path.dirname(file), 'auditoria.ndjson');
        return json(res, 200, fs.existsSync(log) ? fs.readFileSync(log, 'utf8').trim().split('\n').slice(-100).filter(Boolean).map(line => JSON.parse(line)) : []);
      }
      if (req.headers['x-csrf-token'] !== auth.csrf) return json(res, 403, { erro: 'Sessão inválida. Entre novamente.' });
      if (url.pathname === '/api/admin/usuarios' && req.method === 'POST') {
        if (auth.role !== 'admin') return json(res, 403, { erro: 'Somente administradores gerenciam usuários.' });
        const input = await body(req);
        if (!/^[a-z0-9._-]{3,40}$/.test(input.usuario || '') || !['admin', 'editor'].includes(input.role) || typeof input.senha !== 'string' || input.senha.length < 12 || input.senha.length > 200) throw new Error('Informe usuário válido e senha de 12 a 200 caracteres.');
        const users = accounts.read();
        if (users.some(u => u.username === input.usuario)) throw new Error('Informe outro usuário: este nome já existe.');
        users.push({ username: input.usuario, role: input.role, ...accounts.hash(input.senha) }); accounts.save(users); audit(auth.username, 'criar', 'usuarios', input.usuario);
        return json(res, 201, { ok: true });
      }
      const userDelete = /^\/api\/admin\/usuarios\/([a-z0-9._-]+)$/.exec(url.pathname);
      if (userDelete && req.method === 'DELETE') {
        if (auth.role !== 'admin') return json(res, 403, { erro: 'Somente administradores gerenciam usuários.' });
        if (userDelete[1] === auth.username) throw new Error('Informe outro usuário: você não pode excluir seu próprio acesso.');
        const users = accounts.read();
        if (!users.some(u => u.username === userDelete[1])) return json(res, 404, { erro: 'Usuário não encontrado.' });
        accounts.save(users.filter(u => u.username !== userDelete[1]));
        for (const [token, value] of sessions) if (value.username === userDelete[1]) sessions.delete(token);
        audit(auth.username, 'excluir', 'usuarios', userDelete[1]); return json(res, 200, { ok: true });
      }
      if (url.pathname === '/api/admin/senha' && req.method === 'POST') {
        const input = await body(req); const users = accounts.read(), user = users.find(u => u.username === auth.username);
        if (!accounts.verify(String(input.atual || ''), user) || typeof input.nova !== 'string' || input.nova.length < 12 || input.nova.length > 200) throw new Error('Informe a senha atual e uma nova senha de 12 a 200 caracteres.');
        Object.assign(user, accounts.hash(input.nova)); accounts.save(users);
        for (const [token, value] of sessions) if (value.username === auth.username && token !== auth.token) sessions.delete(token);
        audit(auth.username, 'alterar-senha', 'usuarios', auth.username); return json(res, 200, { ok: true });
      }
      if (url.pathname === '/api/logout' && req.method === 'POST') { sessions.delete(auth.token); res.setHeader('Set-Cookie', 'amaba_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0'); return json(res, 200, { ok: true }); }
      if (url.pathname === '/api/admin/upload' && req.method === 'POST') {
        const input = await body(req, 4000000);
        if (typeof input.imagem !== 'string' || !/^data:image\/webp;base64,[A-Za-z0-9+/=]+$/.test(input.imagem)) throw new Error('Use uma imagem WebP válida.');
        const buffer = Buffer.from(input.imagem.split(',')[1], 'base64');
        if (buffer.length < 20 || buffer.toString('ascii', 0, 4) !== 'RIFF' || buffer.toString('ascii', 8, 12) !== 'WEBP') throw new Error('Use uma imagem WebP válida.');
        const filename = `upload-${crypto.randomUUID()}.webp`;
        fs.writeFileSync(path.join(root, 'assets', filename), buffer, { flag: 'wx' });
        return json(res, 201, { path: `assets/${filename}` });
      }
      const match = /^\/api\/admin\/(publicacoes|projetos|parceiros)(?:\/([a-f0-9-]+))?$/.exec(url.pathname);
      if (!match) return json(res, 404, { erro: 'Rota não encontrada.' });
      const [, collection, id] = match;
      // Aguarde a entrada antes de ler: leitura e gravação devem ser indivisíveis
      // nesta instância para não perder cadastros de requisições simultâneas.
      const input = ['POST', 'PUT'].includes(req.method) ? validate(await body(req), collection) : null;
      const data = read();
      const index = data[collection].findIndex(p => p.id === id);
      if (id && index < 0) return json(res, 404, { erro: 'Registro não encontrado.' });
      if (req.method === 'DELETE' && id) data[collection].splice(index, 1);
      else if ((req.method === 'POST' && !id) || (req.method === 'PUT' && id)) {
        if (id && input.revisao !== (data[collection][index].revisao || 1)) return json(res, 409, { erro: 'Este cadastro foi alterado por outra pessoa. Recarregue o painel e revise a versão atual antes de salvar.' });
        const item = { ...input, revisao: id ? (data[collection][index].revisao || 1) + 1 : 1, id: id || crypto.randomUUID() };
        if (id) data[collection][index] = item; else data[collection].push(item);
      } else return json(res, 405, { erro: 'Método não permitido.' });
      save(data); audit(auth.username, req.method, collection, id || data[collection].at(-1)?.id); return json(res, 200, { ok: true });
    }
    if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405); return res.end(); }
    if (url.pathname === '/robots.txt') {
      res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end(`User-agent: *\nDisallow: /admin.html\nDisallow: /api/\n${process.env.AMABA_SITE_URL ? `Sitemap: ${process.env.AMABA_SITE_URL.replace(/\/$/, '')}/sitemap.xml\n` : ''}`);
    }
    if (url.pathname === '/sitemap.xml') {
      if (!process.env.AMABA_SITE_URL) { res.writeHead(503); return res.end('Configure AMABA_SITE_URL com o domínio público.'); }
      const base = process.env.AMABA_SITE_URL.replace(/\/$/, '');
      const paths = ['index.html','sobre.html','projetos.html','noticias.html','postagens.html','apoie.html','parceiros.html','contato.html','privacidade.html','termos.html'];
      const data = read();
      for (const [collection, page] of [['publicacoes', 'postagem.html'], ['projetos', 'projeto.html']]) for (const item of data[collection].filter(p => p.publicado)) paths.push(`${page}?id=${encodeURIComponent(item.id)}`);
      res.writeHead(200, { 'Content-Type': 'application/xml; charset=utf-8' });
      return res.end(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${paths.map(p => `<url><loc>${escape(`${base}/${p}`)}</loc></url>`).join('')}</urlset>`);
    }
    const pathname = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname);
    const notFound = () => { res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' }); res.end(fs.readFileSync(path.join(root, '404.html'), 'utf8')); };
    if (!/^\/(?:[a-z0-9-]+\.html|assets\/[\w .%\u00c0-\u024f-]+\.(?:css|js|jpg|jpeg|png|webp|svg))$/.test(pathname)) return notFound();
    const target = path.join(root, pathname);
    if (!fs.existsSync(target)) return notFound();
    if (pathname === '/postagens.html') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' });
      return res.end(req.method === 'HEAD' ? undefined : renderListing(fs.readFileSync(target, 'utf8'), read().publicacoes.filter(p => p.publicado)));
    }
    if (['/postagem.html', '/projeto.html'].includes(pathname)) {
      const collection = pathname === '/projeto.html' ? 'projetos' : 'publicacoes';
      const item = read()[collection].find(p => p.publicado && p.id === url.searchParams.get('id'));
      if (!item) return notFound();
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' });
      return res.end(req.method === 'HEAD' ? undefined : renderDetail(fs.readFileSync(target, 'utf8'), item, collection));
    }
    const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml' };
    res.writeHead(200, { 'Content-Type': types[path.extname(target)], 'Cache-Control': 'no-cache' });
    if (req.method === 'HEAD') res.end(); else fs.createReadStream(target).pipe(res);
  } catch (error) { json(res, error instanceof SyntaxError || /Informe|Use uma|link deve|grande/.test(error.message) ? 400 : 500, { erro: error instanceof SyntaxError ? 'Dados inválidos.' : /Informe|Use uma|link deve|grande/.test(error.message) ? error.message : 'Não foi possível concluir a operação.' }); }
});
server.listen(Number(process.env.PORT || 3000), process.env.HOST || '127.0.0.1', () => console.log(`AMABA: http://${process.env.HOST || '127.0.0.1'}:${process.env.PORT || 3000}`));
module.exports = server;
