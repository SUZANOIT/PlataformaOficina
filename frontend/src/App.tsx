import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { CreateQuote } from './pages/CreateQuote';
import { Register } from './pages/Register';
import { EmailConfig } from './pages/EmailConfig';
import { Users } from './pages/Users';
import { Toaster } from 'sonner';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = !!localStorage.getItem('token');
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        
        <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route index element={<Dashboard />} />
          <Route path="quotes/new" element={<CreateQuote />} />
          <Route path="quotes/edit/:id" element={<CreateQuote />} />
          <Route path="users" element={<Users />} />
          <Route path="settings/email" element={<EmailConfig />} />
        </Route>
      </Routes>
      <Toaster position="top-right" richColors />
    </BrowserRouter>
  );
}

export default App;
