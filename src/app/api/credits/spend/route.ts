import { NextResponse } from 'next/server';
import { authorizeTool } from '@/lib/access';
import { WATERMARK_CREDIT_COST } from '@/lib/credit-policy';
import { logActivity, spendWatermarkCredit } from '@/lib/store';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const result = await authorizeTool(request, 'watermark');
  if (result.response) return result.response;

  if (result.user.role === 'admin') {
    await logActivity(result.user.username, 'watermark', 'Admin removed watermark · unlimited credits');
    return NextResponse.json({ unlimited: true });
  }

  const { user, spent } = await spendWatermarkCredit(result.user.id);
  if (!spent) {
    return NextResponse.json(
      { error: `Not enough credits. You need ${WATERMARK_CREDIT_COST} credits per image.`, credits: user.credits },
      { status: 402 },
    );
  }

  await logActivity(result.user.username, 'watermark', `Removed watermark · ${WATERMARK_CREDIT_COST} credits used`);
  return NextResponse.json({
    credits: user.credits,
    dailyCreditsRemaining: user.dailyCreditsRemaining,
    bonusCredits: user.bonusCredits,
  });
}
