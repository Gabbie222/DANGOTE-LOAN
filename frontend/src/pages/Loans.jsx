import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api, formatNaira } from '../lib/api';
import { EmptyState, Badge } from '../components/ui';

const STATUSES = ['', 'SUBMITTED', 'AWAITING_GUARANTORS', 'UNDER_REVIEW', 'RECOMMENDED', 'APPROVED', 'ACTIVE', 'OVERDUE', 'COMPLETED', 'DEFAULTED', 'REJECTED'];

export default function Loans() {
  const [status, setStatus] = useState('');
  const { data: loans, isLoading } = useQuery({
    queryKey: ['loans', status],
    queryFn: () => api.get('/loans', { params: status ? { status } : {} }).then((r) => r.data),
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-bold">Loans</h1>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-56">
          {STATUSES.map((s) => <option key={s} value={s}>{s || 'All statuses'}</option>)}
        </select>
      </div>

      {isLoading ? (
        <EmptyState text="Loading…" />
      ) : loans?.length === 0 ? (
        <EmptyState text="No loans found." />
      ) : (
        <div className="card overflow-x-auto">
          <table>
            <thead><tr><th>Member</th><th>Product</th><th>Amount</th><th>Guarantors</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {loans?.map((l) => (
                <tr key={l.id}>
                  <td>{l.member.firstName} {l.member.lastName} <span className="text-dim">({l.member.memberNo})</span></td>
                  <td>{l.product.name}</td>
                  <td>{formatNaira(l.amount)}</td>
                  <td>{l.guarantors.filter((g) => g.status === 'ACCEPTED').length}/{l.guarantors.length} accepted</td>
                  <td><Badge status={l.status} /></td>
                  <td><Link to={`/loans/${l.id}`} className="text-accent text-sm font-semibold">View →</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
