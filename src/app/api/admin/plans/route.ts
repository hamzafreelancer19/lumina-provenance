import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/access';
import { listCreditPlans, logActivity, saveCreditPlan, setCreditPlanActive } from '@/lib/store';

export const runtime = 'nodejs';

type PlanBody = {
  id?: string;
  name: string;
  credits: number;
  price: number;
  description: string;
  active: boolean;
  popular: boolean;
};

function isPlanBody(value: Record<string, unknown>): value is PlanBody {
  return (
    (value.id === undefined || typeof value.id === 'string') &&
    typeof value.name === 'string' &&
    typeof value.credits === 'number' &&
    typeof value.price === 'number' &&
    typeof value.description === 'string' &&
    typeof value.active === 'boolean' &&
    typeof value.popular === 'boolean'
  );
}

export async function GET(request: Request) {
  const result = await requireAdmin(request);
  if (result.response) return result.response;
  return NextResponse.json({ plans: await listCreditPlans() });
}

export async function POST(request: Request) {
  const result = await requireAdmin(request);
  if (result.response) return result.response;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'The request could not be read.' }, { status: 400 });
  }
  if (!isPlanBody(body)) {
    return NextResponse.json({ error: 'Enter a plan name, credit amount, price, description, and status.' }, { status: 400 });
  }

  try {
    const plan = await saveCreditPlan({
      id: body.id,
      name: body.name,
      credits: body.credits,
      price: body.price,
      description: body.description,
      active: body.active,
      popular: body.popular,
    });
    await logActivity(result.user.username, 'plan.update', `${body.id ? 'Updated' : 'Created'} ${plan.name} credit plan`);
    return NextResponse.json({ plan });
  } catch (reason) {
    return NextResponse.json(
      { error: reason instanceof Error ? reason.message : 'Could not save this plan.' },
      { status: 400 },
    );
  }
}

export async function PATCH(request: Request) {
  const result = await requireAdmin(request);
  if (result.response) return result.response;

  let body: { id?: unknown; active?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'The request could not be read.' }, { status: 400 });
  }
  if (typeof body.id !== 'string' || typeof body.active !== 'boolean') {
    return NextResponse.json({ error: 'Choose a plan and active status.' }, { status: 400 });
  }

  try {
    const plan = await setCreditPlanActive(body.id, body.active);
    await logActivity(result.user.username, 'plan.update', `${body.active ? 'Activated' : 'Deactivated'} ${plan.name} credit plan`);
    return NextResponse.json({ plan });
  } catch (reason) {
    return NextResponse.json(
      { error: reason instanceof Error ? reason.message : 'Could not update this plan.' },
      { status: 400 },
    );
  }
}
