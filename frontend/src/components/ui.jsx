export function StatCard({ label, value, sub }) {
  return (
    <div className="card p-5">
      <div className="text-dim text-xs uppercase tracking-wide font-semibold">{label}</div>
      <div className="text-2xl font-bold mt-2">{value}</div>
      {sub && <div className="text-dim text-xs mt-1">{sub}</div>}
    </div>
  );
}

const statusColors = {
  ACTIVE: 'text-success', COMPLETED: 'text-success', APPROVED: 'text-accent',
  DISBURSED: 'text-accent', SUBMITTED: 'text-dim', AWAITING_GUARANTORS: 'text-dim',
  UNDER_REVIEW: 'text-dim', RECOMMENDED: 'text-accent', OVERDUE: 'text-danger',
  DEFAULTED: 'text-danger', REJECTED: 'text-danger', PENDING: 'text-dim',
};

export function Badge({ status }) {
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-semibold card2 ${statusColors[status] || ''}`}>
      {status?.replaceAll('_', ' ')}
    </span>
  );
}

export function Button({ children, variant = 'primary', className = '', ...props }) {
  const base = variant === 'primary' ? 'btn-pill' : 'btn-ghost';
  return (
    <button className={`${base} px-5 py-2.5 text-sm ${className}`} {...props}>
      {children}
    </button>
  );
}

export function Field({ label, children }) {
  return (
    <label className="block mb-3">
      <div className="text-xs font-semibold text-dim mb-1">{label}</div>
      {children}
    </label>
  );
}

export function EmptyState({ text }) {
  return <div className="card p-8 text-center text-dim">{text}</div>;
}
