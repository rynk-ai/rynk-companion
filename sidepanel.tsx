import { useState, useEffect } from "react"
import { MagicWand, Briefcase, TextAlignLeft, Translate, Copy, Lightning, ArrowRight, WarningCircle } from "@phosphor-icons/react"
import "./style.css"
import { useAuth, API_BASE_URL } from "./lib/api"

export default function SidePanel() {
  const { session, loading } = useAuth()
  const [inputText, setInputText] = useState("")
  const [outputText, setOutputText] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)

  // Auto-populate from selection
  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tab = tabs[0]
        if (tab?.id) {
            chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: () => window.getSelection()?.toString() || ""
            }, (results) => {
                const text = results?.[0]?.result
                if (text) setInputText(text)
            })
        }
    })
  }, [])

  const handleAction = async (action: string) => {
    console.log("[SidePanel] Action clicked:", action)
    setIsProcessing(true)
    setOutputText("")
    
    try {
        console.log("[SidePanel] Fetching:", `${API_BASE_URL}/api/tools/companion`)
        const response = await fetch(`${API_BASE_URL}/api/tools/companion`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include", 
            body: JSON.stringify({
                text: inputText,
                action: action
            })
        })
        console.log("[SidePanel] Response Status:", response.status)

        const data = await response.json()
        console.log("[SidePanel] Data:", data)
        
        if (response.ok) {
            setOutputText(data.result)
        } else {
            console.error("[SidePanel] Error Data:", data)
            setOutputText(`Error: ${data.error || "Failed to process"}`)
        }
    } catch (error: any) {
        console.error("[SidePanel] Catch Error:", error)
        if (error.message.includes("Extension context invalidated")) {
             setOutputText("Error: Extension updated. Please reload the page.")
        } else {
             setOutputText(`Connection Failed: ${error.message}`)
        }
    } finally {
        setIsProcessing(false)
    }
  }

  if (loading) {
    return (
        <div className="flex items-center justify-center h-screen bg-background text-foreground">
            <div className="animate-spin h-5 w-5 border-2 border-foreground border-t-transparent rounded-full" />
        </div>
    )
  }

  if (!session) {
    return (
        <div className="flex flex-col items-center justify-center h-screen bg-background p-6 text-center space-y-6">
            <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tighter swiss-headline">rynk</h1>
                <p className="text-sm text-muted-foreground swiss-subhead">Your AI writing companion</p>
            </div>
            <a 
                href={`${API_BASE_URL}/login`} 
                target="_blank" 
                rel="noreferrer"
                className="w-full py-3 bg-foreground text-background text-sm font-medium hover:opacity-90 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
            >
                Sign In to Continue <ArrowRight weight="bold" />
            </a>
        </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-background text-foreground font-sans w-full overflow-hidden">
      {/* Header */}
      <header className="px-5 py-4 border-b border-border flex items-center justify-between bg-background/80 backdrop-blur-md sticky top-0 z-10">
        <h1 className="text-lg font-bold tracking-tight flex items-center gap-2">
            <div className="h-2 w-2 bg-foreground rounded-full" />
            rynk
        </h1>
        <div className="flex items-center gap-1.5 px-2 py-1 bg-secondary rounded text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
             <Lightning size={12} weight="fill" className={session.user.credits > 0 ? "text-amber-500" : "text-muted-foreground"} />
             {session.user.credits}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col p-5 gap-5 overflow-y-auto">
        <div className="space-y-2 flex-1">
            <div className="flex items-center justify-between">
                <label className="swiss-mono text-muted-foreground">Input</label>
                {inputText && (
                    <button onClick={() => setInputText("")} className="text-[10px] text-muted-foreground hover:text-foreground transition-colors">
                        Clear
                    </button>
                )}
            </div>
            <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Select text on any page or type here..."
                className="w-full h-full min-h-[120px] bg-secondary/30 hover:bg-secondary/50 focus:bg-secondary/50 border-0 p-4 text-sm leading-relaxed focus:ring-1 focus:ring-border transition-all resize-none rounded-sm placeholder:text-muted-foreground/50"
            />
        </div>

        {/* Actions Grid */}
        <div className="grid grid-cols-2 gap-2">
            <ActionButton 
                icon={<MagicWand size={16} weight="duotone" />} 
                label="Fix Grammar" 
                onClick={() => handleAction('grammar')} 
                disabled={!inputText || isProcessing} 
                color="blue"
            />
            <ActionButton 
                icon={<Briefcase size={16} weight="duotone" />} 
                label="Professional" 
                onClick={() => handleAction('professional')} 
                disabled={!inputText || isProcessing}
                color="purple" 
            />
            <ActionButton 
                icon={<TextAlignLeft size={16} weight="duotone" />} 
                label="Summarize" 
                onClick={() => handleAction('summarize')} 
                disabled={!inputText || isProcessing}
                color="orange" 
            />
             <ActionButton 
                icon={<Translate size={16} weight="duotone" />} 
                label="Translate" 
                disabled={true}
                color="gray"
            />
        </div>

        {/* Output Area */}
        {outputText && (
             <div className="space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex items-center justify-between pt-4 border-t border-border/50">
                    <label className="swiss-mono text-muted-foreground">Result</label>
                    <button 
                        onClick={() => navigator.clipboard.writeText(outputText)}
                        className="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-wider hover:text-foreground text-muted-foreground transition-colors"
                    >
                        <Copy size={12} /> Copy
                    </button>
                </div>
                <div className="bg-card border border-border/50 p-4 text-sm leading-relaxed shadow-sm">
                    {outputText.startsWith("Error:") ? (
                        <div className="flex items-start gap-2 text-red-500">
                            <WarningCircle size={16} weight="fill" className="mt-0.5 shrink-0" />
                            <span>{outputText}</span>
                        </div>
                    ) : (
                        outputText
                    )}
                </div>
            </div>
        )}
      </main>

      {/* Footer */}
      <footer className="p-4 border-t border-border bg-secondary/5 text-center">
        <p className="text-[10px] text-muted-foreground/60 swiss-mono">
            {session.user.email}
        </p>
      </footer>
    </div>
  )
}

function ActionButton({ icon, label, onClick, disabled, color }: any) {
    const colorStyles: Record<string, string> = {
        blue: "group-hover:text-blue-600 group-hover:bg-blue-50 dark:group-hover:bg-blue-950/30 dark:group-hover:text-blue-400",
        purple: "group-hover:text-purple-600 group-hover:bg-purple-50 dark:group-hover:bg-purple-950/30 dark:group-hover:text-purple-400",
        orange: "group-hover:text-orange-600 group-hover:bg-orange-50 dark:group-hover:bg-orange-950/30 dark:group-hover:text-orange-400",
        gray: "opacity-50 cursor-not-allowed"
    }

    return (
        <button 
            onClick={onClick}
            disabled={disabled}
            className={`
                group relative flex flex-col items-center justify-center gap-2 p-4 
                bg-card border border-border transition-all duration-200 
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-foreground/20 hover:shadow-sm active:scale-[0.98]'}
                ${colorStyles[color]}
            `}
        >
            <div className={`text-muted-foreground transition-colors duration-200 ${!disabled && colorStyles[color].split(" ")[0]}`}>
                {icon}
            </div>
            <span className="text-xs font-medium tracking-tight">{label}</span>
        </button>
    )
}
