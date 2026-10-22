import { useState } from 'react';
import { api, formatNaira } from '../lib/api';
import { Button, Field, EmptyState, Badge } from '../components/ui';

const REPORT_TYPES = [
  { value: 'member-register', label: 'Member register' },
  { value: 'loan-portfolio', label: 'Loan portfolio report' },
  { value: 'overdue-aging', label: 'Overdue / aging report' },
  { value: 'disbursement-repayment', label: 'Disbursement & repayment report' },
  { value: 'income', label: 'Income report (fees, interest)' },
];

export default function Reports() {
  const [type, setType] = useState(REPORT_TYPES[0].value);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  async function view() {
    setLoading(true);
    try {
      const { data } = await api.get(`/reports/${type}`, { params: { format: 'json' } });
      setResult(data);
    } finally {
      setLoading(false);
    }
  }

  async function downloadPdf() {
    const res = await api.get(`/reports/${type}`, { params: { format: 'pdf' }, responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const a = document.createElement('a');
    a.href = url; a.download = `${type}.pdf`; a.click();
    window.URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold">Reports</h1>
      <div className="card p-5 flex flex-wrap items-end gap-3">
        <Field label="Report type">
          <select value={type} onChange={(e) => { setType(e.target.value); setResult(null); }} className="w-72">
            {REPORT_TYPES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </Field>
        <Button onClick={view} disabled={loading}>{loading ? 'Loading…' : 'View'}</Button>
        <Button variant="ghost" onClick={downloadPdf}>Download PDF</Button>
      </div>

      {result && <ReportTable type={type} data={result} />}
    </div>
  );
}

function ReportTable({ type, data }) {
  if (!data || (Array.isArray(data) && data.length === 0)) {
    return <EmptyState text="No data for this report yet." />;
  }

  switch (type) {
    case 'member-register':
      return (
        <div className="card overflow-x-auto">
          <table>
            <thead><tr><th>Member No</th><th>Name</th><th>Phone</th><th>Status</th><th>Savings</th></tr></thead>
            <tbody>
              {data.map((m) => (
                <tr key={m.id}>
                  <td>{m.memberNo}</td>
                  <td>{m.firstName} {m.lastName}</td>
                  <td>{m.phone || '—'}</td>
                  <td><Badge status={m.status} /></td>
                  <td>{formatNaira(m.savingsAccounts.reduce((s, a) => s + a.balance, 0))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );

    case 'loan-portfolio':
      return (
        <div className="card overflow-x-auto">
          <table>
            <thead><tr><th>Member</th><th>Product</th><th>Amount</th><th>Tenure</th><th>Rate</th><th>Status</th></tr></thead>
            <tbody>
              {data.map((l) => (
                <tr key={l.id}>
                  <td>{l.member.firstName} {l.member.lastName} ({l.member.memberNo})</td>
                  <td>{l.product.name}</td>
                  <td>{formatNaira(l.amount)}</td>
                  <td>{l.tenureMonths} mo</td>
                  <td>{l.rate}% {l.method}</td>
                  <td><Badge status={l.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );

    case 'overdue-aging':
      return (
        <div className="card overflow-x-auto">
          <table>
            <thead><tr><th>Member</th><th>Days late</th><th>Bucket</th><th>Amount owed</th></tr></thead>
            <tbody>
              {data.map((r, i) => (
                <tr key={i}>
                  <td>{r.member}</td>
                  <td>{r.daysLate}</td>
                  <td>{r.bucket}</td>
                  <td className="text-danger">{formatNaira(r.amountOwed)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );

    case 'disbursement-repayment':
      return (
        <div className="card overflow-x-auto">
          <table>
            <thead><tr><th>Date</th><th>Type</th><th>Amount</th><th>Method</th><th>Reference</th></tr></thead>
            <tbody>
              {data.map((t) => (
                <tr key={t.id}>
                  <td>{new Date(t.createdAt).toLocaleDateString()}</td>
                  <td>{t.type.replaceAll('_', ' ')}</td>
                  <td className={t.direction === 'CREDIT' ? 'text-success' : 'text-danger'}>
                    {t.direction === 'CREDIT' ? '+' : '-'}{formatNaira(t.amount)}
                  </td>
                  <td>{t.method || '—'}</td>
                  <td>{t.reference || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );

    case 'income':
      return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {data.fees.map((f) => (
            <div key={f.type} className="card p-5">
              <div className="text-dim text-xs uppercase font-semibold">{f.type}</div>
              <div className="text-2xl font-bold mt-2">{formatNaira(f._sum.amount)}</div>
            </div>
          ))}
          <div className="card p-5">
            <div className="text-dim text-xs uppercase font-semibold">Interest booked</div>
            <div className="text-2xl font-bold mt-2">{formatNaira(data.interestBooked)}</div>
          </div>
        </div>
      );

    default:
      return null;
  }
}
