import { useEffect, useState } from 'react';
import { KeyRound, ShieldCheck, ShieldOff } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../services/api';

interface Props {
  client: { id: string; nome: string; empresa?: string | null; cnpj?: string | null };
  onClose: () => void;
}

/** Gerencia o acesso do cliente PJ ao Portal do Gestor de Frota (tela de Clientes). */
export function PortalAccessModal({ client, onClose }: Props) {
  const [access, setAccess] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [senhaInicial, setSenhaInicial] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      setAccess((await api.get(`/registry/clients/${client.id}/portal-access`)).data);
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Não foi possível carregar o acesso.');
      onClose();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [client.id]);

  const createOrReset = async () => {
    setBusy(true);
    try {
      const { data } = await api.post(`/registry/clients/${client.id}/portal-access`);
      setAccess(data);
      setSenhaInicial(data.senhaInicial);
      toast.success(access?.hasAccess ? 'Senha inicial redefinida.' : 'Acesso ao portal criado.');
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Não foi possível gerar o acesso.');
    } finally {
      setBusy(false);
    }
  };

  const toggle = async () => {
    setBusy(true);
    try {
      const status = access.status === 'ATIVO' ? 'INATIVO' : 'ATIVO';
      const { data } = await api.put(`/registry/clients/${client.id}/portal-access/status`, { status });
      setAccess(data);
      toast.success(status === 'ATIVO' ? 'Acesso reativado.' : 'Acesso bloqueado.');
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Não foi possível alterar o acesso.');
    } finally {
      setBusy(false);
    }
  };

  const btn = 'inline-flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-medium disabled:opacity-50';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true" aria-label="Acesso ao Portal do Gestor de Frota">
      <div className="w-full max-w-md rounded-xl border border-border bg-card shadow-2xl">
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-base font-semibold text-foreground">Portal do Gestor de Frota</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">{client.empresa || client.nome}</p>
        </div>
        <div className="space-y-4 p-5 text-sm">
          {loading ? <p className="text-muted-foreground">Carregando…</p> : !access?.hasAccess ? (
            <p className="text-muted-foreground">
              Este cliente ainda não tem acesso. O usuário será o CNPJ (somente números) e a senha inicial padrão, com troca obrigatória no primeiro acesso.
            </p>
          ) : (
            <dl className="grid grid-cols-2 gap-3">
              <div><dt className="text-xs text-muted-foreground">Usuário</dt><dd className="font-medium tabular-nums">{access.login}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Situação</dt><dd className="font-medium">{access.status === 'ATIVO' ? 'Ativo' : 'Bloqueado'}</dd></div>
              <div className="col-span-2"><dt className="text-xs text-muted-foreground">Primeiro acesso</dt><dd className="font-medium">{access.mustChangePassword ? 'Pendente (senha inicial)' : 'Concluído'}</dd></div>
            </dl>
          )}
          {senhaInicial && (
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
              Informe ao cliente: usuário <strong className="tabular-nums">{access?.login}</strong> e senha inicial <strong>{senhaInicial}</strong>. A troca de senha será exigida no primeiro acesso.
            </div>
          )}
        </div>
        <div className="flex flex-wrap justify-end gap-2 border-t border-border px-5 py-3">
          <button type="button" onClick={onClose} className={`${btn} border border-border hover:bg-muted`}>Fechar</button>
          {access?.hasAccess && (
            <button type="button" disabled={busy} onClick={toggle} className={`${btn} border border-border hover:bg-muted`}>
              {access.status === 'ATIVO' ? <><ShieldOff size={15} /> Bloquear</> : <><ShieldCheck size={15} /> Reativar</>}
            </button>
          )}
          <button type="button" disabled={busy || loading} onClick={createOrReset} className={`${btn} bg-primary text-primary-foreground hover:bg-primary/90`}>
            <KeyRound size={15} /> {access?.hasAccess ? 'Redefinir senha inicial' : 'Gerar acesso'}
          </button>
        </div>
      </div>
    </div>
  );
}
