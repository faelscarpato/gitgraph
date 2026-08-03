# **🛠️ Guia de Contribuição \- Gitgraph**

Obrigado pelo interesse em contribuir com o Gitgraph\! Nosso objetivo é construir a ferramenta de análise estática browser-native mais rápida e confiável do mercado, ajudando desenvolvedores e Inteligências Artificiais a compreenderem bases de código complexas de forma instantânea.

Como o Gitgraph lida com parsing avançado de AST (via Tree-Sitter), cálculos de grafos matemáticos complexos e um motor de análise estritamente local (no navegador), **temos normas de engenharia rigorosas**. Isso garante que a performance e a estabilidade do motor principal nunca sejam comprometidas.

Leia atentamente as diretrizes abaixo antes de iniciar qualquer desenvolvimento ou abrir um Pull Request.

## **🏗️ 1\. Arquitetura e Princípios Core (Imutáveis)**

Antes de escrever qualquer linha de código, entenda nossos princípios arquiteturais fundamentais:

1. **Local-First (Privacidade Total):** Todo o processamento de código, geração de embeddings sintáticos e renderização de grafos **DEVE** acontecer localmente no navegador do cliente (utilizando WebAssembly/Tree-Sitter e IndexedDB). Não aceitaremos contribuições que introduzam processamento dependente de back-ends externos pesados.  
2. **Performance e Responsividade:** O Gitgraph analisa frequentemente milhares de nós (arquivos, dependências, funções). O código do motor de análise deve ser altamente otimizado (estruturas de dados O(1) ou O(log n) sempre que possível) para não travar a UI (Main Thread).  
3. **Preservação do Motor (Atenção Redobrada):** Alterações nos arquivos do diretório src/lib/analysis/ (especialmente tree-sitter.ts, graph-builder.ts e semantic.ts) são altamente críticas. Qualquer mudança nesta área passará por um rigoroso escrutínio e exige cobertura total de testes.

## **💻 2\. Configuração do Ambiente de Desenvolvimento**

O ecossistema do projeto baseia-se em **React, TypeScript, Vite, Tree-Sitter e IndexedDB**. Utilizamos o pnpm como gerenciador de pacotes padrão para garantir instalações rápidas e determinísticas.

### **Passo a Passo**

1. **Faça o Fork e Clone o repositório:**  
   git clone [https://github.com/faelscarpato/gitgraph.git](https://github.com/faelscarpato/gitgraph.git)

   cd gitgraph

3. **Instale as dependências (Requer Node.js v18+):**  
   pnpm install

4. **Inicie o servidor de desenvolvimento local:**  
   pnpm dev

   O Gitgraph estará disponível em http://localhost:5173.

## **📏 3\. Padrões de Código e Commits (Normas Rígidas)**

Para mantermos a base de código escalável e o histórico do Git limpo, seguimos convenções estritas em todo o repositório.

### **🌿 Regras de Branching**

Nunca envie commits diretamente para a branch main. Todo desenvolvimento deve acontecer em branches específicas a partir da main:

* feature/nome-da-feature (Para novas funcionalidades ou parsers de linguagem)  
* bugfix/nome-do-bug (Para correções de anomalias detectadas)  
* perf/nome-da-melhoria (Para otimizações de tempo de execução ou memória)  
* docs/nome-do-documento (Para alterações e atualizações em documentação)

### **📝 Conventional Commits Obrigatório**

O repositório exige o uso estrito do padrão *Conventional Commits*. O formato da mensagem do seu commit deve ser:

\<tipo\>(\<escopo opcional\>): \<descrição clara\>

*Exemplos aceitos:*

* feat(parser): adiciona suporte para extracao de AST em Go  
* fix(graph): previne loop infinito na geracao de arestas  
* perf(engine): otimiza busca semantica usando cache de embeddings  
* docs(readme): atualiza instrucoes de instalacao

### **🧹 Linting e Formatação**

Nenhum código será mesclado (merged) se falhar nas verificações de linter ou formatação. Antes de submeter seus commits, garanta que o código passe pelas regras:

pnpm lint  
pnpm format

*(Nota: O repositório utiliza Husky e lint-staged para barrar commits mal formatados automaticamente.)*

## **🧪 4\. Política de Testes (TDD Obrigatório para o Core)**

Devido à complexidade das conexões e análise sintática, qualquer alteração que modifique a lógica central ou adicione suporte a novas linguagens precisa ser extensivamente testada.

* Utilizamos o **Vitest** como motor de testes oficial.  
* Comando para validar localmente:  
  pnpm test

* **Regras para novos parsers/linguagens:** Se você adicionar suporte para uma nova linguagem no Tree-Sitter (em src/lib/analysis/parsers/), é **obrigatório** fornecer um arquivo de mock (código fonte fictício da linguagem) e um caso de teste verificando se:  
  1. As funções são corretamente identificadas (início, fim e nome).  
  2. As importações de bibliotecas/módulos são precisamente mapeadas.  
  3. As chamadas internas (calls) não geram falsos positivos.

## **🔀 5\. Processo de Pull Request (PR)**

Siga este pipeline para que sua contribuição seja revisada e aprovada o mais rápido possível:

1. **Sincronização:** Garanta que sua branch (feature/\* ou bugfix/\*) está atualizada (rebase) com a branch main oficial.  
2. **Bateria de Testes:** Confirme que todos os testes unitários e de integração estão passando localmente rodando pnpm test.  
3. **Template do PR:** Ao abrir o PR no GitHub, preencha detalhadamente a descrição:  
   * **O Problema:** Qual problema ou lacuna esse PR resolve?  
   * **A Solução:** Como a implementação foi feita?  
   * **Performance:** Esta alteração impacta a velocidade do motor de AST do Tree-Sitter? Como isso foi mitigado?  
4. **Revisão:** Aguarde o code review de pelo menos um mantenedor central do Gitgraph. Mudanças em src/lib/analysis/ podem levar mais tempo, pois envolverão testes de estresse em repositórios grandes.

Obrigado por ajudar a evoluir o Gitgraph para se tornar o padrão em Inteligência de Repositórios Open Source\! 🚀
