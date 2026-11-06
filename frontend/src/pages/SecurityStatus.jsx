import React, { useState, useEffect } from 'react';
import { getSecurityStatus } from '../services/api';
import { Shield, CheckCircle, AlertTriangle, Lock, Key, Cpu } from 'lucide-react';

const SecurityStatus = () => {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getSecurityStatus()
      .then(res => { setStatus(res.data); setLoading(false); })
      .catch(err => { setError('Failed to fetch status'); setLoading(false); });
  }, []);

  if (loading) return (
    <div className="p-6 flex items-center justify-center h-64">
      <div className="text-center">
        <div className="w-12 h-12 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-400">Loading security status...</p>
      </div>
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="text-cyan-400" size={28} />
        <div>
          <h1 className="text-2xl font-bold text-white">Security Status</h1>
          <p className="text-gray-400 text-sm">Current post-quantum cryptographic configuration</p>
        </div>
      </div>

      {error && <div className="bg-red-900/20 border border-red-700/50 rounded-xl p-4 text-red-400">{error}</div>}

      {status && (
        <>
          {/* PQC Active Banner */}
          <div className={`rounded-xl p-6 border ${status.pqc_active ? 'bg-green-900/20 border-green-700/50' : 'bg-red-900/20 border-red-700/50'}`}>
            <div className="flex items-center gap-4">
              {status.pqc_active
                ? <CheckCircle className="text-green-400" size={40} />
                : <AlertTriangle className="text-red-400" size={40} />}
              <div>
                <h2 className={`text-2xl font-bold ${status.pqc_active ? 'text-green-400' : 'text-red-400'}`}>
                  {status.pqc_active ? '🔐 Post-Quantum Cryptography ACTIVE' : '⚠ PQC Not Active'}
                </h2>
                <p className="text-gray-400">{status.quantum_resistance}</p>
              </div>
            </div>
          </div>

          {/* Algorithm Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-[#0d1526] border border-cyan-500/30 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <Key className="text-cyan-400" size={24} />
                <h3 className="text-lg font-bold text-white">Key Encapsulation</h3>
              </div>
              <div className="space-y-3">
                <div>
                  <span className="text-gray-400 text-sm">Algorithm</span>
                  <div className="text-cyan-400 font-mono font-bold">{status.kem_algorithm}</div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-[#050810] rounded-lg p-3">
                    <div className="text-gray-400">Public Key</div>
                    <div className="text-white font-mono font-bold">1,184 bytes</div>
                  </div>
                  <div className="bg-[#050810] rounded-lg p-3">
                    <div className="text-gray-400">Private Key</div>
                    <div className="text-white font-mono font-bold">2,400 bytes</div>
                  </div>
                  <div className="bg-[#050810] rounded-lg p-3">
                    <div className="text-gray-400">Ciphertext</div>
                    <div className="text-white font-mono font-bold">1,088 bytes</div>
                  </div>
                  <div className="bg-[#050810] rounded-lg p-3">
                    <div className="text-gray-400">Shared Secret</div>
                    <div className="text-white font-mono font-bold">32 bytes</div>
                  </div>
                </div>
                <div className="text-xs text-gray-500">Security level: AES-192 equivalent against quantum attacks</div>
              </div>
            </div>

            <div className="bg-[#0d1526] border border-purple-500/30 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <Shield className="text-purple-400" size={24} />
                <h3 className="text-lg font-bold text-white">Digital Signatures</h3>
              </div>
              <div className="space-y-3">
                <div>
                  <span className="text-gray-400 text-sm">Algorithm</span>
                  <div className="text-purple-400 font-mono font-bold">{status.dsa_algorithm}</div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-[#050810] rounded-lg p-3">
                    <div className="text-gray-400">Public Key</div>
                    <div className="text-white font-mono font-bold">1,952 bytes</div>
                  </div>
                  <div className="bg-[#050810] rounded-lg p-3">
                    <div className="text-gray-400">Private Key</div>
                    <div className="text-white font-mono font-bold">4,032 bytes</div>
                  </div>
                  <div className="bg-[#050810] rounded-lg p-3 col-span-2">
                    <div className="text-gray-400">Signature Size</div>
                    <div className="text-white font-mono font-bold">3,309 bytes</div>
                  </div>
                </div>
                <div className="text-xs text-gray-500">Security level: AES-192 equivalent against quantum attacks</div>
              </div>
            </div>

            <div className="bg-[#0d1526] border border-yellow-500/30 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <Lock className="text-yellow-400" size={24} />
                <h3 className="text-lg font-bold text-white">Symmetric Encryption</h3>
              </div>
              <div className="space-y-2">
                <div><span className="text-gray-400 text-sm">Algorithm: </span><span className="text-yellow-400 font-mono">{status.symmetric_algorithm}</span></div>
                <div><span className="text-gray-400 text-sm">KDF: </span><span className="text-yellow-400 font-mono">{status.kdf_algorithm}</span></div>
                <div><span className="text-gray-400 text-sm">Transport: </span><span className="text-yellow-400 font-mono">{status.transport}</span></div>
              </div>
            </div>

            <div className="bg-[#0d1526] border border-green-500/30 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <Cpu className="text-green-400" size={24} />
                <h3 className="text-lg font-bold text-white">NIST Standards</h3>
              </div>
              <ul className="space-y-2">
                {status.nist_standards?.map((std, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <CheckCircle className="text-green-400 mt-0.5 flex-shrink-0" size={14} />
                    <span className="text-gray-300">{std}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Quantum Threat Info */}
          <div className="bg-[#0d1526] border border-orange-500/30 rounded-xl p-6">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <AlertTriangle className="text-orange-400" size={20} />
              Quantum Threat Comparison
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-gray-400 uppercase text-xs border-b border-[#1a2a4a]">
                  <tr>
                    <th className="pb-2 text-left">Algorithm</th>
                    <th className="pb-2 text-left">Type</th>
                    <th className="pb-2 text-left">Quantum-Safe?</th>
                    <th className="pb-2 text-left">Threat</th>
                    <th className="pb-2 text-left">Replacement</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1a2a4a]">
                  {[
                    { algo: 'RSA-2048', type: 'Key Exchange', safe: false, threat: "Shor's Algorithm", replacement: 'ML-KEM-768' },
                    { algo: 'ECDH-P384', type: 'Key Exchange', safe: false, threat: "Shor's Algorithm", replacement: 'ML-KEM-768' },
                    { algo: 'ECDSA-P384', type: 'Signatures', safe: false, threat: "Shor's Algorithm", replacement: 'ML-DSA-65' },
                    { algo: 'AES-256-GCM', type: 'Symmetric', safe: true, threat: "Grover's (halves key bits)", replacement: 'Still secure' },
                    { algo: 'SHA-256', type: 'Hashing', safe: true, threat: "Grover's (halves security)", replacement: 'SHA-3 or SHA-256 w/ larger output' },
                    { algo: 'ML-KEM-768', type: 'PQC KEM', safe: true, threat: 'None known', replacement: 'This IS the replacement' },
                    { algo: 'ML-DSA-65', type: 'PQC Signatures', safe: true, threat: 'None known', replacement: 'This IS the replacement' },
                  ].map((row, i) => (
                    <tr key={i} className="hover:bg-[#0a1020] transition-colors">
                      <td className="py-2 text-white font-mono">{row.algo}</td>
                      <td className="py-2 text-gray-400">{row.type}</td>
                      <td className="py-2">
                        {row.safe
                          ? <span className="text-green-400 flex items-center gap-1"><CheckCircle size={12} /> Yes</span>
                          : <span className="text-red-400 flex items-center gap-1"><AlertTriangle size={12} /> No</span>}
                      </td>
                      <td className="py-2 text-orange-300 text-xs">{row.threat}</td>
                      <td className="py-2 text-cyan-400 text-xs font-mono">{row.replacement}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default SecurityStatus;

