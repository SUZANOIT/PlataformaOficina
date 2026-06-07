import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSaaSAuth } from '../../hooks/useSaaSAuth';
import { SaaSAPIService } from '../../services/saas';
import { ShieldCheck, Mail, Lock, Loader2 } from 'lucide-react';
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

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-slate-950 font-sans relative overflow-hidden">
      {/* Background neon glows */}
      <div className="absolute top-1/4 left-1/4 h-96 w-96 rounded-full bg-indigo-500/10 blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 h-96 w-96 rounded-full bg-purple-500/10 blur-[120px] pointer-events-none"></div>

      <div className="w-full max-w-md p-6 relative z-10">
        <div className="flex flex-col items-center mb-8">
          <div className="mb-4 h-12 w-12 rounded-2xl bg-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 text-slate-950">
            <ShieldCheck size={28} />
          </div>
          <h2 className="text-2xl font-black tracking-wider text-white">SUZANO IT</h2>
          <p className="text-xs font-semibold text-slate-400 mt-1 uppercase tracking-widest">Painel Administrativo SaaS</p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-8 shadow-2xl backdrop-blur-xl">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                E-mail Administrativo
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-slate-500">
                  <Mail size={16} />
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@suzanoit.com"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-xs text-slate-100 placeholder-slate-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-all"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                Senha de Acesso
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-slate-500">
                  <Lock size={16} />
                </span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-xs text-slate-100 placeholder-slate-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-all"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-indigo-500 hover:bg-indigo-400 disabled:bg-indigo-500/50 text-slate-950 font-extrabold text-xs tracking-wider uppercase py-3 rounded-xl transition duration-200 shadow-lg shadow-indigo-500/10 flex items-center justify-center gap-2 active:scale-98"
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
        <div className="mt-6 p-4 rounded-xl border border-slate-800/80 bg-slate-900/10 text-center">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Credenciais de Teste (Seeded)</p>
          <p className="text-[10px] text-slate-400 mt-1">
            E-mail: <span className="font-mono text-indigo-400 font-bold">superadmin@suzanoit.com</span> | Senha: <span className="font-mono text-indigo-400 font-bold">admin123</span>
          </p>
        </div>
      </div>
    </div>
  );
}
