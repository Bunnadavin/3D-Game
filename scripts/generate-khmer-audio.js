import { copyFileSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { EdgeTTS, VoicesManager } from "edge-tts-universal";
import {
  KHMER_ALPHABET,
  KHMER_LETTER_AUDIO_IDS,
  KHMER_LETTER_SPEAK_TEXT,
} from "../src/utils/khmerAlphabet.js";

const OUTPUT_DIR = join("assets", "audio", "khmer");

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function synthesizeToFile(speakText, outputPath, voice, rate, volume, pitch) {
  const tts = new EdgeTTS(speakText, voice, { rate, volume, pitch });
  const result = await tts.synthesize();
  const audioBuffer = Buffer.from(await result.audio.arrayBuffer());

  if (audioBuffer.length < 200) {
    throw new Error(`Audio too short for "${speakText}" (${audioBuffer.length} bytes)`);
  }

  writeFileSync(outputPath, audioBuffer);
}

async function synthesizeWithRetry(speakText, outputPath, voice, rate, volume, pitch, attempts = 4) {
  let lastError = null;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await synthesizeToFile(speakText, outputPath, voice, rate, volume, pitch);
      return;
    } catch (error) {
      lastError = error;
      console.warn(
        `Retry ${attempt}/${attempts} for ${speakText}: ${error.message ?? error}`,
      );
      await sleep(attempt * 800);
    }
  }

  throw lastError;
}

async function main() {
  mkdirSync(OUTPUT_DIR, { recursive: true });

  const voices = await VoicesManager.create();
  const khmerVoices = voices.find({ Language: "km" });
  const preferred =
    khmerVoices.find((voice) => /sreymom/i.test(voice.ShortName ?? voice.Name ?? "")) ??
    khmerVoices.find((voice) => voice.Locale === "km-KH") ??
    khmerVoices[0];

  if (!preferred) {
    throw new Error("No Khmer voice found in Edge TTS.");
  }

  const voiceName = preferred.ShortName ?? preferred.Name;
  console.log(`Using voice: ${preferred.FriendlyName ?? voiceName} (${voiceName})`);

  // Mild slowing keeps bare consonants clear without changing their sound.
  const rate = "-10%";
  const volume = "+20%";
  const pitch = "+0Hz";

  for (let index = 0; index < KHMER_ALPHABET.length; index += 1) {
    const letter = KHMER_ALPHABET[index];
    const speakText = KHMER_LETTER_SPEAK_TEXT[index] ?? letter;
    const audioId = KHMER_LETTER_AUDIO_IDS[index];
    const padded = `${String(index).padStart(2, "0")}.mp3`;
    const outputPath = join(OUTPUT_DIR, padded);

    await synthesizeWithRetry(speakText, outputPath, voiceName, rate, volume, pitch);

    if (audioId) {
      copyFileSync(outputPath, join(OUTPUT_DIR, `${audioId}.mp3`));
    }

    console.log(`Saved ${letter} (${speakText}) -> ${padded}${audioId ? ` / ${audioId}.mp3` : ""}`);
    await sleep(250);
  }

  writeFileSync(
    join(OUTPUT_DIR, "manifest.json"),
    JSON.stringify(
      {
        voice: voiceName,
        rate,
        volume,
        pitch,
        letters: KHMER_ALPHABET.map((letter, index) => ({
          index,
          letter,
          speakText: KHMER_LETTER_SPEAK_TEXT[index] ?? letter,
          file: `${String(index).padStart(2, "0")}.mp3`,
          id: KHMER_LETTER_AUDIO_IDS[index] ?? null,
        })),
      },
      null,
      2,
    ),
  );

  console.log("Khmer letter audio generation complete.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
