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
import FleetDashboard from './pages/fleet/FleetDashboard';
import FleetVehicles from './pages/fleet/FleetVehicles';
import VehicleDetails from './pages/fleet/VehicleDetails';
import FleetPreventive from './pages/fleet/FleetPreventive';
import FleetWorkshops from './pages/fleet/FleetWorkshops';
import { Toaster } from 'sonner';
import { BreadcrumbProvider } from './context/BreadcrumbContext';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = !!localStorage.getItem('token');
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

function App() {
  return (
    <BrowserRouter>
      <BreadcrumbProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route index element={<Dashboard />} />
            <Route path="quotes/new" element={<CreateQuote />} />
            <Route path="quotes/edit/:id" element={<CreateQuote />} />
            <Route path="quotes" element={<QuotesList />} />
            <Route path="users" element={<Users />} />
            <Route path="settings/email" element={<EmailConfig />} />
            <Route path="clients" element={<Clients />} />
            <Route path="suppliers" element={<Suppliers />} />
            <Route path="collaborators" element={<Collaborators />} />
            <Route path="platforms" element={<Platforms />} />
            
            {/* Rotas de Gestão Financeira */}
            <Route path="financial/dashboard" element={<FinancialDashboard />} />
            <Route path="financial/payables" element={<FinancialPayables />} />
            <Route path="financial/receivables" element={<FinancialReceivables />} />
            <Route path="financial/approvals" element={<FinancialApprovals />} />
            <Route path="financial/reports" element={<FinancialReports />} />

            {/* Rotas de Gestão de Frotas */}
            <Route path="fleet/dashboard" element={<FleetDashboard />} />
            <Route path="fleet/vehicles" element={<FleetVehicles />} />
            <Route path="fleet/vehicles/:id" element={<VehicleDetails />} />
            <Route path="fleet/preventive" element={<FleetPreventive />} />
            <Route path="fleet/workshops" element={<FleetWorkshops />} />
          </Route>
        </Routes>
        <Toaster position="top-right" richColors />
      </BreadcrumbProvider>
    </BrowserRouter>
  );
}

export default App;
