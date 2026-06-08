import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { CreateQuote } from './pages/CreateQuote';
import { QuotesList } from './pages/QuotesList';
import { Register } from './pages/Register';
import { EmailConfig } from './pages/EmailConfig';
import { Clients } from './pages/Clients';
import { Suppliers } from './pages/Suppliers';
import { Collaborators } from './pages/Collaborators';
import { Platforms } from './pages/Platforms';
import { Users } from './pages/Users';
import { FinancialDashboard } from './pages/financial/FinancialDashboard';
import { FinancialPayables } from './pages/financial/FinancialPayables';
import { FinancialReceivables } from './pages/financial/FinancialReceivables';
import { FinancialApprovals } from './pages/financial/FinancialApprovals';
import { FinancialReports } from './pages/financial/FinancialReports';
import { FinancialCategories } from './pages/financial/FinancialCategories';
import { FiscalDocuments } from './pages/financial/FiscalDocuments';
import FleetDashboard from './pages/fleet/FleetDashboard';
import FleetVehicles from './pages/fleet/FleetVehicles';
import VehicleDetails from './pages/fleet/VehicleDetails';
import FleetPreventive from './pages/fleet/FleetPreventive';
import FleetWorkshops from './pages/fleet/FleetWorkshops';
import { Toaster } from 'sonner';
import { BreadcrumbProvider } from './context/BreadcrumbContext';
import { AuthProvider } from './context/AuthProvider';
import { ProtectedRoute } from './routes/ProtectedRoute';
import { SessionExpired } from './pages/SessionExpired';
import { SaaSDashboard } from './pages/SaaSDashboard';
import { ModuleGuard } from './components/ModuleGuard';
import { SaaSAdminGuard } from './components/SaaSAdminGuard';
import { MyPlan } from './pages/MyPlan';
import { Presentation } from './pages/Presentation';
import { AbsenceControl } from './pages/rh/AbsenceControl';
import { MonthlyClosing } from './pages/rh/MonthlyClosing';

import { SaaSAuthProvider } from './context/SaaSAuthProvider';
import { SaaSAuthGuard } from './components/SaaSAuthGuard';
import { SaaSLayout } from './components/SaaSLayout';

import { Login as SaaSLogin } from './pages/administracao/Login';
import { Dashboard as SaaSDashboardPage } from './pages/administracao/Dashboard';
import { Tenants } from './pages/administracao/Tenants';
import { Plans } from './pages/administracao/Plans';
import { Subscriptions } from './pages/administracao/Subscriptions';
import { Modules } from './pages/administracao/Modules';
import { Users as SaaSUsers } from './pages/administracao/Users';
import { Financial as SaaSFinancial } from './pages/administracao/Financial';
import { Auditoria } from './pages/administracao/Auditoria';
import { Notificacoes as SaaSNotificacoes } from './pages/administracao/Notificacoes';
import { Monitoramento as SaaSMonitoramento } from './pages/administracao/Monitoramento';
import { Configuracoes as SaaSConfiguracoes } from './pages/administracao/Configuracoes';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <BreadcrumbProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/session-expired" element={<SessionExpired />} />
            <Route path="/apresentacao" element={<Presentation />} />
            <Route path="/presentation" element={<Presentation />} />

            {/* Rotas Independentes da Administração SaaS */}
            <Route path="/administracao/login" element={
              <SaaSAuthProvider>
                <SaaSLogin />
              </SaaSAuthProvider>
            } />

            <Route path="/administracao" element={
              <SaaSAuthProvider>
                <SaaSAuthGuard>
                  <SaaSLayout />
                </SaaSAuthGuard>
              </SaaSAuthProvider>
            }>
              <Route index element={<Navigate to="/administracao/dashboard" replace />} />
              <Route path="dashboard" element={<SaaSDashboardPage />} />
              <Route path="empresas" element={<SaaSAuthGuard permission="empresas"><Tenants /></SaaSAuthGuard>} />
              <Route path="usuarios" element={<SaaSAuthGuard permission="usuarios"><SaaSUsers /></SaaSAuthGuard>} />
              <Route path="planos" element={<SaaSAuthGuard permission="planos"><Plans /></SaaSAuthGuard>} />
              <Route path="assinaturas" element={<SaaSAuthGuard permission="assinaturas"><Subscriptions /></SaaSAuthGuard>} />
              <Route path="modulos" element={<SaaSAuthGuard permission="modulos"><Modules /></SaaSAuthGuard>} />
              <Route path="financeiro" element={<SaaSAuthGuard permission="financeiro"><SaaSFinancial /></SaaSAuthGuard>} />
              <Route path="auditoria" element={<SaaSAuthGuard permission="auditoria"><Auditoria /></SaaSAuthGuard>} />
              <Route path="notificacoes" element={<SaaSAuthGuard permission="configuracoes"><SaaSNotificacoes /></SaaSAuthGuard>} />
              <Route path="monitoramento" element={<SaaSAuthGuard permission="configuracoes"><SaaSMonitoramento /></SaaSAuthGuard>} />
              <Route path="configuracoes" element={<SaaSAuthGuard permission="configuracoes"><SaaSConfiguracoes /></SaaSAuthGuard>} />
            </Route>
            
            <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
              <Route index element={<Dashboard />} />
              <Route path="quotes/new" element={<CreateQuote />} />
              <Route path="quotes/edit/:id" element={<CreateQuote />} />
              <Route path="quotes/view/:id" element={<CreateQuote />} />
              <Route path="quotes" element={<QuotesList />} />
              <Route path="users" element={<Users />} />
              <Route path="settings/email" element={<EmailConfig />} />
              <Route path="settings/my-plan" element={<MyPlan />} />
              
              {/* Rotas Licenciadas do Módulo Oficina */}
              <Route path="clients" element={<ModuleGuard moduleKey="clientes" moduleName="Clientes"><Clients /></ModuleGuard>} />
              <Route path="suppliers" element={<ModuleGuard moduleKey="fornecedores" moduleName="Fornecedores"><Suppliers /></ModuleGuard>} />
              <Route path="collaborators" element={<ModuleGuard moduleKey="colaboradores" moduleName="Colaboradores"><Collaborators /></ModuleGuard>} />
              <Route path="platforms" element={<ModuleGuard moduleKey="clientes" moduleName="Clientes"><Platforms /></ModuleGuard>} />
              
              {/* Rotas de Gestão Financeira */}
              <Route path="financial/dashboard" element={<ModuleGuard moduleKey="financeiro" moduleName="Gestão Financeira"><FinancialDashboard /></ModuleGuard>} />
              <Route path="financial/payables" element={<ModuleGuard moduleKey="financeiro" moduleName="Gestão Financeira"><FinancialPayables /></ModuleGuard>} />
              <Route path="financial/receivables" element={<ModuleGuard moduleKey="financeiro" moduleName="Gestão Financeira"><FinancialReceivables /></ModuleGuard>} />
              <Route path="financial/approvals" element={<ModuleGuard moduleKey="financeiro" moduleName="Gestão Financeira"><FinancialApprovals /></ModuleGuard>} />
              <Route path="financial/reports" element={<ModuleGuard moduleKey="financeiro" moduleName="Gestão Financeira"><FinancialReports /></ModuleGuard>} />
              <Route path="financial/categories" element={<ModuleGuard moduleKey="financeiro" moduleName="Gestão Financeira"><FinancialCategories /></ModuleGuard>} />
              <Route path="financial/fiscal-documents" element={<ModuleGuard moduleKey="fiscal" moduleName="Contabilidade e Fiscal"><FiscalDocuments /></ModuleGuard>} />
              <Route path="accounting/fiscal-documents" element={<ModuleGuard moduleKey="fiscal" moduleName="Contabilidade e Fiscal"><FiscalDocuments /></ModuleGuard>} />

              {/* Rotas de Gestão de Frotas */}
              <Route path="fleet/dashboard" element={<ModuleGuard moduleKey="frotas" moduleName="Gestão de Frotas"><FleetDashboard /></ModuleGuard>} />
              <Route path="fleet/vehicles" element={<ModuleGuard moduleKey="frotas" moduleName="Gestão de Frotas"><FleetVehicles /></ModuleGuard>} />
              <Route path="fleet/vehicles/:id" element={<ModuleGuard moduleKey="frotas" moduleName="Gestão de Frotas"><VehicleDetails /></ModuleGuard>} />
              <Route path="fleet/preventive" element={<ModuleGuard moduleKey="frotas" moduleName="Gestão de Frotas"><FleetPreventive /></ModuleGuard>} />
              <Route path="fleet/workshops" element={<ModuleGuard moduleKey="frotas" moduleName="Gestão de Frotas"><FleetWorkshops /></ModuleGuard>} />

              {/* Rotas de Recursos Humanos */}
              <Route path="rh/absences" element={<ModuleGuard moduleKey="rh" moduleName="Recursos Humanos"><AbsenceControl /></ModuleGuard>} />
              <Route path="rh/closing" element={<ModuleGuard moduleKey="rh" moduleName="Recursos Humanos"><MonthlyClosing /></ModuleGuard>} />

              {/* Rota Administrativa do SaaS (Apenas Platform Admin) */}
              <Route path="saas-dashboard" element={<SaaSAdminGuard><SaaSDashboard /></SaaSAdminGuard>} />
            </Route>
          </Routes>
          <Toaster position="top-right" richColors />
        </BreadcrumbProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;

