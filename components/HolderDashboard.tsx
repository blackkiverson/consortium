'use client';

import React, { useState } from 'react';
import { useLedgerStore } from '../store/ledger';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from './ui/dialog';
import {
  Upload,
  FileText,
  CheckCircle,
  Share2,
  Wallet,
  Key,
  Copy,
  CloudUpload,
  X,
  Loader2,
  AlertTriangle,
  LogIn,
  MessageSquare,
  ThumbsUp,
} from 'lucide-react';
import ArtifactViewer from './ArtifactViewer';
import ChatPanel from './ChatPanel';

interface ChatTarget {
  did: string;
  name: string;
  contextLabel?: string;
  contextRef?: string;
}

export default function HolderDashboard() {
  const { currentUser, submitPortfolio, ledger, users, login, forwardCredential, logout, switchView } =
    useLedgerStore();
  const [files, setFiles] = useState<File[]>([]);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success'>('idle');
  const [viewingArtifact, setViewingArtifact] = useState<string | null>(null);
  const [selectedOrgDid, setSelectedOrgDid] = useState('');
  const [orgSearchTerm, setOrgSearchTerm] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [forwardingVC, setForwardingVC] = useState<any | null>(null);
  const [verifierSearch, setVerifierSearch] = useState('');
  const [forwardMessage, setForwardMessage] = useState('');
  const [selectedVerifierDid, setSelectedVerifierDid] = useState('');
  const [showVerifierSuggestions, setShowVerifierSuggestions] = useState(false);
  const [copied, setCopied] = useState(false);
  const [coverLetter, setCoverLetter] = useState('');
  const [chatTarget, setChatTarget] = useState<ChatTarget | null>(null);

  if (!currentUser) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4 text-center">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold">Student Portal</h2>
          <p className="text-muted-foreground">Please log in to access your student dashboard.</p>
        </div>
        <Button onClick={() => { logout(); switchView('HOME'); }} className="gap-2">
          <LogIn className="w-4 h-4" />
          Go to Login
        </Button>
      </div>
    );
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const handleRemoveFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (files.length === 0 || !selectedOrgDid) return;
    setUploadStatus('uploading');
    const filePromises = files.map(
      (file) =>
        new Promise<{ data: string; filename: string }>((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve({ data: e.target?.result as string, filename: file.name });
          reader.readAsDataURL(file);
        })
    );
    const artifactDataArray = await Promise.all(filePromises);
    submitPortfolio(artifactDataArray, selectedOrgDid, coverLetter || undefined);
    setUploadStatus('success');
    setTimeout(() => setUploadStatus('idle'), 2500);
    setFiles([]);
    setSelectedOrgDid('');
    setOrgSearchTerm('');
    setCoverLetter('');
  };

  const handleCopyDid = () => {
    navigator.clipboard.writeText(currentUser.did);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleCopyCredential = (credential: any) => {
    navigator.clipboard.writeText(JSON.stringify(credential, null, 2));
  };

  const handleForwardCredential = (verifierDid: string) => {
    if (!forwardingVC) return;
    forwardCredential(verifierDid, forwardingVC, forwardMessage);
    setForwardingVC(null);
    setForwardMessage('');
    setVerifierSearch('');
    setSelectedVerifierDid('');
    setShowVerifierSuggestions(false);
  };

  const getUserName = (did: string) => {
    const u = users.find((u) => u.did === did);
    return u ? (u.profile as any).name as string : `${did.substring(15, 27)}…`;
  };

  const organizations = users.filter((u) => u.type === 'ORGANIZATION');
  const filteredOrgs = organizations.filter(
    (o) =>
      (o.profile as any).name.toLowerCase().includes(orgSearchTerm.toLowerCase()) ||
      o.did.toLowerCase().includes(orgSearchTerm.toLowerCase())
  );

  const mySubmissions = ledger.filter(
    (tx) => tx.type === 'PORTFOLIO_SUBMISSION' && tx.actor === currentUser.did
  );
  const myCredentials = ledger.filter(
    (tx) => tx.type === 'VC_ISSUANCE' && tx.details?.holderDid === currentUser.did
  );
  const myRejections = ledger.filter(
    (tx) => tx.type === 'PORTFOLIO_REJECTION' && tx.details?.holderDid === currentUser.did
  );

  const mintedHashes = new Set(myCredentials.map((vc) => vc.details?.credential?.artifactHash));
  const rejectedHashes = new Set(myRejections.map((r) => r.details?.artifactHash));

  // Build a set of revoked credential IDs that belong to this holder
  const revokedCredentialIds = new Set(
    ledger
      .filter((tx) => tx.type === 'VC_REVOCATION')
      .map((tx) => tx.details?.credentialId)
      .filter((id) => myCredentials.some((vc) => vc.details?.credential?.id === id))
  );

  const isMinted = (submissionHash: string) => mintedHashes.has(submissionHash);
  const isRejected = (submissionHash: string) => rejectedHashes.has(submissionHash);

  // Build verifier decision lookup: credentialId -> accepted verifier names
  const acceptedByVerifiers = new Map<string, string[]>();
  ledger
    .filter((tx) => tx.type === 'CREDENTIAL_DECISION' && tx.details?.decision === 'ACCEPTED')
    .forEach((tx) => {
      const credId = tx.details?.credentialId;
      if (!credId) return;
      // Only surface if the credential belongs to this holder
      const ownsCredential = myCredentials.some((vc) => vc.details?.credential?.id === credId);
      if (!ownsCredential) return;
      const verifierName = getUserName(tx.actor);
      const existing = acceptedByVerifiers.get(credId) ?? [];
      acceptedByVerifiers.set(credId, [...existing, verifierName]);
    });

  interface DisplayItem {
    type: 'pending' | 'verified' | 'revoked' | 'rejected';
    id: string;
    timestamp: number;
    artifactDataArray?: Array<{ data: string; filename: string }>;
    title: string;
    issuer: string;
    issuerDid?: string;
    credential?: any;
    rejectionReason?: string;
    credentialType?: string;
    issuerNote?: string;
    expiryDate?: string;
    metadata?: Record<string, string>;
    acceptedBy?: string[];
  }

  const displayItems: DisplayItem[] = [
    ...mySubmissions
      .filter((sub) => !isMinted(sub.dataHash) && !isRejected(sub.dataHash))
      .map((sub) => ({
        type: 'pending' as const,
        id: sub.dataHash,
        timestamp: sub.timestamp,
        artifactDataArray: sub.details?.artifactDataArray,
        title: 'Pending Review',
        issuer: 'Waiting for Issuer…',
      })),
    ...myRejections.map((r) => {
      const originalSub = mySubmissions.find((s) => s.dataHash === r.details?.artifactHash);
      return {
        type: 'rejected' as const,
        id: r.dataHash,
        timestamp: r.timestamp,
        artifactDataArray: originalSub?.details?.artifactDataArray,
        title: 'Submission Rejected',
        issuer: getUserName(r.actor),
        issuerDid: r.actor,
        rejectionReason: r.details?.reason,
      };
    }),
    ...myCredentials.map((vc) => {
      const credId = vc.details?.credential?.id;
      const isRevoked = revokedCredentialIds.has(credId);
      return {
        type: isRevoked ? ('revoked' as const) : ('verified' as const),
        id: vc.dataHash,
        timestamp: vc.timestamp,
        artifactDataArray: mySubmissions.find((s) => s.dataHash === vc.details?.credential?.artifactHash)
          ?.details?.artifactDataArray,
        title: isRevoked ? 'Credential Revoked' : 'Verified Credential',
        issuer: getUserName(vc.actor),
        issuerDid: vc.actor,
        credential: vc.details.credential,
        credentialType: vc.details.credential?.credentialType,
        issuerNote: vc.details.credential?.issuerNote,
        expiryDate: vc.details.credential?.expiryDate,
        metadata: vc.details.credential?.metadata,
        acceptedBy: acceptedByVerifiers.get(credId),
      };
    }),
  ].sort((a, b) => b.timestamp - a.timestamp);

  // Messages inbox — conversations grouped by peer DID
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

  const isExpired = (expiryDate?: string) => expiryDate ? new Date(expiryDate) < new Date() : false;
  const isExpiringSoon = (expiryDate?: string) => {
    if (!expiryDate) return false;
    const diff = new Date(expiryDate).getTime() - Date.now();
    return diff > 0 && diff < 30 * 24 * 60 * 60 * 1000; // within 30 days
  };

  return (
    <div className="space-y-6">
      {/* DID Banner */}
      <Alert variant="info" className="flex items-start gap-3">
        <Key className="w-4 h-4 mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-semibold">Your Decentralized Identity</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-blue-600 hover:text-blue-800 hover:bg-blue-100 shrink-0"
              onClick={handleCopyDid}
              title="Copy DID"
            >
              {copied ? <CheckCircle className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            </Button>
          </div>
          <code className="text-xs text-blue-700 block mt-1 truncate">{currentUser.did}</code>
          <p className="text-[11px] text-blue-600/80 mt-1 font-mono truncate">
            PK: {currentUser.publicKey}
          </p>
        </div>
      </Alert>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Portfolio Submission */}
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Upload className="w-4 h-4" />
              Submit Portfolio
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 space-y-4">
            {/* Drop Zone */}
            <label
              htmlFor="portfolio-upload"
              className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-border rounded-lg p-6 cursor-pointer hover:border-primary hover:bg-accent/50 transition-colors"
            >
              <CloudUpload className="w-8 h-8 text-muted-foreground" />
              <div className="text-center">
                <p className="text-sm font-medium text-foreground">
                  {files.length > 0 ? `${files.length} file(s) selected` : 'Click to upload documents'}
                </p>
                <p className="text-xs text-muted-foreground">Multiple files allowed</p>
              </div>
              <input
                type="file"
                id="portfolio-upload"
                onChange={handleFileChange}
                className="hidden"
                multiple
              />
            </label>

            {/* File List */}
            {files.length > 0 && (
              <div className="space-y-1.5">
                {files.map((f, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between px-3 py-2 bg-accent rounded-md border"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <span className="text-xs text-foreground truncate">{f.name}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 text-muted-foreground hover:text-destructive ml-2 shrink-0"
                      onClick={() => handleRemoveFile(index)}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Org Search */}
            <div className="space-y-2 relative">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Send To Organization
              </label>
              <Input
                placeholder="Type name or DID…"
                value={orgSearchTerm}
                onChange={(e) => {
                  setOrgSearchTerm(e.target.value);
                  setShowSuggestions(true);
                  if (selectedOrgDid) setSelectedOrgDid('');
                }}
                onFocus={() => setShowSuggestions(true)}
              />
              {showSuggestions && orgSearchTerm && (
                <div className="absolute z-20 w-full mt-1 bg-popover border border-border rounded-xl shadow-xl max-h-[200px] overflow-y-auto">
                  {filteredOrgs.map((org) => (
                    <div
                      key={org.did}
                      className="p-3 hover:bg-accent cursor-pointer transition-colors border-b last:border-0"
                      onClick={() => {
                        setOrgSearchTerm((org.profile as any).name);
                        setSelectedOrgDid(org.did);
                        setShowSuggestions(false);
                      }}
                    >
                      <p className="text-sm font-semibold">{(org.profile as any).name}</p>
                      <p className="text-[10px] text-muted-foreground font-mono">{org.did}</p>
                    </div>
                  ))}
                  {filteredOrgs.length === 0 && (
                    <p className="p-4 text-xs text-center text-muted-foreground">
                      No organizations found
                    </p>
                  )}
                </div>
              )}
              {selectedOrgDid && !showSuggestions && (
                <div className="flex items-center gap-2 mt-1 px-3 py-2 bg-accent border border-border rounded-lg">
                  <CheckCircle className="w-4 h-4 text-primary" />
                  <span className="text-xs font-medium text-primary">
                    {(organizations.find((o) => o.did === selectedOrgDid)?.profile as any)?.name}
                  </span>
                </div>
              )}
            </div>

            {/* Cover Letter */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Cover Letter (Optional)
              </label>
              <Textarea
                placeholder="Add a cover letter or description of your work (optional)"
                value={coverLetter}
                onChange={(e) => setCoverLetter(e.target.value)}
                className="min-h-[80px] text-sm"
              />
            </div>

            <Button
              className="w-full"
              disabled={files.length === 0 || !selectedOrgDid || uploadStatus === 'uploading'}
              onClick={handleSubmit}
            >
              {uploadStatus === 'uploading' ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Hashing & Submitting…
                </>
              ) : (
                'Submit to Ledger'
              )}
            </Button>
            {uploadStatus === 'success' && (
              <p className="text-emerald-600 text-sm text-center flex items-center justify-center gap-1.5">
                <CheckCircle className="w-4 h-4" /> Transaction recorded on ledger
              </p>
            )}
          </CardContent>
        </Card>

        {/* Wallet / Credentials */}
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Wallet className="w-4 h-4" />
              My Credentials
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1">
            {displayItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Wallet className="w-10 h-10 text-muted-foreground/40 mb-3" />
                <p className="text-sm text-muted-foreground">No activity yet.</p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  Submit a portfolio to get started.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {displayItems.map((item) => (
                  <div
                    key={item.id}
                    className={`p-3 rounded-lg border ${
                      item.type === 'verified'
                        ? 'bg-emerald-50 border-emerald-100 dark:bg-emerald-950/30 dark:border-emerald-900/50'
                        : item.type === 'rejected' || item.type === 'revoked'
                        ? 'bg-red-50 border-red-100 dark:bg-red-950/30 dark:border-red-900/50'
                        : 'bg-amber-50 border-amber-100 dark:bg-amber-950/30 dark:border-amber-900/50'
                    }`}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          {item.type === 'verified' && (
                            <Badge variant="success">✓ Verified</Badge>
                          )}
                          {item.type === 'pending' && (
                            <Badge variant="warning">⏳ Pending</Badge>
                          )}
                          {item.type === 'rejected' && (
                            <Badge variant="destructive">✗ Rejected</Badge>
                          )}
                          {item.type === 'revoked' && (
                            <Badge variant="destructive">⊘ Revoked</Badge>
                          )}
                          {item.credentialType && (
                            <Badge variant="outline" className="text-[10px]">
                              {item.credentialType}
                            </Badge>
                          )}
                          {item.expiryDate && isExpired(item.expiryDate) && (
                            <Badge variant="destructive" className="text-[10px]">Expired</Badge>
                          )}
                          {item.expiryDate && isExpiringSoon(item.expiryDate) && !isExpired(item.expiryDate) && (
                            <Badge variant="warning" className="text-[10px]">
                              <AlertTriangle className="w-2.5 h-2.5 mr-1" />
                              Expires soon
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{item.issuer}</p>

                        {/* Accepted by verifier(s) */}
                        {item.acceptedBy && item.acceptedBy.length > 0 && (
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {item.acceptedBy.map((name) => (
                              <span
                                key={name}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300"
                              >
                                <ThumbsUp className="w-2.5 h-2.5" />
                                Accepted by {name}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Issuer note */}
                        {item.issuerNote && (
                          <p className="text-xs italic text-muted-foreground mt-1 border-l-2 border-current pl-2">
                            {item.issuerNote}
                          </p>
                        )}

                        {/* Metadata */}
                        {item.metadata && Object.keys(item.metadata).length > 0 && (
                          <div className="mt-1.5 space-y-0.5">
                            {Object.entries(item.metadata).map(([k, v]) => (
                              <p key={k} className="text-[10px] text-muted-foreground">
                                <span className="font-semibold">{k}:</span> {v}
                              </p>
                            ))}
                          </div>
                        )}

                        {/* Rejection reason */}
                        {item.type === 'rejected' && item.rejectionReason && (
                          <div className="mt-1.5 p-2 bg-red-100 dark:bg-red-900/30 rounded text-xs text-red-700 dark:text-red-300">
                            <span className="font-semibold">Reason: </span>{item.rejectionReason}
                          </div>
                        )}
                        {item.type === 'rejected' && item.issuerDid && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-2 h-7 text-xs gap-1.5 border-red-300 text-red-700 hover:bg-red-50"
                            onClick={() =>
                              setChatTarget({
                                did: item.issuerDid!,
                                name: item.issuer,
                                contextLabel: `Re: Rejected submission`,
                                contextRef: item.id,
                              })
                            }
                          >
                            <MessageSquare className="w-3 h-3" />
                            Contact Issuer
                          </Button>
                        )}

                        {/* Revocation notice */}
                        {item.type === 'revoked' && (
                          <div className="mt-1.5 p-2 bg-red-100 dark:bg-red-900/30 rounded text-xs text-red-700 dark:text-red-300 space-y-2">
                            <p className="font-semibold flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" />
                              This credential has been revoked by the issuer.
                            </p>
                            <p>It will no longer pass verification. Contact the issuing organization to understand why and whether a new credential can be issued.</p>
                            {item.issuerDid && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs gap-1.5 border-red-400 text-red-700 hover:bg-red-50 bg-white/70"
                                onClick={() =>
                                  setChatTarget({
                                    did: item.issuerDid!,
                                    name: item.issuer,
                                    contextLabel: `Re: Revoked credential — ${item.credentialType ?? item.credential?.id?.substring(0, 15) ?? ''}`,
                                    contextRef: item.credential?.id,
                                  })
                                }
                              >
                                <MessageSquare className="w-3 h-3" />
                                Contact Issuer
                              </Button>
                            )}
                          </div>
                        )}

                        {/* Student docs */}
                        {item.artifactDataArray && item.artifactDataArray.length > 0 && (
                          <div className="mt-2 space-y-1">
                            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                              My Documents ({item.artifactDataArray.length})
                            </p>
                            {item.artifactDataArray.map((artifact, idx) => (
                              <button
                                key={idx}
                                onClick={() => setViewingArtifact(artifact.data)}
                                className={`text-xs hover:underline flex items-center gap-1 ${
                                  item.type === 'verified' ? 'text-emerald-700' :
                                  item.type === 'rejected' || item.type === 'revoked' ? 'text-red-700' : 'text-amber-700'
                                }`}
                              >
                                <FileText className="w-3 h-3" /> {artifact.filename}
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Issuer docs */}
                        {item.type === 'verified' &&
                          item.credential?.issuerAttachments?.length > 0 && (
                            <div className="mt-2 space-y-1">
                              <p className="text-[10px] font-semibold text-purple-600 uppercase tracking-wider">
                                Issuer Documents ({item.credential.issuerAttachments.length})
                              </p>
                              {item.credential.issuerAttachments.map((att: any, idx: number) => (
                                <button
                                  key={idx}
                                  onClick={() => setViewingArtifact(att.data)}
                                  className="text-xs text-purple-600 hover:underline flex items-center gap-1"
                                >
                                  <FileText className="w-3 h-3" /> {att.filename}
                                </button>
                              ))}
                            </div>
                          )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 shrink-0">
                        {(item.type === 'verified' || item.type === 'revoked') && (
                          <>
                            {item.type === 'verified' && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-blue-600 hover:text-blue-800 hover:bg-blue-100"
                                  onClick={() => setForwardingVC(item.credential)}
                                  title="Forward to Verifier"
                                >
                                  <Share2 className="w-3.5 h-3.5" />
                                </Button>
                                {item.issuerDid && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-accent"
                                    onClick={() =>
                                      setChatTarget({
                                        did: item.issuerDid!,
                                        name: item.issuer,
                                        contextLabel: `Re: ${item.credentialType ?? 'Credential'}`,
                                        contextRef: item.credential?.id,
                                      })
                                    }
                                    title="Message Issuer"
                                  >
                                    <MessageSquare className="w-3.5 h-3.5" />
                                  </Button>
                                )}
                              </>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className={`h-7 w-7 ${
                                item.type === 'revoked'
                                  ? 'text-red-500 hover:text-red-700 hover:bg-red-100'
                                  : 'text-emerald-700 hover:text-emerald-900 hover:bg-emerald-100'
                              }`}
                              onClick={() => handleCopyCredential(item.credential)}
                              title="Copy JSON"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </Button>
                          </>
                        )}
                        {item.type === 'pending' && (
                          <Loader2 className="w-4 h-4 text-amber-500 animate-spin" />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Activity Log */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Activity Log
        </h3>
        <div className="bg-gray-950 text-emerald-400 p-4 rounded-lg font-mono text-xs overflow-x-auto min-h-[80px]">
          {mySubmissions.length === 0 ? (
            <span className="text-gray-600">// No activity recorded</span>
          ) : (
            mySubmissions.map((tx, i) => (
              <div key={i} className="mb-1.5">
                <span className="text-gray-500">
                  [{new Date(tx.timestamp).toLocaleTimeString()}]
                </span>{' '}
                {tx.type} — Hash:{' '}
                <span className="text-emerald-300">{tx.dataHash.substring(0, 20)}…</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Forward Credential Dialog */}
      <Dialog open={!!forwardingVC} onOpenChange={(open) => !open && setForwardingVC(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Forward Credential</DialogTitle>
            <DialogDescription>
              Select a Verifier (Organization) to send{' '}
              <code className="text-xs">{forwardingVC?.id?.substring(0, 15)}…</code> directly.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Verifier search */}
            <div className="relative space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Find Verifier
              </label>
              <Input
                placeholder="Type name or DID…"
                value={verifierSearch}
                onChange={(e) => {
                  setVerifierSearch(e.target.value);
                  setShowVerifierSuggestions(true);
                  if (selectedVerifierDid) setSelectedVerifierDid('');
                }}
                onFocus={() => setShowVerifierSuggestions(true)}
              />
              {showVerifierSuggestions && verifierSearch && (
                <div className="absolute z-30 w-full mt-1 bg-popover border border-border rounded-xl shadow-xl max-h-[150px] overflow-y-auto">
                  {organizations
                    .filter(
                      (org) =>
                        org.profile.name.toLowerCase().includes(verifierSearch.toLowerCase()) ||
                        org.did.toLowerCase().includes(verifierSearch.toLowerCase())
                    )
                    .map((org) => (
                      <div
                        key={org.did}
                        className="p-3 hover:bg-accent cursor-pointer transition-colors border-b last:border-0"
                        onClick={() => {
                          setVerifierSearch(org.profile.name);
                          setSelectedVerifierDid(org.did);
                          setShowVerifierSuggestions(false);
                        }}
                      >
                        <p className="text-sm font-semibold">{org.profile.name}</p>
                        <p className="text-[10px] text-muted-foreground font-mono truncate">
                          {org.did}
                        </p>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* Message */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Attach a Message
              </label>
              <Textarea
                placeholder="Why are you sending this? (e.g. Job Application)"
                value={forwardMessage}
                onChange={(e) => setForwardMessage(e.target.value)}
                className="min-h-[80px]"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setForwardingVC(null);
                setForwardMessage('');
                setVerifierSearch('');
                setSelectedVerifierDid('');
                setShowVerifierSuggestions(false);
              }}
            >
              Cancel
            </Button>
            <Button
              disabled={!selectedVerifierDid}
              onClick={() => handleForwardCredential(selectedVerifierDid)}
              className="gap-2"
            >
              <Share2 className="w-4 h-4" />
              {selectedVerifierDid ? 'Confirm Forward' : 'Select a Verifier'}
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
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
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
        title="My Portfolio Artifact"
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
