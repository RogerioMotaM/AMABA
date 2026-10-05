(() => {
  const form = document.querySelector('#family-form');
  const status = (message, error = false) => {
    const target = document.querySelector('#form-status');
    target.textContent = message; target.dataset.error = String(error);
  };
  async function api(route, options = {}) {
    const response = await fetch('/api/familias/' + route, options);
    const data = await response.json();
    if (!response.ok) throw new Error(data.erro || 'Não foi possível concluir. Tente novamente.');
    return data;
  }
  document.querySelector('#toggle-password')?.addEventListener('click', event => {
    const input = document.querySelector('#senha');
    const show = input.type === 'password'; input.type = show ? 'text' : 'password';
    event.currentTarget.textContent = show ? 'Ocultar' : 'Mostrar';
    event.currentTarget.setAttribute('aria-pressed', String(show));
  });
  const confirmation = document.querySelector('#confirmacao');
  const validate = () => confirmation?.setCustomValidity(confirmation.value !== form.elements.senha.value ? 'As senhas precisam ser iguais.' : '');
  if (confirmation) { confirmation.addEventListener('input', validate); form.elements.senha.addEventListener('input', validate); }
  form?.addEventListener('submit', async event => {
    event.preventDefault(); validate(); if (!form.reportValidity()) return;
    const button = form.querySelector('[type=submit]'); button.disabled = true;
    status(form.dataset.mode === 'cadastro' ? 'Criando sua conta…' : 'Entrando…');
    const input = Object.fromEntries(new FormData(form)); delete input.confirmacao;
    input.consentimento = form.elements.consentimento?.checked === true;
    try {
      await api(form.dataset.mode, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) });
      location.replace('minha-conta.html');
    } catch (error) { status(error instanceof TypeError ? 'Não foi possível conectar. Verifique sua conexão e tente novamente.' : error.message, true); button.disabled = false; }
  });
  if (!document.querySelector('#account-loading')) return;
  (async () => {
    try {
      const response = await fetch('/api/familias/session');
      if (response.status === 401) { location.replace('login.html'); return; }
      if (!response.ok) throw new Error('Não foi possível carregar sua conta. Recarregue a página.');
      const data = await response.json();
      document.querySelector('#account-welcome').textContent = `Olá, ${data.nome}! Que bom ter você na nossa rede.`;
      document.querySelector('#account-email').textContent = data.email;
      document.querySelector('#account-profile').textContent = { mae: 'Mãe', cuidadora: 'Cuidadora', 'mae-cuidadora': 'Mãe e cuidadora' }[data.perfil];
      document.querySelector('#account-loading').hidden = true;
      document.querySelector('#account-content').hidden = false;
      document.querySelector('#family-logout').addEventListener('click', async event => {
        event.currentTarget.disabled = true;
        try { await api('logout', { method: 'POST', headers: { 'X-CSRF-Token': data.csrf } }); location.replace('login.html'); }
        catch { status('Não foi possível sair. Tente novamente.', true); event.currentTarget.disabled = false; }
      });
    } catch (error) { document.querySelector('#account-loading').textContent = error instanceof TypeError ? 'Não foi possível conectar. Recarregue a página para tentar novamente.' : error.message; }
  })();
})();
