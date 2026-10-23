import React, { useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
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
import { alpha } from '@mui/material/styles';
import { CheckCircle, CloudUpload, Close, ErrorOutlined, PictureAsPdfOutlined } from '@mui/icons-material';
import { PortalContabilidadeService } from '../../services/portalContabilidade';
import { toast } from 'sonner';
import { formatBrlInput, formatCompetenciaInput, formatFileSize, isCompetenciaValida } from '../../utils/brl';
import { ConsultarImpostos } from './ConsultarImpostos';
import { TIPOS_IMPOSTO, apiErrorMessage } from './impostos';

const MAX_PDF_BYTES = 20 * 1024 * 1024;

interface Props {
  canManage?: boolean;
  canLancarContasPagar?: boolean;
}

interface ImportResult {
  sucesso: Array<{ arquivo: string; empresa?: string; valor?: number }>;
  erros: Array<{ arquivo: string; motivo: string }>;
}

const fileKey = (file: File) => `${file.name}::${file.size}`;

export const BulkUploadImpostos: React.FC<Props> = ({ canManage = true, canLancarContasPagar = false }) => {
  const [competencia, setCompetencia] = useState('');
  const [tipoImposto, setTipoImposto] = useState('');
  const [vencimento, setVencimento] = useState('');
  const [valor, setValor] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [rejeitados, setRejeitados] = useState<Array<{ nome: string; motivo: string }>>([]);
  const [fileErrors, setFileErrors] = useState<Record<string, string>>({});
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const showError = (field: string) => submitted || !!touched[field];
  const touch = (field: string) => () => setTouched((current) => ({ ...current, [field]: true }));
  const [refreshKey, setRefreshKey] = useState(0);
  const [results, setResults] = useState<ImportResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const competenciaErro = !competencia
    ? 'Informe a competência.'
    : !isCompetenciaValida(competencia)
      ? 'Use o formato MM/AAAA, por exemplo 08/2026.'
      : '';
  const tipoErro = tipoImposto ? '' : 'Selecione o tipo de imposto.';
  const vencimentoErro = vencimento ? '' : 'Informe a data de vencimento.';
  const arquivosErro = files.length > 0 ? '' : 'Selecione ao menos um PDF.';
  const pendencias = [competenciaErro, tipoErro, vencimentoErro, arquivosErro].filter(Boolean);
  const canSubmit = pendencias.length === 0 && !isUploading;

  const acceptFiles = (incoming: File[]) => {
    const novosRejeitados: Array<{ nome: string; motivo: string }> = [];
    const aceitos: File[] = [];
    incoming.forEach((file) => {
      const isPdf = file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf';
      if (!isPdf) novosRejeitados.push({ nome: file.name, motivo: 'apenas arquivos PDF são aceitos' });
      else if (file.size > MAX_PDF_BYTES) novosRejeitados.push({ nome: file.name, motivo: 'o arquivo excede 20 MB' });
      else aceitos.push(file);
    });
    setRejeitados(novosRejeitados);
    if (aceitos.length > 0) {
      setFiles((current) => {
        const existentes = new Set(current.map(fileKey));
        return [...current, ...aceitos.filter((file) => !existentes.has(fileKey(file)))];
      });
      setResults(null);
    }
  };

  const openPicker = () => {
    if (!isUploading) inputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) acceptFiles(Array.from(e.target.files));
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (isUploading) return;
    if (e.dataTransfer.files) acceptFiles(Array.from(e.dataTransfer.files));
  };

  const removeFile = (file: File) => {
    setFiles((current) => current.filter((item) => fileKey(item) !== fileKey(file)));
    setFileErrors((current) => {
      const next = { ...current };
      delete next[file.name];
      return next;
    });
  };

  const handleUpload = async () => {
    setSubmitted(true);
    if (!canSubmit) {
      toast.error('Preencha competência, tipo, vencimento e selecione os PDFs.');
      return;
    }

    try {
      setIsUploading(true);
      setResults(null);
      setFileErrors({});
      const data: ImportResult = await PortalContabilidadeService.bulkUpload(competencia, tipoImposto, vencimento, valor, files);
      setResults(data);

      const erros = Object.fromEntries(data.erros.map((erro) => [erro.arquivo, erro.motivo]));
      setFileErrors(erros);
      setFiles((current) => current.filter((file) => erros[file.name]));
      if (data.sucesso.length > 0) setRefreshKey((current) => current + 1);

      if (data.sucesso.length > 0 && data.erros.length === 0) {
        toast.success(`Importação concluída! ${data.sucesso.length} importados com sucesso.`);
        setSubmitted(false);
        setTouched({});
      } else if (data.sucesso.length > 0) {
        toast.warning(`${data.sucesso.length} importados e ${data.erros.length} com erro.`);
      } else {
        toast.error(`Nenhum arquivo foi importado: ${data.erros[0]?.motivo || 'erro desconhecido'}`);
      }
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Erro ao realizar upload em lote.'));
    } finally {
      setIsUploading(false);
    }
  };

  const dropzoneState = isUploading ? 'processing' : isDragging ? 'dragging' : files.length > 0 ? 'selected' : 'idle';

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {canManage && (
        <Paper component="section" aria-labelledby="importacao-titulo" variant="outlined" sx={{ p: { xs: 2, md: 3 }, borderRadius: 3 }}>
          <Box sx={{ mb: 2.5 }}>
            <Typography id="importacao-titulo" variant="h6" component="h2" sx={{ fontWeight: 700 }}>
              Importação em Lote de Boletos
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Os dados abaixo são aplicados a todos os PDFs enviados neste lote.
            </Typography>
          </Box>

          <Box
            sx={{
              display: 'grid',
              gap: 2,
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' },
              mb: 2.5,
            }}
          >
            <TextField
              label="Competência"
              placeholder="MM/AAAA"
              value={competencia}
              onChange={(e) => setCompetencia(formatCompetenciaInput(e.target.value))}
              onBlur={touch('competencia')}
              required
              fullWidth
              error={showError('competencia') && !!competenciaErro}
              helperText={showError('competencia') && competenciaErro ? competenciaErro : 'Formato MM/AAAA'}
              slotProps={{ inputLabel: { shrink: true }, htmlInput: { inputMode: 'numeric' } }}
            />
            <TextField
              select
              label="Tipo de imposto"
              value={tipoImposto}
              onChange={(e) => setTipoImposto(e.target.value)}
              onBlur={touch('tipo')}
              required
              fullWidth
              error={showError('tipo') && !!tipoErro}
              helperText={showError('tipo') && tipoErro ? tipoErro : ' '}
              slotProps={{ inputLabel: { shrink: true }, select: { displayEmpty: true } }}
            >
              <MenuItem value="" disabled>Selecione</MenuItem>
              {TIPOS_IMPOSTO.map((tipo) => (
                <MenuItem key={tipo} value={tipo}>{tipo}</MenuItem>
              ))}
            </TextField>
            <TextField
              label="Data de vencimento"
              type="date"
              value={vencimento}
              onChange={(e) => setVencimento(e.target.value)}
              onBlur={touch('vencimento')}
              required
              fullWidth
              error={showError('vencimento') && !!vencimentoErro}
              helperText={showError('vencimento') && vencimentoErro ? vencimentoErro : ' '}
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              label="Valor (R$)"
              placeholder="0,00"
              value={valor}
              onChange={(e) => setValor(formatBrlInput(e.target.value))}
              fullWidth
              helperText="Opcional · aplicado a todos os PDFs"
              slotProps={{ inputLabel: { shrink: true }, htmlInput: { inputMode: 'numeric' } }}
            />
          </Box>

          <input
            ref={inputRef}
            type="file"
            multiple
            accept="application/pdf,.pdf"
            onChange={handleFileChange}
            style={{ display: 'none' }}
            id="file-upload"
            aria-hidden="true"
            tabIndex={-1}
          />
          <Box
            role="button"
            tabIndex={isUploading ? -1 : 0}
            aria-label="Selecionar PDFs para importar. Também é possível arrastar e soltar os arquivos aqui."
            aria-disabled={isUploading}
            aria-describedby="upload-regras"
            onClick={openPicker}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                openPicker();
              }
            }}
            onDragOver={(e) => {
              e.preventDefault();
              if (!isUploading) setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            sx={(theme) => ({
              border: '2px dashed',
              borderColor:
                submitted && arquivosErro
                  ? 'error.main'
                  : dropzoneState === 'dragging' || dropzoneState === 'selected'
                    ? 'primary.main'
                    : 'divider',
              bgcolor:
                dropzoneState === 'dragging'
                  ? alpha(theme.palette.primary.main, 0.1)
                  : alpha(theme.palette.primary.main, 0.03),
              borderRadius: 3,
              px: 3,
              py: 4,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              gap: 1,
              cursor: isUploading ? 'progress' : 'pointer',
              opacity: isUploading ? 0.7 : 1,
              transition: 'background-color 150ms, border-color 150ms',
              '&:hover': { bgcolor: isUploading ? undefined : alpha(theme.palette.primary.main, 0.07) },
              '&:focus-visible': { outline: `3px solid ${alpha(theme.palette.primary.main, 0.4)}`, outlineOffset: 2 },
            })}
          >
            {isUploading ? <CircularProgress size={40} /> : <CloudUpload sx={{ fontSize: 44, color: 'primary.main' }} />}
            <Typography sx={{ fontWeight: 600 }}>
              {dropzoneState === 'processing'
                ? 'Processando importação…'
                : dropzoneState === 'dragging'
                  ? 'Solte os arquivos para adicionar'
                  : dropzoneState === 'selected'
                    ? `${files.length} PDF(s) prontos · clique ou arraste para adicionar mais`
                    : 'Arraste os PDFs aqui ou clique para selecionar'}
            </Typography>
            <Typography id="upload-regras" variant="body2" color="text.secondary">
              Somente PDF · até 20 MB por arquivo · vários arquivos por vez
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ maxWidth: 560 }}>
              Se o nome do arquivo tiver o CNPJ de uma empresa cadastrada, o imposto vai para ela. Caso contrário, fica na sua empresa.
            </Typography>
          </Box>
          {submitted && arquivosErro && (
            <Typography variant="caption" color="error" sx={{ display: 'block', mt: 1 }} role="alert">
              {arquivosErro}
            </Typography>
          )}

          {rejeitados.length > 0 && (
            <Alert severity="warning" sx={{ mt: 2 }} onClose={() => setRejeitados([])}>
              {rejeitados.length === 1 ? 'Um arquivo não foi adicionado:' : `${rejeitados.length} arquivos não foram adicionados:`}
              <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
                {rejeitados.map((item) => (
                  <li key={item.nome}>{item.nome}: {item.motivo}</li>
                ))}
              </Box>
            </Alert>
          )}

          {files.length > 0 && (
            <Box component="ul" aria-label="Arquivos selecionados" sx={{ listStyle: 'none', p: 0, m: 0, mt: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
              {files.map((file, index) => {
                const erro = fileErrors[file.name];
                return (
                  <Box
                    component="li"
                    key={fileKey(file)}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1.5,
                      px: 2,
                      py: 1.25,
                      borderTop: index === 0 ? 'none' : '1px solid',
                      borderColor: 'divider',
                    }}
                  >
                    <PictureAsPdfOutlined sx={{ color: erro ? 'error.main' : 'text.secondary' }} />
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Tooltip title={file.name}>
                        <Typography variant="body2" noWrap sx={{ fontWeight: 500 }}>{file.name}</Typography>
                      </Tooltip>
                      <Typography variant="caption" color={erro ? 'error' : 'text.secondary'}>
                        {formatFileSize(file.size)}{erro ? ` · ${erro}` : ''}
                      </Typography>
                    </Box>
                    <Chip
                      size="small"
                      label={isUploading ? 'Enviando' : erro ? 'Erro' : 'Pronto'}
                      color={erro && !isUploading ? 'error' : 'default'}
                      variant="outlined"
                      icon={isUploading ? <CircularProgress size={12} /> : erro ? <ErrorOutlined /> : undefined}
                    />
                    <Tooltip title="Remover arquivo">
                      <span>
                        <IconButton size="small" aria-label={`Remover ${file.name}`} disabled={isUploading} onClick={() => removeFile(file)}>
                          <Close fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </Box>
                );
              })}
            </Box>
          )}

          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
            <Typography variant="body2" color="text.secondary" role="status" aria-live="polite">
              {isUploading
                ? `Enviando ${files.length} arquivo(s)…`
                : pendencias.length > 0
                  ? `Pendente: ${pendencias.map((item) => item.replace(/\.$/, '').toLowerCase()).join(' · ')}`
                  : `${files.length} arquivo(s) prontos para importar`}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {files.length > 0 && (
                <Button color="inherit" disabled={isUploading} onClick={() => { setFiles([]); setFileErrors({}); }}>
                  Remover todos
                </Button>
              )}
              <Button
                variant="contained"
                size="large"
                disableElevation
                onClick={handleUpload}
                disabled={!canSubmit}
                aria-busy={isUploading}
                startIcon={isUploading ? <CircularProgress size={18} color="inherit" /> : <CloudUpload />}
              >
                {isUploading ? 'Processando…' : 'Processar importação'}
              </Button>
            </Box>
          </Box>

          {results && (
            <Box sx={{ mt: 3 }} role="region" aria-label="Resultado da importação">
              <Alert
                severity={results.erros.length === 0 ? 'success' : results.sucesso.length > 0 ? 'warning' : 'error'}
                sx={{ mb: 2 }}
              >
                {results.sucesso.length + results.erros.length} arquivo(s) processado(s): {results.sucesso.length} importado(s) e {results.erros.length} com erro.
                {results.erros.length > 0 && ' Os arquivos com erro continuam na lista acima para correção ou remoção.'}
              </Alert>
              <TableContainer sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, overflowX: 'auto' }}>
                <Table size="small" aria-label="Relatório de importação" sx={{ minWidth: 560 }}>
                  <TableHead>
                    <TableRow sx={{ '& th': { bgcolor: 'grey.50', fontWeight: 600, color: 'text.secondary' } }}>
                      <TableCell>Arquivo</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Detalhes</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {results.sucesso.map((s, idx) => (
                      <TableRow key={`succ-${idx}`}>
                        <TableCell>{s.arquivo}</TableCell>
                        <TableCell><Chip size="small" icon={<CheckCircle />} label="Importado" color="success" variant="outlined" /></TableCell>
                        <TableCell>
                          Empresa: {s.empresa}
                          {s.valor != null ? ` · ${Number(s.valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}` : ''}
                        </TableCell>
                      </TableRow>
                    ))}
                    {results.erros.map((e, idx) => (
                      <TableRow key={`err-${idx}`}>
                        <TableCell>{e.arquivo}</TableCell>
                        <TableCell><Chip size="small" icon={<ErrorOutlined />} label="Erro" color="error" variant="outlined" /></TableCell>
                        <TableCell sx={{ color: 'error.main' }}>{e.motivo}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
        </Paper>
      )}

      <ConsultarImpostos canManage={canManage} canLancarContasPagar={canLancarContasPagar} refreshKey={refreshKey} />
    </Box>
  );
};
