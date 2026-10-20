import React, { useState, useCallback } from 'react';
import { Box, Button, Typography, TextField, MenuItem, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, CircularProgress } from '@mui/material';
import { CloudUpload, CheckCircle, ErrorOutlined } from '@mui/icons-material';
import { PortalContabilidadeService } from '../../services/portalContabilidade';
import { toast } from 'sonner';
import { formatBrlInput } from '../../utils/brl';
import { ConsultarImpostos } from './ConsultarImpostos';

const MAX_PDF_BYTES = 20 * 1024 * 1024;

interface Props {
  canManage?: boolean;
}

export const BulkUploadImpostos: React.FC<Props> = ({ canManage = true }) => {
  const [competencia, setCompetencia] = useState('');
  const [tipoImposto, setTipoImposto] = useState('');
  const [vencimento, setVencimento] = useState('');
  const [valor, setValor] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  
  const [results, setResults] = useState<{
    sucesso: any[];
    erros: any[];
  } | null>(null);

  const tiposImposto = [
    'DAS', 'Simples Nacional', 'FGTS', 'INSS', 'IRRF', 
    'PIS', 'COFINS', 'CSLL', 'ICMS', 'ISS', 'IPI', 'DARF', 'GPS', 'GARE', 'Outros'
  ];

  const acceptFiles = (incoming: File[]) => {
    const accepted: File[] = [];
    incoming.forEach((file) => {
      const isPdf = file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf';
      if (!isPdf) {
        toast.error(`${file.name}: apenas PDF é permitido.`);
        return;
      }
      if (file.size > MAX_PDF_BYTES) {
        toast.error(`${file.name}: o arquivo excede 20 MB.`);
        return;
      }
      accepted.push(file);
    });
    if (accepted.length > 0) setFiles(accepted);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) acceptFiles(Array.from(e.target.files));
  };

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files) acceptFiles(Array.from(e.dataTransfer.files));
  }, []);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleUpload = async () => {
    if (!competencia || !tipoImposto || !vencimento || files.length === 0) {
      toast.error('Preencha competência, tipo, vencimento e selecione os PDFs.');
      return;
    }

    try {
      setIsUploading(true);
      setResults(null);
      const data = await PortalContabilidadeService.bulkUpload(competencia, tipoImposto, vencimento, valor, files);
      setResults(data);
      if (data.sucesso.length > 0) setRefreshKey((current) => current + 1);
      if (data.sucesso.length > 0 && data.erros.length === 0) {
        toast.success(`Importação concluída! ${data.sucesso.length} importados com sucesso.`);
        setFiles([]);
      } else if (data.sucesso.length > 0) {
        toast.warning(`${data.sucesso.length} importados e ${data.erros.length} com erro.`);
        setFiles([]);
      } else {
        toast.error(`Nenhum arquivo foi importado: ${data.erros[0]?.motivo || 'erro desconhecido'}`);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao realizar upload em lote.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      <Typography variant="h4" className="text-gray-800" sx={{ fontWeight: 'bold', mb: 4 }}>
        {canManage ? 'Importação em Lote de Boletos' : 'Impostos importados'}
      </Typography>

      {canManage && (
      <>
      <Paper sx={{ p: 3, mb: 4 }} elevation={2} className="rounded-xl border border-gray-100 shadow-sm">
        <Typography variant="h6" className="text-gray-700" sx={{ mb: 3 }}>
          Dados Gerais (Aplicados a todos os arquivos)
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 3, mb: 4, flexWrap: 'wrap' }}>
          <TextField
            label="Competência (MM/AAAA)"
            placeholder="Ex: 07/2026"
            value={competencia}
            onChange={(e) => setCompetencia(e.target.value)}
            required
            sx={{ flex: '1 1 180px' }}
          />
          
          <TextField
            select
            label="Tipo de Imposto"
            value={tipoImposto}
            onChange={(e) => setTipoImposto(e.target.value)}
            required
            sx={{ flex: '1 1 180px' }}
          >
            {tiposImposto.map((tipo) => (
              <MenuItem key={tipo} value={tipo}>
                {tipo}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            label="Data de Vencimento"
            type="date"
            variant="outlined"
            value={vencimento}
            onChange={(e) => setVencimento(e.target.value)}
            required
            sx={{ flex: '1 1 180px' }}
            slotProps={{ inputLabel: { shrink: true } }}
          />

          <TextField
            label="Valor (R$)"
            placeholder="Ex: 1.250,50"
            value={valor}
            onChange={(e) => setValor(formatBrlInput(e.target.value))}
            sx={{ flex: '1 1 160px' }}
          />
        </Box>

        <Box 
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          className="border-2 border-dashed border-blue-300 rounded-xl p-8 flex flex-col items-center justify-center bg-blue-50 cursor-pointer hover:bg-blue-100 transition-colors"
          sx={{ minHeight: '200px' }}
        >
          <input
            type="file"
            multiple
            accept="application/pdf"
            onChange={handleFileChange}
            style={{ display: 'none' }}
            id="file-upload"
          />
          <label htmlFor="file-upload" className="w-full flex flex-col items-center cursor-pointer">
            <CloudUpload sx={{ fontSize: 60, color: '#3b82f6', mb: 2 }} />
            <Typography variant="h6" color="primary" sx={{ mb: 2 }}>
              Arraste seus PDFs aqui ou clique para selecionar
            </Typography>
            <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
              Se o nome do arquivo tiver o CNPJ de uma empresa cadastrada, o imposto vai para ela. Caso contrário, fica na sua empresa.
            </Typography>
            {files.length > 0 && (
              <Chip 
                label={`${files.length} arquivo(s) selecionado(s)`} 
                color="primary" 
                sx={{ mt: 2 }} 
              />
            )}
          </label>
        </Box>

        <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end' }}>
          <Button 
            variant="contained" 
            size="large" 
            color="primary"
            onClick={handleUpload}
            disabled={isUploading}
            startIcon={isUploading ? <CircularProgress size={20} /> : <CloudUpload />}
            className="rounded-lg shadow-md"
          >
            {isUploading ? 'Processando Importação...' : 'Processar Importação'}
          </Button>
        </Box>
      </Paper>

      {/* Resultados da Importação */}
      {results && (
        <Paper sx={{ p: 3, mt: 6 }} elevation={2} className="rounded-xl border border-gray-100 shadow-sm">
          <Typography variant="h6" className="text-gray-700" sx={{ mb: 2 }}>
            Relatório de Importação
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
            <Chip icon={<CheckCircle />} label={`${results.sucesso.length} Sucessos`} color="success" />
            <Chip icon={<ErrorOutlined />} label={`${results.erros.length} Erros`} color="error" />
          </Box>

          <TableContainer>
            <Table size="small">
              <TableHead className="bg-gray-50">
                <TableRow>
                  <TableCell><strong>Arquivo</strong></TableCell>
                  <TableCell><strong>Status</strong></TableCell>
                  <TableCell><strong>Detalhes</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {results.sucesso.map((s, idx) => (
                  <TableRow key={`succ-${idx}`}>
                    <TableCell>{s.arquivo}</TableCell>
                    <TableCell><Chip size="small" label="Sucesso" color="success" variant="outlined" /></TableCell>
                    <TableCell>Empresa: {s.empresa}{s.valor != null ? ` · ${Number(s.valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}` : ''}</TableCell>
                  </TableRow>
                ))}
                {results.erros.map((e, idx) => (
                  <TableRow key={`err-${idx}`}>
                    <TableCell>{e.arquivo}</TableCell>
                    <TableCell><Chip size="small" label="Erro" color="error" variant="outlined" /></TableCell>
                    <TableCell className="text-red-500">{e.motivo}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}
      </>
      )}

      <ConsultarImpostos canManage={canManage} refreshKey={refreshKey} />
    </Box>
  );
};
