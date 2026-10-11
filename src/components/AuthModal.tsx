import { useState, FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Lock, User, Phone, Sparkles, Check, 
  AlertCircle, LogIn, UserCheck, Smartphone, 
  KeyRound, Copy, Shield, Gift, Heart, ArrowRight,
  Eye, EyeOff, ShieldAlert, Clock, Mail
} from 'lucide-react';
import { ClientWeddingSaaS, WeddingConfig } from '../types';
import { INITIAL_WEDDING_CONFIG } from '../data/defaultConfig';

const luxuryWeddingHero = "/src/assets/images/luxury_wedding_hero_1782681514937.jpg";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (username: string, clientId: string) => void;
  onRegisterSuccess: (
    client: ClientWeddingSaaS, 
    user1: { username: string; pass: string }, 
    user2: { username: string; pass: string }
  ) => void;
  initialTab: 'login' | 'register';
  selectedPackage: string | null;
  userAccounts: { username: string; pass: string; clientId: string; clientName: string }[];
}

export default function AuthModal({
  isOpen,
  onClose,
  onLoginSuccess,
  onRegisterSuccess,
  initialTab,
  selectedPackage,
  userAccounts
}: AuthModalProps) {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>(initialTab);
  const [showPassword, setShowPassword] = useState(false);
  
  // Login State
  const [loginUser, setLoginUser] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoginLoading, setIsLoginLoading] = useState(false);
  const [showDemoBox, setShowDemoBox] = useState(false);

  // Register State
  const [regFirstName, setRegFirstName] = useState('');
  const [regLastName, setRegLastName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPackage, setRegPackage] = useState(selectedPackage || 'Plano Grátis');
  const [regStep, setRegStep] = useState<1 | 2 | 3>(1); // 1: Fill, 2: OTP, 3: Success Credentials
  
  // OTP state
  const [otpCode, setOtpCode] = useState('');
  const [otpError, setOtpError] = useState('');
  const [isOtpLoading, setIsOtpLoading] = useState(false);
  const [generatedOtp, setGeneratedOtp] = useState('1926'); // Static visual test OTP

  // Success credentials state
  const [generatedCreds, setGeneratedCreds] = useState<{
    user1: { username: string; pass: string; role: string };
    user2: { username: string; pass: string; role: string };
    clientName: string;
    newClientId: string;
    newClient: ClientWeddingSaaS | null;
  } | null>(null);

  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  const handleLoginSubmit = (e: FormEvent) => {
    e.preventDefault();
    setLoginError('');

    if (!loginUser || !loginPass) {
      setLoginError('Por favor, insira o usuário e a senha.');
      return;
    }

    setIsLoginLoading(true);

    setTimeout(() => {
      // Find account in allowed accounts
      const foundAccount = userAccounts.find(
        acc => acc.username.toLowerCase() === loginUser.trim().toLowerCase() && acc.pass === loginPass.trim()
      );

      if (foundAccount) {
        setIsLoginLoading(false);
        onLoginSuccess(foundAccount.username, foundAccount.clientId);
        onClose();
      } else {
        setIsLoginLoading(false);
        setLoginError('Credenciais inválidas. Verifique o usuário e tente novamente.');
      }
    }, 1200);
  };

  const handleRegisterNext = (e: FormEvent) => {
    e.preventDefault();
    if (!regFirstName || !regLastName || !regPhone) {
      setRegisterError('Por favor, preencha todos os campos obrigatórios.');
      return;
    }
    setRegisterError('');
    // Transition to OTP Validation
    setRegStep(2);
    setGeneratedOtp(String(Math.floor(1000 + Math.random() * 9000))); // Generate random OTP
  };

  const handleOtpVerify = (e: FormEvent) => {
    e.preventDefault();
    setOtpError('');

    if (otpCode !== generatedOtp && otpCode !== '1926') {
      setOtpError('Código de verificação inválido. Tente novamente ou use o código de teste sugerido.');
      return;
    }

    setIsOtpLoading(true);

    setTimeout(() => {
      setIsOtpLoading(false);

      // Generate credentials for the couple
      const cleanFirstName = regFirstName.trim().replace(/\s+/g, '').toLowerCase();
      const cleanLastName = regLastName.trim().replace(/\s+/g, '').toLowerCase();
      const rand1 = Math.floor(100 + Math.random() * 900);
      const rand2 = Math.floor(100 + Math.random() * 900);

      const user1 = {
        username: `noiva.${cleanFirstName}`,
        pass: `vows.${rand1}`,
        role: 'Noiva / Planejador 1'
      };

      const user2 = {
        username: `noivo.${cleanLastName}`,
        pass: `vows.${rand2}`,
        role: 'Noivo / Planejador 2'
      };

      const newClientId = 'client_' + Date.now();
      const coupleFullName = `${regFirstName} & ${regLastName}`;

      // Build personalized wedding config
      const customConfig: WeddingConfig = {
        ...INITIAL_WEDDING_CONFIG,
        id: 'w_' + cleanFirstName + '_' + cleanLastName,
        clientId: newClientId,
        slug: `${cleanFirstName}-${cleanLastName}`,
        isFirstLogin: true,
        brideGroom: {
          ...INITIAL_WEDDING_CONFIG.brideGroom,
          brideName: regFirstName,
          brideFullName: `${regFirstName} Maria ${regLastName}`,
          groomName: 'Parceiro(a)',
          groomFullName: `Parceiro(a) de ${regFirstName}`,
        },
        venue: {
          ...INITIAL_WEDDING_CONFIG.venue,
          ceremonyName: 'Santuário de Votos Elegantes',
          receptionName: 'Villa dos Noivos Luxury',
        }
      };

      // Create new client object
      const newClient: ClientWeddingSaaS = {
        id: newClientId,
        clientName: coupleFullName,
        clientEmail: `${cleanFirstName}@kutxi.com`,
        weddingDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 6 months in future
        plan: regPackage === 'Plano Luxo' ? 'Luxury' : regPackage === 'Plano Premium' ? 'Premium' : regPackage === 'Plano Essencial' ? 'Basic' : 'Basic',
        status: regPackage === 'Plano Grátis' ? 'Trial' : 'Active',
        revenue: regPackage === 'Plano Luxo' ? 499 : regPackage === 'Plano Premium' ? 299 : regPackage === 'Plano Essencial' ? 99 : 0,
        config: customConfig
      };

      setGeneratedCreds({
        user1,
        user2,
        clientName: coupleFullName,
        newClientId,
        newClient
      });

      setRegStep(3);
    }, 1500);
  };

  const handleFinishRegistration = () => {
    if (generatedCreds && generatedCreds.newClient) {
      onRegisterSuccess(
        generatedCreds.newClient,
        { username: generatedCreds.user1.username, pass: generatedCreds.user1.pass },
        { username: generatedCreds.user2.username, pass: generatedCreds.user2.pass }
      );
      // Automatically log them in under the first user
      onLoginSuccess(generatedCreds.user1.username, generatedCreds.newClientId);
      onClose();
    }
  };

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900 z-50 overflow-y-auto flex flex-col lg:flex-row font-sans">
      
      {/* Left Column - Bigprint-style Brand Showcase adapted for Kutxi */}
      <div 
        className="hidden lg:flex lg:w-1/2 xl:w-[55%] relative flex-col justify-between p-12 overflow-hidden text-white min-h-screen"
      >
        {/* Background Image with Dark Overlays */}
        <div 
          className="absolute inset-0 bg-cover bg-center transition-all duration-700 hover:scale-105"
          style={{ backgroundImage: `url(${luxuryWeddingHero})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/80 to-slate-900/60" />

        {/* Content Overlay */}
        <div className="relative z-10 flex flex-col justify-between h-full space-y-12">
          {/* Header Branding */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-500 to-amber-500 flex items-center justify-center font-bold text-white shadow-lg border border-white/10">
              K
            </div>
            <div>
              <h3 className="text-sm font-black text-white tracking-widest font-sans uppercase">Kutxi <span className="text-rose-400 font-serif lowercase italic">SaaS</span></h3>
              <p className="text-[10px] text-slate-300 font-mono tracking-widest uppercase font-semibold">Plataforma Digital de Casamentos</p>
            </div>
          </div>

          {/* Central Message & Slogan */}
          <div className="space-y-6 max-w-xl">
            <h1 className="text-3xl xl:text-4xl font-serif font-light text-white tracking-tight leading-tight">
              O amor está nos detalhes. <br />
              <span className="font-semibold text-rose-300">O controle também.</span>
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed font-light">
              O Cockpit Inteligente da Kutxi ajuda noivos e planejadores a gerenciar convidados, organizar orçamentos, aprovar recados, gerenciar listas de presentes e moderar fotos do grande dia com total elegância e simplicidade.
            </p>

            {/* Metrics cards styled like Bigprint's "+32%" month summary card */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
              <div className="bg-slate-900/70 backdrop-blur-md border border-white/10 p-4 rounded-2xl space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-mono tracking-wider text-slate-400 uppercase font-semibold">Resumo do Mês</span>
                  <span className="text-[9px] bg-rose-500/10 text-rose-300 border border-rose-500/25 px-1.5 py-0.5 rounded font-bold font-mono">+32%</span>
                </div>
                <strong className="text-sm text-slate-200 block font-serif">Casamentos Ativos</strong>
                <div className="flex items-baseline gap-1">
                  <span className="text-emerald-400 font-bold font-mono text-base">+124</span>
                  <span className="text-[9px] text-slate-500 font-mono">esta semana</span>
                </div>
                {/* Visual sparkline simulation */}
                <div className="flex items-end gap-1 h-6 pt-1">
                  <div className="bg-white/10 w-full h-1.5 rounded-full"></div>
                  <div className="bg-white/10 w-full h-3 rounded-full"></div>
                  <div className="bg-white/10 w-full h-2 rounded-full"></div>
                  <div className="bg-rose-500 w-full h-4.5 rounded-full animate-pulse"></div>
                </div>
              </div>

              <div className="bg-slate-900/70 backdrop-blur-md border border-white/10 p-4 rounded-2xl flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-mono tracking-wider text-slate-400 uppercase font-semibold">Volume Transacionado</span>
                  <strong className="text-base font-mono block text-white mt-1">Kz 24M+</strong>
                </div>
                <div className="text-[9.5px] text-slate-400 flex items-center gap-1">
                  <Shield className="w-3 h-3 text-emerald-400 shrink-0" />
                  <span>Ambiente financeiro seguro</span>
                </div>
              </div>
            </div>
          </div>

          {/* Bullet Features (Visão 360) */}
          <div className="space-y-3 max-w-lg">
            <div className="flex items-start gap-2.5 text-xs text-slate-300">
              <div className="w-4.5 h-4.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">✓</div>
              <span><strong>Controle de Convidados (RSVP 360):</strong> Confirmação em tempo real e atualização instantânea de presença.</span>
            </div>
            <div className="flex items-start gap-2.5 text-xs text-slate-300">
              <div className="w-4.5 h-4.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">✓</div>
              <span><strong>Mural Coletivo Moderado:</strong> Aprovação rápida de fotos e recados para proteger o evento.</span>
            </div>
            <div className="flex items-start gap-2.5 text-xs text-slate-300">
              <div className="w-4.5 h-4.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">✓</div>
              <span><strong>Lista de Presentes:</strong> Integração com saque PIX e transferência de valores simplificada.</span>
            </div>
          </div>

          {/* Bottom Copyright */}
          <div className="text-[10px] text-slate-500 flex justify-between items-center border-t border-white/5 pt-4">
            <span>© 2026 Kutxi S.A. Todos os direitos reservados.</span>
            <span className="hover:underline cursor-pointer">Segurança e Privacidade</span>
          </div>
        </div>
      </div>

      {/* Right Column - Beautiful crisp white card login panel */}
      <div className="flex-1 bg-slate-50 flex flex-col justify-between p-6 md:p-12 relative min-h-screen">
        
        {/* Top bar with Close button and Language selector */}
        <div className="flex justify-between items-center w-full max-w-md mx-auto mb-6">
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-full text-xs transition-all cursor-pointer shadow-xs font-semibold"
          >
            <X className="w-3.5 h-3.5 text-slate-500" />
            <span>Voltar ao site</span>
          </button>

          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-full text-[10px] font-semibold shadow-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
            Português (AO)
          </div>
        </div>

        {/* Central Card Container */}
        <div className="w-full max-w-md mx-auto my-auto">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-[32px] border border-slate-200/80 p-6 md:p-8 shadow-xl space-y-6"
          >
            {/* Header Title inside card */}
            <div className="space-y-1.5">
              <h2 className="text-xl md:text-2xl font-serif text-slate-900 tracking-tight font-bold">
                {activeTab === 'login' ? 'Aceder à Plataforma' : 'Criar Conta Casal'}
              </h2>
              <p className="text-[11px] text-slate-500 leading-relaxed font-light">
                {activeTab === 'login' 
                  ? 'Introduza as suas credenciais para gerir o seu casamento ou painel administrativo.'
                  : 'Registe um novo casal para iniciar o cockpit de casamentos Kutxi.'}
              </p>
            </div>

            {/* Quick switcher tabs inside card */}
            {regStep === 1 && (
              <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => { setActiveTab('login'); setLoginError(''); }}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    activeTab === 'login' 
                      ? 'bg-white text-slate-900 shadow-xs border border-slate-200/50' 
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Entrar
                </button>
                <button
                  type="button"
                  onClick={() => { setActiveTab('register'); setRegPackage(selectedPackage || 'Plano Grátis'); }}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    activeTab === 'register' 
                      ? 'bg-white text-slate-900 shadow-xs border border-slate-200/50' 
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Registrar Casal
                </button>
              </div>
            )}

            {/* LOGIN FORM */}
            {activeTab === 'login' && (
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] uppercase tracking-wider text-slate-500 font-bold block">Usuário de Acesso</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                      <User className="w-4 h-4" />
                    </span>
                    <input
                      type="text"
                      required
                      placeholder="Ex: usuário do casal ou e-mail"
                      value={loginUser}
                      onChange={(e) => setLoginUser(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-slate-400 focus:bg-white rounded-xl text-xs text-slate-800 focus:outline-none transition-all font-mono placeholder:text-slate-400"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-[9px] uppercase tracking-wider text-slate-500 font-bold block">Palavra-passe</label>
                    <button 
                      type="button"
                      className="text-[9.5px] text-rose-600 hover:underline font-bold" 
                      onClick={() => setLoginError('Dica de acesso: Utilize o e-mail ou nome cadastrado durante a criação da conta dos noivos.')}
                    >
                      Esqueceu a senha?
                    </button>
                  </div>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                      <Lock className="w-4 h-4" />
                    </span>
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      placeholder="Introduza a sua senha"
                      value={loginPass}
                      onChange={(e) => setLoginPass(e.target.value)}
                      className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 focus:border-slate-400 focus:bg-white rounded-xl text-xs text-slate-800 focus:outline-none transition-all font-mono placeholder:text-slate-400"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Remember me option */}
                <label className="flex items-center gap-2 text-[11px] text-slate-500 select-none cursor-pointer">
                  <input 
                    type="checkbox" 
                    defaultChecked 
                    className="rounded border-slate-300 text-rose-600 focus:ring-rose-500 w-3.5 h-3.5"
                  />
                  <span>Lembrar-me por 30 dias neste dispositivo</span>
                </label>

                {loginError && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-150 text-red-700 rounded-xl text-xs">
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-500 animate-bounce" />
                    <span>{loginError}</span>
                  </div>
                )}

                {notification && (
                  <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-150 text-emerald-800 rounded-xl text-xs">
                    <Sparkles className="w-4 h-4 shrink-0 text-emerald-500 animate-pulse" />
                    <span>{notification}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoginLoading}
                  className="w-full py-3 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isLoginLoading ? (
                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <Lock className="w-3.5 h-3.5" />
                      <span>ENTRAR NO SISTEMA</span>
                    </>
                  )}
                </button>

                {/* Registered accounts preview for demonstration without showing super admin */}
                {userAccounts.filter(acc => acc.username !== 'Ki-eventos').length > 0 && (
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => setShowDemoBox(!showDemoBox)}
                      className="w-full flex items-center justify-between px-3.5 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-[10px] font-mono text-slate-500 transition-all cursor-pointer"
                    >
                      <span className="flex items-center gap-1.5">
                        <KeyRound className="w-3.5 h-3.5 text-rose-500" />
                        Casais registrados neste navegador
                      </span>
                      <span className="text-slate-400 underline">
                        {showDemoBox ? 'Fechar' : 'Ver'}
                      </span>
                    </button>

                    {showDemoBox && (
                      <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 text-[10px] font-mono text-slate-500 space-y-1.5 max-h-[140px] overflow-y-auto mt-2">
                        {userAccounts.filter(acc => acc.username !== 'Ki-eventos').map((acc, idx) => (
                          <div 
                            key={idx} 
                            onClick={() => {
                              setLoginUser(acc.username);
                              setLoginPass(acc.pass);
                            }}
                            className="flex flex-col text-[9px] bg-white p-2 rounded border border-slate-200/70 hover:border-rose-400 cursor-pointer transition-colors"
                          >
                            <span className="text-slate-800 font-bold">{acc.clientName}:</span>
                            <span className="text-slate-600">Usuário: <strong className="text-rose-700">{acc.username}</strong></span>
                            <span className="text-slate-400 text-[8.5px] mt-0.5">Clique para preencher</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </form>
            )}

            {/* REGISTER VIEW - STEP 1: INPUT DATA */}
            {activeTab === 'register' && regStep === 1 && (
              <form onSubmit={handleRegisterNext} className="space-y-4">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-2">
                  <div>
                    <span className="text-[9px] uppercase text-slate-500 font-bold block">Plano Comercial</span>
                    <strong className="text-rose-600 text-xs font-bold">{regPackage}</strong>
                  </div>
                  <select
                    value={regPackage}
                    onChange={(e) => setRegPackage(e.target.value)}
                    className="px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-[10px] text-slate-600 focus:outline-none cursor-pointer font-semibold shadow-xs"
                  >
                    <option value="Plano Grátis">Plano Grátis (0,00 Kz)</option>
                    <option value="Plano Essencial">Plano Essencial (45.000,00 Kz)</option>
                    <option value="Plano Premium">Plano Premium (135.000,00 Kz)</option>
                    <option value="Plano Luxo">Plano Luxo (225.000,00 Kz)</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[9px] uppercase text-slate-500 font-bold block">Seu Nome</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Carlos"
                      value={regFirstName}
                      onChange={(e) => setRegFirstName(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-slate-400 focus:bg-white placeholder:text-slate-400"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] uppercase text-slate-500 font-bold block">Seu Sobrenome</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Mota"
                      value={regLastName}
                      onChange={(e) => setRegLastName(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-slate-400 focus:bg-white placeholder:text-slate-400"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] uppercase text-slate-500 font-bold block">Contacto WhatsApp (DDI + Celular)</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                      <Phone className="w-3.5 h-3.5" />
                    </span>
                    <input
                      type="tel"
                      required
                      placeholder="Ex: +244 923 000 000"
                      value={regPhone}
                      onChange={(e) => setRegPhone(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-slate-400 focus:bg-white placeholder:text-slate-400 font-mono"
                    />
                  </div>
                </div>

                <div className="p-3 bg-rose-50/50 rounded-xl text-[10px] text-slate-500 leading-normal flex items-start gap-2 border border-rose-100">
                  <Smartphone className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <span>
                    Para validação rápida da sua inscrição, um código de verificação seguro (OTP) será simulado como enviado ao seu WhatsApp.
                  </span>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                >
                  <span>Solicitar Código de Validação</span>
                  <ArrowRight className="w-4 h-4 text-rose-200" />
                </button>
              </form>
            )}

            {/* REGISTER VIEW - STEP 2: OTP CONFIRMATION */}
            {activeTab === 'register' && regStep === 2 && (
              <form onSubmit={handleOtpVerify} className="space-y-5">
                <div className="text-center space-y-2 py-2">
                  <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-100 animate-bounce">
                    <Smartphone className="w-6 h-6" />
                  </div>
                  <h3 className="text-slate-900 font-semibold text-sm">Verifique seu WhatsApp!</h3>
                  <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                    Enviamos o código OTP para o contato <strong className="text-slate-800 font-mono">{regPhone}</strong>
                  </p>
                </div>

                {/* Dynamic Mock OTP suggestion box */}
                <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-2xl text-center space-y-1">
                  <span className="text-[9px] font-mono font-bold tracking-wider text-amber-600 uppercase block">Notificação Simulada do WhatsApp</span>
                  <p className="text-xs text-slate-700 font-semibold leading-relaxed">
                    📱 Mensagem recebida! Seu código de acesso Kutxi é: <strong className="text-amber-600 font-mono text-sm underline select-all">{generatedOtp}</strong>
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] uppercase text-slate-500 font-bold tracking-wider block text-center">Inserir Código OTP (4 dígitos)</label>
                  <input
                    type="text"
                    required
                    maxLength={4}
                    placeholder="• • • •"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    className="w-32 mx-auto text-center py-3 bg-slate-50 border-2 border-slate-200 focus:border-slate-400 rounded-2xl text-lg font-bold font-mono tracking-widest text-slate-800 block focus:outline-none focus:bg-white"
                  />
                </div>

                {otpError && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-150 text-red-700 rounded-xl text-xs">
                    <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                    <span>{otpError}</span>
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setRegStep(1)}
                    className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl text-xs cursor-pointer border border-slate-200"
                  >
                    Voltar
                  </button>
                  <button
                    type="submit"
                    disabled={isOtpLoading}
                    className="flex-2 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                  >
                    {isOtpLoading ? (
                      <div className="w-4 h-4 border-2 border-slate-800/20 border-t-slate-800 rounded-full animate-spin"></div>
                    ) : (
                      <>
                        <UserCheck className="w-4 h-4" />
                        <span>Validar OTP</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* REGISTER VIEW - STEP 3: SUCCESS & GENERATED CREDENTIALS */}
            {activeTab === 'register' && regStep === 3 && generatedCreds && (
              <div className="space-y-5">
                <div className="text-center space-y-2 py-1">
                  <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-150 animate-pulse">
                    <Check className="w-6 h-6" />
                  </div>
                  <h3 className="text-slate-900 font-serif font-semibold text-base">Inscrição Validada! ✓</h3>
                  <p className="text-[11px] text-emerald-600 font-bold">
                    Casamento {generatedCreds.clientName} ativado com sucesso!
                  </p>
                  <p className="text-[10px] text-slate-500 leading-normal max-w-xs mx-auto font-light">
                    Como solicitado, geramos <strong>dois usuários e senhas exclusivos</strong> para que o casal possa gerenciar o evento em sincronia.
                  </p>
                </div>

                {/* Dynamic credentials cards */}
                <div className="space-y-3">
                  {/* User 1: Bride */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2 relative group hover:border-rose-200 transition-all">
                    <div className="flex justify-between items-center pb-1 border-b border-slate-200/50">
                      <span className="text-[9px] font-bold text-rose-600 uppercase tracking-wider">{generatedCreds.user1.role}</span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(`${generatedCreds.user1.username} | ${generatedCreds.user1.pass}`, 1)}
                        className="text-[9px] text-slate-500 hover:text-rose-600 flex items-center gap-1 cursor-pointer"
                      >
                        <Copy className="w-3 h-3" />
                        {copiedIndex === 1 ? 'Copiado!' : 'Copiar'}
                      </button>
                    </div>
                    <div className="text-[11px] font-mono space-y-1 text-slate-700">
                      <div><span className="text-slate-400 font-semibold">Usuário:</span> <span className="text-slate-800 font-bold select-all">{generatedCreds.user1.username}</span></div>
                      <div><span className="text-slate-400 font-semibold">Senha de Acesso:</span> <span className="text-amber-600 font-bold select-all">{generatedCreds.user1.pass}</span></div>
                    </div>
                  </div>

                  {/* User 2: Groom */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2 relative group hover:border-indigo-200 transition-all">
                    <div className="flex justify-between items-center pb-1 border-b border-slate-200/50">
                      <span className="text-[9px] font-bold text-indigo-600 uppercase tracking-wider">{generatedCreds.user2.role}</span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(`${generatedCreds.user2.username} | ${generatedCreds.user2.pass}`, 2)}
                        className="text-[9px] text-slate-500 hover:text-indigo-600 flex items-center gap-1 cursor-pointer"
                      >
                        <Copy className="w-3 h-3" />
                        {copiedIndex === 2 ? 'Copiado!' : 'Copiar'}
                      </button>
                    </div>
                    <div className="text-[11px] font-mono space-y-1 text-slate-700">
                      <div><span className="text-slate-400 font-semibold">Usuário:</span> <span className="text-slate-800 font-bold select-all">{generatedCreds.user2.username}</span></div>
                      <div><span className="text-slate-400 font-semibold">Senha de Acesso:</span> <span className="text-amber-600 font-bold select-all">{generatedCreds.user2.pass}</span></div>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl text-[10px] text-slate-500 leading-relaxed border border-slate-200/80">
                  ⚠️ <strong className="text-slate-700">Dica:</strong> Salve estas credenciais. Você poderá utilizá-las no menu de login do site a qualquer momento para entrar no Painel dos Noivos personalizado.
                </div>

                <button
                  onClick={handleFinishRegistration}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                >
                  <span>Entrar no Painel dos Noivos</span>
                  <Heart className="w-4 h-4 fill-white/20" />
                </button>
              </div>
            )}

          </motion.div>
        </div>

        {/* Safe Environment Footer block */}
        <div className="w-full max-w-md mx-auto mt-6 bg-slate-100 rounded-2xl border border-slate-200 p-3.5 flex gap-3 text-left">
          <Shield className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" />
          <div>
            <strong className="text-[9px] text-slate-800 block font-bold uppercase tracking-wider">Ambiente seguro</strong>
            <p className="text-[9px] text-slate-500 leading-normal font-light">
              Os seus dados estão protegidos com encriptação SSL de ponta a ponta e conformidade com as melhores práticas de privacidade de dados.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
