'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Flag, X, Send, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

type ReportReason =
  | 'harassment'
  | 'hate_speech'
  | 'spam'
  | 'inappropriate_content'
  | 'cheating'
  | 'impersonation'
  | 'other'

const REPORT_REASONS: { value: ReportReason; label: string }[] = [
  { value: 'harassment', label: 'Harassment or bullying' },
  { value: 'hate_speech', label: 'Hate speech' },
  { value: 'spam', label: 'Spam or scam' },
  { value: 'inappropriate_content', label: 'Inappropriate content' },
  { value: 'cheating', label: 'Cheating or unfair play' },
  { value: 'impersonation', label: 'Impersonation' },
  { value: 'other', label: 'Other' },
]

interface ReportButtonProps {
  targetType: 'user' | 'battle' | 'message' | 'verse'
  targetId: string
  className?: string
}

export function ReportButton({ targetType, targetId, className }: ReportButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [reason, setReason] = useState<ReportReason | ''>('')
  const [details, setDetails] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    if (!reason) return

    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch('/api/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetType,
          targetId,
          reason,
          details: details.trim() || undefined,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to submit report')
      }

      setSubmitted(true)
      setTimeout(() => {
        setIsOpen(false)
        setSubmitted(false)
        setReason('')
        setDetails('')
      }, 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          'p-2 text-dark-400 hover:text-red-400 transition-colors rounded-lg hover:bg-dark-800',
          className
        )}
        title="Report"
      >
        <Flag className="w-4 h-4" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-x-4 top-1/2 -translate-y-1/2 max-w-md mx-auto bg-dark-900 rounded-2xl border border-dark-700 p-6 z-50"
            >
              {submitted ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <AlertTriangle className="w-8 h-8 text-green-400" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">Report Submitted</h3>
                  <p className="text-dark-400">Thank you for helping keep our community safe.</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                      <Flag className="w-5 h-5 text-red-400" />
                      Report Content
                    </h3>
                    <button
                      onClick={() => setIsOpen(false)}
                      className="text-dark-400 hover:text-white transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-dark-300 mb-2">
                        Reason for report
                      </label>
                      <div className="space-y-2">
                        {REPORT_REASONS.map((option) => (
                          <label
                            key={option.value}
                            className={cn(
                              'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                              reason === option.value
                                ? 'border-red-500 bg-red-500/10'
                                : 'border-dark-700 hover:border-dark-600'
                            )}
                          >
                            <input
                              type="radio"
                              name="reason"
                              value={option.value}
                              checked={reason === option.value}
                              onChange={(e) => setReason(e.target.value as ReportReason)}
                              className="sr-only"
                            />
                            <div
                              className={cn(
                                'w-4 h-4 rounded-full border-2 flex items-center justify-center',
                                reason === option.value
                                  ? 'border-red-500'
                                  : 'border-dark-500'
                              )}
                            >
                              {reason === option.value && (
                                <div className="w-2 h-2 rounded-full bg-red-500" />
                              )}
                            </div>
                            <span className="text-sm text-white">{option.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-dark-300 mb-2">
                        Additional details (optional)
                      </label>
                      <textarea
                        value={details}
                        onChange={(e) => setDetails(e.target.value)}
                        placeholder="Provide more context about your report..."
                        rows={3}
                        maxLength={1000}
                        className="w-full bg-dark-800 border border-dark-700 rounded-lg px-4 py-3 text-white placeholder:text-dark-500 focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
                      />
                      <div className="text-right text-xs text-dark-500 mt-1">
                        {details.length}/1000
                      </div>
                    </div>

                    {error && (
                      <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
                        {error}
                      </div>
                    )}

                    <button
                      onClick={handleSubmit}
                      disabled={!reason || isSubmitting}
                      className={cn(
                        'w-full py-3 px-4 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors',
                        reason && !isSubmitting
                          ? 'bg-red-600 hover:bg-red-500 text-white'
                          : 'bg-dark-700 text-dark-400 cursor-not-allowed'
                      )}
                    >
                      {isSubmitting ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          Submit Report
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
