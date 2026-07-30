import React, { useState, useCallback } from 'react';
import { Box, Button, Typography, TextField, MenuItem, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, CircularProgress } from '@mui/material';
import { CloudUpload, CheckCircle, ErrorOutlined } from '@mui/icons-material';
import { PortalContabilidadeService } from '../../services/portalContabilidade';
import { toast } from 'sonner';

export const BulkUploadImpostos: React.FC = () => {
  const [competencia, setCompetencia] = useState('');
  const [tipoImposto, setTipoImposto] = useState('');
  const [vencimento, setVencimento] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  
  const [results, setResults] = useState<{
    sucesso: any[];
    erros: any[];
  } | null>(null);

  const tiposImposto = [
    'DAS', 'Simples Nacional', 'FGTS', 'INSS', 'IRRF', 
    'PIS', 'COFINS', 'CSLL', 'ICMS', 'ISS', 'IPI', 'DARF', 'GPS', 'GARE', 'Outros'
  ];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files) {
      setFiles(Array.from(e.dataTransfer.files));
    }
  }, []);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleUpload = async () => {
    if (!competencia || !tipoImposto || !vencimento || files.length === 0) {
      toast.error('Preencha todos os campos e selecione os arquivos.');
      return;
    }

    try {
      setIsUploading(true);
      const data = await PortalContabilidadeService.bulkUpload(competencia, tipoImposto, vencimento, files);
      setResults(data);
      toast.success(`Importação concluída! ${data.sucesso.length} importados com sucesso.`);
      
      // Limpa formulário após sucesso (opcional)
      setFiles([]);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao realizar upload em lote.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h4" className="text-gray-800" sx={{ mb: 4, fontWeight: 'bold' }}>
        Importação em Lote de Boletos
      </Typography>

      <Paper sx={{ p: 3, mb: 4 }} elevation={2} className="rounded-xl border border-gray-100 shadow-sm">
        <Typography variant="h6" className="text-gray-700" sx={{ mb: 3 }}>
          Dados Gerais (Aplicados a todos os arquivos)
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 3, mb: 4 }}>
          <TextField
            label="Competência (MM/AAAA)"
            placeholder="Ex: 07/2026"
            value={competencia}
            onChange={(e) => setCompetencia(e.target.value)}
            fullWidth
            required
          />
          
          <TextField
            select
            label="Tipo de Imposto"
            value={tipoImposto}
            onChange={(e) => setTipoImposto(e.target.value)}
            fullWidth
            required
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
            InputLabelProps={{ shrink: true } as any}
            variant="outlined"
            value={vencimento}
            onChange={(e) => setVencimento(e.target.value)}
            fullWidth
            required
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
              Nomes dos arquivos devem conter o CNPJ da empresa (14 dígitos).
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
                    <TableCell>Empresa: {s.empresa}</TableCell>
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
    </Box>
  );
};
