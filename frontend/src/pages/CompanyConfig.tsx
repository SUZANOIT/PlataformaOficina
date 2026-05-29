import { useState, useEffect } from 'react';
import { Building, Phone, Mail, MapPin, Globe, Save, Search, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { handleApiError } from '../utils/toast.helper';

export function CompanyConfig() {
  const [razaoSocial, setRazaoSocial] = useState('');
  const [nomeFantasia, setNomeFantasia] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [inscricaoEstadual, setInscricaoEstadual] = useState('');
  const [endereco, setEndereco] = useState('');
  const [telefone, setTelefone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const [logo, setLogo] = useState('');
  const [regimeTributario, setRegimeTributario] = useState('Simples Nacional');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingCNPJ, setIsLoadingCNPJ] = useState(false);

  useEffect(() => {
    const fetchCompany = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch('/companies/my', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setRazaoSocial(data.razaoSocial || '');
          setNomeFantasia(data.nomeFantasia || '');
          setCnpj(data.cnpj || '');
          setInscricaoEstadual(data.inscricaoEstadual || '');
          setEndereco(data.endereco || '');
          setTelefone(data.telefone || '');
          setWhatsapp(data.whatsapp || '');
          setEmail(data.email || '');
          setLogo(data.logo || '');
          setRegimeTributario(data.regimeTributario || 'Simples Nacional');
        }
      } catch (error) {
        console.error('Erro ao carregar dados da oficina:', error);
        toast.error('Não foi possível carregar as configurações da oficina.');
      }
    };
    fetchCompany();
  }, []);

  const handleCnpjChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    const masked = rawVal
      .replace(/\D/g, '')
      .replace(/^(\d{2})(\d)/, '$1.$2')
      .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1/$2')
      .replace(/(\d{4})(\d)/, '$1-$2')
      .substring(0, 18);
    setCnpj(masked);
  };

  const handleCnpjLookup = async () => {
    const cleaned = cnpj.replace(/\D/g, '');
    if (cleaned.length !== 14) {
      toast.error('O CNPJ para consulta deve conter exatamente 14 dígitos.');
      return;
    }

    setIsLoadingCNPJ(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/cnpj/${cleaned}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        if (data.status === 'ERROR') {
          toast.error(data.message || 'CNPJ não encontrado ou inválido na base da Receita Federal.');
        } else {
          setRazaoSocial(data.nome || '');
          setNomeFantasia(data.fantasia || data.nome || '');
          setEmail(data.email || '');
          setTelefone(data.telefone || '');
          
          // Formata endereço completo
          const parts = [
            data.logradouro,
            data.numero ? `${data.numero}` : '',
            data.complemento ? `${data.complemento}` : '',
            data.bairro,
            data.municipio,
            data.uf
          ].filter(Boolean);
          
          const fullAddress = parts.join(', ') + (data.cep ? ` - CEP: ${data.cep}` : '');
          setEndereco(fullAddress);

          toast.success('CNPJ localizado! Dados cadastrais preenchidos automaticamente.');
        }
      } else {
        toast.error('Erro na resposta do serviço de consulta de CNPJ.');
      }
    } catch (error) {
      console.error('Failed to lookup CNPJ', error);
      toast.error('Erro ao conectar ao serviço de CNPJ.');
    } finally {
      setIsLoadingCNPJ(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    setIsSaving(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/companies/my', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          razaoSocial,
          nomeFantasia,
          cnpj,
          cnpjSemMascara: cnpj.replace(/\D/g, ''),
          inscricaoEstadual,
          endereco,
          telefone,
          whatsapp,
          email,
          logo,
          regimeTributario
        }),
      });

      if (response.ok) {
        toast.success('Configurações da oficina salvas com sucesso!');
      } else {
        handleApiError(response, 'Erro ao salvar configurações.');
      }
    } catch (error: any) {
      console.error('Failed to save company config', error);
      handleApiError(error, 'Erro de conexão ao salvar.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Building className="text-primary" />
          Configurações da Oficina
        </h1>
        <p className="text-muted-foreground text-sm">Gerencie os dados cadastrais, contatos e regime tributário da oficina administradora.</p>
      </div>

      <form onSubmit={handleSave} className="bg-card border border-border p-6 rounded-2xl shadow-sm space-y-6">
        
        {/* Identificação da Oficina */}
        <div>
          <h3 className="font-bold text-sm text-foreground uppercase tracking-wider mb-4 border-b border-border pb-2">Identificação</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* CNPJ Input with Auto Search */}
            <div className="space-y-2">
              <label className="text-sm font-medium">CNPJ *</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={cnpj}
                  onChange={handleCnpjChange}
                  placeholder="00.000.000/0000-00"
                  className="flex-1 px-4 py-2 bg-input/50 border border-border rounded-lg text-sm font-mono"
                  required
                />
                <button
                  type="button"
                  onClick={handleCnpjLookup}
                  disabled={isLoadingCNPJ}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50"
                  title="Consultar na Receita Federal"
                >
                  {isLoadingCNPJ ? (
                    <RefreshCw size={14} className="animate-spin" />
                  ) : (
                    <Search size={14} />
                  )}
                  Buscar CNPJ
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Inscrição Estadual</label>
              <input
                type="text"
                value={inscricaoEstadual}
                onChange={(e) => setInscricaoEstadual(e.target.value)}
                className="w-full px-4 py-2 bg-input/50 border border-border rounded-lg text-sm"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">Razão Social *</label>
              <input
                type="text"
                value={razaoSocial}
                onChange={(e) => setRazaoSocial(e.target.value)}
                className="w-full px-4 py-2 bg-input/50 border border-border rounded-lg text-sm"
                required
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">Nome Fantasia</label>
              <input
                type="text"
                value={nomeFantasia}
                onChange={(e) => setNomeFantasia(e.target.value)}
                className="w-full px-4 py-2 bg-input/50 border border-border rounded-lg text-sm"
              />
            </div>

          </div>
        </div>

        {/* Endereço e Contato */}
        <div className="border-t border-border pt-6">
          <h3 className="font-bold text-sm text-foreground uppercase tracking-wider mb-4 border-b border-border pb-2">Contato & Endereço</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium flex items-center gap-1"><MapPin size={16} /> Endereço Completo</label>
              <input
                type="text"
                value={endereco}
                onChange={(e) => setEndereco(e.target.value)}
                placeholder="Rua, Número, Bairro, Cidade - UF, CEP"
                className="w-full px-4 py-2 bg-input/50 border border-border rounded-lg text-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-1"><Phone size={16} /> Telefone</label>
              <input
                type="text"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                className="w-full px-4 py-2 bg-input/50 border border-border rounded-lg text-sm font-mono"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-1"><Globe size={16} /> WhatsApp</label>
              <input
                type="text"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                className="w-full px-4 py-2 bg-input/50 border border-border rounded-lg text-sm font-mono"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium flex items-center gap-1"><Mail size={16} /> E-mail Corporativo</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 bg-input/50 border border-border rounded-lg text-sm"
              />
            </div>
          </div>
        </div>

        {/* Tributação & Logo */}
        <div className="border-t border-border pt-6">
          <h3 className="font-bold text-sm text-foreground uppercase tracking-wider mb-4 border-b border-border pb-2">Tributação & Logo</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Regime Tributário</label>
              <select
                value={regimeTributario}
                onChange={(e) => setRegimeTributario(e.target.value)}
                className="w-full px-4 py-2.5 bg-input/50 border border-border rounded-lg text-sm"
              >
                <option value="Simples Nacional">Simples Nacional</option>
                <option value="Lucro Presumido">Lucro Presumido</option>
                <option value="Lucro Real">Lucro Real</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Logotipo da Oficina (URL da Imagem)</label>
              <input
                type="text"
                value={logo}
                onChange={(e) => setLogo(e.target.value)}
                placeholder="https://suaempresa.com/logo.png"
                className="w-full px-4 py-2 bg-input/50 border border-border rounded-lg text-sm font-mono"
              />
            </div>
          </div>
        </div>

        {/* Botão de Ação */}
        <div className="flex justify-end pt-4 border-t border-border">
          <button
            type="submit"
            disabled={isSaving}
            className="w-full sm:w-auto px-6 py-2.5 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 transition shadow flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isSaving ? 'Salvando...' : <><Save size={16} /> Salvar Configurações</>}
          </button>
        </div>
      </form>
    </div>
  );
}
