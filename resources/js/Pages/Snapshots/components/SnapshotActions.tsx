import { Check, RefreshCw, Trash2 } from 'lucide-react';
import { SnapshotDetailsData } from '../../../types';
import ManagerButton from './ManagerButton';

export default function SnapshotActions({
    selectedSnapshot,
    resnap,
    resnapping,
    confirm,
    confirming,
    destroy,
    deleting,
}: {
    selectedSnapshot: SnapshotDetailsData;
    resnap: (snapshot: SnapshotDetailsData) => void;
    resnapping: boolean;
    confirm: (snapshot: SnapshotDetailsData) => void;
    confirming: boolean;
    destroy: (snapshot: SnapshotDetailsData) => void;
    deleting: boolean;
}) {
    return (
        <div className="flex shrink-0 flex-wrap justify-end gap-2">
            {selectedSnapshot.status === 'draft' && (
                <ManagerButton onClick={() => resnap(selectedSnapshot)} disabled={resnapping} tone="ghost">
                    <RefreshCw size={16} strokeWidth={3} />
                    {resnapping ? 'Resnapping' : 'Resnap'}
                </ManagerButton>
            )}
            {selectedSnapshot.status === 'draft' && (
                <ManagerButton onClick={() => confirm(selectedSnapshot)} disabled={confirming} tone="green">
                    <Check size={16} strokeWidth={3} />
                    {confirming ? 'Saving' : 'Save Year'}
                </ManagerButton>
            )}
            <ManagerButton onClick={() => destroy(selectedSnapshot)} disabled={deleting} tone="danger">
                <Trash2 size={16} strokeWidth={3} />
                Delete
            </ManagerButton>
        </div>
    );
}
