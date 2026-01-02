
import React, { useState, useEffect, useMemo } from 'react';
import { User, UserRole } from '../types';
import { DB } from '../services/databaseService';

interface LoginPageProps {
  onLogin: (user: User) => void;
  startAtWelcome?: boolean;
}

type Mode = 'welcome' | 'selection' | 'form-register' | 'form-login' | 'extra-info' | 'admin-login';

export const LoginPage: React.FC<LoginPageProps> = ({ onLogin, startAtWelcome }) => {
  const [mode, setMode] = useState<Mode>(startAtWelcome ? 'welcome' : 'selection');
  const [role, setRole] = useState<UserRole>(UserRole.CLIENT);
  const [loading, setLoading] = useState(false);
  
  // Registration Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Login Form State
  const [loginCredential, setLoginCredential] = useState('');
  
  // Extra Info State
  const [age, setAge] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [country, setCountry] = useState('Costa Rica');
  
  const [adminUser, setAdminUser] = useState('');
  const [adminPass, setAdminPass] = useState('');
  const [error, setError] = useState('');
  const [isTransitioning, setIsTransitioning] = useState(false);

  const transitionTo = (newMode: Mode) => {
    setIsTransitioning(true);
    setTimeout(() => {
      setMode(newMode);
      setError('');
      setIsTransitioning(false);
    }, 400);
  };

  const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const validatePhoneCR = (phone: string) => phone.replace(/\D/g, '').length === 8;

  const passwordStrength = useMemo(() => {
    if (!password) return 0;
    let score = 0;
    if (password.length >= 8) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[A-Z]/.test(password) || /[^A-Za-z0-9]/.test(password)) score++;
    return score;
  }, [password]);

  const strengthLabel = useMemo(() => {
    if (!password) return '';
    if (passwordStrength === 1) return 'Fraca';
    if (passwordStrength === 2) return 'Media';
    if (passwordStrength === 3) return 'Forte';
    return 'Muito Fraca';
  }, [passwordStrength, password]);

  const strengthColor = useMemo(() => {
    if (passwordStrength === 1) return 'text-red-400';
    if (passwordStrength === 2) return 'text-orange-400';
    if (passwordStrength === 3) return 'text-green-500';
    return 'text-slate-200';
  }, [passwordStrength]);

  const handleInitialRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) return setError('Por favor ingresa tu nombre');
    if (!validatePhoneCR(phone)) return setError('Número inválido. Debe tener 8 dígitos (CR)');
    if (!validateEmail(email)) return setError('Correo electrónico no válido');
    if (passwordStrength < 2) return setError('La contraseña debe ser al menos de nivel Media (8+ carac. y números)');
    if (password !== confirmPassword) return setError('Las contraseñas no coinciden');

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      transitionTo('extra-info');
    }, 800);
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!loginCredential) return setError('Ingresa tu teléfono o correo');

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      
      const pros = DB.getPros();
      const clients = DB.getClients();
      
      const foundPro = pros.find(p => p.phone === loginCredential || p.email === loginCredential);
      const foundClient = clients.find(c => c.phone === loginCredential || c.email === loginCredential);

      if (foundPro) {
        onLogin(foundPro);
      } else if (foundClient) {
        onLogin(foundClient);
      } else {
        setError('Cuenta no encontrada. ¿Eres nuevo? Regístrate.');
      }
    }, 1200);
  };

  const handleExtraInfoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!age || !birthDate || !country) return setError('Por favor completa todos los campos');

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      const newUser: User = {
        id: `user-${Date.now()}`,
        name: name.split(' ')[0],
        lastName: name.split(' ').slice(1).join(' ') || 'User',
        role: role,
        email: email,
        phone: phone,
        phoneVerified: true,
        city: 'San José',
        status: 'active'
      };

      // PERSISTÊNCIA: Salva o usuário no DB para que possa logar depois
      DB.saveUser(newUser);
      onLogin(newUser);
    }, 1000);
  };

  const handleAdminSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      if (adminUser === 'admin' && adminPass === 'bruluga1') {
        onLogin({
          id: 'admin-01',
          name: 'Admin',
          lastName: 'Sistema',
          role: UserRole.ADMIN,
          email: 'admin@fitnessmatch.cr',
          phone: '0000-0000',
          phoneVerified: true,
          city: 'San José',
          status: 'active'
        });
      } else {
        setError('Credenciales inválidas');
      }
    }, 1000);
  };

  if (mode === 'welcome') {
    return (
      <div className={`flex-1 flex flex-col bg-white p-10 py-24 transition-all duration-300 ${isTransitioning ? 'opacity-0 scale-95' : 'animate-spring-up'}`}>
        <div className="mb-16">
          <div className="w-16 h-16 bg-black rounded-3xl flex items-center justify-center mb-10 shadow-xl">
             <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
          </div>
          <h1 className="text-5xl font-extrabold text-black tracking-tighter leading-[0.9] mb-4">Bienvenido al<br/>Club.</h1>
          <p className="text-slate-400 font-bold text-sm">Tu próxima meta empieza aquí.</p>
        </div>

        <div className="space-y-4 mt-auto">
          <button 
            onClick={() => transitionTo('selection')}
            className="w-full bg-black text-white py-7 rounded-[32px] font-black text-xs uppercase tracking-widest shadow-2xl active:scale-[0.97] transition-all"
          >
            Soy Nuevo / Unirme
          </button>
          <button 
            onClick={() => transitionTo('form-login')}
            className="w-full bg-white text-black py-7 rounded-[32px] font-black text-xs uppercase tracking-widest border-2 border-slate-100 active:scale-[0.97] transition-all"
          >
            Ya tengo cuenta / Entrar
          </button>
          <button 
            onClick={() => transitionTo('admin-login')} 
            className="w-full py-6 text-slate-200 font-black text-[9px] uppercase tracking-widest active:scale-90 transition-transform"
          >
            Acceso Corporativo
          </button>
        </div>
      </div>
    );
  }

  if (mode === 'selection') {
    return (
      <div className={`flex-1 flex flex-col bg-white p-10 py-24 transition-all duration-300 ${isTransitioning ? 'opacity-0 scale-95' : 'animate-spring-up'}`}>
        <button onClick={() => transitionTo('welcome')} className="mb-12 text-black flex items-center gap-3 active:scale-95 transition-transform group">
          <div className="w-8 h-8 rounded-full flex items-center justify-center bg-slate-50 group-hover:bg-slate-100 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path d="M15 19l-7-7 7-7"/></svg>
          </div>
          <span className="font-extrabold text-sm">Atrás</span>
        </button>

        <h2 className="text-4xl font-extrabold text-black tracking-tighter mb-8 leading-tight">¿Cómo quieres<br/>usar la App?</h2>

        <div className="space-y-3">
          <RoleButton 
            title="Soy Cliente" 
            desc="Reserva con los mejores entrenadores" 
            onClick={() => { setRole(UserRole.CLIENT); transitionTo('form-register'); }} 
          />
          <RoleButton 
            title="Soy Profesional" 
            desc="Gestiona tu carrera y clientes" 
            highlight
            onClick={() => { setRole(UserRole.TEACHER); transitionTo('form-register'); }} 
          />
        </div>
      </div>
    );
  }

  return (
    <div className={`flex-1 bg-white p-10 py-10 transition-all duration-300 overflow-y-auto no-scrollbar ${isTransitioning ? 'opacity-0 translate-y-4 scale-105' : 'animate-spring-up'}`}>
       <button onClick={() => transitionTo(mode === 'extra-info' ? 'form-register' : mode === 'form-register' ? 'selection' : 'welcome')} className="mb-8 text-black flex items-center gap-3 active:scale-95 transition-transform group">
          <div className="w-8 h-8 rounded-full flex items-center justify-center bg-slate-50 group-hover:bg-slate-100 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path d="M15 19l-7-7 7-7"/></svg>
          </div>
          <span className="font-extrabold text-sm">Volver</span>
       </button>
       
       {mode === 'form-login' && (
         <>
           <h2 className="text-4xl font-extrabold text-black tracking-tighter mb-2">Entrar</h2>
           <p className="text-slate-400 font-bold text-sm mb-12">Detectaremos tu cuenta automáticamente.</p>
           <form onSubmit={handleLoginSubmit} className="space-y-6">
             <Input label="Teléfono o Correo" type="text" placeholder="Ej. 88880000" value={loginCredential} onChange={(e: any) => setLoginCredential(e.target.value)} />
             {error && <p className="text-red-500 text-[10px] font-black uppercase tracking-widest ml-1">{error}</p>}
             <button type="submit" className="w-full bg-black text-white py-6 rounded-3xl font-black text-xs uppercase tracking-widest shadow-xl active:scale-[0.97] transition-all">
               {loading ? 'Identificando...' : 'Entrar ahora'}
             </button>
           </form>
         </>
       )}

       {mode === 'form-register' && (
         <>
           <h2 className="text-4xl font-extrabold text-black tracking-tighter mb-2">Registro</h2>
           <p className="text-slate-400 font-bold text-sm mb-8">Únete a la red más grande de CR.</p>
           <form onSubmit={handleInitialRegisterSubmit} className="space-y-5">
             <Input label="Nombre Completo" type="text" value={name} onChange={(e: any) => setName(e.target.value)} placeholder="Ej. Juan Pérez" />
             <Input label="Teléfono (8 dígitos)" type="tel" placeholder="88880000" value={phone} onChange={(e: any) => setPhone(e.target.value)} />
             <Input label="Correo Electrónico" type="email" placeholder="juan@ejemplo.com" value={email} onChange={(e: any) => setEmail(e.target.value)} />
             
             <div className="space-y-2 relative">
                <Input label="Contraseña" type="password" placeholder="••••••••" value={password} onChange={(e: any) => setPassword(e.target.value)} />
                {password && (
                  <div className="absolute right-6 top-14 flex flex-col items-end">
                    <span className={`text-[8px] font-black uppercase tracking-widest ${strengthColor}`}>{strengthLabel}</span>
                    <div className="flex gap-0.5 mt-1">
                      {[1, 2, 3].map(lvl => (
                        <div key={lvl} className={`w-3 h-1 rounded-full ${passwordStrength >= lvl ? (passwordStrength === 1 ? 'bg-red-400' : passwordStrength === 2 ? 'bg-orange-400' : 'bg-green-500') : 'bg-slate-100'}`} />
                      ))}
                    </div>
                  </div>
                )}
             </div>

             <Input label="Confirmar Contraseña" type="password" placeholder="••••••••" value={confirmPassword} onChange={(e: any) => setConfirmPassword(e.target.value)} />

             {error && <p className="text-red-500 text-[10px] font-black uppercase tracking-widest ml-1">{error}</p>}
             <button type="submit" className="w-full bg-black text-white py-6 rounded-3xl font-black text-xs uppercase tracking-widest shadow-xl active:scale-[0.97] transition-all">
               {loading ? 'Validando...' : 'Siguiente'}
             </button>
           </form>
         </>
       )}

       {mode === 'extra-info' && (
         <>
           <h2 className="text-4xl font-extrabold text-black tracking-tighter mb-2">Casi listo</h2>
           <p className="text-slate-400 font-bold text-sm mb-12">Cuéntanos un poco más sobre ti.</p>
           <form onSubmit={handleExtraInfoSubmit} className="space-y-6">
             <Input label="Edad" type="number" value={age} onChange={(e: any) => setAge(e.target.value)} placeholder="Ej. 25" />
             <Input label="Fecha de Nacimiento" type="date" value={birthDate} onChange={(e: any) => setBirthDate(e.target.value)} />
             <Input label="País" type="text" value={country} onChange={(e: any) => setCountry(e.target.value)} placeholder="Ej. Costa Rica" />
             {error && <p className="text-red-500 text-[10px] font-black uppercase tracking-widest ml-1">{error}</p>}
             <button type="submit" className="w-full bg-black text-white py-6 rounded-3xl font-black text-xs uppercase tracking-widest shadow-xl active:scale-[0.97] transition-all">
               {loading ? 'Finalizando...' : 'Comenzar ahora'}
             </button>
           </form>
         </>
       )}

       {mode === 'admin-login' && (
         <>
           <h2 className="text-4xl font-extrabold text-black tracking-tighter mb-2">Acceso Admin</h2>
           <p className="text-slate-400 font-bold text-sm mb-12">Exclusivo para personal autorizado.</p>
           <form onSubmit={handleAdminSubmit} className="space-y-6">
              <Input label="ID de Usuario" type="text" value={adminUser} onChange={(e: any) => setAdminUser(e.target.value)} placeholder="Ej. admin" />
              <Input label="Llave de Acceso" type="password" value={adminPass} onChange={(e: any) => setAdminPass(e.target.value)} placeholder="••••••••" />
              {error && <p className="text-red-500 text-[10px] font-black uppercase tracking-widest ml-1">{error}</p>}
              <button type="submit" className="w-full bg-black text-white py-6 rounded-3xl font-black text-xs uppercase tracking-widest shadow-xl active:scale-[0.97] transition-all">
                {loading ? 'Accediendo...' : 'Validar Llave'}
              </button>
           </form>
         </>
       )}
    </div>
  );
};

const RoleButton = ({ title, desc, onClick, highlight }: any) => (
  <button 
    onClick={onClick} 
    className={`w-full p-8 rounded-[36px] text-left transition-all duration-300 active:scale-[0.96] active:brightness-90 border hover:shadow-md ${highlight ? 'bg-black text-white border-black shadow-2xl' : 'bg-white text-black border-slate-100 shadow-sm'}`}
  >
     <h3 className="text-lg font-black tracking-tight">{title}</h3>
     <p className={`text-[10px] font-bold uppercase tracking-widest mt-1 transition-opacity ${highlight ? 'text-white/40' : 'text-slate-400'}`}>{desc}</p>
  </button>
);

const Input = ({ label, ...props }: any) => (
  <div className="space-y-2">
    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{label}</label>
    <input 
      {...props} 
      className="w-full bg-slate-50 border border-slate-200 rounded-[24px] py-6 px-6 font-bold text-black outline-none focus:ring-1 focus:ring-black focus:border-black transition-all placeholder:text-slate-300 shadow-inner" 
    />
  </div>
);
