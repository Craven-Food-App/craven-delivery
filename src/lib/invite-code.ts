/**
 * Generate a unique invite access code in format: CRV-XXXX-XXXX-XXXX
 */
export function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude confusing chars (0,O,1,I)
  const segments = 3;
  const segmentLength = 4;
  
  const parts: string[] = [];
  for (let i = 0; i < segments; i++) {
    let segment = '';
    for (let j = 0; j < segmentLength; j++) {
      segment += chars[Math.floor(Math.random() * chars.length)];
    }
    parts.push(segment);
  }
  
  return `CRV-${parts.join('-')}`;
}










