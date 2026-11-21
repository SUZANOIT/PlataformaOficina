import { useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { apiErrorMessage, portalGestorApi } from '../../services/portalGestor';
import { Card, Field, Loadable, PageHeader, btnPrimary, formatCnpj, formatDate, inputClass, useLoad } from './ui';

export function PortalMeuAcesso() {
  const state = useLoad(() => portalGestorApi.meuAcesso());
  const [atual, setAtual] = useState('');
  const [nova, setNova] = useState('');
  const [confirma, setConfirma] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (nova.length < 8) return toast.error('A nova senha deve ter pelo menos 8 caracteres.');
    if (nova !== confirma) return toast.error('A confirmação não confere com a nova senha.');
    setSaving(true);
    try {
      await portalGestorApi.trocarSenha(atual, nova);
      toast.success('Senha alterada com sucesso.');
      setAtual(''); setNova(''); setConfirma('');
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader title="Meu Acesso" description="Dados de acesso ao Portal do Gestor de Frota." />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <Loadable state={state}>
            {(a: any) => (
              <dl className="grid gap-4 text-sm sm:grid-cols-2">
                <div><dt className="text-xs text-muted-foreground">Empresa</dt><dd className="mt-1 font-medium">{a.nome}</dd></div>
                <div><dt className="text-xs text-muted-foreground">Usuário (CNPJ)</dt><dd className="mt-1 font-medium tabular-nums">{formatCnpj(a.login)}</dd></div>
                <div><dt className="text-xs text-muted-foreground">Situação</dt><dd className="mt-1 font-medium">{a.status === 'ATIVO' ? 'Ativo' : a.status}</dd></div>
                <div><dt className="text-xs text-muted-foreground">Acesso criado em</dt><dd className="mt-1 font-medium">{formatDate(a.criadoEm)}</dd></div>
              </dl>
            )}
          </Loadable>
          <p className="mt-6 text-xs text-muted-foreground">O acesso é liberado e pode ser bloqueado pela oficina. Em caso de perda da senha, solicite à oficina a redefinição da senha inicial.</p>
        </Card>

        <Card className="p-5">
          <h2 className="text-sm font-semibold">Alterar senha</h2>
          <form onSubmit={submit} className="mt-4 space-y-4">
            <Field label="Senha atual"><input type="password" required autoComplete="current-password" className={inputClass} value={atual} onChange={e => setAtual(e.target.value)} /></Field>
            <Field label="Nova senha" hint="Mínimo de 8 caracteres."><input type="password" required minLength={8} autoComplete="new-password" className={inputClass} value={nova} onChange={e => setNova(e.target.value)} /></Field>
            <Field label="Confirmar nova senha"><input type="password" required autoComplete="new-password" className={inputClass} value={confirma} onChange={e => setConfirma(e.target.value)} /></Field>
            <div className="flex justify-end"><button type="submit" disabled={saving} className={btnPrimary}>{saving ? 'Salvando…' : 'Alterar senha'}</button></div>
          </form>
        </Card>
      </div>
    </>
  );
}
