import React from 'react';
import { Box, Text, useInput } from 'ink';
import { theme } from '../theme.js';
import type { ConfirmRequest } from '../agent/tools.js';

interface ConfirmPromptProps {
  request: ConfirmRequest;
  onAnswer: (approved: boolean) => void;
}

/** Blocking y/n confirmation shown before a risky tool call runs. */
export function ConfirmPrompt({ request, onAnswer }: ConfirmPromptProps): React.JSX.Element {
  useInput((input, key) => {
    if (input.toLowerCase() === 'y') onAnswer(true);
    else if (input.toLowerCase() === 'n' || key.escape) onAnswer(false);
  });

  const accent = request.risk === 'destructive' ? theme.error : theme.secondary;

  return (
    <Box flexDirection="column" borderStyle="round" borderColor={accent} paddingX={1}>
      <Text color={accent} bold>
        {request.title}
      </Text>
      <Box flexDirection="column" marginY={1}>
        {request.detail.split('\n').slice(0, 16).map((line, i) => (
          <Text key={i} color={lineColor(line)}>
            {line}
          </Text>
        ))}
      </Box>
      <Text color={theme.muted}>
        Proceed? <Text color={theme.primary}>y</Text>/<Text color={theme.primary}>n</Text>
        {request.risk === 'destructive' ? '  (this looks destructive — review carefully)' : ''}
      </Text>
    </Box>
  );
}

function lineColor(line: string): string {
  if (line.startsWith('+')) return theme.success;
  if (line.startsWith('-')) return theme.error;
  return theme.text;
}
