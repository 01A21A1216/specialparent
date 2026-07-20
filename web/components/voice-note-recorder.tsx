'use client';

import { useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';

// A small, reusable "hold-mic-then-review" flow:
//   idle  → record → recorded → (save uploads + auto-transcribes) → saved
// The parent gets a callback with { voiceNoteId, transcript, durationSec }
// as soon as the upload succeeds. The recorder self-manages the audio
// stream — starts on Record, releases mic on Stop / unmount.
//
// Browser support: MediaRecorder is universal on modern browsers, but
// Safari / iOS ships without opus support in some versions. We pick a
// codec at runtime that the browser will actually accept.

interface UploadedNote {
  id: string;
  transcript: string | null;
  durationSec: number | null;
}

export function VoiceNoteRecorder({
  onSaved,
  onCancel,
  disabled = false,
}: {
  onSaved: (note: UploadedNote) => void;
  onCancel?: () => void;
  disabled?: boolean;
}) {
  type State = 'idle' | 'requesting' | 'recording' | 'recorded' | 'uploading';
  const [state, setState] = useState<State>('idle');
  const [error, setError] = useState<string | null>(null);
  const [seconds, setSeconds] = useState(0);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Enforce a hard cap so the user can't accidentally record 20 minutes.
  const MAX_SECONDS = 180;

  function pickMimeType(): string {
    const candidates = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/ogg;codecs=opus',
    ];
    for (const c of candidates) {
      if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(c)) {
        return c;
      }
    }
    return 'audio/webm';
  }

  function cleanup() {
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    recorderRef.current = null;
  }

  useEffect(() => {
    return () => {
      cleanup();
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function startRecording() {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setError("This browser doesn't support voice recording.");
      return;
    }
    setError(null);
    setState('requesting');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mime = pickMimeType();
      const rec = new MediaRecorder(stream, { mimeType: mime });
      chunksRef.current = [];
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.onstop = () => {
        const finalBlob = new Blob(chunksRef.current, { type: mime });
        setBlob(finalBlob);
        setPreviewUrl(URL.createObjectURL(finalBlob));
        cleanup();
        setState('recorded');
      };
      recorderRef.current = rec;
      rec.start(500); // gather data every 500 ms
      setState('recording');
      setSeconds(0);
      tickRef.current = setInterval(() => {
        setSeconds((s) => {
          if (s + 1 >= MAX_SECONDS) {
            stopRecording();
            return MAX_SECONDS;
          }
          return s + 1;
        });
      }, 1000);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Microphone access denied.';
      setError(msg);
      setState('idle');
      cleanup();
    }
  }

  function stopRecording() {
    try {
      recorderRef.current?.stop();
    } catch {
      /* ignore */
    }
  }

  function discard() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setBlob(null);
    setPreviewUrl(null);
    setSeconds(0);
    setState('idle');
  }

  async function save() {
    if (!blob) return;
    setState('uploading');
    setError(null);
    try {
      const fd = new FormData();
      // Extension picked from the actual mime so multer / Whisper have a
      // valid hint.
      const ext = blob.type.includes('mp4')
        ? 'm4a'
        : blob.type.includes('ogg')
          ? 'ogg'
          : 'webm';
      fd.append('file', blob, `note.${ext}`);
      fd.append('durationSec', String(seconds));
      const created = await api<UploadedNote>('/voice-notes', {
        method: 'POST',
        body: fd,
      });
      onSaved(created);
      discard();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Upload failed';
      setError(msg);
      setState('recorded');
    }
  }

  return (
    <div className="rounded-2xl border border-sage-100 bg-cream-50 p-3 space-y-3">
      {error && (
        <div className="text-sm text-coral-800 bg-coral-50 border border-coral-200 rounded-xl p-2">
          {error}
        </div>
      )}

      {state === 'idle' && (
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={startRecording}
            disabled={disabled}
            className="chip bg-coral-500 text-white hover:bg-coral-600 disabled:opacity-60"
          >
            🎙 Record a voice note
          </button>
          <span className="text-xs text-sage-500">
            Up to 3 min · auto-transcribed if the AI key is configured
          </span>
        </div>
      )}

      {state === 'requesting' && (
        <div className="text-sm text-sage-600">
          Waiting for mic permission…
        </div>
      )}

      {state === 'recording' && (
        <div className="flex items-center gap-3 flex-wrap">
          <span className="inline-flex items-center gap-2 text-coral-700">
            <span className="w-3 h-3 rounded-full bg-coral-500 animate-pulse" aria-hidden />
            Recording {formatSec(seconds)} / {formatSec(MAX_SECONDS)}
          </span>
          <button
            type="button"
            onClick={stopRecording}
            className="chip bg-sage-600 text-white hover:bg-sage-700"
          >
            ⏹ Stop
          </button>
        </div>
      )}

      {state === 'recorded' && previewUrl && (
        <div className="space-y-2">
          <audio src={previewUrl} controls className="w-full" />
          <div className="flex gap-2 flex-wrap items-center">
            <span className="text-xs text-sage-500">{formatSec(seconds)}</span>
            <button
              type="button"
              onClick={save}
              className="chip bg-sage-600 text-white hover:bg-sage-700"
            >
              ✓ Save + transcribe
            </button>
            <button
              type="button"
              onClick={discard}
              className="chip bg-cream-200 text-sage-700 hover:bg-cream-300"
            >
              ↺ Re-record
            </button>
            {onCancel && (
              <button
                type="button"
                onClick={() => {
                  discard();
                  onCancel();
                }}
                className="chip text-sage-500 hover:text-sage-800"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      )}

      {state === 'uploading' && (
        <div className="text-sm text-sage-600">Uploading & transcribing…</div>
      )}
    </div>
  );
}

function formatSec(n: number): string {
  const m = Math.floor(n / 60);
  const s = n % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}
