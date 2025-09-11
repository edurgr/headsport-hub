'use client';

import { useCallback, useEffect, useState, useRef } from 'react';

import {
  AlertTriangle,
  CheckCircle,
  Clock,
  FileImage,
  Filter,
  Flag,
  History,
  Settings,
  XCircle,
} from 'lucide-react';

import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch';

interface ModerationQueueItem {
  id: string;
  file_id: string;
  priority: number;
  auto_flagged: boolean;
  flagged_reasons: string[];
  assigned_to?: string;
  created_at: string;
  file?: {
    id: string;
    filename: string;
    file_type: string;
    file_size: number;
    created_at: string;
    upload_sessions?: {
      profiles?: {
        name: string;
        email: string;
      };
    };
  };
}

interface ModerationStats {
  total_files: number;
  pending_files: number;
  approved_files: number;
  rejected_files: number;
  flagged_files: number;
  queue_size: number;
  avg_moderation_time_minutes: number;
}

export default function ContentModerationPage() {
  const { profile } = useAuth();
  const { authenticatedFetch } = useAuthenticatedFetch();
  const [activeTab, setActiveTab] = useState<'queue' | 'stats' | 'rules' | 'history'>('queue');
  const [queueItems, setQueueItems] = useState<ModerationQueueItem[]>([]);
  const [stats, setStats] = useState<ModerationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [showModerationModal, setShowModerationModal] = useState(false);
  const [moderationAction, setModerationAction] = useState<'approve' | 'reject' | 'flag'>(
    'approve',
  );
  const [moderationReason, setModerationReason] = useState('');
  const [moderationNotes, setModerationNotes] = useState('');
  const [isRequestInProgress, setIsRequestInProgress] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(async () => {
    // Prevent multiple simultaneous requests
    if (isRequestInProgress) return;
    
    try {
      setIsRequestInProgress(true);
      setLoading(true);
      
      // Cancel previous request if it exists
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      
      // Create new abort controller for this request
      abortControllerRef.current = new AbortController();

      if (activeTab === 'queue') {
        const response = await authenticatedFetch('/api/admin/content-moderation?action=queue', {
          signal: abortControllerRef.current.signal,
        });
        
        // Check if request was aborted
        if (abortControllerRef.current.signal.aborted) return;
        
        const data = await response.json();

        if (response.ok) {
          setQueueItems(data.items || []);
        } else {
          setError(data.error || 'Failed to fetch moderation queue');
        }
      } else if (activeTab === 'stats') {
        const response = await authenticatedFetch('/api/admin/content-moderation?action=stats', {
          signal: abortControllerRef.current.signal,
        });
        
        // Check if request was aborted
        if (abortControllerRef.current.signal.aborted) return;
        
        const data = await response.json();

        if (response.ok) {
          setStats(data);
        } else {
          setError(data.error || 'Failed to fetch moderation stats');
        }
      }
    } catch (error: any) {
      // Don't show error if request was aborted
      if (error.name !== 'AbortError') {
        setError('Error fetching data');
      }
    } finally {
      setLoading(false);
      setIsRequestInProgress(false);
    }
  }, [activeTab, authenticatedFetch, isRequestInProgress]);

  // Initial load when profile is available
  useEffect(() => {
    if (profile?.role === 'admin') {
      fetchData();
    }
  }, [profile?.role]); // Only depend on role, not the entire profile object

  // Fetch data when tab changes
  useEffect(() => {
    if (profile?.role === 'admin') {
      fetchData();
    }
  }, [activeTab]); // Only depend on activeTab, not fetchData

  // Cleanup abort controller on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const handleModerateContent = async (
    fileId: string,
    action: 'approve' | 'reject' | 'flag',
    reason?: string,
    notes?: string,
  ) => {
    // Prevent multiple simultaneous moderation requests
    if (isRequestInProgress) return;
    
    try {
      setIsRequestInProgress(true);
      
      const response = await authenticatedFetch('/api/admin/content-moderation', {
        method: 'POST',
        body: JSON.stringify({
          action: 'moderate',
          file_id: fileId,
          moderation_action: action,
          reason,
          notes,
        }),
      });

      if (response.ok) {
        setSuccess(`Content ${action}d successfully`);
        fetchData();
      } else {
        const data = await response.json();
        setError(data.error || `Failed to ${action} content`);
      }
    } catch (err) {
      setError(`Error ${action}ing content`);
    } finally {
      setIsRequestInProgress(false);
    }
  };

  const handleBulkModerate = async () => {
    if (selectedItems.length === 0) {
      setError('Please select items to moderate');
      return;
    }

    // Prevent multiple simultaneous bulk moderation requests
    if (isRequestInProgress) return;

    try {
      setIsRequestInProgress(true);
      
      const response = await authenticatedFetch('/api/admin/content-moderation', {
        method: 'POST',
        body: JSON.stringify({
          action: 'bulk_moderate',
          file_ids: selectedItems,
          moderation_action: moderationAction,
          reason: moderationReason,
          notes: moderationNotes,
        }),
      });

      if (response.ok) {
        setSuccess(`Bulk ${moderationAction} completed successfully`);
        setSelectedItems([]);
        setShowModerationModal(false);
        fetchData();
      } else {
        const data = await response.json();
        setError(data.error || `Failed to bulk ${moderationAction} content`);
      }
    } catch (err) {
      setError(`Error bulk ${moderationAction}ing content`);
    } finally {
      setIsRequestInProgress(false);
    }
  };

  // Colors handled via badge tokens now

  const getPriorityLabel = (priority: number) => {
    switch (priority) {
      case 4:
        return 'Critical';
      case 3:
        return 'High';
      case 2:
        return 'Medium';
      default:
        return 'Low';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (!profile || profile.role !== 'admin') {
    return (
      <div className="p-6">
        <div className="alert alert-error text-center">
          <h1 className="text-2xl font-bold text-[hsl(var(--foreground))] mb-2">Access Denied</h1>
          <p>Only administrators can access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <ProtectedRoute requiredRole={['admin']}>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[hsl(var(--foreground))] mb-2">
            Content Moderation
          </h1>
          <p className="text-[hsl(var(--muted))]">Review and moderate uploaded content</p>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <div className="border-b" style={{ borderColor: 'hsl(var(--border))' }}>
            <nav className="-mb-px flex space-x-8">
              {[
                { id: 'queue', label: 'Moderation Queue', icon: Clock },
                { id: 'stats', label: 'Statistics', icon: FileImage },
                { id: 'rules', label: 'Rules', icon: Settings },
                { id: 'history', label: 'History', icon: History },
              ].map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm ${
                      activeTab === tab.id
                        ? 'text-[hsl(var(--info))]'
                        : 'text-[hsl(var(--muted))] hover:opacity-80'
                    }`}
                    style={{
                      borderColor: activeTab === tab.id ? 'hsl(var(--info))' : 'transparent',
                    }}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="mb-6 alert alert-error">
            <div className="flex items-center">
              <AlertTriangle className="w-5 h-5 mr-2" />
              {error}
            </div>
          </div>
        )}

        {success && (
          <div className="mb-6 alert alert-success">
            <div className="flex items-center">
              <CheckCircle className="w-5 h-5 mr-2" />
              {success}
            </div>
          </div>
        )}

        {/* Content */}
        {activeTab === 'queue' && (
          <div>
            {/* Bulk Actions */}
            {selectedItems.length > 0 && (
              <div className="mb-6 card p-4">
                <div className="flex items-center justify-between">
                  <span className="text-[hsl(var(--info))]">
                    {selectedItems.length} item{selectedItems.length !== 1 ? 's' : ''} selected
                  </span>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => {
                        setModerationAction('approve');
                        setShowModerationModal(true);
                      }}
                      className="btn-approve px-3 py-1 text-sm"
                    >
                      Approve All
                    </button>
                    <button
                      onClick={() => {
                        setModerationAction('reject');
                        setShowModerationModal(true);
                      }}
                      className="btn-reject px-3 py-1 text-sm"
                    >
                      Reject All
                    </button>
                    <button onClick={() => setSelectedItems([])} className="btn px-3 py-1 text-sm">
                      Clear Selection
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Queue Items */}
            <div className="card p-0">
              <div className="px-6 py-4" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                <h2 className="text-xl font-semibold text-[hsl(var(--foreground))]">
                  Moderation Queue ({queueItems.length})
                </h2>
              </div>

              {loading ? (
                <div className="p-6 text-center">
                  <div
                    className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto"
                    style={{ borderColor: 'hsl(var(--info))' }}
                  ></div>
                  <p className="text-[hsl(var(--muted))] mt-2">Loading moderation queue...</p>
                </div>
              ) : queueItems.length === 0 ? (
                <div className="p-6 text-center text-[hsl(var(--muted))]">
                  <Clock
                    className="w-12 h-12 mx-auto mb-4"
                    style={{ color: 'hsl(var(--muted))' }}
                  />
                  <p className="text-lg font-medium">No items in moderation queue</p>
                  <p className="text-sm">All content has been reviewed</p>
                </div>
              ) : (
                <div className="divide-y" style={{ borderColor: 'hsl(var(--border))' }}>
                  {queueItems.map((item) => (
                    <div key={item.id} className="p-6 hover:opacity-95">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-4">
                          <input
                            type="checkbox"
                            checked={selectedItems.includes(item.file_id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedItems([...selectedItems, item.file_id]);
                              } else {
                                setSelectedItems(selectedItems.filter((id) => id !== item.file_id));
                              }
                            }}
                            className="mt-1 h-4 w-4 border rounded"
                            style={{ accentColor: 'hsl(var(--foreground))' }}
                          />
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <h3 className="text-lg font-medium text-[hsl(var(--foreground))]">
                                {item.file?.filename || 'Unknown File'}
                              </h3>
                              <span
                                className={`badge ${item.priority >= 4 ? 'badge-error' : item.priority === 3 ? 'badge-warning' : item.priority === 2 ? 'badge-warning' : 'badge-neutral'}`}
                              >
                                {getPriorityLabel(item.priority)}
                              </span>
                              {item.auto_flagged && (
                                <span className="badge badge-warning">Auto-flagged</span>
                              )}
                            </div>

                            <div className="text-sm text-[hsl(var(--muted))] space-y-1">
                              <p>
                                <strong>Type:</strong> {item.file?.file_type || 'Unknown'}
                              </p>
                              <p>
                                <strong>Size:</strong>{' '}
                                {item.file?.file_size
                                  ? formatFileSize(item.file.file_size)
                                  : 'Unknown'}
                              </p>
                              <p>
                                <strong>Uploaded by:</strong>{' '}
                                {item.file?.upload_sessions?.profiles?.name || 'Unknown User'}
                              </p>
                              <p>
                                <strong>Uploaded:</strong>{' '}
                                {item.file?.created_at
                                  ? new Date(item.file.created_at).toLocaleString()
                                  : 'Unknown'}
                              </p>
                              {item.flagged_reasons.length > 0 && (
                                <p>
                                  <strong>Flagged reasons:</strong>{' '}
                                  {item.flagged_reasons.join(', ')}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleModerateContent(item.file_id, 'approve')}
                            className="hover:opacity-80"
                            style={{ color: 'hsl(var(--success))' }}
                            title="Approve"
                          >
                            <CheckCircle className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleModerateContent(item.file_id, 'reject')}
                            className="hover:opacity-80"
                            style={{ color: 'hsl(var(--error))' }}
                            title="Reject"
                          >
                            <XCircle className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleModerateContent(item.file_id, 'flag')}
                            className="hover:opacity-80"
                            style={{ color: 'hsl(var(--warning))' }}
                            title="Flag"
                          >
                            <Flag className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'stats' && stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="card p-6">
              <div className="flex items-center">
                <div
                  className="p-3 rounded-full"
                  style={{ backgroundColor: 'hsl(var(--border))', color: 'hsl(var(--info))' }}
                >
                  <FileImage className="w-6 h-6" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-[hsl(var(--muted))]">Total Files</p>
                  <p className="text-2xl font-bold text-[hsl(var(--foreground))]">
                    {stats.total_files}
                  </p>
                </div>
              </div>
            </div>

            <div className="card p-6">
              <div className="flex items-center">
                <div
                  className="p-3 rounded-full"
                  style={{ backgroundColor: 'hsl(var(--border))', color: 'hsl(var(--warning))' }}
                >
                  <Clock className="w-6 h-6" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-[hsl(var(--muted))]">Pending</p>
                  <p className="text-2xl font-bold text-[hsl(var(--foreground))]">
                    {stats.pending_files}
                  </p>
                </div>
              </div>
            </div>

            <div className="card p-6">
              <div className="flex items-center">
                <div
                  className="p-3 rounded-full"
                  style={{ backgroundColor: 'hsl(var(--border))', color: 'hsl(var(--success))' }}
                >
                  <CheckCircle className="w-6 h-6" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-[hsl(var(--muted))]">Approved</p>
                  <p className="text-2xl font-bold text-[hsl(var(--foreground))]">
                    {stats.approved_files}
                  </p>
                </div>
              </div>
            </div>

            <div className="card p-6">
              <div className="flex items-center">
                <div
                  className="p-3 rounded-full"
                  style={{ backgroundColor: 'hsl(var(--border))', color: 'hsl(var(--error))' }}
                >
                  <XCircle className="w-6 h-6" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-[hsl(var(--muted))]">Rejected</p>
                  <p className="text-2xl font-bold text-[hsl(var(--foreground))]">
                    {stats.rejected_files}
                  </p>
                </div>
              </div>
            </div>

            <div className="card p-6">
              <div className="flex items-center">
                <div
                  className="p-3 rounded-full"
                  style={{ backgroundColor: 'hsl(var(--border))', color: 'hsl(var(--warning))' }}
                >
                  <Flag className="w-6 h-6" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-[hsl(var(--muted))]">Flagged</p>
                  <p className="text-2xl font-bold text-[hsl(var(--foreground))]">
                    {stats.flagged_files}
                  </p>
                </div>
              </div>
            </div>

            <div className="card p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-full" style={{ backgroundColor: 'hsl(var(--border))' }}>
                  <Filter className="w-6 h-6" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-[hsl(var(--muted))]">Queue Size</p>
                  <p className="text-2xl font-bold text-[hsl(var(--foreground))]">
                    {stats.queue_size}
                  </p>
                </div>
              </div>
            </div>

            <div className="card p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-full" style={{ backgroundColor: 'hsl(var(--border))' }}>
                  <Clock className="w-6 h-6" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-[hsl(var(--muted))]">Avg. Time</p>
                  <p className="text-2xl font-bold text-[hsl(var(--foreground))]">
                    {stats.avg_moderation_time_minutes.toFixed(1)}m
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Moderation Modal */}
        {showModerationModal && (
          <div className="fixed inset-0 bg-[hsl(var(--foreground))] bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div
              className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md"
              style={{
                backgroundColor: 'hsl(var(--secondary))',
                borderColor: 'hsl(var(--border))',
              }}
            >
              <div className="mt-3">
                <h3 className="text-lg font-medium text-[hsl(var(--foreground))] mb-4">
                  Bulk {moderationAction === 'approve' ? 'Approve' : 'Reject'} Content
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-[hsl(var(--muted))] mb-1">
                      Reason (Optional)
                    </label>
                    <input
                      type="text"
                      value={moderationReason}
                      onChange={(e) => setModerationReason(e.target.value)}
                      className="input"
                      placeholder="Enter reason for moderation action"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[hsl(var(--muted))] mb-1">
                      Notes (Optional)
                    </label>
                    <textarea
                      value={moderationNotes}
                      onChange={(e) => setModerationNotes(e.target.value)}
                      className="input"
                      rows={3}
                      placeholder="Additional notes"
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                  <button onClick={() => setShowModerationModal(false)} className="btn px-4 py-2">
                    Cancel
                  </button>
                  <button
                    onClick={handleBulkModerate}
                    className={`px-4 py-2 rounded-md ${moderationAction === 'approve' ? 'btn-approve' : 'btn-reject'}`}
                  >
                    {moderationAction === 'approve' ? 'Approve' : 'Reject'} {selectedItems.length}{' '}
                    Items
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
