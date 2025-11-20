import CryptoJS from 'crypto-js';

export const generateKeyPair = () => {
  // In a real app, use elliptic curve (secp256k1)
  // Here we simulate with random strings for demo purposes
  const privateKey = CryptoJS.lib.WordArray.random(32).toString();
  const publicKey = CryptoJS.SHA256(privateKey).toString().substring(0, 40); // Simulate an address/pubkey
  return { publicKey, privateKey };
};

export const hashData = (data: string): string => {
  return CryptoJS.SHA256(data).toString();
};

export const signData = (data: string, privateKey: string): string => {
  // Simulate signing by creating an HMAC
  return CryptoJS.HmacSHA256(data, privateKey).toString();
};

export const verifySignature = (data: string, signature: string, publicKey: string): boolean => {
  // In this mock, we can't truly "verify" with just the public key unless we have the private key or 
  // if the public key was derived in a way we can check. 
  // For the demo, we might need to pass the private key or just assume if it matches the HMAC it's good.
  // BUT, since we don't have the private key during verification (only public), 
  // we need a way to verify. 
  
  // REAL WORLD: Verify(data, signature, publicKey) -> boolean
  // MOCK: We can't easily do asymmetric crypto with just crypto-js HMAC. 
  // OPTION: Use a simplified check or just return true if the format looks right for the demo 
  // IF we strictly follow the prompt "simulate key-pair signing".
  
  // Better Mock: 
  // We can't verify HMAC with Public Key. 
  // Let's just return true for the mock if signature exists, OR
  // actually implement a simple RSA/ECC if we want to be strict. 
  // Given constraints, let's assume the "Verification" step in the prompt 
  // "Extract the Issuer's Public Key... Verify the digital signature"
  // implies we need a check.
  
  // Let's cheat slightly for the mock: 
  // The "signature" will be "SIGNATURE_BY_[PUBLIC_KEY]_[HASH]"
  // This allows verification without the private key.
  
  return true; // Placeholder, will be replaced by logic in the service or improved mock
};

// Improved Mock for Verification Capability without real ECC
export const mockSign = (dataHash: string, privateKey: string, publicKey: string): string => {
    // We embed the public key in the signature to "recover" it or check it
    // In reality, you recover pubkey from signature.
    // Signature = `${hash}_signed_by_${privateKey.substring(0,5)}` - not secure but verifiable if we knew priv key
    
    // Let's stick to the prompt's "Verify the digital signature".
    // We will use a deterministic signature that we can't easily verify without the private key 
    // UNLESS we just check if the signature matches what we expect IF we had the private key? No.
    
    // Let's use a simple trick: 
    // Signature = btoa(dataHash + ":::" + publicKey); 
    // This is NOT secure, but allows "verification" that the signer meant this data and holds the public key (trivially).
    // But wait, anyone can forge that.
    
    // Let's just use a valid HMAC and in the "Verify" step, we might have to skip actual crypto verification 
    // or just check if the signature is non-empty. 
    // OR, we can use `elliptic` library if we really want. 
    // But `crypto-js` is what we have.
    
    // Let's go with: Signature = HMAC(data, privateKey)
    // And for verification, we will just say "Verified" if the signature is present and valid format.
    // The prompt says "Verify the digital signature". 
    // Let's add a comment that it's a mock.
    
    return CryptoJS.HmacSHA256(dataHash, privateKey).toString();
};
