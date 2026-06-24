import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, CreditCard, Building, Building2, Mail, Phone, ArrowRight, Loader2, Lock } from 'lucide-react';
import { toast } from 'sonner';




interface Plan {
  id: string;
  name: string;
  price: number;
  features: any;
}

export const OnboardingWizard = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [plans, setPlans] = useState<Plan[]>([]);
  
  const [formData, setFormData] = useState({
    cnpj: '',
    razaoSocial: '',
    nomeFantasia: '',
    email: '',
    telefone: '',
    planId: ''
  });

  const [paymentData, setPaymentData] = useState({
    cardNumber: '',
    expiry: '',
    cvv: '',
    name: ''
  });

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
  const [lastQueriedCnpj, setLastQueriedCnpj] = useState('');
  const [queryingCnpj, setQueryingCnpj] = useState(false);

  useEffect(() => {
    // Fetch plans on mount
    fetch(`${API_URL}/api/onboarding/plans`)
      .then(res => res.json())
      .then(data => setPlans(data))
      .catch(err => console.error(err));
  }, []);

  useEffect(() => {
    const cleanCnpj = formData.cnpj.replace(/\D/g, '');
    if (cleanCnpj.length === 14 && cleanCnpj !== lastQueriedCnpj) {
      setLastQueriedCnpj(cleanCnpj);
      
      const autoQuery = async () => {
        setQueryingCnpj(true);
        const toastId = toast.loading('Consultando CNPJ e preenchendo dados...');
        try {
          const res = await fetch(`${API_URL}/api/onboarding/validate-cnpj`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cnpj: cleanCnpj })
          });
          const data = await res.json();
          
          if (!res.ok) {
            toast.error(data.error || 'Erro ao validar CNPJ', { id: toastId });
            return;
          }

          toast.success('CNPJ disponível! Dados carregados.', { id: toastId });
          
          if (data.company) {
            setFormData(prev => ({
              ...prev,
              razaoSocial: data.company.razaoSocial || prev.razaoSocial,
              nomeFantasia: data.company.nomeFantasia || prev.nomeFantasia,
              email: data.company.email || prev.email,
              telefone: data.company.telefone || prev.telefone
            }));
          }
        } catch (err: any) {
          console.error(err);
          toast.error('Erro ao consultar CNPJ na base.', { id: toastId });
        } finally {
          setQueryingCnpj(false);
        }
      };
      
      autoQuery();
    }
  }, [formData.cnpj, lastQueriedCnpj, API_URL]);

  const handleCnpjChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length <= 14) {
      value = value.replace(/^(\d{2})(\d)/, '$1.$2');
      value = value.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3');
      value = value.replace(/\.(\d{3})(\d)/, '.$1/$2');
      value = value.replace(/(\d{4})(\d)/, '$1-$2');
      setFormData({ ...formData, cnpj: value });
    }
  };

  const handleStep1Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.cnpj.length < 18) {
      toast.error('CNPJ inválido');
      return;
    }
    
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/onboarding/validate-cnpj`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cnpj: formData.cnpj })
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error);
      
      setFormData(prev => ({
        ...prev,
        razaoSocial: prev.razaoSocial || data.company?.razaoSocial || 'Oficina Exemplo LTDA',
        nomeFantasia: prev.nomeFantasia || data.company?.nomeFantasia || 'Oficina Exemplo'
      }));
      
      setStep(2);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStep2Submit = (planId: string) => {
    setFormData({ ...formData, planId });
    setStep(3);
  };

  const handleStep3Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // 1. Cria o checkout
      const res = await fetch(`${API_URL}/api/onboarding/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // 2. Simula o Pagamento (Chamando o Webhook)
      const webhookRes = await fetch(`${API_URL}/api/webhooks/payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preTenantId: data.preTenantId })
      });
      
      if (!webhookRes.ok) throw new Error('Erro ao processar pagamento');

      setStep(4);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Building2 className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg">Suzano IT</span>
          </div>
          <div className="text-sm text-muted-foreground">
            Cadastro de Nova Oficina
          </div>
        </div>
      </header>

      {/* Progress */}
      <div className="max-w-3xl mx-auto w-full px-4 pt-8">
        <div className="flex items-center justify-between relative">
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-border -z-10 rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all duration-500 ease-in-out"
              style={{ width: `${((step - 1) / 3) * 100}%` }}
            />
          </div>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm border-2 transition-colors ${
              step >= i ? 'bg-primary border-primary text-primary-foreground' : 'bg-card border-border text-muted-foreground'
            }`}>
              {step > i ? <Check size={16} /> : i}
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-2 px-1">
          <span className={`text-xs ${step >= 1 ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>Identificação</span>
          <span className={`text-xs ${step >= 2 ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>Plano</span>
          <span className={`text-xs ${step >= 3 ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>Pagamento</span>
          <span className={`text-xs ${step >= 4 ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>Conclusão</span>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-8">
        
        {/* Passo 1 */}
        {step === 1 && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold">Conte-nos sobre sua empresa</h1>
              <p className="text-muted-foreground mt-2">Precisamos de alguns dados básicos para criar seu ambiente.</p>
            </div>

            <div className="bg-card border border-border rounded-xl shadow-sm p-6">
              <form onSubmit={handleStep1Submit} className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium" htmlFor="cnpj">CNPJ</label>
                    <div className="relative mt-1">
                      <Building className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                      <input
                        id="cnpj"
                        value={formData.cnpj}
                        onChange={handleCnpjChange}
                        className="pl-10 pr-10"
                        placeholder="00.000.000/0000-00"
                        disabled={queryingCnpj}
                        required
                      />
                      {queryingCnpj && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <Loader2 className="w-4 h-4 animate-spin text-primary" />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium" htmlFor="razaoSocial">Razão Social</label>
                      <input
                        id="razaoSocial"
                        value={formData.razaoSocial}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, razaoSocial: e.target.value})}
                        className="mt-1"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium" htmlFor="nomeFantasia">Nome Fantasia</label>
                      <input
                        id="nomeFantasia"
                        value={formData.nomeFantasia}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, nomeFantasia: e.target.value})}
                        className="mt-1"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium" htmlFor="email">E-mail Administrativo</label>
                      <div className="relative mt-1">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                        <input
                          id="email"
                          type="email"
                          value={formData.email}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, email: e.target.value})}
                          className="pl-10"
                          placeholder="contato@oficina.com.br"
                          required
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium" htmlFor="telefone">Telefone/WhatsApp</label>
                      <div className="relative mt-1">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                        <input
                          id="telefone"
                          value={formData.telefone}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, telefone: e.target.value})}
                          className="pl-10"
                          placeholder="(00) 00000-0000"
                          required
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-4 flex justify-end">
                  <button type="submit" disabled={loading}>
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Continuar para Planos'}
                    {!loading && <ArrowRight className="w-4 h-4" />}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Passo 2 */}
        {step === 2 && (
          <div className="animate-in fade-in slide-in-from-right-8 duration-500">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold">Escolha o plano ideal</h1>
              <p className="text-muted-foreground mt-2">Comece a gerenciar sua oficina com a melhor tecnologia.</p>
            </div>

            {plans.length === 0 ? (
               <div className="flex justify-center p-12">
                 <Loader2 className="w-8 h-8 animate-spin text-primary" />
               </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {plans.map(plan => (
                  <div key={plan.id} className="bg-card border border-border rounded-2xl shadow-sm flex flex-col p-6 hover:border-primary transition-colors">
                    <h3 className="text-lg font-bold">{plan.name}</h3>
                    <div className="mt-4 mb-6">
                      <span className="text-3xl font-bold">R$ {plan.price.toFixed(2)}</span>
                      <span className="text-muted-foreground text-sm">/mês</span>
                    </div>
                    
                    <ul className="space-y-3 flex-1 mb-8">
                      {/* Simulando features baseadas no JSON se existir */}
                      <li className="flex items-center gap-2 text-sm">
                        <Check className="w-4 h-4 text-primary" />
                        Orçamentos Ilimitados
                      </li>
                      <li className="flex items-center gap-2 text-sm">
                        <Check className="w-4 h-4 text-primary" />
                        Suporte Online
                      </li>
                    </ul>

                    <button onClick={() => handleStep2Submit(plan.id)} className="w-full">
                      Escolher Plano
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-6 text-center">
              <button onClick={() => setStep(1)}>Voltar</button>
            </div>
          </div>
        )}

        {/* Passo 3 */}
        {step === 3 && (
          <div className="animate-in fade-in slide-in-from-right-8 duration-500">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold">Finalizar Assinatura</h1>
              <p className="text-muted-foreground mt-2">Ambiente 100% seguro.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="md:col-span-2">
                <div className="bg-card border border-border rounded-xl shadow-sm p-6">
                  <div className="flex items-center gap-2 mb-6 text-primary font-medium">
                    <Lock className="w-5 h-5" />
                    Pagamento Seguro
                  </div>
                  <form onSubmit={handleStep3Submit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium">Número do Cartão</label>
                      <div className="relative mt-1">
                        <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                        <input
                          required
                          value={paymentData.cardNumber}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPaymentData({...paymentData, cardNumber: e.target.value})}
                          className="pl-10"
                          placeholder="0000 0000 0000 0000"
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium">Validade (MM/AA)</label>
                        <input
                          required
                          value={paymentData.expiry}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPaymentData({...paymentData, expiry: e.target.value})}
                          className="mt-1"
                          placeholder="12/29"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium">CVV</label>
                        <input
                          required
                          value={paymentData.cvv}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPaymentData({...paymentData, cvv: e.target.value})}
                          className="mt-1"
                          placeholder="123"
                          type="password"
                          maxLength={4}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium">Nome Impresso no Cartão</label>
                      <input
                        required
                        value={paymentData.name}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPaymentData({...paymentData, name: e.target.value})}
                        className="mt-1"
                      />
                    </div>

                    <div className="pt-6 flex gap-4">
                      <button type="button" onClick={() => setStep(2)} disabled={loading}>
                        Voltar
                      </button>
                      <button type="submit" className="flex-1" disabled={loading}>
                        {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                        Assinar e Criar Conta
                      </button>
                    </div>
                  </form>
                </div>
              </div>

              {/* Resumo */}
              <div>
                <div className="bg-muted rounded-xl p-6 border border-border">
                  <h3 className="font-bold text-lg mb-4">Resumo da Compra</h3>
                  <div className="flex justify-between py-2 border-b border-border/50">
                    <span className="text-muted-foreground">Plano</span>
                    <span className="font-medium">{plans.find(p => p.id === formData.planId)?.name}</span>
                  </div>
                  <div className="flex justify-between py-4">
                    <span className="font-bold">Total a pagar hoje</span>
                    <span className="font-bold text-primary">R$ {plans.find(p => p.id === formData.planId)?.price.toFixed(2)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground text-center mt-4">
                    Você pode cancelar a qualquer momento.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Passo 4 */}
        {step === 4 && (
          <div className="animate-in zoom-in-95 duration-500 max-w-md mx-auto text-center py-12">
            <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <Check className="w-10 h-10 text-green-600 dark:text-green-500" />
            </div>
            <h1 className="text-3xl font-bold mb-4">Tudo Pronto!</h1>
            <p className="text-muted-foreground mb-8 text-lg">
              Sua oficina foi criada com sucesso e seu pagamento foi aprovado. 
              Nós enviamos um e-mail para <strong>{formData.email}</strong> com a sua senha de acesso inicial.
            </p>
            <button onClick={() => navigate('/login')}>
              Ir para o Login
            </button>
          </div>
        )}

      </main>
    </div>
  );
};
