'use client';

import React, { useState } from 'react';
import { useLedgerStore } from '../store/ledger';
import { Button, Card, CardContent, CardHeader, CardTitle, Input } from './ui/components';
import { Search, CheckCircle, XCircle, Shield, FileText } from 'lucide-react';
import ArtifactViewer from './ArtifactViewer';

export default function VerifierPortal() {
    const { verifyCredential, registerUser, currentUser, users, login, ledger, verificationHistory, addVerificationHistory } = useLedgerStore();
    const [jsonInput, setJsonInput] = useState('');
    const [verificationResult, setVerificationResult] = useState<{ verified: boolean; reason?: string; issuer?: string } | null>(null);
    const [viewingArtifact, setViewingArtifact] = useState<string | null>(null);

    const existingVerifiers = users.filter(u => u.role === 'VERIFIER');

    if (!currentUser) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] space-y-8">
                <div className="text-center space-y-2">
                    <h2 className="text-2xl font-bold">Verification Portal</h2>
                    <p className="text-gray-500">Access the public ledger to verify credentials.</p>
                </div>

                <Button onClick={() => registerUser('VERIFIER')} className="gap-2 bg-green-600 hover:bg-green-700">
                    <Shield className="w-4 h-4" />
                    Enter Portal
                </Button>

                {existingVerifiers.length > 0 && (
                    <div className="w-full max-w-md border-t pt-6">
                        <p className="text-sm text-gray-500 mb-4 text-center">Or login as existing verifier:</p>
                        <div className="space-y-2">
                            {existingVerifiers.map(user => (
                                <div key={user.did} className="flex items-center justify-between p-3 bg-white border rounded-lg hover:bg-gray-50 cursor-pointer" onClick={() => login(user.did)}>
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-green-600 text-xs font-mono">
                                            {user.did.substring(15, 17)}
                                        </div>
                                        <div className="text-left">
                                            <p className="text-xs font-medium text-gray-900">Verifier</p>
                                            <p className="text-[10px] text-gray-500 font-mono">{user.did}</p>
                                        </div>
                                    </div>
                                    <Button variant="ghost" className="text-green-600">Login</Button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    }

    const handleVerify = () => {
        if (!jsonInput.trim()) return;
        const result = verifyCredential(jsonInput);
        setVerificationResult(result);

        if (result.verified) {
            try {
                const credential = JSON.parse(jsonInput);
                addVerificationHistory({
                    timestamp: Date.now(),
                    result,
                    credential
                });
            } catch (e) {
                console.error("Failed to parse credential for history", e);
            }
        }
    };

    const handleViewArtifact = (credentialJson?: string) => {
        const jsonToParse = credentialJson || jsonInput;
        if (!jsonToParse) return;

        try {
            const credential = JSON.parse(jsonToParse);
            const artifactHash = credential.artifactHash; // This matches the Credential interface

            // Find the original submission to get the data
            // Note: In our mock, the dataHash of the PORTFOLIO_SUBMISSION is the artifactHash
            const submission = ledger.find(tx =>
                tx.type === 'PORTFOLIO_SUBMISSION' &&
                tx.dataHash === artifactHash
            );

            if (submission?.details?.artifactData) {
                setViewingArtifact(submission.details.artifactData);
            } else {
                alert("Original artifact data not found on ledger (might be off-chain only).");
            }
        } catch (e) {
            console.error("Error parsing credential for artifact lookup", e);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-100">
                <div>
                    <p className="text-sm font-medium text-green-800">Verifier Node:</p>
                    <code className="text-xs text-green-600">{currentUser.did}</code>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Content - Verification Tool */}
                <div className="lg:col-span-2">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Search className="w-5 h-5" />
                                Credential Verification Tool
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Paste Verifiable Presentation (JSON)
                                </label>
                                <textarea
                                    className="w-full h-40 p-3 rounded-md border border-gray-300 font-mono text-xs focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                    placeholder='{"id": "vc:...", "signature": "..."}'
                                    value={jsonInput}
                                    onChange={(e) => setJsonInput(e.target.value)}
                                />
                            </div>
                            <Button
                                onClick={handleVerify}
                                className="w-full bg-green-600 hover:bg-green-700"
                                disabled={!jsonInput}
                            >
                                Verify Credential
                            </Button>

                            {verificationResult && (
                                <div className={`mt-6 p-4 rounded-lg border ${verificationResult.verified ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                                    <div className="flex items-center gap-3">
                                        {verificationResult.verified ? (
                                            <CheckCircle className="w-8 h-8 text-green-600" />
                                        ) : (
                                            <XCircle className="w-8 h-8 text-red-600" />
                                        )}
                                        <div className="flex-1">
                                            <h4 className={`text-lg font-bold ${verificationResult.verified ? 'text-green-900' : 'text-red-900'}`}>
                                                {verificationResult.verified ? 'Valid Credential' : 'Verification Failed'}
                                            </h4>
                                            <p className={`text-sm ${verificationResult.verified ? 'text-green-700' : 'text-red-700'}`}>
                                                {verificationResult.verified
                                                    ? `Issued by: ${verificationResult.issuer}`
                                                    : `Reason: ${verificationResult.reason}`
                                                }
                                            </p>
                                            {verificationResult.verified && (() => {
                                                try {
                                                    const credential = JSON.parse(jsonInput);
                                                    const artifactHash = credential.artifactHash;
                                                    const submission = ledger.find(tx =>
                                                        tx.type === 'PORTFOLIO_SUBMISSION' &&
                                                        tx.dataHash === artifactHash
                                                    );
                                                    const issuerAttachments = credential.issuerAttachments;

                                                    return (
                                                        <div className="mt-3 space-y-3">
                                                            {submission?.details?.artifactDataArray && submission.details.artifactDataArray.length > 0 && (
                                                                <div>
                                                                    <p className="text-xs font-medium text-green-700 mb-2">Student Documents ({submission.details.artifactDataArray.length}):</p>
                                                                    <div className="space-y-1">
                                                                        {submission.details.artifactDataArray.map((artifact: any, idx: number) => (
                                                                            <Button
                                                                                key={idx}
                                                                                variant="outline"
                                                                                onClick={() => setViewingArtifact(artifact.data)}
                                                                                className="text-green-700 border-green-300 hover:bg-green-100 w-full justify-start"
                                                                            >
                                                                                <FileText className="w-4 h-4 mr-2" />
                                                                                {artifact.filename}
                                                                            </Button>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}
                                                            {issuerAttachments && issuerAttachments.length > 0 && (
                                                                <div>
                                                                    <p className="text-xs font-medium text-purple-700 mb-2">Issuer Documents ({issuerAttachments.length}):</p>
                                                                    <div className="space-y-1">
                                                                        {issuerAttachments.map((attachment: any, idx: number) => (
                                                                            <Button
                                                                                key={idx}
                                                                                variant="outline"
                                                                                onClick={() => setViewingArtifact(attachment.data)}
                                                                                className="text-purple-700 border-purple-300 hover:bg-purple-100 w-full justify-start"
                                                                            >
                                                                                <FileText className="w-4 h-4 mr-2" />
                                                                                {attachment.filename}
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
                                                            onClick={() => handleViewArtifact()}
                                                            className="mt-2 text-green-700 border-green-300 hover:bg-green-100"
                                                        >
                                                            <FileText className="w-4 h-4 mr-2" />
                                                            View Original Artifact
                                                        </Button>
                                                    );
                                                }
                                            })()}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Side Panel - Verification History */}
                <div className="lg:col-span-1">
                    <Card className="h-full">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-base">
                                <Shield className="w-4 h-4" />
                                Session History
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {verificationHistory.map((item, i) => (
                                    <div key={i} className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="text-xs font-medium text-green-700">Verified Success</span>
                                            <span className="text-[10px] text-gray-500">{new Date(item.timestamp).toLocaleTimeString()}</span>
                                        </div>
                                        <p className="text-xs text-gray-600 mb-2 truncate" title={item.credential.holderDid}>
                                            Holder: {item.credential.holderDid}
                                        </p>
                                        <div className="space-y-1">
                                            {(() => {
                                                const artifactHash = item.credential.artifactHash;
                                                const submission = ledger.find(tx =>
                                                    tx.type === 'PORTFOLIO_SUBMISSION' &&
                                                    tx.dataHash === artifactHash
                                                );
                                                const issuerAttachments = item.credential.issuerAttachments;

                                                return (
                                                    <>
                                                        {submission?.details?.artifactDataArray && submission.details.artifactDataArray.length > 0 && (
                                                            <div className="space-y-1">
                                                                <p className="text-xs font-medium text-blue-700">Student Docs ({submission.details.artifactDataArray.length}):</p>
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
                                                        )}
                                                        {issuerAttachments && issuerAttachments.length > 0 && (
                                                            <div className="space-y-1">
                                                                <p className="text-xs font-medium text-purple-700">Issuer Docs ({issuerAttachments.length}):</p>
                                                                {issuerAttachments.map((attachment: any, idx: number) => (
                                                                    <button
                                                                        key={idx}
                                                                        onClick={() => setViewingArtifact(attachment.data)}
                                                                        className="text-xs text-purple-600 hover:underline flex items-center gap-1"
                                                                    >
                                                                        <FileText className="w-3 h-3" /> {attachment.filename}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </>
                                                );
                                            })()}
                                        </div>
                                    </div>
                                ))}
                                {verificationHistory.length === 0 && (
                                    <p className="text-gray-400 text-xs text-center italic">No verifications this session.</p>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            <ArtifactViewer
                isOpen={!!viewingArtifact}
                onClose={() => setViewingArtifact(null)}
                artifactData={viewingArtifact}
                title="Verified Artifact"
            />
        </div>
    );
}
