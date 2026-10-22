import { NavLink } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';

const staffLinks = [
  { to: '/admin', label: 'Dashboard' },
  { to: '/members', label: 'Members' },
  { to: '/loans', label: 'Loans' },
  { to: '/loan-products', label: 'Loan Products' },
  { to: '/reports', label: 'Reports' },
  { to: '/dividends', label: 'Dividends' },
  { to: '/audit-logs', label: 'Audit Log' },
  { to: '/security', label: 'Security' },
  { to: '/profile', label: 'Profile' },
];

const memberLinks = [
  { to: '/', label: 'Home' },
  { to: '/my-loans', label: 'My Loans' },
  { to: '/apply', label: 'Apply' },
  { to: '/savings', label: 'Savings' },
  { to: '/guarantor-requests', label: 'Guarantor Requests' },
  { to: '/profile', label: 'Profile' },
];

export default function Layout({ children }) {
  const { user, isStaff } = useAuth();
  const links = isStaff ? staffLinks : memberLinks;

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <header className="sticky top-0 z-10 border-b border-token" style={{ background: 'var(--bg)' }}>
        <div className="max-w-6xl mx-auto flex items-center justify-between px-5 py-4">
          <div className="font-bold text-lg">Coop<span className="text-accent">Ledger</span></div>
          <nav className="hidden md:flex gap-1">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.to === '/'}
                className={({ isActive }) =>
                  `px-4 py-2 rounded-full text-sm font-medium transition ${
                    isActive ? 'btn-pill' : 'text-dim hover:opacity-80'
                  }`
                }
              >
                {l.label}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <div className="text-sm text-dim hidden sm:block">{user?.email}</div>
          </div>
        </div>
        <nav className="md:hidden flex gap-2 px-5 pb-3 overflow-x-auto">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.to === '/'}
              className={({ isActive }) =>
                `px-4 py-2 rounded-full text-sm whitespace-nowrap ${isActive ? 'btn-pill' : 'btn-ghost'}`
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="max-w-6xl mx-auto px-5 py-6">{children}</main>
    </div>
  );
}
