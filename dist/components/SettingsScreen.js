import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import SelectInput from 'ink-select-input';
import TextInput from 'ink-text-input';
import Spinner from 'ink-spinner';
import { theme } from '../theme.js';
import { updateConfig, maskKey, resolveApiKey, resolveModel, resolveBaseUrl, } from '../config/config.js';
import { OpenRouterClient } from '../openrouter/client.js';
export function SettingsScreen(props) {
    const { config, onChanged, onOpenModelPicker, onLogout, onClose } = props;
    const [mode, setMode] = useState('menu');
    const [text, setText] = useState('');
    const [notice, setNotice] = useState('');
    const [usage, setUsage] = useState('');
    const [busy, setBusy] = useState(false);
    useInput((_i, key) => {
        if (key.escape) {
            if (mode === 'menu')
                onClose();
            else
                setMode('menu');
        }
    });
    const apply = (patch, msg) => {
        const next = updateConfig(patch);
        onChanged(next);
        setNotice(msg);
        setMode('menu');
    };
    if (mode === 'username') {
        return (_jsx(Editor, { label: "New display name:", value: text, onChange: setText, onSubmit: (v) => apply({ username: v.trim() || config.username }, 'Username updated.'), placeholder: config.username }));
    }
    if (mode === 'key') {
        return (_jsxs(Box, { flexDirection: "column", children: [_jsx(Text, { color: theme.secondary, children: "Paste a new OpenRouter API key (Esc to cancel):" }), _jsxs(Box, { children: [_jsx(Text, { color: theme.primary, children: "\u276F " }), _jsx(TextInput, { value: text, onChange: setText, mask: "\u2022", onSubmit: (v) => {
                                const key = v.trim();
                                if (!key)
                                    return;
                                setBusy(true);
                                const client = new OpenRouterClient({ apiKey: key, baseUrl: resolveBaseUrl(config) });
                                client
                                    .validateKey()
                                    .then(() => apply({ apiKey: key }, '✓ Key validated and saved.'))
                                    .catch((e) => {
                                    setNotice(`✗ ${e instanceof Error ? e.message : String(e)}`);
                                    setBusy(false);
                                    setText('');
                                });
                            } })] }), busy && (_jsxs(Text, { color: theme.muted, children: [_jsx(Spinner, { type: "dots" }), " Validating\u2026"] })), notice && _jsx(Text, { color: theme.error, children: notice })] }));
    }
    if (mode === 'usage') {
        return (_jsxs(Box, { flexDirection: "column", children: [_jsx(Text, { color: theme.primary, bold: true, children: "OpenRouter usage" }), _jsx(Text, { color: theme.text, children: usage || 'Loading…' }), _jsx(Text, { color: theme.muted, children: "Press Esc to go back." })] }));
    }
    const items = [
        { label: `Change username (current: ${config.username ?? '—'})`, value: 'username' },
        { label: `Re-enter API key (current: ${maskKey(resolveApiKey(config))})`, value: 'key' },
        { label: `Default model (current: ${resolveModel(config)})`, value: 'model' },
        {
            label: `Auto-approve tool calls: ${config.autoApprove ? 'ON' : 'off'}`,
            value: 'autoApprove',
        },
        { label: `Animations: ${config.animations === false ? 'off' : 'ON'}`, value: 'animations' },
        { label: 'View OpenRouter usage / credits', value: 'usage' },
        { label: 'Log out (clear API key)', value: 'logout' },
        { label: 'Close settings', value: 'close' },
    ];
    const onSelect = (item) => {
        setNotice('');
        switch (item.value) {
            case 'username':
                setText(config.username ?? '');
                setMode('username');
                break;
            case 'key':
                setText('');
                setMode('key');
                break;
            case 'model':
                onOpenModelPicker();
                break;
            case 'autoApprove':
                apply({ autoApprove: !config.autoApprove }, `Auto-approve ${!config.autoApprove ? 'enabled' : 'disabled'}.`);
                break;
            case 'animations':
                apply({ animations: config.animations === false ? true : false }, `Animations ${config.animations === false ? 'enabled' : 'disabled'}.`);
                break;
            case 'usage':
                setMode('usage');
                void loadUsage(config, setUsage);
                break;
            case 'logout':
                onLogout();
                break;
            case 'close':
                onClose();
                break;
        }
    };
    return (_jsxs(Box, { flexDirection: "column", children: [_jsxs(Text, { color: theme.primary, bold: true, children: ["Settings ", _jsx(Text, { color: theme.muted, children: "(Esc to close)" })] }), notice && _jsx(Text, { color: theme.success, children: notice }), _jsx(Box, { marginTop: 1, children: _jsx(SelectInput, { items: items, onSelect: onSelect }) })] }));
}
function Editor(props) {
    return (_jsxs(Box, { flexDirection: "column", children: [_jsxs(Text, { color: theme.secondary, children: [props.label, " ", _jsx(Text, { color: theme.muted, children: "(Esc to cancel)" })] }), _jsxs(Box, { children: [_jsx(Text, { color: theme.primary, children: "\u276F " }), _jsx(TextInput, { value: props.value, onChange: props.onChange, onSubmit: props.onSubmit, placeholder: props.placeholder })] })] }));
}
async function loadUsage(config, setUsage) {
    const key = resolveApiKey(config);
    if (!key) {
        setUsage('No API key configured.');
        return;
    }
    try {
        const client = new OpenRouterClient({ apiKey: key, baseUrl: resolveBaseUrl(config) });
        const info = await client.validateKey();
        const used = info.usage ?? 0;
        const limit = info.limit;
        const limitText = limit === null || limit === undefined ? 'unlimited' : `$${limit.toFixed(2)}`;
        setUsage(`Label: ${info.label ?? '—'}\nUsed: $${used.toFixed(2)}\nLimit: ${limitText}` +
            (info.isFreeTier ? '\nTier: free' : ''));
    }
    catch (e) {
        setUsage(`Could not load usage: ${e instanceof Error ? e.message : String(e)}`);
    }
}
//# sourceMappingURL=SettingsScreen.js.map