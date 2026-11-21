import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { toast } from 'sonner';
import { Building2, MapPin, Phone } from 'lucide-react';
import { apiErrorMessage, portalGestorApi } from '../../services/portalGestor';
import { Card, Loadable, PageHeader, btnPrimary, btnSecondary, formatCnpj, inputClass, useLoad } from './ui';

const CONTACT_FIELDS = ['telefone', 'whatsapp', 'email', 'cep', 'logradouro', 'numero', 'complemento', 'bairro', 'cidade', 'estado'] as const;

/** Rótulo + valor somente leitura (dados mantidos pela oficina). */
function ReadOnly({ label, value, className = '' }: { label: string; value?: string | null; className?: string }) {
  return (
    <div className={`min-w-0 ${className}`}>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-0.5 truncate text-sm font-medium text-foreground" title={value || undefined}>{value || '—'}</p>
    </div>
  );
}

/** Campo de formulário compacto (rótulo pequeno acima do input). */
function FormField({ label, children, className = '' }: { label: string; children: ReactNode; className?: string }) {
  return (
    <label className={`block min-w-0 space-y-1 ${className}`}>
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function SectionTitle({ icon: Icon, title, subtitle }: { icon: typeof Phone; title: string; subtitle: string }) {
  return (
    <div className="mb-3 flex items-start gap-2.5">
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
        <Icon size={15} aria-hidden="true" />
      </span>
      <div>
        <h2 className="text-sm font-semibold leading-tight text-foreground">{title}</h2>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  );
}

export function PortalEmpresa() {
  const state = useLoad(() => portalGestorApi.empresa());
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const original = useMemo(() => {
    const e = state.data?.empresa;
    return e ? Object.fromEntries(CONTACT_FIELDS.map(k => [k, e[k] || ''])) as Record<string, string> : null;
  }, [state.data]);

  useEffect(() => { if (original) setForm(original); }, [original]);

  const dirty = !!original && CONTACT_FIELDS.some(k => (form[k] || '') !== (original[k] || ''));

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
  const input = (k: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <input className={inputClass} value={form[k] || ''} onChange={set(k)} {...props} />
  );

  return (
    <>
      <PageHeader title="Cadastro da Empresa" description="Dados da sua empresa no cadastro da oficina. Razão social e CNPJ são mantidos pela oficina." />
      <Loadable state={state}>
        {({ empresa }: any) => {
          const razao = empresa.empresa || empresa.nome;
          const initials = (razao || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((w: string) => w[0]).join('').toUpperCase();
          return (
            <div className="space-y-4">
              {/* Identificação (somente leitura) */}
              <Card className="p-4">
                <div className="flex flex-col gap-4 md:flex-row md:items-center">
                  <div className="flex min-w-0 items-center gap-3 md:w-1/2 xl:w-1/3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-sm font-semibold text-primary" aria-hidden="true">
                      {initials}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-base font-semibold text-foreground" title={razao}>{razao}</p>
                      <p className="text-xs text-muted-foreground">CNPJ {formatCnpj(empresa.cnpj)}</p>
                    </div>
                  </div>
                  <div className="grid flex-1 grid-cols-1 gap-2 border-t border-border pt-3 md:border-l md:border-t-0 md:pl-4 md:pt-0">
                    <ReadOnly label="Nome" value={empresa.nome} />
                    <ReadOnly label="Atividade principal" value={empresa.atividadePrincipal} />
                  </div>
                </div>
              </Card>

              <form onSubmit={submit} className="space-y-4">
                <div className="grid gap-4 lg:grid-cols-5">
                  {/* Contato */}
                  <Card className="p-4 lg:col-span-2">
                    <SectionTitle icon={Phone} title="Contato" subtitle="Telefones e e-mail da empresa" />
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                      <FormField label="Telefone">{input('telefone', { inputMode: 'tel', autoComplete: 'tel' })}</FormField>
                      <FormField label="WhatsApp">{input('whatsapp', { inputMode: 'tel' })}</FormField>
                      <FormField label="E-mail" className="sm:col-span-2 lg:col-span-1 xl:col-span-2">{input('email', { type: 'email', autoComplete: 'email' })}</FormField>
                    </div>
                  </Card>

                  {/* Endereço */}
                  <Card className="p-4 lg:col-span-3">
                    <SectionTitle icon={MapPin} title="Endereço" subtitle="Endereço de cadastro da empresa" />
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-6">
                      <FormField label="CEP" className="col-span-1 sm:col-span-2">{input('cep', { inputMode: 'numeric', autoComplete: 'postal-code' })}</FormField>
                      <FormField label="Logradouro" className="col-span-2 sm:col-span-4">{input('logradouro', { autoComplete: 'address-line1' })}</FormField>
                      <FormField label="Número" className="col-span-1 sm:col-span-2">{input('numero')}</FormField>
                      <FormField label="Complemento" className="col-span-2 sm:col-span-4">{input('complemento', { autoComplete: 'address-line2' })}</FormField>
                      <FormField label="Bairro" className="col-span-2 sm:col-span-2">{input('bairro')}</FormField>
                      <FormField label="Cidade" className="col-span-1 sm:col-span-3">{input('cidade', { autoComplete: 'address-level2' })}</FormField>
                      <FormField label="UF" className="col-span-1 sm:col-span-1">
                        <input maxLength={2} className={inputClass} value={form.estado || ''} autoComplete="address-level1"
                          onChange={e => setForm({ ...form, estado: e.target.value.toUpperCase() })} />
                      </FormField>
                    </div>
                  </Card>
                </div>

                {/* Ações */}
                <Card className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Building2 size={14} aria-hidden="true" />
                    {dirty ? 'Há alterações não salvas.' : 'Razão social, nome e CNPJ são atualizados pela oficina.'}
                  </p>
                  <div className="flex gap-2 sm:justify-end">
                    <button type="button" className={`${btnSecondary} flex-1 sm:flex-none`} disabled={!dirty || saving} onClick={() => original && setForm(original)}>
                      Descartar alterações
                    </button>
                    <button type="submit" disabled={saving} className={`${btnPrimary} flex-1 sm:flex-none`}>
                      {saving ? 'Salvando…' : 'Salvar contato'}
                    </button>
                  </div>
                </Card>
              </form>
            </div>
          );
        }}
      </Loadable>
    </>
  );
}
