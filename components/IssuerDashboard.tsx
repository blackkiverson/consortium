'use client';

import React from 'react';
import { useLedgerStore } from '../store/ledger';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Alert } from './ui/alert';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from './ui/dialog';
import {
  FileText,
  ShieldCheck,
  Key,
  X,
  Loader2,
  Clock,
  Plus,
  Trash2,
  LogIn,
  AlertTriangle,
  MessageSquare,
} from 'lucide-react';
import ArtifactViewer from './ArtifactViewer';
import ChatPanel from './ChatPanel';

const CREDENTIAL_TYPES = ['Degree', 'Certificate', 'Transcript', 'Badge', 'Other'];

interface MintMeta {
  credentialType: string;
  expiryDate: string;
  issuerNote: string;
  metadata: Array<{ k: string; v: string }>;
}

export default function IssuerDashboard() {
  const { currentUser, mintCredential, rejectSubmission, revokeCredential, ledger, users, logout, switchView } =
    useLedgerStore();

  const [viewingArtifact, setViewingArtifact] = React.useState<string | null>(null);
  const [attachments, setAttachments] = React.useState<Map<string, Array<{ file: File; data: string }>>>(
    new Map()
  );
  const [minting, setMinting] = React.useState<string | null>(null);

  // Rejection state
  const [rejectingHash, setRejectingHash] = React.useState<string | null>(null);
  const [rejectingHolderDid, setRejectingHolderDid] = React.useState<string>('');
  const [rejectReason, setRejectReason] = React.useState('');

  // Revocation state
  const [revokingCredentialId, setRevokingCredentialId] = React.useState<string | null>(null);

  // Per-submission mint metadata
  const [mintMeta, setMintMeta] = React.useState<Map<string, MintMeta>>(new Map());

  // Chat state
  const [chatTarget, setChatTarget] = React.useState<{ did: string; name: string; contextLabel?: string; contextRef?: string } | null>(null);

  if (!currentUser) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4 text-center">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold">University Admin Portal</h2>
          <p className="text-muted-foreground">Please log in to access the issuer dashboard.</p>
        </div>
        <Button onClick={() => { logout(); switchView('HOME'); }} className="gap-2">
          <LogIn className="w-4 h-4" />
          Go to Login
        </Button>
      </div>
    );
  }

  const getMintMeta = (hash: string): MintMeta => {
    return mintMeta.get(hash) ?? { credentialType: 'Certificate', expiryDate: '', issuerNote: '', metadata: [] };
  };

  const setMintMetaField = (hash: string, field: keyof MintMeta, value: any) => {
    setMintMeta((prev) => {
      const next = new Map(prev);
      const current = getMintMeta(hash);
      next.set(hash, { ...current, [field]: value });
      return next;
    });
  };

  const submissions = ledger.filter(
    (tx) => tx.type === 'PORTFOLIO_SUBMISSION' && tx.details?.targetOrgDid === currentUser.did
  );
  const mintedKeys = new Set(
    ledger
      .filter((tx) => tx.type === 'VC_ISSUANCE' && tx.actor === currentUser.did)
      .map((tx) => tx.details?.holderDid + tx.details?.credential?.artifactHash)
  );
  const rejectedKeys = new Set(
    ledger
      .filter((tx) => tx.type === 'PORTFOLIO_REJECTION' && tx.actor === currentUser.did)
      .map((tx) => tx.details?.holderDid + tx.details?.artifactHash)
  );

  const pendingReviews = submissions.filter((tx) => {
    const key = tx.actor + tx.dataHash;
    return !mintedKeys.has(key) && !rejectedKeys.has(key);
  });

  const revokedCredentialIds = new Set(
    ledger
      .filter((tx) => tx.type === 'VC_REVOCATION' && tx.actor === currentUser.did)
      .map((tx) => tx.details?.credentialId)
  );

  const handleFileChange = (submissionHash: string, e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const files = Array.from(e.target.files);
    const filePromises = files.map(
      (file) =>
        new Promise<{ file: File; data: string }>((resolve) => {
          const reader = new FileReader();
          reader.onload = (event) => resolve({ file, data: event.target?.result as string });
          reader.readAsDataURL(file);
        })
    );
    Promise.all(filePromises).then((fileDataArray) => {
      setAttachments((prev) => {
        const next = new Map(prev);
        next.set(submissionHash, [...(next.get(submissionHash) ?? []), ...fileDataArray]);
        return next;
      });
    });
  };

  const handleRemoveAttachment = (submissionHash: string, index: number) => {
    setAttachments((prev) => {
      const next = new Map(prev);
      next.set(submissionHash, (next.get(submissionHash) ?? []).filter((_, i) => i !== index));
      return next;
    });
  };

  const handleMint = async (holderDid: string, artifactHash: string) => {
    setMinting(artifactHash);
    const attachmentArray = attachments.get(artifactHash);
    const meta = getMintMeta(artifactHash);
    const metadataObj: Record<string, string> = {};
    meta.metadata.forEach(({ k, v }) => { if (k.trim()) metadataObj[k.trim()] = v; });

    mintCredential(
      holderDid,
      artifactHash,
      attachmentArray && attachmentArray.length > 0
        ? attachmentArray.map((att) => ({ data: att.data, filename: att.file.name }))
        : undefined,
      meta.credentialType || undefined,
      Object.keys(metadataObj).length > 0 ? metadataObj : undefined,
      meta.issuerNote || undefined,
      meta.expiryDate || undefined
    );

    setAttachments((prev) => {
      const next = new Map(prev);
      next.delete(artifactHash);
      return next;
    });
    setMintMeta((prev) => {
      const next = new Map(prev);
      next.delete(artifactHash);
      return next;
    });
    setTimeout(() => setMinting(null), 600);
  };

  const handleReject = () => {
    if (!rejectingHash || !rejectingHolderDid || !rejectReason.trim()) return;
    rejectSubmission(rejectingHolderDid, rejectingHash, rejectReason.trim());
    setRejectingHash(null);
    setRejectingHolderDid('');
    setRejectReason('');
  };

  const handleRevoke = () => {
    if (!revokingCredentialId) return;
    revokeCredential(revokingCredentialId);
    setRevokingCredentialId(null);
  };

  const getUserName = (did: string) => {
    const u = users.find((u) => u.did === did);
    return u ? (u.profile as any).name as string : `${did.substring(15, 27)}…`;
  };

  const issuanceHistory = ledger
    .filter((tx) => tx.type === 'VC_ISSUANCE' && tx.actor === currentUser.did)
    .sort((a, b) => b.timestamp - a.timestamp);

  // Messages inbox
  const myMessages = ledger.filter(
    (tx) =>
      tx.type === 'CHAT_MESSAGE' &&
      (tx.details?.fromDid === currentUser.did || tx.details?.toDid === currentUser.did)
  );
  const conversationMap = new Map<string, typeof myMessages>();
  myMessages.forEach((tx) => {
    const peerDid =
      tx.details?.fromDid === currentUser.did ? tx.details?.toDid : tx.details?.fromDid;
    if (!conversationMap.has(peerDid)) conversationMap.set(peerDid, []);
    conversationMap.get(peerDid)!.push(tx);
  });
  const conversations = Array.from(conversationMap.entries())
    .map(([peerDid, msgs]) => {
      const sorted = [...msgs].sort((a, b) => b.timestamp - a.timestamp);
      const lastMsg = sorted[0];
      const hasUnread = lastMsg?.details?.fromDid !== currentUser.did;
      return { peerDid, peerName: getUserName(peerDid), lastMsg, hasUnread };
    })
    .sort((a, b) => b.lastMsg.timestamp - a.lastMsg.timestamp);

  return (
    <div className="space-y-6">
      {/* DID Banner */}
      <Alert variant="purple" className="flex items-start gap-3">
        <Key className="w-4 h-4 mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <span className="text-sm font-semibold">Issuer Authority</span>
          <code className="text-xs text-purple-700 block mt-1 truncate">{currentUser.did}</code>
        </div>
      </Alert>

      <div className="space-y-6">
        {/* Pending Reviews */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="w-4 h-4" />
              Pending Portfolio Reviews
            </CardTitle>
            {pendingReviews.length > 0 && (
              <Badge variant="warning">{pendingReviews.length} pending</Badge>
            )}
          </CardHeader>
          <CardContent>
            {pendingReviews.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <ShieldCheck className="w-10 h-10 text-muted-foreground/40 mb-3" />
                <p className="text-sm text-muted-foreground">No pending submissions.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingReviews.map((tx) => {
                  const meta = getMintMeta(tx.dataHash);
                  return (
                    <div
                      key={`${tx.dataHash}-${tx.timestamp}`}
                      className="border rounded-lg overflow-hidden"
                    >
                      {/* Submission header */}
                      <div className="p-4 bg-muted/40 flex items-start justify-between gap-3">
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm">Student Portfolio</span>
                            <Badge variant="outline" className="text-[10px]">
                              <Clock className="w-2.5 h-2.5 mr-1" />
                              {new Date(tx.timestamp).toLocaleDateString()}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground font-mono truncate">
                            Student: {tx.actor}
                          </p>
                          <p className="text-xs text-muted-foreground font-mono">
                            Hash: {tx.dataHash.substring(0, 20)}…
                          </p>
                        </div>
                      </div>

                      {/* Cover letter */}
                      {tx.details?.coverLetter && (
                        <div className="px-4 py-3 border-t bg-blue-50/50 dark:bg-blue-950/20">
                          <p className="text-[10px] font-semibold text-blue-700 uppercase tracking-wider mb-1">
                            Cover Letter
                          </p>
                          <blockquote className="text-sm text-blue-800 dark:text-blue-300 italic border-l-2 border-blue-300 pl-3">
                            {tx.details.coverLetter}
                          </blockquote>
                        </div>
                      )}

                      {/* Student docs */}
                      {tx.details?.artifactDataArray && tx.details.artifactDataArray.length > 0 && (
                        <div className="p-4 border-t space-y-2">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            Student Documents ({tx.details.artifactDataArray.length})
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {tx.details.artifactDataArray.map((artifact: any, idx: number) => (
                              <Button
                                key={idx}
                                variant="outline"
                                size="sm"
                                onClick={() => setViewingArtifact(artifact.data)}
                                className="text-xs h-7 text-blue-700 border-blue-200 hover:bg-blue-50"
                              >
                                <FileText className="w-3 h-3 mr-1" />
                                {artifact.filename}
                              </Button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Credential type & metadata fields */}
                      <div className="p-4 border-t space-y-3">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          Credential Details
                        </p>

                        {/* Type */}
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-[10px] font-semibold text-muted-foreground uppercase">
                              Type *
                            </label>
                            <select
                              className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
                              value={meta.credentialType}
                              onChange={(e) => setMintMetaField(tx.dataHash, 'credentialType', e.target.value)}
                            >
                              {CREDENTIAL_TYPES.map((t) => (
                                <option key={t} value={t}>{t}</option>
                              ))}
                            </select>
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-semibold text-muted-foreground uppercase">
                              Expiry Date
                            </label>
                            <Input
                              type="date"
                              className="h-9 text-sm"
                              value={meta.expiryDate}
                              onChange={(e) => setMintMetaField(tx.dataHash, 'expiryDate', e.target.value)}
                            />
                          </div>
                        </div>

                        {/* Issuer note */}
                        <div className="space-y-1">
                          <label className="text-[10px] font-semibold text-muted-foreground uppercase">
                            Issuer Note (optional)
                          </label>
                          <Textarea
                            placeholder="Add a note to embed in the credential…"
                            value={meta.issuerNote}
                            onChange={(e) => setMintMetaField(tx.dataHash, 'issuerNote', e.target.value)}
                            className="min-h-[60px] text-sm"
                          />
                        </div>

                        {/* Metadata fields */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="text-[10px] font-semibold text-muted-foreground uppercase">
                              Custom Metadata
                            </label>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 text-xs gap-1"
                              onClick={() => {
                                const current = getMintMeta(tx.dataHash);
                                setMintMetaField(tx.dataHash, 'metadata', [...current.metadata, { k: '', v: '' }]);
                              }}
                            >
                              <Plus className="w-3 h-3" /> Add Field
                            </Button>
                          </div>
                          {meta.metadata.map((row, idx) => (
                            <div key={idx} className="flex gap-2 items-center">
                              <Input
                                placeholder="Key"
                                value={row.k}
                                className="h-8 text-xs flex-1"
                                onChange={(e) => {
                                  const newMeta = [...meta.metadata];
                                  newMeta[idx] = { ...newMeta[idx], k: e.target.value };
                                  setMintMetaField(tx.dataHash, 'metadata', newMeta);
                                }}
                              />
                              <Input
                                placeholder="Value"
                                value={row.v}
                                className="h-8 text-xs flex-1"
                                onChange={(e) => {
                                  const newMeta = [...meta.metadata];
                                  newMeta[idx] = { ...newMeta[idx], v: e.target.value };
                                  setMintMetaField(tx.dataHash, 'metadata', newMeta);
                                }}
                              />
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                                onClick={() => {
                                  const newMeta = meta.metadata.filter((_, i) => i !== idx);
                                  setMintMetaField(tx.dataHash, 'metadata', newMeta);
                                }}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Issuer attachments */}
                      <div className="p-4 border-t space-y-3">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          Attach Authenticated Artifacts (Optional)
                        </p>
                        <input
                          type="file"
                          onChange={(e) => handleFileChange(tx.dataHash, e)}
                          className="text-xs w-full file:mr-2 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100 file:cursor-pointer"
                          multiple
                        />
                        {(attachments.get(tx.dataHash)?.length ?? 0) > 0 && (
                          <div className="space-y-1.5">
                            {attachments.get(tx.dataHash)!.map((att, idx) => (
                              <div
                                key={idx}
                                className="flex items-center justify-between px-3 py-1.5 bg-purple-50 rounded-md border border-purple-100"
                              >
                                <span className="text-xs text-purple-700 truncate flex-1">
                                  {att.file.name}
                                </span>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-5 w-5 text-muted-foreground hover:text-destructive ml-2 shrink-0"
                                  onClick={() => handleRemoveAttachment(tx.dataHash, idx)}
                                >
                                  <X className="w-3 h-3" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="flex gap-2">
                          <Button
                            onClick={() => handleMint(tx.actor, tx.dataHash)}
                            disabled={minting === tx.dataHash}
                            className="flex-1 gap-2 bg-purple-600 hover:bg-purple-700 text-white"
                          >
                            {minting === tx.dataHash ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <ShieldCheck className="w-4 h-4" />
                            )}
                            Approve & Mint VC
                          </Button>
                          <Button
                            variant="outline"
                            className="gap-2 border-red-300 text-red-600 hover:bg-red-50"
                            onClick={() => {
                              setRejectingHash(tx.dataHash);
                              setRejectingHolderDid(tx.actor);
                            }}
                          >
                            <X className="w-4 h-4" />
                            Decline
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Issuance History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="w-4 h-4" />
              Issuance History
            </CardTitle>
          </CardHeader>
          <CardContent>
            {issuanceHistory.length === 0 ? (
              <p className="text-muted-foreground text-xs text-center italic py-6">
                No credentials issued yet.
              </p>
            ) : (
              <div className="space-y-3">
                {issuanceHistory.map((tx) => {
                  const credId = tx.details?.credential?.id;
                  const isRevoked = revokedCredentialIds.has(credId);
                  const artifactHash = tx.details?.credential?.artifactHash;
                  const submission = ledger.find(
                    (s) => s.type === 'PORTFOLIO_SUBMISSION' && s.dataHash === artifactHash
                  );
                  const issuerAttachments = tx.details?.credential?.issuerAttachments;
                  const cred = tx.details?.credential;
                  return (
                    <div key={tx.dataHash} className="p-3 bg-muted/40 rounded-lg border">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          {isRevoked ? (
                            <Badge variant="destructive" className="text-[10px]">Revoked</Badge>
                          ) : (
                            <Badge variant="purple" className="text-[10px]">Verified Credential</Badge>
                          )}
                          {cred?.credentialType && (
                            <Badge variant="outline" className="text-[10px]">{cred.credentialType}</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                            {new Date(tx.timestamp).toLocaleTimeString()}
                          </span>
                          {!isRevoked && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-6 text-[10px] border-red-300 text-red-600 hover:bg-red-50 px-2"
                              onClick={() => setRevokingCredentialId(credId)}
                            >
                              Revoke
                            </Button>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground font-mono truncate mb-2">
                        Holder: {tx.details?.holderDid}
                      </p>
                      {cred?.issuerNote && (
                        <p className="text-xs italic text-muted-foreground mb-2 border-l-2 border-purple-300 pl-2">
                          {cred.issuerNote}
                        </p>
                      )}
                      {cred?.expiryDate && (
                        <p className="text-[10px] text-muted-foreground mb-2">
                          <span className="font-semibold">Expires:</span>{' '}
                          {new Date(cred.expiryDate).toLocaleDateString()}
                          {new Date(cred.expiryDate) < new Date() && (
                            <span className="ml-1 text-red-500 font-semibold">(Expired)</span>
                          )}
                        </p>
                      )}
                      {cred?.metadata && Object.keys(cred.metadata).length > 0 && (
                        <div className="mb-2 flex flex-wrap gap-x-3 gap-y-0.5">
                          {Object.entries(cred.metadata).map(([k, v]) => (
                            <span key={k} className="text-[10px] text-muted-foreground">
                              <span className="font-semibold">{k}:</span> {v as string}
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="space-y-2">
                        {submission?.details?.artifactDataArray &&
                          submission.details.artifactDataArray.length > 0 && (
                            <div className="space-y-1">
                              <p className="text-[10px] font-semibold text-blue-700 uppercase tracking-wider">
                                Student Docs
                              </p>
                              <div className="flex flex-wrap gap-1">
                                {submission.details.artifactDataArray.map((artifact: any, idx: number) => (
                                  <button
                                    key={idx}
                                    onClick={() => setViewingArtifact(artifact.data)}
                                    className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                                  >
                                    <FileText className="w-3 h-3" /> {artifact.filename}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        {issuerAttachments && issuerAttachments.length > 0 && (
                          <div className="space-y-1">
                            <p className="text-[10px] font-semibold text-purple-700 uppercase tracking-wider">
                              Issuer Docs
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {issuerAttachments.map((att: any, idx: number) => (
                                <button
                                  key={idx}
                                  onClick={() => setViewingArtifact(att.data)}
                                  className="text-xs text-purple-600 hover:underline flex items-center gap-1"
                                >
                                  <FileText className="w-3 h-3" /> {att.filename}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Rejection Dialog */}
      <Dialog open={!!rejectingHash} onOpenChange={(open) => !open && setRejectingHash(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Decline Submission
            </DialogTitle>
            <DialogDescription>
              Provide a reason for declining this portfolio. The student will see this message.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Textarea
              placeholder="Reason for rejection…"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="min-h-[100px]"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setRejectingHash(null); setRejectReason(''); }}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={!rejectReason.trim()}
              onClick={handleReject}
              className="gap-2"
            >
              <X className="w-4 h-4" />
              Confirm Decline
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revocation Confirm Dialog */}
      <Dialog open={!!revokingCredentialId} onOpenChange={(open) => !open && setRevokingCredentialId(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Revoke Credential
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to revoke{' '}
              <code className="text-xs">{revokingCredentialId?.substring(0, 20)}…</code>?
              This cannot be undone. The credential will fail all future verifications.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setRevokingCredentialId(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleRevoke} className="gap-2">
              <Trash2 className="w-4 h-4" />
              Revoke Credential
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Messages Inbox */}
      {conversations.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageSquare className="w-4 h-4" />
              Messages
              {conversations.filter((c) => c.hasUnread).length > 0 && (
                <Badge variant="destructive" className="text-[10px] h-4 px-1.5">
                  {conversations.filter((c) => c.hasUnread).length} new
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {conversations.map(({ peerDid, peerName, lastMsg, hasUnread }) => (
              <button
                key={peerDid}
                className="w-full flex items-center gap-3 p-3 rounded-lg border hover:bg-accent transition-colors text-left"
                onClick={() => setChatTarget({ did: peerDid, name: peerName })}
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                  {peerName.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold truncate">{peerName}</p>
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                      {new Date(lastMsg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className={`text-xs truncate ${hasUnread ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
                    {lastMsg.details?.fromDid === currentUser.did ? 'You: ' : ''}
                    {lastMsg.details?.content}
                  </p>
                </div>
                {hasUnread && (
                  <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
                )}
              </button>
            ))}
          </CardContent>
        </Card>
      )}

      <ArtifactViewer
        isOpen={!!viewingArtifact}
        onClose={() => setViewingArtifact(null)}
        artifactData={viewingArtifact}
        title="Review Student Portfolio"
      />

      <ChatPanel
        isOpen={!!chatTarget}
        onClose={() => setChatTarget(null)}
        peerDid={chatTarget?.did ?? ''}
        peerName={chatTarget?.name ?? ''}
        contextLabel={chatTarget?.contextLabel}
        contextRef={chatTarget?.contextRef}
      />
    </div>
  );
}
