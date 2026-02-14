# 🎟️ Rifas Online — Plataforma SaaS de Rifas Digitais

Plataforma completa para criação, gestão e monetização de rifas digitais com sistema de organizadores, cobrança de tarifas e painel administrativo.

## 🚀 Features

### Para Compradores (Público)
- Listagem de rifas ativas com busca por **código** (RF-XXXX) ou nome
- Seleção de números com busca rápida por número específico
- Fluxo de compra com validação, confirmação e dados PIX
- Comprovante digital (copiar, WhatsApp, download PDF/HTML)

### Para Organizadores (Cadastro)
- Cadastro com login/senha (senha armazenada com SHA-256 hash)
- Criação de múltiplas rifas simultaneamente
- Cada rifa recebe um **código único** (RF-XXXX) para divulgação
- Gestão de compradores e confirmação de pagamentos
- Sistema de sorteio com animação e randomização criptográfica
- Tela de pagamento de tarifa com dados PIX do admin

### Para Admin da Plataforma (Dono)
- Setup inicial seguro (sem credenciais no código-fonte)
- Dashboard com métricas: taxas recebidas, pendentes, organizadores, rifas
- Confirmação de pagamento de tarifas (ativa rifas)
- Gerenciamento de organizadores (bloquear/desbloquear/excluir)
- Configuração de tarifa (% sobre criação) — **só vale para novas rifas**
- Rifas já criadas mantêm a taxa vigente no momento da criação

## 🔐 Segurança

- **Sem credenciais hardcoded**: Admin configura acesso no primeiro login
- **Senhas com SHA-256**: Nunca armazenadas em texto plano
- **Isolamento de dados**: Organizador só vê suas próprias rifas
- **Conta bloqueada**: Organizador bloqueado não consegue logar
- **Código da rifa**: Evita compras em rifas erradas/similares
- **Randomização criptográfica**: Sorteio usa `crypto.getRandomValues()`

## 📊 Modelo de Monetização

O admin cobra uma **tarifa percentual** sobre cada rifa criada:

| Cenário | Rifas/mês | Valor médio | Tarifa 5% | Receita mensal |
|---------|-----------|-------------|-----------|----------------|
| Conservador | 5 | R$ 500 | R$ 25/rifa | R$ 125 |
| Moderado | 10 | R$ 1.000 | R$ 50/rifa | R$ 500 |
| Agressivo | 20 | R$ 2.000 | R$ 100/rifa | R$ 2.000 |

Fluxo: Organizador cria rifa → Sistema calcula tarifa → Organizador paga via PIX → Admin confirma → Rifa ativada.

## 🛠️ Tech Stack

- **React** (hooks, functional components)
- **Tailwind-free**: CSS-in-JS inline puro
- **Sem dependências externas** (zero npm install)
- **Web Crypto API** para hashing e randomização
- **Responsivo**: Mobile-first com breakpoints dinâmicos

## 📁 Estrutura

```
rifas-plataforma.jsx    # App completo (single-file React component)
README.md               # Este arquivo
```

## 🚀 Como Usar

### Opção 1: Claude.ai Artifact
Copie o conteúdo de `rifas-plataforma.jsx` como um artifact React no Claude.

### Opção 2: Projeto React
```bash
npx create-react-app rifas-online
# Substitua src/App.js pelo conteúdo de rifas-plataforma.jsx
npm start
```

### Opção 3: Vercel / Netlify
Deploy direto como React app single-file.

## 📋 Primeiro Acesso

1. Abra a plataforma
2. Clique em 🛡️ (canto superior direito)
3. Configure seu **usuário e senha de admin**
4. Em 💎 Tarifas, configure sua **chave PIX** e percentual
5. Organizadores já podem se cadastrar e criar rifas!

## 📄 Licença

MIT — Uso livre para fins comerciais e pessoais.

---

Desenvolvido com ❤️ por [Demetrio Viana](https://instagram.com/demetrio_vianas)
