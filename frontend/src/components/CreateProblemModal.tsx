import React, { useRef, useState } from 'react';
import { X, Sparkles, Shield, Users, FileText, Upload, CheckCircle2, Trash2, Database, Loader2 } from 'lucide-react';
import { uploadDocument } from '../api';
import { DocumentUploadResponse } from '../types';

interface CreateProblemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    title: string;
    description: string;
    code_snippet?: string;
    logs?: string;
    language: string;
    agent_count: number;
    document_name?: string;
    document_text?: string;
  }) => Promise<void>;
}

const UNIVERSAL_SWARM_ROSTER = [
  { name: 'Elena Rostova', color: 'text-[#b8860b] dark:text-[#FCD535]' },
  { name: 'David Park', color: 'text-[#0ecb81]' },
  { name: 'Maya Patel', color: 'text-[#3b82f6]' },
  { name: 'James Thorne', color: 'text-[#f6465d]' },
  { name: 'Sarah Chen', color: 'text-[#181a20] dark:text-[#eaecef]' },
];

export const CreateProblemModal: React.FC<CreateProblemModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [agentCount, setAgentCount] = useState(3);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadedDoc, setUploadedDoc] = useState<DocumentUploadResponse | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      setUploadError(null);
      const res = await uploadDocument(file);
      setUploadedDoc(res);
      // Auto-suggest problem title if currently empty
      if (!title.trim()) {
        const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
        setTitle(cleanName.charAt(0).toUpperCase() + cleanName.slice(1));
      }
      // Populate context with extracted text if currently empty
      if (!description.trim()) {
        setDescription(res.extracted_text.slice(0, 1500));
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to parse document';
      setUploadError(message);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;

    try {
      setIsSubmitting(true);
      await onSubmit({
        title: title.trim(),
        description: description.trim(),
        language: 'auto',
        agent_count: agentCount,
        document_name: uploadedDoc?.filename,
        document_text: uploadedDoc?.extracted_text || description.trim(),
      });
      setTitle('');
      setDescription('');
      setUploadedDoc(null);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeAgents = UNIVERSAL_SWARM_ROSTER.slice(0, agentCount);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-[#0b0e11]/80 backdrop-blur-xs transition-colors">
      <div className="w-full max-w-xl bg-white dark:bg-[#1e2329] border border-[#eaecef] dark:border-[#2b3139] rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] transition-colors">
        {/* Modal Header */}
        <div className="p-4 border-b border-[#eaecef] dark:border-[#2b3139] flex items-center justify-between bg-white dark:bg-[#1e2329]">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-[#FCD535] text-[#181a20] flex items-center justify-center font-bold text-xs shadow-xs">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#181a20] dark:text-white">Deploy Swarm to Problem</h3>
              <p className="text-[11px] text-[#707a8a]">Autonomous multi-agent swarm solving any problem — code, health, math, mechanics, strategy and many more </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-[#707a8a] hover:text-[#181a20] dark:hover:text-white hover:bg-[#f5f5f5] dark:hover:bg-[#2b3139] transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body: Only Title, Swarm Capacity, and Problem Context */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4 bg-white dark:bg-[#1e2329]">
          {/* 1. Problem Title */}
          <div>
            <label className="block text-xs font-semibold text-[#181a20] dark:text-[#eaecef] mb-1.5">
              Problem Title *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Feeling lightheaded after drinking, Engine misfire on cold start, or React race condition..."
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full bg-[#f5f5f5] dark:bg-[#0b0e11] border border-[#eaecef] dark:border-[#2b3139] rounded-md px-3.5 py-2.5 text-xs text-[#181a20] dark:text-[#eaecef] placeholder-[#707a8a] focus:outline-none focus:border-[#FCD535] transition-colors"
            />
          </div>

          {/* 2. Swarm Capacity Slider */}
          <div className="p-3.5 bg-[#f8f9fa] dark:bg-[#0b0e11] rounded-lg border border-[#eaecef] dark:border-[#2b3139]">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-[#181a20] dark:text-[#eaecef] flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-[#b8860b] dark:text-[#FCD535]" />
                Swarm Capacity: {agentCount} Specialists
              </label>
              <span className="text-[10px] text-[#b8860b] dark:text-[#FCD535] font-mono font-medium">
                + Marcus Vance
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="5"
              value={agentCount}
              onChange={e => setAgentCount(Number(e.target.value))}
              className="w-full h-2 bg-[#eaecef] dark:bg-[#2b3139] rounded-lg appearance-none cursor-pointer accent-[#FCD535]"
            />
            <div className="flex justify-between text-[10px] text-[#707a8a] mt-1.5 font-mono">
              <span>1 Specialist (Fast)</span>
              <span>3 Specialists (Balanced)</span>
              <span>5 Specialists (Full Team)</span>
            </div>

            {/* Assigned Expert Team Preview */}
            <div className="mt-3 pt-3 border-t border-[#eaecef] dark:border-[#2b3139]/60">
              <div className="flex flex-wrap gap-1.5 items-center">
                <span className="px-2 py-0.5 rounded bg-[#FCD535] text-[#181a20] text-[10px] font-mono font-bold flex items-center gap-1 shadow-xs">
                  <Shield className="h-3 w-3" />
                  Marcus Vance
                </span>
                {activeAgents.map(ag => (
                  <span
                    key={ag.name}
                    className={`px-2 py-0.5 rounded bg-white dark:bg-[#1e2329] border border-[#eaecef] dark:border-[#2b3139] text-[10px] font-mono font-medium shadow-xs ${ag.color}`}
                  >
                    {ag.name}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* 3. Problem Context with Document / PDF Upload (Qdrant RAG) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-[#181a20] dark:text-[#eaecef] flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-[#b8860b] dark:text-[#FCD535]" />
                Problem Context *
              </label>

              {/* Upload Doc/PDF for Qdrant RAG */}
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".pdf,.txt,.md,.doc,.docx,.json,.log,.csv"
                  className="hidden"
                  id="doc-upload-input"
                />
                <label
                  htmlFor="doc-upload-input"
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer border ${
                    isUploading
                      ? 'bg-[#f5f5f5] dark:bg-[#2b3139] text-[#707a8a] border-[#eaecef] dark:border-[#2b3139]'
                      : 'bg-[#f0f2f5] dark:bg-[#0b0e11] hover:bg-[#eaecef] dark:hover:bg-[#2b3139] text-[#b8860b] dark:text-[#FCD535] border-[#eaecef] dark:border-[#2b3139]'
                  }`}
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin text-[#b8860b] dark:text-[#FCD535]" />
                      <span>Parsing Document...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="h-3 w-3" />
                      <span>Upload Doc or PDF (Qdrant RAG)</span>
                    </>
                  )}
                </label>
              </div>
            </div>

            {/* Document Attached Banner */}
            {uploadedDoc && (
              <div className="mb-2.5 p-2.5 rounded-lg bg-[#0ecb81]/10 border border-[#0ecb81]/30 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="p-1 rounded bg-[#0ecb81]/20 text-[#0ecb81]">
                    <Database className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-[#0ecb81] truncate flex items-center gap-1.5">
                      <CheckCircle2 className="h-3 w-3 shrink-0" />
                      {uploadedDoc.filename}
                    </div>
                    <div className="text-[10px] text-[#707a8a] font-mono">
                      {uploadedDoc.char_count.toLocaleString()} characters • {uploadedDoc.word_count.toLocaleString()} words • Qdrant Vector Storage Active
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setUploadedDoc(null)}
                  className="p-1 text-[#707a8a] hover:text-[#f6465d] transition-colors cursor-pointer shrink-0"
                  title="Remove attached document"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            {/* Upload Error Banner */}
            {uploadError && (
              <div className="mb-2 p-2 rounded-md bg-[#fff5f5] dark:bg-[#1e2329] border border-[#f6465d]/40 text-[#f6465d] text-[11px]">
                {uploadError}
              </div>
            )}

            <textarea
              required
              rows={5}
              placeholder="Describe the problem, symptoms, observations, or paste context. If you uploaded a document or PDF, its content is automatically vectorized and stored in Qdrant for agent retrieval..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full bg-[#f5f5f5] dark:bg-[#0b0e11] border border-[#eaecef] dark:border-[#2b3139] rounded-md p-3.5 text-xs text-[#181a20] dark:text-[#eaecef] placeholder-[#707a8a] focus:outline-none focus:border-[#FCD535] transition-colors leading-relaxed"
            />
          </div>

          {/* Form Actions */}
          <div className="pt-2 border-t border-[#eaecef] dark:border-[#2b3139] flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-md text-xs font-medium text-[#707a8a] hover:text-[#181a20] dark:hover:text-[#eaecef] hover:bg-[#f5f5f5] dark:hover:bg-[#2b3139] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-md text-xs font-semibold bg-[#FCD535] hover:bg-[#f0b90b] text-[#181a20] transition-colors cursor-pointer active:bg-[#f0b90b] shadow-sm"
            >
              {isSubmitting ? 'Deploying Swarm...' : 'Deploy Swarm to Floor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
