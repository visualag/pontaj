'use client';

import { useState, useEffect } from 'react';
import { useAuth } from './AuthProvider';
import GHLSyncButton from './GHLSyncButton';
import { Loader2, Shield, User, X, Trash2 } from 'lucide-react';

interface TeamMember {
    userId: string;
    userName: string;
    email: string;
    role: string;
    isOwner: boolean;
    locationId?: string;
}

export default function TeamManagement() {
    const { user, isOwner, isAdmin } = useAuth();
    const [members, setMembers] = useState<TeamMember[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isAdmin || isOwner) {
            fetchMembers();
        }
    }, [isAdmin, isOwner]);

    const fetchMembers = async () => {
        setLoading(true);
        try {
            // We pass locationId to filter only my team
            // Note: For Agency admins, we might want to see all? 
            // For now, stick to location-based team.
            const locId = user?.locationId || '';
            const res = await fetch(`/api/users?locationId=${locId}`);
            if (res.ok) {
                const data = await res.json();
                setMembers(data);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleRoleChange = async (targetUserId: string, newRole: 'admin' | 'user') => {
        try {
            const res = await fetch(`/api/users/${targetUserId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ role: newRole })
            });

            if (res.ok) {
                setMembers(prev => prev.map(m =>
                    m.userId === targetUserId ? { ...m, role: newRole } : m
                ));
            }
        } catch (e) {
            console.error(e);
            alert('Failed to update role');
        }
    };

    const handleTransferOwnership = async (targetUserId: string) => {
        if (!confirm('Esti sigur? Vei pierde drepturile de Owner si acest utilizator va deveni noul Owner.')) return;

        try {
            const res = await fetch('/api/users/transfer-ownership', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    currentOwnerId: user?.userId,
                    newOwnerId: targetUserId,
                    locationId: user?.locationId
                })
            });

            if (res.ok) {
                alert('Ownership transferat! Se va reincarca pagina.');
                window.location.reload();
            } else {
                alert('Eroare la transfer.');
            }
        } catch (e) {
            console.error(e);
        }
    };

    // if (!isOwner) return null; // Removed to allow viewing by Admins

    return (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow-sm border border-zinc-100 dark:border-zinc-800">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold flex items-center gap-2">
                    <Shield className="w-5 h-5 text-indigo-600" />
                    Administrare Echipa
                </h2>
                <div className="flex gap-2">
                    {isAdmin && (
                        <button
                            onClick={async () => {
                                if (!confirm('Ești sigur că vrei să ștergi TOȚI utilizatorii de tip placeholder (ex: {{user.name}})?')) return;
                                try {
                                    const res = await fetch('/api/users/cleanup', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ locationId: user?.locationId })
                                    });
                                    const data = await res.json();
                                    if (data.success) {
                                        alert(`Am șters ${data.deletedCount} utilizatori invalizi.`);
                                        fetchMembers();
                                    }
                                } catch (e) {
                                    console.error(e);
                                }
                            }}
                            className="flex items-center gap-2 px-3 py-1 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl text-xs font-semibold hover:bg-red-100 dark:hover:bg-red-900/40 transition-all border border-red-100 dark:border-red-800"
                        >
                            <Trash2 className="w-4 h-4" />
                            Curăță Invalizi
                        </button>
                    )}
                    <GHLSyncButton onSyncComplete={fetchMembers} />
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-zinc-100 dark:border-zinc-800 text-left text-zinc-500">
                                <th className="p-3 font-medium">Nume</th>
                                <th className="p-3 font-medium">Email</th>
                                <th className="p-3 font-medium text-center">Rol Actual</th>
                                {isAdmin && <th className="p-3 font-medium text-right">Actiuni</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                            {members.map(member => (
                                <tr key={member.userId} className="group hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                                    <td className="p-3 font-medium flex items-center gap-2">
                                        {member.isOwner && <Shield className="w-3 h-3 text-amber-500 fill-current" />}
                                        {member.userName}
                                        {member.userId === user?.userId && <span className="text-xs text-zinc-400">(Tu)</span>}
                                    </td>
                                    <td className="p-3 text-zinc-500">{member.email}</td>
                                    <td className="p-3 text-center">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${member.isOwner ? 'bg-amber-100 text-amber-700' :
                                            member.role === 'admin' ? 'bg-indigo-100 text-indigo-700' :
                                                'bg-zinc-100 text-zinc-600'
                                            }`}>
                                            {member.isOwner ? 'OWNER' : member.role.toUpperCase()}
                                        </span>
                                    </td>
                                    {isAdmin && (
                                        <td className="p-3 text-right">
                                            {!member.isOwner && (
                                                <div className="flex justify-end gap-2">
                                                    {member.role === 'user' ? (
                                                        <button
                                                            onClick={() => handleRoleChange(member.userId, 'admin')}
                                                            className="px-3 py-1 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded text-xs"
                                                        >
                                                            Fa Admin
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={() => handleRoleChange(member.userId, 'user')}
                                                            className="px-3 py-1 bg-red-50 text-red-600 hover:bg-red-100 rounded text-xs"
                                                        >
                                                            Revoca Admin
                                                        </button>
                                                    )}

                                                    <button
                                                        onClick={() => handleTransferOwnership(member.userId)}
                                                        className="px-3 py-1 border border-zinc-200 hover:bg-zinc-50 rounded text-xs text-zinc-600"
                                                        title="Seteaza ca Singurul Administrator (Owner)"
                                                    >
                                                        Seteaza Owner
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
