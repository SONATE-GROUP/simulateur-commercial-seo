'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const G    = '#1a2e25';
const G3   = '#2d4a3e';
const G4   = '#3a5c4e';
const G5   = '#233d30';
const CREAM  = '#f5f0e8';
const ORANGE = '#e8571a';

interface User {
  id: string;
  email: string;
  name: string;
  isGlobalAdmin: boolean;
  createdAt: string;
  firstLoginAt?: string | null;
  lastLoginAt?: string | null;
  loginCount?: number;
}

interface Invitation {
  id: string;
  email: string;
  workspaceId: string | null;
  workspaceName: string | null;
  workspaceRole: string;
  expiresAt: string;
  acceptedAt: string | null;
  createdAt: string;
  status: 'pending' | 'accepted' | 'expired';
}

interface Workspace {
  id: string;
  name: string;
}

const STATUS_LABEL: Record<string, string> = {
  pending:  'Invitation envoyée',
  accepted: 'Compte activé',
  expired:  'Invitation expirée',
};
const STATUS_COLOR: Record<string, string> = {
  pending:  '#d4a820',
  accepted: '#4caf7d',
  expired:  '#888',
};
const STATUS_BG: Record<string, string> = {
  pending:  '#d4a82022',
  accepted: '#4caf7d22',
  expired:  '#88888822',
};

function fmt(iso: string | null | undefined) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

export default function UsersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [users, setUsers]               = useState<User[]>([]);
  const [invitations, setInvitations]   = useState<Invitation[]>([]);
  const [workspaces, setWorkspaces]     = useState<Workspace[]>([]);
  const [loading, setLoading]           = useState(true);

  // Invite form
  const [inviteEmail, setInviteEmail]       = useState('');
  const [inviteWorkspace, setInviteWorkspace] = useState('');
  const [inviteRole, setInviteRole]         = useState('reader');
  const [sending, setSending]               = useState(false);
  const [inviteMsg, setInviteMsg]           = useState<{ ok: boolean; text: string } | null>(null);

  // Resend state
  const [resending, setResending] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    const [usersRes, invRes, wsRes] = await Promise.all([
      fetch('/api/users').then(r => r.json()),
      fetch('/api/invitations').then(r => r.json()),
      fetch('/api/workspaces').then(r => r.json()),
    ]);
    setUsers(Array.isArray(usersRes) ? usersRes : []);
    setInvitations(Array.isArray(invRes) ? invRes : []);
    setWorkspaces(Array.isArray(wsRes) ? wsRes : []);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (status === 'unauthenticated') { router.push('/login'); return; }
    if (status === 'authenticated') {
      if (!session?.user?.isGlobalAdmin) { router.push('/'); return; }
      loadData();
    }
  }, [status, session, router, loadData]);

  const sendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteMsg(null);
    if (!inviteEmail) return;
    setSending(true);
    const res = await fetch('/api/invitations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: inviteEmail,
        workspaceId: inviteWorkspace || null,
        workspaceRole: inviteRole,
      }),
    });
    const data = await res.json();
    if (res.ok) {
      setInviteMsg({ ok: true, text: `Invitation envoyée à ${inviteEmail}` });
      setInviteEmail('');
      setInviteWorkspace('');
      setInviteRole('reader');
      setInvitations(prev => [data, ...prev]);
    } else {
      setInviteMsg({ ok: false, text: data.error || 'Erreur' });
    }
    setSending(false);
  };

  const resendInvite = async (inv: Invitation) => {
    setResending(inv.id);
    const res = await fetch('/api/invitations/resend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invitationId: inv.id }),
    });
    if (res.ok) {
      setInvitations(prev => prev.map(i =>
        i.id === inv.id
          ? { ...i, status: 'pending', expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() }
          : i
      ));
    }
    setResending(null);
  };

  const toggleAdmin = async (userId: string, current: boolean) => {
    const res = await fetch('/api/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, isGlobalAdmin: !current }),
    });
    if (res.ok) setUsers(prev => prev.map(u => u.id === userId ? { ...u, isGlobalAdmin: !current } : u));
  };

  const deleteUser = async (userId: string, userName: string) => {
    if (!confirm(`Supprimer l'utilisateur "${userName}" ?`)) return;
    const res = await fetch('/api/users', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
    if (res.ok) setUsers(prev => prev.filter(u => u.id !== userId));
  };

  if (status === 'loading' || loading) {
    return (
      <main style={{ minHeight: '100vh', backgroundColor: G, display: 'flex', alignItems: 'center', justifyContent: 'center', color: CREAM, fontFamily: 'Inter, sans-serif' }}>
        Chargement…
      </main>
    );
  }

  const pendingInvites = invitations.filter(i => i.status !== 'accepted');
  const activeUsers    = users;

  return (
    <main style={{ minHeight: '100vh', backgroundColor: G, color: CREAM, fontFamily: 'Inter, sans-serif', padding: '40px 32px' }}>
      <div style={{ maxWidth: 920, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>Utilisateurs</h1>
            <p style={{ color: '#7a9e8e', fontSize: 14 }}>
              {activeUsers.length} compte{activeUsers.length !== 1 ? 's' : ''} actif{activeUsers.length !== 1 ? 's' : ''}
              {pendingInvites.length > 0 && ` · ${pendingInvites.length} invitation${pendingInvites.length > 1 ? 's' : ''} en cours`}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Link href="/workspaces" style={{
              backgroundColor: 'transparent', border: `1px solid ${G3}`,
              borderRadius: 8, padding: '9px 18px', color: CREAM,
              fontSize: 13, fontWeight: 600, textDecoration: 'none',
            }}>
              👥 Espaces clients
            </Link>
            <Link href="/" style={{
              backgroundColor: ORANGE, color: '#fff',
              padding: '9px 18px', borderRadius: 8, fontSize: 13,
              fontWeight: 600, textDecoration: 'none',
            }}>
              ← Simulateur
            </Link>
          </div>
        </div>

        {/* Invite form */}
        <div style={{ backgroundColor: G5, borderRadius: 12, padding: 20, marginBottom: 24, border: `1px solid ${G3}` }}>
          <h2 style={{ fontSize: 13, fontWeight: 700, marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#7a9e8e' }}>
            Inviter un utilisateur par email
          </h2>
          <form onSubmit={sendInvite}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 120px', gap: 10, marginBottom: 10 }}>
              <input
                type="email"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                placeholder="Email du client *"
                required
                style={{ backgroundColor: G3, border: `1px solid ${G4}`, borderRadius: 8, padding: '10px 14px', color: CREAM, fontSize: 14, outline: 'none' }}
              />
              <select
                value={inviteWorkspace}
                onChange={e => setInviteWorkspace(e.target.value)}
                style={{ backgroundColor: G3, border: `1px solid ${G4}`, borderRadius: 8, padding: '10px 14px', color: inviteWorkspace ? CREAM : '#7a9e8e', fontSize: 14, outline: 'none' }}
              >
                <option value="">Aucun espace</option>
                {workspaces.map(ws => (
                  <option key={ws.id} value={ws.id}>{ws.name}</option>
                ))}
              </select>
              <select
                value={inviteRole}
                onChange={e => setInviteRole(e.target.value)}
                style={{ backgroundColor: G3, border: `1px solid ${G4}`, borderRadius: 8, padding: '10px 14px', color: CREAM, fontSize: 14, outline: 'none' }}
              >
                <option value="reader">Lecteur</option>
                <option value="editor">Éditeur</option>
                <option value="owner">Propriétaire</option>
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <button type="submit" disabled={sending} style={{
                backgroundColor: ORANGE, border: 'none', borderRadius: 8,
                padding: '10px 24px', color: 'white', fontSize: 14,
                fontWeight: 700, cursor: sending ? 'not-allowed' : 'pointer',
                opacity: sending ? 0.7 : 1,
              }}>
                {sending ? 'Envoi…' : '↑ Envoyer une invitation'}
              </button>
              {inviteMsg && (
                <span style={{ fontSize: 13, color: inviteMsg.ok ? '#4caf7d' : '#e05050' }}>
                  {inviteMsg.text}
                </span>
              )}
            </div>
          </form>
        </div>

        {/* Invitations list */}
        {invitations.length > 0 && (
          <div style={{ marginBottom: 28 }}>
            <h2 style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#7a9e8e' }}>
              Invitations
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{
                display: 'grid', gridTemplateColumns: '1fr 160px 130px 100px 100px 100px',
                gap: 10, padding: '4px 16px',
                color: '#5a7a6a', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em',
              }}>
                <span>Email</span><span>Espace</span><span>Statut</span><span>Envoyée</span><span>Expire / Activée</span><span></span>
              </div>
              {invitations.map(inv => (
                <div key={inv.id} style={{
                  display: 'grid', gridTemplateColumns: '1fr 160px 130px 100px 100px 100px',
                  gap: 10, alignItems: 'center',
                  backgroundColor: G5, borderRadius: 10, padding: '12px 16px',
                  border: `1px solid ${G3}`,
                }}>
                  <span style={{ fontSize: 13, color: '#7a9e8e' }}>{inv.email}</span>
                  <span style={{ fontSize: 12, color: '#5a7a6a' }}>{inv.workspaceName || '—'}</span>
                  <span>
                    <span style={{
                      backgroundColor: STATUS_BG[inv.status],
                      color: STATUS_COLOR[inv.status],
                      border: `1px solid ${STATUS_COLOR[inv.status]}44`,
                      borderRadius: 6, padding: '3px 8px', fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap',
                    }}>
                      {STATUS_LABEL[inv.status]}
                    </span>
                  </span>
                  <span style={{ fontSize: 11, color: '#5a7a6a' }}>{fmt(inv.createdAt)}</span>
                  <span style={{ fontSize: 11, color: '#5a7a6a' }}>
                    {inv.status === 'accepted' ? fmt(inv.acceptedAt) : fmt(inv.expiresAt)}
                  </span>
                  <div>
                    {inv.status !== 'accepted' && (
                      <button
                        onClick={() => resendInvite(inv)}
                        disabled={resending === inv.id}
                        style={{
                          backgroundColor: 'transparent', border: `1px solid ${G4}`,
                          borderRadius: 6, padding: '4px 10px', color: '#7a9e8e',
                          fontSize: 11, cursor: resending === inv.id ? 'not-allowed' : 'pointer',
                          opacity: resending === inv.id ? 0.6 : 1, whiteSpace: 'nowrap',
                        }}
                      >
                        {resending === inv.id ? '…' : 'Renvoyer'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Active users list */}
        <div>
          <h2 style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#7a9e8e' }}>
            Comptes actifs
          </h2>
          {users.length === 0 ? (
            <div style={{ backgroundColor: G5, borderRadius: 12, padding: '48px 32px', textAlign: 'center', color: '#7a9e8e', fontSize: 15, border: `1px solid ${G3}` }}>
              Aucun utilisateur.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{
                display: 'grid', gridTemplateColumns: '1fr 1fr 130px 100px 100px 100px 80px',
                gap: 10, padding: '4px 16px',
                color: '#5a7a6a', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em',
              }}>
                <span>Nom</span><span>Email</span><span>Rôle</span><span>1re cnx</span><span>Dernière cnx</span><span>Connexions</span><span></span>
              </div>
              {users.map(u => (
                <div key={u.id} style={{
                  display: 'grid', gridTemplateColumns: '1fr 1fr 130px 100px 100px 100px 80px',
                  gap: 10, alignItems: 'center',
                  backgroundColor: G5, borderRadius: 10, padding: '12px 16px',
                  border: `1px solid ${G3}`,
                }}>
                  <span style={{ fontWeight: 600, fontSize: 13 }}>{u.name || <span style={{ color: '#5a7a6a', fontStyle: 'italic' }}>—</span>}</span>
                  <span style={{ color: '#7a9e8e', fontSize: 12 }}>{u.email}</span>
                  <span>
                    {u.id !== session?.user?.id ? (
                      <button
                        onClick={() => toggleAdmin(u.id, u.isGlobalAdmin)}
                        style={{
                          backgroundColor: u.isGlobalAdmin ? ORANGE + '22' : G3,
                          color: u.isGlobalAdmin ? ORANGE : '#7a9e8e',
                          border: `1px solid ${u.isGlobalAdmin ? ORANGE + '44' : G4}`,
                          borderRadius: 6, padding: '3px 10px', fontSize: 11, fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        {u.isGlobalAdmin ? 'Admin' : 'Utilisateur'}
                      </button>
                    ) : (
                      <span style={{ backgroundColor: ORANGE + '22', color: ORANGE, borderRadius: 6, padding: '3px 10px', fontSize: 11, fontWeight: 700 }}>
                        Admin
                      </span>
                    )}
                  </span>
                  <span style={{ fontSize: 11, color: '#5a7a6a' }}>{fmt(u.firstLoginAt)}</span>
                  <span style={{ fontSize: 11, color: u.lastLoginAt ? '#7a9e8e' : '#5a7a6a' }}>{fmt(u.lastLoginAt)}</span>
                  <span style={{ fontSize: 11, color: (u.loginCount ?? 0) > 0 ? '#7a9e8e' : '#5a7a6a', textAlign: 'center' }}>
                    {u.loginCount ?? 0}
                  </span>
                  <div>
                    {u.id !== session?.user?.id && (
                      <button
                        onClick={() => deleteUser(u.id, u.name || u.email)}
                        style={{
                          backgroundColor: 'transparent', border: '1px solid #e05050',
                          borderRadius: 6, padding: '4px 10px', color: '#e05050',
                          fontSize: 11, cursor: 'pointer',
                        }}
                      >
                        Supprimer
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </main>
  );
}
