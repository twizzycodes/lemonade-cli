import React, { useEffect, useState } from 'react';
import { Box, Text, useInput } from 'ink';
import SelectInput from 'ink-select-input';
import TextInput from 'ink-text-input';
import Spinner from 'ink-spinner';
import { theme } from '../theme.js';
import { OpenRouterClient, type ModelInfo } from '../openrouter/client.js';

interface ModelPickerProps {
  client: OpenRouterClient;
  currentModel: string;
  onSelect: (modelId: string) => void;
  onCancel: () => void;
}

interface Item {
  label: string;
  value: string;
}

export function ModelPicker({ client, currentModel, onSelect, onCancel }: ModelPickerProps): React.JSX.Element {
  const [models, setModels] = useState<ModelInfo[] | null>(null);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('');

  useEffect(() => {
    let cancelled = false;
    client
      .listModels()
      .then((m) => !cancelled && setModels(m))
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : String(e)));
    return () => {
      cancelled = true;
    };
  }, [client]);

  useInput((_input, key) => {
    if (key.escape) onCancel();
  });

  if (error) {
    return (
      <Box flexDirection="column">
        <Text color={theme.error}>✗ Could not load models: {error}</Text>
        <Text color={theme.muted}>Press Esc to go back.</Text>
      </Box>
    );
  }

  if (!models) {
    return (
      <Box>
        <Text color={theme.secondary}>
          <Spinner type="dots" />
        </Text>
        <Text color={theme.muted}> Fetching models from OpenRouter…</Text>
      </Box>
    );
  }

  const needle = filter.toLowerCase();
  const filtered = models.filter((m) => m.id.toLowerCase().includes(needle));
  const items: Item[] = filtered.slice(0, 200).map((m) => ({
    label: formatModelLabel(m, m.id === currentModel),
    value: m.id,
  }));

  return (
    <Box flexDirection="column">
      <Text color={theme.primary} bold>
        Select a model {' '}
        <Text color={theme.muted}>({filtered.length} shown — type to filter, Esc to cancel)</Text>
      </Text>
      <Box>
        <Text color={theme.primary}>filter ❯ </Text>
        <TextInput value={filter} onChange={setFilter} placeholder="e.g. free, claude, gpt" />
      </Box>
      <Box marginTop={1}>
        {items.length === 0 ? (
          <Text color={theme.muted}>No models match "{filter}".</Text>
        ) : (
          <SelectInput items={items} limit={12} onSelect={(item) => onSelect(item.value)} />
        )}
      </Box>
    </Box>
  );
}

function formatModelLabel(m: ModelInfo, isCurrent: boolean): string {
  const tag = m.isFree ? '[free]' : '[paid]';
  const ctx = m.contextLength ? `${Math.round(m.contextLength / 1000)}k` : '—';
  const price = m.isFree
    ? ''
    : ` $${perMillion(m.promptPrice)}/$${perMillion(m.completionPrice)} per M`;
  const marker = isCurrent ? '● ' : '';
  return `${marker}${m.id.padEnd(38)} ${tag} ${ctx}${price}`;
}

function perMillion(price?: number): string {
  if (!price) return '0';
  return (price * 1_000_000).toFixed(2);
}
