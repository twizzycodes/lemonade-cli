import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { Box, Text, useInput } from 'ink';
import SelectInput from 'ink-select-input';
import TextInput from 'ink-text-input';
import Spinner from 'ink-spinner';
import { theme } from '../theme.js';
export function ModelPicker({ client, currentModel, onSelect, onCancel }) {
    const [models, setModels] = useState(null);
    const [error, setError] = useState('');
    const [filter, setFilter] = useState('');
    useEffect(() => {
        let cancelled = false;
        client
            .listModels()
            .then((m) => !cancelled && setModels(m))
            .catch((e) => !cancelled && setError(e instanceof Error ? e.message : String(e)));
        return () => {
            cancelled = true;
        };
    }, [client]);
    useInput((_input, key) => {
        if (key.escape)
            onCancel();
    });
    if (error) {
        return (_jsxs(Box, { flexDirection: "column", children: [_jsxs(Text, { color: theme.error, children: ["\u2717 Could not load models: ", error] }), _jsx(Text, { color: theme.muted, children: "Press Esc to go back." })] }));
    }
    if (!models) {
        return (_jsxs(Box, { children: [_jsx(Text, { color: theme.secondary, children: _jsx(Spinner, { type: "dots" }) }), _jsx(Text, { color: theme.muted, children: " Fetching models from OpenRouter\u2026" })] }));
    }
    const needle = filter.toLowerCase();
    const filtered = models.filter((m) => m.id.toLowerCase().includes(needle));
    const items = filtered.slice(0, 200).map((m) => ({
        label: formatModelLabel(m, m.id === currentModel),
        value: m.id,
    }));
    return (_jsxs(Box, { flexDirection: "column", children: [_jsxs(Text, { color: theme.primary, bold: true, children: ["Select a model ", ' ', _jsxs(Text, { color: theme.muted, children: ["(", filtered.length, " shown \u2014 type to filter, Esc to cancel)"] })] }), _jsxs(Box, { children: [_jsx(Text, { color: theme.primary, children: "filter \u276F " }), _jsx(TextInput, { value: filter, onChange: setFilter, placeholder: "e.g. free, claude, gpt" })] }), _jsx(Box, { marginTop: 1, children: items.length === 0 ? (_jsxs(Text, { color: theme.muted, children: ["No models match \"", filter, "\"."] })) : (_jsx(SelectInput, { items: items, limit: 12, onSelect: (item) => onSelect(item.value) })) })] }));
}
function formatModelLabel(m, isCurrent) {
    const tag = m.isFree ? '[free]' : '[paid]';
    const ctx = m.contextLength ? `${Math.round(m.contextLength / 1000)}k` : '—';
    const price = m.isFree
        ? ''
        : ` $${perMillion(m.promptPrice)}/$${perMillion(m.completionPrice)} per M`;
    const marker = isCurrent ? '● ' : '';
    return `${marker}${m.id.padEnd(38)} ${tag} ${ctx}${price}`;
}
function perMillion(price) {
    if (!price)
        return '0';
    return (price * 1_000_000).toFixed(2);
}
//# sourceMappingURL=ModelPicker.js.map