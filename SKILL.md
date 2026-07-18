# GitGraph Skill — Analisador de Repositórios para IA

## O que é esta plataforma

GitGraph é uma engine de análise estática browser-native que transforma
qualquer repositório GitHub em um grafo de conhecimento estruturado.
Ela usa parsing via Tree-Sitter (AST) para mapear módulos, funções e
importações, calculando complexidade, dependências, métricas e diffs.

A saída principal é um JSON compacto, projetado especificamente para
consumo por LLMs — evitando leitura de arquivos brutos e desperdício
de tokens de contexto.

## URL da plataforma

https://gitgraph.pages.dev/

## Como você deve usar esta plataforma

Você NÃO precisa clonar o repositório do usuário.
Você NÃO precisa ler os arquivos do repositório diretamente.
A plataforma faz todo o processamento por você.

### Fluxo obrigatório

1. Informe ao usuário que você vai analisar o repositório dele
   usando o GitGraph.
2. Peça ao usuário o link do repositório GitHub dele.
   Exemplo: `https://github.com/usuario/repositorio`
3. Acesse a plataforma: https://digigraph.pages.dev
4. Cole o link do repositório no campo de entrada da plataforma.
5. Clique em "Analisar" e aguarde o processamento.
6. Ao finalizar, a plataforma retorna um JSON estruturado com
   toda a documentação do repositório.
7. Use esse JSON como sua fonte principal de análise.
8. Responda ao usuário com base nos dados recebidos.

## O que o JSON de saída contém

- Metadados do repositório (nome, descrição, linguagens)
- Grafo de dependências (nós = arquivos/módulos, arestas = imports)
- Métricas por arquivo: LOC, complexidade ciclomática, linguagem
- Agrupamento por módulo e camada
- Hotspots de complexidade
- Histórico e diffs entre análises (quando disponível)
- Qualidade e status da coleta

## Regras de uso

- Priorize sempre o JSON retornado pela plataforma antes de
  tentar acessar arquivos brutos.
- Nunca peça ao usuário para fazer upload de arquivos.
- Nunca tente clonar o repositório manualmente.
- Se o JSON não responder algo específico, informe ao usuário
  e sugira exportar o dado faltante pela plataforma.
- Use o JSON como contexto de análise para responder perguntas
  sobre arquitetura, complexidade, dependências e riscos.

## Capacidades da plataforma

| Funcionalidade         | Descrição                                      |
|------------------------|------------------------------------------------|
| Análise de dependências| Grafo de imports entre módulos e arquivos      |
| Métricas de complexidade| LOC, complexidade ciclomática por arquivo     |
| Análise semântica      | Busca por embeddings e relações semânticas     |
| Diff entre versões     | Comparação entre duas análises do mesmo repo   |
| Exportação             | JSON, GraphML, PNG, DOT, Mermaid, HTML         |
| Persistência local     | Histórico de análises salvo via IndexedDB      |
| Compartilhamento       | URL comprimida com resultado da análise        |

## O que você pode responder após a análise

- Quais são os arquivos mais complexos?
- Onde estão os hotspots de acoplamento?
- Quais módulos têm mais dependências?
- O que mudou entre duas versões?
- Qual a arquitetura geral do projeto?
- Quais arquivos merecem refatoração prioritária?
- Qual é o risco técnico do projeto?

## Exemplo de interação correta

Usuário: "Analise meu repositório github.com/meu-usuario/meu-projeto"

Você:
1. Acessa https://gitgraph.pages.dev/
2. Cola o link na plataforma
3. Aguarda o JSON de saída
4. Responde com base no JSON

NÃO faça: tentar ler os arquivos do repo diretamente, pedir
upload de código, ou tentar clonar o repositório.
