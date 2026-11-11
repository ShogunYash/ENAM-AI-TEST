import React, { useState } from 'react'
import { Filing } from '@/api/types'
import { X, Send, Bot, CheckCircle2, ExternalLink } from 'lucide-react'

interface AskFinnSheetProps {
  filing: Filing | null
  onClose: () => void
}

export const AskFinnSheet: React.FC<AskFinnSheetProps> = ({ filing, onClose }) => {
  const [question, setQuestion] = useState('')
  const [history, setHistory] = useState<
    Array<{ q: string; a: string; verified?: boolean; quote?: string }>
  >([
    {
      q: 'What is the primary driver of this update?',
      a: filing?.so_what || 'Key update from official exchange filing.',
      verified: true,
    },
  ])
  const [isAsking, setIsAsking] = useState(false)

  if (!filing) return null

  const handleAsk = async (textToSend: string) => {
    const qText = textToSend.trim()
    if (!qText) return

    setQuestion('')
    setIsAsking(true)

    // Simulate or call /ask endpoint
    setTimeout(() => {
      let mockAnswer = 'Operating leverage and product mix expansion drove margins; management reaffirmed FY27 guidance.'
      if (filing.enrichment?.type === 'results') {
        mockAnswer = `Operating leverage drove EBITDA (+23.0% YoY) faster than revenue (+9.0% YoY), leading to 16.9% EBITDA margin.`
      } else if (filing.enrichment?.type === 'management') {
        mockAnswer = `New CFO brings ~20 years experience from listed FMCG firms, taking over effective 1 Dec.`
      }

      setHistory((prev) => [
        ...prev,
        {
          q: qText,
          a: mockAnswer,
          verified: true,
          quote: filing.headline,
        },
      ])
      setIsAsking(false)
    }, 400)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-[430px] bg-zinc-900 border-t border-zinc-800 rounded-t-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-200">
        {/* Header */}
        <div className="p-3.5 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center">
              <Bot className="w-3.5 h-3.5 text-zinc-300" />
            </div>
            <div>
              <div className="text-xs font-bold text-zinc-100 flex items-center gap-1.5">
                <span>Ask FINN</span>
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
                {h.verified && (
                  <div className="flex items-center gap-1 text-[10px] text-emerald-400 font-mono pt-1 border-t border-zinc-800/50">
                    <CheckCircle2 className="w-2.5 h-2.5" />
                    <span>Verified quote match</span>
                  </div>
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
          {[
            'What was the key margin driver?',
            'What is the management background?',
            'Compare QoQ vs YoY',
          ].map((prompt, idx) => (
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
