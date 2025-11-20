'use client';

import React from 'react';
import { useLedgerStore } from '../store/ledger';
import { Button, Card, CardContent, CardHeader, CardTitle } from './ui/components';
import { FileText, CheckCircle, ShieldCheck, User as UserIcon } from 'lucide-react';
import ArtifactViewer from './ArtifactViewer';

export default function IssuerDashboard() {
    const { currentUser, registerUser, mintCredential, ledger, users, login } = useLedgerStore();
    const [viewingArtifact, setViewingArtifact] = React.useState<string | null>(null);

    const existingIssuers = users.filter(u => u.role === 'ISSUER');

    if (!currentUser) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] space-y-8">
                <div className="text-center space-y-2">
                    <h2 className="text-2xl font-bold">University Admin Portal</h2>
                    <p className="text-gray-500">Authenticate as an Issuer to manage credentials.</p>
                </div>

                <Button onClick={() => registerUser('ISSUER')} className="gap-2">
                    <UserIcon className="w-4 h-4" />
                    Create New Registrar
                </Button>

                {existingIssuers.length > 0 && (
                    <div className="w-full max-w-md border-t pt-6">
                        <p className="text-sm text-gray-500 mb-4 text-center">Or login as existing registrar:</p>
                        <div className="space-y-2">
                            {existingIssuers.map(user => (
                                <div key={user.did} className="flex items-center justify-between p-3 bg-white border rounded-lg hover:bg-gray-50 cursor-pointer" onClick={() => login(user.did)}>
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 text-xs font-mono">
                                            {user.did.substring(15, 17)}
                                        </div>
                                        <div className="text-left">
                                            <p className="text-xs font-medium text-gray-900">Registrar</p>
                                            <p className="text-[10px] text-gray-500 font-mono">{user.did}</p>
                                        </div>
                                    </div>
                                    <Button variant="ghost" className="text-purple-600">Login</Button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // Find pending submissions (Portfolios that haven't been minted yet)
    // In a real app, we'd query the state more intelligently. 
    // Here: Find all PORTFOLIO_SUBMISSION txs.
    const submissions = ledger.filter(tx => tx.type === 'PORTFOLIO_SUBMISSION');

    // Find which ones we already minted (VC_ISSUANCE where we are the actor and holder matches)
    // This is a bit naive for the mock but works for the flow.
    const mintedHashes = new Set(
        ledger
            .filter(tx => tx.type === 'VC_ISSUANCE' && tx.actor === currentUser.did)
            .map(tx => tx.details?.holderDid + tx.details?.credential?.artifactHash) // Composite key to track what we minted
    );

    const pendingReviews = submissions.filter(tx => {
        const key = tx.actor + tx.details?.artifactHash;
        return !mintedHashes.has(key);
    });



    const handleMint = (holderDid: string, artifactHash: string) => {
        mintCredential(holderDid, artifactHash);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg border border-purple-100">
                <div>
                    <p className="text-sm font-medium text-purple-800">Issuer Authority:</p>
                    <code className="text-xs text-purple-600">{currentUser.did}</code>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Content - Pending Reviews */}
                <div className="lg:col-span-2">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <FileText className="w-5 h-5" />
                                Pending Portfolio Reviews
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {pendingReviews.length === 0 ? (
                                <p className="text-gray-500 text-sm text-center py-8">No pending submissions.</p>
                            ) : (
                                <div className="space-y-4">
                                    {pendingReviews.map((tx) => (
                                        <div key={`${tx.dataHash}-${tx.timestamp}`} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium text-gray-900">Student Portfolio</span>
                                                    <span className="text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-600">
                                                        {new Date(tx.timestamp).toLocaleDateString()}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-gray-500">Student DID: {tx.actor}</p>
                                                <p className="text-xs text-gray-500">Artifact Hash: {tx.dataHash.substring(0, 20)}...</p>
                                                <button
                                                    onClick={() => setViewingArtifact(tx.details?.artifactData)}
                                                    className="text-xs text-blue-600 hover:underline flex items-center gap-1 mt-1"
                                                >
                                                    <FileText className="w-3 h-3" /> View Artifact
                                                </button>
                                            </div>
                                            <Button
                                                onClick={() => handleMint(tx.actor, tx.dataHash)}
                                                className="gap-2 bg-purple-600 hover:bg-purple-700"
                                            >
                                                <ShieldCheck className="w-4 h-4" />
                                                Approve & Mint VC
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Side Panel - Issuance History */}
                <div className="lg:col-span-1">
                    <Card className="h-full">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-base">
                                <ShieldCheck className="w-4 h-4" />
                                Issuance History
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {ledger
                                    .filter(tx => tx.type === 'VC_ISSUANCE' && tx.actor === currentUser.did)
                                    .sort((a, b) => b.timestamp - a.timestamp)
                                    .map((tx) => (
                                        <div key={tx.dataHash} className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                                            <div className="flex justify-between items-start mb-2">
                                                <span className="text-xs font-medium text-purple-700">Verified Credential</span>
                                                <span className="text-[10px] text-gray-500">{new Date(tx.timestamp).toLocaleTimeString()}</span>
                                            </div>
                                            <p className="text-xs text-gray-600 mb-2 truncate" title={tx.details?.holderDid}>
                                                Holder: {tx.details?.holderDid}
                                            </p>

                                            {/* We need to find the original artifact data. 
                                                In our mock, we can find the submission by the artifactHash stored in the credential. 
                                            */}
                                            {(() => {
                                                const artifactHash = tx.details?.credential?.artifactHash;
                                                const submission = ledger.find(s => s.type === 'PORTFOLIO_SUBMISSION' && s.dataHash === artifactHash);

                                                return submission?.details?.artifactData ? (
                                                    <button
                                                        onClick={() => setViewingArtifact(submission.details.artifactData)}
                                                        className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                                                    >
                                                        <FileText className="w-3 h-3" /> View Artifact
                                                    </button>
                                                ) : null;
                                            })()}
                                        </div>
                                    ))}
                                {ledger.filter(tx => tx.type === 'VC_ISSUANCE' && tx.actor === currentUser.did).length === 0 && (
                                    <p className="text-gray-400 text-xs text-center italic">No credentials issued yet.</p>
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
                title="Review Student Portfolio"
            />
        </div>
    );
}
