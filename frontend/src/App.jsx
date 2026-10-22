import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './lib/AuthContext';
import Layout from './components/Layout';

import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import Members from './pages/Members';
import MemberDetail from './pages/MemberDetail';
import LoanProducts from './pages/LoanProducts';
import Loans from './pages/Loans';
import LoanDetail from './pages/LoanDetail';
import Reports from './pages/Reports';
import AuditLog from './pages/AuditLog';
import MemberHome from './pages/MemberHome';
import MyLoans from './pages/MyLoans';
import ApplyLoan from './pages/ApplyLoan';
import MySavings from './pages/MySavings';
import GuarantorRequests from './pages/GuarantorRequests';
import MyProfile from './pages/MyProfile';
import StaffProfile from './pages/StaffProfile';
import Security from './pages/Security';
import Dividends from './pages/Dividends';

function Protected({ children, staffOnly = false }) {
  const { user, isStaff } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (staffOnly && !isStaff) return <Navigate to="/" replace />;
  return <Layout>{children}</Layout>;
}

export default function App() {
  const { user, isStaff } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to={isStaff ? '/admin' : '/'} replace /> : <Login />} />

      <Route path="/admin" element={<Protected staffOnly><AdminDashboard /></Protected>} />
      <Route path="/members" element={<Protected staffOnly><Members /></Protected>} />
      <Route path="/members/:id" element={<Protected staffOnly><MemberDetail /></Protected>} />
      <Route path="/loan-products" element={<Protected staffOnly><LoanProducts /></Protected>} />
      <Route path="/loans" element={<Protected staffOnly><Loans /></Protected>} />
      <Route path="/reports" element={<Protected staffOnly><Reports /></Protected>} />
      <Route path="/audit-logs" element={<Protected staffOnly><AuditLog /></Protected>} />
      <Route path="/dividends" element={<Protected staffOnly><Dividends /></Protected>} />
      <Route path="/security" element={<Protected staffOnly><Security /></Protected>} />

      <Route path="/loans/:id" element={<Protected><LoanDetail /></Protected>} />

      <Route path="/" element={<Protected>{isStaff ? <Navigate to="/admin" replace /> : <MemberHome />}</Protected>} />
      <Route path="/my-loans" element={<Protected><MyLoans /></Protected>} />
      <Route path="/apply" element={<Protected><ApplyLoan /></Protected>} />
      <Route path="/savings" element={<Protected><MySavings /></Protected>} />
      <Route path="/guarantor-requests" element={<Protected><GuarantorRequests /></Protected>} />
      <Route path="/profile" element={<Protected>{isStaff ? <StaffProfile /> : <MyProfile />}</Protected>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
