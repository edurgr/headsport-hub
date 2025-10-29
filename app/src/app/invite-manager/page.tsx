'use client';

import { useEffect, useState, useCallback } from 'react';

import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { Invitation } from '@/types';

export default function InviteManagerPage() {
  const { profile, createInvitation, getInvitations, deleteInvitation } = useAuth();
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'manager' | 'athlete'>('athlete');
  const [message, setMessage] = useState('');

  const fetchInvitations = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getInvitations();
      setInvitations(data);
    } catch (err: any) {
      setError(
        err instanceof Error
          ? err.message
          : 'An unexpected error occurred while fetching invitations.',
      );
    } finally {
      setLoading(false);
    }
  }, [getInvitations]);

  useEffect(() => {
    if (profile) {
      fetchInvitations();
    }
  }, [profile, fetchInvitations]);

  const checkExistingInvitation = (email: string) => {
    const existing = invitations.find(
      (inv) =>
        inv.email.toLowerCase() === email.toLowerCase() &&
        inv.status === 'pending' &&
        new Date(inv.expires_at) > new Date(),
    );

    if (existing) {
      setError(
        `An active invitation already exists for ${email}. It expires on ${new Date(existing.expires_at).toLocaleDateString()}.`,
      );
      return true;
    }

    return false;
  };

  const handleCreateInvitation = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      setError('Please enter an email address');
      return;
    }

    // Check if a valid invitation already exists
    if (checkExistingInvitation(email.trim())) {
      return;
    }

    try {
      setError(null);
      setSuccess(null);

      await createInvitation(email.trim(), role, message.trim() || undefined);

      setSuccess(`Invitation sent to ${email} for role: ${role}`);
      setEmail('');
      setMessage('');

      // Refresh invitations list
      await fetchInvitations();
    } catch (err: any) {
      console.error('Invitation creation error:', err);

      // Handle specific errors in a more user-friendly way
      let errorMessage = err.message || 'Failed to create invitation';

      if (err.message?.includes('already exists and is still valid')) {
        errorMessage = err.message;
      } else if (err.message?.includes('has already accepted an invitation')) {
        errorMessage = err.message;
      } else if (err.message?.includes('duplicate key value')) {
        errorMessage = `An invitation for ${email} already exists. Please check the invitations list below.`;
      }

      setError(errorMessage);
    }
  };

  const handleDeleteInvitation = async (invitationId: string) => {
    if (!confirm('Are you sure you want to delete this invitation?')) {
      return;
    }

    try {
      await deleteInvitation(invitationId);
      setSuccess('Invitation deleted successfully');
      await fetchInvitations();
    } catch (err: any) {
      setError(err.message || 'Failed to delete invitation');
    }
  };

  const handleRenewInvitation = async (invitationId: string) => {
    try {
      // Find the current invitation
      const invitation = invitations.find((inv) => inv.id === invitationId);
      if (!invitation) return;

      // Create a new invitation for the same email and role
      await createInvitation(invitation.email, invitation.role);

      setSuccess(`Invitation renewed for ${invitation.email}`);
      await fetchInvitations();
    } catch (err: any) {
      setError(err.message || 'Failed to renew invitation');
    }
  };

  const getInvitationStatus = (invitation: Invitation) => {
    if (invitation.status === 'accepted') {
      return { text: 'Accepted', color: 'bg-green-100 text-green-800 border-green-200' };
    }

    if (invitation.status === 'expired') {
      return { text: 'Expired', color: 'bg-red-100 text-red-800 border-red-200' };
    }

    // Check if it's pending but expired
    if (invitation.status === 'pending' && new Date(invitation.expires_at) < new Date()) {
      return { text: 'Expired', color: 'bg-red-100 text-red-800 border-red-200' };
    }

    return { text: 'Pending', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' };
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'manager':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'athlete':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const copyInvitationLink = (invitation: Invitation) => {
    const link = `${window.location.origin}/accept-invite?token=${invitation.token}`;
    navigator.clipboard.writeText(link);
    setSuccess('Invitation link copied to clipboard!');
  };

  return (
    <ProtectedRoute requiredRole={['admin', 'manager']}>
      <div className="p-6 max-w-6xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Invitation Manager</h1>
              <p className="text-gray-600">
                Send invitations to new users and manage existing invitations
              </p>
            </div>
            <a
              href="/profile-management"
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
              Back to Profile Management
            </a>
          </div>
        </div>

        {/* Create Invitation Form */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Send New Invitation</h2>

          <form onSubmit={handleCreateInvitation} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError(null); // Clear error when changing email
                  }}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="user@example.com"
                  required
                />
                {email &&
                  invitations.find((inv) => inv.email.toLowerCase() === email.toLowerCase()) && (
                    <div className="mt-1 text-xs text-blue-600">
                      ℹ️ An invitation for this email already exists
                    </div>
                  )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as 'manager' | 'athlete')}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={profile?.role === 'manager'}
                >
                  <option value="athlete">Athlete</option>
                  {profile?.role === 'admin' && <option value="manager">Manager</option>}
                </select>
                {profile?.role === 'manager' && (
                  <p className="text-xs text-gray-500 mt-1">Managers can only invite athletes</p>
                )}
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full py-2 px-4 rounded-md text-white font-medium ${
                    loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  {loading ? 'Sending...' : 'Send Invitation'}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Personal Message (Optional)
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Add a personal message to the invitation..."
                rows={3}
              />
            </div>
          </form>

          {/* Information Box */}
          <div className="mt-4 p-4 bg-blue-50 rounded-md border border-blue-200">
            <div className="text-sm text-blue-800">
              <div className="flex items-center mb-2">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span className="font-medium">How Invitations Work</span>
              </div>
              <ul className="text-xs space-y-1 ml-6">
                <li>• An invitation email will be sent to the specified address</li>
                <li>• The user will receive a secure link to complete registration</li>
                <li>• Invitations expire in 7 days for security</li>
                <li>• Check the console for invitation links during development</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
            <div className="flex items-center text-red-800">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
              {error}
            </div>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-md">
            <div className="flex items-center text-green-800">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              {success}
            </div>
          </div>
        )}

        {/* Invitations List */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Invitations</h2>
            <div className="flex items-center justify-between mt-2">
              <p className="text-sm text-gray-600">
                {invitations.length} invitation{invitations.length !== 1 ? 's' : ''} total
              </p>
              <div className="flex space-x-2 text-xs">
                <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full">
                  {
                    invitations.filter(
                      (inv) => inv.status === 'pending' && new Date(inv.expires_at) > new Date(),
                    ).length
                  }{' '}
                  Pending
                </span>
                <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full">
                  {invitations.filter((inv) => inv.status === 'accepted').length} Accepted
                </span>
                <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full">
                  {
                    invitations.filter(
                      (inv) =>
                        inv.status === 'expired' ||
                        (inv.status === 'pending' && new Date(inv.expires_at) < new Date()),
                    ).length
                  }{' '}
                  Expired
                </span>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="p-6 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
              <p className="text-gray-600 mt-2">Loading invitations...</p>
            </div>
          ) : invitations.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              <svg
                className="w-12 h-12 mx-auto mb-4 text-gray-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
              <p className="text-lg font-medium">No invitations yet</p>
              <p className="text-sm">Send your first invitation using the form above</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Expires
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {invitations.map((invitation) => (
                    <tr key={invitation.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{invitation.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getRoleColor(invitation.role)}`}
                        >
                          {invitation.role.charAt(0).toUpperCase() + invitation.role.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getInvitationStatus(invitation).color}`}
                        >
                          {getInvitationStatus(invitation).text}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(invitation.expires_at).toLocaleDateString()}
                        {invitation.status === 'pending' &&
                          new Date(invitation.expires_at) < new Date() && (
                            <div className="text-xs text-red-600 mt-1">Expired</div>
                          )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(invitation.created_at).toLocaleDateString()}
                        <div className="text-xs text-gray-500 mt-1">
                          {invitation.invited_by === profile?.id ? 'You' : 'Admin'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          {invitation.status === 'pending' && (
                            <>
                              <button
                                onClick={() => copyInvitationLink(invitation)}
                                className="text-blue-600 hover:text-blue-900"
                                title="Copy invitation link"
                              >
                                <svg
                                  className="w-4 h-4"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                                  />
                                </svg>
                              </button>
                              <button
                                onClick={() => handleDeleteInvitation(invitation.id)}
                                className="text-red-600 hover:text-red-900"
                                title="Delete invitation"
                              >
                                <svg
                                  className="w-4 h-4"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                  />
                                </svg>
                              </button>
                            </>
                          )}
                          {invitation.status === 'accepted' && (
                            <span className="text-green-600 text-xs">✓ Accepted</span>
                          )}
                          {invitation.status === 'expired' && (
                            <button
                              onClick={() => handleRenewInvitation(invitation.id)}
                              className="text-blue-600 hover:text-blue-900"
                              title="Renew expired invitation"
                            >
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                />
                              </svg>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Help Information */}
        <div className="mt-8 p-6 bg-blue-50 rounded-lg border border-blue-200">
          <div className="text-blue-800">
            <h3 className="text-lg font-medium mb-3 flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              How Invitations Work
            </h3>
            <div className="text-sm space-y-2">
              <p>
                <strong>Pending:</strong> Invitation sent, waiting for user to accept
              </p>
              <p>
                <strong>Accepted:</strong> User has completed registration
              </p>
              <p>
                <strong>Expired:</strong> Invitation has expired (7 days)
              </p>
              <p>
                <strong>Role Assignment:</strong> Users cannot change their assigned role during
                registration
              </p>
              <p>
                <strong>Security:</strong> Each invitation has a unique token and expires
                automatically
              </p>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
