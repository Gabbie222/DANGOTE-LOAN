import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../lib/AuthContext';
import { api, formatNaira } from '../lib/api';
import { EmptyState } from '../components/ui';

export default function MySavings() {
  const { user } = useAuth();
  const { data: member, isLoading } = useQuery({
    queryKey: ['member', user.memberId],
    queryFn: () => api.get(`/members/${user.memberId}`).then((r) => r.data),
    enabled: !!user.memberId,
  });
  const { data: transactions } = useQuery({
    queryKey: ['transactions', user.memberId],
    queryFn: () => api.get(`/savings/members/${user.memberId}/transactions`).then((r) => r.data),
    enabled: !!user.memberId,
  });

  if (isLoading) return <EmptyState text="Loading…" />;
  if (!member) return null;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">My savings</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {member.savingsAccounts.map((a) => (
          <div key={a.id} className="card p-5">
            <div className="text-dim text-xs uppercase font-semibold">{a.type}</div>
            <div className="text-2xl font-bold mt-2">{formatNaira(a.balance)}</div>
          </div>
        ))}
      </div>
      <div className="card p-5">
        <div className="font-semibold mb-3">Transaction history</div>
        {transactions?.length === 0 ? (
          <div className="text-dim text-sm">No transactions yet.</div>
        ) : (
          <table>
            <thead><tr><th>Date</th><th>Type</th><th>Amount</th></tr></thead>
            <tbody>
              {transactions?.map((t) => (
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
