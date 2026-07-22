import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { Box, Text } from 'ink';
import { Panel } from './Panel.js';
import { Logo } from './Logo.js';
import { theme } from '../theme.js';
import { relativeTime } from '../utils/time.js';
import { CHANGELOG } from '../changelog.js';
export function WelcomeScreen(props) {
    const { version, username, model, maskedKey, cwd, activity } = props;
    return (_jsxs(Box, { flexDirection: "row", gap: 1, marginBottom: 1, children: [_jsx(Panel, { title: `Lemonade v${version}`, borderColor: theme.borderPrimary, minHeight: 11, children: _jsxs(Box, { flexDirection: "column", alignItems: "center", children: [_jsxs(Text, { color: theme.primaryBright, bold: true, children: ["Welcome back, ", username, "!"] }), _jsx(Box, { marginY: 1, children: _jsx(Logo, {}) }), _jsx(Text, { color: theme.secondary, children: model }), _jsx(Text, { color: theme.muted, children: maskedKey }), _jsx(Text, { color: theme.muted, children: truncatePath(cwd) })] }) }), _jsxs(Box, { flexDirection: "column", gap: 1, children: [_jsxs(Panel, { title: "Recent activity", borderColor: theme.borderSecondary, children: [activity.length === 0 ? (_jsx(Text, { color: theme.muted, children: "Fresh session \u2014 no activity yet." })) : (activity.map((a, i) => (_jsxs(Text, { children: [_jsx(Text, { color: theme.secondary, children: relativeTime(a.at).padEnd(9) }), _jsx(Text, { color: theme.text, children: a.summary })] }, i)))), _jsx(Text, { color: theme.muted, children: "\u2026 /history for more" })] }), _jsxs(Panel, { title: "What's new", borderColor: theme.borderPrimary, children: [CHANGELOG.slice(0, 4).map((c, i) => (_jsx(Text, { color: theme.text, children: c }, i))), _jsx(Text, { color: theme.muted, children: "\u2026 /help for more" })] })] })] }));
}
function truncatePath(p, max = 34) {
    if (p.length <= max)
        return p;
    return '…' + p.slice(p.length - max + 1);
}
//# sourceMappingURL=WelcomeScreen.js.map