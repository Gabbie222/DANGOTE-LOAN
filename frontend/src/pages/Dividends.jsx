import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, formatNaira } from '../lib/api';
import { Button, Field, EmptyState } from '../components/ui';

export default function Dividends() {
  const qc = useQueryClient();
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [ratePct, setRatePct] = useState(5);
  const [error, setError] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['dividends', year],
    queryFn: () => api.get(`/dividends/${year}`).then((r) => r.data),
  });

  const compute = useMutation({
    mutationFn: () => api.post('/dividends/compute', { year: Number(year), ratePct: Number(ratePct) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['dividends', year] }); setError(''); },
    onError: (e) => setError(e.response?.data?.error || 'Computation failed'),
  });

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold">Year-end dividends</h1>

      <div className="card p-5 flex flex-wrap items-end gap-3">
        <Field label="Year"><input type="number" value={year} onChange={(e) => setYear(e.target.value)} className="w-28" /></Field>
        {!data?.computed && (
          <>
            <Field label="Rate (%)"><input type="number" step="0.1" value={ratePct} onChange={(e) => setRatePct(e.target.value)} className="w-28" /></Field>
            <Button onClick={() => compute.mutate()} disabled={compute.isPending}>
              {compute.isPending ? 'Computing…' : `Compute ${year} dividends`}
            </Button>
          </>
        )}
      </div>

      {error && <div className="text-danger text-sm">{error}</div>}

      {isLoading ? (
        <EmptyState text="Loading…" />
      ) : !data?.computed ? (
        <EmptyState text={`Dividends for ${year} have not been computed yet.`} />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="card p-5">
              <div className="text-dim text-xs uppercase font-semibold">Rate applied</div>
              <div className="text-2xl font-bold mt-2">{data.meta.ratePct}%</div>
            </div>
            <div className="card p-5">
              <div className="text-dim text-xs uppercase font-semibold">Total paid out</div>
              <div className="text-2xl font-bold mt-2">{formatNaira(data.meta.totalKobo)}</div>
            </div>
            <div className="card p-5">
              <div className="text-dim text-xs uppercase font-semibold">Members paid</div>
              <div className="text-2xl font-bold mt-2">{data.meta.payoutCount}</div>
            </div>
          </div>

          <div className="card overflow-x-auto">
            <table>
              <thead><tr><th>Member</th><th>Amount</th></tr></thead>
              <tbody>
                {data.payouts.map((p) => (
                  <tr key={p.id}>
                    <td>{p.member.firstName} {p.member.lastName} ({p.member.memberNo})</td>
                    <td>{formatNaira(p.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
