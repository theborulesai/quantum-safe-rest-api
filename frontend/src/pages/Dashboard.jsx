import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Key, Mail, FileText, Activity, ArrowRight, CheckCircle, Cpu } from 'lucide-react';
import { getSecurityStatus, getLogs } from '../services/api';
import { useAuth } from '../hooks/useAuth';

const StatCard = ({ icon: Icon, label, value, color, sub }) => (
  <div className="bg-[#0d1526] border border-[#1a2a4a] rounded-xl p-5 flex items-start gap-4 hover:border-cyan-500/40 transition-colors">
    <div className={`w-10 h-10 rounded-lg ${color} flex items-center justify-center flex-shrink-0`}>
      <Icon size={20} className="text-white" />
    </div>
    <div>
      <div className="text-2xl font-bold text-white font-mono">{value}</div>
      <div className="text-gray-400 text-sm">{label}</div>
      {sub && <div className="text-xs text-gray-600 mt-0.5">{sub}</div>}
    </div>
  </div>
);

const FlowStep = ({ label, color, detail }) => (
  <div className={`bg-[#050810] border ${color} rounded-lg p-3 text-center`}>
    <div className="text-xs font-mono font-bold text-white">{label}</div>
    {detail && <div className="text-xs text-gray-500 mt-1">{detail}</div>}
  </div>
);

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getSecurityStatus().then(r => setStatus(r.data)).catch(() => {}),
      getLogs().then(r => setLogs(r.data)).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  const statCounts = {
    keygen: logs.filter(l => l.operation === 'keygen').length,
    encrypt: logs.filter(l => l.operation === 'encrypt').length,
    sign: logs.filter(l => l.operation === 'sign').length,
    messages: logs.filter(l => l.operation === 'send_message').length,
  };

  const quickActions = [
    { label: 'Generate Key Pairs', path: '/keys', icon: Key, color: 'bg-cyan-600 hover:bg-cyan-500' },
    { label: 'Encrypt a Message', path: '/encrypt', icon: Shield, color: 'bg-green-700 hover:bg-green-600' },
    { label: 'Sign a Message', path: '/sign', icon: FileText, color: 'bg-purple-700 hover:bg-purple-600' },
    { label: 'Send Secure Message', path: '/messages', icon: Mail, color: 'bg-pink-700 hover:bg-pink-600' },
    { label: 'Run KEM Demo', path: '/kem', icon: Activity, color: 'bg-yellow-700 hover:bg-yellow-600' },
    { label: 'Benchmark PQC', path: '/benchmark', icon: Cpu, color: 'bg-orange-700 hover:bg-orange-600' },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-[#0d1a35] to-[#0d1526] border border-cyan-500/30 rounded-xl p-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-1">
              Welcome, <span className="text-cyan-400">{user?.username || 'User'}</span> 🔐
            </h1>
            <p className="text-gray-400">Post-Quantum Cryptography Dashboard — NIST FIPS 203/204 Compliant</p>
            {status && (
              <div className="flex items-center gap-2 mt-3">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                <span className="text-green-400 text-sm font-medium">Post-Quantum Protection Active</span>
              </div>
            )}
          </div>
          <div className="hidden md:block">
            <div className="text-6xl opacity-30">🔐</div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Key} label="Key Generations" value={statCounts.keygen} color="bg-cyan-700" sub="ML-KEM-768 + ML-DSA-65" />
        <StatCard icon={Shield} label="Encryptions" value={statCounts.encrypt} color="bg-green-700" sub="AES-256-GCM" />
        <StatCard icon={FileText} label="Signatures" value={statCounts.sign} color="bg-purple-700" sub="ML-DSA-65" />
        <StatCard icon={Mail} label="Secure Messages" value={statCounts.messages} color="bg-pink-700" sub="End-to-end encrypted" />
      </div>

      {/* Security Architecture */}
      <div className="bg-[#0d1526] border border-[#1a2a4a] rounded-xl p-6">
        <h2 className="text-xl font-bold text-white mb-5 flex items-center gap-2">
          <Activity size={20} className="text-cyan-400" /> Security Architecture Flow
        </h2>
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-gray-500 text-xs w-16 flex-shrink-0">Encrypt:</span>
            {[
              { label: 'Plaintext', color: 'border-gray-600' },
              { label: 'ML-KEM-768\nEncapsulate', color: 'border-cyan-600' },
              { label: 'HKDF-SHA-256\nKey Derive', color: 'border-yellow-600' },
              { label: 'AES-256-GCM\nEncrypt', color: 'border-green-600' },
              { label: 'ML-DSA-65\nSign', color: 'border-purple-600' },
              { label: 'Send over\nNetwork', color: 'border-blue-600' },
            ].map((step, i) => (
              <React.Fragment key={i}>
                <FlowStep label={step.label} color={step.color} />
                {i < 5 && <ArrowRight size={14} className="text-gray-600 flex-shrink-0" />}
              </React.Fragment>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-gray-500 text-xs w-16 flex-shrink-0">Decrypt:</span>
            {[
              { label: 'Receive\nCiphertext', color: 'border-blue-600' },
              { label: 'ML-DSA-65\nVerify Sig', color: 'border-purple-600' },
              { label: 'ML-KEM-768\nDecapsulate', color: 'border-cyan-600' },
              { label: 'HKDF-SHA-256\nKey Derive', color: 'border-yellow-600' },
              { label: 'AES-256-GCM\nDecrypt', color: 'border-green-600' },
              { label: 'Plaintext ✓', color: 'border-green-400' },
            ].map((step, i) => (
              <React.Fragment key={i}>
                <FlowStep label={step.label} color={step.color} />
                {i < 5 && <ArrowRight size={14} className="text-gray-600 flex-shrink-0" />}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-[#0d1526] border border-[#1a2a4a] rounded-xl p-6">
        <h2 className="text-xl font-bold text-white mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {quickActions.map(({ label, path, icon: Icon, color }) => (
            <button key={path} onClick={() => navigate(path)}
              className={`${color} text-white px-4 py-3 rounded-lg font-medium transition-colors flex items-center gap-2 text-sm`}>
              <Icon size={16} /> {label}
            </button>
          ))}
        </div>
      </div>

      {/* Algorithm Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-[#0d1526] border border-cyan-500/30 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-cyan-900/40 rounded-lg p-2"><Key size={20} className="text-cyan-400" /></div>
            <div>
              <h3 className="text-white font-bold">ML-KEM-768</h3>
              <p className="text-gray-400 text-xs">NIST FIPS 203 — Key Encapsulation</p>
            </div>
          </div>
          <div className="space-y-1 text-xs">
            {[
              ['Based on', 'CRYSTALS-Kyber (Module-Lattice)'],
              ['Security Level', 'AES-192 equivalent'],
              ['Public Key', '1,184 bytes'],
              ['Shared Secret', '32 bytes'],
              ['Quantum Threat Resistance', 'Shor\'s Algorithm'],
              ['Replaces', 'RSA / ECDH key exchange'],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between py-1 border-b border-[#1a2a4a]">
                <span className="text-gray-500">{k}</span>
                <span className="text-gray-200 font-mono">{v}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[#0d1526] border border-purple-500/30 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-purple-900/40 rounded-lg p-2"><Shield size={20} className="text-purple-400" /></div>
            <div>
              <h3 className="text-white font-bold">ML-DSA-65</h3>
              <p className="text-gray-400 text-xs">NIST FIPS 204 — Digital Signatures</p>
            </div>
          </div>
          <div className="space-y-1 text-xs">
            {[
              ['Based on', 'CRYSTALS-Dilithium (Module-Lattice)'],
              ['Security Level', 'AES-192 equivalent'],
              ['Public Key', '1,952 bytes'],
              ['Signature Size', '3,309 bytes'],
              ['Quantum Threat Resistance', 'Shor\'s Algorithm'],
              ['Replaces', 'ECDSA / RSA signatures'],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between py-1 border-b border-[#1a2a4a]">
                <span className="text-gray-500">{k}</span>
                <span className="text-gray-200 font-mono">{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Logs */}
      {logs.length > 0 && (
        <div className="bg-[#0d1526] border border-[#1a2a4a] rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white">Recent Activity</h2>
            <button onClick={() => navigate('/logs')} className="text-cyan-400 text-xs hover:underline">View all →</button>
          </div>
          <div className="space-y-2">
            {logs.slice(0, 5).map(log => (
              <div key={log.id} className="flex items-center justify-between py-2 border-b border-[#1a2a4a] text-sm">
                <div className="flex items-center gap-3">
                  <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full" />
                  <span className="text-gray-300 font-mono">{log.operation}</span>
                  <span className="text-gray-500 text-xs">{log.algorithm}</span>
                </div>
                <div className="flex items-center gap-3">
                  {log.status === 'success'
                    ? <CheckCircle size={14} className="text-green-400" />
                    : <span className="text-red-400 text-xs">✗</span>}
                  <span className="text-yellow-400 text-xs font-mono">{log.duration_ms}ms</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
