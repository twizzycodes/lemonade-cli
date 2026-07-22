import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render } from 'ink-testing-library';
import { SetupScreen } from '../src/components/SetupScreen.js';
import { WelcomeScreen } from '../src/components/WelcomeScreen.js';

afterEach(() => {
  // Give Ink a tick to flush any pending timers between tests.
});

describe('SetupScreen', () => {
  it('mounts and shows the username prompt', () => {
    const { lastFrame, unmount } = render(
      <SetupScreen defaultUsername="meaghan" onComplete={() => {}} />,
    );
    const frame = lastFrame() ?? '';
    expect(frame).toContain('Welcome to Lemonade');
    expect(frame).toContain('What should Lemonade call you?');
    expect(frame).toContain('meaghan');
    unmount();
  });
});

describe('WelcomeScreen', () => {
  it('renders the two-panel layout with identity + activity', () => {
    const { lastFrame, unmount } = render(
      <WelcomeScreen
        version="0.1.0"
        username="bill"
        model="openai/gpt-4o-mini"
        maskedKey="sk-or-...ab12"
        cwd="/home/bill/project"
        activity={[{ at: Date.now() - 120000, summary: 'Built landing page' }]}
      />,
    );
    const frame = lastFrame() ?? '';
    expect(frame).toContain('Lemonade v0.1.0');
    expect(frame).toContain('Welcome back, bill!');
    expect(frame).toContain('openai/gpt-4o-mini');
    expect(frame).toContain('sk-or-...ab12');
    expect(frame).toContain('Recent activity');
    expect(frame).toContain('Built landing page');
    expect(frame).toContain("What's new");
    unmount();
  });
});
