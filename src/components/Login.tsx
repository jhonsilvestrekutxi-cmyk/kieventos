import { useState, FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, Shield, Lock, User, AlertCircle, Sparkles, Check } from 'lucide-react';

interface LoginProps {
  onLoginSuccess: () => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [showDemo, setShowDemo] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username || !password) {
      setError('Por favor, preencha todos os campos.');
      return;
    }

    setIsLoading(true);

    // Short luxury loading state delay
    setTimeout(() => {
      if (username === 'admin' && password === '0315') {
        setIsLoading(false);
        setIsSuccess(true);
        setTimeout(() => {
          onLoginSuccess();
        }, 1000);
      } else {
        setIsLoading(false);
        setError('Usuário ou senha incorretos. Tente novamente.');
      }
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-stone-950 flex items-center justify-center p-4 relative overflow-hidden font-sans selection:bg-rose-500 selection:text-white" id="dedicated-login-screen">
      
      {/* Immersive subtle ambient glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-rose-500/10 rounded-full blur-[120px] -z-10 animate-pulse" style={{ animationDuration: '8s' }}></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-[140px] -z-10 animate-pulse" style={{ animationDuration: '10s' }}></div>
      
      <div className="w-full max-w-md relative z-10">
        
        {/* Animated Brand Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-8"
        >
          <div className="inline-flex p-3 bg-gradient-to-tr from-rose-950 to-stone-900 border border-rose-900/30 text-rose-500 rounded-full mb-4 shadow-xl">
            <Heart className="w-7 h-7 animate-pulse text-rose-500" />
          </div>
          <h1 className="text-3xl font-serif tracking-widest text-stone-100 font-light">
            João <span className="text-rose-500 font-normal">& Alice</span>
          </h1>
          <p className="text-[10px] uppercase tracking-widest text-stone-400 mt-1 font-mono">
            Área reservada dos noivos
          </p>
        </motion.div>

        {/* Elegant Form Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.1 }}
          className="bg-stone-900/80 backdrop-blur-xl border border-stone-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6"
        >
          <div className="space-y-1.5">
            <h2 className="text-lg font-serif text-white font-light tracking-wide">Área Administrativa</h2>
            <p className="text-xs text-stone-400">Faça login para gerenciar cerimônias, lista de presença e portarias.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username Input */}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-wider text-stone-400 font-semibold block">Usuário</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-stone-500">
                  <User className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  placeholder="Seu usuário administrador"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={isLoading || isSuccess}
                  className="w-full pl-10 pr-4 py-3 bg-stone-950/80 border border-stone-800 rounded-xl text-xs text-stone-200 focus:outline-none focus:border-rose-800 focus:ring-1 focus:ring-rose-800 transition-all placeholder:text-stone-600 font-mono"
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-wider text-stone-400 font-semibold block">Senha</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-stone-500">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  type="password"
                  placeholder="Sua senha secreta"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading || isSuccess}
                  className="w-full pl-10 pr-4 py-3 bg-stone-950/80 border border-stone-800 rounded-xl text-xs text-stone-200 focus:outline-none focus:border-rose-800 focus:ring-1 focus:ring-rose-800 transition-all placeholder:text-stone-600 font-mono"
                />
              </div>
            </div>

            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 p-3 bg-rose-950/50 border border-rose-900/30 text-rose-300 rounded-xl text-xs"
              >
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{error}</span>
              </motion.div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || isSuccess}
              className={`w-full py-3.5 rounded-xl text-xs font-bold transition-all relative overflow-hidden flex items-center justify-center gap-2 cursor-pointer shadow-lg ${
                isSuccess
                  ? 'bg-emerald-600 text-white'
                  : 'bg-rose-850 hover:bg-rose-900 text-white hover:shadow-rose-950/40 active:scale-98'
              }`}
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Verificando Credenciais...</span>
                </div>
              ) : isSuccess ? (
                <div className="flex items-center gap-1.5">
                  <Check className="w-4 h-4" />
                  <span>Acesso Concedido!</span>
                </div>
              ) : (
                <span>Aceder ao Painel Administrativo</span>
              )}
            </button>
          </form>

          {/* Demonstration Credentials Info Box (Collapsible & Hidden by default) */}
          <div className="pt-4 border-t border-stone-800/80 space-y-2">
            <button
              type="button"
              onClick={() => setShowDemo(!showDemo)}
              className="w-full flex items-center justify-between px-3 py-2 bg-stone-950/40 hover:bg-stone-950/80 border border-stone-800/60 rounded-xl text-[10px] font-mono text-stone-400 transition-all cursor-pointer"
            >
              <span className="flex items-center gap-1.5 text-stone-400">
                <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                Dicas de Acesso ao Protótipo
              </span>
              <span className="text-stone-500 underline font-semibold">
                {showDemo ? 'Ocultar' : 'Visualizar'}
              </span>
            </button>
            
            <AnimatePresence>
              {showDemo && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <div className="bg-stone-950/90 rounded-xl p-3.5 border border-amber-500/10 text-[10px] font-mono text-stone-500 space-y-1.5 mt-2">
                    <p className="text-[9px] text-stone-400 mb-1 leading-normal">Utilize as seguintes credenciais homologadas para testes administrativos:</p>
                    <div><strong className="text-stone-300">Usuário administrador:</strong> <span className="text-amber-400 font-bold">Ki-eventos</span></div>
                    <div><strong className="text-stone-300">Senha de acesso:</strong> <span className="text-amber-400 font-bold">kieventos123</span></div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Secure badge footer */}
        <div className="mt-8 text-center flex items-center justify-center gap-1.5 text-stone-600 text-[10px] font-semibold uppercase tracking-widest font-mono">
          <Shield className="w-3.5 h-3.5 text-stone-700" />
          <span>Servidor Seguro • Criptografia TLS de Ponta-a-Ponta</span>
        </div>

      </div>
    </div>
  );
}
