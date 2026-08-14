
/**
 * Simple Encryption/Decryption using Web Crypto API (AES-GCM)
 * This provides a layer of security for storing PayMongo keys in the database.
 */

const encoder = new TextEncoder();
const decoder = new TextDecoder();

async function getEncryptionKey(password: string) {
  if (typeof crypto === 'undefined' || !crypto.subtle) {
    throw new Error("Encryption/Decryption is only available in secure contexts (localhost or HTTPS). Please ensure you are using a secure connection.");
  }
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );
  
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode('smartport-payment-salt'), // Static salt for consistency
      iterations: 100000,
      hash: 'SHA-256'
    },
    passwordKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypts a string into a base64 encoded string
 */
export async function encryptData(text: string): Promise<string> {
  if (!text) return "";
  try {
    const keyStr = import.meta.env.VITE_PAYMONGO_ENCRYPTION_KEY || 'smartport-dev-32-char-key-replacement';
    const key = await getEncryptionKey(keyStr);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      encoder.encode(text)
    );
    
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encrypted), iv.length);
    
    // Convert to base64
    let binary = '';
    const bytes = new Uint8Array(combined);
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  } catch (e) {
    console.error("Encryption failed:", e);
    throw new Error("Failed to secure the key.");
  }
}

/**
 * Decrypts a base64 encoded string.
 * Returns null if the value is not valid encrypted data (so callers never
 * silently use raw ciphertext as if it were the plain value).
 */
export async function decryptData(encoded: string): Promise<string | null> {
  if (!encoded) return "";
  // If it doesn't look like our base64 format (e.g. it's already plain text sk_test_...)
  if (!encoded.includes("==") && encoded.length < 50 && (encoded.startsWith("sk_") || encoded.startsWith("pk_"))) {
    return encoded;
  }

  try {
    const keyStr = import.meta.env.VITE_PAYMONGO_ENCRYPTION_KEY || 'smartport-dev-32-char-key-replacement';
    const key = await getEncryptionKey(keyStr);
    
    const binary = atob(encoded);
    const combined = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      combined[i] = binary.charCodeAt(i);
    }
    
    const iv = combined.slice(0, 12);
    const data = combined.slice(12);
    
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      data
    );
    
    return decoder.decode(decrypted);
  } catch (e) {
    console.debug("Decryption failed for string (not valid encrypted data):", encoded.slice(0, 5));
    return null;
  }
}
