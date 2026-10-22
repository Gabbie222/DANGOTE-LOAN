import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Button, Field } from '../components/ui';
import { useAuth } from '../lib/AuthContext';

export default function Security() {
  const { user, refreshUser } = useAuth();
  const [setupData, setSetupData] = useState(null);
  const [code, setCode] = useState('');
  const [disableCode, setDisableCode] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const startSetup = useMutation({
    mutationFn: () => api.post('/auth/2fa/setup').then((r) => r.data),
    onSuccess: (data) => { setSetupData(data); setError(''); },
    onError: (e) => setError(e.response?.data?.error || 'Could not start 2FA setup'),
  });

  const confirmSetup = useMutation({
    mutationFn: () => api.post('/auth/2fa/verify', { code }).then((r) => r.data),
    onSuccess: () => {
      setSetupData(null);
      setCode('');
      setMessage('Two-factor authentication is now enabled.');
      refreshUser({ twoFactorEnabled: true });
    },
    onError: (e) => setError(e.response?.data?.error || 'Incorrect code'),
  });

  const disable = useMutation({
    mutationFn: () => api.post('/auth/2fa/disable', { code: disableCode }).then((r) => r.data),
    onSuccess: () => {
      setDisableCode('');
      setMessage('Two-factor authentication has been disabled.');
      refreshUser({ twoFactorEnabled: false });
    },
    onError: (e) => setError(e.response?.data?.error || 'Incorrect code'),
  });

  return (
    <div className="max-w-md space-y-5">
      <h1 className="text-xl font-bold">Security</h1>

      <div className="card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="font-semibold">Two-factor authentication</div>
          <span className={`text-xs font-semibold px-3 py-1 rounded-full card2 ${user.twoFactorEnabled ? 'text-success' : 'text-dim'}`}>
            {user.twoFactorEnabled ? 'Enabled' : 'Disabled'}
          </span>
        </div>

        {message && <div className="text-success text-sm">{message}</div>}
        {error && <div className="text-danger text-sm">{error}</div>}

        {!user.twoFactorEnabled && !setupData && (
          <Button onClick={() => startSetup.mutate()} disabled={startSetup.isPending}>
            {startSetup.isPending ? 'Starting…' : 'Enable 2FA'}
          </Button>
        )}

        {setupData && (
          <div className="space-y-3">
            <div className="text-dim text-sm">Scan this with Google Authenticator, Authy, or any TOTP app:</div>
            <img src={setupData.qrCodeDataUrl} alt="2FA QR code" className="rounded-2xl border border-token" width={200} height={200} />
            <div className="text-dim text-xs break-all">Or enter this key manually: <span className="font-mono">{setupData.secret}</span></div>
            <Field label="Enter the 6-digit code to confirm">
              <input value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" maxLength={6} />
            </Field>
            <Button onClick={() => confirmSetup.mutate()} disabled={code.length !== 6 || confirmSetup.isPending}>
              {confirmSetup.isPending ? 'Confirming…' : 'Confirm & enable'}
            </Button>
          </div>
        )}

        {user.twoFactorEnabled && (
          <div className="space-y-3 pt-2 border-t border-token">
            <div className="text-dim text-sm">Enter a current code to disable 2FA.</div>
            <Field label="Authentication code">
              <input value={disableCode} onChange={(e) => setDisableCode(e.target.value)} inputMode="numeric" maxLength={6} />
            </Field>
            <Button variant="ghost" onClick={() => disable.mutate()} disabled={disableCode.length !== 6 || disable.isPending}>
              {disable.isPending ? 'Disabling…' : 'Disable 2FA'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
