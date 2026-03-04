import { generateKeyPair, hashData, signData, verifySignature } from './crypto';

export interface StudentProfile {
    name: string;
    dob: string;
    email: string;
}

export interface OrganizationProfile {
    name: string;
    address: string;
    registrationId: string;
}

export interface User {
    did: string;
    type: 'STUDENT' | 'ORGANIZATION';
    role: 'HOLDER' | 'ISSUER' | 'VERIFIER';
    publicKey: string;
    privateKey: string;
    profile: StudentProfile | OrganizationProfile;
}

export interface Credential {
    id: string;
    issuerDid: string;
    holderDid: string;
    artifactHash: string;
    issuanceDate: string;
    signature: string;
    payload?: any;
    issuerAttachments?: Array<{
        data: string;
        filename: string;
        timestamp: number;
    }>;
    credentialType?: string;
    metadata?: Record<string, string>;
    issuerNote?: string;
    expiryDate?: string;
}

export interface LedgerTransaction {
    type: 'DID_REGISTRATION' | 'PORTFOLIO_SUBMISSION' | 'PORTFOLIO_REJECTION' | 'VC_ISSUANCE' | 'VC_REVOCATION' | 'CREDENTIAL_FORWARD' | 'CREDENTIAL_DECISION' | 'CHAT_MESSAGE';
    timestamp: number;
    dataHash: string;
    actor: string;
    details?: any;
}

export class MockBlockchainService {
    private ledger: LedgerTransaction[] = [];
    private didRegistry: Map<string, string> = new Map();
    private credentialRegistry: Map<string, Credential> = new Map();
    private users: Map<string, User> = new Map();
    private revokedCredentials: Set<string> = new Set();

    private readonly STORAGE_KEY = 'consortium:blockchain';

    constructor() {
        console.log("Mock Blockchain Service Initialized");
        if (!this.loadFromStorage()) {
            this.initializeMockData();
        }
    }

    private saveToStorage() {
        if (typeof window === 'undefined') return;
        const state = {
            ledger: this.ledger,
            users: Array.from(this.users.entries()),
            didRegistry: Array.from(this.didRegistry.entries()),
            credentialRegistry: Array.from(this.credentialRegistry.entries()),
            revokedCredentials: Array.from(this.revokedCredentials),
        };
        try { localStorage.setItem(this.STORAGE_KEY, JSON.stringify(state)); } catch {}
    }

    private loadFromStorage(): boolean {
        if (typeof window === 'undefined') return false;
        try {
            const raw = localStorage.getItem(this.STORAGE_KEY);
            if (!raw) return false;
            const state = JSON.parse(raw);
            this.ledger = state.ledger ?? [];
            this.users = new Map(state.users ?? []);
            this.didRegistry = new Map(state.didRegistry ?? []);
            this.credentialRegistry = new Map(state.credentialRegistry ?? []);
            this.revokedCredentials = new Set(state.revokedCredentials ?? []);
            return true;
        } catch { return false; }
    }

    clearStorage() {
        if (typeof window === 'undefined') return;
        try { localStorage.removeItem(this.STORAGE_KEY); } catch {}
    }

    private initializeMockData() {
        this.registerDID('STUDENT', 'HOLDER', { name: 'Alice Johnson', dob: '2002-05-15', email: 'alice@example.edu' });
        this.registerDID('STUDENT', 'HOLDER', { name: 'Bob Smith', dob: '2001-11-20', email: 'bob@example.edu' });
        this.registerDID('ORGANIZATION', 'ISSUER', { name: 'Consortium University', address: '123 Edu Lane', registrationId: 'UNIV-001' });
        this.registerDID('ORGANIZATION', 'ISSUER', { name: 'Global Tech Institute', address: '456 Innovation Blvd', registrationId: 'TECH-002' });
        this.registerDID('ORGANIZATION', 'VERIFIER', { name: 'Future Employers Inc', address: '789 Career Way', registrationId: 'CORP-003' });
    }

    // --- Core Ledger Methods ---

    getLedger(): LedgerTransaction[] {
        return [...this.ledger];
    }

    getDIDRegistry(): Map<string, string> {
        return new Map(this.didRegistry);
    }

    getUsers(): User[] {
        return Array.from(this.users.values());
    }

    // --- Actor Actions ---

    registerDID(
        type: 'STUDENT' | 'ORGANIZATION',
        role: 'HOLDER' | 'ISSUER' | 'VERIFIER',
        profile: StudentProfile | OrganizationProfile
    ): User {
        const { publicKey, privateKey } = generateKeyPair();
        const did = `did:consortium:${hashData(publicKey).substring(0, 16)}`;

        const user: User = { did, type, role, publicKey, privateKey, profile };
        this.users.set(did, user);
        this.didRegistry.set(did, publicKey);

        this.recordTransaction({
            type: 'DID_REGISTRATION',
            timestamp: Date.now(),
            dataHash: hashData(did + publicKey),
            actor: did,
            details: { role, profile }
        });

        this.saveToStorage();
        return user;
    }

    submitPortfolio(
        holderDid: string,
        artifactDataArray: Array<{ data: string; filename: string }>,
        targetOrgDid: string,
        coverLetter?: string
    ): string {
        const combinedData = artifactDataArray.map(a => a.data).join('');
        const artifactHash = hashData(combinedData);

        this.recordTransaction({
            type: 'PORTFOLIO_SUBMISSION',
            timestamp: Date.now(),
            dataHash: artifactHash,
            actor: holderDid,
            details: { artifactHash, artifactDataArray, targetOrgDid, coverLetter }
        });

        return artifactHash;
    }

    mintCredential(
        issuerDid: string,
        holderDid: string,
        artifactHash: string,
        privateKey: string,
        issuerAttachmentsArray?: Array<{ data: string; filename: string }>,
        credentialType?: string,
        metadata?: Record<string, string>,
        issuerNote?: string,
        expiryDate?: string
    ): Credential {
        const credentialId = `vc:${hashData(Date.now().toString() + holderDid)}`;
        const issuanceDate = new Date().toISOString();

        const issuerAttachments = issuerAttachmentsArray && issuerAttachmentsArray.length > 0 ?
            issuerAttachmentsArray.map(att => ({
                data: att.data,
                filename: att.filename,
                timestamp: Date.now()
            })) : undefined;

        let dataToSign = credentialId + issuerDid + holderDid + artifactHash + issuanceDate;
        if (issuerAttachments) {
            const attachmentsHash = hashData(issuerAttachments.map(a => a.data).join(''));
            dataToSign += attachmentsHash;
        }
        if (credentialType) dataToSign += credentialType;
        if (expiryDate) dataToSign += expiryDate;

        const signature = signData(dataToSign, privateKey);

        const credential: Credential = {
            id: credentialId,
            issuerDid,
            holderDid,
            artifactHash,
            issuanceDate,
            signature,
            issuerAttachments,
            credentialType,
            metadata,
            issuerNote,
            expiryDate,
        };

        this.credentialRegistry.set(credentialId, credential);

        this.recordTransaction({
            type: 'VC_ISSUANCE',
            timestamp: Date.now(),
            dataHash: hashData(JSON.stringify(credential)),
            actor: issuerDid,
            details: { credentialId, holderDid, credential }
        });

        return credential;
    }

    rejectSubmission(issuerDid: string, holderDid: string, artifactHash: string, reason: string): void {
        this.recordTransaction({
            type: 'PORTFOLIO_REJECTION',
            timestamp: Date.now(),
            dataHash: hashData(issuerDid + holderDid + artifactHash + Date.now()),
            actor: issuerDid,
            details: { holderDid, artifactHash, reason }
        });
    }

    revokeCredential(issuerDid: string, credentialId: string): void {
        this.revokedCredentials.add(credentialId);
        this.recordTransaction({
            type: 'VC_REVOCATION',
            timestamp: Date.now(),
            dataHash: hashData(issuerDid + credentialId + Date.now()),
            actor: issuerDid,
            details: { credentialId }
        });
        this.saveToStorage();
    }

    sendMessage(fromDid: string, toDid: string, content: string, contextRef?: string): void {
        this.recordTransaction({
            type: 'CHAT_MESSAGE',
            timestamp: Date.now(),
            dataHash: hashData(fromDid + toDid + content + Date.now()),
            actor: fromDid,
            details: { fromDid, toDid, content, contextRef }
        });
    }

    recordCredentialDecision(verifierDid: string, credentialId: string, decision: 'ACCEPTED' | 'DECLINED', notes: string): void {
        this.recordTransaction({
            type: 'CREDENTIAL_DECISION',
            timestamp: Date.now(),
            dataHash: hashData(verifierDid + credentialId + decision + Date.now()),
            actor: verifierDid,
            details: { credentialId, decision, notes }
        });
    }

    verifyCredential(credentialJson: string): { verified: boolean; reason?: string; issuer?: string } {
        try {
            const credential = JSON.parse(credentialJson) as Credential;

            // Check revocation first
            if (this.revokedCredentials.has(credential.id)) {
                return { verified: false, reason: "Credential has been revoked" };
            }

            const issuerPublicKey = this.didRegistry.get(credential.issuerDid);
            if (!issuerPublicKey) {
                return { verified: false, reason: "Issuer DID not found in Registry" };
            }

            let dataToVerify = credential.id + credential.issuerDid + credential.holderDid + credential.artifactHash + credential.issuanceDate;
            if (credential.issuerAttachments && credential.issuerAttachments.length > 0) {
                const attachmentsHash = hashData(credential.issuerAttachments.map(a => a.data).join(''));
                dataToVerify += attachmentsHash;
            }
            if (credential.credentialType) dataToVerify += credential.credentialType;
            if (credential.expiryDate) dataToVerify += credential.expiryDate;

            const isValidSignature = verifySignature(dataToVerify, credential.signature, issuerPublicKey);

            if (!isValidSignature) {
                return { verified: false, reason: "Invalid Digital Signature" };
            }

            if (!this.credentialRegistry.has(credential.id)) {
                return { verified: false, reason: "Credential not found in Ledger Registry (Fake VC)" };
            }

            return { verified: true, issuer: credential.issuerDid };

        } catch {
            return { verified: false, reason: "Invalid JSON Format" };
        }
    }

    forwardCredential(holderDid: string, verifierDid: string, credential: Credential, message: string): string {
        const timestamp = Date.now();
        const dataHash = hashData(JSON.stringify(credential) + timestamp);

        this.recordTransaction({
            type: 'CREDENTIAL_FORWARD',
            timestamp,
            dataHash,
            actor: holderDid,
            details: {
                verifierDid,
                credential,
                message
            }
        });

        return dataHash;
    }

    // --- Helper ---
    private recordTransaction(tx: LedgerTransaction) {
        this.ledger.push(tx);
        console.log(`[Block ${this.ledger.length}] New Transaction:`, tx);
        this.saveToStorage();
    }
}
