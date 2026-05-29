import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { handleApiError } from '../utils/toast.helper';

export function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [companyCnpj, setCompanyCnpj] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  // Mask function for CNPJ (XX.XXX.XXX/XXXX-XX)
  const handleCnpjChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    const masked = rawVal
      .replace(/\D/g, '')
      .replace(/^(\d{2})(\d)/, '$1.$2')
      .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1/$2')
      .replace(/(\d{4})(\d)/, '$1-$2')
      .substring(0, 18);
    setCompanyCnpj(masked);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (companyCnpj.replace(/\D/g, '').length !== 14) {
      toast.warning('Por favor, informe um CNPJ válido com 14 dígitos.');
      return;
    }

    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const response = await fetch('/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name, 
          email, 
          password,
          companyName,
          companyCnpj
        }),
      });

      if (response.ok) {
        toast.success('Oficina e Usuário cadastrados com sucesso!');
        navigate('/login');
      } else {
        handleApiError(response, 'Erro ao registrar.');
      }
    } catch (error: any) {
      console.error('Failed to register', error);
      handleApiError(error, 'Erro de conexão ao registrar.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-card border border-border p-8 rounded-2xl shadow-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-foreground">Cadastro da Oficina</h1>
          <p className="text-muted-foreground">Crie sua conta e configure seu ambiente exclusivo.</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Nome da Oficina / Razão Social</label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="w-full px-4 py-2 bg-input/50 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="Ex: Oficina Mecânica Silva"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">CNPJ da Oficina</label>
            <input
              type="text"
              value={companyCnpj}
              onChange={handleCnpjChange}
              className="w-full px-4 py-2 bg-input/50 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="00.000.000/0000-00"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Nome do Administrador</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 bg-input/50 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="Seu nome completo"
              required
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">E-mail</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 bg-input/50 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="seu@email.com"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Senha</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 bg-input/50 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 font-medium transition mt-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSubmitting ? 'Cadastrando...' : 'Cadastrar Oficina e Acessar'}
          </button>
        </form>
        
        <div className="mt-6 text-center text-sm">
          <Link to="/login" className="text-primary hover:underline">
            Já possui uma conta? Faça login
          </Link>
        </div>
      </div>
      <footer className="mt-8 text-center text-[11px] text-muted-foreground/50 tracking-wider">
        Desenvolvido por <span className="font-semibold text-primary/70">Suzano IT</span>
      </footer>
    </div>
  );
}
