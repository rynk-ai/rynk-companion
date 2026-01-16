import cssText from "data-text:./style.css"
import type { PlasmoCSConfig } from "plasmo"
import { useEffect, useState } from "react"
import { Sparkle, MagicWand, Briefcase, TextAlignLeft, Copy, X, Lightning } from "@phosphor-icons/react"
import { API_BASE_URL } from "./lib/api"

export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"]
}

export const getStyle = () => {
  const style = document.createElement("style")
  style.textContent = cssText
  return style
}

export default function PlasmoOverlay() {
  const [selection, setSelection] = useState<string | null>(null)
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null)
  const [showActions, setShowActions] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<{ type: 'success' | 'error', content: string } | null>(null)

  useEffect(() => {
    const handleMouseUp = (e: MouseEvent) => {
      // Small delay to let selection settle
      setTimeout(() => {
        const text = window.getSelection()?.toString().trim()
        if (text && text.length > 0) {
          setSelection(text)
          // Position at the top-left of the selection
          const range = window.getSelection()?.getRangeAt(0)
          const rect = range?.getBoundingClientRect()
          
          if (rect) {
            setPosition({ 
                x: rect.left + window.scrollX, 
                y: rect.top + window.scrollY - 40 // 40px above
            })
          }
        } else {
             // Only hide if we aren't interacting with our own UI
            // This logic needs to be robust, for now simple hide on click outside
            // But since this is Shadow DOM, clicks inside don't propagate to document usually?
            // actually they do composed events
            setSelection(null)
            setPosition(null)
            setShowActions(false)
        }
      }, 10)
    }

    document.addEventListener("mouseup", handleMouseUp)
    return () => document.removeEventListener("mouseup", handleMouseUp)
  }, [])

  const handleQuickAction = async (action: string) => {
    if (!selection) return
    setIsLoading(true)
    
    try {
        const response = await new Promise<{success: boolean, data?: any, error?: string}>((resolve) => {
            chrome.runtime.sendMessage({ 
                type: "AI_ACTION",
                text: selection, 
                action: action 
            }, (res) => resolve(res))
        })

        if (response && response.success && response.data) {
            if (response.data.result) {
                 setResult({ type: 'success', content: response.data.result })
            } else {
                 setResult({ type: 'error', content: response.data.error || "Unknown error" })
            }
        } else {
            setResult({ type: 'error', content: response?.error || "Failed to connect to Rynk." })
        }
    } catch (e) {
        setResult({ type: 'error', content: "Failed to communicate with extension." })
    } finally {
        setIsLoading(false)
    }
  }

  if (!selection || !position) return null

  return (
    <div 
        className="fixed z-50 font-sans text-base antialiased"
        style={{ 
            top: position.y, 
            left: position.x 
        }}
    >
        {!showActions && !result ? (
             <button 
                onClick={(e) => {
                    e.stopPropagation()
                    setShowActions(true)
                }}
                className="group h-8 w-8 bg-zinc-900 dark:bg-zinc-50 rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform cursor-pointer border border-white/20 dark:border-zinc-800"
            >
                <div className="h-4 w-4 relative">
                   {/* Rynk Logo / Sparkle */}
                   <Sparkle weight="fill" className="text-white dark:text-black absolute inset-0 animate-pulse-slow" size={16} />
                </div>
            </button>
        ) : (
            <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-2xl p-3 flex flex-col gap-2 min-w-[220px] max-w-[320px] animate-in fade-in zoom-in-95 duration-200 origin-top-left">
                <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-900">
                    <div className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider flex items-center gap-1">
                        <Lightning weight="fill" size={10} className="text-amber-500"/>
                        Rynk Companion
                    </div>
                    <button onClick={() => { setShowActions(false); setResult(null); }} className="text-zinc-400 hover:text-zinc-600 transition-colors">
                        <X size={14} weight="bold" />
                    </button>
                </div>
                
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center p-4 gap-2 text-zinc-400">
                        <div className="animate-spin h-5 w-5 border-2 border-zinc-800 border-t-transparent dark:border-zinc-200 dark:border-t-transparent rounded-full" />
                        <span className="text-xs">Thinking...</span>
                    </div>
                ) : result ? (
                    <div className={`text-sm p-3 rounded-md border ${result.type === 'error' ? 'bg-red-50 border-red-100 text-red-600' : 'bg-zinc-50 border-zinc-100 dark:bg-zinc-900 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200'}`}>
                        {result.content}
                         {result.type === 'success' && (
                            <button 
                                onClick={() => {
                                    navigator.clipboard.writeText(result.content || "")
                                    setShowActions(false)
                                    setResult(null)
                                }}
                                className="mt-3 flex items-center justify-center gap-1.5 w-full py-1.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded text-[10px] uppercase font-bold tracking-wider text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors"
                            >
                                <Copy size={12} weight="bold" /> Copy & Close
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="flex flex-col gap-1">
                        <ActionButton 
                            icon={<MagicWand size={14} />} 
                            label="Fix Grammar" 
                            onClick={() => handleQuickAction('grammar')} 
                        />
                        <ActionButton 
                            icon={<Briefcase size={14} />} 
                            label="Make Professional" 
                            onClick={() => handleQuickAction('professional')} 
                        />
                        <ActionButton 
                            icon={<TextAlignLeft size={14} />} 
                            label="Summarize" 
                            onClick={() => handleQuickAction('summarize')} 
                        />
                    </div>
                )}
            </div>
        )}
    </div>
  )
}

function ActionButton({ icon, label, onClick }: { icon: React.ReactNode, label: string, onClick: () => void }) {
    return (
        <button 
            onClick={onClick}
            className="flex items-center gap-2.5 text-left px-2 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 rounded-md text-sm text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 transition-all group"
        >
            <span className="text-zinc-400 group-hover:text-zinc-800 dark:group-hover:text-zinc-200 transition-colors">
                {icon}
            </span>
            <span className="font-medium">{label}</span>
        </button>
    )
}
