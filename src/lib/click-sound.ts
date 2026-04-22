/**
 * Plays a short, light, tactile "tick" sound via the Web Audio API.
 * No asset needed. Silently no-ops in environments without AudioContext
 * (SSR, very old browsers).
 *
 * Implementation: 12ms of decaying white noise through a high-pass
 * filter — gives a crisp click, not a tone.
 */
let ctx: AudioContext | null = null;

export function playClick() {
  if (typeof window === "undefined") return;
  try {
    const AC =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AC) return;
    if (!ctx) ctx = new AC();
    if (ctx.state === "suspended") ctx.resume();

    const sampleRate = ctx.sampleRate;
    const durationSec = 0.012;
    const bufferSize = Math.floor(sampleRate * durationSec);
    const buffer = ctx.createBuffer(1, bufferSize, sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      const decay = Math.pow(1 - i / bufferSize, 2);
      data[i] = (Math.random() * 2 - 1) * decay;
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;

    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 2500;

    const gain = ctx.createGain();
    gain.gain.value = 0.18;

    source.connect(hp);
    hp.connect(gain);
    gain.connect(ctx.destination);
    source.start();
  } catch {
    // Ignore — audio is nice-to-have.
  }
}
