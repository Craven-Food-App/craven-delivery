/**
 * Resumes suspended AudioContext and primes speech synthesis on first user gesture.
 * Required on Android WebView: sounds and TTS often stay muted until the user has interacted.
 */
import { useEffect, useRef } from 'react';

export function useResumeAudioOnGesture() {
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;

    const resume = () => {
      if (done.current) return;
      done.current = true;

      // Resume any suspended AudioContext (required for in-app sounds on mobile WebView)
      try {
        const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (Ctx) {
          const ctx = new Ctx();
          if (ctx.state === 'suspended') {
            ctx.resume().catch(() => {});
          }
          ctx.close();
        }
      } catch {
        // ignore
      }

      // Prime speech synthesis so "read out loud" works on Android (loads voices / wakes engine)
      if ('speechSynthesis' in window) {
        try {
          window.speechSynthesis.getVoices();
          const u = new SpeechSynthesisUtterance('\u00A0'); // non-breaking space
          u.volume = 0.01;
          u.rate = 10;
          window.speechSynthesis.speak(u);
          setTimeout(() => window.speechSynthesis.cancel(), 50);
        } catch {
          // ignore
        }
      }
    };

    const events = ['click', 'touchstart', 'keydown'] as const;
    events.forEach((ev) => {
      window.addEventListener(ev, resume, { once: true, passive: true });
    });

    return () => {
      events.forEach((ev) => window.removeEventListener(ev, resume));
    };
  }, []);
}
