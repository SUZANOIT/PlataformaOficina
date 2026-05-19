import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, X, Shield, Lock, Mail, User as UserIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

export function Users() {
  const [users, setUsers] = useState<any[]>([]);
  
  // Modal states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPassword, setEditPassword] = useState('');

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      }
    } catch (error) {
      console.error("Failed to load users", error);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleOpenEditModal = (user: any) => {
    setSelectedUser(user);
    setEditName(user.name);
    setEditEmail(user.email);
    setEditPassword(''); // Empty by default, only updated if filled
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setSelectedUser(null);
    setEditName('');
    setEditEmail('');
    setEditPassword('');
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editName || !editEmail) {
      toast.error('Nome e E-mail são obrigatórios.');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/users/${selectedUser.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: editName,
          email: editEmail,
          password: editPassword || undefined
        })
      });

      if (response.ok) {
        toast.success('Usuário atualizado com sucesso!');
        handleCloseEditModal();
        fetchUsers();
      } else {
        const errData = await response.json();
        toast.error(errData.error || 'Erro ao atualizar usuário.');
      }
    } catch (error) {
      console.error('Failed to update user', error);
      toast.error('Erro de conexão ao atualizar.');
    }
  };

  const handleDeleteUser = async (id: string, name: string) => {
    if (!window.confirm(`Tem certeza de que deseja excluir o usuário "${name}"?`)) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/users/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        toast.success('Usuário excluído com sucesso!');
        fetchUsers();
      } else {
        toast.error('Erro ao excluir usuário.');
      }
    } catch (error) {
      console.error('Failed to delete user', error);
      toast.error('Erro de conexão ao excluir.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Usuários</h1>
          <p className="text-muted-foreground">Gerencie quem tem acesso ao sistema de orçamentos.</p>
        </div>
        <Link 
          to="/register" 
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium shadow hover:bg-primary/90 transition"
        >
          <Plus size={20} />
          Novo Usuário
        </Link>
      </div>

      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-muted/50 border-b border-border text-muted-foreground text-sm">
                <th className="p-4 font-medium">Nome</th>
                <th className="p-4 font-medium">E-mail</th>
                <th className="p-4 font-medium">Data de Cadastro</th>
                <th className="p-4 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user: any) => (
                <tr key={user.id} className="border-b border-border hover:bg-muted/20 transition-colors">
                  <td className="p-4 font-medium flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    {user.name}
                  </td>
                  <td className="p-4 text-muted-foreground">{user.email}</td>
                  <td className="p-4 text-muted-foreground">{new Date(user.createdAt).toLocaleDateString('pt-BR')}</td>
                  <td className="p-4 flex gap-2">
                    <button 
                      onClick={() => handleOpenEditModal(user)}
                      className="p-2 bg-blue-500/10 text-blue-600 rounded hover:bg-blue-500/20 transition"
                      title="Editar Usuário"
                    >
                      <Edit size={16} />
                    </button>
                    <button 
                      onClick={() => handleDeleteUser(user.id, user.name)}
                      className="p-2 bg-rose-500/10 text-rose-600 rounded hover:bg-rose-500/20 transition"
                      title="Excluir Usuário"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-4 text-center text-muted-foreground">
                    Nenhum usuário encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Edição */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border w-full max-w-md rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200">
            {/* Header */}
            <div className="p-6 border-b border-border flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Shield className="text-primary" size={20} />
                <h3 className="text-lg font-bold text-foreground">Editar Usuário</h3>
              </div>
              <button 
                onClick={handleCloseEditModal}
                className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted/50 transition"
              >
                <X size={20} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleUpdateUser} className="p-6 space-y-4">
              {/* Nome */}
              <div className="space-y-1">
                <label className="text-sm font-medium text-foreground">Nome Completo</label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-2.5 text-muted-foreground" size={18} />
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Nome do usuário"
                    className="w-full bg-background border border-border rounded-lg pl-10 pr-4 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary transition"
                  />
                </div>
              </div>

              {/* Email */}
              <div className="space-y-1">
                <label className="text-sm font-medium text-foreground">Endereço de E-mail</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 text-muted-foreground" size={18} />
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    placeholder="exemplo@email.com"
                    className="w-full bg-background border border-border rounded-lg pl-10 pr-4 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary transition"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1">
                <label className="text-sm font-medium text-foreground">Nova Senha (opcional)</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 text-muted-foreground" size={18} />
                  <input
                    type="password"
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    placeholder="Deixe em branco para manter a atual"
                    className="w-full bg-background border border-border rounded-lg pl-10 pr-4 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary transition"
                  />
                </div>
                <p className="text-xs text-muted-foreground">Mínimo de 6 caracteres se for alterar.</p>
              </div>

              {/* Footer Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-border mt-6">
                <button
                  type="button"
                  onClick={handleCloseEditModal}
                  className="px-4 py-2 bg-muted text-muted-foreground rounded-lg font-medium text-sm hover:bg-muted/80 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium text-sm hover:bg-primary/90 transition shadow-sm"
                >
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
