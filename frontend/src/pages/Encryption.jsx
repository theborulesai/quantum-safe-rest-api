import React, { useState } from 'react';
import { Shield, Copy, CheckCircle, AlertCircle, Info, Lock, Unlock } from 'lucide-react';
import { encryptMessage, decryptMessage } from '../services/api';

const CopyBtn = ({ text }) => {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="p-1 text-gray-500 hover:text-cyan-400 transition-colors" title="Copy">
      {copied ? <CheckCircle size={13} className="text-green-400" /> : <Copy size={13} />}
    </button>
  );
};

const FieldRow = ({ label, value, mono = true }) => (
  <div>
    <div className="flex items-center justify-between mb-1">
      <span className="text-gray-400 text-xs">{label}</span>
      <CopyBtn text={value} />
    </div>
    <div className={`bg-[#050810] rounded-lg p-2 text-xs break-all leading-relaxed ${mono ? 'font-mono text-cyan-300' : 'text-white'}`}>
      {value.length > 100 ? value.substring(0, 120) + '...' : value}
    </div>
  </div>
);

const Encryption = () => {
  const [tab, setTab] = useState('encrypt');

  // Encrypt state
  const [encPlaintext, setEncPlaintext] = useState('');
  const [encRecipient, setEncRecipient] = useState('');
  const [encResult, setEncResult] = useState(null);
  const [encLoading, setEncLoading] = useState(false);
  const [encError, setEncError] = useState('');

  // Decrypt state
  const [decNonce, setDecNonce] = useState('');
  const [decCiphertext, setDecCiphertext] = useState('');
  const [decKemCt, setDecKemCt] = useState('');
  const [decResult, setDecResult] = useState(null);
  const [decLoading, setDecLoading] = useState(false);
  const [decError, setDecError] = useState('');

  const handleEncrypt = async () => {
    if (!encPlaintext.trim() || !encRecipient.trim()) return;
    setEncLoading(true); setEncError(''); setEncResult(null);
    try {
      const res = await encryptMessage(encPlaintext, encRecipient.trim());
      setEncResult(res.data);
      // Auto-fill decrypt fields
      setDecNonce(res.data.nonce);
      setDecCiphertext(res.data.ciphertext);
      setDecKemCt(res.data.kem_ciphertext);
    } catch (err) {
      setEncError(err.response?.data?.detail || 'Encryption failed');
    } finally { setEncLoading(false); }
  };

  const handleDecrypt = async () => {
    setDecLoading(true); setDecError(''); setDecResult(null);
    try {
      const res = await decryptMessage(decNonce, decCiphertext, decKemCt);
      setDecResult(res.data);
    } catch (err) {
      setDecError(err.response?.data?.detail || 'Decryption failed — ciphertext may be tampered');
    } finally { setDecLoading(false); }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Shield className="text-cyan-400" size={28} />
        <div>
          <h1 className="text-2xl font-bold text-white">Hybrid Encryption</h1>
          <p className="text-gray-400 text-sm">AES-256-GCM + ML-KEM-768 (HKDF-SHA-256) — NIST FIPS 203/197</p>
        </div>
      </div>

      {/* Protocol */}
      <div className="bg-[#0d1526] border border-yellow-500/20 rounded-xl p-5">
        <h3 className="text-yellow-400 font-bold mb-3 text-sm uppercase tracking-wider">Hybrid Encryption Protocol</h3>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-2 text-xs text-center">
          {[
            { label: 'Plaintext', color: 'text-white', bg: 'bg-gray-800' },
            { label: 'ML-KEM-768\nEncapsulate', color: 'text-cyan-400', bg: 'bg-cyan-900/30' },
            { label: 'HKDF-SHA-256\nKey Derivation', color: 'text-yellow-400', bg: 'bg-yellow-900/30' },
            { label: 'AES-256-GCM\nEncrypt', color: 'text-green-400', bg: 'bg-green-900/30' },
            { label: 'Ciphertext\n+ KEM CT', color: 'text-purple-400', bg: 'bg-purple-900/30' },
          ].map((step, i) => (
            <div key={i} className={`${step.bg} rounded-lg p-3 ${step.color} font-mono whitespace-pre-line leading-tight`}>
              {step.label}
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button onClick={() => setTab('encrypt')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${tab === 'encrypt' ? 'bg-cyan-600 text-white' : 'bg-[#0d1526] text-gray-400 hover:text-white border border-[#1a2a4a]'}`}>
          <Lock size={16} /> Encrypt
        </button>
        <button onClick={() => setTab('decrypt')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${tab === 'decrypt' ? 'bg-green-700 text-white' : 'bg-[#0d1526] text-gray-400 hover:text-white border border-[#1a2a4a]'}`}>
          <Unlock size={16} /> Decrypt
        </button>
      </div>

      {tab === 'encrypt' && (
        <div className="bg-[#0d1526] border border-[#1a2a4a] rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-bold text-white">Encrypt a Message</h2>
          <div>
            <label className="text-gray-400 text-sm block mb-1">Recipient Username</label>
            <input type="text" value={encRecipient} onChange={e => setEncRecipient(e.target.value)}
              placeholder="e.g., bob"
              className="bg-[#050810] border border-[#1a2a4a] rounded-lg px-3 py-2 text-white w-full focus:outline-none focus:border-cyan-500" />
          </div>
          <div>
            <label className="text-gray-400 text-sm block mb-1">Plaintext Message</label>
            <textarea value={encPlaintext} onChange={e => setEncPlaintext(e.target.value)}
              placeholder="Enter message to encrypt..."
              rows={4}
              className="bg-[#050810] border border-[#1a2a4a] rounded-lg px-3 py-2 text-white w-full focus:outline-none focus:border-cyan-500 resize-none" />
          </div>
          <button onClick={handleEncrypt} disabled={encLoading || !encPlaintext.trim() || !encRecipient.trim()}
            className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2">
            {encLoading ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Encrypting...</> : <><Lock size={16} />Encrypt Message</>}
          </button>

          {encError && <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-3 text-red-400 text-sm flex items-start gap-2"><AlertCircle size={16} className="mt-0.5 flex-shrink-0" />{encError}</div>}

          {encResult && (
            <div className="space-y-3 mt-2">
              <div className="flex items-center gap-2 text-green-400"><CheckCircle size={18} /><span className="font-medium">Encrypted successfully!</span></div>
              <div className="text-xs text-gray-400 font-mono bg-[#050810] rounded p-2">{encResult.algorithm}</div>
              <FieldRow label="AES-GCM Nonce (Base64, 12 bytes)" value={encResult.nonce} />
              <FieldRow label="Ciphertext (Base64, includes GCM authentication tag)" value={encResult.ciphertext} />
              <FieldRow label="KEM Ciphertext (Base64, 1088 bytes)" value={encResult.kem_ciphertext} />
              <div className="text-xs text-gray-500 flex items-start gap-1 bg-blue-900/20 border border-blue-700/30 rounded p-3">
                <Info size={12} className="mt-0.5 text-blue-400 flex-shrink-0" />
                The Decrypt tab has been auto-filled. Log in as the recipient to decrypt, or click Decrypt to test with your own keys.
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'decrypt' && (
        <div className="bg-[#0d1526] border border-[#1a2a4a] rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-bold text-white">Decrypt a Message</h2>
          <p className="text-gray-400 text-sm">Uses your ML-KEM-768 private key to decapsulate, then decrypts with AES-256-GCM.</p>

          <div>
            <label className="text-gray-400 text-sm block mb-1">AES-GCM Nonce (Base64)</label>
            <input type="text" value={decNonce} onChange={e => setDecNonce(e.target.value)}
              placeholder="Nonce..."
              className="bg-[#050810] border border-[#1a2a4a] rounded-lg px-3 py-2 text-white w-full focus:outline-none focus:border-green-500 font-mono text-xs" />
          </div>
          <div>
            <label className="text-gray-400 text-sm block mb-1">Ciphertext (Base64)</label>
            <textarea value={decCiphertext} onChange={e => setDecCiphertext(e.target.value)}
              rows={3}
              className="bg-[#050810] border border-[#1a2a4a] rounded-lg px-3 py-2 text-white w-full focus:outline-none focus:border-green-500 font-mono text-xs resize-none" />
          </div>
          <div>
            <label className="text-gray-400 text-sm block mb-1">KEM Ciphertext (Base64)</label>
            <textarea value={decKemCt} onChange={e => setDecKemCt(e.target.value)}
              rows={3}
              className="bg-[#050810] border border-[#1a2a4a] rounded-lg px-3 py-2 text-white w-full focus:outline-none focus:border-green-500 font-mono text-xs resize-none" />
          </div>

          <button onClick={handleDecrypt} disabled={decLoading || !decNonce.trim() || !decCiphertext.trim() || !decKemCt.trim()}
            className="w-full bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2">
            {decLoading ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Decrypting...</> : <><Unlock size={16} />Decrypt Message</>}
          </button>

          {decError && (
            <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-4 text-red-400 text-sm">
              <div className="flex items-start gap-2 font-medium mb-1"><AlertCircle size={16} className="flex-shrink-0 mt-0.5" />Decryption Failed</div>
              <p className="text-xs">{decError}</p>
              <p className="text-xs text-red-300 mt-2">💡 This may indicate the ciphertext was tampered with, or it was encrypted for a different recipient. AES-GCM authentication tag verification failed.</p>
            </div>
          )}

          {decResult && (
            <div className="bg-green-900/20 border border-green-700/50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-green-400 font-medium mb-3"><Unlock size={18} />Decryption Successful!</div>
              <div>
                <span className="text-gray-400 text-sm">Decrypted Plaintext:</span>
                <div className="mt-2 bg-[#050810] rounded-lg p-3 text-white text-sm leading-relaxed">{decResult.plaintext}</div>
              </div>
              <div className="mt-2 text-xs text-gray-400 font-mono">{decResult.algorithm}</div>
            </div>
          )}

          {/* Tamper demo note */}
          <div className="bg-orange-900/20 border border-orange-700/30 rounded-lg p-3 text-xs text-orange-300 flex items-start gap-2">
            <Info size={12} className="mt-0.5 flex-shrink-0 text-orange-400" />
            <span><strong>Tamper Detection Demo:</strong> Modify any character in the ciphertext field above and click Decrypt — AES-256-GCM's authentication tag will catch the tampering and return an error.</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default Encryption;
