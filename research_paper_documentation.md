# Decentralized Credentialing System: Technical Implementation & Architecture

## 1. Introduction
This document details the technical implementation of a Decentralized Ledger Technology (DLT) based credentialing system. The prototype demonstrates the core principles of Self-Sovereign Identity (SSI), enabling secure, verifiable, and user-centric management of academic credentials. Built using **Next.js**, **TypeScript**, and a custom **Mock Blockchain Layer**, the system simulates the interactions between Holders (Students), Issuers (Universities), and Verifiers (Employers).

## 2. System Architecture

### 2.1 Technology Stack
-   **Frontend Framework**: Next.js 15 (App Router) for server-side rendering and routing.
-   **Language**: TypeScript for type safety and interface definitions.
-   **Styling**: Tailwind CSS for utility-first, responsive design.
-   **State Management**: Zustand for global client-side state management.
-   **Cryptography**: Custom implementation using SHA-256 hashing and ECDSA-like key pair simulation.

### 2.2 Component Overview
The application follows a modular architecture:
-   **`MockBlockchainService`**: A singleton service that simulates a distributed ledger. It handles transaction ordering, block creation (conceptually), and cryptographic verification.
-   **`LedgerStore`**: A Zustand store that acts as the client-side node, syncing state from the blockchain service and exposing actions to UI components.
-   **Role-Based Dashboards**:
    -   `HolderDashboard`: For identity management and portfolio submission.
    -   `IssuerDashboard`: For reviewing submissions and minting credentials.
    -   `VerifierPortal`: For independent verification of credentials.

## 3. Data Models & Ledger Structure

### 3.1 Decentralized Identifiers (DIDs)
Users are identified by DIDs, following the method `did:consortium:<hash>`.
```typescript
interface User {
    did: string;       // Unique Identifier
    role: 'HOLDER' | 'ISSUER' | 'VERIFIER';
    publicKey: string; // For signature verification
    privateKey: string; // For signing transactions
}
```

### 3.2 Ledger Transactions
The ledger is an append-only log of transactions. Each transaction is content-addressed (hashed) and linked to the previous state.
```typescript
interface LedgerTransaction {
    type: 'DID_REGISTRATION' | 'PORTFOLIO_SUBMISSION' | 'VC_ISSUANCE';
    actor: string;     // DID of the entity initiating the transaction
    timestamp: number;
    dataHash: string;  // SHA-256 hash of the payload
    details: any;      // The actual payload (e.g., credential data)
}
```

### 3.3 Verifiable Credentials (VC)
Credentials follow a simplified W3C Verifiable Credential data model:
-   **Issuer**: The DID of the signing authority.
-   **Subject**: The DID of the student.
-   **Artifact Hash**: A cryptographic link to the submitted portfolio (ensuring integrity).
-   **Proof**: A digital signature generated using the Issuer's private key.

## 4. Key Workflows & Implementation Details

### 4.1 Portfolio Submission (Off-Chain Data Simulation)
To handle large files (images/PDFs) in a blockchain context, the system simulates an "Off-Chain" storage pattern.
1.  **Upload**: The user uploads a file, which is converted to a Base64 Data URI.
2.  **Hashing**: The system calculates the SHA-256 hash of the artifact.
3.  **Submission**: A `PORTFOLIO_SUBMISSION` transaction is recorded.
    -   *Design Decision*: In this prototype, the full artifact data is stored in the transaction `details` for simplicity. In a production DLT, only the `hash` would be on-chain, with the data stored in IPFS or a private data store.

### 4.2 Credential Issuance
The issuance process ensures non-repudiation and authenticity.
1.  **Review**: The Issuer retrieves pending submissions from the ledger.
2.  **Minting**: The Issuer signs a payload containing the Student's DID and the Artifact Hash.
3.  **Recording**: A `VC_ISSUANCE` transaction is appended to the ledger. This serves as the "Proof of Existence" for the credential.

### 4.3 Verification Logic
The `VerifierPortal` performs a zero-trust verification process:
1.  **Integrity Check**: Re-calculates the hash of the credential data to ensure no tampering.
2.  **Signature Verification**: Uses the Issuer's public key (retrieved from the DID Registry) to verify the signature.
3.  **Ledger Cross-Reference**: Queries the ledger to confirm that a `VC_ISSUANCE` transaction exists with the matching hash and has not been revoked.

## 5. User Experience & Interface Design

### 5.1 Artifact Viewer
A custom `ArtifactViewer` component was developed to render diverse media types securely.
-   **Dynamic Type Detection**: Automatically detects MIME types from Data URIs to render `<img>` tags or `<iframe>` for PDFs.
-   **Secure Download**: Implements a dynamic anchor tag generation strategy to ensure downloaded files have correct extensions (`.png`, `.pdf`) based on their content type, addressing browser security constraints.

### 5.2 History & Persistence
To improve usability for professional roles (Issuers/Verifiers):
-   **Session Persistence**: Verification history is stored in the global application state (`LedgerStore`), allowing data to persist across navigation events without requiring a database.
-   **Contextual Side Panels**: Dashboards utilize a split-view layout to show historical data alongside active tasks, reducing cognitive load.

## 6. Conclusion
This prototype successfully demonstrates the viability of a DLT-based credentialing system. By decoupling identity (DID), data storage (Artifacts), and verification (Ledger), it achieves a secure, transparent, and user-centric architecture suitable for academic and professional credentialing.
