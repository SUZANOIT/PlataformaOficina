import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { 
  Shield, 
  FileSpreadsheet, 
  ArrowDownCircle, 
  ArrowUpCircle, 
  BarChart3, 
  Eye, 
  EyeOff, 
  Lock, 
  Mail, 
  User as UserIcon, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  X, 
  Loader2, 
  Filter, 
  Users as UsersIcon,
  ShieldCheck,
  CheckCircle,
  UserCheck,
  XCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../services/api';
import { handleApiError } from '../utils/toast.helper';

// TypeScript Interface
interface UserFormValues {
  nome: string;
  email: string;
  senha?: string;
  status: 'ACTIVE' | 'INACTIVE';
  roleAdmin: boolean;
  roleOrcamentista: boolean;
  roleContasPagar: boolean;
  roleContasReceber: boolean;
  roleContabilidade: boolean;
  roleRh: boolean;
  roleColaborador: boolean;
}

// Helper to get custom gradient background based on user name
const getGradientByName = (name: string) => {
  const code = name ? name.charCodeAt(0) : 65;
  const gradients = [
    'from-indigo-500 to-purple-600',
    'from-amber-500 to-rose-500',
    'from-emerald-400 to-teal-600',
    'from-blue-500 to-cyan-500',
    'from-pink-500 to-violet-600',
  ];
  return gradients[code % gradients.length];
};

// Dynamic Zod Validation Schema
const getFormSchema = (isEdit: boolean) => {
  return z.object({
    nome: z.string().min(3, 'O nome completo deve ter pelo menos 3 caracteres'),
    email: z.string().email('Por favor, informe um e-mail válido'),
    senha: isEdit 
      ? z.string().optional().or(z.literal('')) // optional on edit
      : z.string().min(6, 'A senha deve ter pelo menos 6 caracteres'), // required on create
    status: z.enum(['ACTIVE', 'INACTIVE']),
    roleAdmin: z.boolean().default(false),
    roleOrcamentista: z.boolean().default(false),
    roleContasPagar: z.boolean().default(false),
    roleContasReceber: z.boolean().default(false),
    roleContabilidade: z.boolean().default(false),
    roleRh: z.boolean().default(false),
    roleColaborador: z.boolean().default(false),
  });
};

export function Users() {
  const [users, setUsers] = useState<any[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  
  // Modal & Edit states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  
  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  // React Hook Form Configuration
  const isEditMode = !!selectedUser;
  const { 
    register, 
    handleSubmit, 
    reset, 
    watch, 
    formState: { errors, isSubmitting } 
  } = useForm<UserFormValues>({
    resolver: zodResolver(getFormSchema(isEditMode)) as any,
    mode: 'onChange',
    defaultValues: {
      nome: '',
      email: '',
      senha: '',
      status: 'ACTIVE',
      roleAdmin: false,
      roleOrcamentista: false,
      roleContasPagar: false,
      roleContasReceber: false,
      roleContabilidade: false,
      roleRh: false,
      roleColaborador: false,
    }
  });

  const fetchUsers = async () => {
    try {
      setIsLoadingUsers(true);
      const response = await api.get('/users');
      setUsers(response.data);
    } catch (error) {
      console.error('Failed to load users', error);
      toast.error('Não foi possível carregar a lista de usuários.');
    } finally {
      setIsLoadingUsers(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Update default values when selectedUser changes
  useEffect(() => {
    if (selectedUser) {
      reset({
        nome: selectedUser.nome || selectedUser.name || '',
        email: selectedUser.email || '',
        senha: '',
        status: selectedUser.status || 'ACTIVE',
        roleAdmin: !!selectedUser.roleAdmin,
        roleOrcamentista: !!selectedUser.roleOrcamentista,
        roleContasPagar: !!selectedUser.roleContasPagar,
        roleContasReceber: !!selectedUser.roleContasReceber,
        roleContabilidade: !!selectedUser.roleContabilidade,
        roleRh: !!selectedUser.roleRh,
        roleColaborador: !!selectedUser.roleColaborador,
      });
    } else {
      reset({
        nome: '',
        email: '',
        senha: '',
        status: 'ACTIVE',
        roleAdmin: false,
        roleOrcamentista: false,
        roleContasPagar: false,
        roleContasReceber: false,
        roleContabilidade: false,
        roleRh: false,
        roleColaborador: false,
      });
    }
    setShowPassword(false);
  }, [selectedUser, reset, isModalOpen]);

  const handleOpenCreateModal = () => {
    setSelectedUser(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (user: any) => {
    setSelectedUser(user);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedUser(null);
  };

  const onSubmit = async (data: UserFormValues) => {
    try {
      const payload: any = {
        nome: data.nome,
        email: data.email,
        status: data.status,
        roleAdmin: data.roleAdmin,
        roleOrcamentista: data.roleOrcamentista,
        roleContasPagar: data.roleContasPagar,
        roleContasReceber: data.roleContasReceber,
        roleContabilidade: data.roleContabilidade,
        roleRh: data.roleRh,
        roleColaborador: data.roleColaborador,
      };

      if (data.senha && data.senha.trim() !== '') {
        payload.senha = data.senha;
      }

      if (isEditMode) {
        await api.put(`/users/${selectedUser.id}`, payload);
        toast.success('Usuário atualizado com sucesso!');
      } else {
        await api.post('/users', payload);
        toast.success('Usuário cadastrado com sucesso!');
      }

      handleCloseModal();
      fetchUsers();
    } catch (error: any) {
      console.error('Failed to save user', error);
      if (error.response) {
        handleApiError(error.response, 'Erro ao salvar usuário.');
      } else {
        handleApiError(error, 'Erro de conexão ao salvar.');
      }
    }
  };

  const handleDeleteUser = async (id: string, name: string) => {
    if (!window.confirm(`Tem certeza de que deseja excluir o usuário "${name}"?`)) {
      return;
    }

    try {
      await api.delete(`/users/${id}`);
      toast.success('Usuário excluído com sucesso!');
      fetchUsers();
    } catch (error: any) {
      console.error('Failed to delete user', error);
      if (error.response) {
        handleApiError(error.response, 'Erro ao excluir usuário.');
      } else {
        toast.error('Erro de conexão ao excluir.');
      }
    }
  };

  // Client-side filtering
  const filteredUsers = users.filter((user: any) => {
    const name = user.nome || user.name || '';
    const matchesSearch = 
      name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = 
      statusFilter === 'ALL' ||
      (statusFilter === 'ACTIVE' && user.status === 'ACTIVE') ||
      (statusFilter === 'INACTIVE' && user.status === 'INACTIVE');

    return matchesSearch && matchesStatus;
  });

  // Dynamic statistics
  const totalCount = users.length;
  const activeCount = users.filter(u => u.status === 'ACTIVE').length;
  const inactiveCount = users.filter(u => u.status === 'INACTIVE').length;
  const adminCount = users.filter(u => u.roleAdmin).length;

  const permissionsList = [
    {
      key: 'roleAdmin' as const,
      title: 'Administrador',
      description: 'Acesso total a todas as configurações e módulos do sistema.',
      icon: Shield,
      color: 'text-indigo-500 bg-indigo-500/10 border-indigo-500/20 dark:border-indigo-500/10',
    },
    {
      key: 'roleOrcamentista' as const,
      title: 'Orçamentista',
      description: 'Criação, edição e visualização de orçamentos e propostas comerciais.',
      icon: FileSpreadsheet,
      color: 'text-amber-500 bg-amber-500/10 border-amber-500/20 dark:border-amber-500/10',
    },
    {
      key: 'roleContasPagar' as const,
      title: 'Contas a Pagar',
      description: 'Acesso ao módulo financeiro de saídas, contas a pagar e despesas.',
      icon: ArrowDownCircle,
      color: 'text-rose-500 bg-rose-500/10 border-rose-500/20 dark:border-rose-500/10',
    },
    {
      key: 'roleContasReceber' as const,
      title: 'Contas a Receber',
      description: 'Acesso ao módulo financeiro de entradas, recebíveis e faturamentos.',
      icon: ArrowUpCircle,
      color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20 dark:border-emerald-500/10',
    },
    {
      key: 'roleContabilidade' as const,
      title: 'Contabilidade',
      description: 'Acesso a relatórios de auditoria, DRE financeiro e dados fiscais.',
      icon: BarChart3,
      color: 'text-violet-500 bg-violet-500/10 border-violet-500/20 dark:border-violet-500/10',
    },
    {
      key: 'roleRh' as const,
      title: 'Recursos Humanos',
      description: 'Gestão de faltas, justificativas, atestados e fechamento mensal de folha.',
      icon: UserCheck,
      color: 'text-blue-500 bg-blue-500/10 border-blue-500/20 dark:border-blue-500/10',
    },
    {
      key: 'roleColaborador' as const,
      title: 'Colaborador',
      description: 'Acesso restrito para consulta aos próprios dados de adiantamentos e faltas.',
      icon: UserIcon,
      color: 'text-teal-500 bg-teal-500/10 border-teal-500/20 dark:border-teal-500/10',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight flex items-center gap-2">
            <UsersIcon className="text-primary" size={28} />
            <span>Usuários e Acessos</span>
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Gerencie as credenciais, status e permissões administrativas dos colaboradores.
          </p>
        </div>
        <button 
          onClick={handleOpenCreateModal}
          className="flex items-center justify-center gap-2 bg-gradient-to-r from-primary to-orange-600 hover:to-orange-500 text-primary-foreground px-5 py-2.5 rounded-xl font-semibold shadow-lg hover:shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all w-full sm:w-auto"
        >
          <Plus size={20} />
          <span>Adicionar Usuário</span>
        </button>
      </div>

      {/* Premium Statistics Section */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Users */}
        <div className="bg-card/40 backdrop-blur-md border border-border/60 p-5 rounded-2xl shadow-sm hover:scale-[1.02] transition-transform duration-200">
          <div className="flex justify-between items-center">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total de Contas</span>
            <div className="p-2 bg-primary/10 rounded-lg text-primary">
              <UsersIcon size={20} />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-black text-foreground">{totalCount}</h3>
            <p className="text-[11px] text-muted-foreground mt-1">Contas vinculadas à oficina</p>
          </div>
        </div>

        {/* Active Users */}
        <div className="bg-card/40 backdrop-blur-md border border-border/60 p-5 rounded-2xl shadow-sm hover:scale-[1.02] transition-transform duration-200">
          <div className="flex justify-between items-center">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Usuários Ativos</span>
            <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-500 relative">
              <CheckCircle size={20} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-black text-foreground">{activeCount}</h3>
            <p className="text-[11px] text-muted-foreground mt-1">Acesso ativo autorizado</p>
          </div>
        </div>

        {/* Inactive Users */}
        <div className="bg-card/40 backdrop-blur-md border border-border/60 p-5 rounded-2xl shadow-sm hover:scale-[1.02] transition-transform duration-200">
          <div className="flex justify-between items-center">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Usuários Inativos</span>
            <div className="p-2 bg-rose-500/10 rounded-lg text-rose-500">
              <XCircle size={20} />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-black text-foreground">{inactiveCount}</h3>
            <p className="text-[11px] text-muted-foreground mt-1">Acessos suspensos/bloqueados</p>
          </div>
        </div>

        {/* Admins */}
        <div className="bg-card/40 backdrop-blur-md border border-border/60 p-5 rounded-2xl shadow-sm hover:scale-[1.02] transition-transform duration-200">
          <div className="flex justify-between items-center">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Administradores</span>
            <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-500">
              <ShieldCheck size={20} />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-black text-foreground">{adminCount}</h3>
            <p className="text-[11px] text-muted-foreground mt-1">Usuários com acesso total</p>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-card/45 backdrop-blur-sm border border-border/50 p-4 rounded-2xl flex flex-col md:flex-row gap-4 justify-between items-center shadow-sm">
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-3 top-3 text-muted-foreground" size={18} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar usuário por nome ou e-mail..."
            className="w-full bg-background border border-border/70 rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium shrink-0">
            <Filter size={16} />
            <span>Filtrar por:</span>
          </div>
          <select
            value={statusFilter}
            onChange={(e: any) => setStatusFilter(e.target.value)}
            className="w-full md:w-44 bg-background border border-border/70 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition cursor-pointer"
          >
            <option value="ALL">Todos os Status</option>
            <option value="ACTIVE">Ativo</option>
            <option value="INACTIVE">Inativo</option>
          </select>
        </div>
      </div>

      {/* Users List Container */}
      {isLoadingUsers ? (
        <div className="bg-card border border-border p-16 rounded-2xl flex flex-col items-center justify-center gap-3">
          <Loader2 className="text-primary animate-spin" size={32} />
          <p className="text-muted-foreground text-sm font-medium">Carregando lista de usuários...</p>
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block bg-card/60 backdrop-blur-md border border-border/60 rounded-2xl shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-muted/40 border-b border-border/75 text-muted-foreground text-xs uppercase tracking-wider">
                    <th className="p-4 font-semibold">Usuário</th>
                    <th className="p-4 font-semibold">Status</th>
                    <th className="p-4 font-semibold">Níveis de Acesso</th>
                    <th className="p-4 font-semibold">Criado em</th>
                    <th className="p-4 font-semibold text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50 text-sm">
                  {filteredUsers.map((user: any) => {
                    const gradient = getGradientByName(user.nome || user.name);
                    const name = user.nome || user.name || '';
                    return (
                      <tr key={user.id} className="hover:bg-muted/15 transition-colors">
                        <td className="p-4 font-medium flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center font-bold text-white shadow-sm shrink-0`}>
                            {name.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="text-foreground font-bold truncate">{name}</span>
                            <span className="text-xs text-muted-foreground truncate">{user.email}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          {user.status === 'ACTIVE' ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              Ativo
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full bg-slate-500/10 text-slate-500 border border-slate-500/20">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                              Inativo
                            </span>
                          )}
                        </td>
                        <td className="p-4">
                          <div className="flex flex-wrap gap-1.5 max-w-sm">
                            {user.roleAdmin && (
                              <span className="px-2 py-0.5 text-[11px] font-semibold rounded bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 dark:border-indigo-500/10">
                                Admin
                              </span>
                            )}
                            {user.roleOrcamentista && (
                              <span className="px-2 py-0.5 text-[11px] font-semibold rounded bg-amber-500/10 text-amber-500 border border-amber-500/20 dark:border-amber-500/10">
                                Orçamentista
                              </span>
                            )}
                            {user.roleContasPagar && (
                              <span className="px-2 py-0.5 text-[11px] font-semibold rounded bg-rose-500/10 text-rose-500 border border-rose-500/20 dark:border-rose-500/10">
                                C. Pagar
                              </span>
                            )}
                            {user.roleContasReceber && (
                              <span className="px-2 py-0.5 text-[11px] font-semibold rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 dark:border-emerald-500/10">
                                C. Receber
                              </span>
                            )}
                            {user.roleContabilidade && (
                              <span className="px-2 py-0.5 text-[11px] font-semibold rounded bg-violet-500/10 text-violet-500 border border-violet-500/20 dark:border-violet-500/10">
                                Contabilidade
                              </span>
                            )}
                            {user.roleRh && (
                              <span className="px-2 py-0.5 text-[11px] font-semibold rounded bg-blue-500/10 text-blue-500 border border-blue-500/20 dark:border-blue-500/10">
                                RH
                              </span>
                            )}
                            {user.roleColaborador && (
                              <span className="px-2 py-0.5 text-[11px] font-semibold rounded bg-teal-500/10 text-teal-500 border border-teal-500/20 dark:border-teal-500/10">
                                Colaborador
                              </span>
                            )}
                            {!user.roleAdmin && !user.roleOrcamentista && !user.roleContasPagar && !user.roleContasReceber && !user.roleContabilidade && !user.roleRh && !user.roleColaborador && (
                              <span className="text-xs text-muted-foreground italic">Nenhum</span>
                            )}
                          </div>
                        </td>
                        <td className="p-4 text-muted-foreground text-xs">
                          {new Date(user.createdAt).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex gap-2 justify-end">
                            <button 
                              onClick={() => handleOpenEditModal(user)}
                              className="p-2 bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 rounded-lg transition-all"
                              title="Editar Usuário"
                            >
                              <Edit size={16} />
                            </button>
                            <button 
                              onClick={() => handleDeleteUser(user.id, name)}
                              className="p-2 bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 rounded-lg transition-all"
                              title="Excluir Usuário"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredUsers.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-12 text-center text-muted-foreground">
                        Nenhum usuário correspondente aos filtros foi encontrado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Card List View */}
          <div className="block md:hidden space-y-4">
            {filteredUsers.map((user: any) => {
              const gradient = getGradientByName(user.nome || user.name);
              const name = user.nome || user.name || '';
              return (
                <div 
                  key={user.id} 
                  className="bg-card border border-border/80 p-5 rounded-2xl space-y-4 shadow-sm hover:border-primary/20 transition-all duration-200"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center font-bold text-white shadow-sm shrink-0`}>
                      {name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-foreground truncate">{name}</h4>
                      <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                    </div>
                    <div>
                      {user.status === 'ACTIVE' ? (
                        <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">Ativo</span>
                      ) : (
                        <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-slate-500/10 text-slate-500 border border-slate-500/20">Inativo</span>
                      )}
                    </div>
                  </div>
                  
                  {/* Access Levels */}
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Níveis de Acesso</p>
                    <div className="flex flex-wrap gap-1.5">
                      {user.roleAdmin && <span className="px-1.5 py-0.5 text-[10px] rounded bg-indigo-500/10 text-indigo-500 font-semibold border border-indigo-500/10">Admin</span>}
                      {user.roleOrcamentista && <span className="px-1.5 py-0.5 text-[10px] rounded bg-amber-500/10 text-amber-500 font-semibold border border-amber-500/10">Orçamentista</span>}
                      {user.roleContasPagar && <span className="px-1.5 py-0.5 text-[10px] rounded bg-rose-500/10 text-rose-500 font-semibold border border-rose-500/10">C. Pagar</span>}
                      {user.roleContasReceber && <span className="px-1.5 py-0.5 text-[10px] rounded bg-emerald-500/10 text-emerald-500 font-semibold border border-emerald-500/10">C. Receber</span>}
                      {user.roleContabilidade && <span className="px-1.5 py-0.5 text-[10px] rounded bg-violet-500/10 text-violet-500 font-semibold border border-violet-500/10">Contabilidade</span>}
                      {user.roleRh && <span className="px-1.5 py-0.5 text-[10px] rounded bg-blue-500/10 text-blue-500 font-semibold border border-blue-500/10">RH</span>}
                      {user.roleColaborador && <span className="px-1.5 py-0.5 text-[10px] rounded bg-teal-500/10 text-teal-500 font-semibold border border-teal-500/10">Colaborador</span>}
                      {!user.roleAdmin && !user.roleOrcamentista && !user.roleContasPagar && !user.roleContasReceber && !user.roleContabilidade && !user.roleRh && !user.roleColaborador && (
                        <span className="text-xs text-muted-foreground italic">Nenhum</span>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-3.5 border-t border-border/50 text-xs">
                    <span className="text-muted-foreground">Criado em: {new Date(user.createdAt).toLocaleDateString('pt-BR')}</span>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleOpenEditModal(user)}
                        className="p-2 bg-blue-500/10 text-blue-600 rounded-lg transition hover:bg-blue-500/20"
                        title="Editar Usuário"
                      >
                        <Edit size={14} />
                      </button>
                      <button 
                        onClick={() => handleDeleteUser(user.id, name)}
                        className="p-2 bg-rose-500/10 text-rose-600 rounded-lg transition hover:bg-rose-500/20"
                        title="Excluir Usuário"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
            {filteredUsers.length === 0 && (
              <div className="p-8 text-center text-muted-foreground bg-card border border-border/80 rounded-2xl shadow-sm">
                Nenhum usuário correspondente aos filtros foi encontrado.
              </div>
            )}
          </div>
        </>
      )}

      {/* Glassmorphic Edit/Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-card border border-border/80 w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-border/60 animate-in fade-in zoom-in-95 duration-200 my-8">
            
            {/* Left Panel: Basic Information */}
            <div className="p-6 md:p-8 flex-1 space-y-6">
              <div className="flex justify-between items-center md:hidden">
                <div className="flex items-center gap-2">
                  <UserIcon className="text-primary" size={20} />
                  <h3 className="text-lg font-bold text-foreground">
                    {isEditMode ? 'Editar Usuário' : 'Novo Usuário'}
                  </h3>
                </div>
                <button 
                  onClick={handleCloseModal}
                  className="text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-muted transition"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="hidden md:block">
                <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
                  <UserIcon className="text-primary" size={22} />
                  <span>{isEditMode ? 'Editar Usuário' : 'Novo Usuário'}</span>
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Insira os dados pessoais e defina o status da conta do usuário.
                </p>
              </div>

              {/* Form Input fields */}
              <form id="user-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                
                {/* Nome Completo */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground uppercase tracking-wider">Nome Completo</label>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-3 text-muted-foreground" size={16} />
                    <input
                      type="text"
                      {...register('nome')}
                      placeholder="Nome e sobrenome"
                      className={`w-full bg-background border rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20 transition ${
                        errors.nome ? 'border-destructive focus:border-destructive' : 'border-border/80 focus:border-primary'
                      }`}
                    />
                  </div>
                  {errors.nome && (
                    <p className="text-xs text-destructive font-medium mt-1">{errors.nome.message}</p>
                  )}
                </div>

                {/* E-mail */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground uppercase tracking-wider">E-mail</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 text-muted-foreground" size={16} />
                    <input
                      type="email"
                      {...register('email')}
                      placeholder="exemplo@empresa.com"
                      className={`w-full bg-background border rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20 transition ${
                        errors.email ? 'border-destructive focus:border-destructive' : 'border-border/80 focus:border-primary'
                      }`}
                    />
                  </div>
                  {errors.email && (
                    <p className="text-xs text-destructive font-medium mt-1">{errors.email.message}</p>
                  )}
                </div>

                {/* Senha */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground uppercase tracking-wider">
                    {isEditMode ? 'Nova Senha (Opcional)' : 'Senha de Acesso'}
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 text-muted-foreground" size={16} />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      {...register('senha')}
                      placeholder={isEditMode ? 'Manter senha atual (vazio)' : 'Mínimo de 6 caracteres'}
                      className={`w-full bg-background border rounded-xl pl-10 pr-10 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20 transition ${
                        errors.senha ? 'border-destructive focus:border-destructive' : 'border-border/80 focus:border-primary'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-muted-foreground hover:text-foreground transition"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {errors.senha && (
                    <p className="text-xs text-destructive font-medium mt-1">{errors.senha.message}</p>
                  )}
                </div>

                {/* Status */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground uppercase tracking-wider">Status da Conta</label>
                  <select
                    {...register('status')}
                    className="w-full bg-background border border-border/80 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition cursor-pointer"
                  >
                    <option value="ACTIVE">Ativo (Acesso Liberado)</option>
                    <option value="INACTIVE">Inativo (Acesso Suspenso)</option>
                  </select>
                </div>
              </form>
            </div>

            {/* Right Panel: Permissions panel */}
            <div className="p-6 md:p-8 flex-1 bg-muted/20 dark:bg-muted/10 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="hidden md:flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
                      <Shield className="text-primary" size={22} />
                      <span>Nível de Acesso</span>
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      Atribua uma ou múltiplas permissões administrativas para esta conta.
                    </p>
                  </div>
                  <button 
                    onClick={handleCloseModal}
                    className="text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-muted/50 transition"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Permissions Grid / List */}
                <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                  {permissionsList.map((perm) => {
                    const Icon = perm.icon;
                    // Watch to visually adjust checked states dynamically
                    const isChecked = watch(perm.key);
                    return (
                      <label
                        key={perm.key}
                        className={`flex items-start justify-between p-3.5 rounded-xl border cursor-pointer transition-all duration-200 select-none ${
                          isChecked
                            ? 'bg-card border-primary/40 shadow-sm shadow-primary/5 ring-1 ring-primary/20'
                            : 'bg-background hover:bg-muted/30 border-border/80'
                        }`}
                      >
                        <div className="flex gap-3">
                          <div className={`p-2 rounded-lg border ${perm.color} mt-0.5 shrink-0`}>
                            <Icon size={18} />
                          </div>
                          <div className="space-y-0.5">
                            <p className="text-xs font-bold text-foreground">{perm.title}</p>
                            <p className="text-[11px] text-muted-foreground leading-normal max-w-[240px]">
                              {perm.description}
                            </p>
                          </div>
                        </div>
                        <div className="relative inline-flex items-center mt-1 shrink-0">
                          <input
                            type="checkbox"
                            {...register(perm.key)}
                            className="sr-only peer"
                          />
                          <div className="w-8 h-4.5 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2.5px] after:left-[2.5px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-primary"></div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Action Buttons in Footer */}
              <div className="flex justify-end gap-3 pt-6 border-t border-border/60 mt-6">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-5 py-2.5 bg-muted hover:bg-muted/80 text-muted-foreground rounded-xl font-semibold text-sm transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  form="user-form"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 bg-gradient-to-r from-primary to-orange-600 hover:to-orange-500 text-primary-foreground rounded-xl font-semibold text-sm shadow hover:shadow-primary/10 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="animate-spin" size={16} />
                      <span>Salvando...</span>
                    </>
                  ) : (
                    <span>Salvar Alterações</span>
                  )}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
