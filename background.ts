
import { API_BASE_URL } from "./lib/api"

export {}

console.log("[Background] Service Worker Started")

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === "AI_ACTION") {
        console.log("[Background] Received AI_ACTION:", request.action)
        
        handleAiAction(request.text, request.action)
            .then(data => {
                console.log("[Background] API Success:", data)
                sendResponse({ success: true, data })
            })
            .catch(error => {
                console.error("[Background] API Error:", error)
                sendResponse({ success: false, error: error.message })
            })
        
        return true // Keep channel open for async response
    }
})

async function handleAiAction(text: string, action: string) {
    console.log(`[Background] Fetching ${API_BASE_URL}/api/tools/companion`)
    
    // Note: 'credentials: include' works in Background SW if host permissions are set.
    // It will send cookies for 'rynk.io' if the user is logged in on the web.
    
    const response = await fetch(`${API_BASE_URL}/api/tools/companion`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
            text,
            action
        })
    })

    if (!response.ok) {
        let errorMsg = "Request Failed"
        try {
            const data = await response.json()
            errorMsg = data.error || response.statusText
        } catch(e) {
            errorMsg = `Status ${response.status}: ${response.statusText}`
        }
        throw new Error(errorMsg)
    }

    return await response.json()
}
