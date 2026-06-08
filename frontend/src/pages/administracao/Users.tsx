import { useState, useEffect } from 'react';
import { SaaSAPIService } from '../../services/saas';
import { 
  Plus, 
  Edit3, 
  Lock, 
  X,
  Mail,
  User,
  Clock
} from 'lucide-react';
import { toast } from 'sonner';

export function Users() {
  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isResetOpen, setIsResetOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Password reset fields
  const [newPassword, setNewPassword] = useState('');

  // Form states
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    password: '',
    roleId: '',
    status: 'ATIVO'
  });

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [usersData, rolesData] = await Promise.all([
        SaaSAPIService.listUsers(),
        SaaSAPIService.listRoles()
      ]);
      setUsers(usersData);
      setRoles(rolesData);
      
      if (rolesData.length > 0 && !formData.roleId) {
        setFormData(prev => ({ ...prev, roleId: rolesData[0].id }));
      }
    } catch (err) {
      console.error(err);
      toast.error('Erro ao carregar usuários e perfis.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome || !formData.email || !formData.password || !formData.roleId) {
      toast.error('Preencha todos os campos obrigatórios.');
      return;
    }

    setIsSubmitting(true);
    try {
      await SaaSAPIService.createUser(formData);
      toast.success('Usuário administrativo criado com sucesso!');
      setIsCreateOpen(false);
      setFormData({
        nome: '',
        email: '',
        password: '',
        roleId: roles[0]?.id || '',
        status: 'ATIVO'
      });
      loadData();
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.error || 'Erro ao criar usuário.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    setIsSubmitting(true);
    try {
      await SaaSAPIService.updateUser(selectedUser.id, selectedUser);
      toast.success('Usuário atualizado com sucesso!');
      setIsEditOpen(false);
      loadData();
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.error || 'Erro ao atualizar usuário.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !newPassword) return;

    setIsSubmitting(true);
    try {
      await SaaSAPIService.resetUserPassword(selectedUser.id, newPassword);
      toast.success(`Senha do usuário ${selectedUser.nome} redefinida com sucesso!`);
      setIsResetOpen(false);
      setNewPassword('');
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.error || 'Erro ao redefinir senha.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN': return 'bg-rose-500/10 text-rose-400 border border-rose-500/20';
      case 'COMERCIAL': return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
      case 'FINANCEIRO': return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
      case 'SUPORTE': return 'bg-sky-500/10 text-sky-400 border border-sky-500/20';
      case 'IMPLANTACAO': return 'bg-purple-500/10 text-purple-400 border border-purple-500/20';
      default: return 'bg-slate-500/10 text-slate-400';
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-lg font-black text-white uppercase tracking-wider">Usuários Administrativos</h2>
          <p className="text-xs text-slate-400">Gerencie a equipe interna da Suzano IT, atribua perfis do RBAC e redefina credenciais.</p>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="flex items-center justify-center gap-2 px-3.5 py-2 bg-indigo-500 hover:bg-indigo-400 active:scale-98 text-slate-950 font-extrabold rounded-xl text-xs transition shadow-lg shadow-indigo-500/10 w-full sm:w-auto"
        >
          <Plus size={14} />
          <span>Criar Usuário</span>
        </button>
      </div>

      {/* Users Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        {isLoading ? (
          <div className="flex h-48 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
          </div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs font-semibold">
            Nenhum usuário administrativo cadastrado.
          </div>
        ) : (
          <div className="w-full">
            <table className="w-full text-left border-collapse table-fixed break-words">
              <thead>
                <tr className="border-b border-slate-800 text-[10px] font-bold text-slate-500 uppercase tracking-wider bg-slate-950/20">
                  <th className="p-4 w-5/12 sm:w-4/12 lg:w-3/12">Nome / Usuário</th>
                  <th className="p-4 hidden sm:table-cell w-3/12 lg:w-3/12">E-mail</th>
                  <th className="p-4 w-4/12 sm:w-3/12 lg:w-2/12">Perfil (RBAC)</th>
                  <th className="p-4 hidden md:table-cell w-2/12">Último Login</th>
                  <th className="p-4 hidden lg:table-cell w-1/12">Status</th>
                  <th className="p-4 w-3/12 sm:w-2/12 lg:w-1/12 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850 text-xs">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-800/10">
                    <td className="p-4 font-bold text-slate-200 truncate">
                      <div className="flex items-center gap-2.5 truncate">
                        <div className="h-7 w-7 rounded-full bg-slate-950 border border-slate-800 flex items-center justify-center text-slate-400 shrink-0">
                          <User size={14} />
                        </div>
                        <div className="flex flex-col truncate">
                          <span className="truncate">{u.nome}</span>
                          <span className="sm:hidden text-[9px] text-slate-400 font-medium truncate mt-0.5">{u.email}</span>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-slate-400 font-semibold hidden sm:table-cell truncate">
                      <div className="flex items-center gap-1.5 truncate">
                        <Mail size={13} className="text-slate-500 shrink-0" />
                        <span className="truncate">{u.email}</span>
                      </div>
                    </td>
                    <td className="p-4 truncate">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${getRoleColor(u.role)} truncate block w-fit`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="p-4 text-slate-400 hidden md:table-cell truncate">
                      <div className="flex items-center gap-1.5 truncate">
                        <Clock size={13} className="text-slate-500 shrink-0" />
                        <span className="truncate">{u.ultimoLogin ? new Date(u.ultimoLogin).toLocaleString('pt-BR') : 'Nunca acessou'}</span>
                      </div>
                    </td>
                    <td className="p-4 hidden lg:table-cell truncate">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        u.status === 'ATIVO' 
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      } truncate block w-fit`}>
                        {u.status}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => {
                            setSelectedUser(u);
                            setIsEditOpen(true);
                          }}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition shrink-0"
                          title="Editar Cadastro"
                        >
                          <Edit3 size={13} />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedUser(u);
                            setIsResetOpen(true);
                          }}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-350 hover:text-white transition shrink-0"
                          title="Resetar Senha"
                        >
                          <Lock size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE MODAL */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-md border border-slate-800 bg-slate-900 rounded-2xl shadow-2xl p-6">
            <button
              onClick={() => setIsCreateOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X size={20} />
            </button>

            <h3 className="text-base font-black text-white uppercase tracking-wider mb-4">Novo Usuário Administrativo</h3>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Nome Completo *</label>
                <input
                  type="text"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  placeholder="Nome do colaborador"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none transition-all"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">E-mail Corporativo *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="nome@suzanoit.com"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none transition-all"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Senha Inicial *</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none transition-all"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Perfil de Acesso (RBAC) *</label>
                <select
                  value={formData.roleId}
                  onChange={(e) => setFormData({ ...formData, roleId: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none transition-all"
                >
                  {roles.map(r => (
                    <option key={r.id} value={r.id}>{r.nome} ({r.chave})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none transition-all"
                >
                  <option value="ATIVO">Ativo</option>
                  <option value="INATIVO">Inativo</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 border border-slate-800 text-slate-400 hover:text-white rounded-xl text-xs font-bold transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-indigo-500 hover:bg-indigo-400 text-slate-950 font-black rounded-xl text-xs transition disabled:opacity-50"
                >
                  {isSubmitting ? 'Criando...' : 'Criar Usuário'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {isEditOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="relative w-full max-w-md border border-slate-800 bg-slate-900 rounded-2xl shadow-2xl p-6">
            <button
              onClick={() => setIsEditOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X size={20} />
            </button>

            <h3 className="text-base font-black text-white uppercase tracking-wider mb-4">Editar Usuário</h3>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Nome Completo *</label>
                <input
                  type="text"
                  value={selectedUser.nome}
                  onChange={(e) => setSelectedUser({ ...selectedUser, nome: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none transition-all"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">E-mail *</label>
                <input
                  type="email"
                  value={selectedUser.email}
                  onChange={(e) => setSelectedUser({ ...selectedUser, email: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none transition-all"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Perfil de Acesso (RBAC) *</label>
                <select
                  value={selectedUser.roleId}
                  onChange={(e) => setSelectedUser({ ...selectedUser, roleId: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none transition-all"
                >
                  {roles.map(r => (
                    <option key={r.id} value={r.id}>{r.nome} ({r.chave})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Status</label>
                <select
                  value={selectedUser.status}
                  onChange={(e) => setSelectedUser({ ...selectedUser, status: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none transition-all"
                >
                  <option value="ATIVO">Ativo</option>
                  <option value="INATIVO">Inativo</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="px-4 py-2 border border-slate-800 text-slate-400 hover:text-white rounded-xl text-xs font-bold transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-indigo-500 hover:bg-indigo-400 text-slate-950 font-black rounded-xl text-xs transition disabled:opacity-50"
                >
                  {isSubmitting ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RESET PASSWORD MODAL */}
      {isResetOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="relative w-full max-w-sm border border-slate-800 bg-slate-900 rounded-2xl shadow-2xl p-6">
            <button
              onClick={() => setIsResetOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X size={20} />
            </button>

            <h3 className="text-base font-black text-white uppercase tracking-wider mb-2">Forçar Reset de Senha</h3>
            <p className="text-[11px] text-slate-400 font-semibold mb-4">Defina uma nova senha de login administrativa para <strong>{selectedUser.nome}</strong>.</p>

            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Nova Senha *</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Nova senha (min 6 caracteres)"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none transition-all"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsResetOpen(false)}
                  className="px-4 py-2 border border-slate-800 text-slate-400 hover:text-white rounded-xl text-xs font-bold transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-indigo-500 hover:bg-indigo-400 text-slate-950 font-black rounded-xl text-xs transition disabled:opacity-50"
                >
                  {isSubmitting ? 'Redefinindo...' : 'Confirmar Novo Acesso'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
