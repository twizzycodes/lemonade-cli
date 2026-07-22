/**
 * Lemonade citrus theme.
 *
 * Terminals can't reliably set a true background color for the whole screen, so
 * the palette leans on warm orange/yellow foreground tones that read well on a
 * light terminal and stay legible on a dark one. Colors are plain hex strings so
 * they can be handed to Ink's `color`/`borderColor` props or to chalk.hex().
 */
export const palette = {
    /** Primary brand accent — borders, headers, logo, primary actions. */
    orange: '#F97316',
    orangeBright: '#FB923C',
    /** Secondary accent — highlights, selected states, streaming cursor. */
    yellow: '#FACC15',
    yellowBright: '#FDE047',
    /** Success is kept green so it never blends into the brand color. */
    success: '#4ADE80',
    error: '#F87171',
    /** Warm gray for muted/secondary text. */
    muted: '#A8A29E',
    text: '#F5F5F4',
    cream: '#FFFBEB',
};
export const theme = {
    primary: palette.orange,
    primaryBright: palette.orangeBright,
    secondary: palette.yellow,
    secondaryBright: palette.yellowBright,
    success: palette.success,
    error: palette.error,
    muted: palette.muted,
    text: palette.text,
    /** Border colors for the two-panel dashed layout. */
    borderPrimary: palette.orange,
    borderSecondary: palette.yellow,
};
//# sourceMappingURL=theme.js.map