'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';

const G    = '#1a2e25';
const G3   = '#2d4a3e';
const G4   = '#3a5c4e';
const G5   = '#233d30';
const CREAM  = '#f5f0e8';
const ORANGE = '#e8571a';

const ROLE_LABEL: Record<string, string> = {
  owner:  'Propriétaire',
  editor: 'Éditeur',
  reader: 'Lecteur',
};

interface Member {
  id: string;
  email: string;
  name: string | null;
  role: string;
}

interface Workspace {
  id: string;
  name: string;
}

interface User {
  id: string;
  email: string;
  name: string;
}

export default function WorkspaceDetailPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const workspaceId = params.id;

  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [addUserId, setAddUserId] = useState('');
  const [addRole, setAddRole] = useState<'owner' | 'editor' | 'reader'>('reader');
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState('');
  const [loading, setLoading] = useState(true);
  const [renaming, setRenaming] = useState(false);
  const [newName, setNewName] = useState('');

  const loadMembers = useCallback(() => {
    fetch(`/api/workspaces/${workspaceId}/members`)
      .then(r => r.json())
      .then(data => { setMembers(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [workspaceId]);

  useEffect(() => {
    if (status === 'unauthenticated') { router.push('/login'); return; }
    if (status === 'authenticated') {
      fetch(`/api/workspaces/${workspaceId}`)
        .then(r => r.json())
        .then(data => { setWorkspace(data); setNewName(data.name || ''); });
      loadMembers();
      if (session?.user?.isGlobalAdmin) {
        fetch('/api/users')
          .then(r => r.json())
          .then(data => setAllUsers(Array.isArray(data) ? data : []));
      }
    }
  }, [status, router, workspaceId, session, loadMembers]);

  const currentUserRole = members.find(m => m.id === session?.user?.id)?.role;
  const canManage = session?.user?.isGlobalAdmin || currentUserRole === 'owner';

  const addMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addUserId) return;
    setAdding(true);
    setAddError('');
    const res = await fetch(`/api/workspaces/${workspaceId}/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: addUserId, memberRole: addRole }),
    });
    if (res.ok) {
      setAddUserId('');
      loadMembers();
    } else {
      const data = await res.json();
      setAddError(data.error || 'Erreur');
    }
    setAdding(false);
  };

  const changeRole = async (userId: string, memberRole: string) => {
    await fetch(`/api/workspaces/${workspaceId}/members`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, memberRole }),
    });
    loadMembers();
  };

  const removeMember = async (userId: string) => {
    await fetch(`/api/workspaces/${workspaceId}/members`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
    loadMembers();
  };

  const renameWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setRenaming(true);
    const res = await fetch(`/api/workspaces/${workspaceId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim() }),
    });
    if (res.ok) setWorkspace(w => w ? { ...w, name: newName.trim() } : w);
    setRenaming(false);
  };

  const nonMembers = allUsers.filter(u => !members.find(m => m.id === u.id));

  if (status === 'loading' || loading) {
    return (
      <main style={{ minHeight: '100vh', backgroundColor: G, display: 'flex', alignItems: 'center', justifyContent: 'center', color: CREAM, fontFamily: 'Inter, sans-serif' }}>
        Chargement…
      </main>
    );
  }

  return (
    <main style={{ minHeight: '100vh', backgroundColor: G, color: CREAM, fontFamily: 'Inter, sans-serif', padding: '40px 32px' }}>
      <div style={{ maxWidth: 700, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>{workspace?.name ?? 'Espace client'}</h1>
            <p style={{ color: '#7a9e8e', fontSize: 14 }}>{members.length} membre{members.length !== 1 ? 's' : ''}</p>
          </div>
          <Link href="/workspaces" style={{
            backgroundColor: 'transparent', border: `1px solid ${G3}`,
            borderRadius: 8, padding: '9px 18px', color: CREAM,
            fontSize: 13, fontWeight: 600, textDecoration: 'none',
          }}>
            ← Espaces clients
          </Link>
        </div>

        {/* Rename form (owner / global admin) */}
        {canManage && (
          <div style={{ backgroundColor: G5, borderRadius: 12, padding: 20, marginBottom: 16, border: `1px solid ${G3}` }}>
            <h2 style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#7a9e8e' }}>
              Renommer l&apos;espace
            </h2>
            <form onSubmit={renameWorkspace} style={{ display: 'flex', gap: 10 }}>
              <input
                value={newName}
                onChange={e => setNewName(e.target.value)}
                style={{
                  flex: 1, backgroundColor: G3, border: `1px solid ${G4}`,
                  borderRadius: 8, padding: '10px 14px', color: CREAM,
                  fontSize: 14, outline: 'none',
                }}
              />
              <button type="submit" disabled={renaming || !newName.trim()} style={{
                backgroundColor: G4, border: 'none', borderRadius: 8,
                padding: '10px 20px', color: CREAM, fontSize: 14,
                fontWeight: 600, cursor: renaming ? 'not-allowed' : 'pointer',
                opacity: renaming ? 0.7 : 1,
              }}>
                {renaming ? '…' : 'Renommer'}
              </button>
            </form>
          </div>
        )}

        {/* Add member form */}
        {canManage && (
          <div style={{ backgroundColor: G5, borderRadius: 12, padding: 20, marginBottom: 24, border: `1px solid ${G3}` }}>
            <h2 style={{ fontSize: 13, fontWeight: 700, marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#7a9e8e' }}>
              Ajouter un membre
            </h2>
            <form onSubmit={addMember} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', flexDirection: 'column' }}>
              <div style={{ display: 'flex', gap: 10, width: '100%' }}>
                <select
                  value={addUserId}
                  onChange={e => setAddUserId(e.target.value)}
                  style={{
                    flex: 1, backgroundColor: G3, border: `1px solid ${G4}`, borderRadius: 8,
                    padding: '10px 12px', color: addUserId ? CREAM : '#5a7a6a', fontSize: 14, outline: 'none',
                  }}
                >
                  <option value="">Sélectionner un utilisateur…</option>
                  {nonMembers.map(u => (
                    <option key={u.id} value={u.id}>{u.name ? `${u.name} (${u.email})` : u.email}</option>
                  ))}
                </select>
                <select
                  value={addRole}
                  onChange={e => setAddRole(e.target.value as 'owner' | 'editor' | 'reader')}
                  style={{
                    backgroundColor: G3, border: `1px solid ${G4}`, borderRadius: 8,
                    padding: '10px 12px', color: CREAM, fontSize: 14, outline: 'none',
                  }}
                >
                  <option value="reader">Lecteur</option>
                  <option value="editor">Éditeur</option>
                  <option value="owner">Propriétaire</option>
                </select>
                <button type="submit" disabled={adding || !addUserId} style={{
                  backgroundColor: ORANGE, border: 'none', borderRadius: 8,
                  padding: '10px 20px', color: 'white', fontSize: 14,
                  fontWeight: 700, cursor: (adding || !addUserId) ? 'not-allowed' : 'pointer',
                  opacity: (adding || !addUserId) ? 0.7 : 1, whiteSpace: 'nowrap',
                }}>
                  {adding ? '…' : 'Ajouter'}
                </button>
              </div>
              {addError && <div style={{ color: '#e05050', fontSize: 13 }}>{addError}</div>}
            </form>
          </div>
        )}

        {/* Members list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {members.map(m => (
            <div key={m.id} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              backgroundColor: G5, borderRadius: 10, padding: '14px 18px',
              border: `1px solid ${G3}`,
            }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{m.name || m.email}</div>
                {m.name && <div style={{ color: '#7a9e8e', fontSize: 12, marginTop: 2 }}>{m.email}</div>}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {canManage && m.id !== session?.user?.id ? (
                  <select
                    value={m.role}
                    onChange={e => changeRole(m.id, e.target.value)}
                    style={{
                      backgroundColor: G3, border: `1px solid ${G4}`, borderRadius: 6,
                      padding: '4px 10px', color: CREAM, fontSize: 12, outline: 'none',
                    }}
                  >
                    <option value="reader">Lecteur</option>
                    <option value="editor">Éditeur</option>
                    <option value="owner">Propriétaire</option>
                  </select>
                ) : (
                  <span style={{
                    backgroundColor: m.role === 'owner' ? ORANGE + '22' : G3,
                    color: m.role === 'owner' ? ORANGE : '#7a9e8e',
                    borderRadius: 6, padding: '3px 10px', fontSize: 11, fontWeight: 700,
                  }}>
                    {ROLE_LABEL[m.role] ?? m.role}
                  </span>
                )}
                {canManage && m.id !== session?.user?.id && (
                  <button
                    onClick={() => removeMember(m.id)}
                    style={{
                      backgroundColor: 'transparent', border: '1px solid #e05050',
                      borderRadius: 6, padding: '4px 10px', color: '#e05050',
                      fontSize: 12, cursor: 'pointer',
                    }}
                  >
                    Retirer
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
