import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { CheckCircleOutlined, Close, DeleteOutlined, Download, EditOutlined, PostAdd, Visibility } from '@mui/icons-material';
import { toast } from 'sonner';
import { PortalContabilidadeService } from '../../services/portalContabilidade';
import { formatBrlInput, formatBrlNumber, formatDateBr, parseBrl, toDateInputValue } from '../../utils/brl';

const TIPOS_IMPOSTO = [
  'DAS', 'Simples Nacional', 'FGTS', 'INSS', 'IRRF',
  'PIS', 'COFINS', 'CSLL', 'ICMS', 'ISS', 'IPI', 'DARF', 'GPS', 'GARE', 'Outros',
];

const STATUS_IMPOSTO = [
  'Aguardando envio', 'Enviado', 'Recebido', 'Pago', 'Em atraso', 'Reenviado', 'Cancelado',
];

export interface ImpostoListItem {
  id: string;
  cnpj: string;
  razaoSocial: string;
  competencia: string;
  tipoImposto: string;
  vencimento: string;
  valor: number;
  arquivoNome: string;
  possuiBoleto: boolean;
  status: string;
  payableId: string | null;
}

interface Props {
  canManage: boolean;
  canLancarContasPagar?: boolean;
  refreshKey?: number;
  embedded?: boolean;
  onLancado?: () => void;
}

const EMPTY_FILTERS = {
  competenciaDe: '',
  competenciaAte: '',
  vencimentoDe: '',
  vencimentoAte: '',
  tipoImposto: '',
  status: '',
};

function formatCompetenciaInput(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 6);
  return digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
}

function filenameFrom(header: string | undefined, fallback: string) {
  const match = header?.match(/filename="([^"]+)"/);
  return match?.[1] || fallback;
}

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function ConsultarImpostos({ canManage, canLancarContasPagar = false, refreshKey = 0, embedded = false, onLancado }: Props) {
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [applied, setApplied] = useState(filters);
  const [sortBy, setSortBy] = useState('vencimento');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [items, setItems] = useState<ImpostoListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [downloading, setDownloading] = useState(false);
  const [editing, setEditing] = useState<ImpostoListItem | null>(null);
  const [editForm, setEditForm] = useState({ competencia: '', tipoImposto: '', vencimento: '', valor: '' });
  const [confirmEdit, setConfirmEdit] = useState(false);
  const [removing, setRemoving] = useState<ImpostoListItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [lancando, setLancando] = useState<ImpostoListItem | null>(null);
  const pageSize = 10;

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await PortalContabilidadeService.getImpostos({
        ...applied,
        page,
        pageSize,
        sortBy,
        sortDir,
      });
      setItems(data.items || []);
      setTotal(data.total || 0);
    } catch (err: any) {
      setItems([]);
      setError(err.response?.data?.error || 'Não foi possível carregar os impostos.');
    } finally {
      setLoading(false);
    }
  }, [applied, page, sortBy, sortDir]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  const toggleSort = (field: string) => {
    setPage(1);
    if (sortBy === field) setSortDir((current) => (current === 'asc' ? 'desc' : 'asc'));
    else {
      setSortBy(field);
      setSortDir('asc');
    }
  };

  const toggleAll = () => {
    if (selected.length === items.length) setSelected([]);
    else setSelected(items.map((item) => item.id));
  };

  const downloadOne = async (item: ImpostoListItem, inline: boolean) => {
    try {
      const response = await PortalContabilidadeService.downloadImposto(item.id, inline);
      const blob = response.data as Blob;
      if (inline) {
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank', 'noopener');
        setTimeout(() => URL.revokeObjectURL(url), 60000);
        return;
      }
      saveBlob(blob, filenameFrom(response.headers['content-disposition'], item.arquivoNome || 'imposto.pdf'));
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Não foi possível baixar o arquivo.');
    }
  };

  const downloadSelected = async () => {
    if (selected.length === 0) return;
    setDownloading(true);
    try {
      const response = await PortalContabilidadeService.downloadLote(selected);
      saveBlob(response.data as Blob, 'impostos.zip');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Não foi possível baixar os arquivos selecionados.');
    } finally {
      setDownloading(false);
    }
  };

  const openEdit = (item: ImpostoListItem) => {
    setEditing(item);
    setEditForm({
      competencia: item.competencia,
      tipoImposto: item.tipoImposto,
      vencimento: toDateInputValue(item.vencimento),
      valor: formatBrlInput(String(Math.round(item.valor * 100))),
    });
  };

  const saveEdit = async () => {
    if (!editing) return;
    const valor = parseBrl(editForm.valor) ?? 0;
    setSaving(true);
    try {
      await PortalContabilidadeService.updateImposto(editing.id, {
        competencia: editForm.competencia,
        tipoImposto: editForm.tipoImposto,
        vencimento: editForm.vencimento,
        valor,
      });
      toast.success('Imposto atualizado.');
      setConfirmEdit(false);
      setEditing(null);
      await load();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Não foi possível salvar as alterações.');
    } finally {
      setSaving(false);
    }
  };

  const confirmRemove = async () => {
    if (!removing) return;
    setSaving(true);
    try {
      await PortalContabilidadeService.deleteImposto(removing.id);
      toast.success('Imposto excluído.');
      setRemoving(null);
      setSelected((current) => current.filter((id) => id !== removing.id));
      await load();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Não foi possível excluir o imposto.');
    } finally {
      setSaving(false);
    }
  };

  const confirmLancar = async () => {
    if (!lancando) return;
    setSaving(true);
    try {
      const result = await PortalContabilidadeService.lancarContasPagar(lancando.id);
      toast.success(`Lançado em Contas a Pagar (nº ${result.numeroLancamento}) com vencimento ${formatDateBr(lancando.vencimento)}.`);
      setLancando(null);
      onLancado?.();
      await load();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Não foi possível lançar em Contas a Pagar.');
    } finally {
      setSaving(false);
    }
  };

  const pages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <>
      <Paper
        sx={embedded ? { p: 0 } : { p: 3, mt: 4 }}
        elevation={embedded ? 0 : 2}
        className={embedded ? undefined : 'rounded-xl border border-gray-100 shadow-sm'}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: embedded ? 'flex-end' : 'space-between', gap: 2, flexWrap: 'wrap', mb: 3 }}>
          {!embedded && (
            <Typography variant="h6" className="text-gray-700">
              Consultar / Baixar Impostos
            </Typography>
          )}
          <Button
            variant="contained"
            startIcon={downloading ? <CircularProgress size={16} color="inherit" /> : <Download />}
            disabled={selected.length === 0 || downloading}
            onClick={downloadSelected}
          >
            Baixar selecionados ({selected.length})
          </Button>
        </Box>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2 }}>
            <TextField
              label="Competência de"
              placeholder="MM/AAAA"
              value={filters.competenciaDe}
              onChange={(event) => setFilters({ ...filters, competenciaDe: formatCompetenciaInput(event.target.value) })}
              size="small"
              sx={{ flex: '1 1 130px' }}
            />
            <TextField
              label="Competência até"
              placeholder="MM/AAAA"
              value={filters.competenciaAte}
              onChange={(event) => setFilters({ ...filters, competenciaAte: formatCompetenciaInput(event.target.value) })}
              size="small"
              sx={{ flex: '1 1 130px' }}
            />
            <TextField
              label="Vencimento de"
              type="date"
              value={filters.vencimentoDe}
              onChange={(event) => setFilters({ ...filters, vencimentoDe: event.target.value })}
              size="small"
              sx={{ flex: '1 1 150px' }}
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              label="Vencimento até"
              type="date"
              value={filters.vencimentoAte}
              onChange={(event) => setFilters({ ...filters, vencimentoAte: event.target.value })}
              size="small"
              sx={{ flex: '1 1 150px' }}
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              select
              label="Tipo de imposto"
              value={filters.tipoImposto}
              onChange={(event) => setFilters({ ...filters, tipoImposto: event.target.value })}
              size="small"
              sx={{ flex: '1 1 180px' }}
            >
              <MenuItem value="">Todos</MenuItem>
              {TIPOS_IMPOSTO.map((tipo) => <MenuItem key={tipo} value={tipo}>{tipo}</MenuItem>)}
            </TextField>
            <TextField
              select
              label="Status"
              value={filters.status}
              onChange={(event) => setFilters({ ...filters, status: event.target.value })}
              size="small"
              sx={{ flex: '1 1 160px' }}
            >
              <MenuItem value="">Todos</MenuItem>
              {STATUS_IMPOSTO.map((status) => <MenuItem key={status} value={status}>{status}</MenuItem>)}
            </TextField>
            <Button
              variant="contained"
              onClick={() => {
                setPage(1);
                setApplied(filters);
              }}
            >
              Filtrar
            </Button>
            <Button
              onClick={() => {
                setFilters(EMPTY_FILTERS);
                setPage(1);
                setApplied(EMPTY_FILTERS);
              }}
            >
              Limpar
            </Button>
          </Box>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          {loading ? (
            <Box sx={{ py: 8, display: 'flex', justifyContent: 'center' }}>
              <CircularProgress />
            </Box>
          ) : items.length === 0 ? (
            <Typography color="text.secondary" sx={{ py: 6, textAlign: 'center' }}>
              Nenhum imposto encontrado.
            </Typography>
          ) : (
            <TableContainer sx={{ overflowX: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={selected.length === items.length && items.length > 0}
                        indeterminate={selected.length > 0 && selected.length < items.length}
                        onChange={toggleAll}
                        slotProps={{ input: { 'aria-label': 'Selecionar página' } }}
                      />
                    </TableCell>
                    <TableCell>CNPJ</TableCell>
                    <TableCell onClick={() => toggleSort('competencia')} sx={{ cursor: 'pointer' }}>Competência</TableCell>
                    <TableCell>Tipo de imposto</TableCell>
                    <TableCell onClick={() => toggleSort('vencimento')} sx={{ cursor: 'pointer' }}>Vencimento</TableCell>
                    <TableCell onClick={() => toggleSort('valor')} sx={{ cursor: 'pointer' }}>Valor (R$)</TableCell>
                    <TableCell>Arquivo</TableCell>
                    <TableCell align="center">Boleto</TableCell>
                    <TableCell onClick={() => toggleSort('status')} sx={{ cursor: 'pointer' }}>Status</TableCell>
                    <TableCell>Ações</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.id} hover>
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={selected.includes(item.id)}
                          onChange={() => setSelected((current) => current.includes(item.id)
                            ? current.filter((id) => id !== item.id)
                            : [...current, item.id])}
                          slotProps={{ input: { 'aria-label': `Selecionar ${item.arquivoNome || item.cnpj}` } }}
                        />
                      </TableCell>
                      <TableCell>{item.cnpj}</TableCell>
                      <TableCell>{item.competencia}</TableCell>
                      <TableCell>{item.tipoImposto}</TableCell>
                      <TableCell>{formatDateBr(item.vencimento)}</TableCell>
                      <TableCell>{formatBrlNumber(item.valor)}</TableCell>
                      <TableCell>{item.arquivoNome || '—'}</TableCell>
                      <TableCell align="center">
                        <Chip
                          size="small"
                          label={item.possuiBoleto ? 'Sim' : 'Não'}
                          color={item.possuiBoleto ? 'success' : 'default'}
                          variant={item.possuiBoleto ? 'filled' : 'outlined'}
                        />
                      </TableCell>
                      <TableCell>{item.status}</TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>
                        <IconButton aria-label="Visualizar PDF" onClick={() => downloadOne(item, true)} disabled={!item.arquivoNome}>
                          <Visibility fontSize="small" />
                        </IconButton>
                        <IconButton aria-label="Baixar PDF" onClick={() => downloadOne(item, false)} disabled={!item.arquivoNome}>
                          <Download fontSize="small" />
                        </IconButton>
                        {canLancarContasPagar && (
                          <Tooltip title={item.payableId ? 'Já lançado em Contas a Pagar' : 'Adicionar em Contas a Pagar'}>
                            <span>
                              <IconButton
                                aria-label="Adicionar em Contas a Pagar"
                                color={item.payableId ? 'success' : 'primary'}
                                disabled={!!item.payableId}
                                onClick={() => setLancando(item)}
                              >
                                {item.payableId ? <CheckCircleOutlined fontSize="small" /> : <PostAdd fontSize="small" />}
                              </IconButton>
                            </span>
                          </Tooltip>
                        )}
                        {canManage && (
                          <>
                            <IconButton aria-label="Editar imposto" onClick={() => openEdit(item)}>
                              <EditOutlined fontSize="small" />
                            </IconButton>
                            <IconButton aria-label="Excluir imposto" onClick={() => setRemoving(item)}>
                              <DeleteOutlined fontSize="small" />
                            </IconButton>
                          </>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2, gap: 2, flexWrap: 'wrap' }}>
            <Typography variant="body2" color="text.secondary">{total} registro(s)</Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>Anterior</Button>
              <Typography sx={{ alignSelf: 'center' }}>{page} / {pages}</Typography>
              <Button disabled={page >= pages} onClick={() => setPage((current) => current + 1)}>Próxima</Button>
            </Box>
          </Box>
      </Paper>

      <Dialog open={!!editing} onClose={() => setEditing(null)} fullWidth maxWidth="sm">
        <DialogTitle>Editar imposto</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <TextField label="Competência (MM/AAAA)" value={editForm.competencia} onChange={(event) => setEditForm({ ...editForm, competencia: event.target.value })} fullWidth sx={{ mt: 1 }} />
          <TextField select label="Tipo de imposto" value={editForm.tipoImposto} onChange={(event) => setEditForm({ ...editForm, tipoImposto: event.target.value })} fullWidth>
            {TIPOS_IMPOSTO.map((tipo) => <MenuItem key={tipo} value={tipo}>{tipo}</MenuItem>)}
          </TextField>
          <TextField label="Data de vencimento" type="date" value={editForm.vencimento} onChange={(event) => setEditForm({ ...editForm, vencimento: event.target.value })} fullWidth slotProps={{ inputLabel: { shrink: true } }} />
          <TextField label="Valor (R$)" value={editForm.valor} onChange={(event) => setEditForm({ ...editForm, valor: formatBrlInput(event.target.value) })} fullWidth />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditing(null)}>Cancelar</Button>
          <Button variant="contained" onClick={() => setConfirmEdit(true)}>Salvar</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={confirmEdit} onClose={() => setConfirmEdit(false)}>
        <DialogTitle>Confirmar alterações</DialogTitle>
        <DialogContent>
          <Typography>Deseja salvar a competência, o tipo, o vencimento e o valor deste imposto?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmEdit(false)}>Voltar</Button>
          <Button variant="contained" disabled={saving} onClick={saveEdit}>Confirmar</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!lancando} onClose={() => setLancando(null)}>
        <DialogTitle>Adicionar em Contas a Pagar</DialogTitle>
        <DialogContent>
          <Typography>
            Criar conta a pagar de {lancando?.tipoImposto} (competência {lancando?.competencia}) no valor de {formatBrlNumber(lancando?.valor ?? 0)} com vencimento em {lancando ? formatDateBr(lancando.vencimento) : ''}?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLancando(null)}>Cancelar</Button>
          <Button variant="contained" disabled={saving} onClick={confirmLancar}>Adicionar</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!removing} onClose={() => setRemoving(null)}>
        <DialogTitle>Excluir imposto</DialogTitle>
        <DialogContent>
          <Typography>
            Confirma a exclusão de {removing?.arquivoNome || 'este imposto'} ({removing?.cnpj})? O registro deixa de aparecer na consulta.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRemoving(null)}>Cancelar</Button>
          <Button color="error" variant="contained" disabled={saving} onClick={confirmRemove}>Excluir</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

interface ModalProps extends Omit<Props, 'embedded' | 'refreshKey'> {
  open: boolean;
  onClose: () => void;
}

export function ConsultarImpostosModal({ open, onClose, ...props }: ModalProps) {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg" scroll="paper">
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
        Consultar / Baixar Impostos
        <IconButton aria-label="Fechar" onClick={onClose}>
          <Close />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        {open && <ConsultarImpostos {...props} embedded />}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Fechar</Button>
      </DialogActions>
    </Dialog>
  );
}
