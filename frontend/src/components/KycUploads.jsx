import { useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Button, Field } from './ui';

const API_ORIGIN = 'http://localhost:4000';
const DOC_TYPES = ['ID_CARD', 'UTILITY_BILL', 'PAYSLIP', 'OTHER'];

export default function KycUploads({ member }) {
  const qc = useQueryClient();
  const photoInputRef = useRef(null);
  const [docType, setDocType] = useState(DOC_TYPES[0]);
  const [error, setError] = useState('');

  const invalidate = () => qc.invalidateQueries({ queryKey: ['member', member.id] });

  const uploadPhoto = useMutation({
    mutationFn: (file) => {
      const form = new FormData();
      form.append('file', file);
      return api.post(`/members/${member.id}/photo`, form);
    },
    onSuccess: invalidate,
    onError: (e) => setError(e.response?.data?.error || 'Photo upload failed'),
  });

  const uploadDoc = useMutation({
    mutationFn: (file) => {
      const form = new FormData();
      form.append('file', file);
      form.append('type', docType);
      return api.post(`/members/${member.id}/documents/upload`, form);
    },
    onSuccess: invalidate,
    onError: (e) => setError(e.response?.data?.error || 'Document upload failed'),
  });

  const deleteDoc = useMutation({
    mutationFn: (docId) => api.delete(`/members/${member.id}/documents/${docId}`),
    onSuccess: invalidate,
  });

  function onPickPhoto(e) {
    const file = e.target.files?.[0];
    if (file) { setError(''); uploadPhoto.mutate(file); }
    e.target.value = '';
  }

  function onPickDoc(e) {
    const file = e.target.files?.[0];
    if (file) { setError(''); uploadDoc.mutate(file); }
    e.target.value = '';
  }

  return (
    <div className="card p-5 space-y-5">
      <div className="font-semibold">KYC documents & photo</div>

      <div className="flex items-center gap-4">
        <div
          className="w-20 h-20 rounded-full card2 flex items-center justify-center overflow-hidden text-dim text-xs shrink-0"
          style={{ backgroundImage: member.passportUrl ? `url(${API_ORIGIN}${member.passportUrl})` : undefined, backgroundSize: 'cover', backgroundPosition: 'center' }}
        >
          {!member.passportUrl && 'No photo'}
        </div>
        <div>
          <input ref={photoInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={onPickPhoto} />
          <Button variant="ghost" onClick={() => photoInputRef.current?.click()} disabled={uploadPhoto.isPending}>
            {uploadPhoto.isPending ? 'Uploading…' : 'Upload passport photo'}
          </Button>
        </div>
      </div>

      <div className="flex items-end gap-2 flex-wrap">
        <Field label="Document type">
          <select value={docType} onChange={(e) => setDocType(e.target.value)}>
            {DOC_TYPES.map((t) => <option key={t} value={t}>{t.replaceAll('_', ' ')}</option>)}
          </select>
        </Field>
        <label className="btn-pill px-5 py-2.5 text-sm cursor-pointer inline-block">
          {uploadDoc.isPending ? 'Uploading…' : 'Upload document'}
          <input type="file" accept="image/png,image/jpeg,image/webp,application/pdf" className="hidden" onChange={onPickDoc} disabled={uploadDoc.isPending} />
        </label>
      </div>
      <div className="text-dim text-xs">JPG, PNG, WEBP or PDF, up to 5MB.</div>

      {error && <div className="text-danger text-sm">{error}</div>}

      <div className="space-y-2">
        {(member.documents || []).length === 0 ? (
          <div className="text-dim text-sm">No documents uploaded yet.</div>
        ) : (
          member.documents.map((d) => (
            <div key={d.id} className="flex items-center justify-between text-sm card2 px-4 py-2 rounded-2xl">
              <a href={`${API_ORIGIN}${d.fileUrl}`} target="_blank" rel="noreferrer" className="text-accent font-medium">
                {d.type.replaceAll('_', ' ')}
              </a>
              <button className="text-danger text-xs font-semibold" onClick={() => deleteDoc.mutate(d.id)}>
                Remove
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
