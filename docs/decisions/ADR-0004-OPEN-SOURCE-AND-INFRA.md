# ADR-0004 — Open Source, licença e hospedagem futura

**Status: Aceito — 27/10/2026**

- Código Valunium sob **GNU AGPLv3 (`AGPL-3.0-only`)**, texto oficial íntegro em `LICENSE` a inserir no primeiro bootstrap.
- A fase inicial é **open source, gratuita, auto-hospedável e voltada a GitHub/portfólio**.
- **SaaS gerenciado/comercial apenas como evolução futura**, sem pagamentos nem infraestrutura de produção nas primeiras etapas.
- Repositório e contribuições sob a licença do projeto; sem CLA nem cessão integral de direitos de autores nesta fase.
- Nome, símbolo e logotipo seguem política de marca separada; **nenhuma alegação de marca registrada** até confirmação legal.
- Desenvolvimento usa PostgreSQL **nativo Linux**, sem Docker; produção futura deverá usar **PostgreSQL gerenciado**, isolado de desenvolvimento/staging e configurável via variáveis de ambiente.
- **Prettier proibido por preferência do projeto**; manter ESLint 9, TypeScript strict e testes.
- `AGENTS.md` existe e deve ser mantido; prompts fornecidos somente fora do repositório.
- Regra read-only financeira permanece absoluta e prevalece sobre decisões futuras de monetização.
