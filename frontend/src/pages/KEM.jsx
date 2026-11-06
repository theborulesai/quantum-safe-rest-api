import React, { useState } from 'react';
import { Lock, Copy, CheckCircle, AlertCircle, Info, ArrowRight } from 'lucide-react';
import { kemEncapsulate, kemDecapsulate } from '../services/api';

const CopyBtn = ({ text }) => {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="p-1 text-gray-500 hover:text-cyan-400 transition-colors">
      {copied ? <CheckCircle size={13} className="text-green-400" /> : <Copy size={13} />}
    </button>
  );
};

const KEM = () => {
  // Encapsulate state
  const [encRecipient, setEncRecipient] = useState('');
  const [encResult, setEncResult] = useState(null);
  const [encLoading, setEncLoading] = useState(false);
  const [encError, setEncError] = useState('');

  // Decapsulate state
  const [decCiphertext, setDecCiphertext] = useState('');
  const [decResult, setDecResult] = useState(null);
  const [decLoading, setDecLoading] = useState(false);
  const [decError, setDecError] = useState('');

  const handleEncapsulate = async () => {
    if (!encRecipient.trim()) return;
    setEncLoading(true); setEncError(''); setEncResult(null);
    try {
      const res = await kemEncapsulate(encRecipient.trim());
      setEncResult(res.data);
      // Auto-fill decapsulate field for demo
      setDecCiphertext(res.data.kem_ciphertext);
    } catch (err) {
      setEncError(err.response?.data?.detail || 'Encapsulation failed');
    } finally { setEncLoading(false); }
  };

  const handleDecapsulate = async () => {
    if (!decCiphertext.trim()) return;
    setDecLoading(true); setDecError(''); setDecResult(null);
    try {
      const res = await kemDecapsulate(decCiphertext.trim());
      setDecResult(res.data);
    } catch (err) {
      setDecError(err.response?.data?.detail || 'Decapsulation failed');
    } finally { setDecLoading(false); }
  };

  const secretsMatch = encResult && decResult &&
    encResult.shared_secret_hash === decResult.shared_secret_hash;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Lock className="text-cyan-400" size={28} />
        <div>
          <h1 className="text-2xl font-bold text-white">ML-KEM-768 Key Encapsulation</h1>
          <p className="text-gray-400 text-sm">NIST FIPS 203 — Quantum-safe shared secret establishment</p>
        </div>
      </div>

      {/* How it works */}
      <div className="bg-[#0d1526] border border-cyan-500/20 rounded-xl p-5">
        <h3 className="text-cyan-400 font-bold mb-3 text-sm uppercase tracking-wider">How ML-KEM-768 Works</h3>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          {['Alice fetches Bob\'s public key', 'Alice encapsulates → KEM ciphertext + shared secret', 'Alice sends ciphertext to Bob', 'Bob decapsulates → same shared secret', 'Both derive identical AES key via HKDF'].map((step, i) => (
            <React.Fragment key={i}>
              <div className="bg-[#050810] border border-[#1a2a4a] rounded-lg px-3 py-2 text-gray-300 text-xs">{step}</div>
              {i < 4 && <ArrowRight size={14} className="text-cyan-500/50 flex-shrink-0" />}
            </React.Fragment>
          ))}
        </div>
        <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          {[['Public Key', '1,184 bytes', 'text-cyan-400'], ['Private Key', '2,400 bytes', 'text-purple-400'], ['Ciphertext', '1,088 bytes', 'text-yellow-400'], ['Shared Secret', '32 bytes', 'text-green-400']].map(([label, size, color]) => (
            <div key={label} className="bg-[#050810] rounded-lg p-3 text-center">
              <div className={`font-mono font-bold ${color}`}>{size}</div>
              <div className="text-gray-500">{label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Encapsulate */}
        <div className="bg-[#0d1526] border border-[#1a2a4a] rounded-xl p-6">
          <h2 className="text-lg font-bold text-white mb-1">Step 1 — Encapsulate</h2>
          <p className="text-gray-400 text-xs mb-4">You encapsulate a secret using the recipient's public key</p>

          <div className="space-y-3">
            <div>
              <label className="text-gray-400 text-sm block mb-1">Recipient Username</label>
              <input
                type="text"
                value={encRecipient}
                onChange={e => setEncRecipient(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleEncapsulate()}
                placeholder="e.g., bob"
                className="bg-[#050810] border border-[#1a2a4a] rounded-lg px-3 py-2 text-white w-full focus:outline-none focus:border-cyan-500"
              />
            </div>
            <button
              onClick={handleEncapsulate}
              disabled={encLoading || !encRecipient.trim()}
              className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
            >
              {encLoading ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Encapsulating...</> : 'Encapsulate →'}
            </button>
          </div>

          {encError && <div className="mt-3 bg-red-900/20 border border-red-700/50 rounded-lg p-3 text-red-400 text-xs flex items-start gap-2"><AlertCircle size={14} className="mt-0.5 flex-shrink-0" />{encError}</div>}

          {encResult && (
            <div className="mt-4 space-y-3">
              <div className="flex items-center gap-2 text-green-400 text-sm"><CheckCircle size={16} /> Encapsulation successful</div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-gray-400 text-xs">KEM Ciphertext (send to recipient)</span>
                  <CopyBtn text={encResult.kem_ciphertext} />
                </div>
                <div className="bg-[#050810] rounded p-2 font-mono text-xs text-cyan-300 break-all">{encResult.kem_ciphertext.substring(0, 80)}...</div>
              </div>
              <div>
                <span className="text-gray-400 text-xs">Your Shared Secret Hash (SHA-256 — safe to show)</span>
                <div className="bg-[#050810] rounded p-2 font-mono text-xs text-green-400 break-all mt-1">{encResult.shared_secret_hash}</div>
              </div>
              <div className="text-xs text-gray-500 flex items-start gap-1"><Info size={12} className="mt-0.5" />The raw shared secret is never transmitted. Only the ciphertext is sent.</div>
            </div>
          )}
        </div>

        {/* Decapsulate */}
        <div className="bg-[#0d1526] border border-[#1a2a4a] rounded-xl p-6">
          <h2 className="text-lg font-bold text-white mb-1">Step 2 — Decapsulate</h2>
          <p className="text-gray-400 text-xs mb-4">Recipient decapsulates using their private key (login as recipient to test)</p>

          <div className="space-y-3">
            <div>
              <label className="text-gray-400 text-sm block mb-1">KEM Ciphertext (received)</label>
              <textarea
                value={decCiphertext}
                onChange={e => setDecCiphertext(e.target.value)}
                placeholder="Paste KEM ciphertext here..."
                rows={4}
                className="bg-[#050810] border border-[#1a2a4a] rounded-lg px-3 py-2 text-white w-full focus:outline-none focus:border-cyan-500 font-mono text-xs resize-none"
              />
            </div>
            <button
              onClick={handleDecapsulate}
              disabled={decLoading || !decCiphertext.trim()}
              className="w-full bg-purple-700 hover:bg-purple-600 disabled:opacity-50 text-white py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
            >
              {decLoading ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Decapsulating...</> : '← Decapsulate'}
            </button>
          </div>

          {decError && <div className="mt-3 bg-red-900/20 border border-red-700/50 rounded-lg p-3 text-red-400 text-xs flex items-start gap-2"><AlertCircle size={14} className="mt-0.5 flex-shrink-0" />{decError}</div>}

          {decResult && (
            <div className="mt-4 space-y-3">
              <div className="flex items-center gap-2 text-green-400 text-sm"><CheckCircle size={16} /> Decapsulation successful</div>
              <div>
                <span className="text-gray-400 text-xs">Recovered Shared Secret Hash</span>
                <div className="bg-[#050810] rounded p-2 font-mono text-xs text-green-400 break-all mt-1">{decResult.shared_secret_hash}</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Verification */}
      {encResult && decResult && (
        <div className={`rounded-xl p-6 border-2 ${secretsMatch ? 'bg-green-900/20 border-green-500/50' : 'bg-red-900/20 border-red-500/50'}`}>
          <div className="text-center">
            <div className={`text-5xl mb-3`}>{secretsMatch ? '✅' : '❌'}</div>
            <h3 className={`text-2xl font-bold mb-2 ${secretsMatch ? 'text-green-400' : 'text-red-400'}`}>
              {secretsMatch ? 'Shared Secrets MATCH!' : 'Shared Secrets DO NOT Match'}
            </h3>
            <p className="text-gray-400 text-sm">
              {secretsMatch
                ? 'Both parties derived the identical shared secret. A symmetric encryption key can now be safely derived using HKDF-SHA-256.'
                : 'The secrets differ — this indicates a key mismatch or the ciphertext was intended for a different recipient.'}
            </p>
            {secretsMatch && (
              <div className="mt-4 font-mono text-xs text-green-400 bg-[#050810] rounded-lg p-3">
                SHA-256(shared_secret): {encResult.shared_secret_hash}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default KEM;
