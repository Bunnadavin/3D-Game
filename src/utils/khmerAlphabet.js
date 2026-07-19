// File ids for optional pre-generated mp3 clips (index matches KHMER_ALPHABET).
export const KHMER_LETTER_AUDIO_IDS = [
  "ka", "kha", "ko", "kho", "ngo",
  "cha", "chha", "cho", "chho", "nyo",
  "da", "tha", "do", "dha", "no",
  "ta", "thha", "to", "tho", "no2",
  "ba", "pha", "po", "pho", "mo",
  "yo", "ro", "lo", "vo", "sa",
  "ha", "la", "a",
];

// Spoken TTS text (bare consonants — vowel forms like កា sound wrong on Edge TTS).
export const KHMER_LETTER_SPEAK_TEXT = [
  "ក", "ខ", "គ", "ឃ", "ង",
  "ច", "ឆ", "ជ", "ឈ", "ញ",
  "ដ", "ឋ", "ឌ", "ឍ", "ណ",
  "ត", "ថ", "ទ", "ធ", "ន",
  "ប", "ផ", "ព", "ភ", "ម",
  "យ", "រ", "ល", "វ", "ស",
  "ហ", "ឡ", "អ",
];

// Khmer consonants in traditional alphabetical order.
export const KHMER_ALPHABET = [
  "ក", "ខ", "គ", "ឃ", "ង",
  "ច", "ឆ", "ជ", "ឈ", "ញ",
  "ដ", "ឋ", "ឌ", "ឍ", "ណ",
  "ត", "ថ", "ទ", "ធ", "ន",
  "ប", "ផ", "ព", "ភ", "ម",
  "យ", "រ", "ល", "វ", "ស",
  "ហ", "ឡ", "អ",
];

export function getAlphabetRank(alphabetIndex, alphabetLength = KHMER_ALPHABET.length) {
  if (alphabetLength <= 1) {
    return 0;
  }

  return alphabetIndex / (alphabetLength - 1);
}

export function hslToHex(h, s, l) {
  const chroma = (1 - Math.abs(2 * l - 1)) * s;
  const hueSegment = h / 60;
  const secondary = chroma * (1 - Math.abs((hueSegment % 2) - 1));
  let red = 0;
  let green = 0;
  let blue = 0;

  if (hueSegment >= 0 && hueSegment < 1) {
    red = chroma;
    green = secondary;
  } else if (hueSegment < 2) {
    red = secondary;
    green = chroma;
  } else if (hueSegment < 3) {
    green = chroma;
    blue = secondary;
  } else if (hueSegment < 4) {
    green = secondary;
    blue = chroma;
  } else if (hueSegment < 5) {
    red = secondary;
    blue = chroma;
  } else {
    red = chroma;
    blue = secondary;
  }

  const match = l - chroma / 2;
  const toByte = (channel) => Math.round((channel + match) * 255);

  return (toByte(red) << 16) + (toByte(green) << 8) + toByte(blue);
}

export function getEnemyPalette(alphabetIndex, alphabetLength) {
  const hue = (alphabetIndex / Math.max(alphabetLength, 1)) * 330;
  const bodyColor = hslToHex(hue, 0.62, 0.42);
  const headColor = hslToHex(hue, 0.68, 0.28);
  const limbColor = hslToHex(hue, 0.58, 0.34);

  return { bodyColor, headColor, limbColor };
}
