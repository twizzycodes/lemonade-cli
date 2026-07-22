import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';
import Spinner from 'ink-spinner';
import open from 'open';
import { Logo } from './Logo.js';
import { theme } from '../theme.js';
import { OpenRouterClient } from '../openrouter/client.js';
import { updateConfig, resolveBaseUrl, DEFAULT_MODEL } from '../config/config.js';
const KEYS_URL = 'https://openrouter.ai/keys';
/**
 * First-run setup. Hard gate before any model use: collect a display name, then
 * an OpenRouter API key, validating the key live before saving.
 */
export function SetupScreen({ defaultUsername, onComplete }) {
    const [step, setStep] = useState('username');
    const [username, setUsername] = useState(defaultUsername);
    const [keyInput, setKeyInput] = useState('');
    const [error, setError] = useState('');
    const [openedBrowser, setOpenedBrowser] = useState(false);
    const submitUsername = (value) => {
        const name = value.trim() || defaultUsername || 'friend';
        setUsername(name);
        setStep('key');
    };
    const submitKey = async (value) => {
        const key = value.trim();
        if (!key) {
            // Empty Enter → open the keys page in the browser and wait for a paste.
            try {
                await open(KEYS_URL);
                setOpenedBrowser(true);
            }
            catch {
                setError(`Couldn't open a browser. Visit ${KEYS_URL} to create a key.`);
            }
            return;
        }
        setStep('validating');
        setError('');
        try {
            const client = new OpenRouterClient({ apiKey: key, baseUrl: resolveBaseUrl({}) });
            const info = await client.validateKey();
            updateConfig({ username, apiKey: key, model: DEFAULT_MODEL });
            // Brief success flash handled by parent transition.
            void info;
            onComplete();
        }
        catch (err) {
            setError(err instanceof Error ? err.message : String(err));
            setKeyInput('');
            setStep('error');
        }
    };
    return (_jsxs(Box, { flexDirection: "column", paddingX: 1, paddingY: 1, children: [_jsxs(Box, { marginBottom: 1, flexDirection: "row", gap: 2, alignItems: "center", children: [_jsx(Logo, {}), _jsxs(Box, { flexDirection: "column", children: [_jsx(Text, { color: theme.primaryBright, bold: true, children: "Welcome to Lemonade \uD83C\uDF4B" }), _jsx(Text, { color: theme.muted, children: "Let's get you set up. This only happens once." })] })] }), step === 'username' && (_jsxs(Box, { flexDirection: "column", children: [_jsx(Text, { color: theme.secondary, children: "What should Lemonade call you?" }), _jsxs(Box, { children: [_jsx(Text, { color: theme.primary, children: "\u276F " }), _jsx(TextInput, { value: username, onChange: setUsername, onSubmit: submitUsername, placeholder: defaultUsername })] }), _jsx(Text, { color: theme.muted, children: "Press Enter to accept the suggestion." })] })), (step === 'key' || step === 'error') && (_jsxs(Box, { flexDirection: "column", children: [_jsx(Text, { color: theme.secondary, children: "Lemonade needs an OpenRouter API key to run." }), _jsxs(Text, { color: theme.muted, children: ["Paste it below, or press Enter on an empty line to open ", KEYS_URL, "."] }), _jsxs(Box, { children: [_jsx(Text, { color: theme.primary, children: "\u276F " }), _jsx(TextInput, { value: keyInput, onChange: setKeyInput, onSubmit: (v) => void submitKey(v), placeholder: "sk-or-v1-\u2026", mask: "\u2022" })] }), openedBrowser && (_jsx(Text, { color: theme.muted, children: "Opened your browser \u2014 paste the key here when ready." })), step === 'error' && (_jsxs(Text, { color: theme.error, children: ["\u2717 ", error] }))] })), step === 'validating' && (_jsxs(Box, { children: [_jsx(Text, { color: theme.secondary, children: _jsx(Spinner, { type: "dots" }) }), _jsx(Text, { color: theme.muted, children: " Verifying your key with OpenRouter\u2026" })] }))] }));
}
//# sourceMappingURL=SetupScreen.js.map