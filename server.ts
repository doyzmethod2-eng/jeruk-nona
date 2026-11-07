import express from 'express';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import JSZip from 'jszip';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function callGeminiWithFallback(
  ai: GoogleGenAI,
  params: { contents: string; config?: Record<string, unknown> }
) {
  // Fast resilient models: gemini-3.1-flash-lite first, then gemini-3.8-flash, then gemini-flash-latest
  const models = ['gemini-3.1-flash-lite', 'gemini-3.8-flash', 'gemini-flash-latest'];
  let lastError: unknown = null;

  for (const model of models) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: params.contents,
        config: params.config,
      });
      return response;
    } catch (err: unknown) {
      lastError = err;
      const errMsg = String(err);
      if (
        errMsg.includes('503') ||
        errMsg.includes('UNAVAILABLE') ||
        errMsg.includes('high demand') ||
        errMsg.includes('429')
      ) {
        console.warn(`Model ${model} unavailable or busy, falling back to next available model...`);
        continue;
      }
      throw err;
    }
  }
  throw lastError;
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '10mb' }));

  const apiKey = process.env.GEMINI_API_KEY;
  const ai = apiKey
    ? new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      })
    : null;

  // Helper to recursively add files to JSZip
  function addDirectoryToZip(zip: JSZip, localDir: string, zipPath = '') {
    const items = fs.readdirSync(localDir);
    for (const item of items) {
      if (['node_modules', 'dist', '.git', '.cache'].includes(item)) continue;
      const fullPath = path.join(localDir, item);
      const stat = fs.statSync(fullPath);
      const itemZipPath = zipPath ? `${zipPath}/${item}` : item;
      if (stat.isDirectory()) {
        addDirectoryToZip(zip, fullPath, itemZipPath);
      } else {
        if (item === '.env') continue; // keep sensitive secrets local
        const content = fs.readFileSync(fullPath);
        zip.file(itemZipPath, content);
      }
    }
  }

  // Direct ZIP download of the complete app source code
  app.get('/api/download-project-zip', async (_req, res) => {
    try {
      const zip = new JSZip();
      addDirectoryToZip(zip, __dirname);
      const zipBuffer = await zip.generateAsync({
        type: 'nodebuffer',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 },
      });
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', 'attachment; filename="jeruk-nona-pos-source.zip"');
      res.send(zipBuffer);
    } catch (err: unknown) {
      console.error('Error generating project zip:', err);
      res.status(500).send('Gagal membuat file ZIP project.');
    }
  });

  // Endpoint to check AI status
  app.get('/api/ai/status', (_req, res) => {
    res.json({
      connected: !!apiKey,
      model: 'gemini-3.1-flash-lite',
    });
  });

  // Business Analysis Endpoint
  app.post('/api/ai/analyze', async (req, res) => {
    try {
      if (!ai) {
        return res.status(503).json({ error: 'GEMINI_API_KEY belum dikonfigurasi di server.' });
      }

      const { prompt, context } = req.body;
      const systemInstruction = `Kamu adalah Asisten Bisnis & Analis Operasional Cerdas untuk gerai minuman "JERUK NONA" (Aplikasi POS Kasir).
Tugasmu adalah menganalisis data penjualan, stok cup/kemasan seal, dan memberikan rekomendasi taktis bisnis yang aplikatif.
Gaya respon:
- Bahasa Indonesia yang santun, energik, dan profesional.
- Gunakan poin-poin terstruktur yang mudah dipahami pemilik atau kasir.
- Selalu cantumkan saran praktis (misalnya bundling menu, antisipasi jam sibuk, atau reorder bahan baku).`;

      const contents = `Konteks Ringkasan Toko JERUK NONA:
${JSON.stringify(context || {}, null, 2)}

Pertanyaan / Kebutuhan Analisis:
${prompt || 'Berikan analisis ringkas performa penjualan hari ini dan rekomendasi strategi bisnis.'}`;

      const response = await callGeminiWithFallback(ai, {
        contents,
        config: {
          systemInstruction,
        },
      });

      res.json({ result: response.text ?? 'Tidak ada hasil analisis yang dihasilkan.' });
    } catch (err: unknown) {
      console.error('Error generating AI analysis:', err);
      const errMsg = err instanceof Error ? err.message : 'Gagal memproses analisis AI';
      res.status(500).json({ error: errMsg });
    }
  });

  // Chat/Consultant Endpoint for POS Assistant
  app.post('/api/ai/chat', async (req, res) => {
    try {
      if (!ai) {
        return res.status(503).json({ error: 'GEMINI_API_KEY belum dikonfigurasi di server.' });
      }

      const { message, context } = req.body;
      const systemInstruction = `Kamu adalah Asisten AI Pintar JERUK NONA yang berada langsung di dalam aplikasi Kasir POS.
Kamu membantu kasir dan owner dalam:
1. Menjawab pertanyaan seputar produk jeruk, cup/seal, stok, add-on (yakult, selasih, jelly, dll).
2. Memberikan ide promo diskon atau paket hemat.
3. Tips pelayanan kasir cepat dan ramah.
Gunakan nada ramah, ringkas, dan jelas dalam Bahasa Indonesia.`;

      const contents = `Informasi Toko Saat Ini:
${JSON.stringify(context || {}, null, 2)}

Pertanyaan Kasir/Owner:
${message}`;

      const response = await callGeminiWithFallback(ai, {
        contents,
        config: {
          systemInstruction,
        },
      });

      res.json({ reply: response.text ?? 'Maaf, saya belum dapat menjawab pertanyaan tersebut.' });
    } catch (err: unknown) {
      console.error('Error processing AI chat:', err);
      const errMsg = err instanceof Error ? err.message : 'Gagal terhubung ke Gemini API';
      res.status(500).json({ error: errMsg });
    }
  });

  // AI Menu Ideation Endpoint
  app.post('/api/ai/menu-ideas', async (req, res) => {
    try {
      if (!ai) {
        return res.status(503).json({ error: 'GEMINI_API_KEY belum dikonfigurasi di server.' });
      }

      const { prompt } = req.body;
      const response = await callGeminiWithFallback(ai, {
        contents: `Berikan 3 rekomendasi inovasi menu minuman jeruk segar untuk "JERUK NONA" berdasarkan ide: "${prompt || 'minuman jeruk segar kekinian'}".
Sertakan untuk masing-masing:
1. Nama Menu yang unik & menjual
2. Bahan utama & add-on pelengkap (yakult, selasih, jelly, dll)
3. Rekomendasi Harga Jual & Estimasi Modal (HPP) dalam Rupiah (Rp)
4. Keunggulan rasa.
Tampilkan dalam format Bahasa Indonesia yang rapi.`,
      });

      res.json({ result: response.text ?? 'Tidak ada ide menu yang dihasilkan.' });
    } catch (err: unknown) {
      console.error('Error generating menu ideas:', err);
      const errMsg = err instanceof Error ? err.message : 'Gagal memproses ide menu';
      res.status(500).json({ error: errMsg });
    }
  });

  // Vite middleware in dev or static files in production
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server JERUK NONA POS running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
