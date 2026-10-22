import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { api } from '../lib/api';
import { EmptyState, Badge, Button } from '../components/ui';
import KycUploads from '../components/KycUploads';

export default function MyProfile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { data: member, isLoading } = useQuery({
    queryKey: ['member', user.memberId],
    queryFn: () => api.get(`/members/${user.memberId}`).then((r) => r.data),
    enabled: !!user.memberId,
  });

  if (isLoading) return <EmptyState text="Loading…" />;
  if (!member) return null;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">{member.firstName} {member.lastName}</h1>
          <div className="text-dim text-sm">{member.memberNo} · {member.user.email}</div>
        </div>
        <Badge status={member.status} />
      </div>

      <KycUploads member={member} />

      <div className="card p-5 flex items-center justify-between">
        <div className="text-sm text-dim">Signed in as {member.user.email}</div>
        <Button variant="ghost" onClick={() => { logout(); navigate('/login'); }}>
          Log out
        </Button>
      </div>
    </div>
  );
}
