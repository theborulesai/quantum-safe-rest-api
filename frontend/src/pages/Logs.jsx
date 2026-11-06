import React, { useState, useEffect } from 'react';
import { getLogs } from '../services/api';
import { FileText, RefreshCw, CheckCircle, XCircle, Clock } from 'lucide-react';

const Logs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchLogs = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getLogs();
      setLogs(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to fetch logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLogs(); }, []);

  const getOperationColor = (op) => {
    const map = {
      keygen: 'text-purple-400',
      encapsulate: 'text-cyan-400',
      decapsulate: 'text-blue-400',
      encrypt: 'text-yellow-400',
      decrypt: 'text-orange-400',
      sign: 'text-green-400',
      verify: 'text-green-400',
      send_message: 'text-pink-400',
    };
    return map[op] || 'text-gray-400';
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileText className="text-cyan-400" size={28} />
          <div>
            <h1 className="text-2xl font-bold text-white">Cryptographic Operation Logs</h1>
            <p className="text-gray-400 text-sm">Complete audit trail of all PQC operations</p>
          </div>
        </div>
        <button
          onClick={fetchLogs}
          disabled={loading}
          className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div className="bg-red-900/20 border border-red-700/50 rounded-xl p-4 text-red-400">
          {error}
        </div>
      )}

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {['keygen', 'encrypt', 'sign', 'send_message'].map((op) => {
          const count = logs.filter(l => l.operation === op).length;
          const labels = { keygen: 'Key Generations', encrypt: 'Encryptions', sign: 'Signatures', send_message: 'Messages' };
          return (
            <div key={op} className="bg-[#0d1526] border border-[#1a2a4a] rounded-xl p-4">
              <div className={`text-2xl font-bold font-mono ${getOperationColor(op)}`}>{count}</div>
              <div className="text-gray-400 text-sm">{labels[op]}</div>
            </div>
          );
        })}
      </div>

      {/* Logs Table */}
      <div className="bg-[#0d1526] border border-[#1a2a4a] rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-[#1a2a4a]">
          <h2 className="text-lg font-bold text-white">Operation History ({logs.length} records)</h2>
        </div>
        <div className="overflow-x-auto">
          {logs.length === 0 && !loading ? (
            <div className="p-8 text-center text-gray-500">
              <FileText size={40} className="mx-auto mb-3 opacity-30" />
              <p>No operations logged yet. Start using the application to generate logs.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-[#050810] text-gray-400 uppercase text-xs">
                <tr>
                  <th className="px-4 py-3 text-left">#</th>
                  <th className="px-4 py-3 text-left">Operation</th>
                  <th className="px-4 py-3 text-left">Algorithm</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Duration</th>
                  <th className="px-4 py-3 text-left">Details</th>
                  <th className="px-4 py-3 text-left">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1a2a4a]">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-[#0a1020] transition-colors">
                    <td className="px-4 py-3 text-gray-500 font-mono">{log.id}</td>
                    <td className={`px-4 py-3 font-mono font-semibold ${getOperationColor(log.operation)}`}>
                      {log.operation}
                    </td>
                    <td className="px-4 py-3 text-gray-300 font-mono text-xs">{log.algorithm}</td>
                    <td className="px-4 py-3">
                      {log.status === 'success' ? (
                        <span className="flex items-center gap-1 text-green-400">
                          <CheckCircle size={14} /> success
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-red-400">
                          <XCircle size={14} /> failure
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-yellow-400 font-mono text-xs">
                      {log.duration_ms ? `${log.duration_ms}ms` : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs max-w-xs truncate">
                      {log.details || '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs font-mono">
                      {log.created_at ? new Date(log.created_at).toLocaleTimeString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default Logs;

