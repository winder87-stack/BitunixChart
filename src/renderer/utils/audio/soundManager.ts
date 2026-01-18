/**
 * Audio utility for playing signal alerts
 */

export type SoundType = 'WEAK' | 'MODERATE' | 'STRONG' | 'SUPER' | 'ERROR';

class SoundManager {
  private audioContext: AudioContext | null = null;
  private lastPlayedTime: number = 0;
  private minInterval: number = 5000; // 5 seconds between sounds
  private isEnabled: boolean = true;

  constructor() {
    this.initAudio();
  }

  private initAudio() {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (e) {
      console.warn('AudioContext not supported');
    }
  }

  public setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
  }

  public async playSound(type: SoundType) {
    if (!this.isEnabled || !this.audioContext) return;

    const now = Date.now();
    if (now - this.lastPlayedTime < this.minInterval) return;

    this.lastPlayedTime = now;

    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    this.configureSound(oscillator, gainNode, type);

    oscillator.start();
    
    // Cleanup
    setTimeout(() => {
      oscillator.stop();
      oscillator.disconnect();
      gainNode.disconnect();
    }, 1000);
  }

  private configureSound(oscillator: OscillatorNode, gainNode: GainNode, type: SoundType) {
    const now = this.audioContext!.currentTime;

    switch (type) {
      case 'SUPER':
        // Triple rising tone
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(523.25, now); // C5
        oscillator.frequency.linearRampToValueAtTime(659.25, now + 0.1); // E5
        oscillator.frequency.linearRampToValueAtTime(783.99, now + 0.2); // G5
        gainNode.gain.setValueAtTime(0.5, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
        break;

      case 'STRONG':
        // Double rising tone
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(440, now); // A4
        oscillator.frequency.linearRampToValueAtTime(554.37, now + 0.1); // C#5
        gainNode.gain.setValueAtTime(0.4, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
        break;

      case 'MODERATE':
        // Single tone
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(440, now); // A4
        gainNode.gain.setValueAtTime(0.3, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        break;

      case 'WEAK':
        // Low soft tone
        oscillator.type = 'triangle';
        oscillator.frequency.setValueAtTime(220, now); // A3
        gainNode.gain.setValueAtTime(0.2, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
        break;

      case 'ERROR':
        // Low buzzing
        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(110, now); // A2
        gainNode.gain.setValueAtTime(0.3, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        break;
    }
  }
}

export const soundManager = new SoundManager();
