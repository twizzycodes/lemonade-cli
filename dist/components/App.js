import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { Box, Text } from 'ink';
import { userInfo } from 'node:os';
import { SetupScreen } from './SetupScreen.js';
import { Repl } from './Repl.js';
import { theme } from '../theme.js';
import { loadConfig, isConfigured, resolveApiKey, resolveBaseUrl, } from '../config/config.js';
import { OpenRouterClient } from '../openrouter/client.js';
/** Top-level router: first-run setup gate, then the main REPL. */
export function App(props) {
    const [config, setConfig] = useState(() => loadConfig());
    const [ready, setReady] = useState(() => isConfigured(config));
    const [keyWarning, setKeyWarning] = useState('');
    // Silently re-validate the saved key in the background on launch.
    useEffect(() => {
        if (!ready)
            return;
        const key = resolveApiKey(config);
        if (!key)
            return;
        let cancelled = false;
        const client = new OpenRouterClient({ apiKey: key, baseUrl: resolveBaseUrl(config) });
        client.validateKey().catch(() => {
            if (!cancelled) {
                setKeyWarning('⚠ Your saved API key looks invalid or revoked — run /settings to re-enter it.');
            }
        });
        return () => {
            cancelled = true;
        };
    }, [ready, config]);
    if (!ready) {
        return (_jsx(SetupScreen, { defaultUsername: safeUsername(), onComplete: () => {
                const fresh = loadConfig();
                setConfig(fresh);
                setReady(true);
            } }));
    }
    return (_jsxs(Box, { flexDirection: "column", children: [keyWarning ? (_jsx(Box, { marginBottom: 1, children: _jsx(Text, { color: theme.error, children: keyWarning }) })) : null, _jsx(Repl, { version: props.version, initialConfig: config, initialCwd: props.cwd, autoApprove: props.autoApprove, dangerouslySkip: props.dangerouslySkip, animations: props.animations, onLogout: () => setReady(false) })] }));
}
function safeUsername() {
    try {
        return userInfo().username || 'friend';
    }
    catch {
        return 'friend';
    }
}
//# sourceMappingURL=App.js.map