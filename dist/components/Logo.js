import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Box, Text } from 'ink';
import { palette } from '../theme.js';
/**
 * Pixel-art citrus mark: a round orange/lemon with a little green leaf,
 * rendered in block characters with warm orange/yellow tones.
 */
export function Logo() {
    const o = palette.orange;
    const ob = palette.orangeBright;
    const y = palette.yellowBright;
    const leaf = palette.success;
    return (_jsxs(Box, { flexDirection: "column", children: [_jsxs(Text, { children: ['   ', _jsx(Text, { color: leaf, children: "\u25DD\u25DC" })] }), _jsxs(Text, { children: ['  ', _jsx(Text, { color: ob, children: "\u2584" }), _jsx(Text, { color: o, children: "\u2588\u2588\u2588" }), _jsx(Text, { color: ob, children: "\u2584" })] }), _jsxs(Text, { children: [' ', _jsx(Text, { color: o, children: "\u2588" }), _jsx(Text, { color: y, children: "\u2588" }), _jsx(Text, { color: ob, children: "\u2588\u2588\u2588" }), _jsx(Text, { color: o, children: "\u2588" })] }), _jsxs(Text, { children: [' ', _jsx(Text, { color: o, children: "\u2588" }), _jsx(Text, { color: ob, children: "\u2588\u2588\u2588\u2588\u2588" }), _jsx(Text, { color: o, children: "\u2588" })] }), _jsxs(Text, { children: ['  ', _jsx(Text, { color: o, children: "\u2580" }), _jsx(Text, { color: ob, children: "\u2588\u2588\u2588" }), _jsx(Text, { color: o, children: "\u2580" })] })] }));
}
//# sourceMappingURL=Logo.js.map