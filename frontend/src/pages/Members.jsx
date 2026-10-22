import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api, formatNaira } from '../lib/api';
import { Button, Field, EmptyState, Badge } from '../components/ui';

export default function Members() {
  const [q, setQ] = useState('');
  const [showForm, setShowForm] = useState(false);
  const { data: members, isLoading } = useQuery({
    queryKey: ['members', q],
    queryFn: () => api.get('/members', { params: { q } }).then((r) => r.data),
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-bold">Members</h1>
        <div className="flex gap-2">
          <input placeholder="Search name, member no, phone…" value={q} onChange={(e) => setQ(e.target.value)} className="w-64" />
          <Button onClick={() => setShowForm((s) => !s)}>{showForm ? 'Cancel' : '+ New member'}</Button>
        </div>
      </div>

      {showForm && <NewMemberForm onDone={() => setShowForm(false)} />}

      {isLoading ? (
        <EmptyState text="Loading members…" />
      ) : members?.length === 0 ? (
        <EmptyState text="No members found." />
      ) : (
        <div className="card overflow-x-auto">
          <table>
            <thead>
              <tr>
                <th>Member No</th><th>Name</th><th>Phone</th><th>Savings</th><th>Status</th><th></th>
              </tr>
            </thead>
            <tbody>
              {members?.map((m) => {
                const savings = m.savingsAccounts.reduce((s, a) => s + a.balance, 0);
                return (
                  <tr key={m.id}>
                    <td>{m.memberNo}</td>
                    <td>{m.firstName} {m.lastName}</td>
                    <td>{m.phone || '—'}</td>
                    <td>{formatNaira(savings)}</td>
                    <td><Badge status={m.status} /></td>
                    <td><Link to={`/members/${m.id}`} className="text-accent text-sm font-semibold">View →</Link></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function NewMemberForm({ onDone }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    email: '', password: '', firstName: '', lastName: '', phone: '', employer: '',
  });
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: () => api.post('/members', form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['members'] });
      onDone();
    },
    onError: (e) => setError(e.response?.data?.error?.formErrors?.join(', ') || e.response?.data?.error || 'Failed to create member'),
  });

  return (
    <form
      className="card p-5 grid grid-cols-1 md:grid-cols-3 gap-3"
      onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }}
    >
      <Field label="First name"><input required value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} /></Field>
      <Field label="Last name"><input required value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} /></Field>
      <Field label="Phone"><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
      <Field label="Email"><input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
      <Field label="Temporary password"><input required type="text" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></Field>
      <Field label="Employer"><input value={form.employer} onChange={(e) => setForm({ ...form, employer: e.target.value })} /></Field>
      {error && <div className="text-danger text-sm md:col-span-3">{error}</div>}
      <div className="md:col-span-3">
        <Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? 'Creating…' : 'Create member'}</Button>
      </div>
    </form>
  );
}
