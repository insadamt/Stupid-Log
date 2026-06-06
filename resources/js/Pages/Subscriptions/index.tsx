import { router } from '@inertiajs/react';
import { useEffect, useMemo, useState } from 'react';
import AppLayout from '../../Components/AppLayout';
import DeleteSubscriptionDialog from './components/DeleteSubscriptionDialog';
import SubscriptionInspector from './components/SubscriptionInspector';
import SubscriptionList from './components/SubscriptionList';
import SubscriptionWizard from './components/SubscriptionWizard';
import { SubscriptionEntry, SubscriptionFilter, SubscriptionOwnershipCopy, SubscriptionOwnershipType } from './types';

export default function Subscriptions({
    subscriptionEntries,
    subscriptionOwnershipTypes,
    ownershipCopies,
    closedFinancialYear,
    firstEditableDate,
}: {
    subscriptionEntries: SubscriptionEntry[];
    subscriptionOwnershipTypes: SubscriptionOwnershipType[];
    ownershipCopies: SubscriptionOwnershipCopy[];
    closedFinancialYear: number | null;
    firstEditableDate: string | null;
}) {
    const [selectedEntryId, setSelectedEntryId] = useState<number | null>(subscriptionEntries[0]?.id ?? null);
    const [query, setQuery] = useState('');
    const [filter, setFilter] = useState<SubscriptionFilter>('all');
    const [wizardEntry, setWizardEntry] = useState<SubscriptionEntry | null | undefined>(undefined);
    const [deleteTarget, setDeleteTarget] = useState<SubscriptionEntry | null>(null);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        if (selectedEntryId && subscriptionEntries.some((entry) => entry.id === selectedEntryId)) return;
        setSelectedEntryId(subscriptionEntries[0]?.id ?? null);
    }, [selectedEntryId, subscriptionEntries]);

    const visibleEntries = useMemo(() => subscriptionEntries.filter((entry) => {
        const matchesQuery = entry.ownership_type.toLowerCase().includes(query.toLowerCase().trim());
        const matchesFilter = filter === 'all'
            || (filter === 'locked' && entry.has_locked_years)
            || (filter === 'editable' && !entry.has_locked_years);
        return matchesQuery && matchesFilter;
    }), [filter, query, subscriptionEntries]);
    const selectedEntry = subscriptionEntries.find((entry) => entry.id === selectedEntryId) ?? null;

    useEffect(() => {
        if (selectedEntryId && visibleEntries.some((entry) => entry.id === selectedEntryId)) return;
        setSelectedEntryId(visibleEntries[0]?.id ?? null);
    }, [selectedEntryId, visibleEntries]);

    function deleteSubscription() {
        if (!deleteTarget) return;

        router.delete(`/subscriptions/${deleteTarget.id}`, {
            preserveScroll: true,
            onStart: () => setDeleting(true),
            onFinish: () => setDeleting(false),
            onSuccess: () => setDeleteTarget(null),
        });
    }

    return (
        <AppLayout title="Subscriptions" lockViewport>
            <main className="grid h-full min-h-0 gap-4 pl-[88px] xl:grid-cols-[370px_minmax(0,1fr)]">
                <SubscriptionList
                    entries={visibleEntries}
                    selectedEntryId={selectedEntryId}
                    query={query}
                    filter={filter}
                    setQuery={setQuery}
                    setFilter={setFilter}
                    selectEntry={setSelectedEntryId}
                    startCreate={() => setWizardEntry(null)}
                />

                <SubscriptionInspector
                    entry={selectedEntry}
                    ownershipCopies={ownershipCopies}
                    startEdit={(entry) => setWizardEntry(entry)}
                    requestDelete={setDeleteTarget}
                    startCreate={() => setWizardEntry(null)}
                />
            </main>

            {wizardEntry !== undefined && (
                <SubscriptionWizard
                    key={wizardEntry?.id ?? 'new'}
                    entry={wizardEntry}
                    ownershipTypes={subscriptionOwnershipTypes}
                    ownershipCopies={ownershipCopies}
                    closedFinancialYear={closedFinancialYear}
                    firstEditableDate={firstEditableDate}
                    close={() => setWizardEntry(undefined)}
                />
            )}

            {deleteTarget && (
                <DeleteSubscriptionDialog
                    entry={deleteTarget}
                    deleting={deleting}
                    cancel={() => setDeleteTarget(null)}
                    confirm={deleteSubscription}
                />
            )}
        </AppLayout>
    );
}
