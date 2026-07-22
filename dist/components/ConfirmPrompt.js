import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Box, Text, useInput } from 'ink';
import { theme } from '../theme.js';
/** Blocking y/n confirmation shown before a risky tool call runs. */
export function ConfirmPrompt({ request, onAnswer }) {
    useInput((input, key) => {
        if (input.toLowerCase() === 'y')
            onAnswer(true);
        else if (input.toLowerCase() === 'n' || key.escape)
            onAnswer(false);
    });
    const accent = request.risk === 'destructive' ? theme.error : theme.secondary;
    return (_jsxs(Box, { flexDirection: "column", borderStyle: "round", borderColor: accent, paddingX: 1, children: [_jsx(Text, { color: accent, bold: true, children: request.title }), _jsx(Box, { flexDirection: "column", marginY: 1, children: request.detail.split('\n').slice(0, 16).map((line, i) => (_jsx(Text, { color: lineColor(line), children: line }, i))) }), _jsxs(Text, { color: theme.muted, children: ["Proceed? ", _jsx(Text, { color: theme.primary, children: "y" }), "/", _jsx(Text, { color: theme.primary, children: "n" }), request.risk === 'destructive' ? '  (this looks destructive — review carefully)' : ''] })] }));
}
function lineColor(line) {
    if (line.startsWith('+'))
        return theme.success;
    if (line.startsWith('-'))
        return theme.error;
    return theme.text;
}
//# sourceMappingURL=ConfirmPrompt.js.map