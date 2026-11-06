import React, { useState } from 'react';
import { FileText, Copy, CheckCircle, AlertCircle, Info, Edit3 } from 'lucide-react';
import { signMessage, verifySignature } from '../services/api';

const CopyBtn = ({ text }) => {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="flex items-center gap-1 text-xs text-gray-500 hover:text-cyan-400 transition-colors">
      {copied ? <><CheckCircle size={12} className="text-green-400" />Copied</> : <><Copy size={12} />Copy</>}
    </button>
  );
};

const Signatures = () => {
  // Sign state
  const [signMsg, setSignMsg] = useState('');
  const [signResult, setSignResult] = useState(null);
  const [signLoading, setSignLoading] = useState(false);
  const [signError, setSignError] = useState('');

  // Verify state
  const [verSigner, setVerSigner] = useState('');
  const [verMsg, setVerMsg] = useState('');
  const [verSig, setVerSig] = useState('');
  const [verResult, setVerResult] = useState(null);
  const [verLoading, setVerLoading] = useState(false);
  const [verError, setVerError] = useState('');

  const handleSign = async () => {
    if (!signMsg.trim()) return;
    setSignLoading(true); setSignError(''); setSignResult(null);
    try {
      const res = await signMessage(signMsg);
      setSignResult(res.data);
      // Auto-fill verify fields
      setVerMsg(signMsg);
      setVerSig(res.data.signature);
    } catch (err) {
      setSignError(err.response?.data?.detail || 'Signing failed');
    } finally { setSignLoading(false); }
  };

  const handleVerify = async () => {
    if (!verSigner.trim() || !verMsg.trim() || !verSig.trim()) return;
    setVerLoading(true); setVerError(''); setVerResult(null);
    try {
      const res = await verifySignature(verSigner.trim(), verMsg, verSig.trim());
      setVerResult(res.data);
    } catch (err) {
      setVerError(err.response?.data?.detail || 'Verification failed');
    } finally { setVerLoading(false); }
  };

  const fillTamperedDemo = () => {
    if (signResult) {
      setVerMsg(signMsg + ' [TAMPERED]');
      setVerSig(signResult.signature);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <FileText className="text-purple-400" size={28} />
        <div>
          <h1 className="text-2xl font-bold text-white">ML-DSA-65 Digital Signatures</h1>
          <p className="text-gray-400 text-sm">NIST FIPS 204 — Quantum-safe authentication & non-repudiation</p>
        </div>
      </div>

      {/* Info */}
      <div className="bg-[#0d1526] border border-purple-500/20 rounded-xl p-5">
        <h3 className="text-purple-400 font-bold mb-3 text-sm uppercase tracking-wider">About ML-DSA-65</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs text-center mb-3">
          {[['Public Key', '1,952 bytes', 'text-cyan-400'], ['Private Key', '4,032 bytes', 'text-purple-400'], ['Signature', '3,309 bytes', 'text-yellow-400'], ['Security', 'AES-192 equiv.', 'text-green-400']].map(([label, val, color]) => (
            <div key={label} className="bg-[#050810] rounded-lg p-3">
              <div className={`font-mono font-bold ${color}`}>{val}</div>
              <div className="text-gray-500">{label}</div>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-400">Based on CRYSTALS-Dilithium (Module-Lattice). Quantum-safe alternative to ECDSA-P384 and RSA signatures. Resistant to Shor's algorithm attacks by quantum computers.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Sign */}
        <div className="bg-[#0d1526] border border-[#1a2a4a] rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2"><Edit3 size={18} className="text-purple-400" />Sign a Message</h2>
          <p className="text-gray-400 text-xs">Signs with your ML-DSA-65 private key. Only you can produce a valid signature.</p>

          <div>
            <label className="text-gray-400 text-sm block mb-1">Message to Sign</label>
            <textarea value={signMsg} onChange={e => setSignMsg(e.target.value)}
              placeholder="Enter message to sign..."
              rows={5}
              className="bg-[#050810] border border-[#1a2a4a] rounded-lg px-3 py-2 text-white w-full focus:outline-none focus:border-purple-500 resize-none" />
          </div>

          <button onClick={handleSign} disabled={signLoading || !signMsg.trim()}
            className="w-full bg-purple-700 hover:bg-purple-600 disabled:opacity-50 text-white py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2">
            {signLoading ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Signing...</> : <><FileText size={16} />Sign with ML-DSA-65</>}
          </button>

          {signError && <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-3 text-red-400 text-xs flex items-start gap-2"><AlertCircle size={14} className="mt-0.5 flex-shrink-0" />{signError}</div>}

          {signResult && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-green-400 text-sm"><CheckCircle size={16} />Signed successfully</div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-gray-400 text-xs">ML-DSA-65 Signature (3,309 bytes, Base64)</span>
                  <CopyBtn text={signResult.signature} />
                </div>
                <div className="bg-[#050810] rounded-lg p-2 font-mono text-xs text-purple-300 break-all">{signResult.signature.substring(0, 100)}...</div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-gray-400 text-xs">Message SHA-256 Hash</span>
                  <CopyBtn text={signResult.message_hash} />
                </div>
                <div className="bg-[#050810] rounded-lg p-2 font-mono text-xs text-yellow-300 break-all">{signResult.message_hash}</div>
              </div>
              <div className="text-xs text-gray-500 flex items-start gap-1"><Info size={11} className="mt-0.5" />Verify section auto-filled. Try modifying the message in Verify to see tamper detection.</div>
            </div>
          )}
        </div>

        {/* Verify */}
        <div className="bg-[#0d1526] border border-[#1a2a4a] rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2"><CheckCircle size={18} className="text-green-400" />Verify a Signature</h2>
          <p className="text-gray-400 text-xs">Anyone can verify a signature using the signer's public key.</p>

          <div>
            <label className="text-gray-400 text-sm block mb-1">Signer's Username</label>
            <input type="text" value={verSigner} onChange={e => setVerSigner(e.target.value)}
              placeholder="e.g., alice"
              className="bg-[#050810] border border-[#1a2a4a] rounded-lg px-3 py-2 text-white w-full focus:outline-none focus:border-green-500" />
          </div>
          <div>
            <label className="text-gray-400 text-sm block mb-1">Message</label>
            <textarea value={verMsg} onChange={e => setVerMsg(e.target.value)}
              rows={3}
              className="bg-[#050810] border border-[#1a2a4a] rounded-lg px-3 py-2 text-white w-full focus:outline-none focus:border-green-500 resize-none" />
          </div>
          <div>
            <label className="text-gray-400 text-sm block mb-1">Signature (Base64)</label>
            <textarea value={verSig} onChange={e => setVerSig(e.target.value)}
              rows={4}
              className="bg-[#050810] border border-[#1a2a4a] rounded-lg px-3 py-2 text-white w-full focus:outline-none focus:border-green-500 resize-none font-mono text-xs" />
          </div>

          <div className="flex gap-2">
            <button onClick={handleVerify} disabled={verLoading || !verSigner.trim() || !verMsg.trim() || !verSig.trim()}
              className="flex-1 bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2">
              {verLoading ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Verifying...</> : 'Verify Signature'}
            </button>
            {signResult && (
              <button onClick={fillTamperedDemo} title="Demo: tamper the message"
                className="bg-red-800/60 hover:bg-red-700/60 text-red-300 px-3 py-2 rounded-lg text-xs font-medium transition-colors border border-red-700/50">
                Tamper Demo
              </button>
            )}
          </div>

          {verError && <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-3 text-red-400 text-xs">{verError}</div>}

          {verResult && (
            <div className={`rounded-xl p-5 text-center border-2 ${verResult.valid ? 'bg-green-900/20 border-green-500/60' : 'bg-red-900/20 border-red-500/60'}`}>
              <div className="text-5xl mb-2">{verResult.valid ? '✅' : '❌'}</div>
              <h3 className={`text-xl font-bold mb-1 ${verResult.valid ? 'text-green-400' : 'text-red-400'}`}>
                {verResult.valid ? 'SIGNATURE VALID' : 'SIGNATURE INVALID'}
              </h3>
              <p className="text-xs text-gray-400">{verResult.message}</p>
              <div className="mt-2 text-xs text-gray-500 font-mono">{verResult.algorithm}</div>
            </div>
          )}
        </div>
      </div>

      {/* Tamper explain */}
      <div className="bg-[#0d1526] border border-orange-500/20 rounded-xl p-5">
        <h3 className="text-orange-400 font-bold mb-2 text-sm">🔍 Tamper Detection Demonstration</h3>
        <ol className="text-gray-400 text-sm space-y-1 list-decimal list-inside">
          <li>Type a message in the Sign section and click <strong className="text-white">Sign with ML-DSA-65</strong></li>
          <li>The Verify section is auto-filled. Verify it — it should show <strong className="text-green-400">VALID</strong></li>
          <li>Click <strong className="text-red-400">Tamper Demo</strong> to append "[TAMPERED]" to the message</li>
          <li>Click Verify again — it shows <strong className="text-red-400">INVALID</strong>, detecting the modification</li>
        </ol>
        <p className="text-xs text-gray-500 mt-3">This demonstrates non-repudiation: Alice's signature only validates against the exact original message and her public key.</p>
      </div>
    </div>
  );
};

export default Signatures;

