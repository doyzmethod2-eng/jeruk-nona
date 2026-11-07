// Service client-side untuk berkomunikasi dengan server-side Gemini API proxy

export interface AiStatus {
  connected: boolean;
  model?: string;
}

export async function checkAiStatus(): Promise<AiStatus> {
  try {
    const res = await fetch('/api/ai/status');
    if (!res.ok) throw new Error('Status request failed');
    return await res.json();
  } catch {
    return { connected: false };
  }
}

export async function askAiConsultant(message: string, context?: Record<string, unknown>): Promise<string> {
  try {
    const res = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, context }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Gagal memproses jawaban AI');
    }
    return data.reply;
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Koneksi ke server AI gagal';
    throw new Error(errorMsg);
  }
}

export async function generateSalesAnalysis(context: Record<string, unknown>, prompt?: string): Promise<string> {
  try {
    const res = await fetch('/api/ai/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, context }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Gagal memproses analisis AI');
    }
    return data.result;
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Koneksi ke server AI gagal';
    throw new Error(errorMsg);
  }
}

export async function generateMenuIdeas(prompt: string): Promise<string> {
  try {
    const res = await fetch('/api/ai/menu-ideas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Gagal memproses ide menu');
    }
    return data.result;
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Koneksi ke server AI gagal';
    throw new Error(errorMsg);
  }
}
