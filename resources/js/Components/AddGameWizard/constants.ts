import { OwnedDlcDraft, StepKey } from "./types";

export const steps: Array<{ key: StepKey; label: string }> = [
    { key: "search", label: "Search" },
    { key: "basics", label: "Basics" },
    { key: "steam", label: "Steam" },
    { key: "platform", label: "Platform" },
    { key: "devices", label: "Devices" },
    { key: "ownership", label: "Ownership" },
    { key: "dlcs", label: "DLCs" },
    { key: "progress", label: "Progress" },
    { key: "review", label: "Review" },
];

export const physicalLike = ["Physical", "Pre-owned", "Borrowed"];
export const dlcAcquisitionTypes: OwnedDlcDraft["acquisition_type"][] = ["Owned", "Edition Included", "Free"];
