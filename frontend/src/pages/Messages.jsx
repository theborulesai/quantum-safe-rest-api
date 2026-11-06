import React, { useState, useEffect } from 'react';
import { Mail, Send, Inbox, Lock, CheckCircle, XCircle, AlertCircle, RefreshCw, Eye } from 'lucide-react';
import { sendMessage, getMessages, getMessage } from '../services/api';
import { useAuth } from '../hooks/useAuth';

const Messages = () => {
  const { user } = useAuth();

  // Send state
  const [sendRecipient, setSendRecipient] = useState('');
  const [sendText, setSendText] = useState('');
  const [sendResult, setSendResult] = useState(null);
  const [sendLoading, setSendLoading] = useState(false);
  const [sendError, setSendError] = useState('');

  // Inbox state
  const [inbox, setInbox] = useState([]);
  const [inboxLoading, setInboxLoading] = useState(false);
  const [inboxError, setInboxError] = useState('');

  // Read message state
  const [openMsg, setOpenMsg] = useState(null);
  const [readLoading, setReadLoading] = useState(false);

  const fetchInbox = async () => {
    setInboxLoading(true);
    setInboxError('');
    try {
      const res = await getMessages();
      setInbox(res.data);
    } catch (err) {
      setInboxError(err.response?.data?.detail || 'Failed to load inbox');
    } finally {
      setInboxLoading(false);
    }
  };

  useEffect(() => { fetchInbox(); }, []);

  const handleSend = async () => {
    if (!sendRecipient.trim() || !sendText.trim()) return;
    setSendLoading(true); setSendError(''); setSendResult(null);
    try {
      const res = await sendMessage(sendRecipient.trim(), sendText);
      setSendResult(res.data);
      setSendText('');
      fetchInbox();
    } catch (err) {
      setSendError(err.response?.data?.detail || 'Failed to send message');
    } finally {
      setSendLoading(false);
    }
  };

  const handleRead = async (id) => {
    setReadLoading(true);
    setOpenMsg(null);
    try {
      const res = await getMessage(id);
      setOpenMsg(res.data);
    } catch (err) {
      setOpenMsg({ error: err.response?.data?.detail || 'Cannot decrypt message' });
    } finally {
      setReadLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Mail className="text-cyan-400" size={28} />
        <div>
          <h1 className="text-2xl font-bold text-white">Secure Messaging</h1>
          <p className="text-gray-400 text-sm">End-to-end: ML-KEM-768 + AES-256-GCM + ML-DSA-65 signatures</p>
        </div>
      </div>

      {/* Protocol summary */}
      <div className="bg-[#0d1526] border border-green-500/20 rounded-xl p-5 text-xs">
        <h3 className="text-green-400 font-bold mb-2 text-sm">Full Secure Message Flow</h3>
        <div className="grid grid-cols-1 md:grid-cols-7 gap-1 items-center text-center">
          {[
            'Plaintext', '→', 'AES-256-GCM\nEncrypt', '→', 'ML-DSA-65\nSign', '→', 'Store\nin DB'
          ].map((step, i) => (
            i % 2 === 1
              ? <div key={i} className="text-gray-600 text-lg">{step}</div>
              : <div key={i} className="bg-[#050810] rounded p-2 text-gray-300 font-mono whitespace-pre-line">{step}</div>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-7 gap-1 items-center text-center mt-1">
          {[
            'DB\nCiphertext', '→', 'ML-DSA-65\nVerify', '→', 'AES-256-GCM\nDecrypt', '→', 'Plaintext'
          ].map((step, i) => (
            i % 2 === 1
              ? <div key={i} className="text-gray-600 text-lg">{step}</div>
              : <div key={i} className="bg-[#050810] rounded p-2 text-green-400 font-mono whitespace-pre-line">{step}</div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Send Message */}
        <div className="bg-[#0d1526] border border-[#1a2a4a] rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2"><Send size={18} className="text-cyan-400" />Send Secure Message</h2>

          <div>
            <label className="text-gray-400 text-sm block mb-1">Recipient Username</label>
            <input type="text" value={sendRecipient} onChange={e => setSendRecipient(e.target.value)}
              placeholder="Enter recipient's username..."
              className="bg-[#050810] border border-[#1a2a4a] rounded-lg px-3 py-2 text-white w-full focus:outline-none focus:border-cyan-500" />
          </div>
          <div>
            <label className="text-gray-400 text-sm block mb-1">Message</label>
            <textarea value={sendText} onChange={e => setSendText(e.target.value)}
              placeholder="Type your secure message..."
              rows={5}
              className="bg-[#050810] border border-[#1a2a4a] rounded-lg px-3 py-2 text-white w-full focus:outline-none focus:border-cyan-500 resize-none" />
          </div>
          <button onClick={handleSend}
            disabled={sendLoading || !sendRecipient.trim() || !sendText.trim()}
            className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2">
            {sendLoading ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Encrypting & Sending...</> : <><Send size={16} />Send Encrypted Message</>}
          </button>

          {sendError && <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-3 text-red-400 text-sm flex items-start gap-2"><AlertCircle size={16} className="mt-0.5 flex-shrink-0" />{sendError}</div>}

          {sendResult && (
            <div className="bg-green-900/20 border border-green-700/50 rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2 text-green-400 font-medium"><CheckCircle size={16} />Message sent securely!</div>
              <div className="text-xs text-gray-400 space-y-1">
                <div>Message ID: <span className="text-white font-mono">#{sendResult.message_id}</span></div>
                <div>Encrypted: <span className="text-green-400">{sendResult.encrypted ? '✓ Yes' : '✗ No'}</span></div>
                <div>Signed: <span className="text-green-400">{sendResult.signed ? '✓ Yes' : '✗ No'}</span></div>
                <div>Algorithms: <span className="text-cyan-400 font-mono">{sendResult.algorithms}</span></div>
                <div>Duration: <span className="text-yellow-400 font-mono">{sendResult.duration_ms}ms</span></div>
              </div>
              <div>
                <div className="text-gray-500 text-xs mb-1">Ciphertext preview (never stored as plaintext):</div>
                <div className="font-mono text-xs text-cyan-300 bg-[#050810] rounded p-2 break-all">{sendResult.ciphertext_preview}</div>
              </div>
            </div>
          )}
        </div>

        {/* Inbox */}
        <div className="bg-[#0d1526] border border-[#1a2a4a] rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2"><Inbox size={18} className="text-green-400" />Inbox</h2>
            <button onClick={fetchInbox} disabled={inboxLoading}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-cyan-400 transition-colors">
              <RefreshCw size={13} className={inboxLoading ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>

          {inboxError && <div className="text-red-400 text-xs mb-3">{inboxError}</div>}

          {inbox.length === 0 && !inboxLoading ? (
            <div className="text-center py-8 text-gray-500">
              <Inbox size={36} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">No messages yet.</p>
              <p className="text-xs mt-1">Ask another user to send you a message!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {inbox.map(msg => (
                <div key={msg.id} className="bg-[#050810] border border-[#1a2a4a] rounded-lg p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-white text-sm font-medium">From: <span className="text-cyan-400">{msg.sender_username}</span></span>
                        {msg.is_verified
                          ? <span className="flex items-center gap-1 text-xs text-green-400 bg-green-900/30 px-2 py-0.5 rounded"><CheckCircle size={11} />Verified</span>
                          : <span className="flex items-center gap-1 text-xs text-yellow-400 bg-yellow-900/30 px-2 py-0.5 rounded">Unread</span>}
                        {msg.is_tampered && <span className="text-xs text-red-400 bg-red-900/30 px-2 py-0.5 rounded">⚠ Tampered</span>}
                      </div>
                      <div className="text-xs text-gray-500 font-mono">{msg.ciphertext_preview}</div>
                      <div className="text-xs text-gray-600 mt-1">{msg.created_at ? new Date(msg.created_at).toLocaleString() : ''}</div>
                    </div>
                    <button onClick={() => handleRead(msg.id)} disabled={readLoading}
                      className="flex-shrink-0 flex items-center gap-1 bg-cyan-700/50 hover:bg-cyan-600/50 text-cyan-400 text-xs px-3 py-1.5 rounded-lg transition-colors border border-cyan-600/30">
                      <Eye size={12} /> Read
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Decrypted Message Modal */}
      {(openMsg || readLoading) && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#0d1526] border border-[#1a2a4a] rounded-xl p-6 max-w-lg w-full shadow-2xl">
            {readLoading ? (
              <div className="text-center py-8">
                <div className="w-10 h-10 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-gray-400">Decrypting message...</p>
                <p className="text-xs text-gray-500 mt-1">Verifying signature & decapsulating shared secret...</p>
              </div>
            ) : openMsg?.error ? (
              <div>
                <h3 className="text-red-400 font-bold mb-3">Decryption Error</h3>
                <p className="text-gray-400 text-sm">{openMsg.error}</p>
              </div>
            ) : openMsg && (
              <div className="space-y-4">
                <h3 className="text-white font-bold text-lg flex items-center gap-2"><Lock size={18} className="text-cyan-400" />Decrypted Message</h3>
                <div className="space-y-2 text-sm">
                  <div>From: <span className="text-cyan-400 font-medium">{openMsg.sender_username}</span></div>
                  <div>Message ID: <span className="text-gray-400 font-mono">#{openMsg.id}</span></div>
                  <div className="flex items-center gap-2">
                    Signature:
                    {openMsg.signature_valid
                      ? <span className="flex items-center gap-1 text-green-400 text-xs bg-green-900/30 px-2 py-0.5 rounded"><CheckCircle size={12} />Valid ✓</span>
                      : <span className="flex items-center gap-1 text-red-400 text-xs bg-red-900/30 px-2 py-0.5 rounded"><XCircle size={12} />Invalid ✗</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    Tampered:
                    <span className={`text-xs px-2 py-0.5 rounded ${openMsg.is_tampered ? 'text-red-400 bg-red-900/30' : 'text-green-400 bg-green-900/30'}`}>
                      {openMsg.is_tampered ? 'Yes ⚠' : 'No ✓'}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 font-mono">{openMsg.algorithms}</div>
                </div>
                <div className="bg-[#050810] border border-[#1a2a4a] rounded-lg p-4">
                  <div className="text-gray-400 text-xs mb-2">Plaintext:</div>
                  <p className="text-white leading-relaxed">{openMsg.plaintext}</p>
                </div>
                <div className="text-xs text-gray-500 flex items-center gap-1">
                  <Lock size={11} />Duration: {openMsg.duration_ms}ms
                </div>
              </div>
            )}
            <button onClick={() => { setOpenMsg(null); setReadLoading(false); }}
              className="mt-4 w-full bg-[#1a2a4a] hover:bg-[#243a5a] text-gray-400 py-2 rounded-lg text-sm transition-colors">
              Close
            </button>
          </div>
        </div>
      )}

      {/* Tamper info */}
      <div className="bg-[#0d1526] border border-orange-500/20 rounded-xl p-5">
        <h3 className="text-orange-400 font-bold mb-2 text-sm">🛡 Security Guarantees</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <div className="text-cyan-400 font-medium mb-1">Confidentiality</div>
            <p className="text-gray-400 text-xs">Messages stored encrypted (AES-256-GCM). Only the recipient with their private KEM key can decrypt.</p>
          </div>
          <div>
            <div className="text-green-400 font-medium mb-1">Integrity</div>
            <p className="text-gray-400 text-xs">AES-GCM authentication tag detects any modification. ML-DSA-65 signature confirms the message is unchanged.</p>
          </div>
          <div>
            <div className="text-purple-400 font-medium mb-1">Authentication</div>
            <p className="text-gray-400 text-xs">ML-DSA-65 signature proves the message came from the sender. Non-repudiation: sender cannot deny having sent it.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Messages;

