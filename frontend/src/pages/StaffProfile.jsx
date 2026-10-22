import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { Button } from '../components/ui';

const ROLE_LABELS = {
  SUPER_ADMIN: 'Super Admin',
  LOAN_OFFICER: 'Loan Officer',
  APPROVAL_MANAGER: 'Approval Manager',
  ACCOUNTANT: 'Accountant / Treasurer',
};

export default function StaffProfile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="max-w-md space-y-5">
      <h1 className="text-xl font-bold">Profile</h1>

      <div className="card p-5 space-y-3">
        <div>
          <div className="text-dim text-xs uppercase font-semibold">Email</div>
          <div className="font-medium mt-1">{user.email}</div>
        </div>
        <div>
          <div className="text-dim text-xs uppercase font-semibold">Role</div>
          <div className="font-medium mt-1">{ROLE_LABELS[user.role] || user.role}</div>
        </div>
        <div>
          <div className="text-dim text-xs uppercase font-semibold">Two-factor authentication</div>
          <div className="font-medium mt-1">{user.twoFactorEnabled ? 'Enabled' : 'Disabled'} · manage under Security</div>
        </div>
      </div>

      <div className="card p-5 flex items-center justify-between">
        <div className="text-sm text-dim">Signed in as {user.email}</div>
        <Button variant="ghost" onClick={() => { logout(); navigate('/login'); }}>
          Log out
        </Button>
      </div>
    </div>
  );
}
