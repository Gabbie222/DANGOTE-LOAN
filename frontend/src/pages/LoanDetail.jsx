import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, formatNaira, toKobo } from '../lib/api';
import { Button, Field, EmptyState, Badge } from '../components/ui';
import { useAuth } from '../lib/AuthContext';

export default function LoanDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [comment, setComment] = useState('');
  const [disburseMethod, setDisburseMethod] = useState('bank_transfer');
  const [repayAmount, setRepayAmount] = useState('');

  const { data: loan, isLoading } = useQuery({
    queryKey: ['loan', id],
    queryFn: () => api.get(`/loans/${id}`).then((r) => r.data),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['loan', id] });

  const review = useMutation({
    mutationFn: (action) => api.post(`/loans/${id}/review`, { action, comment }),
    onSuccess: invalidate,
  });
  const approve = useMutation({
    mutationFn: () => api.post(`/loans/${id}/approve`, { comment }),
    onSuccess: invalidate,
  });
  const reject = useMutation({
    mutationFn: () => api.post(`/loans/${id}/reject`, { comment }),
    onSuccess: invalidate,
  });
  const disburse = useMutation({
    mutationFn: () => api.post(`/loans/${id}/disburse`, { method: disburseMethod }),
    onSuccess: invalidate,
  });
  const repay = useMutation({
    mutationFn: () => api.post(`/loans/${id}/repayments`, { amountKobo: toKobo(repayAmount), method: 'manual' }),
    onSuccess: () => { invalidate(); setRepayAmount(''); },
  });
  const respondGuarantor = useMutation({
    mutationFn: ({ gid, action }) => api.post(`/loans/${id}/guarantors/${gid}/respond`, { action }),
    onSuccess: invalidate,
  });

  if (isLoading) return <EmptyState text="Loading loan…" />;
  if (!loan) return <EmptyState text="Loan not found." />;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold">{loan.product.name} — {formatNaira(loan.amount)}</h1>
          <div className="text-dim text-sm">{loan.member.firstName} {loan.member.lastName} ({loan.member.memberNo})</div>
        </div>
        <Badge status={loan.status} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Info label="Tenure" value={`${loan.tenureMonths} months`} />
        <Info label="Rate" value={`${loan.rate}% ${loan.method}`} />
        <Info label="Monthly payment" value={formatNaira(loan.monthlyPayment)} />
        <Info label="Total payable" value={formatNaira(loan.totalPayable)} />
      </div>

      <div className="card p-5">
        <div className="font-semibold mb-3">Guarantors</div>
        <div className="space-y-2">
          {loan.guarantors.map((g) => (
            <div key={g.id} className="flex items-center justify-between text-sm py-2 border-b border-token last:border-0">
              <div>{g.guarantor.firstName} {g.guarantor.lastName} <span className="text-dim">({g.guarantor.memberNo})</span> — {formatNaira(g.amountGuaranteed)}</div>
              <div className="flex items-center gap-2">
                <Badge status={g.status} />
                {g.status === 'PENDING' && g.guarantorMemberId === user.memberId && (
                  <>
                    <Button className="px-3 py-1" onClick={() => respondGuarantor.mutate({ gid: g.id, action: 'ACCEPT' })}>Accept</Button>
                    <Button variant="ghost" className="px-3 py-1" onClick={() => respondGuarantor.mutate({ gid: g.id, action: 'DECLINE' })}>Decline</Button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {['LOAN_OFFICER', 'APPROVAL_MANAGER', 'ACCOUNTANT', 'SUPER_ADMIN'].includes(user.role) && (
        <div className="card p-5 space-y-3">
          <div className="font-semibold">Workflow actions</div>
          <Field label="Comment (optional)"><input value={comment} onChange={(e) => setComment(e.target.value)} /></Field>
          <div className="flex flex-wrap gap-2">
            {loan.status === 'UNDER_REVIEW' && ['LOAN_OFFICER', 'SUPER_ADMIN'].includes(user.role) && (
              <>
                <Button onClick={() => review.mutate('RECOMMEND')}>Recommend</Button>
                <Button variant="ghost" onClick={() => review.mutate('REJECT')}>Reject</Button>
              </>
            )}
            {loan.status === 'RECOMMENDED' && ['APPROVAL_MANAGER', 'SUPER_ADMIN'].includes(user.role) && (
              <>
                <Button onClick={() => approve.mutate()}>Approve</Button>
                <Button variant="ghost" onClick={() => reject.mutate()}>Reject</Button>
              </>
            )}
            {loan.status === 'APPROVED' && ['ACCOUNTANT', 'SUPER_ADMIN'].includes(user.role) && (
              <div className="flex items-end gap-2">
                <Field label="Disbursement method">
                  <select value={disburseMethod} onChange={(e) => setDisburseMethod(e.target.value)}>
                    <option value="bank_transfer">Bank transfer</option>
                    <option value="cash">Cash</option>
                  </select>
                </Field>
                <Button onClick={() => disburse.mutate()}>Disburse</Button>
              </div>
            )}
            {!['UNDER_REVIEW', 'RECOMMENDED', 'APPROVED'].includes(loan.status) && (
              <div className="text-dim text-sm">No actions available for this status.</div>
            )}
          </div>
        </div>
      )}

      {['ACTIVE', 'OVERDUE', 'COMPLETED'].includes(loan.status) && (
        <div className="card p-5">
          <div className="font-semibold mb-3">Repayment schedule</div>
          <table>
            <thead><tr><th>#</th><th>Due date</th><th>Principal</th><th>Interest</th><th>Due</th><th>Paid</th><th>Status</th></tr></thead>
            <tbody>
              {loan.schedule.map((s) => (
                <tr key={s.id}>
                  <td>{s.instalmentNo}</td>
                  <td>{new Date(s.dueDate).toLocaleDateString()}</td>
                  <td>{formatNaira(s.principal)}</td>
                  <td>{formatNaira(s.interest)}</td>
                  <td>{formatNaira(s.amountDue)}</td>
                  <td>{formatNaira(s.amountPaid)}</td>
                  <td><Badge status={s.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>

          {['ACCOUNTANT', 'SUPER_ADMIN'].includes(user.role) && ['ACTIVE', 'OVERDUE'].includes(loan.status) && (
            <div className="flex items-end gap-2 mt-4">
              <Field label="Repayment amount (₦)"><input type="number" value={repayAmount} onChange={(e) => setRepayAmount(e.target.value)} /></Field>
              <Button onClick={() => repay.mutate()} disabled={!repayAmount || repay.isPending}>Record payment</Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div className="card p-4">
      <div className="text-dim text-xs uppercase font-semibold">{label}</div>
      <div className="font-semibold mt-1">{value}</div>
    </div>
  );
}
