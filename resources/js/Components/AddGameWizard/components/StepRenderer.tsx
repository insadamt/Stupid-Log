import { Dispatch, ReactNode, RefObject, SetStateAction } from "react";
import { ReferenceData } from "../../../types";
import BasicsStep from "../steps/BasicsStep";
import DevicesStep from "../steps/DevicesStep";
import DlcsStep from "../steps/DlcsStep";
import OwnershipStep from "../steps/OwnershipStep";
import PlatformStep from "../steps/PlatformStep";
import ProgressStep from "../steps/ProgressStep";
import ReviewStep from "../steps/ReviewStep";
import SearchStep from "../steps/SearchStep";
import SteamStep from "../steps/SteamStep";
import { DlcCatalogItem, Draft, OwnedDlcDraft, OwnershipCopyDraft, ProviderMode, SteamDlcData, SteamEnrichmentState, StepKey, WizardSearchResult } from "../types";
import ServerErrors from "./ServerErrors";

export default function StepRenderer({
    step,
    providerMode,
    setProviderMode,
    searchQuery,
    setSearchQuery,
    selectedResultKey,
    update,
    runSearch,
    searching,
    warnings,
    results,
    manualEntry,
    resultKey,
    selectResult,
    enrichmentState,
    dlcSummary,
    retryMetadata,
    retryAchievements,
    loadLargeDlcCatalog,
    deferDlcCatalog,
    coverPreview,
    coverInputRef,
    uploadCover,
    uploadingCover,
    providerCoverUrl,
    draft,
    localCoverPreview,
    setLocalCoverPreview,
    setDraft,
    coverError,
    resetButtons,
    platformQuery,
    setPlatformQuery,
    filteredPlatforms,
    choosePlatform,
    selectedDevices,
    deviceQuery,
    setDeviceQuery,
    filteredDevices,
    toggleDevice,
    platform,
    addCopy,
    removeCopy,
    ownershipById,
    updateCopy,
    references,
    dlcQuery,
    setDlcQuery,
    ownedDlcCount,
    filteredDlcs,
    ownedDlcFor,
    removeOwnedDlc,
    updateOwnedDlc,
    availableStatuses,
    chooseStatus,
    statusPillStyle,
    hasAchievements,
    status,
    selectedOwnerships,
    serverErrors,
}: {
    step: { key: StepKey; label: string };
    providerMode: ProviderMode;
    setProviderMode: (mode: ProviderMode) => void;
    searchQuery: string;
    setSearchQuery: Dispatch<SetStateAction<string>>;
    selectedResultKey: string;
    update: <K extends keyof Draft>(key: K, value: Draft[K]) => void;
    runSearch: (queryInput?: string, provider?: ProviderMode) => Promise<void>;
    searching: boolean;
    warnings: string[];
    results: WizardSearchResult[];
    manualEntry: () => void;
    resultKey: (result: WizardSearchResult) => string;
    selectResult: (result: WizardSearchResult) => Promise<void>;
    enrichmentState: SteamEnrichmentState;
    dlcSummary: SteamDlcData | null;
    retryMetadata: () => Promise<void>;
    retryAchievements: () => Promise<void>;
    loadLargeDlcCatalog: () => Promise<void>;
    deferDlcCatalog: () => void;
    coverPreview: string;
    coverInputRef: RefObject<HTMLInputElement | null>;
    uploadCover: (file: File) => Promise<void>;
    uploadingCover: boolean;
    providerCoverUrl: string;
    draft: Draft;
    localCoverPreview: string;
    setLocalCoverPreview: Dispatch<SetStateAction<string>>;
    setDraft: Dispatch<SetStateAction<Draft>>;
    coverError: string;
    resetButtons: ReactNode;
    platformQuery: string;
    setPlatformQuery: Dispatch<SetStateAction<string>>;
    filteredPlatforms: ReferenceData["platforms"];
    choosePlatform: (platformId: number) => void;
    selectedDevices: string[];
    deviceQuery: string;
    setDeviceQuery: Dispatch<SetStateAction<string>>;
    filteredDevices: ReferenceData["devices"];
    toggleDevice: (deviceId: number) => void;
    platform: ReferenceData["platforms"][number] | undefined;
    addCopy: (ownershipTypeId?: number) => void;
    removeCopy: (localIdValue: string) => void;
    ownershipById: Map<number, string>;
    updateCopy: (localIdValue: string, patch: Partial<OwnershipCopyDraft>) => void;
    references: ReferenceData;
    dlcQuery: string;
    setDlcQuery: Dispatch<SetStateAction<string>>;
    ownedDlcCount: number;
    filteredDlcs: DlcCatalogItem[];
    ownedDlcFor: (steamAppId: string) => OwnedDlcDraft | undefined;
    removeOwnedDlc: (steamAppId: string) => void;
    updateOwnedDlc: (steamAppId: string, patch: Partial<OwnedDlcDraft>) => void;
    availableStatuses: ReferenceData["statuses"];
    chooseStatus: (statusId: number) => void;
    statusPillStyle: (input: { status: string; status_color_hex?: string | null }) => React.CSSProperties;
    hasAchievements: boolean;
    status: ReferenceData["statuses"][number] | undefined;
    selectedOwnerships: string[];
    serverErrors: Record<string, string>;
}) {
    return (
        <>
                                {step.key === "search" && (
                                    <SearchStep providerMode={providerMode} setProviderMode={setProviderMode} searchQuery={searchQuery} setSearchQuery={setSearchQuery} selectedResultKey={selectedResultKey} update={update} runSearch={runSearch} searching={searching} warnings={warnings} results={results} manualEntry={manualEntry} resultKey={resultKey} selectResult={selectResult} />
                                )}

                                    {step.key === "basics" && (
                                        <BasicsStep enrichmentStatus={enrichmentState.metadata} retryMetadata={retryMetadata} coverPreview={coverPreview} coverInputRef={coverInputRef} uploadCover={uploadCover} uploadingCover={uploadingCover} providerCoverUrl={providerCoverUrl} draft={draft} localCoverPreview={localCoverPreview} setLocalCoverPreview={setLocalCoverPreview} setDraft={setDraft} coverError={coverError} update={update} />
                                    )}

                                    {step.key === "steam" && (
                                        <SteamStep enrichmentStatus={enrichmentState.achievements} retryAchievements={retryAchievements} draft={draft} update={update} resetButtons={resetButtons} />
                                    )}

                                    {step.key === "platform" && (
                                        <PlatformStep platformQuery={platformQuery} setPlatformQuery={setPlatformQuery} filteredPlatforms={filteredPlatforms} draft={draft} choosePlatform={choosePlatform} />
                                    )}

                                    {step.key === "devices" && (
                                        <DevicesStep selectedDevices={selectedDevices} deviceQuery={deviceQuery} setDeviceQuery={setDeviceQuery} filteredDevices={filteredDevices} toggleDevice={toggleDevice} draft={draft} />
                                    )}

                                    {step.key === "ownership" && (
                                        <OwnershipStep platform={platform} draft={draft} addCopy={addCopy} removeCopy={removeCopy} ownershipById={ownershipById} updateCopy={updateCopy} references={references} />
                                    )}

                                    {step.key === "dlcs" && (
                                        <DlcsStep enrichmentStatus={enrichmentState.dlcs} dlcSummary={dlcSummary} loadLargeDlcCatalog={loadLargeDlcCatalog} deferDlcCatalog={deferDlcCatalog} draft={draft} dlcQuery={dlcQuery} setDlcQuery={setDlcQuery} ownedDlcCount={ownedDlcCount} filteredDlcs={filteredDlcs} ownedDlcFor={ownedDlcFor} removeOwnedDlc={removeOwnedDlc} updateOwnedDlc={updateOwnedDlc} />
                                    )}

                                    {step.key === "progress" && (
                                        <ProgressStep availableStatuses={availableStatuses} chooseStatus={chooseStatus} draft={draft} statusPillStyle={statusPillStyle} update={update} hasAchievements={hasAchievements} status={status} />
                                    )}

                                    {step.key === "review" && <ReviewStep draft={draft} platform={platform} selectedDevices={selectedDevices} selectedOwnerships={selectedOwnerships} ownedDlcCount={ownedDlcCount} status={status} statusPillStyle={statusPillStyle} coverPreview={coverPreview} />}

                                    <ServerErrors serverErrors={serverErrors} />
        </>
    );
}
