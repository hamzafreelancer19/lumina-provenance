import { authorizeTool, type StudioTool } from '@/lib/access';

export const runtime = 'nodejs';

const TOOLS: StudioTool[] = ['watermark', 'mockups', 'seo', 'keywords'];

export async function GET(request: Request) {
  const tool = new URL(request.url).searchParams.get('tool');
  if (!tool || !TOOLS.includes(tool as StudioTool)) {
    return Response.json({ error: 'Unknown tool.' }, { status: 400 });
  }
  const result = await authorizeTool(request, tool as StudioTool);
  if (result.response) return result.response;
  return Response.json({ ok: true });
}
