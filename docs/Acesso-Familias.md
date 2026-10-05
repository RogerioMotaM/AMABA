# Acesso de mães e cuidadoras

As páginas `login.html`, `cadastro.html` e `minha-conta.html` usam o servidor Node.js existente. O botão “Entrar / Cadastrar” no cabeçalho leva ao acesso público.

O cadastro solicita nome, e-mail, perfil, senha e aceite dos termos e da política de privacidade. Os registros são armazenados em `familias.json`, no mesmo diretório do arquivo definido por `AMABA_DATA_FILE` (por padrão, `data/`). Inclua esse arquivo na rotina de backup e restrinja o acesso ao diretório de dados.

As senhas usam scrypt com salt individual. As sessões duram oito horas e ficam em memória; reiniciar o servidor exige novo login. As contas das famílias e as contas administrativas usam arquivos e cookies separados. Em produção com HTTPS, configure `AMABA_SECURE_COOKIE=1`.

A área da conta mostra os dados cadastrais e links para projetos e publicações. Esta versão não envia confirmação por e-mail nem oferece recuperação de senha. O aceite registrado não substitui a revisão dos documentos legais para descrever o tratamento desses dados.

Execute `npm test` para verificar cadastro, login, validação, persistência, saída, proteção contra requisições de outra origem e isolamento do painel administrativo.
