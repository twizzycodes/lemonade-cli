import React from 'react';
import { Box, Text } from 'ink';

interface PanelProps {
  title?: string;
  borderColor?: string;
  children: React.ReactNode;
  width?: number;
  minHeight?: number;
}

/**
 * A dashed-border panel with an optional title, mirroring the boxed panels on
 * the Claude Code welcome screen.
 */
export function Panel({
  title,
  borderColor,
  children,
  width,
  minHeight,
}: PanelProps): React.JSX.Element {
  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={borderColor}
      paddingX={1}
      width={width}
      minHeight={minHeight}
    >
      {title ? (
        <Box marginBottom={1}>
          <Text color={borderColor} bold>
            {title}
          </Text>
        </Box>
      ) : null}
      {children}
    </Box>
  );
}
