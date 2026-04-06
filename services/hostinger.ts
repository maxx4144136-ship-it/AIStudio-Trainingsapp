import { AppData } from "../types";

export const fetchFromHostinger = async (url: string): Promise<AppData | null> => {
  try {
    const fetchUrl = `${url}?t=${Date.now()}`;
    const response = await fetch(fetchUrl, {
      mode: 'cors',
      credentials: 'omit'
    });
    
    if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
    }
    
    const text = await response.text();
    const cleanText = text.trim();
    
    if (!cleanText || cleanText === "null") return null;

    if (cleanText.startsWith("<")) {
        throw new Error("HTML empfangen (falsche URL?)");
    }

    try {
        return JSON.parse(cleanText) as AppData;
    } catch (e) {
        throw new Error("Ungültige JSON-Daten");
    }
  } catch (error: any) {
    if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
        throw new Error("Netzwerkfehler: Server nicht erreichbar oder CORS-Blockade.");
    }
    throw error;
  }
};

export const saveToHostinger = async (url: string, data: AppData): Promise<{ success: boolean; error?: string }> => {
  try {
    const response = await fetch(url, {
      method: "POST",
      mode: 'cors',
      credentials: 'omit',
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
        if (response.status === 404) {
            return { success: false, error: "404: api.php nicht gefunden" };
        }
        if (response.status === 405) {
            return { success: false, error: "405: PHP nicht aktiv/konfiguriert" };
        }
        return { success: false, error: `HTTP ${response.status} ${response.statusText}` };
    }
    
    const text = await response.text();
    const isSuccess = text.includes("success") || text.includes('"ok":true') || text.includes('"ok": true');
    
    if (!isSuccess) {
        return { success: false, error: `Server Antwort: ${text.substring(0, 50)}...` };
    }

    return { success: true };
  } catch (error: any) {
    console.error("Hostinger Save Error:", error);
    return { success: false, error: error.message || "Netzwerk/CORS Fehler" };
  }
};
