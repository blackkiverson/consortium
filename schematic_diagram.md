# Consortium Project: Detailed Schematic Diagrams

This document provides an expanded technical visualization of the Consortium Decentralized Credentialing System, including the data persistence layer and component-level interactions.

## 1. Comprehensive System Architecture

This diagram illustrates the flow from the UI layer down to the cryptographic services and the simulated blockchain registries.

```mermaid
graph TD
    subgraph "UI Layer (React/Next.js)"
        direction LR
        HD[Holder Dashboard]
        ID[Issuer Dashboard]
        VP[Verifier Portal]
    end

    subgraph "State Layer (Zustand Store)"
        LS[ledgerStore.ts]
        SYNC[sync method]
        AUTH[login/logout]
    end

    subgraph "Logic Layer (Services)"
        MBS[MockBlockchainService]
        direction TB
        CS[crypto.ts]
        CS --- HASH["hashData (SHA-256)"]
        CS --- SIGN["signData (ECDSA Sim)"]
        CS --- VER["verifySignature"]
    end

    subgraph "Persistence Layer (Simulated/Firestore)"
        direction TB
        L[Ledger Transactions]
        DR[DID Registry]
        CR[Credential Registry]
        US[User Registry]
    end

    HD & ID & VP <-->|useLedgerStore| LS
    LS <--> MBS
    MBS <--> CS
    MBS --- US
    MBS --- L
    MBS --- DR
    MBS --- CR
```

## 2. Firebase Firestore Database Schematic (ERD)

The following schema represents the intended Firestore structure for persisting the DLT state. It maps the current `MockBlockchainService` data structures to a scalable NoSQL hierarchy.

```mermaid
erDiagram
    USERS ||--o{ TRANSACTIONS : initiates
    USERS ||--o| PROFILES : has
    TRANSACTIONS ||--o| CREDENTIALS : references
    
    USERS {
        string did PK "Format: did:consortium:<hash>"
        string type "STUDENT | ORGANIZATION"
        string role "HOLDER | ISSUER | VERIFIER"
        string publicKey
        string privateKey "Encrypted/KMS Managed"
    }

    PROFILES {
        string did FK
        string name
        string email
        string address
        string registrationId "For Institutions"
    }

    TRANSACTIONS {
        string txHash PK "SHA-256 of payload"
        string type "DID_REGISTRATION | VC_ISSUANCE | ..."
        string actor FK "DID of the user"
        timestamp timestamp
        json details "Payload content"
    }

    CREDENTIALS {
        string id PK "vc:<hash>"
        string issuerDid FK
        string holderDid FK
        string artifactHash "Reference to submission"
        string signature "Issuer Digital Signature"
        timestamp issuanceDate
        json attachments "URI links to Cloud Storage"
    }
```

## 3. Complete End-to-End Credential Lifecycle

This comprehensive sequence diagram shows the full journey from student portfolio submission, through issuer minting with attachments, to verifier receiving and validating the credential.

```mermaid
%%{init: {'theme':'base', 'themeVariables': { 'primaryColor':'#fff','primaryTextColor':'#000','primaryBorderColor':'#000','lineColor':'#000','secondaryColor':'#f4f4f4','tertiaryColor':'#fff','actorTextColor':'#000','actorLineColor':'#000','signalColor':'#000','signalTextColor':'#000','labelBoxBkgColor':'#f4f4f4','labelBoxBorderColor':'#000','labelTextColor':'#000','loopTextColor':'#000','noteBorderColor':'#000','noteTextColor':'#000','activationBorderColor':'#000','sequenceNumberColor':'#fff'}}}%%
sequenceDiagram
    autonumber
    participant H as Holder (Student)
    participant HUI as Holder Dashboard
    participant S as Ledger Store
    participant B as Blockchain Service
    participant C as Crypto Service
    participant IUI as Issuer Dashboard
    participant I as Issuer (University)
    participant VUI as Verifier Dashboard
    participant V as Verifier (Employer)

    rect rgb(200, 220, 255)
        Note over H, C: PHASE 1: Portfolio Submission
        H->>HUI: Select files & target organization
        HUI->>HUI: Convert files to Base64
        HUI->>S: submitPortfolio(artifacts[], targetOrgDid)
        S->>B: submitPortfolio(holderDid, artifacts[], targetOrgDid)
        B->>C: hashData(combinedArtifacts)
        C-->>B: artifactHash
        B->>B: Record PORTFOLIO_SUBMISSION tx
        B-->>S: Return artifactHash
        S-->>HUI: Update ledger state
        HUI-->>H: Submission confirmed
    end

    rect rgb(220, 200, 255)
        Note over I, C: PHASE 2: Review & Minting with Attachments
        I->>IUI: Login as Issuer
        IUI->>S: Get pending submissions
        S->>B: getLedger()
        B-->>S: Ledger transactions
        S-->>IUI: Filter submissions for this org
        IUI-->>I: Display pending portfolios
        
        I->>IUI: Review student artifacts
        IUI->>IUI: Display artifact viewer
        I->>I: Verify student work
        
        I->>IUI: Upload issuer attachments (diploma, transcript)
        IUI->>IUI: Convert attachments to Base64
        I->>IUI: Click "Approve & Mint VC"
        IUI->>S: mintCredential(holderDid, artifactHash, attachments[])
        S->>B: mintCredential(issuerDid, holderDid, artifactHash, privKey, attachments[])
        
        Note over B, C: Cryptographic Operations
        B->>B: Generate credentialId
        B->>C: hashData(attachments[])
        C-->>B: attachmentsHash
        B->>B: Prepare signing payload
        B->>C: signData(payload, issuerPrivateKey)
        C-->>B: digitalSignature
        
        B->>B: Create VC {id, signature, artifactHash, attachments}
        B->>B: Store in Credential Registry
        B->>B: Record VC_ISSUANCE tx
        B-->>S: Return signed credential
        S-->>IUI: Update state
        IUI-->>I: Credential minted successfully
    end

    rect rgb(200, 255, 220)
        Note over H, V: PHASE 3: Credential Forwarding
        H->>HUI: View my credentials
        HUI->>S: Get my issued credentials
        S->>B: Query ledger for VC_ISSUANCE where holderDid
        B-->>S: Credential list
        S-->>HUI: Display credentials
        
        H->>HUI: Select credential & verifier
        H->>HUI: Add message for verifier
        HUI->>S: forwardCredential(verifierDid, credential, message)
        S->>B: forwardCredential(holderDid, verifierDid, credential, message)
        B->>C: hashData(credential + timestamp)
        C-->>B: forwardHash
        B->>B: Record CREDENTIAL_FORWARD tx
        B-->>S: Success
        S-->>HUI: Forwarded
        HUI-->>H: Sent to verifier
    end

    rect rgb(255, 220, 200)
        Note over V, C: PHASE 4: Verification & Artifact Access
        V->>VUI: Login as Verifier
        VUI->>S: Get forwarded credentials
        S->>B: Query CREDENTIAL_FORWARD where verifierDid
        B-->>S: Forwarded credentials
        S-->>VUI: Display received credentials
        
        V->>VUI: Select credential to verify
        VUI->>S: verifyCredential(credentialJson)
        S->>B: verifyCredential(credentialJson)
        
        Note over B, C: Verification Process
        B->>B: Parse credential JSON
        B->>B: Lookup issuer DID in registry
        B->>B: Extract issuer publicKey
        B->>C: hashData(attachments[]) if present
        C-->>B: attachmentsHash
        B->>B: Reconstruct signing payload
        B->>C: verifySignature(payload, signature, publicKey)
        C-->>B: isValid: true/false
        B->>B: Check credential exists in registry
        B-->>S: {verified: true, issuer: issuerDid}
        
        S->>S: addVerificationHistory(result)
        S-->>VUI: Verification result
        VUI-->>V: ✓ Credential Valid
        
        V->>VUI: View student artifacts
        VUI->>VUI: Display artifact viewer (student docs)
        V->>VUI: View issuer attachments
        VUI->>VUI: Display artifact viewer (diploma, transcript)
        VUI-->>V: All documents accessible
    end
```

## 4. Component Interaction Layout

Visualizing how the React components consume the global store.

```mermaid
flowchart LR
    Store((useLedgerStore))
    
    subgraph Components
        A[App Layout]
        AV[ArtifactViewer]
        HD[HolderDashboard]
        ID[IssuerDashboard]
        VP[VerifierPortal]
    end

    Store -.->|currentUser| A
    Store -.->|ledger| HD & ID & VP
    Store -.->|mintCredential| ID
    Store -.->|submitPortfolio| HD
    Store -.->|verifyCredential| VP
    
    HD & ID & VP ==>|artifactData| AV
```

## 5. Security Summary
- **Data Integrity**: Artifacts are immutable once hashed and recorded in `PORTFOLIO_SUBMISSION`.
- **Non-Repudiation**: `VC_ISSUANCE` is tied to an Issuer via ECDSA-simulated signatures.
- **Verification**: Zero-trust model where Verifiers check both the signature and the presence of the record on the ledger.
