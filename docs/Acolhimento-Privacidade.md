# Formulário de primeiro acolhimento

Página: `acolhimento.html`, acessível pelo botão “Meu primeiro acolhimento” na conta. Exige login. Usa nome, e-mail e perfil existentes, sem duplicar esses campos nas respostas. Coleta cidade e UF opcionais, telefone opcional para contato por e-mail, canal preferido e interesses em opções fechadas. Não possui campo livre de mensagem, documentos ou dados de crianças. O servidor rejeita campos adicionais.

O consentimento é específico, não pré-marcado, registrado com versão e data. Exige declaração de maioridade, sem coletar data de nascimento. Não há autorização para publicidade. A pessoa consulta e corrige pelo próprio formulário, baixa JSON sem senhas nem tokens, ou revoga o consentimento excluindo as respostas. A exclusão não apaga a conta.

As respostas ficam dentro do registro da conta em `familias.json`. O prazo implementado de retenção é 180 dias do último envio, com remoção na próxima leitura da base após expiração. Não há cópia de backup criada pelo módulo. Backups de infraestrutura precisam de política própria para que exclusões não sejam revertidas por restaurações. O prazo de 180 dias é uma escolha desta implementação, não um prazo obrigatório da LGPD; a AMABA deve validá-lo conforme sua finalidade.

O formulário não faz envio automático de e-mail ou WhatsApp nem cria uma fila de atendimento. O armazenamento ocorre no servidor, e o acesso técnico deve ser limitado à equipe autorizada. A conta possui cookie HttpOnly, proteção de origem e CSRF; o formulário não persiste dados no navegador. Em produção, use HTTPS e `AMABA_SECURE_COOKIE=1`, restrinja o diretório de dados e defina controle de acesso, backups e resposta a incidentes.

Antes do uso real, a AMABA precisa confirmar seu canal de privacidade e atendimento, a base legal do cadastro de conta, a finalidade e o prazo de retenção, a política de backups e os operadores de hospedagem. A página de contato ainda não informa canais oficiais. O código e os avisos ajudam a atender à LGPD, mas não certificam a conformidade da operação. Avalie separadamente qualquer futura coleta de dados de saúde ou de crianças.

Referências: Lei nº 13.709/2018, arts. 6º, 8º, 9º, 11, 14, 16, 18 e 46: https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm ; perguntas frequentes da ANPD: https://www.gov.br/anpd/pt-br/acesso-a-informacao/perguntas-frequentes .
