import React, { useEffect, useState } from 'react';
import { Box, Text } from 'ink';
import { userInfo } from 'node:os';
import { SetupScreen } from './SetupScreen.js';
import { Repl } from './Repl.js';
import { theme } from '../theme.js';
import {
  loadConfig,
  isConfigured,
  resolveApiKey,
  resolveBaseUrl,
  type LemonadeConfig,
} from '../config/config.js';
import { OpenRouterClient } from '../openrouter/client.js';

export interface AppProps {
  version: string;
  cwd: string;
  autoApprove: boolean;
  dangerouslySkip: boolean;
  animations: boolean;
}

/** Top-level router: first-run setup gate, then the main REPL. */
export function App(props: AppProps): React.JSX.Element {
  const [config, setConfig] = useState<LemonadeConfig>(() => loadConfig());
  const [ready, setReady] = useState<boolean>(() => isConfigured(config));
  const [keyWarning, setKeyWarning] = useState('');

  // Silently re-validate the saved key in the background on launch.
  useEffect(() => {
    if (!ready) return;
    const key = resolveApiKey(config);
    if (!key) return;
    let cancelled = false;
    const client = new OpenRouterClient({ apiKey: key, baseUrl: resolveBaseUrl(config) });
    client.validateKey().catch(() => {
      if (!cancelled) {
        setKeyWarning('⚠ Your saved API key looks invalid or revoked — run /settings to re-enter it.');
      }
    });
    return () => {
      cancelled = true;
    };
  }, [ready, config]);

  if (!ready) {
    return (
      <SetupScreen
        defaultUsername={safeUsername()}
        onComplete={() => {
          const fresh = loadConfig();
          setConfig(fresh);
          setReady(true);
        }}
      />
    );
  }

  return (
    <Box flexDirection="column">
      {keyWarning ? (
        <Box marginBottom={1}>
          <Text color={theme.error}>{keyWarning}</Text>
        </Box>
      ) : null}
      <Repl
        version={props.version}
        initialConfig={config}
        initialCwd={props.cwd}
        autoApprove={props.autoApprove}
        dangerouslySkip={props.dangerouslySkip}
        animations={props.animations}
        onLogout={() => setReady(false)}
      />
    </Box>
  );
}

function safeUsername(): string {
  try {
    return userInfo().username || 'friend';
  } catch {
    return 'friend';
  }
}
