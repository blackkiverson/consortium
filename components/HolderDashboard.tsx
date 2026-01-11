'use client';

import React, { useState } from 'react';
import { useLedgerStore } from '../store/ledger';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Textarea } from './ui/components';
import { Upload, FileText, CheckCircle, Share2, Wallet } from 'lucide-react';
import ArtifactViewer from './ArtifactViewer';

export default function HolderDashboard() {
    const { currentUser, registerUser, submitPortfolio, ledger, users, login, forwardCredential } = useLedgerStore();
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

    const existingHolders = users.filter(u => u.role === 'HOLDER');

    if (!currentUser) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] space-y-8">
                <div className="text-center space-y-2">
                    <h2 className="text-2xl font-bold">Student Portal</h2>
                    <p className="text-gray-500">Generate your Decentralized Identity to begin.</p>
                </div>

                <Button onClick={() => registerUser('STUDENT', 'HOLDER', { name: 'New Student', dob: '', email: '' })} className="gap-2">
                    <Wallet className="w-4 h-4" />
                    Generate New DID
                </Button>

                {existingHolders.length > 0 && (
                    <div className="w-full max-w-md border-t pt-6">
                        <p className="text-sm text-gray-500 mb-4 text-center">Or login as existing user:</p>
                        <div className="space-y-2">
                            {existingHolders.map(user => (
                                <div key={user.did} className="flex items-center justify-between p-3 bg-white border rounded-lg hover:bg-gray-50 cursor-pointer" onClick={() => login(user.did)}>
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-xs font-mono">
                                            {user.did.substring(15, 17)}
                                        </div>
                                        <div className="text-left">
                                            <p className="text-xs font-medium text-gray-900">Student</p>
                                            <p className="text-[10px] text-gray-500 font-mono">{user.did}</p>
                                        </div>
                                    </div>
                                    <Button variant="ghost" className="text-blue-600">Login</Button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setFiles(Array.from(e.target.files));
        }
    };

    const handleRemoveFile = (index: number) => {
        setFiles(files.filter((_, i) => i !== index));
    };

    const handleSubmit = async () => {
        if (files.length === 0 || !selectedOrgDid) return;
        setUploadStatus('uploading');

        // Read all files
        const filePromises = files.map(file => {
            return new Promise<{ data: string; filename: string }>((resolve) => {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const content = e.target?.result as string;
                    resolve({ data: content, filename: file.name });
                };
                reader.readAsDataURL(file);
            });
        });

        const artifactDataArray = await Promise.all(filePromises);
        submitPortfolio(artifactDataArray, selectedOrgDid);
        setUploadStatus('success');
        setTimeout(() => setUploadStatus('idle'), 2000);
        setFiles([]);
        setSelectedOrgDid('');
        setOrgSearchTerm('');
    };

    const handleCopyCredential = (credential: any) => {
        const json = JSON.stringify(credential, null, 2);
        navigator.clipboard.writeText(json);
        alert("Credential JSON copied to clipboard!");
    };

    const handleForwardCredential = (verifierDid: string) => {
        if (!forwardingVC) return;
        forwardCredential(verifierDid, forwardingVC, forwardMessage);
        alert(`Credential ${forwardingVC.id.substring(0, 10)}... forwarded successfully!`);
        setForwardingVC(null);
        setForwardMessage('');
        setVerifierSearch('');
        setSelectedVerifierDid('');
        setShowVerifierSuggestions(false);
    };

    const organizations = users.filter(u => u.type === 'ORGANIZATION');
    const filteredOrgs = organizations.filter(o =>
        (o.profile as any).name.toLowerCase().includes(orgSearchTerm.toLowerCase()) ||
        o.did.toLowerCase().includes(orgSearchTerm.toLowerCase())
    );

    const filteredVerifiers = organizations.filter(o =>
        (o.profile as any).name.toLowerCase().includes(verifierSearch.toLowerCase()) ||
        o.did.toLowerCase().includes(verifierSearch.toLowerCase())
    );



    // Filter transactions for this user
    const mySubmissions = ledger.filter(tx => tx.type === 'PORTFOLIO_SUBMISSION' && tx.actor === currentUser.did);
    const myCredentials = ledger.filter(tx => tx.type === 'VC_ISSUANCE' && tx.details?.holderDid === currentUser.did);

    // Create a unified list of items to display
    // We want to show:
    // 1. Pending submissions (submitted but not yet minted)
    // 2. Verified credentials (minted)

    // Helper to check if a submission has been minted
    const isMinted = (submissionHash: string) => {
        return myCredentials.some(vc => vc.details?.credential?.artifactHash === submissionHash);
    };

    interface DisplayItem {
        type: 'pending' | 'verified';
        id: string;
        timestamp: number;
        artifactDataArray?: Array<{ data: string; filename: string }>;
        title: string;
        issuer: string;
        credential?: any;
    }

    const displayItems: DisplayItem[] = [
        // Pending items: Submissions that are NOT in the minted list
        ...mySubmissions
            .filter(sub => !isMinted(sub.dataHash))
            .map(sub => ({
                type: 'pending' as const,
                id: sub.dataHash,
                timestamp: sub.timestamp,
                artifactDataArray: sub.details?.artifactDataArray,
                title: 'Pending Review',
                issuer: 'Waiting for Issuer...'
            })),
        // Verified items: The actual credentials
        ...myCredentials.map(vc => ({
            type: 'verified' as const,
            id: vc.dataHash,
            timestamp: vc.timestamp,
            artifactDataArray: mySubmissions.find(s => s.dataHash === vc.details?.credential?.artifactHash)?.details?.artifactDataArray,
            title: 'Verified Credential',
            issuer: `Issuer: ${vc.actor.substring(0, 20)}...`,
            credential: vc.details.credential
        }))
    ].sort((a, b) => b.timestamp - a.timestamp); // Newest first

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-100">
                <div>
                    <p className="text-sm font-medium text-blue-800">Logged in as:</p>
                    <code className="text-xs text-blue-600">{currentUser.did}</code>
                </div>
                <div className="text-right">
                    <p className="text-xs text-gray-500">Public Key</p>
                    <code className="text-xs text-gray-400 block w-32 truncate">{currentUser.publicKey}</code>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                {/* Portfolio Submission */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Upload className="w-5 h-5" />
                            Submit Portfolio
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:bg-gray-50 transition-colors">
                            <Input
                                type="file"
                                onChange={handleFileChange}
                                className="hidden"
                                id="portfolio-upload"
                                multiple
                            />
                            <label htmlFor="portfolio-upload" className="cursor-pointer flex flex-col items-center gap-2">
                                <FileText className="w-8 h-8 text-gray-400" />
                                <span className="text-sm text-gray-600">
                                    {files.length > 0 ? `${files.length} file(s) selected` : "Click to upload documents (multiple allowed)"}
                                </span>
                            </label>
                        </div>
                        {files.length > 0 && (
                            <div className="space-y-2">
                                {files.map((f, index) => (
                                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded border">
                                        <span className="text-xs text-gray-700 truncate flex-1">{f.name}</span>
                                        <button
                                            onClick={() => handleRemoveFile(index)}
                                            className="text-xs text-red-600 hover:text-red-800 ml-2"
                                        >
                                            Remove
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="space-y-2 relative">
                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Search Organization to Send To</label>
                            <Input
                                placeholder="Type Name or DID..."
                                value={orgSearchTerm}
                                onChange={(e) => {
                                    setOrgSearchTerm(e.target.value);
                                    setShowSuggestions(true);
                                    if (selectedOrgDid) setSelectedOrgDid('');
                                }}
                                onFocus={() => setShowSuggestions(true)}
                            />
                            {showSuggestions && orgSearchTerm && (
                                <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl max-h-[200px] overflow-y-auto">
                                    {filteredOrgs.map(org => (
                                        <div
                                            key={org.did}
                                            className="p-3 hover:bg-blue-50 cursor-pointer transition-colors border-b last:border-0 text-left"
                                            onClick={() => {
                                                setOrgSearchTerm((org.profile as any).name);
                                                setSelectedOrgDid(org.did);
                                                setShowSuggestions(false);
                                            }}
                                        >
                                            <p className="text-sm font-bold text-gray-900">{(org.profile as any).name}</p>
                                            <p className="text-[10px] text-gray-500 font-mono">{org.did}</p>
                                        </div>
                                    ))}
                                    {filteredOrgs.length === 0 && (
                                        <p className="p-4 text-xs text-center text-gray-400">No organizations found</p>
                                    )}
                                </div>
                            )}
                            {selectedOrgDid && !showSuggestions && (
                                <div className="flex items-center gap-2 mt-2 px-3 py-2 bg-blue-50 border border-blue-100 rounded-lg">
                                    <CheckCircle className="w-4 h-4 text-blue-600" />
                                    <span className="text-xs font-medium text-blue-800">Selected: {(organizations.find(o => o.did === selectedOrgDid)?.profile as any)?.name}</span>
                                </div>
                            )}
                        </div>

                        <Button
                            className="w-full"
                            disabled={files.length === 0 || !selectedOrgDid || uploadStatus === 'uploading'}
                            onClick={handleSubmit}
                        >
                            {uploadStatus === 'uploading' ? 'Hashing & Submitting...' : 'Submit to Ledger'}
                        </Button>
                        {uploadStatus === 'success' && (
                            <p className="text-green-600 text-sm text-center flex items-center justify-center gap-1">
                                <CheckCircle className="w-4 h-4" /> Transaction Recorded
                            </p>
                        )}
                    </CardContent>
                </Card>

                {/* Wallet */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Wallet className="w-5 h-5" />
                            My Credentials
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {displayItems.length === 0 ? (
                            <p className="text-gray-500 text-sm text-center py-8">No activity yet.</p>
                        ) : (
                            <div className="space-y-3">
                                {displayItems.map((item) => (
                                    <div
                                        key={item.id}
                                        className={`p-3 border rounded-md ${item.type === 'verified'
                                            ? 'bg-green-50 border-green-100'
                                            : 'bg-yellow-50 border-yellow-100'
                                            }`}
                                    >
                                        <div className="flex justify-between items-start">
                                            <div className="flex-1">
                                                <h4 className={`font-medium ${item.type === 'verified' ? 'text-green-900' : 'text-yellow-800'
                                                    }`}>
                                                    {item.title}
                                                </h4>
                                                <p className={`text-xs mt-1 ${item.type === 'verified' ? 'text-green-700' : 'text-yellow-700'
                                                    }`}>
                                                    {item.issuer}
                                                </p>
                                                <div className="mt-2 space-y-1">
                                                    {item.artifactDataArray && item.artifactDataArray.length > 0 && (
                                                        <div className="space-y-1">
                                                            <p className="text-xs font-medium text-gray-600">My Documents ({item.artifactDataArray.length}):</p>
                                                            {item.artifactDataArray.map((artifact, idx) => (
                                                                <button
                                                                    key={idx}
                                                                    onClick={() => setViewingArtifact(artifact.data)}
                                                                    className={`text-xs hover:underline flex items-center gap-1 ${item.type === 'verified' ? 'text-green-600' : 'text-yellow-600'
                                                                        }`}
                                                                >
                                                                    <FileText className="w-3 h-3" /> {artifact.filename}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}
                                                    {item.type === 'verified' && item.credential?.issuerAttachments && item.credential.issuerAttachments.length > 0 && (
                                                        <div className="space-y-1 mt-2">
                                                            <p className="text-xs font-medium text-purple-600">Issuer Documents ({item.credential.issuerAttachments.length}):</p>
                                                            {item.credential.issuerAttachments.map((attachment: any, idx: number) => (
                                                                <button
                                                                    key={idx}
                                                                    onClick={() => setViewingArtifact(attachment.data)}
                                                                    className="text-xs hover:underline flex items-center gap-1 text-purple-600"
                                                                >
                                                                    <FileText className="w-3 h-3" /> {attachment.filename}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                {item.type === 'verified' && (
                                                    <div className="flex gap-1">
                                                        <Button
                                                            variant="ghost"
                                                            className="h-8 w-8 p-0 text-blue-600 hover:text-blue-800 hover:bg-blue-100"
                                                            onClick={() => setForwardingVC(item.credential)}
                                                            title="Forward to Verifier"
                                                        >
                                                            <Share2 className="w-4 h-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            className="h-8 w-8 p-0 text-green-700 hover:text-green-900 hover:bg-green-200"
                                                            onClick={() => handleCopyCredential(item.credential)}
                                                            title="Copy JSON"
                                                        >
                                                            <FileText className="w-4 h-4" />
                                                        </Button>
                                                        <CheckCircle className="w-5 h-5 text-green-600 mt-1.5" />
                                                    </div>
                                                )}
                                                {item.type === 'pending' && (
                                                    <div className="w-5 h-5 rounded-full border-2 border-yellow-400 border-t-transparent animate-spin mt-1.5" />
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

            {/* Audit Log Preview */}
            <div className="mt-8">
                <h3 className="text-lg font-semibold mb-4">My Activity Log</h3>
                <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-xs overflow-x-auto">
                    {mySubmissions.map((tx, i) => (
                        <div key={i} className="mb-2">
                            <span className="text-gray-500">[{new Date(tx.timestamp).toLocaleTimeString()}]</span> {tx.type} - Hash: {tx.dataHash.substring(0, 20)}...
                        </div>
                    ))}
                    {mySubmissions.length === 0 && <span className="text-gray-600">// No activity recorded</span>}
                </div>
            </div>

            {/* Forwarding Modal */}
            {forwardingVC && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
                        <h3 className="text-xl font-bold mb-4">Forward Credential</h3>
                        <p className="text-sm text-gray-500 mb-4">Select a Verifier (Organization) to send your {forwardingVC.id.substring(0, 10)}... directly.</p>

                        <div className="relative mb-4">
                            <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Find Verifier</label>
                            <Input
                                placeholder="Type Name or DID..."
                                value={verifierSearch}
                                onChange={(e) => {
                                    setVerifierSearch(e.target.value);
                                    setShowVerifierSuggestions(true);
                                    if (selectedVerifierDid) setSelectedVerifierDid('');
                                }}
                                onFocus={() => setShowVerifierSuggestions(true)}
                                className="mb-1"
                            />
                            {showVerifierSuggestions && verifierSearch && (
                                <div className="absolute z-30 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl max-h-[150px] overflow-y-auto">
                                    {organizations
                                        .filter(org =>
                                            org.profile.name.toLowerCase().includes(verifierSearch.toLowerCase()) ||
                                            org.did.toLowerCase().includes(verifierSearch.toLowerCase())
                                        )
                                        .map(org => (
                                            <div
                                                key={org.did}
                                                className="p-3 hover:bg-blue-50 cursor-pointer transition-colors border-b last:border-0 text-left"
                                                onClick={() => {
                                                    setVerifierSearch(org.profile.name);
                                                    setSelectedVerifierDid(org.did);
                                                    setShowVerifierSuggestions(false);
                                                }}
                                            >
                                                <p className="text-sm font-bold text-gray-900">{org.profile.name}</p>
                                                <p className="text-[10px] text-gray-500 font-mono truncate">{org.did}</p>
                                            </div>
                                        ))
                                    }
                                </div>
                            )}
                        </div>

                        <div className="mb-4">
                            <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Attach a Message</label>
                            <Textarea
                                placeholder="Why are you sending this? (e.g. Job Application)"
                                value={forwardMessage}
                                onChange={(e) => setForwardMessage(e.target.value)}
                                className="min-h-[80px]"
                            />
                        </div>

                        <div className="space-y-3">
                            <Button
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-6"
                                disabled={!selectedVerifierDid}
                                onClick={() => handleForwardCredential(selectedVerifierDid)}
                            >
                                <Share2 className="w-4 h-4 mr-2" />
                                {selectedVerifierDid ? `Confirm Forward` : 'Select a Verifier'}
                            </Button>

                            <Button
                                variant="outline"
                                className="w-full"
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
                        </div>
                    </div>
                </div>
            )}

            <ArtifactViewer
                isOpen={!!viewingArtifact}
                onClose={() => setViewingArtifact(null)}
                artifactData={viewingArtifact}
                title="My Portfolio Artifact"
            />
        </div>
    );
}
