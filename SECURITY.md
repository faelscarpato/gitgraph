# **🛡️ Política de Segurança do Gitgraph**

A segurança é uma prioridade fundamental para o Gitgraph. Como somos uma aplicação de análise estática *local-first* que roda no navegador, a integridade do código do nosso motor e a proteção contra execuções maliciosas (como XSS via parsing de arquivos) são tratadas com extrema seriedade.

## **Versões Suportadas**

Atualmente, apenas as atualizações na branch principal (main) e as releases mais recentes recebem patches de segurança.

| Versão | Suportada |
| :---- | :---- |
| main / latest | ✅ Sim |
| \< 1.0.0 | ❌ Não |

## **Reportando uma Vulnerabilidade**

**Por favor, NÃO abra uma *issue* pública para relatar uma vulnerabilidade de segurança.** Isso pode expor o projeto e seus usuários a riscos antes que possamos criar uma correção.

Para reportar uma falha de segurança, utilize um dos seguintes métodos:

1. **GitHub Security Advisories:** Vá até a aba "Security" no repositório do Gitgraph no GitHub e clique em "Report a vulnerability" (Privado).  
2. **E-mail Direto:** Envie um e-mail detalhado para a equipe de manutenção (atualizar com o seu e-mail de contato seguro).

### **O que incluir no seu relatório:**

* Tipo de vulnerabilidade (ex: XSS, falha no parser do Tree-Sitter, vazamento de memória).  
* Passo a passo claro e detalhado para reproduzir a falha.  
* O impacto potencial da vulnerabilidade.  
* (Opcional) Uma sugestão de como corrigir o problema.

### **Nosso compromisso:**

* Você receberá um aviso de recebimento do seu relatório em até 48 horas.  
* Manteremos você informado sobre o progresso da correção.  
* Reconheceremos publicamente sua contribuição (caso deseje) após a correção ser lançada.