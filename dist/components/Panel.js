import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Box, Text } from 'ink';
/**
 * A dashed-border panel with an optional title, mirroring the boxed panels on
 * the Claude Code welcome screen.
 */
export function Panel({ title, borderColor, children, width, minHeight, }) {
    return (_jsxs(Box, { flexDirection: "column", borderStyle: "round", borderColor: borderColor, paddingX: 1, width: width, minHeight: minHeight, children: [title ? (_jsx(Box, { marginBottom: 1, children: _jsx(Text, { color: borderColor, bold: true, children: title }) })) : null, children] }));
}
//# sourceMappingURL=Panel.js.map