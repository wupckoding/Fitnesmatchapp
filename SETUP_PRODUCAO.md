# 🚀 FitnessMatch - Guia de Setup para Produção

Este guia explica como configurar o app para produção e publicar nas lojas (App Store e Play Store).

---

## 📋 Pré-requisitos

- Node.js 18+
- Conta no [Supabase](https://supabase.com) (gratuito)
- Android Studio (para Android)
- Xcode (para iOS - precisa de Mac)
- Conta de desenvolvedor Apple ($99/ano) - para App Store
- Conta de desenvolvedor Google ($25 único) - para Play Store

---

## 1️⃣ Configurar Supabase

### 1.1 Criar Projeto
1. Acesse [app.supabase.com](https://app.supabase.com)
2. Clique em **New Project**
3. Escolha um nome (ex: `fitnessmatch-prod`)
4. Selecione a região mais próxima (para Costa Rica: `us-east-1`)
5. Crie uma senha forte para o banco de dados
6. Aguarde a criação (~2 minutos)

### 1.2 Executar o Schema
1. No painel do Supabase, vá em **SQL Editor**
2. Clique em **New Query**
3. Cole todo o conteúdo do arquivo `supabase/schema.sql`
4. Clique em **Run** (ou Ctrl+Enter)
5. Verifique se não houve erros

### 1.3 Obter Credenciais
1. Vá em **Settings** → **API**
2. Copie:
   - **Project URL** (ex: `https://xxxxx.supabase.co`)
   - **anon public key** (a chave pública, não a secreta!)

### 1.4 Configurar Autenticação
1. Vá em **Authentication** → **Providers**
2. Habilite os provedores desejados:
   - ✅ Email (já vem habilitado)
   - ✅ Phone (opcional, precisa configurar Twilio)
   - ✅ Google (opcional)
3. Em **URL Configuration**, configure:
   - Site URL: `https://seudominio.com` (ou `capacitor://localhost` para o app)
   - Redirect URLs: adicione `capacitor://localhost`

---

## 2️⃣ Configurar Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto:

```bash
# Supabase
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anon-aqui

# Gemini AI (opcional)
GEMINI_API_KEY=sua-chave-gemini
```

---

## 3️⃣ Testar Localmente

```bash
# Instalar dependências
npm install

# Rodar em desenvolvimento
npm run dev

# Acessar http://localhost:3000
```

---

## 4️⃣ Build para Produção

### 4.1 Build Web (PWA)
```bash
npm run build
```

O resultado estará em `/dist`. Você pode fazer deploy em:
- **Vercel**: `npx vercel`
- **Netlify**: arraste a pasta `/dist` para o dashboard
- **Firebase Hosting**: `firebase deploy`

### 4.2 Build Android
```bash
# Build e sincronizar
npm run build:android

# Abrir no Android Studio
npm run open:android
```

No Android Studio:
1. Aguarde o Gradle sincronizar
2. Vá em **Build** → **Generate Signed Bundle / APK**
3. Escolha **Android App Bundle** (recomendado para Play Store)
4. Crie ou use um keystore existente
5. Build o release

### 4.3 Build iOS
```bash
# Build e sincronizar
npm run build:ios

# Abrir no Xcode
npm run open:ios
```

No Xcode:
1. Selecione o device **Any iOS Device**
2. Vá em **Product** → **Archive**
3. Após o archive, clique em **Distribute App**
4. Escolha **App Store Connect**
5. Faça upload

---

## 5️⃣ Publicar na Google Play Store

### 5.1 Preparação
1. Acesse [Google Play Console](https://play.google.com/console)
2. Crie um novo app
3. Preencha as informações:
   - Nome: FitnessMatch
   - Idioma: Espanhol (Costa Rica)
   - Tipo: App
   - Categoria: Saúde e Fitness

### 5.2 Assets Necessários
- Ícone: 512x512 PNG
- Feature Graphic: 1024x500 PNG
- Screenshots: mínimo 2 por tipo de dispositivo
- Descrição curta: max 80 caracteres
- Descrição completa: max 4000 caracteres

### 5.3 Upload
1. Vá em **Release** → **Production**
2. Clique em **Create new release**
3. Faça upload do `.aab` gerado
4. Preencha as notas de versão
5. Revise e publique

---

## 6️⃣ Publicar na Apple App Store

### 6.1 Preparação
1. Acesse [App Store Connect](https://appstoreconnect.apple.com)
2. Clique em **My Apps** → **+** → **New App**
3. Preencha:
   - Plataforma: iOS
   - Nome: FitnessMatch
   - Idioma principal: Espanhol (Costa Rica)
   - Bundle ID: cr.fitnessmatch.app
   - SKU: fitnessmatch001

### 6.2 Assets Necessários
- Ícone: 1024x1024 PNG (sem transparência)
- Screenshots para cada tamanho de iPhone
- Preview video (opcional)
- Descrição, palavras-chave, etc.

### 6.3 Upload
1. Após fazer Archive no Xcode, clique em **Distribute App**
2. Escolha **App Store Connect** → **Upload**
3. No App Store Connect, selecione o build
4. Preencha todas as informações
5. Envie para revisão (Review)

---

## 7️⃣ Configurações Adicionais

### Push Notifications (Android)
1. Crie um projeto no [Firebase Console](https://console.firebase.google.com)
2. Baixe o `google-services.json`
3. Coloque em `android/app/`
4. Configure no Supabase: **Settings** → **Push Notifications**

### Push Notifications (iOS)
1. No Apple Developer, crie um APNs Key
2. Baixe o arquivo `.p8`
3. Configure no Supabase com o Key ID e Team ID

### Deep Links
1. Configure Associated Domains no Xcode
2. Adicione o arquivo `/.well-known/apple-app-site-association` no seu servidor web
3. Configure intent filters no `AndroidManifest.xml`

---

## 📊 Monitoramento

### Analytics
- Configure o [Google Analytics](https://analytics.google.com) ou [Mixpanel](https://mixpanel.com)

### Crash Reporting
- Configure o [Sentry](https://sentry.io) ou [Firebase Crashlytics](https://firebase.google.com/products/crashlytics)

### Performance
- Use o [Lighthouse](https://pagespeed.web.dev) para PWA
- Use o Android Vitals e Xcode Instruments

---

## 🔒 Checklist de Segurança

- [ ] Variáveis de ambiente NÃO estão no código
- [ ] Row Level Security (RLS) está ativo no Supabase
- [ ] HTTPS está configurado em produção
- [ ] Chaves de API estão protegidas
- [ ] Validação de entrada no frontend E backend
- [ ] Rate limiting configurado no Supabase

---

## 📞 Suporte

Para dúvidas sobre a implementação:
- Documentação Supabase: https://supabase.com/docs
- Documentação Capacitor: https://capacitorjs.com/docs
- Documentação Apple: https://developer.apple.com/documentation
- Documentação Google Play: https://developer.android.com/distribute

---

## 🎉 Pronto!

Seu app FitnessMatch está pronto para produção. 

**Próximos passos sugeridos:**
1. Testar exaustivamente antes de publicar
2. Configurar analytics desde o início
3. Preparar materiais de marketing
4. Planejar estratégia de lançamento
