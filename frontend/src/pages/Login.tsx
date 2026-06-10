import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    try {
      const response = await fetch('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao fazer login');
      }

      const mappedUser = {
        id: data.user.id,
        nome: data.user.name || data.user.nome || '',
        email: data.user.email,
        role: data.user.role || 'ADMIN'
      };

      login(data.token, mappedUser);
      
      // Navigate safely
      navigate('/');
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-[#121212] bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#3a3a3a] via-[#1a1a1a] to-[#0a0a0a]">
      <div className="w-full max-w-md bg-black/40 backdrop-blur-md rounded-2xl shadow-2xl border border-white/5 p-8 relative z-10">
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-3 mb-2">
            <svg width="48" height="48" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-xl">
              <circle cx="50" cy="50" r="45" fill="#f8f9fa" />
              <path d="M 10,75 C 35,45 75,35 95,50 C 70,75 35,85 10,75 Z" fill="#ff8c00" />
              <path d="M 5,50 C 25,25 65,15 90,30 C 65,10 25,20 5,50 Z" fill="#222" opacity="0.1"/>
            </svg>
            <h1 className="text-4xl font-bold tracking-tight text-white drop-shadow-lg" style={{ fontFamily: 'sans-serif' }}>
              Suzano <span className="text-[#ff8c00]">IT</span>
            </h1>
          </div>
          <p className="text-[15px] font-medium text-zinc-300 drop-shadow">
            Tecnologia que move frotas.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg text-center font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300">E-mail</label>
            <input 
              type="email" 
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#ff8c00]/50 focus:border-[#ff8c00]/50 transition-all"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300">Senha</label>
            <input 
              type="password" 
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#ff8c00]/50 focus:border-[#ff8c00]/50 transition-all"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button 
            type="submit" 
            className="w-full py-3.5 mt-2 bg-[#ff8c00] hover:bg-[#e67e00] text-white font-semibold rounded-xl transition-all shadow-[0_0_20px_rgba(255,140,0,0.3)] hover:shadow-[0_0_25px_rgba(255,140,0,0.5)] active:scale-[0.98]"
          >
            Entrar
          </button>
        </form>

      </div>
      <footer className="mt-12 text-center text-xs text-zinc-500 tracking-wider">
        Desenvolvido por <span className="font-semibold text-zinc-400">Suzano IT</span>
      </footer>
    </div>
  );
}
