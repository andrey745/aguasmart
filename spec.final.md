# ÁguaSmart — Sistema Inteligente de Monitoramento de Água

## Especificação Final do Protótipo (`spec.final.md`)

**Autor:** Andrey Iago Costa Carvalho  
**Instituição:** Instituto Federal de Rondônia (IFRO) — Campus Porto Velho Calama  
**Projeto:** Simulado Centelha 3 — Rondônia  
**Docente:** Rafael Pitwak  
**Versão:** 1.0 — novembro de 2026  
**Sistema publicado:** https://aguasmart-9jsc.vercel.app/  
**Repositório:** https://github.com/andrey745/aguasmart

> **Escopo e transparência:** este documento descreve a versão que foi efetivamente publicada e verificada como protótipo web. A versão atual é estática e utiliza armazenamento no navegador (`localStorage`). Portanto, os itens que na especificação inicial previam banco de dados PostgreSQL, backend, autenticação segura no servidor e integração com sensor físico não são considerados implementados nesta versão.

---

## 1. Objetivo

O ÁguaSmart é um protótipo web para acompanhamento do consumo de água, organização de medições por pontos de monitoramento e identificação visual de possíveis situações de desperdício. Seu propósito é demonstrar como recursos digitais podem apoiar o uso consciente da água, facilitando a consulta de indicadores, do histórico de leituras e de alertas preventivos.

A versão publicada permite demonstrar fluxos de cadastro e consulta dentro do próprio navegador, utilizando dados locais e registros simulados. Ela não recebe, nesta versão, telemetria de um hidrômetro ou sensor físico conectado.

## 2. Usuários e perfis de demonstração

A interface apresenta os seguintes perfis para demonstração:

- **Cliente/consumidor:** perfil destinado a acompanhar pontos de medição, consultar indicadores e histórico e registrar medições.
- **Síndica/responsável:** segundo perfil demonstrativo, usado para apresentar um cenário de monitoramento de condomínio.
- **Administrador:** perfil demonstrativo que permite apresentar a área administrativa e indicadores gerais da aplicação.

**Limitação importante:** a troca de perfil e a autenticação desta versão são realizadas no lado do navegador. Não representam controle de acesso seguro no servidor e não devem ser utilizadas para proteger informações reais ou sensíveis.

## 3. Casos de uso disponíveis no protótipo

1. **Acessar o painel:** visualizar indicadores e gráficos demonstrativos de consumo.
2. **Selecionar pontos de medição:** alternar o ponto selecionado ou visualizar o conjunto de pontos.
3. **Gerenciar pontos:** cadastrar, editar e ativar/inativar pontos de monitoramento.
4. **Registrar leitura:** informar ponto, volume em litros, data/hora e origem do dado.
5. **Consultar histórico:** visualizar as medições registradas no protótipo.
6. **Consultar alertas:** visualizar alertas preventivos apresentados pela aplicação.
7. **Simular dados:** utilizar a área de simulador para demonstrar registros de teste, sem conexão com hardware.
8. **Acessar a área administrativa:** apresentar a interface e os indicadores demonstrativos do perfil administrador.
9. **Acessar e encerrar sessão demonstrativa:** utilizar os controles de login, cadastro, troca de perfil e logout da interface.

## 4. Requisitos funcionais — estado da versão publicada

| ID | Requisito | Situação na versão publicada |
|---|---|---|
| RF01 | Apresentar fluxo de cadastro de usuário | Interface disponível; cadastro demonstrativo no navegador, sem validação por backend |
| RF02 | Apresentar fluxo de login e perfis | Login/troca de perfil demonstrativos no cliente; não é autenticação segura de produção |
| RF03 | Permitir encerrar a sessão demonstrativa | Controle de logout disponível no cliente |
| RF04 | Cadastrar pontos de monitoramento | Funcionalidade disponível no protótipo |
| RF05 | Editar e ativar/inativar pontos | Funcionalidade disponível no protótipo |
| RF06 | Registrar leituras com volume, data/hora e origem | Formulário disponível; dados armazenados localmente |
| RF07 | Exibir indicadores consolidados de consumo | Dashboard com indicadores e gráficos demonstrativos |
| RF08 | Consultar histórico de leituras | Área de histórico disponível |
| RF09 | Identificar possíveis anomalias | Regras e cenários demonstrativos no protótipo; não equivalem a monitoramento de sensor real |
| RF10 | Apresentar alertas preventivos | Central de alertas disponível com dados demonstrativos |
| RF11 | Consultar e alterar status dos alertas | Interface de alertas disponível; comportamento deve ser considerado local ao protótipo |
| RF12 | Manter associação entre pontos, leituras e alertas | Associação mantida na estrutura de dados local do protótipo; não há integridade de banco relacional |
| RF13 | Separar dados por perfil de usuário | Separação demonstrativa no cliente; não oferece isolamento seguro no servidor |
| RF14 | Apresentar área administrativa | Interface administrativa demonstrativa disponível |
| RF15 | Gerar ou apresentar massa de dados de demonstração | Simulador e dados de teste disponíveis; registros simulados não são medições físicas |

## 5. Requisitos não funcionais e limitações técnicas

### 5.1 Interface e usabilidade

- Interface em português brasileiro.
- Navegação por seções: Dashboard, Pontos de Medição, Histórico, Alertas, Simulador IoT e Área Administrativa.
- Layout desenvolvido para apresentação em navegador, com estilos responsivos.
- Indicadores e gráficos utilizados para facilitar a leitura dos dados demonstrativos.

### 5.2 Arquitetura realmente utilizada

- **Frontend:** HTML5, CSS e JavaScript.
- **Estilização:** Tailwind CSS carregado por CDN e folha de estilos própria.
- **Gráficos:** Chart.js carregado por CDN.
- **Persistência:** `localStorage` do navegador, com dados demonstrativos pré-carregados.
- **Servidor local de desenvolvimento:** pacote `serve`, executado por meio de `npm run dev`.
- **Publicação:** Vercel, com entrega de arquivos estáticos.
- **Versionamento:** Git e GitHub, repositório na branch `main`.

### 5.3 Segurança, privacidade e persistência

A versão publicada é um protótipo acadêmico e não deve ser considerada pronta para uso com dados pessoais ou de consumo reais.

- Não utiliza PostgreSQL, Neon ou outro banco de dados remoto.
- Não possui API/backend para validar operações no servidor.
- A autenticação e a seleção de perfis ocorrem no navegador.
- Os dados ficam associados ao navegador utilizado; não há sincronização entre dispositivos.
- Os dados demonstrativos e credenciais de teste presentes no código não devem ser reutilizados como credenciais reais.
- A versão atual não atende integralmente aos requisitos de hash de senha, cookies HTTP-only, autorização no servidor e isolamento multiusuário previstos na especificação inicial.

### 5.4 Integração IoT

O simulador é destinado à demonstração de dados e fluxos de teste. A versão publicada não comprova conexão física com ESP32, sensor de vazão YF-S201 ou outro equipamento. A integração de hardware permanece como evolução futura.

## 6. Modelo de dados utilizado no protótipo

O protótipo organiza os dados localmente em estruturas correspondentes às seguintes entidades:

- **Usuários:** identificador, nome, e-mail, perfil e informações demonstrativas de autenticação.
- **Pontos de monitoramento:** identificador, usuário associado, nome, localização descritiva e estado ativo/inativo.
- **Leituras de consumo:** identificador, ponto associado, volume em litros, origem do dado e data/hora.
- **Alertas:** identificador, ponto associado, tipo, descrição, estado e data de criação.

Essas estruturas são armazenadas como dados serializados no `localStorage`. Elas representam o modelo lógico do protótipo, não tabelas efetivamente implantadas em um banco relacional.

### Relacionamentos lógicos

- Um usuário pode possuir vários pontos de monitoramento.
- Um ponto pode possuir várias leituras de consumo.
- Um ponto pode possuir vários alertas.
- Um alerta pode fazer referência a uma leitura relacionada, quando aplicável.

## 7. Critérios de aceite e verificações realizadas

Os critérios abaixo se referem ao protótipo publicado, não à arquitetura de produção descrita na especificação inicial.

- **CA01 — Abertura do sistema:** ao acessar o endereço público da Vercel, a página principal do ÁguaSmart deve carregar.
- **CA02 — Navegação:** as seções principais devem estar disponíveis pela navegação da interface.
- **CA03 — Pontos de medição:** a interface deve permitir apresentar o gerenciamento dos pontos de monitoramento.
- **CA04 — Registro de leitura:** a interface deve disponibilizar formulário para informar ponto, volume, data/hora e origem.
- **CA05 — Dashboard:** o painel deve apresentar indicadores e gráficos de consumo demonstrativos.
- **CA06 — Histórico e alertas:** as respectivas áreas devem estar disponíveis para consulta dos registros e alertas do protótipo.
- **CA07 — Simulação:** a área de Simulador IoT deve permitir demonstrar dados de teste sem afirmar que são provenientes de um sensor físico.
- **CA08 — Execução local:** foi executado `npm install` e, em seguida, `npm run dev`; o servidor `serve` iniciou na porta 3000 e registrou respostas HTTP 200 para a página e arquivos principais.
- **CA09 — Publicação:** a Vercel apresentou a confirmação “Deployed to Production” e forneceu o endereço público informado neste documento.

**Limite dos testes:** as verificações registradas comprovam a inicialização local, o carregamento dos arquivos principais e a publicação do site. Não há, neste documento, evidência de testes automatizados completos, testes de segurança, validação de banco remoto ou teste de integração com hardware.

## 8. Decisões de implementação, publicação e evolução

### 8.1 Decisão da versão entregue

Para disponibilizar uma demonstração navegável dentro do prazo acadêmico, foi publicada uma versão estática do protótipo, preservando a interface e os principais fluxos demonstrativos. A hospedagem foi realizada na Vercel a partir do repositório GitHub.

- **URL de produção:** https://aguasmart-9jsc.vercel.app/
- **Repositório:** https://github.com/andrey745/aguasmart
- **Branch de publicação:** `main`

### 8.2 Diferença em relação à especificação inicial

A especificação inicial previa Next.js com TypeScript, PostgreSQL hospedado no Neon, Prisma ORM, autenticação com bcrypt e cookies HTTP-only, validação no servidor e implantação na Vercel.

Esses componentes de backend e banco de dados não fazem parte da versão estática publicada. Assim, a implementação entregue deve ser avaliada como **protótipo web funcional para demonstração**, e não como sistema multiusuário de produção com persistência remota e autenticação segura.

### 8.3 Evoluções futuras

1. Migrar a aplicação para Next.js e TypeScript.
2. Configurar PostgreSQL remoto e Prisma ORM.
3. Implementar cadastro e login com hash seguro de senhas e sessões protegidas por cookies HTTP-only.
4. Transferir validações e regras de autorização para o servidor.
5. Garantir isolamento real dos dados por usuário.
6. Criar testes automatizados para os fluxos principais e regras de anomalia.
7. Integrar ESP32 e sensor de vazão, com autenticação própria do dispositivo.
8. Documentar as alterações em `CHANGELOG.md` e atualizar esta especificação a cada nova versão.

---

## Declaração final

O ÁguaSmart possui uma versão web publicada e acessível para demonstração acadêmica, com interface de dashboard, gerenciamento demonstrativo de pontos, registros de consumo, histórico, alertas, simulador e área administrativa. A persistência atual é local ao navegador e os perfis são demonstrativos. Banco de dados remoto, backend seguro e integração com sensor físico permanecem como etapas futuras de desenvolvimento.
