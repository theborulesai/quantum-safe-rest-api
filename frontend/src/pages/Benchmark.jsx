import React, { useState } from 'react';
import { BarChart3, AlertCircle, CheckCircle, Clock, Zap } from 'lucide-react';
import { getBenchmark } from '../services/api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

const Benchmark = () => {
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleBenchmark = async () => {
    setLoading(true); setError(''); setResults(null);
    try {
      const res = await getBenchmark();
      setResults(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Benchmark failed');
    } finally {
      setLoading(false);
    }
  };

  // Prepare chart data
  const keygenData = results ? [
    { name: 'ML-KEM-768', time: results.pqc.ml_kem_768.keygen_ms_avg, fill: '#00d4ff' },
    { name: 'ML-DSA-65', time: results.pqc.ml_dsa_65.keygen_ms_avg, fill: '#8b5cf6' },
    { name: 'ECDH-P384', time: results.traditional.ecdh_p384.keygen_ms_avg, fill: '#f59e0b' },
    { name: 'ECDSA-P384', time: results.traditional.ecdsa_p384.keygen_ms_avg, fill: '#f97316' },
    { name: 'RSA-2048', time: results.traditional.rsa_2048.keygen_ms_avg, fill: '#ef4444' },
  ] : [];

  const signVerifyData = results ? [
    { name: 'ML-DSA-65 Sign', time: results.pqc.ml_dsa_65.sign_ms_avg, fill: '#8b5cf6' },
    { name: 'ML-DSA-65 Verify', time: results.pqc.ml_dsa_65.verify_ms_avg, fill: '#a78bfa' },
    { name: 'ECDSA Sign', time: results.traditional.ecdsa_p384.sign_ms_avg, fill: '#f97316' },
    { name: 'ECDSA Verify', time: results.traditional.ecdsa_p384.verify_ms_avg, fill: '#fb923c' },
  ] : [];

  const keySizeData = results ? [
    { name: 'ML-KEM-768 (pub)', size: results.pqc.ml_kem_768.public_key_size_bytes, fill: '#00d4ff' },
    { name: 'ML-DSA-65 (pub)', size: results.pqc.ml_dsa_65.public_key_size_bytes, fill: '#8b5cf6' },
    { name: 'ECDH-P384 (pub)', size: results.traditional.ecdh_p384.public_key_size_bytes, fill: '#f59e0b' },
    { name: 'ECDSA-P384 (pub)', size: results.traditional.ecdsa_p384.public_key_size_bytes, fill: '#f97316' },
    { name: 'RSA-2048 (pub)', size: results.traditional.rsa_2048.public_key_size_bytes, fill: '#ef4444' },
  ] : [];

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#0d1526] border border-[#1a2a4a] rounded-lg p-3 text-xs">
          <p className="text-white font-medium mb-1">{label}</p>
          {payload.map((p, i) => (
            <p key={i} style={{ color: p.fill }}>{p.dataKey}: {typeof p.value === 'number' ? p.value.toFixed(3) : p.value}</p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <BarChart3 className="text-cyan-400" size={28} />
        <div>
          <h1 className="text-2xl font-bold text-white">PQC vs Traditional — Benchmark</h1>
          <p className="text-gray-400 text-sm">Actual measured timings (10 iterations avg) — not fabricated results</p>
        </div>
      </div>

      {/* Warning */}
      <div className="bg-yellow-900/20 border border-yellow-700/40 rounded-xl p-4 flex items-start gap-3 text-sm">
        <Clock size={18} className="text-yellow-400 mt-0.5 flex-shrink-0" />
        <div>
          <span className="text-yellow-400 font-medium">Performance Note: </span>
          <span className="text-gray-300">The PQC implementations (kyber-py, dilithium-py) are pure-Python reference implementations.
          Real-world hardware-accelerated C implementations are <strong>10–100× faster</strong>.
          Benchmark takes approximately 60–120 seconds.</span>
        </div>
      </div>

      <div className="flex justify-center">
        <button onClick={handleBenchmark} disabled={loading}
          className="flex items-center gap-3 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-60 text-white px-8 py-3 rounded-xl font-bold text-lg transition-colors">
          {loading
            ? <><div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />Running Benchmark (please wait ~60s)...</>
            : <><Zap size={20} />Run Benchmark</>}
        </button>
      </div>

      {error && <div className="bg-red-900/20 border border-red-700/50 rounded-xl p-4 text-red-400 flex items-start gap-2"><AlertCircle size={16} className="mt-0.5" />{error}</div>}

      {results && (
        <>
          {/* Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-[#0d1526] border border-[#1a2a4a] rounded-xl p-6">
              <h3 className="text-white font-bold mb-4">Key Generation Time (ms avg, lower = faster)</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={keygenData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1a2a4a" />
                  <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 10 }} angle={-20} textAnchor="end" height={60} />
                  <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="time" name="ms avg">
                    {keygenData.map((entry, i) => (
                      <rect key={i} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-[#0d1526] border border-[#1a2a4a] rounded-xl p-6">
              <h3 className="text-white font-bold mb-4">Sign / Verify Time (ms avg)</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={signVerifyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1a2a4a" />
                  <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 10 }} angle={-20} textAnchor="end" height={60} />
                  <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="time" name="ms avg">
                    {signVerifyData.map((entry, i) => (
                      <rect key={i} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-[#0d1526] border border-[#1a2a4a] rounded-xl p-6 md:col-span-2">
              <h3 className="text-white font-bold mb-4">Public Key Size (bytes)</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={keySizeData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#1a2a4a" />
                  <XAxis type="number" tick={{ fill: '#9ca3af', fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" tick={{ fill: '#9ca3af', fontSize: 11 }} width={130} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="size" name="bytes">
                    {keySizeData.map((entry, i) => (
                      <rect key={i} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Detailed Table */}
          <div className="bg-[#0d1526] border border-[#1a2a4a] rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-[#1a2a4a]">
              <h3 className="text-white font-bold">Detailed Results</h3>
              <p className="text-gray-400 text-xs">All times in milliseconds (average of {results.pqc.ml_kem_768.iterations} iterations). All sizes in bytes.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[#050810] text-gray-400 text-xs uppercase">
                  <tr>
                    <th className="px-4 py-3 text-left">Algorithm</th>
                    <th className="px-4 py-3 text-left">Type</th>
                    <th className="px-4 py-3 text-right">KeyGen (ms)</th>
                    <th className="px-4 py-3 text-right">KEM/Exchange (ms)</th>
                    <th className="px-4 py-3 text-right">Sign (ms)</th>
                    <th className="px-4 py-3 text-right">Verify (ms)</th>
                    <th className="px-4 py-3 text-right">Pub Key (B)</th>
                    <th className="px-4 py-3 text-right">Sig/CT (B)</th>
                    <th className="px-4 py-3 text-left">Quantum-Safe?</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1a2a4a]">
                  {[
                    {
                      algo: 'ML-KEM-768', type: 'PQC KEM', color: 'text-cyan-400',
                      keygen: results.pqc.ml_kem_768.keygen_ms_avg,
                      kem: results.pqc.ml_kem_768.encaps_ms_avg,
                      sign: '—', verify: '—',
                      pub: results.pqc.ml_kem_768.public_key_size_bytes,
                      sigct: results.pqc.ml_kem_768.ciphertext_size_bytes,
                      safe: true
                    },
                    {
                      algo: 'ML-DSA-65', type: 'PQC DSA', color: 'text-purple-400',
                      keygen: results.pqc.ml_dsa_65.keygen_ms_avg,
                      kem: '—',
                      sign: results.pqc.ml_dsa_65.sign_ms_avg,
                      verify: results.pqc.ml_dsa_65.verify_ms_avg,
                      pub: results.pqc.ml_dsa_65.public_key_size_bytes,
                      sigct: results.pqc.ml_dsa_65.signature_size_bytes,
                      safe: true
                    },
                    {
                      algo: 'RSA-2048', type: 'Classical', color: 'text-red-400',
                      keygen: results.traditional.rsa_2048.keygen_ms_avg,
                      kem: results.traditional.rsa_2048.encrypt_ms_avg,
                      sign: '—', verify: '—',
                      pub: results.traditional.rsa_2048.public_key_size_bytes,
                      sigct: '—', safe: false
                    },
                    {
                      algo: 'ECDH-P384', type: 'Classical', color: 'text-yellow-400',
                      keygen: results.traditional.ecdh_p384.keygen_ms_avg,
                      kem: results.traditional.ecdh_p384.exchange_ms_avg,
                      sign: '—', verify: '—',
                      pub: results.traditional.ecdh_p384.public_key_size_bytes,
                      sigct: '—', safe: false
                    },
                    {
                      algo: 'ECDSA-P384', type: 'Classical', color: 'text-orange-400',
                      keygen: results.traditional.ecdsa_p384.keygen_ms_avg,
                      kem: '—',
                      sign: results.traditional.ecdsa_p384.sign_ms_avg,
                      verify: results.traditional.ecdsa_p384.verify_ms_avg,
                      pub: results.traditional.ecdsa_p384.public_key_size_bytes,
                      sigct: results.traditional.ecdsa_p384.signature_size_bytes,
                      safe: false
                    },
                  ].map((row, i) => (
                    <tr key={i} className="hover:bg-[#0a1020] transition-colors">
                      <td className={`px-4 py-3 font-mono font-bold ${row.color}`}>{row.algo}</td>
                      <td className="px-4 py-3 text-gray-400">{row.type}</td>
                      <td className="px-4 py-3 text-right text-white font-mono">{typeof row.keygen === 'number' ? row.keygen.toFixed(2) : row.keygen}</td>
                      <td className="px-4 py-3 text-right text-white font-mono">{typeof row.kem === 'number' ? row.kem.toFixed(2) : row.kem}</td>
                      <td className="px-4 py-3 text-right text-white font-mono">{typeof row.sign === 'number' ? row.sign.toFixed(2) : row.sign}</td>
                      <td className="px-4 py-3 text-right text-white font-mono">{typeof row.verify === 'number' ? row.verify.toFixed(2) : row.verify}</td>
                      <td className="px-4 py-3 text-right text-yellow-400 font-mono">{row.pub}</td>
                      <td className="px-4 py-3 text-right text-yellow-400 font-mono">{row.sigct}</td>
                      <td className="px-4 py-3">
                        {row.safe
                          ? <span className="flex items-center gap-1 text-green-400 text-xs"><CheckCircle size={12} />Yes</span>
                          : <span className="flex items-center gap-1 text-red-400 text-xs"><AlertCircle size={12} />No</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Notes */}
          <div className="bg-[#0d1526] border border-blue-500/20 rounded-xl p-6">
            <h3 className="text-blue-400 font-bold mb-3">Analysis Notes</h3>
            <ul className="space-y-2">
              {results.comparison_notes.map((note, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                  <span className="text-blue-400 font-bold flex-shrink-0">{i + 1}.</span>
                  {note}
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
};

export default Benchmark;

