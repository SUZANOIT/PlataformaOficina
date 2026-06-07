import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSaaSAuth } from '../../hooks/useSaaSAuth';
import { SaaSAPIService } from '../../services/saas';
import { Mail, Lock, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export function Login() {
  const { login } = useSaaSAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Informe o e-mail e a senha administrativa.');
      return;
    }

    setIsLoading(true);
    try {
      const data = await SaaSAPIService.login({ email, password });
      login(data.token, data.user);
      navigate('/administracao/dashboard');
    } catch (error: any) {
      console.error(error);
      const errMsg = error.response?.data?.error || 'Erro ao realizar login administrativo. Verifique suas credenciais.';
      toast.error(errMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const backgroundStyle = {
    backgroundColor: '#0a0a0c',
    backgroundImage: `
      radial-gradient(circle at center, rgba(38, 40, 48, 0.45) 0%, rgba(6, 6, 8, 0.98) 100%),
      url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' opacity='0.15' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")
    `,
  };

  return (
    <div 
      className="flex h-screen w-screen items-center justify-center font-inter relative overflow-hidden"
      style={backgroundStyle}
    >
      <div className="w-full max-w-md p-6 relative z-10">
        
        {/* Branding Header matching the uploaded design */}
        <div className="flex flex-col items-center mb-10 select-none">
          <div className="flex items-center gap-4">
            {/* SVG Logo Icon */}
            <svg 
              viewBox="0 0 100 100" 
              className="h-16 w-16 drop-shadow-[0_4px_20px_rgba(255,121,0,0.25)]"
              fill="none" 
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Top-left white cap */}
              <path 
                d="M 25 62 A 28 28 0 0 1 75 38 C 65 37, 44 45, 25 62 Z" 
                fill="#FFFFFF" 
              />
              {/* Bottom-right white cap */}
              <path 
                d="M 75 38 A 28 28 0 0 1 25 62 C 35 63, 56 55, 75 38 Z" 
                fill="#FFFFFF" 
              />
              {/* Orange middle leaf/wave */}
              <path 
                d="M 16 66 C 36 50, 58 36, 84 26 C 64 46, 42 60, 16 66 Z" 
                fill="#FF7900" 
              />
            </svg>

            {/* Logo Text */}
            <h1 className="text-[44px] font-outfit font-black tracking-tight text-white flex items-center leading-none">
              <span>Suzano</span>
              <span className="text-[#FF7900] ml-1">IT</span>
            </h1>
          </div>
          
          {/* Subtitle / Tagline */}
          <p className="text-[15px] font-medium text-gray-200 mt-3 tracking-wide font-sans text-center">
            Tecnologia que move frotas.
          </p>
        </div>

        {/* Login Card */}
        <div className="rounded-2xl border border-white/5 bg-[#121316]/70 p-8 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] backdrop-blur-xl relative overflow-hidden before:absolute before:inset-0 before:bg-gradient-to-b before:from-white/5 before:to-transparent before:pointer-events-none">
          
          <div className="mb-6 text-center">
            <span className="text-[10px] font-bold text-[#FF7900] uppercase tracking-widest bg-orange-500/10 px-3 py-1 rounded-full border border-orange-500/20">
              Painel Administrativo
            </span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                E-mail Administrativo
              </label>
              <div className="relative">
                <span className="absolute left-3 top-3.5 text-slate-500">
                  <Mail size={16} />
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@suzanoit.com"
                  className="w-full bg-[#090a0c]/80 border border-slate-800/80 rounded-xl py-3 pl-10 pr-4 text-sm text-slate-100 placeholder-slate-600 focus:border-[#FF7900] focus:ring-1 focus:ring-[#FF7900] focus:outline-none transition-all"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                Senha de Acesso
              </label>
              <div className="relative">
                <span className="absolute left-3 top-3.5 text-slate-500">
                  <Lock size={16} />
                </span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#090a0c]/80 border border-slate-800/80 rounded-xl py-3 pl-10 pr-4 text-sm text-slate-100 placeholder-slate-600 focus:border-[#FF7900] focus:ring-1 focus:ring-[#FF7900] focus:outline-none transition-all"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#FF7900] hover:bg-[#E06B00] disabled:bg-[#FF7900]/50 text-white font-extrabold text-xs tracking-wider uppercase py-3.5 rounded-xl transition duration-200 shadow-lg shadow-orange-500/10 flex items-center justify-center gap-2 active:scale-[0.98]"
            >
              {isLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Autenticando...</span>
                </>
              ) : (
                <span>Acessar Painel</span>
              )}
            </button>
          </form>
        </div>

        {/* Demo credentials hint box */}
        <div className="mt-6 p-4 rounded-xl border border-white/5 bg-[#121316]/30 text-center">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Credenciais de Teste (Seeded)</p>
          <p className="text-[10px] text-slate-400 mt-1">
            E-mail: <span className="font-mono text-[#FF7900] font-bold">superadmin@suzanoit.com</span> | Senha: <span className="font-mono text-[#FF7900] font-bold">admin123</span>
          </p>
        </div>
      </div>
    </div>
  );
}
