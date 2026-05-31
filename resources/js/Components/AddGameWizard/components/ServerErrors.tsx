export default function ServerErrors({ serverErrors }: { serverErrors: Record<string, string> }) {
    if (Object.keys(serverErrors).length === 0) return null;

    return <div className="mt-6 rounded-2xl border border-red-500/20 bg-red-500/10 p-5 text-sm font-black text-red-700"><div className="mb-2 text-base">Backend rejected the save:</div><ul className="list-inside list-disc space-y-1">{Object.entries(serverErrors).map(([key, value]) => <li key={key}>{key}: {value}</li>)}</ul></div>;
}
