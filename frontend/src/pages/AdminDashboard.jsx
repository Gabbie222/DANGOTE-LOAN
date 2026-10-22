import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { api, formatNaira } from '../lib/api';
import { StatCard, EmptyState } from '../components/ui';

export default function AdminDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-admin'],
    queryFn: () => api.get('/dashboard/admin').then((r) => r.data),
  });

  if (isLoading) return <EmptyState text="Loading dashboard…" />;
  if (!data) return null;

  const chartData = data.loansByProduct.map((p) => ({
    name: p.productName,
    count: p.count,
    amount: p.totalAmountKobo / 100,
  }));

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Cooperative overview</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Pending" value={data.counts.pending} />
        <StatCard label="Awaiting guarantors" value={data.counts.awaitingGuarantors} />
        <StatCard label="Under review" value={data.counts.underReview} />
        <StatCard label="Approved" value={data.counts.approved} />
        <StatCard label="Active" value={data.counts.active} />
        <StatCard label="Overdue" value={data.counts.overdue} />
        <StatCard label="Completed" value={data.counts.completed} />
        <StatCard label="Defaulted" value={data.counts.defaulted} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard label="Total disbursed" value={formatNaira(data.totalDisbursedKobo)} />
        <StatCard label="Total recovered" value={formatNaira(data.totalRecoveredKobo)} />
        <StatCard label="Outstanding portfolio" value={formatNaira(data.outstandingPortfolioKobo)}
          sub={`Portfolio at risk: ${data.portfolioAtRiskPct}%`} />
      </div>

      <div className="card p-5">
        <div className="font-semibold mb-4">Loans by product</div>
        {chartData.length === 0 ? (
          <div className="text-dim text-sm">No loans yet.</div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--stroke)" />
              <XAxis dataKey="name" stroke="var(--text-dim)" fontSize={12} />
              <YAxis stroke="var(--text-dim)" fontSize={12} />
              <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--stroke)', borderRadius: 12 }} />
              <Bar dataKey="count" fill="var(--accent)" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
