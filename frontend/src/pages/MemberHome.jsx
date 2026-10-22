import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api, formatNaira } from '../lib/api';
import { EmptyState, Button } from '../components/ui';

export default function MemberHome() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-member'],
    queryFn: () => api.get('/dashboard/member').then((r) => r.data),
  });

  if (isLoading) return <EmptyState text="Loading…" />;
  if (!data) return null;

  return (
    <div className="space-y-6">
      <div className="card p-6" style={{ background: 'var(--nav-bg)', color: '#fff' }}>
        <div className="text-sm opacity-70">Total savings</div>
        <div className="text-4xl font-bold mt-1">{formatNaira(data.savingsBalanceKobo)}</div>
        <div className="text-sm opacity-70 mt-2">Share capital: {formatNaira(data.sharesKobo)}</div>
      </div>

      {data.activeLoan ? (
        <div className="card p-5">
          <div className="font-semibold mb-2">Active loan — {data.activeLoan.productName}</div>
          <div className="flex justify-between text-sm text-dim mb-1">
            <span>Amount</span><span>{formatNaira(data.activeLoan.amountKobo)}</span>
          </div>
          <div className="flex justify-between text-sm text-dim mb-1">
            <span>Monthly payment</span><span>{formatNaira(data.activeLoan.monthlyPaymentKobo)}</span>
          </div>
          {data.activeLoan.nextDueDate && (
            <div className="flex justify-between text-sm text-dim">
              <span>Next due ({new Date(data.activeLoan.nextDueDate).toLocaleDateString()})</span>
              <span>{formatNaira(data.activeLoan.nextDueAmountKobo)}</span>
            </div>
          )}
        </div>
      ) : (
        <div className="card p-5 flex items-center justify-between">
          <div>
            <div className="font-semibold">No active loan</div>
            <div className="text-dim text-sm">Ready to apply for a new loan?</div>
          </div>
          <Link to="/apply"><Button>Apply now</Button></Link>
        </div>
      )}

      {data.pendingGuarantorRequests.length > 0 && (
        <div className="card p-5">
          <div className="font-semibold mb-3">Pending guarantor requests</div>
          {data.pendingGuarantorRequests.map((g) => (
            <div key={g.id} className="flex justify-between items-center text-sm py-2 border-b border-token last:border-0">
              <span>{g.loan.member.firstName} {g.loan.member.lastName} asked you to guarantee {formatNaira(g.amountGuaranteed)}</span>
              <Link to={`/loans/${g.loanId}`} className="text-accent font-semibold">Respond →</Link>
            </div>
          ))}
        </div>
      )}

      <div className="card p-5">
        <div className="font-semibold mb-3">Recent transactions</div>
        {data.recentTransactions.length === 0 ? (
          <div className="text-dim text-sm">No transactions yet.</div>
        ) : (
          <table>
            <thead><tr><th>Date</th><th>Type</th><th>Amount</th></tr></thead>
            <tbody>
              {data.recentTransactions.map((t) => (
                <tr key={t.id}>
                  <td>{new Date(t.createdAt).toLocaleDateString()}</td>
                  <td>{t.type.replaceAll('_', ' ')}</td>
                  <td className={t.direction === 'CREDIT' ? 'text-success' : 'text-danger'}>
                    {t.direction === 'CREDIT' ? '+' : '-'}{formatNaira(t.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
