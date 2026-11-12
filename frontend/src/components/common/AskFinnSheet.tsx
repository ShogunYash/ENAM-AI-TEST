import React, { useState, useEffect } from 'react'
import { Filing, ResultsCard } from '@/api/types'
import { formatInrCr } from '@/lib/formatters'
import { X, Send, Bot, ExternalLink } from 'lucide-react'

interface AskFinnSheetProps {
  filing: Filing | null
  onClose: () => void
}

export const AskFinnSheet: React.FC<AskFinnSheetProps> = ({ filing, onClose }) => {
  const [question, setQuestion] = useState('')
  const [isAsking, setIsAsking] = useState(false)

  const isResults = filing?.enrichment?.type === 'results'
  const isMgmt = filing?.enrichment?.type === 'management'
  const resultsCard = isResults ? (filing?.enrichment as ResultsCard) : null
  const patMetric = resultsCard?.metrics?.find((m) => m.name.toLowerCase() === 'pat')
  const revMetric = resultsCard?.metrics?.find((m) => m.name.toLowerCase() === 'revenue')
  const ebitdaMetric = resultsCard?.metrics?.find((m) => m.name.toLowerCase() === 'ebitda')

  // Generate initial Q&A based on filing
  const getInitialQA = (): Array<{ q: string; a: string; link?: string }> => {
    if (!filing) return []
    if (isResults && patMetric) {
      const periodStr = resultsCard?.period ? ` in ${resultsCard.period}` : ''
      const yoyStr =
        patMetric.yoy_pct !== null && patMetric.yoy_pct !== undefined
          ? ` (${patMetric.yoy_pct >= 0 ? '+' : ''}${patMetric.yoy_pct.toFixed(1)}% YoY)`
          : ''
      const qoqStr =
        patMetric.qoq_pct !== null && patMetric.qoq_pct !== undefined
          ? `, ${patMetric.qoq_pct >= 0 ? '+' : ''}${patMetric.qoq_pct.toFixed(1)}% QoQ`
          : ''
      return [
        {
          q: `How did PAT change${periodStr}?`,
          a: `PAT was ${formatInrCr(patMetric.value)}${yoyStr}${qoqStr}.${
            filing.so_what ? ` ${filing.so_what}` : ''
          }`,
          link: filing.pdf_url || undefined,
        },
      ]
    }

    if (isMgmt) {
      return [
        {
          q: 'What is the leadership change?',
          a: filing.so_what || 'Executive leadership appointment / change announced via BSE exchange filing.',
          link: filing.pdf_url || undefined,
        },
      ]
    }

    return [
      {
        q: 'What is the primary driver of this update?',
        a: filing.so_what || 'No operating driver documented in this exchange filing.',
        link: filing.pdf_url || undefined,
      },
    ]
  }

  const [history, setHistory] = useState<Array<{ q: string; a: string; link?: string }>>(getInitialQA)

  useEffect(() => {
    setHistory(getInitialQA())
  }, [filing?.id])

  if (!filing) return null

  // Context-aware suggested prompts
  const suggestedPrompts = isResults
    ? [
        'How did PAT change?',
        'What was revenue and EBITDA margin?',
        'Compare QoQ vs YoY',
      ]
    : isMgmt
    ? [
        'What is the management background?',
        'What is the effective date?',
        'Who is the predecessor?',
      ]
    : [
        'What is the primary driver?',
        'Are there capital implications?',
      ]

  const handleAsk = async (textToSend: string) => {
    const qText = textToSend.trim()
    if (!qText) return

    setQuestion('')
    setIsAsking(true)

    // Simulate preview response
    setTimeout(() => {
      let mockAnswer = ''
      const lower = qText.toLowerCase()

      if (isResults) {
        if (lower.includes('pat') || lower.includes('profit')) {
          if (patMetric) {
            const yoyStr =
              patMetric.yoy_pct !== null && patMetric.yoy_pct !== undefined
                ? ` (${patMetric.yoy_pct >= 0 ? '+' : ''}${patMetric.yoy_pct.toFixed(1)}% YoY)`
                : ''
            const qoqStr =
              patMetric.qoq_pct !== null && patMetric.qoq_pct !== undefined
                ? `, ${patMetric.qoq_pct >= 0 ? '+' : ''}${patMetric.qoq_pct.toFixed(1)}% QoQ`
                : ''
            mockAnswer = `Reported PAT is ${formatInrCr(patMetric.value)}${yoyStr}${qoqStr} for ${
              resultsCard?.period || 'the quarter'
            }.`
          } else {
            mockAnswer = 'PAT figure is not isolated in this summary filing.'
          }
        } else if (lower.includes('margin') || lower.includes('ebitda') || lower.includes('revenue')) {
          const mgn =
            resultsCard?.margin_ebitda_pct !== undefined && resultsCard?.margin_ebitda_pct !== null
              ? `EBITDA margin stood at ${resultsCard.margin_ebitda_pct.toFixed(1)}%. `
              : ''
          const revVal = revMetric ? `Revenue was ${formatInrCr(revMetric.value)}. ` : ''
          const ebitdaVal = ebitdaMetric ? `EBITDA was ${formatInrCr(ebitdaMetric.value)}. ` : ''
          mockAnswer = `${revVal}${ebitdaVal}${mgn}${filing.so_what || ''}`.trim()
        } else if (lower.includes('qoq') || lower.includes('yoy')) {
          const metricsStr = (resultsCard?.metrics || [])
            .map((m) => `${m.name.toUpperCase()}: ${m.yoy_pct !== null ? `${m.yoy_pct > 0 ? '+' : ''}${m.yoy_pct}% YoY` : ''}`)
            .join(' · ')
          mockAnswer = metricsStr || filing.so_what || 'QoQ and YoY metrics from official financial tables.'
        } else {
          mockAnswer = filing.so_what || 'No specific operating driver is documented in the text of this filing.'
        }
      } else if (isMgmt) {
        if (lower.includes('background') || lower.includes('role')) {
          mockAnswer = filing.so_what || 'Leadership appointment announced with requisite experience in the sector.'
        } else {
          mockAnswer = filing.so_what || 'Refer to the attached appointment disclosure for complete terms.'
        }
      } else {
        if (lower.includes('driver')) {
          mockAnswer = filing.so_what || 'No driver or operating explanation is documented in the text of this filing.'
        } else {
          mockAnswer = filing.so_what || filing.headline || 'Official BSE exchange filing announcement.'
        }
      }

      setHistory((prev) => [
        ...prev,
        {
          q: qText,
          a: mockAnswer,
          link: filing.pdf_url || undefined,
        },
      ])
      setIsAsking(false)
    }, 400)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-[430px] bg-zinc-900 border-t border-zinc-800 rounded-t-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-200">
        {/* Header with Preview Badge */}
        <div className="p-3.5 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/60">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center">
              <Bot className="w-3.5 h-3.5 text-zinc-300" />
            </div>
            <div>
              <div className="text-xs font-bold text-zinc-100 flex items-center gap-1.5">
                <span>Ask FINN</span>
                <span className="text-[10px] font-mono font-semibold uppercase tracking-wider px-1.5 py-0.2 rounded bg-amber-950/40 text-amber-400 border border-amber-800/60">
                  Preview
                </span>
                <span className="font-mono text-zinc-400">· {filing.symbol}</span>
              </div>
              <p className="text-[10px] text-zinc-400 truncate max-w-[260px]">
                {filing.so_what || filing.headline}
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
        <div className="flex-1 overflow-y-auto p-4 space-y-3 text-xs">
          {history.map((h, i) => (
            <div key={i} className="space-y-2">
              <div className="bg-zinc-800/60 p-2.5 rounded-lg text-zinc-200 self-end font-medium">
                {h.q}
              </div>
              <div className="bg-zinc-950/60 border border-zinc-800/80 p-3 rounded-lg text-zinc-300 space-y-1.5">
                <p className="leading-relaxed">{h.a}</p>
                {h.link && (
                  <a
                    href={h.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-zinc-400 hover:text-zinc-200 pt-1 font-mono transition-colors"
                  >
                    <span>View filing PDF</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
          ))}

          {isAsking && (
            <div className="text-zinc-400 text-xs animate-pulse p-2 font-mono">
              FINN is reviewing filing...
            </div>
          )}
        </div>

        {/* Suggested Prompts */}
        <div className="px-3 py-1.5 flex gap-1.5 overflow-x-auto no-scrollbar border-t border-zinc-800/50">
          {suggestedPrompts.map((prompt, idx) => (
            <button
              key={idx}
              onClick={() => handleAsk(prompt)}
              className="flex-shrink-0 text-[11px] px-2.5 py-1 rounded-full bg-zinc-800/70 text-zinc-300 hover:bg-zinc-700/80 border border-zinc-700/50 transition-colors"
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
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder={`Ask about ${filing.symbol}'s filing...`}
            className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-zinc-600"
          />
          <button
            type="submit"
            disabled={!question.trim() || isAsking}
            className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 disabled:opacity-40 transition-colors"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  )
}
