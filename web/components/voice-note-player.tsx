'use client';

import { useEffect, useState } from 'react';
import { apiDownload } from '../lib/api';

// A minimal <audio> player for a saved VoiceNote. We can't just point
// <audio src=…> at the backend URL because the JWT sits in an httpOnly
// cookie and the browser sends it on same-origin fetches only. Instead
// we download the audio through the authed api helper (which handles
// the cookie + 401→refresh) and blob-URL it into the player.

export function VoiceNotePlayer({ voiceNoteId }: { voiceNoteId: string }) {
  const [src, setSrc] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;
    (async () => {
      try {
        const blob = await apiDownload(`/voice-notes/${voiceNoteId}/audio`);
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setSrc(objectUrl);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Could not load audio');
        }
      }
    })();
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [voiceNoteId]);

  if (error) {
    return (
      <p className="text-xs text-coral-700 italic">
        🎙 Voice note unavailable ({error})
      </p>
    );
  }
  if (!src) {
    return <p className="text-xs text-sage-500 italic">Loading voice note…</p>;
  }
  return <audio src={src} controls className="w-full max-w-md" />;
}
