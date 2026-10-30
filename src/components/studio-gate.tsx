'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Construction } from 'lucide-react';

type Role = 'admin' | 'member';

export type StudioTools = {
  watermark: boolean;
  mockups: boolean;
  seo: boolean;
};

type StudioState = {
  ready: boolean;
  role: Role | null;
  maintenance: boolean;
  tools: StudioTools;
};

const defaultTools: StudioTools = { watermark: true, mockups: true, seo: true };

const StudioContext = createContext<StudioState>({
  ready: false,
  role: null,
  maintenance: false,
  tools: defaultTools,
});

export function useStudio() {
  return useContext(StudioContext);
}

const toolRoutes = [
  { href: '/', key: 'watermark' as const },
  { href: '/create', key: 'mockups' as const },
  { href: '/seo', key: 'seo' as const },
];

function isAuthPath(pathname: string) {
  return pathname === '/login' || pathname === '/register';
}

export function StudioGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [state, setState] = useState<StudioState>({
    ready: false,
    role: null,
    maintenance: false,
    tools: defaultTools,
  });

  useEffect(() => {
    let cancel = false;

    async function load() {
      try {
        const response = await fetch('/api/auth/me', { cache: 'no-store' });
        if (cancel) return;
        if (response.status === 401 && !isAuthPath(pathname)) {
          await new Promise((resolve) => window.setTimeout(resolve, 400));
          if (cancel) return;
          const again = await fetch('/api/auth/me', { cache: 'no-store' });
          if (cancel) return;
          if (again.ok) {
            const data = (await again.json()) as {
              role?: Role;
              maintenance?: boolean;
              tools?: StudioTools;
            };
            setState({
              ready: true,
              role: data.role === 'admin' || data.role === 'member' ? data.role : null,
              maintenance: Boolean(data.maintenance),
              tools: {
                watermark: data.tools?.watermark !== false,
                mockups: data.tools?.mockups !== false,
                seo: data.tools?.seo !== false,
              },
            });
            return;
          }
          if (again.status === 401) {
            await fetch('/api/auth/logout', { method: 'POST' });
            if (!cancel) {
              router.replace('/login');
              router.refresh();
            }
            setState((current) => ({ ...current, ready: true, role: null }));
          }
          return;
        }
        if (!response.ok) return;
        const data = (await response.json()) as {
          role?: Role;
          maintenance?: boolean;
          tools?: StudioTools;
        };
        if (cancel) return;
        setState({
          ready: true,
          role: data.role === 'admin' || data.role === 'member' ? data.role : null,
          maintenance: Boolean(data.maintenance),
          tools: {
            watermark: data.tools?.watermark !== false,
            mockups: data.tools?.mockups !== false,
            seo: data.tools?.seo !== false,
          },
        });
      } catch {
        if (!cancel) setState((current) => ({ ...current, ready: true }));
      }
    }

    void load();
    const timer = window.setInterval(() => void load(), 3000);
    return () => {
      cancel = true;
      window.clearInterval(timer);
    };
  }, [pathname, router]);

  const blockedTool = useMemo(() => {
    if (state.role === 'admin') return null;
    return toolRoutes.find((tool) => {
      const active = tool.href === '/' ? pathname === '/' : pathname.startsWith(tool.href);
      return active && !state.tools[tool.key];
    });
  }, [pathname, state.role, state.tools]);

  useEffect(() => {
    if (!state.ready || state.role === 'admin' || !blockedTool || state.maintenance) return;
    const next = toolRoutes.find((tool) => state.tools[tool.key]);
    if (next) router.replace(next.href);
  }, [blockedTool, router, state.maintenance, state.ready, state.role, state.tools]);

  const memberLocked =
    state.ready &&
    state.role === 'member' &&
    state.maintenance &&
    !isAuthPath(pathname) &&
    !pathname.startsWith('/admin');

  const noPages =
    state.ready &&
    state.role === 'member' &&
    !state.maintenance &&
    blockedTool &&
    !toolRoutes.some((tool) => state.tools[tool.key]);
  const hideHiddenPage = state.ready && state.role === 'member' && !state.maintenance && Boolean(blockedTool);

  return (
    <StudioContext.Provider value={state}>
      {memberLocked || noPages ? (
        <MaintenanceScreen maintenance={state.maintenance} />
      ) : hideHiddenPage ? null : (
        children
      )}
    </StudioContext.Provider>
  );
}

function MaintenanceScreen({ maintenance }: { maintenance: boolean }) {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-[#f6f7f4] px-6 text-zinc-900">
      <section className="w-full max-w-md rounded-[28px] border border-white bg-white p-8 text-center shadow-[0_24px_80px_-32px_rgba(6,78,59,0.35)]">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
          <Construction className="h-6 w-6" />
        </div>
        <h1 className="mt-4 font-display text-2xl font-extrabold tracking-tight">
          {maintenance ? 'Studio is under maintenance' : 'No pages are available'}
        </h1>
        <p className="mt-2 text-sm leading-6 text-zinc-500">
          {maintenance
            ? 'An admin has paused the studio. Please check back soon.'
            : 'An admin has turned off every page. Please check back soon.'}
        </p>
      </section>
    </div>
  );
}
