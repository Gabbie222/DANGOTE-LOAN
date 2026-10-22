import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api, formatNaira } from '../lib/api';
import { EmptyState, Badge } from '../components/ui';

export default function MyLoans() {
  const { data: loans, isLoading } = useQuery({
    queryKey: ['my-loans'],
    queryFn: () => api.get('/loans').then((r) => r.data),
  });

  if (isLoading) return <EmptyState text="Loading…" />;
  if (loans?.length === 0) return <EmptyState text="You have no loans yet." />;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">My loans</h1>
      {loans?.map((l) => (
        <Link to={`/loans/${l.id}`} key={l.id} className="card p-5 flex justify-between items-center block">
          <div>
            <div className="font-semibold">{l.product.name}</div>
            <div className="text-dim text-sm">{formatNaira(l.amount)} · {l.tenureMonths} months</div>
          </div>
          <Badge status={l.status} />
        </Link>
      ))}
    </div>
  );
}
