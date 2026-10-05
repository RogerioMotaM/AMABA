# AMABA

Site institucional da AMABA, com administração de conteúdo e acesso para famílias.

## Executar localmente

Requer Node.js 22 ou mais recente. No PowerShell:

```powershell
$env:AMABA_ADMIN_PASSWORD = Read-Host 'Senha administrativa (mínimo 12 caracteres)'
npm start
```

Acesse http://127.0.0.1:3000. O painel está em `/admin.html`, com usuário inicial `admin` e a senha definida no ambiente.

## Testes

```powershell
npm test
```

## Documentação e dados

Consulte [Administração](docs/Administracao.md) para configuração, hospedagem e backups, e os demais documentos em `docs/`.

Dados persistidos em `data/`, arquivos de ambiente e imagens enviadas pelo painel (`assets/upload-*.webp`) não são versionados. Faça backup separado desses arquivos. O servidor usa as variáveis do ambiente do processo; não carrega `.env` automaticamente.
