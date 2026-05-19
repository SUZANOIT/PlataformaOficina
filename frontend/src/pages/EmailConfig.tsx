import { useState, useEffect } from 'react';
import { Mail } from 'lucide-react';

export function EmailConfig() {
  const [host, setHost] = useState('');
  const [port, setPort] = useState(587);
  const [user, setUser] = useState('');
  const [password, setPassword] = useState('');
  const [fromName, setFromName] = useState('');
  const [fromEmail, setFromEmail] = useState('');

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch('/settings/email', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          if (data.host) {
            setHost(data.host);
            setPort(data.port);
            setUser(data.user);
            setPassword(data.password);
            setFromName(data.fromName || '');
            setFromEmail(data.fromEmail || '');
          }
        }
      } catch (error) {
        console.error('Erro ao carregar configurações de e-mail', error);
      }
    };
    fetchConfig();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/settings/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ host, port: Number(port), user, password, fromName, fromEmail }),
      });

      if (!response.ok) {
        throw new Error('Erro ao salvar configurações');
      }

      alert('Configurações salvas com sucesso!');
    } catch (error: any) {
      alert(error.message);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Mail className="text-primary" />
          Configurações de E-mail
        </h1>
        <p className="text-muted-foreground">Configure os dados do servidor SMTP para envio de orçamentos.</p>
      </div>

      <form onSubmit={handleSave} className="bg-card border border-border p-6 rounded-xl shadow-sm space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Servidor SMTP (Host)</label>
            <input
              type="text"
              value={host}
              onChange={(e) => setHost(e.target.value)}
              className="w-full px-4 py-2 bg-input/50 border border-border rounded-lg"
              placeholder="smtp.exemplo.com"
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Porta</label>
            <input
              type="number"
              value={port}
              onChange={(e) => setPort(Number(e.target.value))}
              className="w-full px-4 py-2 bg-input/50 border border-border rounded-lg"
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Usuário (E-mail de autenticação)</label>
            <input
              type="text"
              value={user}
              onChange={(e) => setUser(e.target.value)}
              className="w-full px-4 py-2 bg-input/50 border border-border rounded-lg"
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Senha</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 bg-input/50 border border-border rounded-lg"
              placeholder="••••••••"
              required
            />
          </div>
        </div>

        <div className="border-t border-border pt-4">
          <h3 className="font-semibold mb-4">Remetente Padrão</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nome do Remetente</label>
              <input
                type="text"
                value={fromName}
                onChange={(e) => setFromName(e.target.value)}
                className="w-full px-4 py-2 bg-input/50 border border-border rounded-lg"
                placeholder="Sua Empresa"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">E-mail do Remetente</label>
              <input
                type="email"
                value={fromEmail}
                onChange={(e) => setFromEmail(e.target.value)}
                className="w-full px-4 py-2 bg-input/50 border border-border rounded-lg"
                placeholder="contato@empresa.com"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <button
            type="submit"
            className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 font-medium transition"
          >
            Salvar Configurações
          </button>
        </div>
      </form>
    </div>
  );
}
