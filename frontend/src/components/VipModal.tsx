import React, { useState, useEffect, useCallback } from 'react';
import {
  Sparkles,
  Crown,
  Key,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  UserCheck,
  UserX,
  Copy,
  Check,
  Shield,
  Edit2,
  AlertTriangle,
} from 'lucide-react';
import { VipStatusResponse, User } from '../types';
import { fetchVipStatus, redeemVipCode, updateVipCode, revokeVipUser } from '../api';

interface VipModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: User | null;
  onVipUpdated?: () => void;
}

export const VipModal: React.FC<VipModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onVipUpdated,
}) => {
  const [statusData, setStatusData] = useState<VipStatusResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // User input states
  const [redeemCode, setRedeemCode] = useState('');
  const [isRedeeming, setIsRedeeming] = useState(false);

  // Admin states (deepanshu_verma)
  const [isEditingCode, setIsEditingCode] = useState(false);
  const [newCodeInput, setNewCodeInput] = useState('');
  const [isUpdatingCode, setIsUpdatingCode] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // Revocation Confirmation Modal state
  const [userToRevoke, setUserToRevoke] = useState<{ username: string; name: string } | null>(null);
  const [isRevoking, setIsRevoking] = useState(false);

  const loadStatus = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await fetchVipStatus();
      setStatusData(data);
      if (data.active_code) {
        setNewCodeInput(data.active_code);
      }
    } catch (err: unknown) {
      console.error('Failed to load VIP status:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      setFeedback(null);
      setRedeemCode('');
      setIsEditingCode(false);
      loadStatus();
    }
  }, [isOpen, loadStatus]);

  if (!isOpen) return null;

  // Handle Redeem VIP code
  const handleRedeem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!redeemCode.trim()) return;

    try {
      setIsRedeeming(true);
      setFeedback(null);
      const res = await redeemVipCode(redeemCode.trim());
      setFeedback({ type: 'success', message: res.message });
      setRedeemCode('');
      await loadStatus();
      onVipUpdated?.();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid VIP code. Please verify and try again.';
      setFeedback({ type: 'error', message: msg });
    } finally {
      setIsRedeeming(false);
    }
  };

  // Handle Update VIP Code (Owner only)
  const handleUpdateCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCodeInput.trim()) return;

    try {
      setIsUpdatingCode(true);
      setFeedback(null);
      const res = await updateVipCode(newCodeInput.trim());
      setFeedback({
        type: 'success',
        message: `VIP code successfully updated to '${res.active_code}'!`,
      });
      setIsEditingCode(false);
      await loadStatus();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update VIP code';
      setFeedback({ type: 'error', message: msg });
    } finally {
      setIsUpdatingCode(false);
    }
  };

  // Handle Confirmed Revoke of VIP Access (Owner only)
  const handleConfirmRevoke = async () => {
    if (!userToRevoke) return;

    try {
      setIsRevoking(true);
      setFeedback(null);
      const res = await revokeVipUser(userToRevoke.username);
      setFeedback({ type: 'success', message: res.message });
      setUserToRevoke(null);
      await loadStatus();
      onVipUpdated?.();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to revoke VIP status';
      setFeedback({ type: 'error', message: msg });
      setUserToRevoke(null);
    } finally {
      setIsRevoking(false);
    }
  };

  // Copy code helper
  const handleCopyCode = () => {
    if (!statusData?.active_code) return;
    navigator.clipboard.writeText(statusData.active_code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const isOwner = statusData?.is_owner ?? false;
  const isVip = statusData?.is_vip ?? false;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
      <div
        className="w-full max-w-lg bg-white dark:bg-[#181a20] border border-[#eaecef] dark:border-[#2b3139] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] transition-all"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-5 border-b border-[#eaecef] dark:border-[#2b3139] flex items-center justify-between bg-[#fafafa] dark:bg-[#14171d]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FCD535]/15 border border-[#FCD535]/40 flex items-center justify-center text-[#b8860b] dark:text-[#FCD535] shadow-xs">
              {isOwner ? <Crown className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-[#181a20] dark:text-white">
                  VIP Unlimited Access
                </h3>
                {isOwner ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#FCD535] text-[#181a20] uppercase tracking-wider">
                    Owner Admin
                  </span>
                ) : isVip ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#10b981]/15 text-[#10b981] border border-[#10b981]/30 uppercase tracking-wider">
                    VIP Active
                  </span>
                ) : null}
              </div>
              <p className="text-xs text-[#707a8a]">
                {isOwner
                  ? 'Manage system VIP access codes and user privileges.'
                  : 'Zero daily limits on problem resolutions and game turns.'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#707a8a] hover:text-[#181a20] dark:hover:text-white hover:bg-[#eaecef] dark:hover:bg-[#2b3139] transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-5 overflow-y-auto flex-1">
          {/* Feedback Banner */}
          {feedback && (
            <div
              className={`p-3.5 rounded-xl text-xs flex items-center gap-2.5 border ${
                feedback.type === 'success'
                  ? 'bg-[#10b981]/10 border-[#10b981]/30 text-[#10b981]'
                  : 'bg-[#ef4444]/10 border-[#ef4444]/30 text-[#ef4444]'
              }`}
            >
              {feedback.type === 'success' ? (
                <CheckCircle2 className="h-4 w-4 shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 shrink-0" />
              )}
              <span className="font-medium leading-relaxed">{feedback.message}</span>
            </div>
          )}

          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-xs text-[#707a8a]">
              <Loader2 className="h-6 w-6 animate-spin text-[#FCD535]" />
              <span>Loading VIP privileges...</span>
            </div>
          ) : isOwner ? (
            /* =========================================================================
               OWNER VIEW: Manage Code & Revoke Users
               ========================================================================= */
            <div className="space-y-5">
              {/* Active VIP Code Card */}
              <div className="p-4 rounded-xl bg-[#f8f9fa] dark:bg-[#12161c] border border-[#eaecef] dark:border-[#2b3139] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#181a20] dark:text-[#eaecef] flex items-center gap-1.5">
                    <Key className="h-3.5 w-3.5 text-[#FCD535]" />
                    Active VIP Access Code
                  </span>
                  {!isEditingCode && (
                    <button
                      onClick={() => setIsEditingCode(true)}
                      className="flex items-center gap-1 text-[11px] font-semibold text-[#b8860b] dark:text-[#FCD535] hover:underline cursor-pointer"
                    >
                      <Edit2 className="h-3 w-3" />
                      <span>Change Code</span>
                    </button>
                  )}
                </div>

                {isEditingCode ? (
                  <form onSubmit={handleUpdateCode} className="space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        required
                        autoFocus
                        value={newCodeInput}
                        onChange={e => setNewCodeInput(e.target.value.toUpperCase())}
                        placeholder="ENTER NEW CODE"
                        className="flex-1 px-3.5 py-2 font-mono font-bold tracking-wider rounded-lg border border-[#eaecef] dark:border-[#2b3139] bg-white dark:bg-[#181a20] text-xs text-[#181a20] dark:text-white placeholder-[#707a8a] focus:outline-hidden focus:border-[#FCD535]"
                      />
                      <button
                        type="submit"
                        disabled={isUpdatingCode || !newCodeInput.trim()}
                        className="px-4 py-2 bg-[#FCD535] hover:bg-[#f0b90b] text-[#181a20] font-bold text-xs rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {isUpdatingCode ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Save'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsEditingCode(false);
                          setNewCodeInput(statusData?.active_code || '');
                        }}
                        className="px-3 py-2 border border-[#eaecef] dark:border-[#2b3139] hover:bg-[#eaecef] dark:hover:bg-[#2b3139] text-[#707a8a] text-xs rounded-lg transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                    <p className="text-[11px] text-[#707a8a]">
                      Any operator entering this code will instantly gain unlimited access.
                    </p>
                  </form>
                ) : (
                  <div className="flex items-center justify-between p-3 rounded-lg bg-white dark:bg-[#181a20] border border-[#eaecef] dark:border-[#2b3139]">
                    <div className="flex items-center gap-2">
                      <code className="text-base font-mono font-black tracking-widest text-[#b8860b] dark:text-[#FCD535]">
                        {statusData?.active_code || 'VIP2026'}
                      </code>
                    </div>
                    <button
                      onClick={handleCopyCode}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#f5f5f5] dark:bg-[#2b3139] hover:bg-[#eaecef] text-[#181a20] dark:text-white text-xs font-semibold cursor-pointer transition-colors"
                      title="Copy VIP code to clipboard"
                    >
                      {copiedCode ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-[#10b981]" />
                          <span className="text-[#10b981]">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5 text-[#707a8a]" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>

              {/* Active VIP Users Table */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-[#181a20] dark:text-[#eaecef] flex items-center gap-1.5">
                    <UserCheck className="h-3.5 w-3.5 text-[#10b981]" />
                    Granted VIP Users ({statusData?.vip_users?.length || 0})
                  </h4>
                  <span className="text-[10px] text-[#707a8a]">
                    Revoke privileges at any time
                  </span>
                </div>

                {statusData?.vip_users && statusData.vip_users.length > 0 ? (
                  <div className="border border-[#eaecef] dark:border-[#2b3139] rounded-xl overflow-hidden divide-y divide-[#eaecef] dark:divide-[#2b3139]">
                    {statusData.vip_users.map(u => (
                      <div
                        key={u.id}
                        className="p-3 bg-white dark:bg-[#181a20] flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0 flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-[#10b981]/15 border border-[#10b981]/30 flex items-center justify-center font-bold text-xs text-[#10b981]">
                            {u.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <p className="text-xs font-bold text-[#181a20] dark:text-white truncate">
                                {u.name}
                              </p>
                              <code className="text-[11px] font-mono text-[#707a8a]">
                                @{u.username}
                              </code>
                            </div>
                            {u.vip_granted_at && (
                              <p className="text-[10px] text-[#707a8a]">
                                Granted: {new Date(u.vip_granted_at).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setUserToRevoke({ username: u.username, name: u.name })}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#fed7d7] dark:border-[#ef4444]/30 hover:bg-[#ef4444]/10 text-[#ef4444] text-xs font-semibold cursor-pointer transition-colors shrink-0"
                          title={`Revoke VIP Unlimited from @${u.username}`}
                        >
                          <UserX className="h-3.5 w-3.5" />
                          <span>Revoke</span>
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 text-center rounded-xl bg-[#f8f9fa] dark:bg-[#12161c] border border-[#eaecef] dark:border-[#2b3139] text-xs text-[#707a8a]">
                    <Sparkles className="h-6 w-6 text-[#707a8a] mx-auto mb-2 opacity-50" />
                    <p className="font-medium text-[#181a20] dark:text-[#eaecef]">
                      No outside users currently have VIP Unlimited.
                    </p>
                    <p className="text-[11px] text-[#707a8a] mt-0.5">
                      Share the access code <code className="font-mono font-bold text-[#b8860b] dark:text-[#FCD535]">{statusData?.active_code}</code> with any user to grant them unlimited access.
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* =========================================================================
               STANDARD USER VIEW: Status or Redeem Code
               ========================================================================= */
            <div className="space-y-4">
              {isVip ? (
                <div className="p-5 rounded-xl bg-[#10b981]/10 border border-[#10b981]/30 text-center space-y-2">
                  <div className="w-10 h-10 rounded-full bg-[#10b981]/20 border border-[#10b981]/40 flex items-center justify-center text-[#10b981] mx-auto">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                  <h4 className="text-sm font-bold text-[#181a20] dark:text-white">
                    VIP Unlimited Pass Active!
                  </h4>
                  <p className="text-xs text-[#707a8a] max-w-sm mx-auto leading-relaxed">
                    Your account has permanent VIP status. All daily limits on problem resolutions (5/day) and Tic-Tac-Toe games (5/day) are fully bypassed.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleRedeem} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-[#181a20] dark:text-[#eaecef]">
                      Enter VIP Access Code
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        autoFocus
                        value={redeemCode}
                        onChange={e => setRedeemCode(e.target.value.toUpperCase())}
                        placeholder="e.g. VIP2026"
                        className="w-full px-3.5 py-2.5 pl-9 font-mono font-bold tracking-wider rounded-lg border border-[#eaecef] dark:border-[#2b3139] bg-[#f8f9fa] dark:bg-[#12161c] text-xs text-[#181a20] dark:text-white placeholder-[#707a8a] focus:outline-hidden focus:border-[#FCD535] uppercase transition-colors"
                      />
                      <Key className="h-4 w-4 text-[#707a8a] absolute left-3 top-3" />
                    </div>
                    <p className="text-[11px] text-[#707a8a]">
                      Codes are issued directly by platform owner{' '}
                      <span className="font-semibold text-[#181a20] dark:text-[#eaecef]">
                        @deepanshu_verma
                      </span>.
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={isRedeeming || !redeemCode.trim()}
                    className="w-full py-2.5 rounded-lg bg-[#FCD535] hover:bg-[#f0b90b] text-[#181a20] font-bold text-xs tracking-tight transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
                  >
                    {isRedeeming ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>Validating Code...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-3.5 w-3.5 fill-current" />
                        <span>Activate VIP Unlimited</span>
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* Security & Invariant Note */}
              <div className="flex items-center gap-2 p-3 rounded-lg bg-[#f8f9fa] dark:bg-[#12161c] border border-[#eaecef] dark:border-[#2b3139] text-[11px] text-[#707a8a]">
                <Shield className="h-3.5 w-3.5 text-[#00f0ff] shrink-0" />
                <span>VIP privileges grant 999,999 problem solves and unlimited game moves.</span>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-[#eaecef] dark:border-[#2b3139] bg-[#fafafa] dark:bg-[#14171d] flex items-center justify-between text-xs text-[#707a8a]">
          <span className="font-mono text-[10px]">
            Operator: @{currentUser?.username || 'guest'}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-md bg-[#f5f5f5] dark:bg-[#1e2329] hover:bg-[#eaecef] dark:hover:bg-[#2b3139] text-[#181a20] dark:text-white font-medium cursor-pointer transition-colors"
          >
            Close
          </button>
        </div>
      </div>

      {/* Revocation Confirmation Modal */}
      {userToRevoke && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs transition-opacity animate-in fade-in duration-150"
          onClick={e => {
            if (e.target === e.currentTarget && !isRevoking) {
              setUserToRevoke(null);
            }
          }}
        >
          <div
            className="w-full max-w-md bg-white dark:bg-[#1e2329] border border-[#eaecef] dark:border-[#2b3139] rounded-2xl shadow-2xl overflow-hidden flex flex-col transition-all"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-4 border-b border-[#eaecef] dark:border-[#2b3139] flex items-center justify-between bg-white dark:bg-[#1e2329]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#f6465d]/15 text-[#f6465d] flex items-center justify-center shrink-0">
                  <UserX className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#181a20] dark:text-white">
                    Revoke VIP Unlimited
                  </h3>
                  <p className="text-[11px] text-[#707a8a]">Confirmation Required</p>
                </div>
              </div>
              <button
                onClick={() => setUserToRevoke(null)}
                disabled={isRevoking}
                className="p-1.5 rounded-md text-[#707a8a] hover:text-[#181a20] dark:hover:text-white hover:bg-[#f5f5f5] dark:hover:bg-[#2b3139] transition-colors cursor-pointer disabled:opacity-50"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Content Body */}
            <div className="p-5 space-y-3.5 bg-white dark:bg-[#1e2329]">
              <div className="p-3.5 rounded-lg bg-[#fff5f5] dark:bg-[#2b1f24] border border-[#fed7d7] dark:border-[#f6465d]/30 flex items-start gap-3">
                <AlertTriangle className="h-4 w-4 text-[#f6465d] shrink-0 mt-0.5" />
                <div className="text-xs text-[#181a20] dark:text-[#eaecef] space-y-1">
                  <p className="font-semibold text-[#f6465d]">Revoke VIP privileges?</p>
                  <p className="text-[#707a8a] dark:text-[#929aa5] leading-relaxed">
                    This user will immediately lose unlimited problem solving and game moves, and will revert to standard daily quotas (5 problems and 5 games per day).
                  </p>
                </div>
              </div>

              <div>
                <span className="text-[11px] font-mono uppercase tracking-wider text-[#707a8a]">
                  Target User:
                </span>
                <div className="mt-1.5 flex items-center gap-2.5 p-3 rounded-lg bg-[#f8f9fa] dark:bg-[#12161c] border border-[#eaecef] dark:border-[#2b3139]">
                  <div className="w-8 h-8 rounded-full bg-[#f6465d]/15 border border-[#f6465d]/30 flex items-center justify-center font-bold text-xs text-[#f6465d]">
                    {userToRevoke.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-[#181a20] dark:text-white truncate">
                      {userToRevoke.name}
                    </p>
                    <code className="text-[11px] font-mono text-[#707a8a]">
                      @{userToRevoke.username}
                    </code>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="p-4 border-t border-[#eaecef] dark:border-[#2b3139] bg-[#f8f9fa] dark:bg-[#181d24] flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setUserToRevoke(null)}
                disabled={isRevoking}
                className="px-4 py-2 text-xs font-semibold rounded-md border border-[#eaecef] dark:border-[#2b3139] hover:bg-[#eaecef] dark:hover:bg-[#2b3139] text-[#707a8a] hover:text-[#181a20] dark:hover:text-white transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRevoke}
                disabled={isRevoking}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-md bg-[#f6465d] hover:bg-[#d9384f] text-white transition-colors cursor-pointer shadow-sm disabled:opacity-50"
              >
                {isRevoking ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Revoking...</span>
                  </>
                ) : (
                  <>
                    <UserX className="h-3.5 w-3.5" />
                    <span>Revoke VIP Access</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
