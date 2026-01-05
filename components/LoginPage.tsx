import React, { useState, useMemo, useEffect } from "react";
import { User, UserRole } from "../types";
import { supabase, isSupabaseConfigured } from "../services/supabaseClient";

interface LoginPageProps {
  onLogin: (user: User) => void;
  startAtWelcome?: boolean;
}

type Mode =
  | "welcome"
  | "selection"
  | "form-register"
  | "form-login"
  | "extra-info"
  | "admin-login"
  | "verify-email"
  | "forgot-password"
  | "reset-password";

export const LoginPage: React.FC<LoginPageProps> = ({
  onLogin,
  startAtWelcome,
}) => {
  const [mode, setMode] = useState<Mode>(
    startAtWelcome ? "welcome" : "selection"
  );
  const [role, setRole] = useState<UserRole>(UserRole.CLIENT);
  const [loading, setLoading] = useState(false);

  // Registration Form State
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Login Form State
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Extra Info State
  const [age, setAge] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [country, setCountry] = useState("Costa Rica");

  // Verificação de Email
  const [verificationCode, setVerificationCode] = useState("");
  const [pendingEmail, setPendingEmail] = useState("");
  const [pendingPassword, setPendingPassword] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);

  // Recuperação de Senha
  const [resetEmail, setResetEmail] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

  const [adminUser, setAdminUser] = useState("");
  const [adminPass, setAdminPass] = useState("");
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Cooldown para reenviar código
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(
        () => setResendCooldown(resendCooldown - 1),
        1000
      );
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const transitionTo = (newMode: Mode) => {
    setIsTransitioning(true);
    setTimeout(() => {
      setMode(newMode);
      setError("");
      setSuccessMsg("");
      setIsTransitioning(false);
    }, 400);
  };

  const validateEmail = (email: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const validatePhoneCR = (phone: string) =>
    phone.replace(/\D/g, "").length === 8;

  const passwordStrength = useMemo(() => {
    if (!password) return 0;
    let score = 0;
    if (password.length >= 8) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[A-Z]/.test(password) || /[^A-Za-z0-9]/.test(password)) score++;
    return score;
  }, [password]);

  const strengthLabel = useMemo(() => {
    if (!password) return "";
    if (passwordStrength === 1) return "Débil";
    if (passwordStrength === 2) return "Media";
    if (passwordStrength === 3) return "Fuerte";
    return "Muy débil";
  }, [passwordStrength, password]);

  const strengthColor = useMemo(() => {
    if (passwordStrength === 1) return "text-red-400";
    if (passwordStrength === 2) return "text-orange-400";
    if (passwordStrength === 3) return "text-green-500";
    return "text-slate-200";
  }, [passwordStrength]);

  // ==========================================
  // LOGIN COM USUÁRIO DO SUPABASE
  // ==========================================
  const loginWithSupabaseUser = async (userId: string, userEmail: string) => {
    try {
      // Buscar perfil do usuário
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (profileError || !profile) {
        console.log("Profile not found, creating default user");
        // Se não encontrar perfil, criar usuário com dados básicos
        const defaultUser: User = {
          id: userId,
          name: name.split(" ")[0] || "Usuario",
          lastName: name.split(" ").slice(1).join(" ") || "",
          role: role,
          email: userEmail,
          phone: phone || "",
          phoneVerified: false,
          city: country || "San José",
          status: "active",
        };
        // Salvar no localStorage para persistência
        if (role === UserRole.TEACHER) {
          const pros = JSON.parse(localStorage.getItem("fm_pros_v3") || "[]");
          if (!pros.find((p: User) => p.id === userId)) {
            // Criar perfil completo de professor
            const teacherProfile = {
              ...defaultUser,
              areas: [],
              bio: "Pendiente de activación",
              location: country || "San José",
              modalities: ["presencial"],
              rating: 5,
              reviews: 0,
              image: "",
              price: 0,
              planActive: false,
              planType: undefined,
              planExpiry: undefined,
            };
            pros.push(teacherProfile);
            localStorage.setItem("fm_pros_v3", JSON.stringify(pros));
          }
        } else {
          const clients = JSON.parse(
            localStorage.getItem("fm_clients_v3") || "[]"
          );
          if (!clients.find((c: User) => c.id === userId)) {
            clients.push(defaultUser);
            localStorage.setItem("fm_clients_v3", JSON.stringify(clients));
          }
        }
        window.dispatchEvent(new CustomEvent("fm-db-update"));
        onLogin(defaultUser);
        return;
      }

      // Criar objeto de usuário
      let user: User = {
        id: profile.id,
        name: profile.name || "Usuario",
        lastName: profile.last_name || "",
        role: (profile.role as UserRole) || UserRole.CLIENT,
        email: profile.email || userEmail,
        phone: profile.phone || "",
        phoneVerified: profile.phone_verified || false,
        city: profile.city || "San José",
        status:
          (profile.status as "active" | "blocked" | "deactivated") || "active",
        image: profile.avatar_url || "",
      };

      // Se for teacher, buscar dados extras
      if (profile.role === "teacher") {
        const { data: proData } = await supabase
          .from("professionals")
          .select("*")
          .eq("user_id", userId)
          .single();

        if (proData) {
          user = {
            ...user,
            bio: proData.bio,
            location: proData.location,
            price: proData.price,
            rating: proData.rating,
            reviews: proData.reviews,
            areas: proData.areas || [],
            modalities: proData.modalities || [],
            planActive: proData.plan_active,
            planType: proData.plan_type,
            planExpiry: proData.plan_expiry,
          } as any;
        }
      }

      // Salvar no localStorage para persistência local
      saveUserToLocalStorage(user);
      onLogin(user);
    } catch (err) {
      console.error("Error loading user profile:", err);
      // Fallback - criar usuário básico
      const fallbackUser: User = {
        id: userId,
        name: "Usuario",
        lastName: "",
        role: UserRole.CLIENT,
        email: userEmail,
        phone: "",
        phoneVerified: false,
        city: "San José",
        status: "active",
      };
      saveUserToLocalStorage(fallbackUser);
      onLogin(fallbackUser);
    }
  };

  // Função para salvar usuário no localStorage
  const saveUserToLocalStorage = (user: User) => {
    if (
      user.role === UserRole.TEACHER ||
      (user as any).planActive !== undefined
    ) {
      // É um professor
      const pros = JSON.parse(localStorage.getItem("fm_pros_v3") || "[]");
      const existingIdx = pros.findIndex((p: User) => p.id === user.id);
      if (existingIdx > -1) {
        pros[existingIdx] = { ...pros[existingIdx], ...user };
      } else {
        pros.push(user);
      }
      localStorage.setItem("fm_pros_v3", JSON.stringify(pros));
    } else {
      // É um cliente
      const clients = JSON.parse(localStorage.getItem("fm_clients_v3") || "[]");
      const existingIdx = clients.findIndex((c: User) => c.id === user.id);
      if (existingIdx > -1) {
        clients[existingIdx] = { ...clients[existingIdx], ...user };
      } else {
        clients.push(user);
      }
      localStorage.setItem("fm_clients_v3", JSON.stringify(clients));
    }
    window.dispatchEvent(new CustomEvent("fm-db-update"));
  };

  // ==========================================
  // REGISTRO - PASSO 1
  // ==========================================
  const handleInitialRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) return setError("Por favor ingresa tu nombre");
    if (!validatePhoneCR(phone))
      return setError("Número inválido. Debe tener 8 dígitos (CR)");
    if (!validateEmail(email)) return setError("Correo electrónico no válido");
    if (passwordStrength < 2)
      return setError(
        "La contraseña debe ser al menos de nivel Media (8+ carac. y números)"
      );
    if (password !== confirmPassword)
      return setError("Las contraseñas no coinciden");

    transitionTo("extra-info");
  };

  // ==========================================
  // REGISTRO - PASSO 2 (CRIAR CONTA)
  // ==========================================
  const handleExtraInfoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!age || !birthDate || !country)
      return setError("Por favor completa todos los campos");

    setLoading(true);
    setError("");

    try {
      if (isSupabaseConfigured()) {
        // Registrar no Supabase
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email,
          password: password,
          options: {
            data: {
              name: name.split(" ")[0],
              last_name: name.split(" ").slice(1).join(" ") || "",
              phone: phone,
              role: role,
            },
          },
        });

        if (signUpError) {
          console.error("SignUp error:", signUpError);
          if (signUpError.message.includes("already registered")) {
            setError("Este correo ya está registrado. Intenta iniciar sesión.");
          } else {
            setError(signUpError.message);
          }
          setLoading(false);
          return;
        }

        if (data.user) {
          // Atualizar perfil com dados extras (phone, city, last_name)
          setTimeout(async () => {
            try {
              await supabase
                .from("profiles")
                .update({
                  last_name: name.split(" ").slice(1).join(" ") || "",
                  phone: phone,
                  city: country,
                })
                .eq("id", data.user!.id);
            } catch (e) {
              console.log("Profile update scheduled for after verification");
            }
          }, 500);

          // Verificar se tem sessão (email confirm desabilitado)
          if (data.session) {
            // Login direto - email confirm está desabilitado
            await loginWithSupabaseUser(data.user.id, data.user.email || email);
          } else {
            // Precisa confirmar email - Enviar OTP
            setPendingEmail(email);
            setPendingPassword(password);

            // Enviar código OTP de 6 dígitos
            const { error: otpError } = await supabase.auth.signInWithOtp({
              email: email,
              options: {
                shouldCreateUser: false,
              },
            });

            if (otpError) {
              console.log("OTP send info:", otpError.message);
            }

            setSuccessMsg("¡Te enviamos un código de 6 dígitos a tu correo!");
            setResendCooldown(60);
            transitionTo("verify-email");
          }
        }
      } else {
        // Fallback sem Supabase
        const newUser: User = {
          id: `user-${Date.now()}`,
          name: name.split(" ")[0],
          lastName: name.split(" ").slice(1).join(" ") || "User",
          role: role,
          email: email,
          phone: phone,
          phoneVerified: true,
          city: country,
          status: "active",
        };
        // Salvar no localStorage para persistência
        saveUserToLocalStorage(newUser);
        onLogin(newUser);
      }
    } catch (err: any) {
      console.error("Registration error:", err);
      setError(err.message || "Error al registrar. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // VERIFICAR CÓDIGO OTP
  // ==========================================
  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verificationCode || verificationCode.length < 5) {
      return setError("Ingresa el código del email");
    }

    setLoading(true);
    setError("");

    try {
      // Tentar verificar com OTP tipo 'email' (login com OTP)
      let success = false;

      // Primeiro, tentar tipo 'email' (para signInWithOtp)
      const { data: data1, error: error1 } = await supabase.auth.verifyOtp({
        email: pendingEmail,
        token: verificationCode,
        type: "email",
      });

      if (!error1 && data1?.user && data1?.session) {
        await loginWithSupabaseUser(
          data1.user.id,
          data1.user.email || pendingEmail
        );
        success = true;
        return;
      }

      // Se não funcionou, tentar tipo 'signup' (para confirmação de signup)
      if (!success) {
        const { data: data2, error: error2 } = await supabase.auth.verifyOtp({
          email: pendingEmail,
          token: verificationCode,
          type: "signup",
        });

        if (!error2 && data2?.user && data2?.session) {
          await loginWithSupabaseUser(
            data2.user.id,
            data2.user.email || pendingEmail
          );
          success = true;
          return;
        }

        // Se ainda não funcionou, tentar tipo 'magiclink'
        if (!success) {
          const { data: data3, error: error3 } = await supabase.auth.verifyOtp({
            email: pendingEmail,
            token: verificationCode,
            type: "magiclink",
          });

          if (!error3 && data3?.user && data3?.session) {
            await loginWithSupabaseUser(
              data3.user.id,
              data3.user.email || pendingEmail
            );
            success = true;
            return;
          }
        }
      }

      // Se nenhum funcionou, mostrar erro
      if (!success) {
        setError("Código incorrecto o expirado. Solicita uno nuevo.");
      }
    } catch (err: any) {
      console.error("Verification error:", err);
      setError("Error al verificar. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // TENTAR LOGIN APÓS CLICAR NO LINK
  // ==========================================
  const handleTryLoginAfterLink = async () => {
    setLoading(true);
    setError("");

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: pendingEmail,
        password: pendingPassword,
      });

      if (error) {
        if (error.message.includes("Email not confirmed")) {
          setError(
            "Email aún no confirmado. Revisa tu correo y haz clic en el enlace."
          );
        } else {
          setError(error.message);
        }
        setLoading(false);
        return;
      }

      if (data.user) {
        await loginWithSupabaseUser(
          data.user.id,
          data.user.email || pendingEmail
        );
      }
    } catch (err: any) {
      setError("Error al verificar. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // REENVIAR CÓDIGO
  // ==========================================
  const handleResendCode = async () => {
    if (resendCooldown > 0) return;

    setLoading(true);
    setError("");

    try {
      // Enviar novo OTP
      const { error } = await supabase.auth.signInWithOtp({
        email: pendingEmail,
        options: {
          shouldCreateUser: false,
        },
      });

      if (error) {
        console.log("OTP resend error:", error.message);
        // Tentar resend de signup
        await supabase.auth.resend({
          type: "signup",
          email: pendingEmail,
        });
      }

      setSuccessMsg("¡Código de 6 dígitos reenviado! Revisa tu correo.");
      setResendCooldown(60);
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err: any) {
      console.error("Resend error:", err);
      setError("Error al reenviar. Intenta de nuevo en unos segundos.");
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // LOGIN COM EMAIL + SENHA
  // ==========================================
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!loginEmail) return setError("Ingresa tu correo electrónico");
    if (!loginPassword) return setError("Ingresa tu contraseña");
    if (!validateEmail(loginEmail))
      return setError("Correo electrónico no válido");

    setLoading(true);

    try {
      if (isSupabaseConfigured()) {
        const { data, error: signInError } =
          await supabase.auth.signInWithPassword({
            email: loginEmail,
            password: loginPassword,
          });

        if (signInError) {
          console.error("Sign in error:", signInError);
          if (signInError.message.includes("Email not confirmed")) {
            // Email não confirmado - ir para tela de verificação
            setPendingEmail(loginEmail);
            setPendingPassword(loginPassword);

            // Tentar enviar OTP
            await supabase.auth.signInWithOtp({
              email: loginEmail,
              options: { shouldCreateUser: false },
            });

            setResendCooldown(60);
            transitionTo("verify-email");
            setLoading(false);
            return;
          } else if (signInError.message.includes("Invalid login")) {
            setError("Correo o contraseña incorrectos");
          } else {
            setError(signInError.message);
          }
          setLoading(false);
          return;
        }

        if (data.user) {
          await loginWithSupabaseUser(
            data.user.id,
            data.user.email || loginEmail
          );
        }
      } else {
        setError("Sistema no configurado. Contacta al administrador.");
      }
    } catch (err: any) {
      console.error("Login error:", err);
      setError(err.message || "Error al iniciar sesión");
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // SOLICITAR RECUPERAÇÃO DE SENHA
  // ==========================================
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) return setError("Ingresa tu correo electrónico");
    if (!validateEmail(resetEmail))
      return setError("Correo electrónico no válido");

    setLoading(true);
    setError("");

    try {
      if (isSupabaseConfigured()) {
        // Enviar email de recuperação com OTP
        const { error } = await supabase.auth.resetPasswordForEmail(
          resetEmail,
          {
            redirectTo: window.location.origin,
          }
        );

        if (error) {
          setError(error.message);
          setLoading(false);
          return;
        }
      }

      setSuccessMsg("¡Te enviamos un código de recuperación a tu correo!");
      setPendingEmail(resetEmail);
      setResendCooldown(60);
      transitionTo("reset-password");
    } catch (err: any) {
      setError("Error al enviar. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // REDEFINIR SENHA COM CÓDIGO
  // ==========================================
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!resetCode || resetCode.length < 6)
      return setError("Ingresa el código del email");
    if (!newPassword) return setError("Ingresa tu nueva contraseña");
    if (newPassword.length < 6)
      return setError("La contraseña debe tener al menos 6 caracteres");
    if (newPassword !== confirmNewPassword)
      return setError("Las contraseñas no coinciden");

    setLoading(true);
    setError("");

    try {
      if (isSupabaseConfigured()) {
        // Verificar o código OTP e atualizar a senha
        const { data, error: verifyError } = await supabase.auth.verifyOtp({
          email: pendingEmail,
          token: resetCode,
          type: "recovery",
        });

        if (verifyError) {
          if (verifyError.message.includes("expired")) {
            setError("El código ha expirado. Solicita uno nuevo.");
          } else {
            setError("Código incorrecto. Verifica e intenta de nuevo.");
          }
          setLoading(false);
          return;
        }

        // Atualizar a senha
        if (data.session) {
          const { error: updateError } = await supabase.auth.updateUser({
            password: newPassword,
          });

          if (updateError) {
            setError(updateError.message);
            setLoading(false);
            return;
          }

          setSuccessMsg("¡Contraseña actualizada con éxito!");

          // Limpar campos
          setResetCode("");
          setNewPassword("");
          setConfirmNewPassword("");
          setResetEmail("");

          // Voltar para login após 2 segundos
          setTimeout(() => {
            transitionTo("form-login");
          }, 2000);
        }
      }
    } catch (err: any) {
      console.error("Reset password error:", err);
      setError("Error al actualizar contraseña. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // LOGIN ADMIN
  // ==========================================
  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (adminUser === "admin" && adminPass === "bruluga1") {
      onLogin({
        id: "admin-01",
        name: "Admin",
        lastName: "Sistema",
        role: UserRole.ADMIN,
        email: "admin@fitnessmatch.cr",
        phone: "0000-0000",
        phoneVerified: true,
        city: "San José",
        status: "active",
      });
    } else {
      setError("Credenciales inválidas");
    }
    setLoading(false);
  };

  // ==========================================
  // TELA DE VERIFICAÇÃO DE EMAIL (OTP)
  // ==========================================
  if (mode === "verify-email") {
    return (
      <div
        className={`flex-1 flex flex-col bg-white p-10 py-12 transition-all duration-300 ${
          isTransitioning ? "opacity-0 scale-95" : "animate-spring-up"
        }`}
      >
        <button
          onClick={() => transitionTo("welcome")}
          className="mb-6 text-black flex items-center gap-3 active:scale-95 transition-transform group"
        >
          <div className="w-8 h-8 rounded-full flex items-center justify-center bg-slate-50 group-hover:bg-slate-100 transition-colors">
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth="2.5"
            >
              <path d="M15 19l-7-7 7-7" />
            </svg>
          </div>
          <span className="font-extrabold text-sm">Volver</span>
        </button>

        <div className="flex-1 flex flex-col items-center justify-center text-center">
          {/* Ícone de Email */}
          <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-[28px] flex items-center justify-center mb-6 shadow-xl shadow-blue-200">
            <span className="text-4xl">🔐</span>
          </div>

          <h2 className="text-3xl font-extrabold text-black tracking-tighter mb-2">
            Código de verificación
          </h2>
          <p className="text-slate-400 font-medium text-sm mb-1">
            Ingresa el código de 6 dígitos enviado a:
          </p>
          <p className="text-blue-600 font-bold text-base mb-8">
            {pendingEmail}
          </p>

          {successMsg && (
            <div className="mb-6 bg-green-50 border border-green-100 rounded-2xl p-4 w-full">
              <p className="text-green-600 text-[11px] font-bold text-center">
                {successMsg}
              </p>
            </div>
          )}

          {/* Campo de código OTP */}
          <form onSubmit={handleVerifyCode} className="w-full space-y-5">
            <div className="relative">
              <input
                type="text"
                maxLength={10}
                placeholder="Código del email"
                value={verificationCode}
                onChange={(e) =>
                  setVerificationCode(e.target.value.replace(/\D/g, ""))
                }
                autoFocus
                className="w-full bg-slate-50 border-2 border-slate-200 rounded-[28px] py-5 px-5 font-black text-xl text-center text-black tracking-[0.3em] outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder:text-slate-300 placeholder:text-sm placeholder:tracking-normal"
              />
              {verificationCode.length >= 6 && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2 w-7 h-7 bg-green-500 rounded-full flex items-center justify-center">
                  <svg
                    className="w-3.5 h-3.5 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth="3"
                  >
                    <path
                      d="M5 13l4 4L19 7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              )}
            </div>

            {error && (
              <div className="bg-red-50 border border-red-100 rounded-2xl p-4 w-full">
                <p className="text-red-500 text-[11px] font-bold text-center">
                  {error}
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || verificationCode.length < 5}
              className="w-full bg-black text-white py-6 rounded-3xl font-black text-xs uppercase tracking-widest shadow-xl active:scale-[0.97] transition-all disabled:opacity-50"
            >
              {loading ? "Verificando..." : "Verificar y entrar"}
            </button>
          </form>

          {/* Reenviar código */}
          <div className="mt-10 text-center">
            <p className="text-slate-300 text-[10px] font-bold uppercase tracking-widest mb-3">
              ¿No recibiste el código?
            </p>
            {resendCooldown > 0 ? (
              <p className="text-slate-400 text-sm font-bold">
                Reenviar en{" "}
                <span className="text-blue-600 font-black">
                  {resendCooldown}s
                </span>
              </p>
            ) : (
              <button
                onClick={handleResendCode}
                disabled={loading}
                className="text-blue-600 font-bold text-sm underline underline-offset-4 active:scale-95 transition-transform disabled:opacity-50"
              >
                Reenviar código
              </button>
            )}
          </div>

          {/* Link alternativo */}
          <div className="mt-6 pt-6 border-t border-slate-100 w-full">
            <button
              onClick={handleTryLoginAfterLink}
              disabled={loading}
              className="text-slate-400 text-xs font-bold uppercase tracking-widest active:scale-95 transition-transform disabled:opacity-50"
            >
              ¿Recibiste un enlace? Haz clic aquí después de verificar
            </button>
          </div>

          <p className="mt-6 text-slate-300 text-[9px] font-medium px-6">
            Revisa tu bandeja de spam si no encuentras el correo. El código
            expira en 1 hora.
          </p>
        </div>
      </div>
    );
  }

  // ==========================================
  // TELA DE ESQUECI A SENHA
  // ==========================================
  if (mode === "forgot-password") {
    return (
      <div
        className={`flex-1 flex flex-col bg-white p-10 py-16 transition-all duration-300 ${
          isTransitioning ? "opacity-0 scale-95" : "animate-spring-up"
        }`}
      >
        <button
          onClick={() => transitionTo("form-login")}
          className="mb-8 text-black flex items-center gap-3 active:scale-95 transition-transform group"
        >
          <div className="w-8 h-8 rounded-full flex items-center justify-center bg-slate-50 group-hover:bg-slate-100 transition-colors">
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth="2.5"
            >
              <path d="M15 19l-7-7 7-7" />
            </svg>
          </div>
          <span className="font-extrabold text-sm">Volver</span>
        </button>

        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-orange-500 to-red-500 rounded-[28px] flex items-center justify-center mb-6 shadow-xl shadow-orange-200">
            <span className="text-4xl">🔑</span>
          </div>

          <h2 className="text-3xl font-extrabold text-black tracking-tighter mb-2">
            Recuperar contraseña
          </h2>
          <p className="text-slate-400 font-medium text-sm mb-8 px-4">
            Ingresa tu correo y te enviaremos un código para recuperar tu
            cuenta.
          </p>

          <form onSubmit={handleForgotPassword} className="w-full space-y-5">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                Correo Electrónico
              </label>
              <input
                type="email"
                placeholder="tu@email.com"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-[24px] py-6 px-6 font-bold text-black outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all placeholder:text-slate-300"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-100 rounded-2xl p-4">
                <p className="text-red-500 text-[11px] font-bold text-center">
                  {error}
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-black text-white py-6 rounded-3xl font-black text-xs uppercase tracking-widest shadow-xl active:scale-[0.97] transition-all disabled:opacity-50"
            >
              {loading ? "Enviando..." : "Enviar código de recuperación"}
            </button>
          </form>

          <p className="mt-8 text-slate-300 text-[10px] font-bold">
            ¿Recordaste tu contraseña?{" "}
            <button
              onClick={() => transitionTo("form-login")}
              className="text-blue-600 underline"
            >
              Iniciar sesión
            </button>
          </p>
        </div>
      </div>
    );
  }

  // ==========================================
  // TELA DE REDEFINIR SENHA
  // ==========================================
  if (mode === "reset-password") {
    return (
      <div
        className={`flex-1 flex flex-col bg-white p-10 py-12 transition-all duration-300 overflow-y-auto no-scrollbar ${
          isTransitioning ? "opacity-0 scale-95" : "animate-spring-up"
        }`}
      >
        <button
          onClick={() => transitionTo("forgot-password")}
          className="mb-6 text-black flex items-center gap-3 active:scale-95 transition-transform group"
        >
          <div className="w-8 h-8 rounded-full flex items-center justify-center bg-slate-50 group-hover:bg-slate-100 transition-colors">
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth="2.5"
            >
              <path d="M15 19l-7-7 7-7" />
            </svg>
          </div>
          <span className="font-extrabold text-sm">Volver</span>
        </button>

        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-[28px] flex items-center justify-center mb-6 shadow-xl shadow-green-200">
            <span className="text-4xl">🔐</span>
          </div>

          <h2 className="text-3xl font-extrabold text-black tracking-tighter mb-2">
            Nueva contraseña
          </h2>
          <p className="text-slate-400 font-medium text-sm mb-2">
            Ingresa el código enviado a:
          </p>
          <p className="text-blue-600 font-bold text-base mb-6">
            {pendingEmail}
          </p>

          {successMsg && (
            <div className="mb-6 bg-green-50 border border-green-100 rounded-2xl p-4 w-full">
              <p className="text-green-600 text-[11px] font-bold text-center">
                {successMsg}
              </p>
            </div>
          )}

          <form onSubmit={handleResetPassword} className="w-full space-y-5">
            {/* Código de verificación */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                Código de verificación
              </label>
              <input
                type="text"
                maxLength={10}
                placeholder="Código del email"
                value={resetCode}
                onChange={(e) =>
                  setResetCode(e.target.value.replace(/\D/g, ""))
                }
                className="w-full bg-slate-50 border-2 border-slate-200 rounded-[24px] py-5 px-4 font-black text-xl text-center text-black tracking-[0.3em] outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all placeholder:text-slate-300 placeholder:text-sm placeholder:tracking-normal"
              />
            </div>

            {/* Nueva contraseña */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                Nueva contraseña
              </label>
              <input
                type="password"
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-[24px] py-5 px-6 font-bold text-black outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all placeholder:text-slate-300"
              />
            </div>

            {/* Confirmar contraseña */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                Confirmar contraseña
              </label>
              <input
                type="password"
                placeholder="••••••••"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-[24px] py-5 px-6 font-bold text-black outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all placeholder:text-slate-300"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-100 rounded-2xl p-4">
                <p className="text-red-500 text-[11px] font-bold text-center">
                  {error}
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || resetCode.length < 5}
              className="w-full bg-black text-white py-6 rounded-3xl font-black text-xs uppercase tracking-widest shadow-xl active:scale-[0.97] transition-all disabled:opacity-50"
            >
              {loading ? "Actualizando..." : "Cambiar contraseña"}
            </button>
          </form>

          {/* Reenviar código */}
          <div className="mt-6 text-center">
            <p className="text-slate-300 text-[10px] font-bold uppercase tracking-widest mb-3">
              ¿No recibiste el código?
            </p>
            {resendCooldown > 0 ? (
              <p className="text-slate-400 text-sm font-bold">
                Reenviar en{" "}
                <span className="text-orange-600 font-black">
                  {resendCooldown}s
                </span>
              </p>
            ) : (
              <button
                onClick={() => {
                  handleForgotPassword({
                    preventDefault: () => {},
                  } as React.FormEvent);
                }}
                disabled={loading}
                className="text-orange-600 font-bold text-sm underline underline-offset-4 active:scale-95 transition-transform disabled:opacity-50"
              >
                Reenviar código
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // TELA DE BOAS-VINDAS
  // ==========================================
  if (mode === "welcome") {
    return (
      <div
        className={`flex-1 flex flex-col bg-gradient-to-b from-white via-slate-50 to-white p-10 py-20 transition-all duration-500 relative overflow-hidden ${
          isTransitioning ? "opacity-0 scale-95" : "animate-spring-up"
        }`}
      >
        {/* Fundo decorativo */}
        <div className="absolute top-0 right-0 w-72 h-72 bg-blue-100/30 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-slate-100/50 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>

        <div className="mb-12 relative z-10">
          {/* Logo com fundo preto e ícone branco */}
          <div className="relative mb-10">
            <div className="w-20 h-20 bg-black rounded-[20px] flex items-center justify-center shadow-xl animate-bounce-in">
              <svg
                className="w-10 h-10 text-white"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path
                  d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>

          <h1 className="text-4xl font-extrabold text-black tracking-tighter leading-[1] mb-4 animate-slide-up">
            Bienvenido al
            <br />
            Club.
          </h1>
          <p
            className="text-slate-400 font-bold text-sm animate-fade-in"
            style={{ animationDelay: "0.2s" }}
          >
            Tu próxima meta empieza aquí.
          </p>
        </div>

        <div className="space-y-4 mt-auto relative z-10">
          <button
            onClick={() => transitionTo("selection")}
            className="w-full bg-black text-white py-7 rounded-[32px] font-black text-xs uppercase tracking-widest shadow-2xl shadow-slate-400/30 hover:shadow-slate-400/50 active:scale-[0.97] transition-all duration-300 animate-slide-up"
            style={{ animationDelay: "0.3s" }}
          >
            Soy Nuevo / Unirme
          </button>
          <button
            onClick={() => transitionTo("form-login")}
            className="w-full bg-white text-black py-7 rounded-[32px] font-black text-xs uppercase tracking-widest border-2 border-slate-100 hover:border-slate-200 hover:bg-slate-50 active:scale-[0.97] transition-all duration-300 animate-slide-up"
            style={{ animationDelay: "0.4s" }}
          >
            Ya tengo cuenta / Entrar
          </button>
          <button
            onClick={() => transitionTo("admin-login")}
            className="w-full py-6 text-slate-300 font-black text-[9px] uppercase tracking-widest active:scale-90 transition-all hover:text-slate-400 animate-fade-in"
            style={{ animationDelay: "0.5s" }}
          >
            Acceso Corporativo
          </button>
        </div>
      </div>
    );
  }

  // ==========================================
  // SELEÇÃO DE TIPO DE USUÁRIO
  // ==========================================
  if (mode === "selection") {
    return (
      <div
        className={`flex-1 flex flex-col bg-white p-10 py-24 transition-all duration-300 ${
          isTransitioning ? "opacity-0 scale-95" : "animate-spring-up"
        }`}
      >
        <button
          onClick={() => transitionTo("welcome")}
          className="mb-12 text-black flex items-center gap-3 active:scale-95 transition-transform group"
        >
          <div className="w-8 h-8 rounded-full flex items-center justify-center bg-slate-50 group-hover:bg-slate-100 transition-colors">
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth="2.5"
            >
              <path d="M15 19l-7-7 7-7" />
            </svg>
          </div>
          <span className="font-extrabold text-sm">Atrás</span>
        </button>

        <h2 className="text-4xl font-extrabold text-black tracking-tighter mb-8 leading-tight">
          ¿Cómo quieres
          <br />
          usar la App?
        </h2>

        <div className="space-y-3">
          <RoleButton
            title="Soy Cliente"
            desc="Reserva con los mejores entrenadores"
            onClick={() => {
              setRole(UserRole.CLIENT);
              transitionTo("form-register");
            }}
          />
          <RoleButton
            title="Soy Profesional"
            desc="Gestiona tu carrera y clientes"
            highlight
            onClick={() => {
              setRole(UserRole.TEACHER);
              transitionTo("form-register");
            }}
          />
        </div>
      </div>
    );
  }

  // ==========================================
  // FORMULÁRIOS
  // ==========================================
  return (
    <div
      className={`flex-1 bg-white p-10 py-10 transition-all duration-300 overflow-y-auto no-scrollbar ${
        isTransitioning
          ? "opacity-0 translate-y-4 scale-105"
          : "animate-spring-up"
      }`}
    >
      <button
        onClick={() =>
          transitionTo(
            mode === "extra-info"
              ? "form-register"
              : mode === "form-register"
              ? "selection"
              : "welcome"
          )
        }
        className="mb-8 text-black flex items-center gap-3 active:scale-95 transition-transform group"
      >
        <div className="w-8 h-8 rounded-full flex items-center justify-center bg-slate-50 group-hover:bg-slate-100 transition-colors">
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth="2.5"
          >
            <path d="M15 19l-7-7 7-7" />
          </svg>
        </div>
        <span className="font-extrabold text-sm">Volver</span>
      </button>

      {/* ========== LOGIN ========== */}
      {mode === "form-login" && (
        <>
          <h2 className="text-4xl font-extrabold text-black tracking-tighter mb-2">
            Iniciar Sesión
          </h2>
          <p className="text-slate-400 font-bold text-sm mb-12">
            Ingresa tus credenciales para acceder.
          </p>
          <form onSubmit={handleLoginSubmit} className="space-y-6">
            <Input
              label="Correo Electrónico"
              type="email"
              placeholder="tu@email.com"
              value={loginEmail}
              onChange={(e: any) => setLoginEmail(e.target.value)}
            />
            <Input
              label="Contraseña"
              type="password"
              placeholder="••••••••"
              value={loginPassword}
              onChange={(e: any) => setLoginPassword(e.target.value)}
            />
            {error && (
              <p className="text-red-500 text-[10px] font-black uppercase tracking-widest ml-1">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-black text-white py-6 rounded-3xl font-black text-xs uppercase tracking-widest shadow-xl active:scale-[0.97] transition-all disabled:opacity-50"
            >
              {loading ? "Verificando..." : "Entrar"}
            </button>
          </form>
          <button
            onClick={() => transitionTo("forgot-password")}
            className="w-full text-center text-blue-600 text-[11px] font-bold mt-6 active:scale-95 transition-transform"
          >
            ¿Olvidaste tu contraseña?
          </button>
          <p className="text-center text-slate-300 text-[10px] font-bold uppercase tracking-widest mt-6">
            ¿No tienes cuenta?{" "}
            <button
              onClick={() => transitionTo("selection")}
              className="text-blue-600 underline"
            >
              Regístrate
            </button>
          </p>
        </>
      )}

      {/* ========== REGISTRO PASO 1 ========== */}
      {mode === "form-register" && (
        <>
          <h2 className="text-4xl font-extrabold text-black tracking-tighter mb-2">
            Crear Cuenta
          </h2>
          <p className="text-slate-400 font-bold text-sm mb-8">
            Únete a la red de fitness más grande de CR.
          </p>
          <form onSubmit={handleInitialRegisterSubmit} className="space-y-5">
            <Input
              label="Nombre Completo"
              type="text"
              value={name}
              onChange={(e: any) => setName(e.target.value)}
              placeholder="Ej. Juan Pérez"
            />
            <Input
              label="Teléfono (8 dígitos)"
              type="tel"
              placeholder="88880000"
              value={phone}
              onChange={(e: any) => setPhone(e.target.value)}
            />
            <Input
              label="Correo Electrónico"
              type="email"
              placeholder="juan@ejemplo.com"
              value={email}
              onChange={(e: any) => setEmail(e.target.value)}
            />

            <div className="space-y-2 relative">
              <Input
                label="Contraseña"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e: any) => setPassword(e.target.value)}
              />
              {password && (
                <div className="absolute right-6 top-14 flex flex-col items-end">
                  <span
                    className={`text-[8px] font-black uppercase tracking-widest ${strengthColor}`}
                  >
                    {strengthLabel}
                  </span>
                  <div className="flex gap-0.5 mt-1">
                    {[1, 2, 3].map((lvl) => (
                      <div
                        key={lvl}
                        className={`w-3 h-1 rounded-full ${
                          passwordStrength >= lvl
                            ? passwordStrength === 1
                              ? "bg-red-400"
                              : passwordStrength === 2
                              ? "bg-orange-400"
                              : "bg-green-500"
                            : "bg-slate-100"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            <Input
              label="Confirmar Contraseña"
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e: any) => setConfirmPassword(e.target.value)}
            />

            {error && (
              <p className="text-red-500 text-[10px] font-black uppercase tracking-widest ml-1">
                {error}
              </p>
            )}
            <button
              type="submit"
              className="w-full bg-black text-white py-6 rounded-3xl font-black text-xs uppercase tracking-widest shadow-xl active:scale-[0.97] transition-all"
            >
              Siguiente
            </button>
          </form>
        </>
      )}

      {/* ========== REGISTRO PASO 2 (INFO EXTRA) ========== */}
      {mode === "extra-info" && (
        <>
          <h2 className="text-4xl font-extrabold text-black tracking-tighter mb-2">
            Casi listo
          </h2>
          <p className="text-slate-400 font-bold text-sm mb-12">
            Cuéntanos un poco más sobre ti.
          </p>
          <form onSubmit={handleExtraInfoSubmit} className="space-y-6">
            <Input
              label="Edad"
              type="number"
              value={age}
              onChange={(e: any) => setAge(e.target.value)}
              placeholder="Ej. 25"
            />
            <Input
              label="Fecha de Nacimiento"
              type="date"
              value={birthDate}
              onChange={(e: any) => setBirthDate(e.target.value)}
            />
            <Input
              label="País"
              type="text"
              value={country}
              onChange={(e: any) => setCountry(e.target.value)}
              placeholder="Ej. Costa Rica"
            />
            {error && (
              <p className="text-red-500 text-[10px] font-black uppercase tracking-widest ml-1">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-black text-white py-6 rounded-3xl font-black text-xs uppercase tracking-widest shadow-xl active:scale-[0.97] transition-all disabled:opacity-50"
            >
              {loading ? "Creando cuenta..." : "Comenzar ahora"}
            </button>
          </form>
        </>
      )}

      {/* ========== ADMIN LOGIN ========== */}
      {mode === "admin-login" && (
        <>
          <h2 className="text-4xl font-extrabold text-black tracking-tighter mb-2">
            Acceso Admin
          </h2>
          <p className="text-slate-400 font-bold text-sm mb-12">
            Exclusivo para personal autorizado.
          </p>
          <form onSubmit={handleAdminSubmit} className="space-y-6">
            <Input
              label="ID de Usuario"
              type="text"
              value={adminUser}
              onChange={(e: any) => setAdminUser(e.target.value)}
              placeholder="Ej. admin"
            />
            <Input
              label="Llave de Acceso"
              type="password"
              value={adminPass}
              onChange={(e: any) => setAdminPass(e.target.value)}
              placeholder="••••••••"
            />
            {error && (
              <p className="text-red-500 text-[10px] font-black uppercase tracking-widest ml-1">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-black text-white py-6 rounded-3xl font-black text-xs uppercase tracking-widest shadow-xl active:scale-[0.97] transition-all disabled:opacity-50"
            >
              {loading ? "Accediendo..." : "Validar Llave"}
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
    className={`w-full p-8 rounded-[36px] text-left transition-all duration-300 active:scale-[0.96] active:brightness-90 border hover:shadow-md ${
      highlight
        ? "bg-black text-white border-black shadow-2xl"
        : "bg-white text-black border-slate-100 shadow-sm"
    }`}
  >
    <h3 className="text-lg font-black tracking-tight">{title}</h3>
    <p
      className={`text-[10px] font-bold uppercase tracking-widest mt-1 transition-opacity ${
        highlight ? "text-white/40" : "text-slate-400"
      }`}
    >
      {desc}
    </p>
  </button>
);

const Input = ({ label, ...props }: any) => (
  <div className="space-y-2">
    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
      {label}
    </label>
    <input
      {...props}
      className="w-full bg-slate-50 border border-slate-200 rounded-[24px] py-6 px-6 font-bold text-black outline-none focus:ring-1 focus:ring-black focus:border-black transition-all placeholder:text-slate-300 shadow-inner"
    />
  </div>
);
