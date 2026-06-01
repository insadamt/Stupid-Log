import { useEffect, useState } from 'react';

export function useDebouncedValue(value: string, delay = 240) {
    const [debounced, setDebounced] = useState(value);

    useEffect(() => {
        const timeout = window.setTimeout(() => setDebounced(value), delay);

        return () => window.clearTimeout(timeout);
    }, [delay, value]);

    return debounced;
}
