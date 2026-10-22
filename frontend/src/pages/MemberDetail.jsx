import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, formatNaira, toKobo } from '../lib/api';
import { Button, Field, EmptyState, Badge } from '../components/ui';
import KycUploads from '../components/KycUploads';

export default function MemberDetail() {
  const { id } = useParams();
  const qc = useQueryClient();
  const [amount, setAmount] = useState('');
  const [type, setType] = useState('REGULAR');

  const { data: member, isLoading } = useQuery({
    queryKey: ['member', id],
    queryFn: () => api.get(`/members/${id}`).then((r) => r.data),
  });

  const contribute = useMutation({
    mutationFn: () => api.post(`/savings/members/${id}/contributions`, { type, amountKobo: toKobo(amount) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['member', id] });
      setAmount('');
    },
  });

  if (isLoading) return <EmptyState text="Loading member…" />;
  if (!member) return <EmptyState text="Member not found." />;

  const savingsTotal = member.savingsAccounts.reduce((s, a) => s + a.balance, 0);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">{member.firstName} {member.lastName}</h1>
          <div className="text-dim text-sm">{member.memberNo} · {member.user.email}</div>
        </div>
        <Badge status={member.status} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-5">
          <div className="text-dim text-xs uppercase font-semibold">Savings balance</div>
          <div className="text-2xl font-bold mt-2">{formatNaira(savingsTotal)}</div>
          <div className="mt-3 space-y-1 text-sm">
            {member.savingsAccounts.map((a) => (
              <div key={a.id} className="flex justify-between text-dim">
                <span>{a.type}</span><span>{formatNaira(a.balance)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-5 md:col-span-2">
          <div className="font-semibold mb-3">Record a contribution</div>
          <div className="flex gap-3 items-end flex-wrap">
            <Field label="Type">
              <select value={type} onChange={(e) => setType(e.target.value)}>
                <option value="REGULAR">Regular savings</option>
                <option value="SHARES">Share capital</option>
                <option value="TARGET">Target savings</option>
              </select>
            </Field>
            <Field label="Amount (₦)">
              <input type="number" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </Field>
            <Button onClick={() => contribute.mutate()} disabled={!amount || contribute.isPending}>
              {contribute.isPending ? 'Saving…' : 'Add contribution'}
            </Button>
          </div>
        </div>
      </div>

      <KycUploads member={member} />

      <div className="card p-5">
        <div className="font-semibold mb-3">Loans</div>
        {member.loans.length === 0 ? (
          <div className="text-dim text-sm">No loans yet.</div>
        ) : (
          <table>
            <thead><tr><th>Product</th><th>Amount</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {member.loans.map((l) => (
                <tr key={l.id}>
                  <td>{l.product.name}</td>
                  <td>{formatNaira(l.amount)}</td>
                  <td><Badge status={l.status} /></td>
                  <td><Link to={`/loans/${l.id}`} className="text-accent text-sm font-semibold">View →</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card p-5">
        <div className="font-semibold mb-3">Profile</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div><div className="text-dim text-xs">Phone</div>{member.phone || '—'}</div>
          <div><div className="text-dim text-xs">Employer</div>{member.employer || '—'}</div>
          <div><div className="text-dim text-xs">Next of kin</div>{member.nextOfKin || '—'}</div>
          <div><div className="text-dim text-xs">Joined</div>{new Date(member.joinDate).toLocaleDateString()}</div>
        </div>
      </div>
    </div>
  );
}
