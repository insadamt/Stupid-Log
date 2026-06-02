import { router } from '@inertiajs/react';
import { useMemo, useRef, useState } from 'react';
import { gsap, prefersReducedMotion } from '../../animation';
import AppLayout from '../../Components/AppLayout';
import { GameCardData, ReferenceData } from '../../types';
import DetailsHeader from './components/DetailsHeader';
import DlcModal from './components/DlcModal';
import DlcsPanel from './components/DlcsPanel';
import GameEditModal from './components/GameEditModal';
import GameStage from './components/GameStage';
import OverviewMetrics from './components/OverviewMetrics';
import OverviewPanel from './components/OverviewPanel';
import OwnershipCopyModal from './components/OwnershipCopyModal';
import OwnershipPanel from './components/OwnershipPanel';
import PurchasesPanel from './components/PurchasesPanel';
import { ModeButton } from './components/SharedUi';
import { formFromCopy } from './forms';
import { Details, Dlc, DlcForm, EditTab, GameEditForm, InAppPurchase, InAppPurchaseForm, Mode, OwnershipCopyDetails, OwnershipForm, PaidBreakdown } from './types';
import { useGameDetailsAnimations } from './useGameDetailsAnimations';

export default function GameDetails({
    libraryGame,
    details,
    references,
    dlcs,
    paidBreakdown,
}: {
    libraryGame: GameCardData;
    details: Details;
    references: ReferenceData;
    dlcs: Dlc[];
    paidBreakdown: PaidBreakdown;
}) {
    const pageRef = useRef<HTMLElement>(null);
    const layoutRef = useRef<HTMLElement>(null);
    const metricsRef = useRef<HTMLElement>(null);
    const stageRef = useRef<HTMLElement>(null);
    const detailsPanelRef = useRef<HTMLElement>(null);
    const previousStageRect = useRef<DOMRect | null>(null);
    const firstModeRender = useRef(true);
    const [mode, setMode] = useState<Mode>('overview');
    const [filter, setFilter] = useState('All');
    const [query, setQuery] = useState('');
    const [platformQuery, setPlatformQuery] = useState('');
    const [deviceQuery, setDeviceQuery] = useState('');
    const [editingCopyId, setEditingCopyId] = useState<number | 'new' | null>(null);
    const [ownershipForm, setOwnershipForm] = useState<OwnershipForm>(() => formFromCopy(undefined, details.platform_ownership_types[0]?.id));
    const [ownershipErrors, setOwnershipErrors] = useState<Record<string, string>>({});
    const [savingOwnership, setSavingOwnership] = useState(false);
    const [editingGame, setEditingGame] = useState(false);
    const [editTab, setEditTab] = useState<EditTab>('basics');
    const [gameErrors, setGameErrors] = useState<Record<string, string>>({});
    const [savingGame, setSavingGame] = useState(false);
    const [pendingGameStatusId, setPendingGameStatusId] = useState<string | null>(null);
    const [gameCompletionDateDraft, setGameCompletionDateDraft] = useState(new Date().toISOString().slice(0, 10));
    const [gameForm, setGameForm] = useState<GameEditForm>(() => ({
        title: libraryGame.title,
        publisher: libraryGame.publisher ?? '',
        description: libraryGame.description ?? '',
        base_price_default: libraryGame.base_price_default === null || libraryGame.base_price_default === undefined ? '' : String(libraryGame.base_price_default),
        total_achievements: libraryGame.total_achievements ? String(libraryGame.total_achievements) : '',
        status_id: String(references.statuses.find((status) => status.name === libraryGame.status)?.id ?? references.statuses[0]?.id ?? ''),
        playtime_hours: String(libraryGame.playtime_hours ?? 0),
        earned_achievements: String(libraryGame.earned_achievements ?? 0),
        completed_at: libraryGame.completed_at ?? '',
    }));
    const [platformDeviceErrors, setPlatformDeviceErrors] = useState<Record<string, string>>({});
    const [savingPlatformDevices, setSavingPlatformDevices] = useState(false);
    const [platformDeviceForm, setPlatformDeviceForm] = useState(() => ({
        platform_id: String(details.platform_id),
        device_ids: details.device_ids.map(String),
    }));
    const [editingDlcId, setEditingDlcId] = useState<number | null>(null);
    const [dlcForm, setDlcForm] = useState<DlcForm>({ acquisition_type: 'Owned', purchased_price: '', purchased_at: '' });
    const [dlcErrors, setDlcErrors] = useState<Record<string, string>>({});
    const [savingDlc, setSavingDlc] = useState(false);
    const [refreshingDlcs, setRefreshingDlcs] = useState(false);
    const [editingPurchaseId, setEditingPurchaseId] = useState<number | 'new' | null>(null);
    const [purchaseForm, setPurchaseForm] = useState<InAppPurchaseForm>({ title: '', amount_paid: '', purchased_at: new Date().toISOString().slice(0, 10) });
    const [purchaseErrors, setPurchaseErrors] = useState<Record<string, string>>({});
    const [savingPurchase, setSavingPurchase] = useState(false);
    const filteredDlcs = useMemo(
        () => dlcs.filter((dlc) => (filter === 'All' || dlc.state === filter) && dlc.title.toLowerCase().includes(query.toLowerCase().trim())),
        [dlcs, filter, query],
    );
    const devices = libraryGame.devices.length ? libraryGame.devices : ['Unknown device'];
    const achievements = `${libraryGame.earned_achievements} / ${libraryGame.total_achievements || 0}`;
    const selectedPlatform = references.platforms.find((platform) => String(platform.id) === platformDeviceForm.platform_id);
    const selectedGameStatus = references.statuses.find((status) => String(status.id) === gameForm.status_id);
    const gameHasAchievements = Number(gameForm.total_achievements || 0) > 0;
    const editingDlc = dlcs.find((dlc) => dlc.id === editingDlcId) ?? null;
    const editingCopy = typeof editingCopyId === 'number' ? details.ownership_copies.find((copy) => copy.id === editingCopyId) ?? null : null;
    const filteredPlatforms = references.platforms.filter((platform) =>
        platform.name.toLowerCase().includes(platformQuery.toLowerCase().trim()),
    );
    const filteredDevices = (selectedPlatform?.devices ?? []).filter((device) =>
        device.name.toLowerCase().includes(deviceQuery.toLowerCase().trim()),
    );

    useGameDetailsAnimations({
        pageRef,
        stageRef,
        detailsPanelRef,
        previousStageRect,
        firstModeRender,
        libraryGameId: libraryGame.id,
        mode,
    });

    function changeMode(nextMode: Mode) {
        if (nextMode === mode) return;
        previousStageRect.current = stageRef.current?.getBoundingClientRect() ?? null;

        if (mode === 'overview' && nextMode !== 'overview' && layoutRef.current && metricsRef.current && !prefersReducedMotion()) {
            const layoutBounds = layoutRef.current.getBoundingClientRect();
            const metricsBounds = metricsRef.current.getBoundingClientRect();
            const clone = metricsRef.current.cloneNode(true) as HTMLElement;
            clone.style.position = 'absolute';
            clone.style.left = `${metricsBounds.left - layoutBounds.left}px`;
            clone.style.top = `${metricsBounds.top - layoutBounds.top}px`;
            clone.style.width = `${metricsBounds.width}px`;
            clone.style.height = `${metricsBounds.height}px`;
            clone.style.zIndex = '15';
            clone.style.pointerEvents = 'none';
            clone.style.margin = '0';

            layoutRef.current.appendChild(clone);
            gsap.to(clone, {
                autoAlpha: 0,
                x: -28,
                duration: 0.38,
                delay: 0.08,
                ease: 'power3.out',
                onComplete: () => clone.remove(),
            });
        }
        setMode(nextMode);
    }

    function updateOwnershipForm(patch: Partial<OwnershipForm>) {
        setOwnershipForm((current) => ({ ...current, ...patch }));
    }

    function startAddCopy() {
        const used = new Set(details.ownership_copies.map((copy) => copy.ownership_type_id));
        const nextType = details.platform_ownership_types.find((type) => !used.has(type.id)) ?? details.platform_ownership_types[0];
        setEditingCopyId('new');
        setOwnershipForm(formFromCopy(undefined, nextType?.id));
        setOwnershipErrors({});
    }

    function startEditCopy(copy: OwnershipCopyDetails) {
        setEditingCopyId(copy.id);
        setOwnershipForm(formFromCopy(copy));
        setOwnershipErrors({});
    }

    function cancelOwnershipEdit() {
        setEditingCopyId(null);
        setOwnershipErrors({});
    }

    function ownershipPayload() {
        return {
            ownership_type_id: Number(ownershipForm.ownership_type_id),
            physical_status_id: ownershipForm.physical_status_id ? Number(ownershipForm.physical_status_id) : null,
            edition_name: ownershipForm.edition_name || null,
            base_price: ownershipForm.base_price === '' ? null : Number(ownershipForm.base_price),
            purchased_price: ownershipForm.purchased_price === '' ? null : Number(ownershipForm.purchased_price),
            purchased_at: ownershipForm.purchased_at || null,
        };
    }

    function submitOwnership() {
        const options = {
            preserveScroll: true,
            onStart: () => setSavingOwnership(true),
            onFinish: () => setSavingOwnership(false),
            onSuccess: () => cancelOwnershipEdit(),
            onError: (errors: Record<string, string>) => setOwnershipErrors(errors),
        };
        if (editingCopyId === 'new') {
            router.post(`/games/${libraryGame.id}/ownership-copies`, ownershipPayload(), options);
            return;
        }
        if (typeof editingCopyId === 'number') {
            router.patch(`/ownership-copies/${editingCopyId}`, ownershipPayload(), options);
        }
    }

    function deleteCopy(copy: OwnershipCopyDetails) {
        router.delete(`/ownership-copies/${copy.id}`, {
            preserveScroll: true,
            onError: (errors: Record<string, string>) => setOwnershipErrors(errors),
        });
    }

    function updateGameForm(patch: Partial<GameEditForm>) {
        setGameForm((current) => ({ ...current, ...patch }));
    }

    function updateGameStatus(statusId: string) {
        const nextStatus = references.statuses.find((status) => String(status.id) === statusId);
        if (nextStatus?.name === 'Completed' || nextStatus?.name === '100%') {
            setPendingGameStatusId(statusId);
            setGameCompletionDateDraft(gameForm.completed_at || new Date().toISOString().slice(0, 10));
            return;
        }
        setGameForm((current) => ({
            ...current,
            status_id: statusId,
            earned_achievements: nextStatus?.name === '100%' && Number(current.total_achievements) > 0 ? current.total_achievements : current.earned_achievements,
            completed_at: '',
        }));
    }

    function applyGameCompletedStatus() {
        if (!pendingGameStatusId) return;
        const nextStatus = references.statuses.find((status) => String(status.id) === pendingGameStatusId);
        setGameForm((current) => ({
            ...current,
            status_id: pendingGameStatusId,
            earned_achievements: nextStatus?.name === '100%' && Number(current.total_achievements) > 0 ? current.total_achievements : current.earned_achievements,
            completed_at: gameCompletionDateDraft || new Date().toISOString().slice(0, 10),
        }));
        setPendingGameStatusId(null);
    }

    function platformDevicesChanged() {
        const savedDeviceIds = details.device_ids.map(String).sort().join('|');
        const nextDeviceIds = platformDeviceForm.device_ids.map(String).sort().join('|');
        return platformDeviceForm.platform_id !== String(details.platform_id) || savedDeviceIds !== nextDeviceIds;
    }

    function savePlatformDevicesAfterGame() {
        router.patch(`/games/${libraryGame.id}/platform-devices`, {
            platform_id: Number(platformDeviceForm.platform_id),
            device_ids: platformDeviceForm.device_ids.map(Number),
        }, {
            preserveScroll: true,
            onStart: () => setSavingPlatformDevices(true),
            onFinish: () => setSavingPlatformDevices(false),
            onSuccess: () => {
                setPlatformDeviceErrors({});
                setEditingGame(false);
            },
            onError: (errors: Record<string, string>) => setPlatformDeviceErrors(errors),
        });
    }

    function submitGameEdit() {
        router.patch(`/games/${libraryGame.id}`, {
            game: {
                title: gameForm.title,
                publisher: gameForm.publisher || null,
                description: gameForm.description || null,
                base_price_default: gameForm.base_price_default === '' ? null : Number(gameForm.base_price_default),
                total_achievements: gameForm.total_achievements === '' ? null : Number(gameForm.total_achievements),
            },
            progress: {
                status_id: Number(gameForm.status_id),
                playtime_hours: gameForm.playtime_hours === '' ? 0 : Number(gameForm.playtime_hours),
                earned_achievements: gameForm.earned_achievements === '' ? null : Number(gameForm.earned_achievements),
                completed_at: gameForm.completed_at || null,
            },
        }, {
            preserveScroll: true,
            onStart: () => setSavingGame(true),
            onFinish: () => setSavingGame(false),
            onSuccess: () => {
                setGameErrors({});
                if (platformDevicesChanged()) {
                    savePlatformDevicesAfterGame();
                    return;
                }
                setEditingGame(false);
            },
            onError: (errors: Record<string, string>) => setGameErrors(errors),
        });
    }

    function deleteLibraryGame() {
        if (!window.confirm(`Delete ${libraryGame.title} from your library?`)) return;
        router.delete(`/games/${libraryGame.id}`);
    }

    function updatePlatformDeviceForm(patch: Partial<typeof platformDeviceForm>) {
        setPlatformDeviceForm((current) => ({ ...current, ...patch }));
    }

    function togglePlatformDevice(deviceId: number) {
        const value = String(deviceId);
        setPlatformDeviceForm((current) => ({
            ...current,
            device_ids: current.device_ids.includes(value)
                ? current.device_ids.filter((id) => id !== value)
                : [...current.device_ids, value],
        }));
    }

    function startEditDlc(dlc: Dlc) {
        setEditingDlcId(dlc.id);
        setDlcForm({
            acquisition_type: dlc.state === 'Not Owned' ? 'Owned' : dlc.state,
            purchased_price: dlc.purchased_price === null || dlc.purchased_price === undefined ? '' : String(dlc.purchased_price),
            purchased_at: dlc.purchased_at ?? '',
        });
        setDlcErrors({});
    }

    function cancelDlcEdit() {
        setEditingDlcId(null);
        setDlcErrors({});
    }

    function submitDlc(dlc: Dlc) {
        const payload = {
            dlc_id: dlc.id,
            acquisition_type: dlcForm.acquisition_type,
            purchased_price: dlcForm.purchased_price === '' ? null : Number(dlcForm.purchased_price),
            purchased_at: dlcForm.purchased_at || null,
        };
        const options = {
            preserveScroll: true,
            onStart: () => setSavingDlc(true),
            onFinish: () => setSavingDlc(false),
            onSuccess: () => cancelDlcEdit(),
            onError: (errors: Record<string, string>) => setDlcErrors(errors),
        };
        if (dlc.owned_dlc_id) {
            router.patch(`/owned-dlcs/${dlc.owned_dlc_id}`, payload, options);
            return;
        }
        router.post(`/games/${libraryGame.id}/owned-dlcs`, payload, options);
    }

    function removeDlc(dlc: Dlc) {
        if (!dlc.owned_dlc_id) return;
        router.delete(`/owned-dlcs/${dlc.owned_dlc_id}`, {
            preserveScroll: true,
            onError: (errors: Record<string, string>) => setDlcErrors(errors),
        });
    }

    function refreshDlcs() {
        router.post(`/games/${libraryGame.id}/dlcs/refresh`, {}, {
            preserveScroll: true,
            onStart: () => { setRefreshingDlcs(true); setDlcErrors({}); },
            onFinish: () => setRefreshingDlcs(false),
            onError: (errors: Record<string, string>) => setDlcErrors(errors),
        });
    }

    function updatePurchaseForm(patch: Partial<InAppPurchaseForm>) {
        setPurchaseForm((current) => ({ ...current, ...patch }));
    }

    function startAddPurchase() {
        setEditingPurchaseId('new');
        setPurchaseForm({ title: '', amount_paid: '', purchased_at: new Date().toISOString().slice(0, 10) });
        setPurchaseErrors({});
    }

    function startEditPurchase(purchase: InAppPurchase) {
        setEditingPurchaseId(purchase.id);
        setPurchaseForm({
            title: purchase.title,
            amount_paid: String(purchase.amount_paid),
            purchased_at: purchase.purchased_at ?? '',
        });
        setPurchaseErrors({});
    }

    function cancelPurchaseEdit() {
        setEditingPurchaseId(null);
        setPurchaseErrors({});
    }

    function submitPurchase() {
        const payload = {
            title: purchaseForm.title,
            amount_paid: Number(purchaseForm.amount_paid),
            purchased_at: purchaseForm.purchased_at,
        };
        const options = {
            preserveScroll: true,
            onStart: () => setSavingPurchase(true),
            onFinish: () => setSavingPurchase(false),
            onSuccess: () => cancelPurchaseEdit(),
            onError: (errors: Record<string, string>) => setPurchaseErrors(errors),
        };

        if (editingPurchaseId === 'new') {
            router.post(`/games/${libraryGame.id}/in-app-purchases`, payload, options);
            return;
        }

        if (typeof editingPurchaseId === 'number') {
            router.patch(`/in-app-purchases/${editingPurchaseId}`, payload, options);
        }
    }

    function deletePurchase(purchase: InAppPurchase) {
        router.delete(`/in-app-purchases/${purchase.id}`, {
            preserveScroll: true,
            onError: (errors: Record<string, string>) => setPurchaseErrors(errors),
        });
    }

    return (
        <AppLayout title={libraryGame.title} lockViewport>
            <section ref={pageRef} className="relative isolate h-full overflow-hidden rounded-[44px] border border-black/10 bg-[#e8eee8] px-7 pb-24 pt-5 shadow-[inset_0_1px_0_rgb(255_255_255/0.75)]">
                <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_42%,rgba(183,255,99,0.24),transparent_34%),radial-gradient(circle_at_82%_16%,rgba(0,0,0,0.08),transparent_24%),linear-gradient(rgba(0,0,0,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.035)_1px,transparent_1px)] bg-[length:auto,auto,38px_38px,38px_38px]" />
                <div className="pointer-events-none absolute left-[42%] top-[53%] -z-10 h-[380px] w-[740px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#b7ff63]/18 blur-3xl" />
                <DetailsHeader title={libraryGame.title} onEdit={() => { setEditTab('basics'); setEditingGame(true); }} onDelete={deleteLibraryGame} />

                <main
                    ref={layoutRef}
                    className={[
                        'relative mx-auto mt-8 grid h-[calc(100%-128px)] w-full max-w-[1460px] items-center',
                        mode === 'overview' ? 'grid-cols-[260px_370px_minmax(0,1fr)] gap-10' : 'grid-cols-[370px_minmax(0,1fr)] gap-9',
                    ].join(' ')}
                >
                    {mode === 'overview' && (
                        <OverviewMetrics metricsRef={metricsRef} achievements={achievements} playtimeHours={libraryGame.playtime_hours} basePrice={libraryGame.base_price_default} devices={devices} />
                    )}
                    <GameStage stageRef={stageRef} libraryGame={libraryGame} />
                    <section data-details-panel ref={detailsPanelRef} className="relative z-10 min-w-0 self-center">
                        {mode === 'overview' && <OverviewPanel libraryGame={libraryGame} details={details} />}
                        {mode === 'ownership' && <OwnershipPanel details={details} startAddCopy={startAddCopy} startEditCopy={startEditCopy} deleteCopy={deleteCopy} />}
                        {mode === 'dlcs' && (
                            <DlcsPanel
                                query={query}
                                setQuery={setQuery}
                                filter={filter}
                                setFilter={setFilter}
                                refreshingDlcs={refreshingDlcs}
                                refreshDlcs={refreshDlcs}
                                dlcErrors={dlcErrors}
                                filteredDlcs={filteredDlcs}
                                startEditDlc={startEditDlc}
                                removeDlc={removeDlc}
                            />
                        )}
                        {mode === 'purchases' && (
                            <PurchasesPanel
                                paidBreakdown={paidBreakdown}
                                editingPurchaseId={editingPurchaseId}
                                purchaseForm={purchaseForm}
                                purchaseErrors={purchaseErrors}
                                savingPurchase={savingPurchase}
                                startAddPurchase={startAddPurchase}
                                startEditPurchase={startEditPurchase}
                                cancelPurchaseEdit={cancelPurchaseEdit}
                                updatePurchaseForm={updatePurchaseForm}
                                submitPurchase={submitPurchase}
                                deletePurchase={deletePurchase}
                            />
                        )}
                    </section>
                </main>

                <div className="fixed bottom-7 left-1/2 z-30 flex -translate-x-1/2 rounded-[24px] bg-black p-2 shadow-[0_18px_34px_rgb(0_0_0/0.25)]">
                    <ModeButton active={mode === 'overview'} onClick={() => changeMode('overview')}>Game Page</ModeButton>
                    <ModeButton active={mode === 'ownership'} onClick={() => changeMode('ownership')}>Ownership</ModeButton>
                    <ModeButton active={mode === 'dlcs'} onClick={() => changeMode('dlcs')}>DLCs Page</ModeButton>
                    <ModeButton active={mode === 'purchases'} onClick={() => changeMode('purchases')}>Purchases</ModeButton>
                </div>

                {editingCopyId && (
                    <OwnershipCopyModal
                        editingCopyId={editingCopyId}
                        editingCopy={editingCopy}
                        libraryGame={libraryGame}
                        details={details}
                        references={references}
                        ownershipForm={ownershipForm}
                        ownershipErrors={ownershipErrors}
                        savingOwnership={savingOwnership}
                        updateOwnershipForm={updateOwnershipForm}
                        cancelOwnershipEdit={cancelOwnershipEdit}
                        submitOwnership={submitOwnership}
                    />
                )}

                {editingDlc && (
                    <DlcModal
                        editingDlc={editingDlc}
                        dlcForm={dlcForm}
                        setDlcForm={setDlcForm}
                        dlcErrors={dlcErrors}
                        savingDlc={savingDlc}
                        cancelDlcEdit={cancelDlcEdit}
                        submitDlc={submitDlc}
                    />
                )}

                {editingGame && (
                    <GameEditModal
                        libraryGame={libraryGame}
                        devices={devices}
                        editTab={editTab}
                        setEditTab={setEditTab}
                        gameForm={gameForm}
                        gameErrors={gameErrors}
                        references={references}
                        selectedGameStatus={selectedGameStatus}
                        gameHasAchievements={gameHasAchievements}
                        platformQuery={platformQuery}
                        setPlatformQuery={setPlatformQuery}
                        deviceQuery={deviceQuery}
                        setDeviceQuery={setDeviceQuery}
                        filteredPlatforms={filteredPlatforms}
                        filteredDevices={filteredDevices}
                        platformDeviceForm={platformDeviceForm}
                        updatePlatformDeviceForm={updatePlatformDeviceForm}
                        togglePlatformDevice={togglePlatformDevice}
                        platformDeviceErrors={platformDeviceErrors}
                        updateGameForm={updateGameForm}
                        updateGameStatus={updateGameStatus}
                        platformDevicesChanged={platformDevicesChanged}
                        savingGame={savingGame}
                        savingPlatformDevices={savingPlatformDevices}
                        submitGameEdit={submitGameEdit}
                        close={() => setEditingGame(false)}
                        pendingGameStatusId={pendingGameStatusId}
                        gameCompletionDateDraft={gameCompletionDateDraft}
                        setGameCompletionDateDraft={setGameCompletionDateDraft}
                        setPendingGameStatusId={setPendingGameStatusId}
                        applyGameCompletedStatus={applyGameCompletedStatus}
                    />
                )}
            </section>
        </AppLayout>
    );
}
