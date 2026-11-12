import React, { useState } from 'react'
import { Filing, Claim, SourceDoc } from '@/api/types'
import { sendAskQuestion } from '@/api/client'
import { formatDocSourceLabel } from '@/lib/formatters'
import { X, Send, Bot, ExternalLink, ShieldCheck, HelpCircle, AlertCircle } from 'lucide-react'

export interface AskFinnTarget {
  screen: 'filing' | 'research'
  filing?: Filing | null
  symbol?: string | null
  sourceDocs?: SourceDoc[]
}

interface AskFinnSheetProps {
  target?: AskFinnTarget | null
  filing?: Filing | null // for backward compatibility
  onClose: () => void
  isLiveService?: boolean
}

interface QARecord {
  question: string
  answer: string
  answerable: boolean
  claims: Claim[]
  status?: 'answered' | 'no_model' | 'error'
}

export const AskFinnSheet: React.FC<AskFinnSheetProps> = ({
  target,
  filing,
  onClose,
  isLiveService = true,
}) => {
  const [question, setQuestion] = useState('')
  const [isAsking, setIsAsking] = useState(false)
  const [history, setHistory] = useState<QARecord[]>([])

  // Resolve target details
  const effectiveScreen = target?.screen || (filing ? 'filing' : 'research')
  const effectiveFiling = target?.filing || filing || null
  const effectiveSymbol = (target?.symbol || effectiveFiling?.symbol || '').toUpperCase()
  const effectiveSourceDocs = target?.sourceDocs || []

  if (!target && !filing) return null

  // Determine filing type
  const isResults =
    effectiveFiling?.category === 'results' || effectiveFiling?.enrichment?.type === 'results'
  const isMgmt =
    effectiveFiling?.category === 'management_change' ||
    effectiveFiling?.enrichment?.type === 'management'
  const isFundRaise = effectiveFiling?.category === 'fund_raise'

  // Context-aware suggested prompts (all strictly answerable from evidence, never predicting stock)
  let suggestedPrompts: string[] = []
  if (effectiveScreen === 'research') {
    suggestedPrompts = [
      'What happened to the latest guidance?',
      'Which promises were met or missed?',
    ]
  } else if (isResults) {
    suggestedPrompts = [
      'How did PAT change versus last year?',
      'What was revenue and EBITDA margin?',
    ]
  } else if (isMgmt) {
    suggestedPrompts = [
      'When does the change take effect?',
      'What is the management background?',
    ]
  } else if (isFundRaise) {
    suggestedPrompts = [
      'What are the key terms?',
      'What is the issue price or valuation?',
    ]
  } else {
    suggestedPrompts = [
      'What are the key terms?',
      'What is the stated timeline or impact?',
    ]
  }

  const handleAsk = async (textToSend: string) => {
    const qText = textToSend.trim()
    if (!qText || isAsking || !isLiveService) return

    setQuestion('')
    setIsAsking(true)

    try {
      const res = await sendAskQuestion({
        question: qText,
        context: {
          screen: effectiveScreen,
          filing_id: effectiveFiling?.id || null,
          symbol: effectiveSymbol || null,
        },
      })

      setHistory((prev) => [
        ...prev,
        {
          question: qText,
          answer: res.answer,
          answerable: res.answerable,
          claims: res.claims || [],
          status: 'answered',
        },
      ])
    } catch (err: any) {
      const msg = err?.message || ''
      const isQuotaOrOutage = msg.includes('503') || msg.includes('model') || msg.includes('quota')
      const fallbackAnswer = isQuotaOrOutage
        ? "FINN can't reach a model right now (free-tier quota). Try again in a while."
        : "FINN can't reach the live service right now."

      setHistory((prev) => [
        ...prev,
        {
          question: qText,
          answer: fallbackAnswer,
          answerable: false,
          claims: [],
          status: 'no_model',
        },
      ])
    } finally {
      setIsAsking(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-[430px] bg-zinc-900 border-t border-zinc-800 rounded-t-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-200">
        {/* Header */}
        <div className="p-3.5 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/60">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center">
              <Bot className="w-3.5 h-3.5 text-zinc-300" />
            </div>
            <div>
              <div className="text-xs font-bold text-zinc-100 flex items-center gap-1.5 flex-wrap">
                <span>Ask FINN</span>
                {effectiveSymbol && (
                  <span className="font-mono text-zinc-400">· {effectiveSymbol}</span>
                )}
              </div>
              <p className="text-[10px] text-zinc-400 truncate max-w-[260px]">
                {effectiveScreen === 'research'
                  ? 'Research report · Grounded in transcripts & filings'
                  : effectiveFiling?.so_what || effectiveFiling?.headline || 'Exchange filing grounded Q&A'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
            aria-label="Close Ask FINN"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Conversation history */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs">
          {!isLiveService && (
            <div className="p-3.5 rounded-xl border border-zinc-800 bg-zinc-950/80 text-xs text-zinc-300 space-y-1.5">
              <div className="flex items-center gap-2 font-semibold text-zinc-200">
                <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <span>Ask FINN needs the live service</span>
              </div>
              <p className="text-zinc-400 text-[11px] leading-relaxed">
                FINN grounds every claim in primary exchange PDFs and earnings transcripts. Connect to the live service to ask questions.
              </p>
            </div>
          )}

          {isLiveService && history.length === 0 && (
            <div className="p-3.5 rounded-xl border border-zinc-800/70 bg-zinc-950/40 text-zinc-400 text-xs space-y-1">
              <div className="font-semibold text-zinc-200 text-xs">
                Grounded document copilot
              </div>
              <p className="text-[11px] leading-relaxed">
                Answers are grounded strictly in the open filing or research evidence. Every quote is verified server-side; FINN refuses to speculate.
              </p>
            </div>
          )}

          {history.map((h, i) => (
            <div key={i} className="space-y-2">
              <div className="bg-zinc-800/70 p-2.5 rounded-lg text-zinc-100 font-medium self-end border border-zinc-700/50">
                {h.question}
              </div>

              {/* Neutral state if answerable === false */}
              {!h.answerable ? (
                <div className="bg-zinc-950/70 border border-zinc-800 p-3 rounded-lg text-xs space-y-1.5">
                  <div className="flex items-start gap-2 text-zinc-300">
                    <HelpCircle className="w-4 h-4 text-zinc-400 mt-0.5 flex-shrink-0" />
                    <p className="leading-relaxed">{h.answer}</p>
                  </div>
                  <div className="text-[10px] font-mono text-zinc-500">
                    Grounded policy: FINN refuses to speculate when facts are absent from the document.
                  </div>
                </div>
              ) : (
                /* Grounded answer with verified evidence */
                <div className="bg-zinc-950/70 border border-zinc-800/80 p-3.5 rounded-lg text-zinc-200 space-y-3">
                  <p className="leading-relaxed text-zinc-200 font-normal">{h.answer}</p>

                  {/* Under the answer, show each claim's sources as evidence */}
                  {h.claims && h.claims.length > 0 && (
                    <div className="pt-2.5 border-t border-zinc-800/70 space-y-2">
                      <div className="flex items-center justify-between text-[10px] font-semibold tracking-wider text-zinc-400 uppercase">
                        <span>Verified Evidence</span>
                        <span className="inline-flex items-center gap-1 text-emerald-400 font-mono text-[10px] normal-case">
                          <ShieldCheck className="w-3 h-3 text-emerald-400" />
                          server-verified
                        </span>
                      </div>

                      {h.claims.map((claim, ci) => (
                        <div key={ci} className="space-y-1.5">
                          {claim.sources.map((src, si) => {
                            const docLabel = formatDocSourceLabel(
                              src.doc_id,
                              src.page,
                              effectiveSourceDocs
                            )
                            let docUrl = effectiveFiling?.pdf_url
                            if (!docUrl && effectiveSourceDocs) {
                              const match = effectiveSourceDocs.find((d) => d.doc_id === src.doc_id)
                              if (match?.url) docUrl = match.url
                            }
                            const linkHref =
                              docUrl && src.page !== null && src.page !== undefined
                                ? `${docUrl}#page=${src.page}`
                                : docUrl

                            return (
                              <div
                                key={si}
                                className="p-2.5 rounded-lg border border-zinc-800/80 bg-zinc-900/60 space-y-1.5 text-xs"
                              >
                                <div className="flex items-center justify-between text-[11px]">
                                  <span className="font-mono font-medium text-zinc-300">
                                    {docLabel}
                                  </span>
                                  {linkHref && (
                                    <a
                                      href={linkHref}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 text-[10px] text-zinc-400 hover:text-zinc-200 font-mono transition-colors"
                                    >
                                      <span>Open page</span>
                                      <ExternalLink className="w-3 h-3" />
                                    </a>
                                  )}
                                </div>
                                {/* Verbatim quote in quotation marks */}
                                <div className="relative pl-2.5 border-l-2 border-emerald-500/80 text-zinc-300 italic text-[11px] leading-relaxed">
                                  "{src.quote}"
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          {isAsking && (
            <div className="text-zinc-400 text-xs animate-pulse p-2 font-mono flex items-center gap-2">
              <Bot className="w-3.5 h-3.5 text-zinc-400 animate-spin" />
              <span>FINN is verifying evidence in document…</span>
            </div>
          )}
        </div>

        {/* Suggested Prompts */}
        <div className="px-3 py-1.5 flex gap-1.5 overflow-x-auto no-scrollbar border-t border-zinc-800/50 bg-zinc-950/30">
          {suggestedPrompts.map((prompt, idx) => (
            <button
              key={idx}
              onClick={() => handleAsk(prompt)}
              disabled={!isLiveService || isAsking}
              className="flex-shrink-0 text-[11px] px-2.5 py-1 rounded-full bg-zinc-800/70 text-zinc-300 hover:bg-zinc-700/80 border border-zinc-700/50 disabled:opacity-40 transition-colors"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Input area */}
        <form
          onSubmit={(e) => {
            e.preventDefault()
            handleAsk(question)
          }}
          className="p-3 border-t border-zinc-800 flex items-center gap-2 bg-zinc-950/40"
        >
          <input
            id="ask-finn-input"
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            maxLength={500}
            disabled={!isLiveService || isAsking}
            placeholder={
              !isLiveService
                ? 'Ask FINN needs the live service'
                : `Ask about ${effectiveSymbol || 'this filing'}...`
            }
            className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-zinc-600 disabled:opacity-40"
          />
          <button
            type="submit"
            disabled={!question.trim() || isAsking || !isLiveService}
            className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 disabled:opacity-40 transition-colors"
            aria-label="Send question"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  )
}
