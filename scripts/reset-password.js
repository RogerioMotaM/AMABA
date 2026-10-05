const accounts = require('../accounts');
const username = process.argv[2];
const password = process.env.AMABA_RESET_PASSWORD;
if (!username || !password || password.length < 12 || password.length > 200) throw new Error('Defina AMABA_RESET_PASSWORD (12 a 200 caracteres) e execute node scripts/reset-password.js usuario com o servidor parado.');
const users = accounts.read();
const user = users.find(u => u.username === username);
if (!user) throw new Error('Usuário não encontrado.');
Object.assign(user, accounts.hash(password)); accounts.save(users);
console.log('Senha alterada. Reinicie o servidor para encerrar as sessões anteriores.');
