import { useEffect, useRef, useState } from 'react';

export type LogMessage = {
  type: 'log' | 'error' | 'eof' | 'pong';
  hostId?: string;
  file?: string;
  data?: string;
  error?: string;
  t?: number;
};

export function useLogStreaming(hostId: number | string | undefined, file: string | undefined, opts?: { initialLines?: number }) {
  const [lines, setLines] = useState<string[]>([]);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!hostId || !file) return;

    // Compute WS URL
    const isDev = import.meta.env.MODE !== 'production';
    const host = window.location.hostname || 'localhost';
    const url = isDev ? `ws://${host}:8087` : `ws://${host}:8087`;

    const ws = new WebSocket(url);
    wsRef.current = ws;
    let opened = false;

    ws.onopen = () => {
      opened = true;
      setConnected(true);
      ws.send(JSON.stringify({ type: 'subscribe', hostId: String(hostId), file, initialLines: opts?.initialLines ?? 200 }));
    };

    ws.onmessage = (evt) => {
      try {
        const msg: LogMessage = JSON.parse(evt.data);
        if (msg.type === 'log' && msg.data) {
          // Split incoming chunk into lines and append
          const newLines = msg.data.replace(/\r/g, '').split('\n');
          setLines(prev => {
            const merged = [...prev, ...newLines];
            // cap to last 5000 lines to avoid memory bloat
            return merged.length > 5000 ? merged.slice(merged.length - 5000) : merged;
          });
        } else if (msg.type === 'error' && msg.error) {
          setError(msg.error);
        }
      } catch (e) {
        // ignore parse errors
      }
    };

    ws.onerror = () => setError('WebSocket error');
    ws.onclose = () => setConnected(false);

    return () => {
      try {
        if (opened) ws.send(JSON.stringify({ type: 'unsubscribe', hostId: String(hostId), file }));
      } catch {}
      try { ws.close(); } catch {}
    };
  }, [hostId, file]);

  const clear = () => setLines([]);

  return { lines, connected, error, clear };
}

