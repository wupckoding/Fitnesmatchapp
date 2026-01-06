<div align="center">
  <img src="public/logo.png" alt="FitnessMatch Logo" width="120" height="120" style="border-radius: 24px;" />
  
  # FitnessMatch
  
  **Conecta clientes con profesionales de fitness y bienestar**
  
  [![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)](https://reactjs.org/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
  [![Vite](https://img.shields.io/badge/Vite-6.0-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
  [![Supabase](https://img.shields.io/badge/Supabase-Database-3ECF8E?logo=supabase&logoColor=white)](https://supabase.com/)
  [![Capacitor](https://img.shields.io/badge/Capacitor-7.0-119EFF?logo=capacitor&logoColor=white)](https://capacitorjs.com/)
  
  [Demo Web](https://fitnessmatch.app) · [Reportar Bug](https://github.com/jbnexo/fitnessmatch/issues) · [Solicitar Feature](https://github.com/jbnexo/fitnessmatch/issues)

</div>

---

## 📱 Sobre el Proyecto

**FitnessMatch** es una plataforma innovadora que conecta a personas que buscan mejorar su salud y bienestar con profesionales certificados en fitness, yoga, nutrición y más.

### ✨ Características Principales

- 🔐 **Autenticación Segura** - Registro con verificación de email (OTP)
- 👤 **Perfiles Profesionales** - Información completa, fotos y especialidades
- 📅 **Sistema de Reservas** - Agenda horarios disponibles y confirma citas
- 💬 **Chat en Tiempo Real** - Comunicación directa con indicador de presencia online
- 🔔 **Notificaciones Push** - Alertas de reservas y mensajes (iOS/Android)
- 🎨 **Diseño Moderno** - UI/UX estilo Uber, animaciones fluidas
- 📱 **App Nativa** - Disponible para iOS y Android via Capacitor
- 🌐 **PWA** - Instalable como app web progresiva
- 👨‍💼 **Panel Admin** - Gestión completa de usuarios, planes y categorías

### 🎯 Para Quién

| Clientes | Profesionales |
|----------|---------------|
| Buscar profesionales por categoría | Gestionar perfil y disponibilidad |
| Reservar sesiones online/presencial | Aceptar o rechazar reservas |
| Chat directo con profesionales | Comunicación con clientes |
| Historial de reservas | Dashboard de ingresos |

---

## 🚀 Tecnologías

| Frontend | Backend | Mobile |
|----------|---------|--------|
| React 19 | Supabase | Capacitor 7 |
| TypeScript 5.6 | PostgreSQL | iOS (Swift) |
| Vite 6 | Row Level Security | Android (Kotlin) |
| Tailwind CSS | Supabase Auth | Push Notifications |

---

## 🛠️ Instalación

### Prerrequisitos

- Node.js 18+
- npm o yarn
- Cuenta en [Supabase](https://supabase.com)
- Xcode (para iOS) / Android Studio (para Android)

### 1. Clonar el repositorio

```bash
git clone https://github.com/jbnexo/fitnessmatch.git
cd fitnessmatch
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar variables de entorno

Crear archivo `.env` en la raíz del proyecto:

```env
# Supabase Config
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu_anon_key

# Gemini AI (opcional)
GEMINI_API_KEY=tu_api_key
```

### 4. Configurar base de datos

Ejecutar los scripts SQL en Supabase:

```bash
# En Supabase SQL Editor, ejecutar:
# 1. supabase/schema.sql
# 2. supabase/new_features.sql
```

### 5. Ejecutar en desarrollo

```bash
npm run dev
```

La app estará disponible en `http://localhost:5173`

---

## 📱 Build para Móvil

### iOS

```bash
npm run build
npx cap sync ios
npx cap open ios
```

Consultar [GUIA_IPHONE.md](GUIA_IPHONE.md) para instrucciones detalladas.

### Android

```bash
npm run build
npx cap sync android
npx cap open android
```

---

## 📂 Estructura del Proyecto

```
fitnessmatch/
├── components/          # Componentes React
│   ├── AdminDashboard.tsx
│   ├── ChatSystem.tsx
│   ├── ClientPortal.tsx
│   ├── Home.tsx
│   ├── LoginPage.tsx
│   ├── MainApp.tsx
│   ├── ProfessionalDetail.tsx
│   ├── Search.tsx
│   ├── SplashScreen.tsx
│   └── TeacherDashboard.tsx
├── services/            # Servicios y lógica
│   ├── authService.ts
│   ├── databaseService.ts
│   ├── fileUploadService.ts
│   ├── pushNotificationService.ts
│   └── supabaseClient.ts
├── supabase/            # Scripts SQL
│   ├── schema.sql
│   └── new_features.sql
├── ios/                 # Proyecto Xcode
├── android/             # Proyecto Android Studio
├── public/              # Assets estáticos
├── App.tsx              # Componente raíz
├── types.ts             # Tipos TypeScript
└── index.html           # HTML principal
```

---

## 🔧 Scripts Disponibles

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Inicia servidor de desarrollo |
| `npm run build` | Build de producción |
| `npm run preview` | Preview del build |
| `npm run lint` | Ejecuta ESLint |

---

## 🌐 Despliegue

### Vercel (Recomendado)

```bash
npm run build
# Subir carpeta dist/ a Vercel
```

### Netlify

```bash
npm run build
# Configurar publish directory: dist
```

---

## 📸 Screenshots

<div align="center">
  <table>
    <tr>
      <td align="center"><strong>Home</strong></td>
      <td align="center"><strong>Búsqueda</strong></td>
      <td align="center"><strong>Reservas</strong></td>
    </tr>
    <tr>
      <td><img src="docs/screenshots/home.png" width="200"/></td>
      <td><img src="docs/screenshots/search.png" width="200"/></td>
      <td><img src="docs/screenshots/bookings.png" width="200"/></td>
    </tr>
    <tr>
      <td align="center"><strong>Chat</strong></td>
      <td align="center"><strong>Perfil</strong></td>
      <td align="center"><strong>Admin</strong></td>
    </tr>
    <tr>
      <td><img src="docs/screenshots/chat.png" width="200"/></td>
      <td><img src="docs/screenshots/profile.png" width="200"/></td>
      <td><img src="docs/screenshots/admin.png" width="200"/></td>
    </tr>
  </table>
</div>

---

## 🤝 Contribuir

Las contribuciones son bienvenidas! Por favor:

1. Fork el proyecto
2. Crea tu Feature Branch (`git checkout -b feature/NuevaFeature`)
3. Commit tus cambios (`git commit -m 'Add: nueva feature'`)
4. Push al Branch (`git push origin feature/NuevaFeature`)
5. Abre un Pull Request

---

## 📄 Licencia

Este proyecto es propiedad de **JBNEXO**. Todos los derechos reservados.

---

<div align="center">

## 👨‍💻 Desarrollado por

<a href="https://jbnexo.com">
  <img src="https://img.shields.io/badge/JBNEXO-Desarrollo%20Web%20%26%20Apps-000000?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSIxLjUiPjxwYXRoIGQ9Ik0xMiAyTDIgN2wxMCA1IDEwLTUtMTAtNXpNMiAxN2wxMCA1IDEwLTVNMiAxMmwxMCA1IDEwLTUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPjwvc3ZnPg==" alt="JBNEXO"/>
</a>

### 🌐 [jbnexo.com](https://jbnexo.com)

<a href="https://instagram.com/brunxsousa">
  <img src="https://img.shields.io/badge/@brunxsousa-E4405F?style=for-the-badge&logo=instagram&logoColor=white" alt="Instagram"/>
</a>

---

<sub>Hecho con ❤️ en Costa Rica 🇨🇷</sub>

</div>
