import React from 'react';
import { Box, Text } from 'ink';
import { Panel } from './Panel.js';
import { Logo } from './Logo.js';
import { theme } from '../theme.js';
import { relativeTime } from '../utils/time.js';
import type { ActivityEntry } from '../session/log.js';
import { CHANGELOG } from '../changelog.js';

interface WelcomeScreenProps {
  version: string;
  username: string;
  model: string;
  maskedKey: string;
  cwd: string;
  activity: ActivityEntry[];
}

export function WelcomeScreen(props: WelcomeScreenProps): React.JSX.Element {
  const { version, username, model, maskedKey, cwd, activity } = props;

  return (
    <Box flexDirection="row" gap={1} marginBottom={1}>
      {/* Left: identity panel */}
      <Panel title={`Lemonade v${version}`} borderColor={theme.borderPrimary} minHeight={11}>
        <Box flexDirection="column" alignItems="center">
          <Text color={theme.primaryBright} bold>
            Welcome back, {username}!
          </Text>
          <Box marginY={1}>
            <Logo />
          </Box>
          <Text color={theme.secondary}>{model}</Text>
          <Text color={theme.muted}>{maskedKey}</Text>
          <Text color={theme.muted}>{truncatePath(cwd)}</Text>
        </Box>
      </Panel>

      {/* Right: activity + what's new, stacked */}
      <Box flexDirection="column" gap={1}>
        <Panel title="Recent activity" borderColor={theme.borderSecondary}>
          {activity.length === 0 ? (
            <Text color={theme.muted}>Fresh session — no activity yet.</Text>
          ) : (
            activity.map((a, i) => (
              <Text key={i}>
                <Text color={theme.secondary}>{relativeTime(a.at).padEnd(9)}</Text>
                <Text color={theme.text}>{a.summary}</Text>
              </Text>
            ))
          )}
          <Text color={theme.muted}>… /history for more</Text>
        </Panel>

        <Panel title="What's new" borderColor={theme.borderPrimary}>
          {CHANGELOG.slice(0, 4).map((c, i) => (
            <Text key={i} color={theme.text}>
              {c}
            </Text>
          ))}
          <Text color={theme.muted}>… /help for more</Text>
        </Panel>
      </Box>
    </Box>
  );
}

function truncatePath(p: string, max = 34): string {
  if (p.length <= max) return p;
  return '…' + p.slice(p.length - max + 1);
}
