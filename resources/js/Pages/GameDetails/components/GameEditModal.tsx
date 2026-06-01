import { HardDrive, Save, Search, X } from 'lucide-react';
import PlatformIcon from '../../../Components/PlatformIcon';
import { statusPillStyle } from '../../../statusColors';
import { GameCardData, ReferenceData } from '../../../types';
import { Details, EditTab, GameEditForm } from '../types';
import { Field, Select, TextArea, TextInput } from './FormControls';
import { Chip } from './SharedUi';

export default function GameEditModal({
    libraryGame,
    devices,
    editTab,
    setEditTab,
    gameForm,
    gameErrors,
    references,
    selectedGameStatus,
    gameHasAchievements,
    platformQuery,
    setPlatformQuery,
    deviceQuery,
    setDeviceQuery,
    filteredPlatforms,
    filteredDevices,
    platformDeviceForm,
    updatePlatformDeviceForm,
    togglePlatformDevice,
    platformDeviceErrors,
    updateGameForm,
    updateGameStatus,
    platformDevicesChanged,
    savingGame,
    savingPlatformDevices,
    submitGameEdit,
    close,
    pendingGameStatusId,
    gameCompletionDateDraft,
    setGameCompletionDateDraft,
    setPendingGameStatusId,
    applyGameCompletedStatus,
}: {
    libraryGame: GameCardData;
    devices: string[];
    editTab: EditTab;
    setEditTab: (tab: EditTab) => void;
    gameForm: GameEditForm;
    gameErrors: Record<string, string>;
    references: ReferenceData;
    selectedGameStatus: ReferenceData['statuses'][number] | undefined;
    gameHasAchievements: boolean;
    platformQuery: string;
    setPlatformQuery: (query: string) => void;
    deviceQuery: string;
    setDeviceQuery: (query: string) => void;
    filteredPlatforms: ReferenceData['platforms'];
    filteredDevices: ReferenceData['platforms'][number]['devices'];
    platformDeviceForm: { platform_id: string; device_ids: string[] };
    updatePlatformDeviceForm: (patch: Partial<{ platform_id: string; device_ids: string[] }>) => void;
    togglePlatformDevice: (deviceId: number) => void;
    platformDeviceErrors: Record<string, string>;
    updateGameForm: (patch: Partial<GameEditForm>) => void;
    updateGameStatus: (statusId: string) => void;
    platformDevicesChanged: () => boolean;
    savingGame: boolean;
    savingPlatformDevices: boolean;
    submitGameEdit: () => void;
    close: () => void;
    pendingGameStatusId: string | null;
    gameCompletionDateDraft: string;
    setGameCompletionDateDraft: (date: string) => void;
    setPendingGameStatusId: (statusId: string | null) => void;
    applyGameCompletedStatus: () => void;
}) {
    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 px-5 backdrop-blur-sm">
            <section className="relative grid max-h-[90vh] w-full max-w-6xl grid-cols-[300px_minmax(0,1fr)] overflow-hidden rounded-[38px] border border-white/10 bg-black text-white shadow-[0_36px_120px_rgb(0_0_0/0.45)]">
                <aside className="bg-[#b7ff63] p-5 text-black">
                    <div className="overflow-hidden rounded-[28px] bg-black shadow-[0_22px_48px_rgb(0_0_0/0.25)]">
                        {libraryGame.cover_url ? (
                            <img src={libraryGame.cover_url} alt={libraryGame.title} className="h-[390px] w-full object-cover" />
                        ) : (
                            <div className="grid h-[390px] place-items-center text-xl font-black text-[#b7ff63]">No Cover</div>
                        )}
                    </div>

                    <div className="mt-5 rounded-[26px] bg-black p-4 text-white">
                        <div className="mb-3 grid size-12 place-items-center rounded-[18px] bg-white p-1.5">
                            <img src="/images/stupid-log/stupid-log.png" alt="" className="size-full object-contain" />
                        </div>
                        <div className="text-[10px] font-black uppercase tracking-[0.24em] text-[#b7ff63]">Current Entry</div>
                        <div className="mt-2 truncate text-3xl font-black leading-[0.92] tracking-[-0.06em]">{libraryGame.title}</div>
                        <div className="mt-3 flex flex-wrap gap-2">
                            <Chip active><PlatformIcon platform={libraryGame.platform} surface="lime" size="xs" className="-ml-2" />{libraryGame.platform}</Chip>
                            {devices.slice(0, 2).map((device) => <Chip key={device}>{device}</Chip>)}
                        </div>
                    </div>
                </aside>

                <div className="grid min-h-0 grid-rows-[auto_auto_minmax(0,1fr)_auto] p-6">
                    <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-5">
                        <div>
                            <div className="text-[11px] font-black uppercase tracking-[0.28em] text-[#b7ff63]">Edit Entry</div>
                            <h2 className="mt-2 text-5xl font-black leading-none tracking-[-0.065em]">Game Details</h2>
                        </div>
                        <button type="button" onClick={close} className="grid size-11 place-items-center rounded-full bg-white/10 text-white/60 hover:text-white">
                            <X size={20} />
                        </button>
                    </div>

                    <div className="mt-5 grid grid-cols-4 gap-2 rounded-[24px] bg-white/[0.055] p-2">
                        {[
                            ['basics', 'Basics'],
                            ['progress', 'Progress'],
                            ['platform', 'Platform'],
                            ['description', 'Description'],
                        ].map(([key, label]) => (
                            <button
                                key={key}
                                type="button"
                                onClick={() => setEditTab(key as EditTab)}
                                className={`rounded-[18px] px-4 py-3 text-sm font-black transition ${
                                    editTab === key ? 'bg-[#b7ff63] text-black' : 'text-white/45 hover:bg-white/10 hover:text-white'
                                }`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>

                    <div className="mt-5 min-h-0 overflow-y-auto pr-2">
                        {editTab === 'basics' && (
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="md:col-span-2 rounded-[26px] border border-white/10 bg-white/[0.055] p-4">
                                    <div className="text-[10px] font-black uppercase tracking-[0.24em] text-[#b7ff63]/70">Identity</div>
                                    <div className="mt-1 text-2xl font-black tracking-[-0.045em]">Main record fields</div>
                                </div>

                                <Field label="Title" error={gameErrors['game.title']}>
                                    <TextInput value={gameForm.title} onChange={(event) => updateGameForm({ title: event.target.value })} />
                                </Field>

                                <Field label="Publisher" error={gameErrors['game.publisher']}>
                                    <TextInput value={gameForm.publisher} onChange={(event) => updateGameForm({ publisher: event.target.value })} placeholder="Unknown Publisher" />
                                </Field>

                                <Field label="Base Value" error={gameErrors['game.base_price_default']}>
                                    <TextInput type="number" step="0.01" value={gameForm.base_price_default} onChange={(event) => updateGameForm({ base_price_default: event.target.value })} />
                                </Field>

                                <Field label="Total Achievements" error={gameErrors['game.total_achievements']}>
                                    <TextInput type="number" value={gameForm.total_achievements} onChange={(event) => updateGameForm({ total_achievements: event.target.value })} />
                                </Field>
                            </div>
                        )}

                        {editTab === 'progress' && (
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="md:col-span-2 rounded-[26px] border border-white/10 bg-white/[0.055] p-4">
                                    <div className="text-[10px] font-black uppercase tracking-[0.24em] text-[#b7ff63]/70">Play State</div>
                                    <div className="mt-1 text-2xl font-black tracking-[-0.045em]">Status, hours, achievements</div>
                                </div>

                                <Field label="Status" error={gameErrors['progress.status_id']}>
                                    <Select value={gameForm.status_id} onChange={(event) => updateGameStatus(event.target.value)}>
                                        {references.statuses
                                            .filter((status) => gameHasAchievements || status.name !== '100%')
                                            .map((status) => <option key={status.id} value={status.id} className="text-black">{status.name}</option>)}
                                    </Select>
                                    {selectedGameStatus && (
                                        <span className="mt-1 inline-flex w-fit rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em]" style={statusPillStyle({ status: selectedGameStatus.name, status_color_hex: selectedGameStatus.color_hex })}>
                                            {selectedGameStatus.name}
                                        </span>
                                    )}
                                </Field>

                                <Field label="Playtime Hours" error={gameErrors['progress.playtime_hours']}>
                                    <TextInput type="number" step="0.1" value={gameForm.playtime_hours} onChange={(event) => updateGameForm({ playtime_hours: event.target.value })} />
                                </Field>

                                <Field label="Earned Achievements" error={gameErrors['progress.earned_achievements']}>
                                    <TextInput type="number" value={gameForm.earned_achievements} onChange={(event) => updateGameForm({ earned_achievements: event.target.value })} />
                                </Field>

                                {(selectedGameStatus?.name === 'Completed' || selectedGameStatus?.name === '100%') && (
                                    <Field label="Completed Date" error={gameErrors['progress.completed_at']}>
                                        <TextInput type="date" value={gameForm.completed_at} onChange={(event) => updateGameForm({ completed_at: event.target.value })} />
                                    </Field>
                                )}

                                {!gameHasAchievements && (
                                    <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-black text-white/55 md:col-span-2">
                                        100% is unavailable because this game has no achievement total.
                                    </div>
                                )}
                            </div>
                        )}

                        {editTab === 'platform' && (
                            <div className="grid gap-4">
                                <div className="rounded-[26px] border border-white/10 bg-white/[0.055] p-4">
                                    <div className="mb-4 flex items-start justify-between gap-4">
                                        <div>
                                            <div className="text-[10px] font-black uppercase tracking-[0.24em] text-[#b7ff63]/70">Platform Setup</div>
                                            <div className="mt-1 text-2xl font-black tracking-[-0.045em]">Choose platform and devices</div>
                                            <p className="mt-2 max-w-xl text-sm font-bold text-white/38">
                                                Search the ecosystem first, then mark every device where this copy can be played.
                                            </p>
                                        </div>
                                        <HardDrive className="text-[#b7ff63]" size={24} />
                                    </div>

                                    <div className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.35fr)]">
                                        <section className="min-w-0 rounded-[24px] border border-white/10 bg-black/20 p-3">
                                            <div className="mb-3 text-[10px] font-black uppercase tracking-[0.22em] text-[#b7ff63]/70">Platform</div>
                                            <label className="mb-3 flex h-12 items-center gap-3 rounded-2xl bg-white/10 px-4 text-white/50">
                                                <Search size={18} />
                                                <input
                                                    value={platformQuery}
                                                    onChange={(event) => setPlatformQuery(event.target.value)}
                                                    placeholder="Search platforms..."
                                                    className="min-w-0 flex-1 bg-transparent text-sm font-black text-white outline-none placeholder:text-white/25"
                                                />
                                            </label>

                                            <div className="grid max-h-[300px] gap-2 overflow-auto pr-1">
                                                {filteredPlatforms.map((platform) => {
                                                    const active = String(platform.id) === platformDeviceForm.platform_id;

                                                    return (
                                                        <button
                                                            key={platform.id}
                                                            type="button"
                                                            onClick={() => {
                                                                updatePlatformDeviceForm({
                                                                    platform_id: String(platform.id),
                                                                    device_ids: platform.devices[0] ? [String(platform.devices[0].id)] : [],
                                                                });
                                                                setDeviceQuery('');
                                                            }}
                                                            className={`rounded-2xl px-4 py-3 text-left text-sm font-black transition ${
                                                                active ? 'bg-[#b7ff63] text-black' : 'bg-white/10 text-white/55 hover:text-white'
                                                            }`}
                                                        >
                                                            <span className="flex min-w-0 items-center gap-3">
                                                                <PlatformIcon platform={platform.name} surface={active ? 'lime' : 'dark'} size="sm" />
                                                                <span className="min-w-0">
                                                                    <span className="block truncate">{platform.name}</span>
                                                                    <span className={`mt-1 block text-[10px] uppercase tracking-[0.16em] ${active ? 'text-black/45' : 'text-white/30'}`}>
                                                                        {platform.devices.length} devices
                                                                    </span>
                                                                </span>
                                                            </span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                            {platformDeviceErrors.platform_id && <div className="mt-2 text-xs font-black text-[#ff6068]">{platformDeviceErrors.platform_id}</div>}
                                        </section>

                                        <section className="min-w-0 rounded-[24px] border border-white/10 bg-black/20 p-3">
                                            <div className="mb-3 flex items-center justify-between gap-3">
                                                <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[#b7ff63]/70">Playable Devices</div>
                                                <span className="rounded-full bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-white/45">
                                                    {platformDeviceForm.device_ids.length} selected
                                                </span>
                                            </div>

                                            <label className="mb-3 flex h-12 items-center gap-3 rounded-2xl bg-white/10 px-4 text-white/50">
                                                <Search size={18} />
                                                <input
                                                    value={deviceQuery}
                                                    onChange={(event) => setDeviceQuery(event.target.value)}
                                                    placeholder="Search devices..."
                                                    className="min-w-0 flex-1 bg-transparent text-sm font-black text-white outline-none placeholder:text-white/25"
                                                />
                                            </label>

                                            <div className="grid max-h-[300px] gap-2 overflow-auto pr-1 sm:grid-cols-2">
                                                {filteredDevices.map((device) => {
                                                    const active = platformDeviceForm.device_ids.includes(String(device.id));

                                                    return (
                                                        <button
                                                            key={device.id}
                                                            type="button"
                                                            onClick={() => togglePlatformDevice(device.id)}
                                                            className={`rounded-2xl px-4 py-3 text-left text-sm font-black transition ${
                                                                active ? 'bg-[#b7ff63] text-black' : 'bg-white/10 text-white/55 hover:text-white'
                                                            }`}
                                                        >
                                                            {device.name}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                            {platformDeviceErrors.device_ids && <div className="mt-2 text-xs font-black text-[#ff6068]">{platformDeviceErrors.device_ids}</div>}
                                        </section>
                                    </div>
                                </div>
                            </div>
                        )}

                        {editTab === 'description' && (
                            <div className="grid gap-4">
                                <div className="rounded-[26px] border border-white/10 bg-white/[0.055] p-4">
                                    <div className="text-[10px] font-black uppercase tracking-[0.24em] text-[#b7ff63]/70">Game Description</div>
                                    <div className="mt-1 text-2xl font-black tracking-[-0.045em]">Description text</div>
                                </div>

                                <Field label="Description" error={gameErrors['game.description']}>
                                    <TextArea value={gameForm.description} onChange={(event) => updateGameForm({ description: event.target.value })} placeholder="No description saved yet." className="min-h-[260px]" />
                                </Field>
                            </div>
                        )}
                    </div>

                    <div className="mt-6 flex justify-between gap-3 border-t border-white/10 pt-5">
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-white/35">
                            {platformDevicesChanged() ? 'Platform/device changes will be saved too.' : 'All tabs save from here.'}
                        </div>
                        <div className="flex gap-3">
                            <button type="button" onClick={close} className="rounded-[18px] bg-white/10 px-6 py-4 text-sm font-black uppercase tracking-[0.14em] text-white">Cancel</button>
                            <button type="button" onClick={submitGameEdit} disabled={savingGame || savingPlatformDevices} className="flex items-center gap-2 rounded-[18px] bg-[#b7ff63] px-6 py-4 text-sm font-black uppercase tracking-[0.14em] text-black disabled:opacity-50">
                                <Save size={18} /> {savingGame || savingPlatformDevices ? 'Saving' : 'Save'}
                            </button>
                        </div>
                    </div>

                    {pendingGameStatusId && (
                        <div className="absolute inset-0 grid place-items-center rounded-[38px] bg-black/70 px-5">
                            <section className="w-full max-w-md rounded-[28px] bg-white p-6 text-black shadow-[0_30px_90px_rgb(0_0_0/0.45)]">
                                <div className="text-xs font-black uppercase tracking-[0.24em] text-black/35">Completion date</div>
                                <h3 className="mt-2 text-3xl font-black tracking-[-0.05em]">When did you finish it?</h3>
                                <p className="mt-3 text-sm font-bold text-black/50">Today is filled in automatically. Change it if needed.</p>
                                <input
                                    value={gameCompletionDateDraft}
                                    onChange={(event) => setGameCompletionDateDraft(event.target.value)}
                                    type="date"
                                    className="mt-5 h-12 w-full rounded-2xl border border-black/10 bg-[#f4f5ef] px-4 text-sm font-black text-black outline-none focus:border-black"
                                />
                                <div className="mt-6 flex justify-end gap-3">
                                    <button type="button" onClick={() => setPendingGameStatusId(null)} className="rounded-2xl bg-black/5 px-5 py-3 text-sm font-black text-black/55">Cancel</button>
                                    <button type="button" onClick={applyGameCompletedStatus} className="rounded-2xl bg-black px-5 py-3 text-sm font-black text-white">Apply</button>
                                </div>
                            </section>
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}
