import axios from 'axios';

import { createLogger } from './logger';

const logger = createLogger(process.env.SERVICE_NAME ?? 'aura-assist');

export async function transcribeAudio(
  audioBase64: string
): Promise<{ transcript: string; language: string }> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return {
      transcript: '[Mock transcript] Voice input received and converted to text.',
      language: 'en',
    };
  }

  try {
    const audioBuffer = Buffer.from(audioBase64, 'base64');
    const formData = new FormData();
    formData.append('file', new Blob([audioBuffer], { type: 'audio/mpeg' }), 'audio.mp3');

    const response = await axios.post('https://api.elevenlabs.io/v1/speech-to-text', formData, {
      headers: {
        'xi-api-key': apiKey,
      },
      timeout: 10000,
    });

    const transcript =
      typeof response.data?.text === 'string' ? response.data.text.trim() : '';

    if (!transcript) {
      throw new Error('Transcription returned empty text');
    }

    return {
      transcript,
      language: typeof response.data?.language_code === 'string' ? response.data.language_code : 'en',
    };
  } catch (error) {
    logger.error('ElevenLabs STT error', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw new Error('Voice transcription failed');
  }
}

export async function generateSpeech(text: string): Promise<Buffer | null> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return null;
  }

  try {
    const voiceId = process.env.ELEVENLABS_VOICE_ID ?? '21m00Tcm4TlvDq8ikWAM';

    const response = await axios.post(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        text,
        model_id: 'eleven_monolingual_v1',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.5,
        },
      },
      {
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json',
        },
        responseType: 'arraybuffer',
        timeout: 10000,
      }
    );

    return Buffer.from(response.data);
  } catch (error) {
    logger.error('ElevenLabs TTS error', {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}
