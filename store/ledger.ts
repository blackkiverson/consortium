import { create } from 'zustand';
import { MockBlockchainService, User, LedgerTransaction, Credential, StudentProfile, OrganizationProfile } from '../lib/mock-blockchain';

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
    registerUser: (
        type: 'STUDENT' | 'ORGANIZATION',
        role: 'HOLDER' | 'ISSUER' | 'VERIFIER',
        profile: StudentProfile | OrganizationProfile
    ) => void;
    login: (did: string) => void;
    logout: () => void;
    switchOrganizationRole: (role: 'ISSUER' | 'VERIFIER') => void;
    submitPortfolio: (artifactDataArray: Array<{ data: string; filename: string }>, targetOrgDid: string) => void;
    mintCredential: (holderDid: string, artifactHash: string, issuerAttachmentsArray?: Array<{ data: string; filename: string }>) => void;
    verifyCredential: (json: string) => { verified: boolean; reason?: string; issuer?: string };
    forwardCredential: (verifierDid: string, credential: Credential, message: string) => void;

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
            set((state) => ({
                currentUser: { ...currentUser, role },
                currentView: role as 'ISSUER' | 'VERIFIER'
            }));
        }
    },

    submitPortfolio: (artifactDataArray, targetOrgDid) => {
        const { blockchain, currentUser } = get();
        if (!currentUser || currentUser.role !== 'HOLDER') {
            console.error("Only Holders can submit portfolios");
            return;
        }
        blockchain.submitPortfolio(currentUser.did, artifactDataArray, targetOrgDid);
        get().sync();
    },

    mintCredential: (holderDid, artifactHash, issuerAttachmentsArray?) => {
        const { blockchain, currentUser } = get();
        if (!currentUser || currentUser.role !== 'ISSUER') {
            console.error("Only Issuers can mint credentials");
            return;
        }
        blockchain.mintCredential(currentUser.did, holderDid, artifactHash, currentUser.privateKey, issuerAttachmentsArray);
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

    verificationHistory: [],
    addVerificationHistory: (item) => {
        set((state) => ({
            verificationHistory: [item, ...state.verificationHistory]
        }));
    }
}));
