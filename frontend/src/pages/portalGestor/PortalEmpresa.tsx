import { useEffect, useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { apiErrorMessage, portalGestorApi } from '../../services/portalGestor';
import { Card, Field, Loadable, PageHeader, btnPrimary, formatCnpj, inputClass, useLoad } from './ui';

const CONTACT_FIELDS = ['telefone', 'whatsapp', 'email', 'cep', 'logradouro', 'numero', 'complemento', 'bairro', 'cidade', 'estado'] as const;

function ReadOnly({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-medium text-foreground">{value || '—'}</p>
    </div>
  );
}

export function PortalEmpresa() {
  const state = useLoad(() => portalGestorApi.empresa());
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (state.data?.empresa) {
      const e = state.data.empresa;
      setForm(Object.fromEntries(CONTACT_FIELDS.map(k => [k, e[k] || ''])));
    }
  }, [state.data]);

  const submit = async (ev: FormEvent) => {
    ev.preventDefault();
    setSaving(true);
    try {
      const data = await portalGestorApi.updateEmpresa(form);
      state.setData(data);
      toast.success('Dados de contato atualizados.');
    } catch (e) {
      toast.error(apiErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  return (
    <>
      <PageHeader title="Cadastro da Empresa" description="Dados da sua empresa no cadastro da oficina. Razão social e CNPJ são mantidos pela oficina." />
      <Loadable state={state}>
        {({ empresa }: any) => (
          <div>
            <Card className="p-5">
              <h2 className="text-sm font-semibold">Identificação</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <ReadOnly label="Razão social" value={empresa.empresa || empresa.nome} />
                <ReadOnly label="Nome" value={empresa.nome} />
                <ReadOnly label="CNPJ" value={formatCnpj(empresa.cnpj)} />
                <ReadOnly label="Atividade principal" value={empresa.atividadePrincipal} />
              </div>

              <form onSubmit={submit} className="mt-8 space-y-4">
                <h2 className="text-sm font-semibold">Contato e endereço</h2>
                <div className="grid gap-4 sm:grid-cols-3">
                  <Field label="Telefone"><input className={inputClass} value={form.telefone || ''} onChange={set('telefone')} /></Field>
                  <Field label="WhatsApp"><input className={inputClass} value={form.whatsapp || ''} onChange={set('whatsapp')} /></Field>
                  <Field label="E-mail"><input type="email" className={inputClass} value={form.email || ''} onChange={set('email')} /></Field>
                  <Field label="CEP"><input className={inputClass} value={form.cep || ''} onChange={set('cep')} /></Field>
                  <div className="sm:col-span-2"><Field label="Logradouro"><input className={inputClass} value={form.logradouro || ''} onChange={set('logradouro')} /></Field></div>
                  <Field label="Número"><input className={inputClass} value={form.numero || ''} onChange={set('numero')} /></Field>
                  <Field label="Complemento"><input className={inputClass} value={form.complemento || ''} onChange={set('complemento')} /></Field>
                  <Field label="Bairro"><input className={inputClass} value={form.bairro || ''} onChange={set('bairro')} /></Field>
                  <Field label="Cidade"><input className={inputClass} value={form.cidade || ''} onChange={set('cidade')} /></Field>
                  <Field label="UF"><input maxLength={2} className={inputClass} value={form.estado || ''} onChange={e => setForm({ ...form, estado: e.target.value.toUpperCase() })} /></Field>
                </div>
                <div className="flex justify-end">
                  <button type="submit" disabled={saving} className={btnPrimary}>{saving ? 'Salvando…' : 'Salvar contato'}</button>
                </div>
              </form>
            </Card>
          </div>
        )}
      </Loadable>
    </>
  );
}
