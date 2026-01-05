# 📱 GUIA COMPLETO - Rodar FitnessMatch no iPhone

## 🎯 O que você precisa:

- MacBook (macOS)
- iPhone conectado via cabo USB-C/Lightning
- Apple ID (email @icloud.com ou qualquer email com conta Apple)
- Xcode instalado no Mac (é grátis na App Store)

---

## 📦 PARTE 1: Preparar o Mac (só precisa fazer 1 vez)

### 1.1 Instalar Xcode

1. No seu Mac, abra a **App Store** (ícone azul com "A")
2. Pesquise por **"Xcode"**
3. Clique em **"Obter"** / **"Instalar"**
4. Aguarde o download (é grande, ~12GB)
5. Quando terminar, abra o Xcode uma vez e aceite os termos

### 1.2 Instalar Node.js

1. Abra o navegador Safari
2. Vá para: **https://nodejs.org**
3. Clique no botão verde **"LTS"** (versão recomendada)
4. Vai baixar um arquivo .pkg
5. Abra o arquivo e siga a instalação (Next, Next, Finish)

### 1.3 Verificar se instalou corretamente

1. Abra o **Terminal** (Pesquise "Terminal" no Spotlight - CMD + Espaço)
2. Digite e pressione Enter:

```
node --version
```

3. Deve aparecer algo como `v20.x.x` (se aparecer, está instalado!)

---

## 📁 PARTE 2: Transferir o Projeto para o Mac

### Opção A: Via Pendrive/HD Externo

1. No Windows, copie a pasta **Fitnesmatchapp** inteira para o pendrive
2. No Mac, copie a pasta do pendrive para a **Área de Trabalho** (Desktop)

### Opção B: Via AirDrop

1. No Windows, compacte a pasta Fitnesmatchapp em .zip
2. Envie o .zip para seu iPhone (email, WhatsApp, etc)
3. No iPhone, abra o arquivo e compartilhe via AirDrop para o Mac
4. No Mac, descompacte e mova para a **Área de Trabalho**

### Opção C: Via iCloud Drive

1. No Windows, faça upload da pasta para iCloud.com
2. No Mac, baixe da pasta iCloud

**⚠️ IMPORTANTE:** A pasta deve estar na Área de Trabalho com o nome `Fitnesmatchapp`

---

## 🔧 PARTE 3: Instalar as Dependências

### 3.1 Abrir o Terminal

1. Pressione **CMD + Espaço** (abre o Spotlight)
2. Digite **Terminal** e pressione Enter

### 3.2 Navegar até a pasta do projeto

No Terminal, digite EXATAMENTE isso e pressione Enter:

```bash
cd ~/Desktop/Fitnesmatchapp
```

### 3.3 Instalar as dependências

Digite e pressione Enter:

```bash
npm install
```

**Aguarde...** Vai aparecer muitas coisas na tela. Espere até aparecer a linha de comando novamente (pode demorar 1-3 minutos).

---

## 🍎 PARTE 4: Abrir no Xcode

### 4.1 Abrir o projeto iOS

No mesmo Terminal, digite:

```bash
npx cap open ios
```

O **Xcode** vai abrir automaticamente com o projeto!

---

## ⚙️ PARTE 5: Configurar o Xcode

### 5.1 Conectar o iPhone

1. Conecte seu **iPhone 16 Pro Max** no Mac via cabo USB-C
2. No iPhone, toque em **"Confiar"** quando aparecer a mensagem
3. Digite a senha do iPhone se pedir

### 5.2 Selecionar o iPhone no Xcode

1. No **topo do Xcode**, tem um botão que mostra um dispositivo
2. Clique nele e selecione seu **iPhone** na lista
   - Se não aparecer, espere alguns segundos
   - Certifique-se que o iPhone está desbloqueado

### 5.3 Configurar a conta Apple (Signing)

1. Na **barra lateral esquerda** do Xcode, clique em **"App"** (pasta azul)
2. No painel central, clique na aba **"Signing & Capabilities"**
3. Onde diz **"Team"**, clique e selecione **"Add Account..."**
4. Faça login com sua **Apple ID** (email e senha)
5. Após logar, selecione seu nome na lista de Team
6. Se aparecer erro vermelho, clique em **"Try Again"**

### 5.4 Mudar o Bundle Identifier (se der erro)

Se aparecer erro de que o identificador já está em uso:

1. Em **"Bundle Identifier"**, mude para algo único
2. Exemplo: `com.SEUNOME.fitnessmatch`
3. Substitua SEUNOME pelo seu nome (sem espaços)

---

## ▶️ PARTE 6: Rodar o App!

### 6.1 Compilar e Instalar

1. Clique no botão **▶️ (Play)** no canto superior esquerdo do Xcode
2. Aguarde a compilação (primeira vez demora 2-5 minutos)
3. O app será instalado no seu iPhone!

### 6.2 Se aparecer erro "Untrusted Developer"

No seu **iPhone**:

1. Vá em **Ajustes**
2. Vá em **Geral**
3. Vá em **Gerenciamento de Dispositivos** (ou "VPN e Gerenc. de Dispositivos")
4. Toque no seu email de desenvolvedor
5. Toque em **"Confiar"**
6. Volte ao Xcode e clique em ▶️ novamente

---

## ✅ PRONTO!

O app FitnessMatch deve abrir no seu iPhone! 🎉

---

## ❓ Problemas Comuns

### "No devices connected"

- Certifique-se que o cabo está bem conectado
- Desbloqueie o iPhone
- Toque em "Confiar" no iPhone

### "Failed to register bundle identifier"

- Mude o Bundle Identifier para algo único
- Exemplo: `com.bruno.fitnessmatch2024`

### "Build Failed" com erros vermelhos

- Clique em **Product** → **Clean Build Folder**
- Tente rodar novamente

### O app abre e fecha imediatamente

- No iPhone, vá em Ajustes → Geral → Gerenc. de Dispositivos
- Confie no certificado

---

## 📞 Precisa de ajuda?

Tire um print do erro e me mostre! 😊
