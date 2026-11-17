export const DELIVERY_NOTE_MAX_LENGTH = 200;

export function normalizeDeliveryNote(note: string): string | undefined {
  const trimmedNote = note.trim();
  return trimmedNote.length > 0 ? trimmedNote : undefined;
}

export function validateDeliveryNote(note: string): string | undefined {
  const normalizedNote = note.trim();

  if (normalizedNote.length > DELIVERY_NOTE_MAX_LENGTH) {
    return `Delivery note must be ${DELIVERY_NOTE_MAX_LENGTH} characters or fewer.`;
  }

  return undefined;
}
