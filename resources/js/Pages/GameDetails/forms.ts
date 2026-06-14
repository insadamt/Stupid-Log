import { GameCardData, ReferenceData } from '../../types';
import { GameEditForm, OwnershipCopyDetails, OwnershipForm } from './types';

export function formFromCopy(copy?: OwnershipCopyDetails, fallbackTypeId?: number): OwnershipForm {
    return {
        ownership_type_id: String(copy?.ownership_type_id ?? fallbackTypeId ?? ''),
        physical_status_id: String(copy?.physical_status_id ?? ''),
        edition_name: copy?.edition_name ?? '',
        base_price: copy?.base_price === null || copy?.base_price === undefined ? '' : String(copy.base_price),
        purchased_price: copy?.purchased_price === null || copy?.purchased_price === undefined ? '' : String(copy.purchased_price),
        purchased_at: copy?.purchased_at ?? '',
    };
}

export function gameEditFormFromGame(libraryGame: GameCardData, references: ReferenceData): GameEditForm {
    return {
        title: libraryGame.title,
        publisher: libraryGame.publisher ?? '',
        description: libraryGame.description ?? '',
        cover_path: libraryGame.cover_path ?? '',
        cover_preview: libraryGame.cover_url ?? '',
        base_price_default: libraryGame.base_price_default === null || libraryGame.base_price_default === undefined ? '' : String(libraryGame.base_price_default),
        total_achievements: libraryGame.total_achievements ? String(libraryGame.total_achievements) : '',
        status_id: String(references.statuses.find((status) => status.name === libraryGame.status)?.id ?? references.statuses[0]?.id ?? ''),
        playtime_hours: String(libraryGame.playtime_hours ?? 0),
        earned_achievements: String(libraryGame.earned_achievements ?? 0),
        first_played_at: libraryGame.first_played_at ?? '',
        last_played_at: libraryGame.last_played_at ?? '',
        completed_at: libraryGame.completed_at ?? '',
    };
}
