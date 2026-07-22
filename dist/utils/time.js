/** Format a timestamp as a compact relative age, e.g. "2m ago", "1d ago". */
export function relativeTime(at, now = Date.now()) {
    const secs = Math.max(0, Math.floor((now - at) / 1000));
    if (secs < 60)
        return 'just now';
    const mins = Math.floor(secs / 60);
    if (mins < 60)
        return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24)
        return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7)
        return `${days}d ago`;
    const weeks = Math.floor(days / 7);
    return `${weeks}w ago`;
}
//# sourceMappingURL=time.js.map