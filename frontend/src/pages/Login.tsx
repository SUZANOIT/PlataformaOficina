import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

export function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    try {
      const response = await fetch('http://localhost:3333/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao fazer login');
      }

      localStorage.setItem('token', data.token);
      navigate('/');
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-card rounded-xl shadow-lg border border-border p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary mb-2">SysOrçamento</h1>
          <p className="text-muted-foreground">Acesse sua conta para continuar</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-lg text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">E-mail</label>
            <input 
              type="email" 
              className="w-full px-4 py-2 bg-input/50 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Senha</label>
            <input 
              type="password" 
              className="w-full px-4 py-2 bg-input/50 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button 
            type="submit" 
            className="w-full py-3 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-colors shadow-sm"
          >
            Entrar
          </button>
        </form>
        
        <div className="mt-6 text-center text-sm">
          <Link to="/register" className="text-primary hover:underline">
            Não possui uma conta? Cadastre-se
          </Link>
        </div>
      </div>
    </div>
  );
}
