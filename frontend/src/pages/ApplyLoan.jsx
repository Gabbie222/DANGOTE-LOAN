import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api, formatNaira, toKobo } from '../lib/api';
import { Button, Field, EmptyState } from '../components/ui';
import { useAuth } from '../lib/AuthContext';

const TENURE_OPTIONS = [6, 12, 24];

export default function ApplyLoan() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [productId, setProductId] = useState('');
  const [amount, setAmount] = useState(0);
  const [tenure, setTenure] = useState(12);
  const [purpose, setPurpose] = useState('');
  const [guarantorNos, setGuarantorNos] = useState(['', '']);
  const [error, setError] = useState('');

  const { data: products } = useQuery({
    queryKey: ['loan-products'],
    queryFn: () => api.get('/loan-products').then((r) => r.data),
  });
  const product = products?.find((p) => p.id === productId);

  const { data: eligibility } = useQuery({
    queryKey: ['eligibility', productId],
    queryFn: () => api.get('/loans/eligibility', { params: { productId } }).then((r) => r.data),
    enabled: !!productId,
  });

  const apply = useMutation({
    mutationFn: async () => {
      const memberLookups = await Promise.all(
        guarantorNos.filter(Boolean).map((no) => api.get('/members', { params: { q: no } }).then((r) => r.data[0]))
      );
      const guarantorMemberIds = memberLookups.filter(Boolean).map((m) => m.id);
      if (guarantorMemberIds.length < (product?.guarantorsRequired || 0)) {
        throw new Error('Could not resolve all guarantor member numbers');
      }
      return api.post('/loans', {
        productId, amountKobo: toKobo(amount), tenureMonths: tenure, purpose, guarantorMemberIds,
      });
    },
    onSuccess: () => navigate('/my-loans'),
    onError: (e) => setError(e.response?.data?.error || e.message || 'Application failed'),
  });

  const monthlyPreview = () => {
    if (!product || !amount) return null;
    const r = product.rate / 100;
    if (product.method === 'REDUCING') {
      const i = r / 12;
      const factor = Math.pow(1 + i, tenure);
      return i === 0 ? Math.round(toKobo(amount) / tenure) : Math.round((toKobo(amount) * i * factor) / (factor - 1));
    }
    const totalInterest = Math.round(toKobo(amount) * r * (tenure / 12));
    return Math.round((toKobo(amount) + totalInterest) / tenure);
  };

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <h1 className="text-xl font-bold text-center">Apply for a loan</h1>

      {step === 1 && (
        <div className="card p-6 space-y-4">
          <div className="font-semibold">1. Choose a loan product</div>
          {products?.map((p) => (
            <button
              key={p.id}
              onClick={() => { setProductId(p.id); setStep(2); }}
              className={`w-full text-left card2 p-4 border ${productId === p.id ? 'border-2' : 'border-token'}`}
              style={{ borderColor: productId === p.id ? 'var(--accent)' : undefined }}
            >
              <div className="font-semibold">{p.name}</div>
              <div className="text-dim text-sm">{p.rate}% p.a. · up to {formatNaira(p.maxAmount)} · {p.maxTenureMonths} months max</div>
            </button>
          ))}
        </div>
      )}

      {step === 2 && product && (
        <div className="card p-8 text-center space-y-6">
          <div className="font-semibold">2. How much do you need?</div>
          {eligibility && (
            <div className="text-dim text-sm">You can borrow up to <b className="text-accent">{formatNaira(eligibility.maxLoanKobo)}</b></div>
          )}
          <div className="text-5xl font-bold">
            ₦<input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="inline-block w-48 text-5xl font-bold text-center bg-transparent border-0 border-b-2"
              style={{ borderColor: 'var(--accent)' }}
            />
          </div>
          <div className="flex justify-center gap-3">
            <Button variant="ghost" onClick={() => setStep(1)}>Back</Button>
            <Button
              onClick={() => setStep(3)}
              disabled={!amount || (eligibility && toKobo(amount) > eligibility.maxLoanKobo)}
            >
              Continue
            </Button>
          </div>
          {eligibility && !eligibility.eligible && (
            <div className="text-danger text-sm">You are not currently eligible for this product.</div>
          )}
        </div>
      )}

      {step === 3 && product && (
        <div className="card p-6 space-y-4">
          <div className="font-semibold">3. Choose repayment term</div>
          {TENURE_OPTIONS.filter((t) => t <= product.maxTenureMonths).map((t) => (
            <button
              key={t}
              onClick={() => setTenure(t)}
              className={`w-full flex justify-between items-center card2 p-4 border ${tenure === t ? 'border-2' : 'border-token'}`}
              style={{ borderColor: tenure === t ? 'var(--accent)' : undefined }}
            >
              <span className="font-semibold">{t} months</span>
              <span className="text-dim text-sm">{product.rate}% p.a.</span>
            </button>
          ))}
          <Field label="Purpose"><input value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="e.g. school fees" /></Field>
          <div className="card2 p-4 text-sm space-y-1">
            <div className="flex justify-between"><span className="text-dim">Monthly repayment</span><span className="font-semibold">{formatNaira(monthlyPreview())}</span></div>
          </div>
          <div className="flex justify-center gap-3">
            <Button variant="ghost" onClick={() => setStep(2)}>Back</Button>
            <Button onClick={() => setStep(4)}>Continue</Button>
          </div>
        </div>
      )}

      {step === 4 && product && (
        <div className="card p-6 space-y-4">
          <div className="font-semibold">4. Guarantors ({product.guarantorsRequired} required)</div>
          {Array.from({ length: product.guarantorsRequired }).map((_, i) => (
            <Field key={i} label={`Guarantor ${i + 1} — member number`}>
              <input
                value={guarantorNos[i] || ''}
                onChange={(e) => {
                  const next = [...guarantorNos];
                  next[i] = e.target.value;
                  setGuarantorNos(next);
                }}
                placeholder="COOP/2024/0001"
              />
            </Field>
          ))}
          {error && <div className="text-danger text-sm">{error}</div>}
          <div className="flex justify-center gap-3">
            <Button variant="ghost" onClick={() => setStep(3)}>Back</Button>
            <Button onClick={() => apply.mutate()} disabled={apply.isPending}>
              {apply.isPending ? 'Submitting…' : 'Submit application'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
