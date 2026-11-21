import { useEffect, useState, type FormEvent } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { apiErrorMessage, portalGestorApi } from '../../services/portalGestor';
import { Card, EmptyState, Field, Loadable, Modal, PageHeader, StatusBadge, Table, btnDanger, btnPrimary, btnSecondary, formatDate, inputClass, useLoad } from './ui';

const EMPTY = { nome: '', cpf: '', cnh: '', categoriaCnh: '', validadeCnh: '', telefone: '', email: '', vehicleId: '', status: 'ATIVO', observacoes: '' };

const formatCpf = (v?: string | null) => {
  const d = (v || '').replace(/\D/g, '');
  return d.length === 11 ? d.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4') : v || '—';
};

export function PortalMotoristas() {
  const state = useLoad(() => portalGestorApi.motoristas());
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState<any>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<any | null>(null);

  useEffect(() => { portalGestorApi.veiculos({ status: 'all' }).then(setVehicles).catch(() => setVehicles([])); }, []);

  const open = (d?: any) => {
    setEditing(d || {});
    setForm(d ? {
      ...EMPTY, ...Object.fromEntries(Object.entries(d).map(([k, v]) => [k, v ?? ''])),
      validadeCnh: d.validadeCnh ? String(d.validadeCnh).slice(0, 10) : '',
      vehicleId: d.vehicleId || '',
    } : EMPTY);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const payload = {
      nome: form.nome, cpf: form.cpf, cnh: form.cnh || null, categoriaCnh: form.categoriaCnh || null,
      validadeCnh: form.validadeCnh || null, telefone: form.telefone || null, email: form.email || '',
      vehicleId: form.vehicleId || null, status: form.status, observacoes: form.observacoes || null,
    };
    try {
      if (editing?.id) await portalGestorApi.atualizarMotorista(editing.id, payload);
      else await portalGestorApi.criarMotorista(payload);
      toast.success(editing?.id ? 'Motorista atualizado.' : 'Motorista cadastrado.');
      setEditing(null);
      state.reload();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    try {
      await portalGestorApi.excluirMotorista(deleting.id);
      toast.success('Motorista excluído.');
      setDeleting(null);
      state.reload();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  };

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm({ ...form, [k]: e.target.value });
  const in30 = Date.now() + 30 * 86400000;

  return (
    <>
      <PageHeader title="Motoristas" description="Cadastre os motoristas da sua empresa e vincule-os aos veículos da frota."
        actions={<button type="button" className={btnPrimary} onClick={() => open()}><Plus size={16} /> Novo motorista</button>} />
      <Card>
        <Loadable state={state}>
          {(rows: any[]) => rows.length === 0 ? <EmptyState message="Nenhum motorista cadastrado." /> : (
            <Table head={['Nome', 'CPF', 'CNH', 'Validade CNH', 'Veículo', 'Contato', 'Status', '']}>
              {rows.map(d => {
                const vencendo = d.validadeCnh && new Date(d.validadeCnh).getTime() <= in30;
                return (
                  <tr key={d.id} className="hover:bg-muted/40">
                    <td className="px-4 py-2.5 font-medium">{d.nome}</td>
                    <td className="px-4 py-2.5 tabular-nums">{formatCpf(d.cpf)}</td>
                    <td className="px-4 py-2.5">{d.cnh || '—'}{d.categoriaCnh ? ` (${d.categoriaCnh})` : ''}</td>
                    <td className={`px-4 py-2.5 ${vencendo ? 'font-medium text-rose-600' : ''}`}>{formatDate(d.validadeCnh)}</td>
                    <td className="px-4 py-2.5">{d.vehicle ? `${d.vehicle.placa} · ${d.vehicle.modelo}` : '—'}</td>
                    <td className="px-4 py-2.5">{d.telefone || d.email || '—'}</td>
                    <td className="px-4 py-2.5"><StatusBadge status={d.status} /></td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-right">
                      <button type="button" aria-label={`Editar ${d.nome}`} onClick={() => open(d)} className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"><Pencil size={15} /></button>
                      <button type="button" aria-label={`Excluir ${d.nome}`} onClick={() => setDeleting(d)} className="rounded p-1.5 text-muted-foreground hover:bg-rose-500/10 hover:text-rose-600"><Trash2 size={15} /></button>
                    </td>
                  </tr>
                );
              })}
            </Table>
          )}
        </Loadable>
      </Card>

      {editing && (
        <Modal title={editing.id ? 'Editar motorista' : 'Novo motorista'} onClose={() => setEditing(null)}
          footer={<>
            <button type="button" className={btnSecondary} onClick={() => setEditing(null)}>Cancelar</button>
            <button type="submit" form="driver-form" className={btnPrimary} disabled={saving}>{saving ? 'Salvando…' : 'Salvar'}</button>
          </>}>
          <form id="driver-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2"><Field label="Nome completo"><input required minLength={3} className={inputClass} value={form.nome} onChange={set('nome')} /></Field></div>
            <Field label="CPF"><input required inputMode="numeric" className={inputClass} value={form.cpf} onChange={set('cpf')} placeholder="000.000.000-00" /></Field>
            <Field label="Telefone"><input className={inputClass} value={form.telefone} onChange={set('telefone')} /></Field>
            <Field label="Nº da CNH"><input className={inputClass} value={form.cnh} onChange={set('cnh')} /></Field>
            <Field label="Categoria"><input maxLength={5} className={inputClass} value={form.categoriaCnh} onChange={e => setForm({ ...form, categoriaCnh: e.target.value.toUpperCase() })} placeholder="Ex.: D" /></Field>
            <Field label="Validade da CNH"><input type="date" className={inputClass} value={form.validadeCnh} onChange={set('validadeCnh')} /></Field>
            <Field label="E-mail"><input type="email" className={inputClass} value={form.email} onChange={set('email')} /></Field>
            <Field label="Veículo vinculado">
              <select className={inputClass} value={form.vehicleId} onChange={set('vehicleId')}>
                <option value="">Nenhum</option>
                {vehicles.map(v => <option key={v.id} value={v.id}>{v.placa} — {v.marca} {v.modelo}</option>)}
              </select>
            </Field>
            <Field label="Status">
              <select className={inputClass} value={form.status} onChange={set('status')}>
                <option value="ATIVO">Ativo</option>
                <option value="INATIVO">Inativo</option>
              </select>
            </Field>
            <div className="sm:col-span-2"><Field label="Observações"><textarea rows={2} className={`${inputClass} h-auto py-2`} value={form.observacoes} onChange={set('observacoes')} /></Field></div>
          </form>
        </Modal>
      )}

      {deleting && (
        <Modal title="Excluir motorista" onClose={() => setDeleting(null)}
          footer={<>
            <button type="button" className={btnSecondary} onClick={() => setDeleting(null)}>Cancelar</button>
            <button type="button" className={btnDanger} onClick={confirmDelete}>Excluir</button>
          </>}>
          <p className="text-sm">Excluir o cadastro de <strong>{deleting.nome}</strong>? Esta ação não pode ser desfeita. Para manter o histórico, você pode marcá-lo como inativo.</p>
        </Modal>
      )}
    </>
  );
}
