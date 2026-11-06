/**
 * Quantum-Safe REST API - Frontend Crypto Utilities
 * 
 * Client-side helper functions for displaying and working with
 * cryptographic data from the backend API.
 */

/**
 * Truncate a base64 string for display, showing prefix + "..."
 * @param {string} b64 - Base64 encoded string
 * @param {number} len - Number of chars to show before truncation
 * @returns {string}
 */
export function truncateB64(b64, len = 48) {
  if (!b64 || b64.length <= len) return b64 || '';
  return b64.substring(0, len) + '...';
}

/**
 * Calculate the byte size of a base64-encoded string
 * @param {string} b64 - Base64 encoded string
 * @returns {number} Byte count
 */
export function b64ByteSize(b64) {
  if (!b64) return 0;
  const padding = (b64.match(/=/g) || []).length;
  return Math.floor((b64.length * 3) / 4) - padding;
}

/**
 * Format a byte count as human-readable string
 * @param {number} bytes
 * @returns {string}
 */
export function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

/**
 * Format milliseconds as a human-readable duration
 * @param {number} ms
 * @returns {string}
 */
export function formatMs(ms) {
  if (ms === null || ms === undefined || ms === '—') return '—';
  const n = typeof ms === 'string' ? parseFloat(ms) : ms;
  if (isNaN(n)) return '—';
  if (n < 1) return `${(n * 1000).toFixed(0)} µs`;
  if (n < 1000) return `${n.toFixed(2)} ms`;
  return `${(n / 1000).toFixed(2)} s`;
}

/**
 * Copy text to clipboard with fallback
 * @param {string} text
 * @returns {Promise<boolean>} success
 */
export async function copyToClipboard(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    // Fallback for non-HTTPS
    const el = document.createElement('textarea');
    el.value = text;
    el.style.position = 'fixed';
    el.style.left = '-9999px';
    document.body.appendChild(el);
    el.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(el);
    return ok;
  } catch {
    return false;
  }
}

/**
 * PQC algorithm metadata for display purposes
 */
export const PQC_ALGORITHMS = {
  'ML-KEM-768': {
    standard: 'NIST FIPS 203 (2024)',
    basis: 'CRYSTALS-Kyber, Module-LWE lattice',
    securityLevel: 'Category 3 (AES-192 equivalent)',
    publicKeyBytes: 1184,
    privateKeyBytes: 2400,
    ciphertextBytes: 1088,
    sharedSecretBytes: 32,
    quantumSafe: true,
    replaces: 'RSA / ECDH key exchange',
    color: 'cyan',
  },
  'ML-DSA-65': {
    standard: 'NIST FIPS 204 (2024)',
    basis: 'CRYSTALS-Dilithium, Module-SIS lattice',
    securityLevel: 'Category 3 (AES-192 equivalent)',
    publicKeyBytes: 1952,
    privateKeyBytes: 4032,
    signatureBytes: 3309,
    quantumSafe: true,
    replaces: 'ECDSA / RSA signatures',
    color: 'purple',
  },
  'AES-256-GCM': {
    standard: 'NIST FIPS 197 + SP 800-38D',
    basis: 'Symmetric authenticated encryption',
    securityLevel: '128-bit quantum security (Grover halves to 128-bit)',
    keyBytes: 32,
    nonceBytes: 12,
    tagBytes: 16,
    quantumSafe: true,
    replaces: 'Still used (quantum-safe)',
    color: 'green',
  },
};

/**
 * Classical algorithm metadata for comparison
 */
export const CLASSICAL_ALGORITHMS = {
  'RSA-2048': {
    quantumSafe: false,
    threat: "Shor's Algorithm (polynomial time)",
    replacement: 'ML-KEM-768',
    color: 'red',
  },
  'ECDH-P384': {
    quantumSafe: false,
    threat: "Shor's Algorithm (polynomial time)",
    replacement: 'ML-KEM-768',
    color: 'yellow',
  },
  'ECDSA-P384': {
    quantumSafe: false,
    threat: "Shor's Algorithm (polynomial time)",
    replacement: 'ML-DSA-65',
    color: 'orange',
  },
};

