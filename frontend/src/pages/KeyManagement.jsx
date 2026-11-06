import React, { useState } from 'react';
import { Key, Copy, CheckCircle, Download, AlertCircle, Info } from 'lucide-react';
import { generateKeys, getPublicKeys } from '../services/api';

const CopyButton = ({ text }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={handleCopy} className="ml-2 p-1 text-gray-500 hover:text-cyan-400 transition-colors" title="Copy">
      {copied ? <CheckCircle size={14} className="text-green-400" /> : <Copy size={14} />}
    </button>
  );
};

const KeyDisplay = ({ label, value, size }) => {
  const [expanded, setExpanded] = useState(false);
  if (!value) return null;
  const preview = value.substring(0, 64) + '...';
  return (
    <div className="bg-[#050810] border border-[#1a2a4a] rounded-lg p-3 mt-2">
      <div className="flex items-center justify-between mb-2">
        <span className="text-gray-400 text-xs">{label}</span>
        <div className="flex items-center gap-2">
          {size && <span className="text-yellow-400 text-xs font-mono">{size} bytes</span>}
          <CopyButton text={value} />
          <button onClick={() => setExpanded(v => !v)} className="text-xs text-cyan-400 hover:underline">
            {expanded ? 'Collapse' : 'Expand'}
          </button>
        </div>
      </div>
      <div className="font-mono text-xs text-cyan-300 break-all leading-relaxed">
        {expanded ? value : preview}
      </div>
    </div>
  );
};

const KeyManagement = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [keys, setKeys] = useState({ kem_public_key: null, dsa_public_key: null });
  const [algo, setAlgo] = useState('both');

  // Lookup public keys
  const [lookupUsername, setLookupUsername] = useState('');
  const [lookupResult, setLookupResult] = useState(null);
  const [lookupError, setLookupError] = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await generateKeys(algo);
      setKeys(res.data);
      setSuccess(`Key pair(s) generated successfully!`);
    } catch (err) {
      setError(err.response?.data?.detail || 'Key generation failed');
    } finally {
      setLoading(false);
    }
  };

  const handleLookup = async () => {
    if (!lookupUsername.trim()) return;
    setLookupLoading(true);
    setLookupError('');
    setLookupResult(null);
    try {
      const res = await getPublicKeys(lookupUsername.trim());
      setLookupResult(res.data);
    } catch (err) {
      setLookupError(err.response?.data?.detail || `User '${lookupUsername}' not found`);
    } finally {
      setLookupLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Key className="text-cyan-400" size={28} />
        <div>
          <h1 className="text-2xl font-bold text-white">Key Management</h1>
          <p className="text-gray-400 text-sm">Generate and inspect post-quantum cryptographic key pairs</p>
        </div>
      </div>

      {/* Algorithm info cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-[#0d1526] border border-cyan-500/30 rounded-xl p-5">
          <h3 className="text-cyan-400 font-bold mb-3 font-mono">ML-KEM-768</h3>
          <div className="text-xs text-gray-400 space-y-1">
            <div>Standard: <span className="text-white">NIST FIPS 203 (2024)</span></div>
            <div>Purpose: <span className="text-white">Key Encapsulation</span></div>
            <div>Public Key: <span className="text-yellow-400 font-mono">1,184 bytes</span></div>
            <div>Private Key: <span className="text-yellow-400 font-mono">2,400 bytes</span></div>
            <div>Ciphertext: <span className="text-yellow-400 font-mono">1,088 bytes</span></div>
            <div>Shared Secret: <span className="text-yellow-400 font-mono">32 bytes</span></div>
            <div>Security Level: <span className="text-green-400">AES-192 equivalent</span></div>
          </div>
        </div>
        <div className="bg-[#0d1526] border border-purple-500/30 rounded-xl p-5">
          <h3 className="text-purple-400 font-bold mb-3 font-mono">ML-DSA-65</h3>
          <div className="text-xs text-gray-400 space-y-1">
            <div>Standard: <span className="text-white">NIST FIPS 204 (2024)</span></div>
            <div>Purpose: <span className="text-white">Digital Signatures</span></div>
            <div>Public Key: <span className="text-yellow-400 font-mono">1,952 bytes</span></div>
            <div>Private Key: <span className="text-yellow-400 font-mono">4,032 bytes</span></div>
            <div>Signature Size: <span className="text-yellow-400 font-mono">3,309 bytes</span></div>
            <div>Security Level: <span className="text-green-400">AES-192 equivalent</span></div>
          </div>
        </div>
      </div>

      {/* Generate Keys */}
      <div className="bg-[#0d1526] border border-[#1a2a4a] rounded-xl p-6">
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <Download size={20} className="text-cyan-400" /> Generate Key Pairs
        </h2>

        <div className="flex flex-wrap items-center gap-4 mb-4">
          <div>
            <label className="text-gray-400 text-sm block mb-1">Algorithm Selection</label>
            <select
              value={algo}
              onChange={e => setAlgo(e.target.value)}
              className="bg-[#050810] border border-[#1a2a4a] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
            >
              <option value="both">Both (ML-KEM-768 + ML-DSA-65)</option>
              <option value="kem">ML-KEM-768 only</option>
              <option value="dsa">ML-DSA-65 only</option>
            </select>
          </div>
          <div className="pt-5">
            <button
              onClick={handleGenerate}
              disabled={loading}
              className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg font-medium transition-colors"
            >
              {loading ? (
                <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Generating...</>
              ) : (
                <><Key size={16} /> Generate Keys</>
              )}
            </button>
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-2 bg-red-900/20 border border-red-700/50 rounded-lg p-3 text-red-400 text-sm mb-4">
            <AlertCircle size={16} className="mt-0.5 flex-shrink-0" /> {error}
          </div>
        )}
        {success && (
          <div className="flex items-start gap-2 bg-green-900/20 border border-green-700/50 rounded-lg p-3 text-green-400 text-sm mb-4">
            <CheckCircle size={16} className="mt-0.5 flex-shrink-0" /> {success}
          </div>
        )}

        {keys.kem_public_key && (
          <KeyDisplay label="ML-KEM-768 Public Key (Base64)" value={keys.kem_public_key} size="1,184" />
        )}
        {keys.dsa_public_key && (
          <KeyDisplay label="ML-DSA-65 Public Key (Base64)" value={keys.dsa_public_key} size="1,952" />
        )}

        <div className="mt-4 flex items-start gap-2 bg-blue-900/20 border border-blue-700/50 rounded-lg p-3 text-blue-300 text-xs">
          <Info size={14} className="mt-0.5 flex-shrink-0 text-blue-400" />
          <span>
            <strong>Security Note:</strong> Private keys are stored server-side in this demo for educational purposes.
            In production systems, private keys must NEVER leave the client device. Only public keys are shared.
          </span>
        </div>
      </div>

      {/* Lookup Public Keys */}
      <div className="bg-[#0d1526] border border-[#1a2a4a] rounded-xl p-6">
        <h2 className="text-xl font-bold text-white mb-4">Fetch User's Public Keys</h2>
        <p className="text-gray-400 text-sm mb-4">Public keys are publicly shareable. Enter any registered username to retrieve their PQC public keys.</p>
        <div className="flex gap-3">
          <input
            type="text"
            value={lookupUsername}
            onChange={e => setLookupUsername(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLookup()}
            placeholder="Enter username..."
            className="bg-[#050810] border border-[#1a2a4a] rounded-lg px-3 py-2 text-white flex-1 focus:outline-none focus:border-cyan-500"
          />
          <button
            onClick={handleLookup}
            disabled={lookupLoading || !lookupUsername.trim()}
            className="bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white px-5 py-2 rounded-lg font-medium transition-colors"
          >
            {lookupLoading ? 'Searching...' : 'Fetch'}
          </button>
        </div>

        {lookupError && (
          <div className="mt-3 bg-red-900/20 border border-red-700/50 rounded-lg p-3 text-red-400 text-sm">{lookupError}</div>
        )}

        {lookupResult && (
          <div className="mt-4 space-y-2">
            <div className="flex items-center gap-2 text-green-400 text-sm mb-3">
              <CheckCircle size={16} /> Found user: <strong>{lookupResult.username}</strong> (ID: {lookupResult.user_id})
            </div>
            <KeyDisplay label="ML-KEM-768 Public Key" value={lookupResult.kem_public_key} size="1,184" />
            <KeyDisplay label="ML-DSA-65 Public Key" value={lookupResult.dsa_public_key} size="1,952" />
            {!lookupResult.kem_public_key && !lookupResult.dsa_public_key && (
              <p className="text-yellow-400 text-sm">This user has not generated any keys yet.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default KeyManagement;

