import { generateKeyPair, hashData, signData, verifySignature } from './crypto';

export interface User {
    did: string;
    role: 'HOLDER' | 'ISSUER' | 'VERIFIER';
    publicKey: string;
    privateKey: string; // In a real app, keep this hidden
}

export interface Credential {
    id: string;
    issuerDid: string;
    holderDid: string;
    artifactHash: string;
    issuanceDate: string;
    signature: string; // The cryptographic proof
    payload?: any; // For the demo, to store the actual data if needed, or just keep it off-chain
    issuerAttachments?: Array<{
        data: string;
        filename: string;
        timestamp: number;
    }>;
}

export interface LedgerTransaction {
    type: 'DID_REGISTRATION' | 'PORTFOLIO_SUBMISSION' | 'VC_ISSUANCE';
    timestamp: number;
    dataHash: string;
    actor: string;
    details?: any; // Store transaction details for the demo UI
}

export class MockBlockchainService {
    private ledger: LedgerTransaction[] = [];
    private didRegistry: Map<string, string> = new Map(); // DID -> PublicKey
    private credentialRegistry: Map<string, Credential> = new Map(); // Hash -> Credential

    // For the demo, we also need to store the users to simulate "logging in"
    private users: Map<string, User> = new Map();

    constructor() {
        console.log("Mock Blockchain Service Initialized");
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

    registerDID(role: 'HOLDER' | 'ISSUER' | 'VERIFIER'): User {
        const { publicKey, privateKey } = generateKeyPair();
        const did = `did:consortium:${hashData(publicKey).substring(0, 16)}`;

        const user: User = { did, role, publicKey, privateKey };
        this.users.set(did, user);
        this.didRegistry.set(did, publicKey);

        this.recordTransaction({
            type: 'DID_REGISTRATION',
            timestamp: Date.now(),
            dataHash: hashData(did + publicKey),
            actor: did,
            details: { role }
        });

        return user;
    }

    submitPortfolio(holderDid: string, artifactDataArray: Array<{ data: string; filename: string }>): string {
        // 1. Hash all artifacts combined
        const combinedData = artifactDataArray.map(a => a.data).join('');
        const artifactHash = hashData(combinedData);

        // 2. Record transaction
        this.recordTransaction({
            type: 'PORTFOLIO_SUBMISSION',
            timestamp: Date.now(),
            dataHash: artifactHash,
            actor: holderDid,
            details: { artifactHash, artifactDataArray } // Store all files
        });

        return artifactHash;
    }

    mintCredential(
        issuerDid: string,
        holderDid: string,
        artifactHash: string,
        privateKey: string,
        issuerAttachmentsArray?: Array<{ data: string; filename: string }>
    ): Credential {
        // 1. Create Credential Payload
        const credentialId = `vc:${hashData(Date.now().toString() + holderDid)}`;
        const issuanceDate = new Date().toISOString();

        // 2. Prepare issuer attachments if provided
        const issuerAttachments = issuerAttachmentsArray && issuerAttachmentsArray.length > 0 ?
            issuerAttachmentsArray.map(att => ({
                data: att.data,
                filename: att.filename,
                timestamp: Date.now()
            })) : undefined;

        // 3. Sign the hash (Issuer signs the artifact hash + metadata + attachments if present)
        let dataToSign = credentialId + issuerDid + holderDid + artifactHash + issuanceDate;
        if (issuerAttachments) {
            const attachmentsHash = hashData(issuerAttachments.map(a => a.data).join(''));
            dataToSign += attachmentsHash;
        }
        const signature = signData(dataToSign, privateKey);

        const credential: Credential = {
            id: credentialId,
            issuerDid,
            holderDid,
            artifactHash,
            issuanceDate,
            signature,
            issuerAttachments
        };

        // 4. Store in Registry (On-chain or State)
        // In this mock, we store the valid credential hash or the credential itself if it's a public registry
        this.credentialRegistry.set(credentialId, credential);

        // 5. Record Transaction
        this.recordTransaction({
            type: 'VC_ISSUANCE',
            timestamp: Date.now(),
            dataHash: hashData(JSON.stringify(credential)),
            actor: issuerDid,
            details: { credentialId, holderDid, credential }
        });

        return credential;
    }

    verifyCredential(credentialJson: string): { verified: boolean; reason?: string; issuer?: string } {
        try {
            const credential = JSON.parse(credentialJson) as Credential;

            // 1. Check if Issuer exists
            const issuerPublicKey = this.didRegistry.get(credential.issuerDid);
            if (!issuerPublicKey) {
                return { verified: false, reason: "Issuer DID not found in Registry" };
            }

            // 2. Verify Signature (including attachments if present)
            let dataToVerify = credential.id + credential.issuerDid + credential.holderDid + credential.artifactHash + credential.issuanceDate;
            if (credential.issuerAttachments && credential.issuerAttachments.length > 0) {
                const attachmentsHash = hashData(credential.issuerAttachments.map(a => a.data).join(''));
                dataToVerify += attachmentsHash;
            }
            const isValidSignature = verifySignature(dataToVerify, credential.signature, issuerPublicKey);

            if (!isValidSignature) {
                return { verified: false, reason: "Invalid Digital Signature" };
            }

            // 3. Check against Ledger (Optional but recommended: Is this VC revoked? Does it exist?)
            // In this mock, we check if it was actually minted by us
            if (!this.credentialRegistry.has(credential.id)) {
                return { verified: false, reason: "Credential not found in Ledger Registry (Fake VC)" };
            }

            return { verified: true, issuer: credential.issuerDid };

        } catch {
            return { verified: false, reason: "Invalid JSON Format" };
        }
    }

    // --- Helper ---
    private recordTransaction(tx: LedgerTransaction) {
        this.ledger.push(tx);
        console.log(`[Block ${this.ledger.length}] New Transaction:`, tx);
    }
}
