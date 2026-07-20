// Kullanici istegi: begen/begenme ya da emoji tepkisi ozetleme -
// hem mesajlar hem havuz sorulari icin ortak kullanilir. Her emoji
// icin toplam sayi + bu kullanicinin kendi (varsa) tepkisi doner.
export interface ReactionRow {
  emoji: string;
  userId: string;
}

export interface ReactionSummary {
  counts: Record<string, number>;
  myReaction: string | null;
}

export function summarizeReactions(
  reactions: ReactionRow[],
  requestingUserId?: string
): ReactionSummary {
  const counts: Record<string, number> = {};
  let myReaction: string | null = null;

  for (const r of reactions) {
    counts[r.emoji] = (counts[r.emoji] ?? 0) + 1;
    if (requestingUserId && r.userId === requestingUserId) {
      myReaction = r.emoji;
    }
  }

  return { counts, myReaction };
}
