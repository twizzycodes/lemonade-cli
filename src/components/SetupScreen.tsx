import React, { useState } from 'react';
import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';
import Spinner from 'ink-spinner';
import open from 'open';
import { Logo } from './Logo.js';
import { theme } from '../theme.js';
import { OpenRouterClient } from '../openrouter/client.js';
import { updateConfig, resolveBaseUrl, DEFAULT_MODEL } from '../config/config.js';

interface SetupScreenProps {
  defaultUsername: string;
  onComplete: () => void;
}

type Step = 'username' | 'key' | 'validating' | 'error';

const KEYS_URL = 'https://openrouter.ai/keys';

/**
 * First-run setup. Hard gate before any model use: collect a display name, then
 * an OpenRouter API key, validating the key live before saving.
 */
export function SetupScreen({ defaultUsername, onComplete }: SetupScreenProps): React.JSX.Element {
  const [step, setStep] = useState<Step>('username');
  const [username, setUsername] = useState(defaultUsername);
  const [keyInput, setKeyInput] = useState('');
  const [error, setError] = useState('');
  const [openedBrowser, setOpenedBrowser] = useState(false);

  const submitUsername = (value: string): void => {
    const name = value.trim() || defaultUsername || 'friend';
    setUsername(name);
    setStep('key');
  };

  const submitKey = async (value: string): Promise<void> => {
    const key = value.trim();
    if (!key) {
      // Empty Enter → open the keys page in the browser and wait for a paste.
      try {
        await open(KEYS_URL);
        setOpenedBrowser(true);
      } catch {
        setError(`Couldn't open a browser. Visit ${KEYS_URL} to create a key.`);
      }
      return;
    }
    setStep('validating');
    setError('');
    try {
      const client = new OpenRouterClient({ apiKey: key, baseUrl: resolveBaseUrl({}) });
      const info = await client.validateKey();
      updateConfig({ username, apiKey: key, model: DEFAULT_MODEL });
      // Brief success flash handled by parent transition.
      void info;
      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setKeyInput('');
      setStep('error');
    }
  };

  return (
    <Box flexDirection="column" paddingX={1} paddingY={1}>
      <Box marginBottom={1} flexDirection="row" gap={2} alignItems="center">
        <Logo />
        <Box flexDirection="column">
          <Text color={theme.primaryBright} bold>
            Welcome to Lemonade 🍋
          </Text>
          <Text color={theme.muted}>Let's get you set up. This only happens once.</Text>
        </Box>
      </Box>

      {step === 'username' && (
        <Box flexDirection="column">
          <Text color={theme.secondary}>What should Lemonade call you?</Text>
          <Box>
            <Text color={theme.primary}>❯ </Text>
            <TextInput
              value={username}
              onChange={setUsername}
              onSubmit={submitUsername}
              placeholder={defaultUsername}
            />
          </Box>
          <Text color={theme.muted}>Press Enter to accept the suggestion.</Text>
        </Box>
      )}

      {(step === 'key' || step === 'error') && (
        <Box flexDirection="column">
          <Text color={theme.secondary}>
            Lemonade needs an OpenRouter API key to run.
          </Text>
          <Text color={theme.muted}>
            Paste it below, or press Enter on an empty line to open {KEYS_URL}.
          </Text>
          <Box>
            <Text color={theme.primary}>❯ </Text>
            <TextInput
              value={keyInput}
              onChange={setKeyInput}
              onSubmit={(v) => void submitKey(v)}
              placeholder="sk-or-v1-…"
              mask="•"
            />
          </Box>
          {openedBrowser && (
            <Text color={theme.muted}>Opened your browser — paste the key here when ready.</Text>
          )}
          {step === 'error' && (
            <Text color={theme.error}>✗ {error}</Text>
          )}
        </Box>
      )}

      {step === 'validating' && (
        <Box>
          <Text color={theme.secondary}>
            <Spinner type="dots" />
          </Text>
          <Text color={theme.muted}> Verifying your key with OpenRouter…</Text>
        </Box>
      )}
    </Box>
  );
}
