import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
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
  LinearProgress,
  MenuItem,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import type { ChipProps } from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
  CheckCircleOutlined,
  Close,
  DeleteOutlined,
  Download,
  EditOutlined,
  FilterAltOffOutlined,
  InboxOutlined,
  PostAdd,
  Search,
  Visibility,
} from '@mui/icons-material';
import { toast } from 'sonner';
import { PortalContabilidadeService } from '../../services/portalContabilidade';
import {
  formatBrlInput,
  formatBrlNumber,
  formatCompetenciaInput,
  formatDateBr,
  parseBrl,
  toDateInputValue,
} from '../../utils/brl';
import { STATUS_IMPOSTO, TIPOS_IMPOSTO, apiErrorMessage } from './impostos';

const STATUS_COLOR: Record<string, ChipProps['color']> = {
  'Aguardando envio': 'default',
  Enviado: 'info',
  Recebido: 'primary',
  Pago: 'success',
  'Em atraso': 'error',
  Reenviado: 'warning',
  Cancelado: 'default',
};

const MAX_DOWNLOAD_LOTE = 30;

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
  boleto: boolean;
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

const headCellSx = {
  bgcolor: 'grey.50',
  color: 'text.secondary',
  fontWeight: 600,
  fontSize: '0.75rem',
  whiteSpace: 'nowrap',
  borderBottom: '1px solid',
  borderColor: 'divider',
};

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

function ActionButton({
  title,
  onClick,
  disabled,
  color,
  children,
}: {
  title: string;
  onClick: () => void;
  disabled?: boolean;
  color?: 'primary' | 'success' | 'error' | 'default';
  children: ReactNode;
}) {
  return (
    <Tooltip title={title} arrow>
      <span>
        <IconButton aria-label={title} size="small" color={color} disabled={disabled} onClick={onClick}>
          {children}
        </IconButton>
      </span>
    </Tooltip>
  );
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
  const [selected, setSelected] = useState<Record<string, ImpostoListItem>>({});
  const [downloading, setDownloading] = useState(false);
  const [editing, setEditing] = useState<ImpostoListItem | null>(null);
  const [editForm, setEditForm] = useState({ competencia: '', boleto: 'sim', tipoImposto: '', vencimento: '', valor: '' });
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
    } catch (err) {
      setItems([]);
      setError(apiErrorMessage(err, 'Não foi possível carregar os impostos.'));
    } finally {
      setLoading(false);
    }
  }, [applied, page, sortBy, sortDir]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  const selectedIds = Object.keys(selected);
  const selectable = useMemo(() => items.filter((item) => item.possuiBoleto), [items]);
  const selectedOnPage = selectable.filter((item) => selected[item.id]).length;
  const selectedOtherPages = selectedIds.length - selectedOnPage;
  const overLimit = selectedIds.length > MAX_DOWNLOAD_LOTE;
  const hasActiveFilters = Object.values(applied).some(Boolean);

  const applyFilters = (event?: FormEvent) => {
    event?.preventDefault();
    setPage(1);
    setApplied(filters);
  };

  const clearFilters = () => {
    setFilters(EMPTY_FILTERS);
    setPage(1);
    setApplied(EMPTY_FILTERS);
  };

  const toggleSort = (field: string) => {
    setPage(1);
    if (sortBy === field) setSortDir((current) => (current === 'asc' ? 'desc' : 'asc'));
    else {
      setSortBy(field);
      setSortDir('asc');
    }
  };

  const toggleOne = (item: ImpostoListItem) => {
    setSelected((current) => {
      const next = { ...current };
      if (next[item.id]) delete next[item.id];
      else next[item.id] = item;
      return next;
    });
  };

  const togglePage = () => {
    setSelected((current) => {
      const next = { ...current };
      const allOnPage = selectable.length > 0 && selectable.every((item) => next[item.id]);
      selectable.forEach((item) => {
        if (allOnPage) delete next[item.id];
        else next[item.id] = item;
      });
      return next;
    });
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
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Não foi possível baixar o arquivo.'));
    }
  };

  const downloadSelected = async () => {
    if (selectedIds.length === 0 || overLimit) return;
    setDownloading(true);
    try {
      const response = await PortalContabilidadeService.downloadLote(selectedIds);
      saveBlob(response.data as Blob, 'impostos.zip');
      toast.success(`Download iniciado: ${selectedIds.length} arquivo(s) em impostos.zip.`);
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Não foi possível baixar os arquivos selecionados.'));
    } finally {
      setDownloading(false);
    }
  };

  const openEdit = (item: ImpostoListItem) => {
    setEditing(item);
    setEditForm({
      competencia: item.competencia,
      boleto: item.boleto ? 'sim' : 'nao',
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
        boleto: editForm.boleto === 'sim',
      });
      toast.success('Imposto atualizado.');
      setConfirmEdit(false);
      setEditing(null);
      await load();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Não foi possível salvar as alterações.'));
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
      setSelected((current) => {
        const next = { ...current };
        delete next[removing.id];
        return next;
      });
      setRemoving(null);
      await load();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Não foi possível excluir o imposto.'));
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
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Não foi possível lançar em Contas a Pagar.'));
    } finally {
      setSaving(false);
    }
  };

  const pages = Math.max(1, Math.ceil(total / pageSize));
  const firstRow = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const lastRow = Math.min(page * pageSize, total);

  const sortableHead = (field: string, label: string, align: 'left' | 'right' = 'left') => (
    <TableCell sx={headCellSx} align={align} sortDirection={sortBy === field ? sortDir : false}>
      <TableSortLabel active={sortBy === field} direction={sortBy === field ? sortDir : 'asc'} onClick={() => toggleSort(field)}>
        {label}
      </TableSortLabel>
    </TableCell>
  );

  return (
    <>
      <Paper
        component="section"
        aria-labelledby="consultar-impostos-titulo"
        variant={embedded ? 'elevation' : 'outlined'}
        elevation={0}
        sx={embedded ? { p: 0 } : { p: { xs: 2, md: 3 }, borderRadius: 3 }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
            <Typography
              id="consultar-impostos-titulo"
              variant="h6"
              component="h2"
              sx={{ fontWeight: 700, ...(embedded && { position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }) }}
            >
              Consultar / Baixar Impostos
            </Typography>
            <Chip
              size="small"
              variant="outlined"
              label={loading && total === 0 ? 'Carregando…' : `${total} registro(s)`}
              role="status"
              aria-live="polite"
            />
          </Box>
        </Box>

        <Box
          component="form"
          onSubmit={applyFilters}
          aria-label="Filtros de impostos"
          sx={{ p: 2, mb: 2, borderRadius: 2, bgcolor: 'grey.50', border: '1px solid', borderColor: 'divider' }}
        >
          <Box
            sx={{
              display: 'grid',
              gap: 1.5,
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)', lg: 'repeat(6, 1fr)' },
            }}
          >
            <TextField
              label="Competência inicial"
              placeholder="MM/AAAA"
              value={filters.competenciaDe}
              onChange={(event) => setFilters({ ...filters, competenciaDe: formatCompetenciaInput(event.target.value) })}
              size="small"
              fullWidth
              slotProps={{ inputLabel: { shrink: true }, htmlInput: { inputMode: 'numeric' } }}
              sx={{ bgcolor: 'background.paper' }}
            />
            <TextField
              label="Competência final"
              placeholder="MM/AAAA"
              value={filters.competenciaAte}
              onChange={(event) => setFilters({ ...filters, competenciaAte: formatCompetenciaInput(event.target.value) })}
              size="small"
              fullWidth
              slotProps={{ inputLabel: { shrink: true }, htmlInput: { inputMode: 'numeric' } }}
              sx={{ bgcolor: 'background.paper' }}
            />
            <TextField
              label="Vencimento inicial"
              type="date"
              value={filters.vencimentoDe}
              onChange={(event) => setFilters({ ...filters, vencimentoDe: event.target.value })}
              size="small"
              fullWidth
              slotProps={{ inputLabel: { shrink: true } }}
              sx={{ bgcolor: 'background.paper' }}
            />
            <TextField
              label="Vencimento final"
              type="date"
              value={filters.vencimentoAte}
              onChange={(event) => setFilters({ ...filters, vencimentoAte: event.target.value })}
              size="small"
              fullWidth
              slotProps={{ inputLabel: { shrink: true } }}
              sx={{ bgcolor: 'background.paper' }}
            />
            <TextField
              select
              label="Tipo de imposto"
              value={filters.tipoImposto}
              onChange={(event) => setFilters({ ...filters, tipoImposto: event.target.value })}
              size="small"
              fullWidth
              slotProps={{ inputLabel: { shrink: true }, select: { displayEmpty: true } }}
              sx={{ bgcolor: 'background.paper' }}
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
              fullWidth
              slotProps={{ inputLabel: { shrink: true }, select: { displayEmpty: true } }}
              sx={{ bgcolor: 'background.paper' }}
            >
              <MenuItem value="">Todos</MenuItem>
              {STATUS_IMPOSTO.map((status) => <MenuItem key={status} value={status}>{status}</MenuItem>)}
            </TextField>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 1.5, flexWrap: 'wrap' }}>
            <Button type="button" variant="text" color="inherit" startIcon={<FilterAltOffOutlined />} onClick={clearFilters}>
              Limpar
            </Button>
            <Button type="submit" variant="contained" startIcon={<Search />} disableElevation>
              Filtrar
            </Button>
          </Box>
        </Box>

        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 1.5,
            flexWrap: 'wrap',
            px: 2,
            py: 1.25,
            mb: 1.5,
            borderRadius: 2,
            bgcolor: (theme) => (selectedIds.length > 0 ? alpha(theme.palette.primary.main, 0.06) : 'transparent'),
            border: '1px solid',
            borderColor: selectedIds.length > 0 ? 'primary.light' : 'divider',
          }}
        >
          <Box role="status" aria-live="polite">
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {selectedIds.length === 0
                ? 'Nenhum imposto selecionado'
                : `${selectedIds.length} selecionado(s)`}
            </Typography>
            {selectedIds.length > 0 && (
              <Typography variant="caption" color={overLimit ? 'error' : 'text.secondary'}>
                {overLimit
                  ? `Limite de ${MAX_DOWNLOAD_LOTE} arquivos por download. Remova ${selectedIds.length - MAX_DOWNLOAD_LOTE} da seleção.`
                  : `${selectedOnPage} nesta página${selectedOtherPages > 0 ? ` · ${selectedOtherPages} em outras páginas` : ''}`}
              </Typography>
            )}
            {selectedIds.length === 0 && (
              <Typography variant="caption" color="text.secondary">
                Marque os impostos com boleto para baixar em um único arquivo ZIP.
              </Typography>
            )}
          </Box>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {selectedIds.length > 0 && (
              <Button size="small" color="inherit" onClick={() => setSelected({})}>
                Limpar seleção
              </Button>
            )}
            <Button
              variant="contained"
              disableElevation
              startIcon={downloading ? <CircularProgress size={16} color="inherit" /> : <Download />}
              disabled={selectedIds.length === 0 || downloading || overLimit}
              onClick={downloadSelected}
              aria-busy={downloading}
            >
              {downloading ? 'Gerando ZIP…' : `Baixar selecionados (${selectedIds.length})`}
            </Button>
          </Box>
        </Box>

        {error && (
          <Alert
            severity="error"
            sx={{ mb: 2 }}
            action={<Button color="inherit" size="small" onClick={load}>Tentar novamente</Button>}
          >
            {error}
          </Alert>
        )}

        {loading && items.length === 0 ? (
          <Box sx={{ py: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5 }} role="status" aria-live="polite">
            <CircularProgress size={32} />
            <Typography variant="body2" color="text.secondary">Carregando impostos…</Typography>
          </Box>
        ) : !error && items.length === 0 ? (
          <Box sx={{ py: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, textAlign: 'center' }}>
            <InboxOutlined sx={{ fontSize: 44, color: 'text.disabled' }} />
            <Typography sx={{ fontWeight: 600 }}>Nenhum imposto encontrado</Typography>
            <Typography variant="body2" color="text.secondary">
              {hasActiveFilters ? 'Ajuste ou limpe os filtros para ver outros resultados.' : 'Os impostos importados aparecerão aqui.'}
            </Typography>
            {hasActiveFilters && (
              <Button size="small" onClick={clearFilters} sx={{ mt: 1 }}>Limpar filtros</Button>
            )}
          </Box>
        ) : items.length > 0 ? (
          <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}>
            <Box sx={{ height: 4 }}>{loading && <LinearProgress aria-label="Atualizando lista" />}</Box>
            <TableContainer sx={{ maxHeight: 560, overflowX: 'auto' }}>
              <Table size="small" stickyHeader aria-label="Impostos importados" sx={{ minWidth: 1080, '& td': { py: 1.25 } }}>
                <TableHead>
                  <TableRow>
                    <TableCell padding="checkbox" sx={headCellSx}>
                      <Checkbox
                        size="small"
                        checked={selectable.length > 0 && selectedOnPage === selectable.length}
                        indeterminate={selectedOnPage > 0 && selectedOnPage < selectable.length}
                        disabled={selectable.length === 0}
                        onChange={togglePage}
                        slotProps={{ input: { 'aria-label': 'Selecionar impostos desta página' } }}
                      />
                    </TableCell>
                    <TableCell sx={headCellSx}>CNPJ</TableCell>
                    {sortableHead('competencia', 'Competência')}
                    <TableCell sx={headCellSx}>Tipo de imposto</TableCell>
                    {sortableHead('vencimento', 'Vencimento')}
                    {sortableHead('valor', 'Valor (R$)', 'right')}
                    <TableCell sx={headCellSx}>Arquivo</TableCell>
                    <TableCell sx={headCellSx} align="center">Boleto</TableCell>
                    {sortableHead('status', 'Status')}
                    <TableCell sx={headCellSx} align="right">Ações</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {items.map((item) => {
                    const isSelected = !!selected[item.id];
                    return (
                      <TableRow key={item.id} hover selected={isSelected}>
                        <TableCell padding="checkbox">
                          <Tooltip title={item.possuiBoleto ? '' : 'Sem boleto para baixar'}>
                            <span>
                              <Checkbox
                                size="small"
                                checked={isSelected}
                                disabled={!item.possuiBoleto}
                                onChange={() => toggleOne(item)}
                                slotProps={{ input: { 'aria-label': `Selecionar ${item.tipoImposto} ${item.competencia}` } }}
                              />
                            </span>
                          </Tooltip>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{item.cnpj || '—'}</Typography>
                          {item.razaoSocial && (
                            <Tooltip title={item.razaoSocial}>
                              <Typography variant="caption" color="text.secondary" noWrap component="p" sx={{ maxWidth: 180 }}>
                                {item.razaoSocial}
                              </Typography>
                            </Tooltip>
                          )}
                        </TableCell>
                        <TableCell sx={{ fontVariantNumeric: 'tabular-nums' }}>{item.competencia}</TableCell>
                        <TableCell sx={{ whiteSpace: 'nowrap' }}>{item.tipoImposto}</TableCell>
                        <TableCell sx={{ fontVariantNumeric: 'tabular-nums' }}>{formatDateBr(item.vencimento)}</TableCell>
                        <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600, whiteSpace: 'nowrap' }}>
                          {formatBrlNumber(item.valor)}
                        </TableCell>
                        <TableCell>
                          {item.arquivoNome ? (
                            <Tooltip title={item.arquivoNome}>
                              <Typography variant="body2" noWrap sx={{ maxWidth: 220 }} tabIndex={0}>
                                {item.arquivoNome}
                              </Typography>
                            </Tooltip>
                          ) : '—'}
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            size="small"
                            label={item.boleto ? 'Sim' : 'Não'}
                            color={item.boleto ? 'success' : 'default'}
                            variant={item.boleto ? 'filled' : 'outlined'}
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={item.status}
                            color={STATUS_COLOR[item.status] || 'default'}
                            variant={item.status === 'Aguardando envio' || item.status === 'Cancelado' ? 'outlined' : 'filled'}
                            sx={{ fontWeight: 500 }}
                          />
                        </TableCell>
                        <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                          <ActionButton
                            title={item.possuiBoleto ? 'Visualizar PDF' : 'Sem boleto para visualizar'}
                            disabled={!item.possuiBoleto}
                            onClick={() => downloadOne(item, true)}
                          >
                            <Visibility fontSize="small" />
                          </ActionButton>
                          <ActionButton
                            title={item.possuiBoleto ? 'Baixar PDF' : 'Sem boleto para baixar'}
                            disabled={!item.possuiBoleto}
                            onClick={() => downloadOne(item, false)}
                          >
                            <Download fontSize="small" />
                          </ActionButton>
                          {canLancarContasPagar && (
                            <ActionButton
                              title={item.payableId ? 'Já lançado em Contas a Pagar' : 'Adicionar em Contas a Pagar'}
                              color={item.payableId ? 'success' : 'primary'}
                              disabled={!!item.payableId}
                              onClick={() => setLancando(item)}
                            >
                              {item.payableId ? <CheckCircleOutlined fontSize="small" /> : <PostAdd fontSize="small" />}
                            </ActionButton>
                          )}
                          {canManage && (
                            <>
                              <ActionButton title="Editar imposto" onClick={() => openEdit(item)}>
                                <EditOutlined fontSize="small" />
                              </ActionButton>
                              <ActionButton title="Excluir imposto" color="error" onClick={() => setRemoving(item)}>
                                <DeleteOutlined fontSize="small" />
                              </ActionButton>
                            </>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        ) : null}

        {total > 0 && (
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2, gap: 2, flexWrap: 'wrap' }}>
            <Typography variant="body2" color="text.secondary">
              Mostrando {firstRow}–{lastRow} de {total}
            </Typography>
            <Box component="nav" aria-label="Paginação" sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <Button size="small" variant="outlined" disabled={page <= 1 || loading} onClick={() => setPage((current) => current - 1)}>
                Anterior
              </Button>
              <Typography variant="body2" sx={{ px: 1 }} aria-current="page">Página {page} de {pages}</Typography>
              <Button size="small" variant="outlined" disabled={page >= pages || loading} onClick={() => setPage((current) => current + 1)}>
                Próxima
              </Button>
            </Box>
          </Box>
        )}
      </Paper>

      <Dialog open={!!editing} onClose={() => setEditing(null)} fullWidth maxWidth="sm">
        <DialogTitle>Editar imposto</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <TextField
            label="Competência (MM/AAAA)"
            value={editForm.competencia}
            onChange={(event) => setEditForm({ ...editForm, competencia: formatCompetenciaInput(event.target.value) })}
            fullWidth
            sx={{ mt: 1 }}
            slotProps={{ htmlInput: { inputMode: 'numeric' } }}
          />
          <TextField select label="Boleto" value={editForm.boleto} onChange={(event) => setEditForm({ ...editForm, boleto: event.target.value })} fullWidth>
            <MenuItem value="sim">Sim</MenuItem>
            <MenuItem value="nao">Não</MenuItem>
          </TextField>
          <TextField select label="Tipo de imposto" value={editForm.tipoImposto} onChange={(event) => setEditForm({ ...editForm, tipoImposto: event.target.value })} fullWidth>
            {TIPOS_IMPOSTO.map((tipo) => <MenuItem key={tipo} value={tipo}>{tipo}</MenuItem>)}
          </TextField>
          <TextField label="Data de vencimento" type="date" value={editForm.vencimento} onChange={(event) => setEditForm({ ...editForm, vencimento: event.target.value })} fullWidth slotProps={{ inputLabel: { shrink: true } }} />
          <TextField label="Valor (R$)" value={editForm.valor} onChange={(event) => setEditForm({ ...editForm, valor: formatBrlInput(event.target.value) })} fullWidth slotProps={{ htmlInput: { inputMode: 'numeric' } }} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditing(null)}>Cancelar</Button>
          <Button variant="contained" onClick={() => setConfirmEdit(true)}>Salvar</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={confirmEdit} onClose={() => setConfirmEdit(false)}>
        <DialogTitle>Confirmar alterações</DialogTitle>
        <DialogContent>
          <Typography>Deseja salvar a competência, o boleto, o tipo, o vencimento e o valor deste imposto?</Typography>
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
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xl" scroll="paper">
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, fontWeight: 700 }}>
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
