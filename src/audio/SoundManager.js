import { ENEMY_SETTINGS } from "../utils/constants.js";
import {
  KHMER_ALPHABET,
  KHMER_LETTER_AUDIO_IDS,
  KHMER_LETTER_SPEAK_TEXT,
} from "../utils/khmerAlphabet.js";

const LEGACY_AUDIO_IDS = {
  0: "ka",
  1: "kha",
  2: "ga",
  3: "kho",
};

const MUSIC_PATH = "./assets/audio/music/music.mp3";
const DEFAULT_MUSIC_VOLUME = 0.32;
const DEFAULT_SFX_VOLUME = 0.85;
const MUSIC_VOLUME_STORAGE_KEY = "blade-survivor-music-volume";
const SFX_VOLUME_STORAGE_KEY = "blade-survivor-sfx-volume";

function readStoredVolume(key, fallback) {
  const raw = localStorage.getItem(key);

  if (raw === null) {
    return fallback;
  }

  const value = Number.parseFloat(raw);
  return Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : fallback;
}

export class SoundManager {
  constructor() {
    this.context = null;
    this.masterGain = null;
    this.unlocked = false;
    this.enabled = true;
    this.volume = readStoredVolume(SFX_VOLUME_STORAGE_KEY, DEFAULT_SFX_VOLUME);
    this.musicVolume = readStoredVolume(MUSIC_VOLUME_STORAGE_KEY, DEFAULT_MUSIC_VOLUME);
    this.musicEnabled = this.musicVolume > 0;
    this.music = null;
    this.letterAudioClips = null;
    this.voicesReady = false;
  }

  async unlock() {
    if (this.context?.state === "suspended") {
      await this.context.resume();
    }

    if (this.unlocked) {
      return;
    }

    this.context = new AudioContext();
    this.masterGain = this.context.createGain();
    this.masterGain.gain.value = this.volume;
    this.masterGain.connect(this.context.destination);

    if (this.context.state === "suspended") {
      await this.context.resume();
    }

    this.unlocked = true;
    this.preloadMusic();
    this.preloadLetterAudio();
    this.prepareSpeechVoices();
  }

  preloadMusic() {
    if (this.music) {
      return;
    }

    this.music = new Audio(MUSIC_PATH);
    this.music.loop = true;
    this.music.preload = "auto";
    this.music.volume = this.musicVolume;
  }

  async playMusic() {
    if (!this.musicEnabled || this.musicVolume <= 0) {
      return;
    }

    await this.ensureRunning();
    this.preloadMusic();

    if (!this.music) {
      return;
    }

    this.music.volume = this.musicVolume;
    void this.music.play().catch(() => {
      // Missing file or autoplay block — game SFX still work.
    });
  }

  pauseMusic() {
    if (this.music && !this.music.paused) {
      this.music.pause();
    }
  }

  stopMusic() {
    if (!this.music) {
      return;
    }

    this.music.pause();
    this.music.currentTime = 0;
  }

  getMusicVolume() {
    return this.musicVolume;
  }

  getSfxVolume() {
    return this.volume;
  }

  setMusicEnabled(enabled) {
    this.musicEnabled = enabled;

    if (!enabled || this.musicVolume <= 0) {
      this.pauseMusic();
      return;
    }

    void this.playMusic();
  }

  setMusicVolume(volume) {
    this.musicVolume = Math.max(0, Math.min(1, volume));
    this.musicEnabled = this.musicVolume > 0;
    localStorage.setItem(MUSIC_VOLUME_STORAGE_KEY, String(this.musicVolume));

    if (this.music) {
      this.music.volume = this.musicVolume;
    }

    if (this.musicVolume <= 0) {
      this.pauseMusic();
    }
  }

  setSfxVolume(volume) {
    this.volume = Math.max(0, Math.min(1, volume));
    this.enabled = this.volume > 0;
    localStorage.setItem(SFX_VOLUME_STORAGE_KEY, String(this.volume));

    if (this.masterGain) {
      this.masterGain.gain.value = this.volume;
    }

    this.applyLetterAudioVolume();
  }

  applyLetterAudioVolume() {
    if (!this.letterAudioClips) {
      return;
    }

    for (const audio of this.letterAudioClips) {
      audio.volume = this.volume;
    }
  }

  prepareSpeechVoices() {
    if (!("speechSynthesis" in window) || this.voicesReady) {
      return;
    }

    const loadVoices = () => {
      if (window.speechSynthesis.getVoices().length > 0) {
        this.voicesReady = true;
      }
    };

    loadVoices();
    window.speechSynthesis.addEventListener("voiceschanged", loadVoices);
  }

  async ensureRunning() {
    if (!this.unlocked) {
      await this.unlock();
    }

    if (this.context?.state === "suspended") {
      await this.context.resume();
    }
  }

  getTypeIndex(enemy) {
    const type = enemy?.userData?.type;
    if (!type) {
      return 0;
    }

    if (Number.isInteger(type.alphabetIndex)) {
      return type.alphabetIndex;
    }

    const byLetter = ENEMY_SETTINGS.types.findIndex(
      (baseType) => baseType.letter === type.letter,
    );

    return byLetter >= 0 ? byLetter : 0;
  }

  getLetterForIndex(typeIndex) {
    return (
      ENEMY_SETTINGS.types[typeIndex]?.letter ??
      KHMER_ALPHABET[typeIndex] ??
      KHMER_ALPHABET[0]
    );
  }

  getSpeakTextForIndex(typeIndex) {
    return (
      KHMER_LETTER_SPEAK_TEXT[typeIndex] ??
      this.getLetterForIndex(typeIndex)
    );
  }

  getLetterAudioPaths(typeIndex) {
    const paths = [];
    const padded = String(typeIndex).padStart(2, "0");
    paths.push(`./assets/audio/khmer/${padded}.mp3`);

    const audioId =
      KHMER_LETTER_AUDIO_IDS[typeIndex] ??
      LEGACY_AUDIO_IDS[typeIndex];

    if (audioId) {
      paths.push(`./assets/audio/khmer/${audioId}.mp3`);
    }

    return paths;
  }

  preloadLetterAudio() {
    if (this.letterAudioClips) {
      return;
    }

    this.letterAudioClips = KHMER_ALPHABET.map((_, typeIndex) => {
      const paths = this.getLetterAudioPaths(typeIndex);
      const audio = new Audio(paths[0]);
      audio.preload = "auto";
      audio.volume = this.volume;

      if (paths[1]) {
        audio.addEventListener("error", () => {
          if (audio.dataset.fallbackApplied === "true") {
            return;
          }

          audio.dataset.fallbackApplied = "true";
          audio.src = paths[1];
          audio.load();
        }, { once: true });
      }

      return audio;
    });
  }

  playLetterVoice(typeIndex) {
    this.preloadLetterAudio();
    this.prepareSpeechVoices();

    const speakText = this.getSpeakTextForIndex(typeIndex);
    const audio = this.letterAudioClips?.[typeIndex];

    if (!audio) {
      this.speakKhmerLetter(speakText);
      return;
    }

    const tryPlay = (clip) => {
      clip.currentTime = 0;
      clip.volume = this.volume;
      return clip.play();
    };

    void tryPlay(audio).catch(() => {
      const fallbackPath = this.getLetterAudioPaths(typeIndex)[1];
      if (fallbackPath && audio.src.indexOf(fallbackPath.replace("./", "")) === -1) {
        audio.src = fallbackPath;
        audio.load();
        void tryPlay(audio).catch(() => this.speakKhmerLetter(speakText));
        return;
      }

      this.speakKhmerLetter(speakText);
    });
  }

  speakKhmerLetter(letter) {
    if (!("speechSynthesis" in window) || !letter) {
      return;
    }

    window.speechSynthesis.cancel();

    const voices = window.speechSynthesis.getVoices();
    const khmerVoice =
      voices.find((voice) => voice.lang.toLowerCase().startsWith("km")) ??
      voices.find((voice) => /khmer|cambodia/i.test(voice.name));

    const utterance = new SpeechSynthesisUtterance(letter);
    utterance.lang = "km-KH";
    utterance.rate = 0.72;
    utterance.pitch = 0.95;
    utterance.volume = this.volume;

    if (khmerVoice) {
      utterance.voice = khmerVoice;
    }

    window.speechSynthesis.speak(utterance);
  }

  setEnabled(enabled) {
    this.enabled = enabled;
  }

  ensureContext() {
    return this.enabled && this.unlocked && this.context && this.masterGain;
  }

  now() {
    return this.context.currentTime;
  }

  playTone({
    frequency,
    duration = 0.12,
    type = "sine",
    gain = 0.22,
    attack = 0.004,
    detune = 0,
    rampTo = null,
  }) {
    if (!this.ensureContext()) {
      return;
    }

    const start = this.now();
    const end = start + duration;
    const oscillator = this.context.createOscillator();
    const envelope = this.context.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    oscillator.detune.setValueAtTime(detune, start);

    if (rampTo) {
      oscillator.frequency.exponentialRampToValueAtTime(Math.max(rampTo, 1), start + duration * 0.85);
    }

    envelope.gain.setValueAtTime(0.0001, start);
    envelope.gain.linearRampToValueAtTime(gain * this.volume, start + attack);
    envelope.gain.exponentialRampToValueAtTime(0.0001, end);

    oscillator.connect(envelope);
    envelope.connect(this.masterGain);
    oscillator.start(start);
    oscillator.stop(end + 0.02);
  }

  playNoise({
    duration = 0.08,
    gain = 0.18,
    filterFrequency = 900,
    filterQ = 0.6,
    attack = 0.002,
  }) {
    if (!this.ensureContext()) {
      return;
    }

    const start = this.now();
    const end = start + duration;
    const bufferSize = Math.max(1, Math.floor(this.context.sampleRate * duration));
    const buffer = this.context.createBuffer(1, bufferSize, this.context.sampleRate);
    const data = buffer.getChannelData(0);

    for (let index = 0; index < bufferSize; index += 1) {
      data[index] = Math.random() * 2 - 1;
    }

    const source = this.context.createBufferSource();
    source.buffer = buffer;

    const filter = this.context.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(filterFrequency, start);
    filter.Q.setValueAtTime(filterQ, start);

    const envelope = this.context.createGain();
    envelope.gain.setValueAtTime(0.0001, start);
    envelope.gain.linearRampToValueAtTime(gain * this.volume, start + attack);
    envelope.gain.exponentialRampToValueAtTime(0.0001, end);

    source.connect(filter);
    filter.connect(envelope);
    envelope.connect(this.masterGain);
    source.start(start);
    source.stop(end + 0.02);
  }

  playImpact(strength = 1, tone = 130) {
    this.playTone({
      frequency: tone * strength,
      duration: 0.11,
      type: "triangle",
      gain: 0.24 * strength,
      rampTo: tone * 0.35,
    });
    this.playNoise({
      duration: 0.05 * strength + 0.03,
      gain: 0.14 * strength,
      filterFrequency: 700 + tone * 2,
    });
  }

  playEnemyDeath(enemy) {
    if (!this.enabled || !enemy) {
      return;
    }

    const typeIndex = this.getTypeIndex(enemy);
    this.playLetterVoice(typeIndex);
  }

  playHitImpact(hitType = "melee") {
    if (hitType === "dash") {
      this.playDashImpact();
    } else if (hitType === "explosion") {
      this.playExplosionImpact(0.75);
    } else if (hitType === "jumpAttack") {
      this.playImpact(1.15, 150);
    } else {
      this.playImpact(0.95, 135);
    }
  }

  playDashStart() {
    if (!this.ensureContext()) {
      return;
    }

    const start = this.now();
    const oscillator = this.context.createOscillator();
    const filter = this.context.createBiquadFilter();
    const envelope = this.context.createGain();

    oscillator.type = "sawtooth";
    oscillator.frequency.setValueAtTime(280, start);
    oscillator.frequency.exponentialRampToValueAtTime(90, start + 0.22);

    filter.type = "lowpass";
    filter.frequency.setValueAtTime(1400, start);
    filter.frequency.exponentialRampToValueAtTime(220, start + 0.22);

    envelope.gain.setValueAtTime(0.0001, start);
    envelope.gain.linearRampToValueAtTime(0.16 * this.volume, start + 0.015);
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + 0.24);

    oscillator.connect(filter);
    filter.connect(envelope);
    envelope.connect(this.masterGain);
    oscillator.start(start);
    oscillator.stop(start + 0.26);

    this.playNoise({
      duration: 0.18,
      gain: 0.1,
      filterFrequency: 500,
      filterQ: 0.4,
    });
  }

  playDashImpact() {
    this.playImpact(1.35, 95);
    this.playTone({
      frequency: 420,
      duration: 0.07,
      type: "square",
      gain: 0.06,
      rampTo: 180,
    });
    this.playNoise({
      duration: 0.12,
      gain: 0.2,
      filterFrequency: 1100,
    });
  }

  playExplosion() {
    if (!this.ensureContext()) {
      return;
    }

    const start = this.now();
    const oscillator = this.context.createOscillator();
    const envelope = this.context.createGain();

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(110, start);
    oscillator.frequency.exponentialRampToValueAtTime(28, start + 0.45);

    envelope.gain.setValueAtTime(0.0001, start);
    envelope.gain.linearRampToValueAtTime(0.42 * this.volume, start + 0.02);
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + 0.5);

    oscillator.connect(envelope);
    envelope.connect(this.masterGain);
    oscillator.start(start);
    oscillator.stop(start + 0.52);

    this.playNoise({
      duration: 0.35,
      gain: 0.28,
      filterFrequency: 320,
      filterQ: 0.35,
    });
    this.playTone({
      frequency: 640,
      duration: 0.08,
      type: "triangle",
      gain: 0.1,
      rampTo: 220,
    });
  }

  playExplosionImpact(strength = 1) {
    this.playImpact(0.85 * strength, 80);
    this.playNoise({
      duration: 0.1,
      gain: 0.12 * strength,
      filterFrequency: 450,
    });
  }

  playPlayerHurt() {
    this.playTone({
      frequency: 180,
      duration: 0.18,
      type: "sawtooth",
      gain: 0.14,
      rampTo: 90,
    });
    this.playNoise({
      duration: 0.09,
      gain: 0.1,
      filterFrequency: 600,
    });
  }

  playAttackSwing() {
    this.playNoise({
      duration: 0.05,
      gain: 0.06,
      filterFrequency: 1800,
      filterQ: 1.2,
    });
  }

  getKnownLetters() {
    return ENEMY_SETTINGS.types.map((type) => type.letter);
  }
}
