import React from 'react';
import { Box, Text } from 'ink';
import { palette } from '../theme.js';

/**
 * Pixel-art citrus mark: a round orange/lemon with a little green leaf,
 * rendered in block characters with warm orange/yellow tones.
 */
export function Logo(): React.JSX.Element {
  const o = palette.orange;
  const ob = palette.orangeBright;
  const y = palette.yellowBright;
  const leaf = palette.success;

  return (
    <Box flexDirection="column">
      <Text>
        {'   '}
        <Text color={leaf}>◝◜</Text>
      </Text>
      <Text>
        {'  '}
        <Text color={ob}>▄</Text>
        <Text color={o}>███</Text>
        <Text color={ob}>▄</Text>
      </Text>
      <Text>
        {' '}
        <Text color={o}>█</Text>
        <Text color={y}>█</Text>
        <Text color={ob}>███</Text>
        <Text color={o}>█</Text>
      </Text>
      <Text>
        {' '}
        <Text color={o}>█</Text>
        <Text color={ob}>█████</Text>
        <Text color={o}>█</Text>
      </Text>
      <Text>
        {'  '}
        <Text color={o}>▀</Text>
        <Text color={ob}>███</Text>
        <Text color={o}>▀</Text>
      </Text>
    </Box>
  );
}
