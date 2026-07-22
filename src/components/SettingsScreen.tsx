import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import SelectInput from 'ink-select-input';
import TextInput from 'ink-text-input';
import Spinner from 'ink-spinner';
import { theme } from '../theme.js';
import {
  type LemonadeConfig,
  updateConfig,
  maskKey,
  resolveApiKey,
  resolveModel,
  resolveBaseUrl,
} from '../config/config.js';
import { OpenRouterClient } from '../openrouter/client.js';

interface SettingsScreenProps {
  config: LemonadeConfig;
  onChanged: (config: LemonadeConfig) => void;
  onOpenModelPicker: () => void;
  onLogout: () => void;
  onClose: () => void;
}

type Mode = 'menu' | 'username' | 'key' | 'usage';

export function SettingsScreen(props: SettingsScreenProps): React.JSX.Element {
  const { config, onChanged, onOpenModelPicker, onLogout, onClose } = props;
  const [mode, setMode] = useState<Mode>('menu');
  const [text, setText] = useState('');
  const [notice, setNotice] = useState('');
  const [usage, setUsage] = useState<string>('');
  const [busy, setBusy] = useState(false);

  useInput((_i, key) => {
    if (key.escape) {
      if (mode === 'menu') onClose();
      else setMode('menu');
    }
  });

  const apply = (patch: Partial<LemonadeConfig>, msg: string): void => {
    const next = updateConfig(patch);
    onChanged(next);
    setNotice(msg);
    setMode('menu');
  };

  if (mode === 'username') {
    return (
      <Editor
        label="New display name:"
        value={text}
        onChange={setText}
        onSubmit={(v) => apply({ username: v.trim() || config.username }, 'Username updated.')}
        placeholder={config.username}
      />
    );
  }

  if (mode === 'key') {
    return (
      <Box flexDirection="column">
        <Text color={theme.secondary}>Paste a new OpenRouter API key (Esc to cancel):</Text>
        <Box>
          <Text color={theme.primary}>❯ </Text>
          <TextInput
            value={text}
            onChange={setText}
            mask="•"
            onSubmit={(v) => {
              const key = v.trim();
              if (!key) return;
              setBusy(true);
              const client = new OpenRouterClient({ apiKey: key, baseUrl: resolveBaseUrl(config) });
              client
                .validateKey()
                .then(() => apply({ apiKey: key }, '✓ Key validated and saved.'))
                .catch((e) => {
                  setNotice(`✗ ${e instanceof Error ? e.message : String(e)}`);
                  setBusy(false);
                  setText('');
                });
            }}
          />
        </Box>
        {busy && (
          <Text color={theme.muted}>
            <Spinner type="dots" /> Validating…
          </Text>
        )}
        {notice && <Text color={theme.error}>{notice}</Text>}
      </Box>
    );
  }

  if (mode === 'usage') {
    return (
      <Box flexDirection="column">
        <Text color={theme.primary} bold>
          OpenRouter usage
        </Text>
        <Text color={theme.text}>{usage || 'Loading…'}</Text>
        <Text color={theme.muted}>Press Esc to go back.</Text>
      </Box>
    );
  }

  const items = [
    { label: `Change username (current: ${config.username ?? '—'})`, value: 'username' },
    { label: `Re-enter API key (current: ${maskKey(resolveApiKey(config))})`, value: 'key' },
    { label: `Default model (current: ${resolveModel(config)})`, value: 'model' },
    {
      label: `Auto-approve tool calls: ${config.autoApprove ? 'ON' : 'off'}`,
      value: 'autoApprove',
    },
    { label: `Animations: ${config.animations === false ? 'off' : 'ON'}`, value: 'animations' },
    { label: 'View OpenRouter usage / credits', value: 'usage' },
    { label: 'Log out (clear API key)', value: 'logout' },
    { label: 'Close settings', value: 'close' },
  ];

  const onSelect = (item: { value: string }): void => {
    setNotice('');
    switch (item.value) {
      case 'username':
        setText(config.username ?? '');
        setMode('username');
        break;
      case 'key':
        setText('');
        setMode('key');
        break;
      case 'model':
        onOpenModelPicker();
        break;
      case 'autoApprove':
        apply({ autoApprove: !config.autoApprove }, `Auto-approve ${!config.autoApprove ? 'enabled' : 'disabled'}.`);
        break;
      case 'animations':
        apply(
          { animations: config.animations === false ? true : false },
          `Animations ${config.animations === false ? 'enabled' : 'disabled'}.`,
        );
        break;
      case 'usage':
        setMode('usage');
        void loadUsage(config, setUsage);
        break;
      case 'logout':
        onLogout();
        break;
      case 'close':
        onClose();
        break;
    }
  };

  return (
    <Box flexDirection="column">
      <Text color={theme.primary} bold>
        Settings <Text color={theme.muted}>(Esc to close)</Text>
      </Text>
      {notice && <Text color={theme.success}>{notice}</Text>}
      <Box marginTop={1}>
        <SelectInput items={items} onSelect={onSelect} />
      </Box>
    </Box>
  );
}

function Editor(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onSubmit: (v: string) => void;
  placeholder?: string;
}): React.JSX.Element {
  return (
    <Box flexDirection="column">
      <Text color={theme.secondary}>{props.label} <Text color={theme.muted}>(Esc to cancel)</Text></Text>
      <Box>
        <Text color={theme.primary}>❯ </Text>
        <TextInput
          value={props.value}
          onChange={props.onChange}
          onSubmit={props.onSubmit}
          placeholder={props.placeholder}
        />
      </Box>
    </Box>
  );
}

async function loadUsage(
  config: LemonadeConfig,
  setUsage: (s: string) => void,
): Promise<void> {
  const key = resolveApiKey(config);
  if (!key) {
    setUsage('No API key configured.');
    return;
  }
  try {
    const client = new OpenRouterClient({ apiKey: key, baseUrl: resolveBaseUrl(config) });
    const info = await client.validateKey();
    const used = info.usage ?? 0;
    const limit = info.limit;
    const limitText = limit === null || limit === undefined ? 'unlimited' : `$${limit.toFixed(2)}`;
    setUsage(
      `Label: ${info.label ?? '—'}\nUsed: $${used.toFixed(2)}\nLimit: ${limitText}` +
        (info.isFreeTier ? '\nTier: free' : ''),
    );
  } catch (e) {
    setUsage(`Could not load usage: ${e instanceof Error ? e.message : String(e)}`);
  }
}
