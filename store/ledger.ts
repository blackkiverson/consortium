import { create } from 'zustand';
import { MockBlockchainService, User, LedgerTransaction, Credential } from '../lib/mock-blockchain';

interface LedgerState {
    blockchain: MockBlockchainService;
    currentUser: User | null;
    currentView: 'HOLDER' | 'ISSUER' | 'VERIFIER' | 'HOME';

    // Reactive state copies for UI rendering
    ledger: LedgerTransaction[];
    didRegistry: Map<string, string>;
    users: User[];

    // Actions
    init: () => void;
    switchView: (view: 'HOLDER' | 'ISSUER' | 'VERIFIER' | 'HOME') => void;
    registerUser: (role: 'HOLDER' | 'ISSUER' | 'VERIFIER') => void;
    login: (did: string) => void;
    submitPortfolio: (artifactData: string) => void;
    mintCredential: (holderDid: string, artifactHash: string) => void;
    verifyCredential: (json: string) => { verified: boolean; reason?: string; issuer?: string };

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
        // Initialize with some dummy data or just ensure service is ready
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

    registerUser: (role) => {
        const { blockchain } = get();
        const user = blockchain.registerDID(role);
        set({ currentUser: user });
        get().sync();
    },

    login: (did) => {
        const { users } = get();
        const user = users.find(u => u.did === did);
        if (user) {
            set({ currentUser: user });
        }
    },

    submitPortfolio: (artifactData) => {
        const { blockchain, currentUser } = get();
        if (!currentUser || currentUser.role !== 'HOLDER') {
            console.error("Only Holders can submit portfolios");
            return;
        }
        blockchain.submitPortfolio(currentUser.did, artifactData);
        get().sync();
    },

    mintCredential: (holderDid, artifactHash) => {
        const { blockchain, currentUser } = get();
        if (!currentUser || currentUser.role !== 'ISSUER') {
            console.error("Only Issuers can mint credentials");
            return;
        }
        blockchain.mintCredential(currentUser.did, holderDid, artifactHash, currentUser.privateKey);
        get().sync();
    },

    verifyCredential: (json) => {
        const { blockchain } = get();
        return blockchain.verifyCredential(json);
    },

    verificationHistory: [],
    addVerificationHistory: (item) => {
        set((state) => ({
            verificationHistory: [item, ...state.verificationHistory]
        }));
    }
}));
