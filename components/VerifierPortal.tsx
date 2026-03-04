'use client';

import React, { useState } from 'react';
import { useLedgerStore } from '../store/ledger';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { ScrollArea } from './ui/scroll-area';
import { Textarea } from './ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from './ui/dialog';
import {
  Search,
  CheckCircle,
  XCircle,
  Shield,
  FileText,
  Share,
  Key,
  Loader2,
  ThumbsUp,
  ThumbsDown,
  LogIn,
} from 'lucide-react';
import ArtifactViewer from './ArtifactViewer';

export default function VerifierPortal() {
  const {
    verifyCredential,
    recordCredentialDecision,
    currentUser,
    ledger,
    verificationHistory,
    addVerificationHistory,
    logout,
    switchView,
  } = useLedgerStore();

  const receivedCredentials = ledger
    .filter((tx) => tx.type === 'CREDENTIAL_FORWARD' && tx.details?.verifierDid === currentUser?.did)
    .sort((a, b) => b.timestamp - a.timestamp);

  const [jsonInput, setJsonInput] = useState('');
  const [verificationResult, setVerificationResult] = useState<{
    verified: boolean;
    reason?: string;
    issuer?: string;
  } | null>(null);
  const [viewingArtifact, setViewingArtifact] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);

  // Decision state
  const [decisionCredentialId, setDecisionCredentialId] = useState<string | null>(null);
  const [pendingDecision, setPendingDecision] = useState<'ACCEPTED' | 'DECLINED' | null>(null);
  const [decisionNotes, setDecisionNotes] = useState('');

  if (!currentUser) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4 text-center">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold">Verification Portal</h2>
          <p className="text-muted-foreground">Please log in to access the verifier portal.</p>
        </div>
        <Button onClick={() => { logout(); switchView('HOME'); }} className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
          <LogIn className="w-4 h-4" />
          Go to Login
        </Button>
      </div>
    );
  }

  // Build decision lookup: credentialId -> decision entry
  const decisionMap = new Map<string, { decision: string; notes: string; timestamp: number }>();
  ledger
    .filter((tx) => tx.type === 'CREDENTIAL_DECISION' && tx.actor === currentUser.did)
    .forEach((tx) => {
      const { credentialId, decision, notes } = tx.details ?? {};
      if (credentialId) {
        decisionMap.set(credentialId, { decision, notes, timestamp: tx.timestamp });
      }
    });

  const handleVerify = () => {
    if (!jsonInput.trim()) return;
    setVerifying(true);
    const result = verifyCredential(jsonInput);
    setVerificationResult(result);
    if (result.verified) {
      try {
        const credential = JSON.parse(jsonInput);
        addVerificationHistory({ timestamp: Date.now(), result, credential });
      } catch (e) {
        console.error('Failed to parse credential for history', e);
      }
    }
    setTimeout(() => setVerifying(false), 400);
  };

  const handleViewArtifact = (credentialJson?: string) => {
    const jsonToParse = credentialJson || jsonInput;
    if (!jsonToParse) return;
    try {
      const credential = JSON.parse(jsonToParse);
      const submission = ledger.find(
        (tx) => tx.type === 'PORTFOLIO_SUBMISSION' && tx.dataHash === credential.artifactHash
      );
      if (submission?.details?.artifactDataArray?.[0]) {
        setViewingArtifact(submission.details.artifactDataArray[0].data);
      } else if (submission?.details?.artifactData) {
        setViewingArtifact(submission.details.artifactData);
      } else {
        alert('Original artifact not found on ledger.');
      }
    } catch (e) {
      console.error('Error looking up artifact', e);
    }
  };

  const openDecisionDialog = (credentialId: string, decision: 'ACCEPTED' | 'DECLINED') => {
    setDecisionCredentialId(credentialId);
    setPendingDecision(decision);
    setDecisionNotes('');
  };

  const confirmDecision = () => {
    if (!decisionCredentialId || !pendingDecision) return;
    recordCredentialDecision(decisionCredentialId, pendingDecision, decisionNotes);
    setDecisionCredentialId(null);
    setPendingDecision(null);
    setDecisionNotes('');
  };

  return (
    <div className="space-y-6">
      {/* DID Banner */}
      <Alert variant="success" className="flex items-start gap-3">
        <Key className="w-4 h-4 mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <span className="text-sm font-semibold">Verifier Node</span>
          <code className="text-xs text-emerald-700 block mt-1 truncate">{currentUser.did}</code>
        </div>
      </Alert>

      {/* Top row: Received + Session History */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Received Credentials (2/3) */}
        <div className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <CardTitle className="flex items-center gap-2 text-base">
                <Share className="w-4 h-4" />
                Received Credentials
              </CardTitle>
              {receivedCredentials.length > 0 && (
                <Badge variant="blue">{receivedCredentials.length}</Badge>
              )}
            </CardHeader>
            <CardContent>
              {receivedCredentials.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <Share className="w-10 h-10 text-muted-foreground/40 mb-3" />
                  <p className="text-sm text-muted-foreground">No credentials received yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {receivedCredentials.map((tx) => {
                    const cred = tx.details?.credential;
                    const credId = cred?.id;
                    const existingDecision = credId ? decisionMap.get(credId) : undefined;
                    return (
                      <div key={tx.dataHash} className="border rounded-lg p-4 space-y-3">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="blue" className="text-[10px]">
                              Forwarded VC
                            </Badge>
                            {cred?.credentialType && (
                              <Badge variant="outline" className="text-[10px]">{cred.credentialType}</Badge>
                            )}
                            {existingDecision && (
                              <Badge
                                variant={existingDecision.decision === 'ACCEPTED' ? 'success' : 'destructive'}
                                className="text-[10px]"
                              >
                                {existingDecision.decision === 'ACCEPTED' ? '✓ Accepted' : '✗ Declined'}
                              </Badge>
                            )}
                            <span className="text-[10px] text-muted-foreground">
                              {new Date(tx.timestamp).toLocaleString()}
                            </span>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs h-7"
                            onClick={() => {
                              setJsonInput(JSON.stringify(cred, null, 2));
                              setTimeout(handleVerify, 100);
                            }}
                          >
                            Load for Verification
                          </Button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                              Sender (Student)
                            </p>
                            <p className="text-xs font-mono text-foreground truncate">{tx.actor}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                              Message
                            </p>
                            <p className="text-sm text-foreground italic">
                              &ldquo;{tx.details.message || 'No message attached.'}&rdquo;
                            </p>
                          </div>
                        </div>

                        {/* Credential metadata */}
                        {(cred?.issuerNote || cred?.expiryDate || (cred?.metadata && Object.keys(cred.metadata).length > 0)) && (
                          <div className="pt-2 border-t space-y-1">
                            {cred?.issuerNote && (
                              <p className="text-xs italic text-muted-foreground border-l-2 border-purple-300 pl-2">
                                {cred.issuerNote}
                              </p>
                            )}
                            {cred?.expiryDate && (
                              <p className="text-[10px] text-muted-foreground">
                                <span className="font-semibold">Expires:</span>{' '}
                                {new Date(cred.expiryDate).toLocaleDateString()}
                              </p>
                            )}
                            {cred?.metadata && Object.keys(cred.metadata).length > 0 && (
                              <div className="flex flex-wrap gap-x-3">
                                {Object.entries(cred.metadata).map(([k, v]) => (
                                  <span key={k} className="text-[10px] text-muted-foreground">
                                    <span className="font-semibold">{k}:</span> {v as string}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Artifacts */}
                        {(() => {
                          const submission = ledger.find(
                            (s) =>
                              s.type === 'PORTFOLIO_SUBMISSION' &&
                              s.dataHash === cred?.artifactHash
                          );
                          const artifacts = submission?.details?.artifactDataArray;
                          if (!artifacts) return null;
                          return (
                            <div className="flex flex-wrap gap-2 pt-2 border-t">
                              {artifacts.map((artifact: any, idx: number) => (
                                <Button
                                  key={idx}
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setViewingArtifact(artifact.data)}
                                  className="text-xs h-7 text-blue-600"
                                >
                                  <FileText className="w-3 h-3 mr-1" />
                                  {artifact.filename}
                                </Button>
                              ))}
                            </div>
                          );
                        })()}

                        {/* Decision buttons */}
                        {credId && (
                          <div className="pt-2 border-t flex gap-2">
                            {existingDecision ? (
                              <p className="text-xs text-muted-foreground italic">
                                Decision recorded: <span className="font-semibold">{existingDecision.decision}</span>
                                {existingDecision.notes && ` — "${existingDecision.notes}"`}
                              </p>
                            ) : (
                              <>
                                <Button
                                  size="sm"
                                  className="gap-1 bg-emerald-600 hover:bg-emerald-700 text-white h-7 text-xs"
                                  onClick={() => openDecisionDialog(credId, 'ACCEPTED')}
                                >
                                  <ThumbsUp className="w-3 h-3" /> Accept
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="gap-1 border-red-300 text-red-600 hover:bg-red-50 h-7 text-xs"
                                  onClick={() => openDecisionDialog(credId, 'DECLINED')}
                                >
                                  <ThumbsDown className="w-3 h-3" /> Decline
                                </Button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Session History (1/3) */}
        <div className="lg:col-span-1">
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Shield className="w-4 h-4" />
                Session History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {verificationHistory.length === 0 ? (
                <p className="text-muted-foreground text-xs text-center italic py-6">
                  No verifications this session.
                </p>
              ) : (
                <ScrollArea className="max-h-[360px]">
                  <div className="space-y-3 pr-2">
                    {verificationHistory.map((item, i) => (
                      <div key={i} className="p-3 bg-muted/40 rounded-lg border">
                        <div className="flex items-start justify-between mb-2">
                          <Badge variant="success" className="text-[10px]">
                            ✓ Verified
                          </Badge>
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(item.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground font-mono truncate mb-1">
                          {item.credential.holderDid}
                        </p>
                        {item.credential.credentialType && (
                          <Badge variant="outline" className="text-[10px] mb-1">{item.credential.credentialType}</Badge>
                        )}
                        {(() => {
                          const submission = ledger.find(
                            (tx) =>
                              tx.type === 'PORTFOLIO_SUBMISSION' &&
                              tx.dataHash === item.credential.artifactHash
                          );
                          return (
                            <div className="space-y-1 mt-1">
                              {submission?.details?.artifactDataArray?.map(
                                (artifact: any, idx: number) => (
                                  <button
                                    key={idx}
                                    onClick={() => setViewingArtifact(artifact.data)}
                                    className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                                  >
                                    <FileText className="w-3 h-3" /> {artifact.filename}
                                  </button>
                                )
                              )}
                              {item.credential.issuerAttachments?.map((att: any, idx: number) => (
                                <button
                                  key={idx}
                                  onClick={() => setViewingArtifact(att.data)}
                                  className="text-xs text-purple-600 hover:underline flex items-center gap-1"
                                >
                                  <FileText className="w-3 h-3" /> {att.filename}
                                </button>
                              ))}
                            </div>
                          );
                        })()}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Verification Tool */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Search className="w-4 h-4" />
            Credential Verification Tool
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Paste Verifiable Presentation (JSON)
            </label>
            <textarea
              className="flex min-h-[160px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm font-mono shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] disabled:cursor-not-allowed disabled:opacity-50"
              placeholder='{"id": "vc:...", "signature": "..."}'
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
            />
          </div>

          <Button
            onClick={handleVerify}
            disabled={!jsonInput || verifying}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
            size="lg"
          >
            {verifying ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
            Verify Credential
          </Button>

          {/* Result */}
          {verificationResult && (
            <Alert
              variant={verificationResult.verified ? 'success' : 'destructive'}
              className="mt-2"
            >
              <div className="flex items-start gap-3">
                {verificationResult.verified ? (
                  <CheckCircle className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <p className="font-semibold text-sm">
                    {verificationResult.verified ? 'Valid Credential' : 'Verification Failed'}
                  </p>
                  <AlertDescription className="mt-0.5">
                    {verificationResult.verified
                      ? `Issued by: ${verificationResult.issuer}`
                      : `Reason: ${verificationResult.reason}`}
                  </AlertDescription>

                  {verificationResult.verified &&
                    (() => {
                      try {
                        const credential = JSON.parse(jsonInput);
                        const submission = ledger.find(
                          (tx) =>
                            tx.type === 'PORTFOLIO_SUBMISSION' &&
                            tx.dataHash === credential.artifactHash
                        );
                        const issuerAttachments = credential.issuerAttachments;
                        return (
                          <div className="mt-3 space-y-3">
                            {/* Credential metadata */}
                            {(credential.credentialType || credential.issuerNote || credential.expiryDate || (credential.metadata && Object.keys(credential.metadata).length > 0)) && (
                              <div className="p-2 bg-emerald-50/50 dark:bg-emerald-950/20 rounded border border-emerald-200/50 space-y-1">
                                {credential.credentialType && (
                                  <p className="text-xs font-semibold text-emerald-700">
                                    Type: {credential.credentialType}
                                  </p>
                                )}
                                {credential.issuerNote && (
                                  <p className="text-xs italic text-muted-foreground border-l-2 border-emerald-300 pl-2">
                                    {credential.issuerNote}
                                  </p>
                                )}
                                {credential.expiryDate && (
                                  <p className="text-xs text-muted-foreground">
                                    <span className="font-semibold">Expires:</span>{' '}
                                    {new Date(credential.expiryDate).toLocaleDateString()}
                                  </p>
                                )}
                                {credential.metadata && Object.keys(credential.metadata).length > 0 && (
                                  <div className="flex flex-wrap gap-x-3">
                                    {Object.entries(credential.metadata).map(([k, v]) => (
                                      <span key={k} className="text-xs text-muted-foreground">
                                        <span className="font-semibold">{k}:</span> {v as string}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}

                            {submission?.details?.artifactDataArray &&
                              submission.details.artifactDataArray.length > 0 && (
                                <div>
                                  <p className="text-xs font-semibold text-emerald-700 mb-2">
                                    Student Documents ({submission.details.artifactDataArray.length}):
                                  </p>
                                  <div className="flex flex-wrap gap-2">
                                    {submission.details.artifactDataArray.map(
                                      (artifact: any, idx: number) => (
                                        <Button
                                          key={idx}
                                          variant="outline"
                                          size="sm"
                                          onClick={() => setViewingArtifact(artifact.data)}
                                          className="text-xs h-7 text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                                        >
                                          <FileText className="w-3 h-3 mr-1" />
                                          {artifact.filename}
                                        </Button>
                                      )
                                    )}
                                  </div>
                                </div>
                              )}
                            {issuerAttachments && issuerAttachments.length > 0 && (
                              <div>
                                <p className="text-xs font-semibold text-purple-700 mb-2">
                                  Issuer Documents ({issuerAttachments.length}):
                                </p>
                                <div className="flex flex-wrap gap-2">
                                  {issuerAttachments.map((att: any, idx: number) => (
                                    <Button
                                      key={idx}
                                      variant="outline"
                                      size="sm"
                                      onClick={() => setViewingArtifact(att.data)}
                                      className="text-xs h-7 text-purple-700 border-purple-300 hover:bg-purple-50"
                                    >
                                      <FileText className="w-3 h-3 mr-1" />
                                      {att.filename}
                                    </Button>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      } catch {
                        return (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewArtifact()}
                            className="mt-2 text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                          >
                            <FileText className="w-3 h-3 mr-1" />
                            View Original Artifact
                          </Button>
                        );
                      }
                    })()}
                </div>
              </div>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Decision Dialog */}
      <Dialog open={!!decisionCredentialId} onOpenChange={(open) => !open && setDecisionCredentialId(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className={pendingDecision === 'ACCEPTED' ? 'text-emerald-600' : 'text-red-600'}>
              {pendingDecision === 'ACCEPTED' ? '✓ Accept Credential' : '✗ Decline Credential'}
            </DialogTitle>
            <DialogDescription>
              {pendingDecision === 'ACCEPTED'
                ? 'You are accepting this credential. Add optional notes.'
                : 'You are declining this credential. Please provide a reason.'}
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Textarea
              placeholder={pendingDecision === 'ACCEPTED' ? 'Notes (optional)…' : 'Reason for declining…'}
              value={decisionNotes}
              onChange={(e) => setDecisionNotes(e.target.value)}
              className="min-h-[80px]"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDecisionCredentialId(null)}>
              Cancel
            </Button>
            <Button
              className={pendingDecision === 'ACCEPTED'
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white gap-2'
                : 'gap-2'}
              variant={pendingDecision === 'DECLINED' ? 'destructive' : 'default'}
              onClick={confirmDecision}
            >
              {pendingDecision === 'ACCEPTED'
                ? <><ThumbsUp className="w-4 h-4" /> Confirm Accept</>
                : <><ThumbsDown className="w-4 h-4" /> Confirm Decline</>
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ArtifactViewer
        isOpen={!!viewingArtifact}
        onClose={() => setViewingArtifact(null)}
        artifactData={viewingArtifact}
        title="Verified Artifact"
      />
    </div>
  );
}
