import { create } from 'zustand';
import { MockBlockchainService, User, LedgerTransaction, Credential, StudentProfile, OrganizationProfile } from '../lib/mock-blockchain';

interface LedgerState {
    blockchain: MockBlockchainService;
    currentUser: User | null;
    currentView: 'HOLDER' | 'ISSUER' | 'VERIFIER' | 'HOME' | 'EXPLORER';

    // Reactive state copies for UI rendering
    ledger: LedgerTransaction[];
    didRegistry: Map<string, string>;
    users: User[];

    // Actions
    init: () => void;
    switchView: (view: 'HOLDER' | 'ISSUER' | 'VERIFIER' | 'HOME' | 'EXPLORER') => void;
    registerUser: (
        type: 'STUDENT' | 'ORGANIZATION',
        role: 'HOLDER' | 'ISSUER' | 'VERIFIER',
        profile: StudentProfile | OrganizationProfile
    ) => void;
    login: (did: string) => void;
    logout: () => void;
    switchOrganizationRole: (role: 'ISSUER' | 'VERIFIER') => void;
    submitPortfolio: (artifactDataArray: Array<{ data: string; filename: string }>, targetOrgDid: string, coverLetter?: string) => void;
    mintCredential: (
        holderDid: string,
        artifactHash: string,
        issuerAttachmentsArray?: Array<{ data: string; filename: string }>,
        credentialType?: string,
        metadata?: Record<string, string>,
        issuerNote?: string,
        expiryDate?: string
    ) => void;
    sendMessage: (toDid: string, content: string, contextRef?: string) => void;
    rejectSubmission: (holderDid: string, artifactHash: string, reason: string) => void;
    revokeCredential: (credentialId: string) => void;
    recordCredentialDecision: (credentialId: string, decision: 'ACCEPTED' | 'DECLINED', notes: string) => void;
    verifyCredential: (json: string) => { verified: boolean; reason?: string; issuer?: string };
    forwardCredential: (verifierDid: string, credential: Credential, message: string) => void;
    clearAndReset: () => void;

    // Helper to sync state from service
    sync: () => void;

    // Verification History Persistence
    verificationHistory: Array<{
        timestamp: number;
        result: { verified: boolean; reason?: string; issuer?: string };
        credential: any;
    }>;
    addVerificationHistory: (item: {
        timestamp: number;
        result: { verified: boolean; reason?: string; issuer?: string };
        credential: any;
    }) => void;
}

export const useLedgerStore = create<LedgerState>((set, get) => ({
    blockchain: new MockBlockchainService(),
    currentUser: null,
    currentView: 'HOME',
    ledger: [],
    didRegistry: new Map(),
    users: [],

    init: () => {
        get().sync();
    },

    sync: () => {
        const { blockchain } = get();
        set({
            ledger: blockchain.getLedger(),
            didRegistry: blockchain.getDIDRegistry(),
            users: blockchain.getUsers()
        });
    },

    switchView: (view) => {
        set((state) => {
            const isRoleMismatch =
                (view === 'HOLDER' && state.currentUser?.role !== 'HOLDER') ||
                (view === 'ISSUER' && state.currentUser?.role !== 'ISSUER') ||
                (view === 'VERIFIER' && state.currentUser?.role !== 'VERIFIER');

            return {
                currentView: view,
                currentUser: isRoleMismatch ? null : state.currentUser
            };
        });
    },

    registerUser: (type, role, profile) => {
        const { blockchain } = get();
        const user = blockchain.registerDID(type, role, profile);
        set({ currentUser: user });
        get().sync();
    },

    login: (did) => {
        const { users } = get();
        const user = users.find(u => u.did === did);
        if (user) {
            set({ currentUser: user, currentView: user.role });
        }
    },

    logout: () => {
        set({ currentUser: null, currentView: 'HOME' });
    },

    switchOrganizationRole: (role) => {
        const { currentUser } = get();
        if (currentUser && currentUser.type === 'ORGANIZATION') {
            set({
                currentUser: { ...currentUser, role },
                currentView: role as 'ISSUER' | 'VERIFIER'
            });
        }
    },

    submitPortfolio: (artifactDataArray, targetOrgDid, coverLetter?) => {
        const { blockchain, currentUser } = get();
        if (!currentUser || currentUser.role !== 'HOLDER') {
            console.error("Only Holders can submit portfolios");
            return;
        }
        blockchain.submitPortfolio(currentUser.did, artifactDataArray, targetOrgDid, coverLetter);
        get().sync();
    },

    mintCredential: (holderDid, artifactHash, issuerAttachmentsArray?, credentialType?, metadata?, issuerNote?, expiryDate?) => {
        const { blockchain, currentUser } = get();
        if (!currentUser || currentUser.role !== 'ISSUER') {
            console.error("Only Issuers can mint credentials");
            return;
        }
        blockchain.mintCredential(currentUser.did, holderDid, artifactHash, currentUser.privateKey, issuerAttachmentsArray, credentialType, metadata, issuerNote, expiryDate);
        get().sync();
    },

    sendMessage: (toDid, content, contextRef?) => {
        const { blockchain, currentUser } = get();
        if (!currentUser) return;
        blockchain.sendMessage(currentUser.did, toDid, content, contextRef);
        get().sync();
    },

    rejectSubmission: (holderDid, artifactHash, reason) => {
        const { blockchain, currentUser } = get();
        if (!currentUser || currentUser.role !== 'ISSUER') return;
        blockchain.rejectSubmission(currentUser.did, holderDid, artifactHash, reason);
        get().sync();
    },

    revokeCredential: (credentialId) => {
        const { blockchain, currentUser } = get();
        if (!currentUser || currentUser.role !== 'ISSUER') return;
        blockchain.revokeCredential(currentUser.did, credentialId);
        get().sync();
    },

    recordCredentialDecision: (credentialId, decision, notes) => {
        const { blockchain, currentUser } = get();
        if (!currentUser) return;
        blockchain.recordCredentialDecision(currentUser.did, credentialId, decision, notes);
        get().sync();
    },

    verifyCredential: (json) => {
        const { blockchain } = get();
        return blockchain.verifyCredential(json);
    },

    forwardCredential: (verifierDid, credential, message) => {
        const { blockchain, currentUser } = get();
        if (!currentUser || currentUser.role !== 'HOLDER') {
            console.error("Only Holders can forward credentials");
            return;
        }
        blockchain.forwardCredential(currentUser.did, verifierDid, credential, message);
        get().sync();
    },

    clearAndReset: () => {
        const { blockchain } = get();
        blockchain.clearStorage();
        // Recreate the blockchain instance to reinitialize with fresh mock data
        const freshBlockchain = new MockBlockchainService();
        set({
            blockchain: freshBlockchain,
            currentUser: null,
            currentView: 'HOME',
            verificationHistory: [],
        });
        get().sync();
    },

    verificationHistory: [],
    addVerificationHistory: (item) => {
        set((state) => ({
            verificationHistory: [item, ...state.verificationHistory]
        }));
    }
}));
