import { authorizeTool } from '@/lib/access';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const tool = new URL(request.url).searchParams.get('tool');
  if (tool !== 'watermark' && tool !== 'mockups' && tool !== 'seo') {
    return Response.json({ error: 'Unknown tool.' }, { status: 400 });
  }
  const result = await authorizeTool(request, tool);
  if (result.response) return result.response;
  return Response.json({ ok: true });
}
