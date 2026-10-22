import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { EmptyState } from '../components/ui';

export default function AuditLog() {
  const { data: logs, isLoading } = useQuery({
    queryKey: ['audit-logs'],
    queryFn: () => api.get('/audit-logs').then((r) => r.data),
  });

  if (isLoading) return <EmptyState text="Loading…" />;

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold">Audit log</h1>
      <div className="card overflow-x-auto">
        <table>
          <thead><tr><th>When</th><th>Actor</th><th>Action</th><th>Entity</th><th>Entity ID</th></tr></thead>
          <tbody>
            {logs?.map((l) => (
              <tr key={l.id}>
                <td className="whitespace-nowrap">{new Date(l.createdAt).toLocaleString()}</td>
                <td>{l.actor?.email || 'system'}</td>
                <td>{l.action}</td>
                <td>{l.entity}</td>
                <td className="text-dim">{l.entityId?.slice(0, 10)}…</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
