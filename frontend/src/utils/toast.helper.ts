import { toast } from 'sonner';

export const handleApiError = (error: any, defaultMessage: string = 'Ocorreu um erro ao processar a requisição.') => {
  // Check if it's an HTTP Response object (from standard fetch)
  if (error instanceof Response) {
    const status = error.status;
    if (status === 409) {
      toast.error('Já existe um cadastro com os dados informados.', {
        description: 'Verifique se o CNPJ, CPF, Placa ou E-mail já estão cadastrados no sistema.',
        duration: 6000,
      });
      return;
    }
    if (status === 400) {
      toast.error('Dados inválidos. Verifique os campos e tente novamente.');
      return;
    }
    if (status === 401) {
      toast.error('Sessão expirada. Por favor, realize o login novamente.');
      return;
    }
    if (status === 403) {
      toast.error('Acesso negado. Você não possui permissão para realizar esta ação.');
      return;
    }
    if (status === 404) {
      toast.error('O registro solicitado não foi encontrado.');
      return;
    }
    if (status === 500) {
      toast.error('Erro interno do servidor. Tente novamente mais tarde.');
      return;
    }
  }

  // Check if it is an Axios error
  if (error?.response) {
    const status = error.response.status;
    const data = error.response.data;

    if (status === 409) {
      toast.error('Já existe um cadastro com os dados informados.', {
        description: 'Verifique se o CNPJ, CPF, Placa ou E-mail já estão cadastrados no sistema.',
        duration: 6000,
      });
      return;
    }

    if (status === 400) {
      const message = typeof data?.error === 'string' ? data.error : 'Dados inválidos. Verifique os campos e tente novamente.';
      toast.error(message);
      return;
    }

    if (status === 401) {
      toast.error('Sessão expirada. Por favor, realize o login novamente.');
      return;
    }

    if (status === 403) {
      toast.error('Acesso negado. Você não possui permissão para realizar esta ação.');
      return;
    }

    if (status === 404) {
      toast.error('O registro solicitado não foi encontrado.');
      return;
    }

    if (status === 500) {
      toast.error('Erro interno do servidor. Tente novamente mais tarde.');
      return;
    }
  }

  // Handle generic error formats
  if (error?.status === 409 || error?.error?.status === 409) {
    toast.error('Já existe um cadastro com os dados informados.', {
      description: 'Verifique se o CNPJ, CPF, Placa ou E-mail já estão cadastrados no sistema.',
      duration: 6000,
    });
    return;
  }

  if (error instanceof Error) {
    toast.error(error.message);
  } else if (typeof error === 'string') {
    toast.error(error);
  } else {
    toast.error(defaultMessage);
  }
};
