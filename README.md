# 🐾 VacPet

> Carteirinha de vacinação de animais de estimação registrada na blockchain Ethereum (Sepolia Testnet).

**Desafio 1 — ProofChain | Trilha Blockchain | Hackweb**

---

## 📋 O Problema

Tutores de animais dependem de carteirinhas físicas de vacinação que se perdem, rasgam ou são esquecidas. Clínicas veterinárias mantêm registros em sistemas isolados e centralizados. Não existe forma pública e confiável de verificar o histórico de vacinas de um animal — especialmente ao adotá-lo ou levá-lo a outra clínica.

## 💡 A Solução

O **VacPet** usa blockchain para criar um registro imutável, público e auditável de vacinas. Cada animal recebe um ID único on-chain. Qualquer pessoa pode verificar o histórico sem precisar de conta, senha ou contato com uma clínica específica.

### Por que blockchain faz sentido aqui?

| Problema | Como blockchain resolve |
|----------|------------------------|
| Carteirinha física se perde | Registro permanente on-chain |
| Clínica fecha e perde dados | Dados não dependem de nenhum servidor |
| Adulteração de registros | Imutabilidade garante integridade |
| Verificação depende de ligação/e-mail | Consulta pública instantânea |
| Transferência de tutor sem histórico | Histórico segue o animal |

---

## 🏗️ Arquitetura

```
┌─────────────────────────────────────────┐
│           Frontend (HTML + JS)          │
│         Ethers.js + MetaMask            │
└──────────────────┬──────────────────────┘
                   │ RPC calls
┌──────────────────▼──────────────────────┐
│        Smart Contract (Solidity)        │
│         Sepolia Testnet (ETH)           │
│                                         │
│  cadastrarAnimal()  → grava on-chain    │
│  registrarVacina()  → grava on-chain    │
│  consultarAnimal()  → leitura pública   │
│  consultarVacinas() → leitura pública   │
└─────────────────────────────────────────┘
```

### O que fica on-chain
- Nome, espécie, raça, cor, data de nascimento do animal
- Endereço (wallet) do tutor
- Histórico completo de vacinas (nome, lote, data, veterinário, clínica, próxima dose)
- Timestamps imutáveis de cada registro

### O que fica off-chain
- Interface visual (frontend)
- Dados sensíveis (CPF, endereço físico) — **nunca vão para a blockchain**

---

## 🛠️ Tecnologias

- **Solidity ^0.8.20** — Smart contract
- **Hardhat** — Compilação, testes e deploy
- **Hardhat Gas Reporter** — Relatório de consumo de gas por função
- **Solidity Coverage** — Cobertura de código dos testes
- **Chai + Ethers.js v6** — Framework de testes
- **Sepolia Testnet** — Rede Ethereum de testes
- **MetaMask** — Carteira do usuário
- **HTML + CSS + JS** — Interface sem dependências pesadas

---

## 🚀 Como executar

### Pré-requisitos
- Node.js >= 18
- MetaMask instalado no navegador
- Conta na Sepolia Testnet com ETH de teste ([faucet](https://sepoliafaucet.com))

### 1. Clone e instale
```bash
git clone https://github.com/lielsonandrade/vacpet
cd vacpet
npm install
```

### 2. Configure variáveis de ambiente
```bash
cp .env.example .env
# Edite .env com sua private key e URL RPC da Sepolia
```

### 3. Compile o contrato
```bash
npx hardhat compile
```

### 4. Deploy na Sepolia
```bash
npx hardhat run scripts/deploy.js --network sepolia
```
Copie o endereço gerado e cole em `frontend/index.html` na variável `CONTRACT_ADDRESS`.

### 5. Abra o frontend
Abra `frontend/index.html` no navegador, conecte o MetaMask na Sepolia e pronto!

```bash
npx http-server frontend -p 3000 
```

---

## 🧪 Testes

O projeto possui uma suíte de **42 testes automatizados** cobrindo todas as funções do contrato, incluindo fluxos de sucesso, casos de erro e cenários de integração end-to-end.

### Estrutura dos testes

```
test/
└── Vacpet.test.js
    ├── Deploy                    (2 testes)
    ├── cadastrarAnimal           (10 testes)
    ├── registrarVacina           (7 testes)
    ├── transferirTutor           (8 testes)
    ├── consultarAnimal           (3 testes)
    ├── consultarVacinas          (3 testes)
    ├── totalVacinas              (2 testes)
    ├── animaisDoTutor            (3 testes)
    ├── totalAnimais              (2 testes)
    └── Cenários de integração    (3 testes)
```

Cada grupo valida:
- **Fluxo feliz** — comportamento esperado em condições normais
- **Controle de acesso** — rejeição de chamadas por contas não autorizadas
- **Validação de entrada** — rejeição de IDs inexistentes, endereços zero, etc.
- **Integridade dos dados** — campos gravados corretamente, eventos emitidos com os dados certos

### Rodando os testes

> **Windows (PowerShell):** use sempre `npm run <script>`. Os comandos com `REPORT_GAS=true` usam `cross-env` internamente e funcionam em qualquer sistema operacional.

#### Todos os testes
```bash
npm test
# ou
npx hardhat test
```

#### Filtrar por grupo ou nome
```bash
npx hardhat test --grep "cadastrarAnimal"
npx hardhat test --grep "transferirTutor"
npx hardhat test --grep "Cenários de integração"
```

#### Relatório de consumo de gas
```bash
npm run test:gas
```
Exibe o gas médio/mínimo/máximo gasto por função, útil para identificar gargalos antes do deploy.

Exemplo de saída:
```
·····················|·················|··············
|  Contract          ·  Method         ·  Avg gas    |
·····················|·················|··············
|  VacPet            ·  cadastrarAnimal·     130 000  |
|  VacPet            ·  registrarVacina·      95 000  |
|  VacPet            ·  transferirTutor·      55 000  |
·····················|·················|··············
```

#### Cobertura de código
```bash
npm run test:coverage
```
Gera um relatório HTML em `coverage/index.html` mostrando quais linhas, branches e funções do contrato foram exercitados pelos testes.

---

## 📦 Endereço do contrato

| Rede | Endereço |
|------|----------|
| Sepolia Testnet | `0x87674376e5eE07ECe76D697446Fa25617214E9F4` |

🔗 [Ver na Etherscan Sepolia](https://sepolia.etherscan.io/address/0xe09060D670e8712fD63B2e709B87C6d4A5D849e4)

---

## 🎬 Demonstração

*https://www.youtube.com/watch?v=GVOznmkaRcM*

---

## 📁 Estrutura do projeto

```
vacpet/
├── contracts/
│   └── VacPet.sol               # Smart contract principal
├── scripts/
│   └── deploy.js                # Script de deploy
├── test/
│   └── Vacpet.test.js           # Suíte de 42 testes automatizados
├── frontend/
│   └── index.html               # Interface web
├── hardhat.config.js
├── package.json
└── README.md
```

---

## 🤖 Ferramentas de IA utilizadas
- Claude (Anthropic) — apoio no desenvolvimento do contrato Solidity,
  frontend, testes e estrutura do projeto.

---

## 👤 Autor: Lielson Dos Santos Andrade

Desenvolvido para o **Hackweb — Desafio 1 ProofChain**
