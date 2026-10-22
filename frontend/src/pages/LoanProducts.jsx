import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, formatNaira, toKobo } from '../lib/api';
import { Button, Field, EmptyState } from '../components/ui';
import { useAuth } from '../lib/AuthContext';

export default function LoanProducts() {
  const { user } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const { data: products, isLoading } = useQuery({
    queryKey: ['loan-products'],
    queryFn: () => api.get('/loan-products').then((r) => r.data),
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Loan products</h1>
        {user.role === 'SUPER_ADMIN' && (
          <Button onClick={() => setShowForm((s) => !s)}>{showForm ? 'Cancel' : '+ New product'}</Button>
        )}
      </div>

      {showForm && <NewProductForm onDone={() => setShowForm(false)} />}

      {isLoading ? (
        <EmptyState text="Loading…" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {products?.map((p) => (
            <div key={p.id} className="card p-5">
              <div className="flex justify-between items-start">
                <div className="font-semibold text-lg">{p.name}</div>
                <span className="card2 px-3 py-1 rounded-full text-xs">{p.method}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-4 text-sm">
                <div><span className="text-dim">Rate</span><div className="font-medium">{p.rate}% p.a.</div></div>
                <div><span className="text-dim">Max tenure</span><div className="font-medium">{p.maxTenureMonths} months</div></div>
                <div><span className="text-dim">Amount range</span><div className="font-medium">{formatNaira(p.minAmount)} – {formatNaira(p.maxAmount)}</div></div>
                <div><span className="text-dim">Savings multiplier</span><div className="font-medium">{p.savingsMultiplier}x</div></div>
                <div><span className="text-dim">Guarantors</span><div className="font-medium">{p.guarantorsRequired}</div></div>
                <div><span className="text-dim">Min membership</span><div className="font-medium">{p.minMembershipMonths} months</div></div>
                <div><span className="text-dim">Processing fee</span><div className="font-medium">{p.processingFeePct}%</div></div>
                <div><span className="text-dim">Late penalty</span><div className="font-medium">{p.penaltyRatePct}%/mo</div></div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function NewProductForm({ onDone }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    name: '', rate: 12, method: 'REDUCING', minAmount: '', maxAmount: '', maxTenureMonths: 12,
    minMembershipMonths: 6, savingsMultiplier: 2, guarantorsRequired: 2, processingFeePct: 1, penaltyRatePct: 2,
  });

  const mutation = useMutation({
    mutationFn: () => api.post('/loan-products', {
      ...form,
      rate: Number(form.rate),
      minAmount: toKobo(form.minAmount),
      maxAmount: toKobo(form.maxAmount),
      maxTenureMonths: Number(form.maxTenureMonths),
      minMembershipMonths: Number(form.minMembershipMonths),
      savingsMultiplier: Number(form.savingsMultiplier),
      guarantorsRequired: Number(form.guarantorsRequired),
      processingFeePct: Number(form.processingFeePct),
      penaltyRatePct: Number(form.penaltyRatePct),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['loan-products'] });
      onDone();
    },
  });

  return (
    <form
      className="card p-5 grid grid-cols-2 md:grid-cols-4 gap-3"
      onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }}
    >
      <Field label="Name"><input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
      <Field label="Method">
        <select value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}>
          <option value="FLAT">Flat rate</option>
          <option value="REDUCING">Reducing balance</option>
        </select>
      </Field>
      <Field label="Annual rate (%)"><input type="number" step="0.1" value={form.rate} onChange={(e) => setForm({ ...form, rate: e.target.value })} /></Field>
      <Field label="Max tenure (months)"><input type="number" value={form.maxTenureMonths} onChange={(e) => setForm({ ...form, maxTenureMonths: e.target.value })} /></Field>
      <Field label="Min amount (₦)"><input type="number" required value={form.minAmount} onChange={(e) => setForm({ ...form, minAmount: e.target.value })} /></Field>
      <Field label="Max amount (₦)"><input type="number" required value={form.maxAmount} onChange={(e) => setForm({ ...form, maxAmount: e.target.value })} /></Field>
      <Field label="Savings multiplier"><input type="number" step="0.1" value={form.savingsMultiplier} onChange={(e) => setForm({ ...form, savingsMultiplier: e.target.value })} /></Field>
      <Field label="Guarantors required"><input type="number" value={form.guarantorsRequired} onChange={(e) => setForm({ ...form, guarantorsRequired: e.target.value })} /></Field>
      <Field label="Min membership (months)"><input type="number" value={form.minMembershipMonths} onChange={(e) => setForm({ ...form, minMembershipMonths: e.target.value })} /></Field>
      <Field label="Processing fee (%)"><input type="number" step="0.1" value={form.processingFeePct} onChange={(e) => setForm({ ...form, processingFeePct: e.target.value })} /></Field>
      <Field label="Late penalty (%/mo)"><input type="number" step="0.1" value={form.penaltyRatePct} onChange={(e) => setForm({ ...form, penaltyRatePct: e.target.value })} /></Field>
      <div className="col-span-2 md:col-span-4">
        <Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? 'Saving…' : 'Create product'}</Button>
      </div>
    </form>
  );
}
