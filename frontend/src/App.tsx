import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { CreateQuote } from './pages/CreateQuote';
import { QuotesList } from './pages/QuotesList';
import { Register } from './pages/Register';
import { EmailConfig } from './pages/EmailConfig';
import { Clients } from './pages/Clients';
import { ClientDashboard } from './pages/ClientDashboard';
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
import { FiscalAccountingPortal } from './pages/financial/FiscalAccountingPortal';
import FleetDashboard from './pages/fleet/FleetDashboard';
import FleetVehicles from './pages/fleet/FleetVehicles';
import VehicleDetails from './pages/fleet/VehicleDetails';
import FleetPreventive from './pages/fleet/FleetPreventive';
import FleetWorkshops from './pages/fleet/FleetWorkshops';
import { OnboardingWizard } from './pages/onboarding/OnboardingWizard';
import { ForcePasswordChange } from './pages/ForcePasswordChange';
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
import { WorkSchedules } from './pages/rh/WorkSchedules';
import { JobRoles } from './pages/rh/JobRoles';
import { Products } from './pages/Products';
import { NfeImport } from './pages/accounting/NfeImport';
import { Taxes } from './pages/accounting/taxes/Taxes';
import { ModuleMarketplace } from './pages/marketplace/ModuleMarketplace';
import { BulkUploadImpostos } from './pages/portalContabilidade/BulkUploadImpostos';


import { SaaSAuthProvider } from './context/SaaSAuthProvider';

// Portal do Gestor de Frota (cliente PJ)
import { PortalGestorRoute } from './routes/PortalGestorRoute';
import { QuotePdfViewer, GenericDocumentViewer } from './pages/DocumentViewer';
import { PortalLayout } from './pages/portalGestor/PortalLayout';
import { PortalDashboard } from './pages/portalGestor/PortalDashboard';
import { PortalEmpresa } from './pages/portalGestor/PortalEmpresa';
import { PortalVeiculos, PortalVeiculoDetalhe } from './pages/portalGestor/PortalVeiculos';
import { PortalOrdensServico, PortalManutencao, PortalDocumentos } from './pages/portalGestor/PortalAcompanhamento';
import { PortalFinanceiro } from './pages/portalGestor/PortalFinanceiro';
import { PortalMotoristas } from './pages/portalGestor/PortalMotoristas';
import { PortalMeuAcesso } from './pages/portalGestor/PortalMeuAcesso';
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

// Towing Pages
import { CreateTowingQuote } from './pages/towing/CreateTowingQuote';
import { TowingQuotesList } from './pages/towing/TowingQuotesList';
import { TowingRates } from './pages/towing/TowingRates';
import { TowingFleet } from './pages/towing/TowingFleet';
import { TowingDrivers } from './pages/towing/TowingDrivers';
import { TowingDashboard } from './pages/towing/TowingDashboard';

/** Redireciona preservando a query string (ex.: /portal/orcamentos?abrir=<id>). */
function RedirectKeepingQuery({ to }: { to: string }) {
  const { search } = useLocation();
  return <Navigate to={`${to}${search}`} replace />;
}

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
            <Route path="/onboarding" element={<OnboardingWizard />} />
            <Route path="/force-password-change" element={<ForcePasswordChange />} />

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
            
            {/* Visualização de PDF com URL legível (número do documento em vez de blob:<uuid>) */}
            <Route path="/orcamentos/:numero/pdf" element={<ProtectedRoute><QuotePdfViewer source="oficina" /></ProtectedRoute>} />
            <Route path="/portal/orcamentos/:numero/pdf" element={<PortalGestorRoute><QuotePdfViewer source="portal" /></PortalGestorRoute>} />
            <Route path="/documento/:nome" element={<ProtectedRoute><GenericDocumentViewer /></ProtectedRoute>} />

            {/* Portal do Gestor de Frota — acesso exclusivo do cliente PJ */}
            <Route path="/portal" element={<PortalGestorRoute><PortalLayout /></PortalGestorRoute>}>
              <Route index element={<PortalDashboard />} />
              <Route path="empresa" element={<PortalEmpresa />} />
              <Route path="veiculos" element={<PortalVeiculos />} />
              <Route path="veiculos/:id" element={<PortalVeiculoDetalhe />} />
              {/* Orçamentos foi unificada em Ordens de Serviço: links antigos (inclusive ?abrir=) continuam funcionando */}
              <Route path="orcamentos" element={<RedirectKeepingQuery to="/portal/ordens-servico" />} />
              <Route path="ordens-servico" element={<PortalOrdensServico />} />
              <Route path="manutencao" element={<PortalManutencao />} />
              <Route path="documentos" element={<PortalDocumentos />} />
              <Route path="financeiro" element={<PortalFinanceiro />} />
              <Route path="motoristas" element={<PortalMotoristas />} />
              <Route path="meu-acesso" element={<PortalMeuAcesso />} />
              <Route path="*" element={<Navigate to="/portal" replace />} />
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
              <Route path="clients/:id/dashboard" element={<ModuleGuard moduleKey="clientes" moduleName="Clientes"><ClientDashboard /></ModuleGuard>} />
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
              <Route path="accounting/xml-export" element={<ModuleGuard moduleKey="fiscal" moduleName="Contabilidade e Fiscal"><FiscalAccountingPortal /></ModuleGuard>} />
              <Route path="products" element={<ModuleGuard moduleKey="fiscal" moduleName="Contabilidade e Fiscal"><Products /></ModuleGuard>} />
              <Route path="accounting/nfe-import" element={<ModuleGuard moduleKey="fiscal" moduleName="Contabilidade e Fiscal"><NfeImport /></ModuleGuard>} />
              <Route path="accounting/taxes" element={<ModuleGuard moduleKey="fiscal" moduleName="Contabilidade e Fiscal"><Taxes /></ModuleGuard>} />

              {/* Rotas Portal Contabilidade Externa */}
              <Route path="accounting/portal-upload" element={<ModuleGuard moduleKey="fiscal" moduleName="Contabilidade e Fiscal"><BulkUploadImpostos /></ModuleGuard>} />


              {/* Rotas de Gestão de Frotas */}
              <Route path="fleet/dashboard" element={<ModuleGuard moduleKey="frotas" moduleName="Gestão de Frotas"><FleetDashboard /></ModuleGuard>} />
              <Route path="fleet/vehicles" element={<ModuleGuard moduleKey="frotas" moduleName="Gestão de Frotas"><FleetVehicles /></ModuleGuard>} />
              <Route path="fleet/vehicles/:id" element={<ModuleGuard moduleKey="frotas" moduleName="Gestão de Frotas"><VehicleDetails /></ModuleGuard>} />
              <Route path="fleet/preventive" element={<ModuleGuard moduleKey="frotas" moduleName="Gestão de Frotas"><FleetPreventive /></ModuleGuard>} />
              <Route path="fleet/workshops" element={<ModuleGuard moduleKey="frotas" moduleName="Gestão de Frotas"><FleetWorkshops /></ModuleGuard>} />

              {/* Rotas de Recursos Humanos */}
              <Route path="rh/absences" element={<ModuleGuard moduleKey="rh" moduleName="Recursos Humanos"><AbsenceControl /></ModuleGuard>} />
              <Route path="rh/closing" element={<ModuleGuard moduleKey="rh" moduleName="Recursos Humanos"><MonthlyClosing /></ModuleGuard>} />
              <Route path="rh/work-schedules" element={<ModuleGuard moduleKey="rh" moduleName="Recursos Humanos"><WorkSchedules /></ModuleGuard>} />
              <Route path="rh/job-roles" element={<ModuleGuard moduleKey="rh" moduleName="Recursos Humanos"><JobRoles /></ModuleGuard>} />

              {/* Central de Serviços — Marketplace de Módulos */}
              <Route path="marketplace" element={<ModuleMarketplace />} />

              {/* Rota Administrativa do SaaS (Apenas Platform Admin) */}
              <Route path="saas-dashboard" element={<SaaSAdminGuard><SaaSDashboard /></SaaSAdminGuard>} />

              {/* Rotas de Guincho (GUINCHO_PROVIDER) */}
              <Route path="towing/dashboard" element={<TowingDashboard />} />
              <Route path="towing/quotes/new" element={<CreateTowingQuote />} />
              <Route path="towing/quotes/edit/:id" element={<CreateTowingQuote />} />
              <Route path="towing/quotes" element={<TowingQuotesList />} />
              <Route path="towing/fleet" element={<TowingFleet />} />
              <Route path="towing/drivers" element={<TowingDrivers />} />
              <Route path="towing/rates" element={<TowingRates />} />
            </Route>
          </Routes>
          <Toaster position="top-right" richColors />
        </BreadcrumbProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;

