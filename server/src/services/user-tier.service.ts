export type UserTier = 'free' | 'paid';

export async function getUserTier(_userId: string): Promise<UserTier> {
  return 'free';
}
