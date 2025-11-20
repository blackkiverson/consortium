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

    submitPortfolio(holderDid: string, artifactData: string): string {
        // 1. Hash the artifact (Hybrid Storage: Data off-chain, Hash on-chain)
        const artifactHash = hashData(artifactData);

        // 2. Record transaction
        this.recordTransaction({
            type: 'PORTFOLIO_SUBMISSION',
            timestamp: Date.now(),
            dataHash: artifactHash,
            actor: holderDid,
            details: { artifactHash, artifactData } // In real world, this might be an IPFS CID
        });

        return artifactHash;
    }

    mintCredential(issuerDid: string, holderDid: string, artifactHash: string, privateKey: string): Credential {
        // 1. Create Credential Payload
        const credentialId = `vc:${hashData(Date.now().toString() + holderDid)}`;
        const issuanceDate = new Date().toISOString();

        // 2. Sign the hash (Issuer signs the artifact hash + metadata)
        const dataToSign = credentialId + issuerDid + holderDid + artifactHash + issuanceDate;
        const signature = signData(dataToSign, privateKey);

        const credential: Credential = {
            id: credentialId,
            issuerDid,
            holderDid,
            artifactHash,
            issuanceDate,
            signature
        };

        // 3. Store in Registry (On-chain or State)
        // In this mock, we store the valid credential hash or the credential itself if it's a public registry
        this.credentialRegistry.set(credentialId, credential);

        // 4. Record Transaction
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

            // 2. Verify Signature
            const dataToVerify = credential.id + credential.issuerDid + credential.holderDid + credential.artifactHash + credential.issuanceDate;
            // In our mock, verifySignature just returns true, but we can add logic if we want
            // For now, we assume if the signature is present and matches our mock format (if we enforced it), it's good.
            // Let's use the helper.
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
