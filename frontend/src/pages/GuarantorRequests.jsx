import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../lib/AuthContext';
import { api, formatNaira } from '../lib/api';
import { EmptyState } from '../components/ui';

export default function GuarantorRequests() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-member', user.memberId],
    queryFn: () => api.get('/dashboard/member').then((r) => r.data),
  });

  if (isLoading) return <EmptyState text="Loading…" />;
  const requests = data?.pendingGuarantorRequests || [];

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Guarantor requests</h1>
      {requests.length === 0 ? (
        <EmptyState text="No pending guarantor requests." />
      ) : (
        requests.map((g) => (
          <Link key={g.id} to={`/loans/${g.loanId}`} className="card p-5 flex justify-between items-center block">
            <div>
              <div className="font-semibold">{g.loan.member.firstName} {g.loan.member.lastName}</div>
              <div className="text-dim text-sm">Requested guarantee: {formatNaira(g.amountGuaranteed)}</div>
            </div>
            <span className="text-accent font-semibold text-sm">Respond →</span>
          </Link>
        ))
      )}
    </div>
  );
}
