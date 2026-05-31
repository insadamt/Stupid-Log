import { Check } from "lucide-react";
import Pill from "../components/Pill";
import TextInput from "../components/TextInput";
import { Draft } from "../types";

export default function DevicesStep({
    selectedDevices,
    deviceQuery,
    setDeviceQuery,
    filteredDevices,
    toggleDevice,
    draft,
}: {
    selectedDevices: string[];
    deviceQuery: string;
    setDeviceQuery: (value: string) => void;
    filteredDevices: Array<{ id: number; name: string }>;
    toggleDevice: (deviceId: number) => void;
    draft: Draft;
}) {
    return (
                                        <div className="grid gap-6"><div><div className="text-xs font-black uppercase tracking-[0.28em] text-black/35">Devices</div><h3 className="mt-1 text-4xl font-black tracking-[-0.06em]">Where can you play it?</h3></div><div className="rounded-[28px] border border-black/10 bg-white/70 p-4"><div className="mb-4 flex flex-wrap gap-2">{selectedDevices.length ? selectedDevices.map((name) => <Pill key={name} active>{name}</Pill>) : <Pill muted>No device selected</Pill>}</div><TextInput value={deviceQuery} onChange={(event) => setDeviceQuery(event.target.value)} placeholder="Search devices..." /></div><div className="grid max-h-[500px] gap-2 overflow-y-auto rounded-[28px] border border-black/10 bg-white/70 p-3">{filteredDevices.map((device) => <button key={device.id} type="button" onClick={() => toggleDevice(device.id)} className={`flex items-center justify-between rounded-2xl px-5 py-4 text-left text-base font-black transition ${draft.device_ids.includes(device.id) ? "bg-black text-white" : "bg-white text-black hover:bg-black/5"}`}><span>{device.name}</span>{draft.device_ids.includes(device.id) && <Check size={18} />}</button>)}</div></div>
    );
}
