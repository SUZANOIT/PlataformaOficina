import { BrowserRouter, Routes, Route } from 'react-router-dom';
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

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <BreadcrumbProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/session-expired" element={<SessionExpired />} />
            
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

