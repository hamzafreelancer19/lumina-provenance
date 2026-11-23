'use client';

import { FormEvent, type ReactNode, useCallback, useEffect, useState } from 'react';
import {
  Activity as ActivityIcon,
  CheckCircle2,
  Cloud,
  CreditCard,
  ExternalLink,
  KeyRound,
  Layers3,
  LayoutDashboard,
  Loader2,
  Mail,
  ScrollText,
  Settings,
  Shield,
  Sparkles,
  UserPlus,
  Users,
  XCircle,
} from 'lucide-react';

type Role = 'admin' | 'member';
type Section = 'overview' | 'users' | 'plans' | 'payments' | 'contacts' | 'activity' | 'settings';
type CreditPlan = {
  id: string;
  name: string;
  credits: number;
  price: number;
  description: string;
  active: boolean;
  popular: boolean;
  paymentMethodName?: string;
  paymentRecipientName?: string;
  paymentAccountNumber?: string;
  paymentQrImageUrl?: string;
};

type UserTools = {
  watermark: boolean;
  mockups: boolean;
  seo: boolean;
  keywords: boolean;
};

type PublicUser = {
  id: string;
  username: string;
  displayName: string;
  role: Role;
  disabled: boolean;
  tools: UserTools;
  credits: number;
  dailyCreditsRemaining: number;
  bonusCredits: number;
  unlimitedCredits: boolean;
  createdAt: number;
  lastLoginAt: number | null;
};

const defaultTools = (): UserTools => ({
  watermark: true,
  mockups: true,
  seo: true,
  keywords: true,
});

const toolLabels: { id: keyof UserTools; label: string }[] = [
  { id: 'watermark', label: 'Watermark' },
  { id: 'mockups', label: 'Mockups' },
  { id: 'seo', label: 'Listing SEO' },
  { id: 'keywords', label: 'Keywords' },
];

type Activity = {
  id: string;
  at: number;
  username: string;
  action: string;
  detail: string;
};

type StudioSettings = {
  studioName: string;
  watermarkEnabled: boolean;
  mockupsEnabled: boolean;
  seoEnabled: boolean;
  keywordsEnabled: boolean;
  registrationEnabled: boolean;
  maintenanceMode: boolean;
};

type PaymentConfig = {
  paymentMethodName: string;
  paymentRecipientName: string;
  paymentAccountNumber: string;
  paymentQrImageUrl: string;
};

type PaymentRequest = {
  id: string;
  userId: string;
  username: string;
  planId: string;
  planName: string;
  credits: number;
  amount: number;
  transactionId: string;
  proofFileName: string | null;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: number;
  reviewedAt: number | null;
  reviewedBy: string | null;
};

type ApiKeyStatus = {
  configured: boolean;
  source: 'panel' | 'environment' | 'none';
  hint: string;
};

type ContactReport = {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  createdAt: number;
  status: 'unread' | 'read';
};

type GroqApiKeySummary = {
  id: string;
  hint: string;
  source: 'panel' | 'environment';
};

type Overview = {
  me: { id: string; username: string };
  users: PublicUser[];
  activity: Activity[];
  settings: StudioSettings;
  paymentConfig: PaymentConfig;
  plans: CreditPlan[];
  paymentRequests: PaymentRequest[];
  contactReports?: ContactReport[];
  stats: {
    users: number;
    active: number;
    admins: number;
    events24h: number;
    logins24h: number;
    watermark: number;
    mockups: number;
    seo: number;
    keywords: number;
  };
  groq?: ApiKeyStatus;
  groqKeys: GroqApiKeySummary[];
  cloudflare?: ApiKeyStatus;
};

const nav: { id: Section; label: string; icon: typeof LayoutDashboard; hint: string }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard, hint: 'Studio pulse' },
  { id: 'users', label: 'Users', icon: Users, hint: 'Access & tools' },
  { id: 'plans', label: 'Plans', icon: Layers3, hint: 'Credit packages' },
  { id: 'payments', label: 'Payments', icon: CreditCard, hint: 'Review purchases' },
  { id: 'contacts', label: 'Contact', icon: Mail, hint: 'View messages' },
  { id: 'activity', label: 'Activity', icon: ScrollText, hint: 'Recent events' },
  { id: 'settings', label: 'Settings', icon: Settings, hint: 'Keys & pages' },
];

const actionLabel: Record<string, string> = {
  login: 'Sign in',
  logout: 'Sign out',
  watermark: 'Watermark',
  mockups: 'Mockups',
  seo: 'SEO',
  keywords: 'Keywords',
  register: 'Registered',
  'user.create': 'User added',
  'user.update': 'User updated',
  'user.delete': 'User removed',
  'credits.add': 'Credits added',
  'credits.unlimited': 'Unlimited credits',
  'profile.update': 'Profile updated',
  'payment.approved': 'Payment approved',
  'payment.rejected': 'Payment rejected',
  'plan.update': 'Credit plan updated',
  'settings.update': 'Settings',
};

function when(value: number | null) {
  if (!value) return 'Never';
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(value);
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase();
}

async function readError(response: Response) {
  const data = (await response.json().catch(() => null)) as { error?: string } | null;
  return data?.error || 'Something went wrong.';
}

function Panel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl border border-zinc-200/80 bg-white/90 shadow-[0_18px_40px_-34px_rgba(24,24,27,0.55)] backdrop-blur-sm ${className}`}
    >
      {children}
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  disabled = false,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition ${
        checked ? 'bg-emerald-600' : 'bg-zinc-300'
      } disabled:cursor-not-allowed disabled:opacity-50`}
    >
      <span
        className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

function KeyBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
        ok
          ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
          : 'border-amber-200 bg-amber-50 text-amber-900'
      }`}
    >
      {ok ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
      {label}
    </span>
  );
}

export function AdminPanel() {
  const [section, setSection] = useState<Section>('overview');
  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    const response = await fetch('/api/admin/overview');
    if (!response.ok) throw new Error(await readError(response));
    setData((await response.json()) as Overview);
  }, []);

  useEffect(() => {
    let cancel = false;
    load()
      .catch((reason) => {
        if (!cancel) setError(reason instanceof Error ? reason.message : 'Could not load the admin panel.');
      })
      .finally(() => {
        if (!cancel) setLoading(false);
      });
    return () => {
      cancel = true;
    };
  }, [load]);

  async function refresh() {
    setError('');
    try {
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not refresh.');
    }
  }

  const activeNav = nav.find((item) => item.id === section);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-6 sm:px-6 lg:flex-row lg:gap-7 lg:py-8">
      <aside className="lg:sticky lg:top-20 lg:w-60 lg:shrink-0 lg:self-start">
        <Panel className="overflow-hidden p-2">
          <div className="rounded-xl bg-gradient-to-br from-zinc-900 via-zinc-900 to-emerald-950 px-3.5 py-4 text-white">
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-300/90">
              Control
            </p>
            <h1 className="mt-1 font-display text-xl font-extrabold tracking-tight">Admin</h1>
            <p className="mt-1 text-xs text-zinc-300">
              {data?.settings.studioName || 'Lumina Studio'}
            </p>
          </div>
          <nav className="mt-2 flex gap-1 overflow-x-auto p-1 lg:flex-col" aria-label="Admin">
            {nav.map((item) => {
              const Icon = item.icon;
              const active = section === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setSection(item.id);
                    setNotice('');
                    setError('');
                  }}
                  className={`flex min-w-[8.5rem] shrink-0 items-center gap-2.5 rounded-xl px-3 py-2.5 text-left transition lg:min-w-0 ${
                    active
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
                  }`}
                >
                  <Icon className={`h-4 w-4 shrink-0 ${active ? 'text-white' : 'text-zinc-400'}`} />
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold leading-tight">{item.label}</span>
                    <span className={`block text-[10px] ${active ? 'text-emerald-100' : 'text-zinc-400'}`}>
                      {item.hint}
                    </span>
                  </span>
                </button>
              );
            })}
          </nav>
        </Panel>
      </aside>

      <main className="min-w-0 flex-1 space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-700">
              {activeNav?.hint}
            </p>
            <h2 className="font-display text-2xl font-extrabold tracking-tight text-zinc-900 sm:text-3xl">
              {activeNav?.label}
            </h2>
          </div>
          {data && (
            <p className="rounded-full border border-zinc-200/80 bg-white/80 px-3 py-1 text-xs font-medium text-zinc-500">
              Signed in as <span className="font-semibold text-zinc-800">{data.me.username}</span>
            </p>
          )}
        </div>

        {error && (
          <p
            className="rounded-2xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700"
            role="alert"
          >
            {error}
          </p>
        )}
        {notice && (
          <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-sm text-emerald-800">
            {notice}
          </p>
        )}

        {loading || !data ? (
          <Panel className="flex h-56 items-center justify-center text-zinc-400">
            <Loader2 className="h-5 w-5 animate-spin" />
          </Panel>
        ) : section === 'overview' ? (
          <OverviewSection data={data} />
        ) : section === 'users' ? (
          <UsersSection data={data} onChange={refresh} onNotice={setNotice} onError={setError} />
        ) : section === 'payments' ? (
          <PaymentRequestsSection
            requests={data.paymentRequests}
            onChange={refresh}
            onNotice={setNotice}
            onError={setError}
          />
        ) : section === 'plans' ? (
          <CreditPlansSection
            plans={data.plans}
            onChange={refresh}
            onNotice={setNotice}
            onError={setError}
          />
        ) : section === 'activity' ? (
          <ActivitySection activity={data.activity} />
        ) : section === 'contacts' ? (
          <ContactReportsSection
            reports={data.contactReports || []}
            onChange={refresh}
            onNotice={setNotice}
            onError={setError}
          />
        ) : (
          <SettingsSection
            settings={data.settings}
            paymentConfig={data.paymentConfig}
            groq={data.groq || { configured: false, source: 'none', hint: 'Not configured' }}
            groqKeys={data.groqKeys}
            cloudflare={data.cloudflare || { configured: false, source: 'none', hint: 'Not configured' }}
            onChange={refresh}
            onNotice={setNotice}
            onError={setError}
          />
        )}
      </main>
    </div>
  );
}

function OverviewSection({ data }: { data: Overview }) {
  const cards = [
    { label: 'Users', value: data.stats.users, note: `${data.stats.active} active`, icon: Users },
    { label: 'Admins', value: data.stats.admins, note: 'Full access', icon: Shield },
    {
      label: 'Sign-ins · 24h',
      value: data.stats.logins24h,
      note: `${data.stats.events24h} events`,
      icon: ActivityIcon,
    },
    { label: 'Watermark', value: data.stats.watermark, note: 'Cleans logged', icon: Sparkles },
    { label: 'Mockups', value: data.stats.mockups, note: 'Image calls', icon: Cloud },
    { label: 'SEO', value: data.stats.seo, note: 'Listings written', icon: ScrollText },
    { label: 'Keywords', value: data.stats.keywords, note: 'Thumbnail reads', icon: KeyRound },
  ];

  return (
    <section className="space-y-4">
      <Panel className="flex flex-wrap items-center gap-2 px-4 py-3.5">
        <span className="mr-1 text-xs font-semibold text-zinc-500">API status</span>
        <KeyBadge ok={data.cloudflare?.configured === true} label="Cloudflare" />
        <KeyBadge ok={data.groq?.configured === true} label="Groq" />
        {data.settings.maintenanceMode && (
          <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-900">
            Maintenance on
          </span>
        )}
      </Panel>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <article
              key={card.label}
              className="rounded-2xl border border-zinc-200/80 bg-white/90 p-4 shadow-[0_14px_30px_-28px_rgba(24,24,27,0.5)]"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
                  {card.label}
                </p>
                <span className="rounded-lg bg-zinc-100 p-1.5 text-zinc-500">
                  <Icon className="h-3.5 w-3.5" />
                </span>
              </div>
              <p className="mt-3 font-display text-3xl font-extrabold tracking-tight text-zinc-900">
                {card.value}
              </p>
              <p className="mt-1 text-sm text-zinc-500">{card.note}</p>
            </article>
          );
        })}
      </div>

      <ActivitySection activity={data.activity.slice(0, 8)} compact />
    </section>
  );
}

function ContactReportsSection({
  reports,
  onChange,
  onNotice,
  onError,
}: {
  reports: ContactReport[];
  onChange: () => Promise<void>;
  onNotice: (value: string) => void;
  onError: (value: string) => void;
}) {
  async function markRead(id: string) {
    onError('');
    try {
      const response = await fetch('/api/admin/contact', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (!response.ok) throw new Error(await readError(response));
      onNotice('Message marked as read.');
      await onChange();
    } catch (reason) {
      onError(reason instanceof Error ? reason.message : 'Could not update the message.');
    }
  }

  return (
    <section className="space-y-3">
      <Panel className="p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="font-display text-lg font-extrabold tracking-tight text-zinc-900">Contact messages</h3>
            <p className="mt-1 text-xs text-zinc-500">Messages submitted from the Contact page.</p>
          </div>
          <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-[11px] font-bold text-zinc-500">
            {reports.filter((report) => report.status === 'unread').length} unread
          </span>
        </div>
      </Panel>

      {reports.length === 0 ? (
        <Panel className="px-5 py-12 text-center">
          <Mail className="mx-auto h-6 w-6 text-zinc-300" />
          <p className="mt-3 text-sm font-semibold text-zinc-700">No contact messages yet</p>
        </Panel>
      ) : (
        reports.map((report) => (
          <Panel key={report.id} className="p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="text-sm font-bold text-zinc-900">{report.name}</h4>
                  {report.status === 'unread' ? (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                      Unread
                    </span>
                  ) : (
                    <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                      Read
                    </span>
                  )}
                </div>
                <a className="mt-1 block text-xs text-emerald-700 hover:underline" href={`mailto:${report.email}`}>
                  {report.email}
                </a>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-zinc-400">{when(report.createdAt)}</span>
                <div className="flex items-center gap-2">
                  <a
                    href={`mailto:${report.email}?subject=${encodeURIComponent(`Re: ${report.subject}`)}&body=${encodeURIComponent(`Hi ${report.name},\n\n`)}`}
                    onClick={() => {
                      if (report.status === 'unread') void markRead(report.id);
                    }}
                    className="inline-flex rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-100"
                  >
                    Reply
                  </a>
                {report.status === 'unread' && (
                  <button
                    type="button"
                    onClick={() => markRead(report.id)}
                    className="rounded-lg border border-zinc-200 px-2.5 py-1.5 text-[11px] font-semibold text-zinc-600 hover:border-zinc-300 hover:text-zinc-900"
                  >
                    Mark read
                  </button>
                )}
                </div>
              </div>
            </div>
            <p className="mt-4 text-xs font-bold text-zinc-800">{report.subject}</p>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-zinc-600">{report.message}</p>
          </Panel>
        ))
      )}
    </section>
  );
}

function ActivitySection({ activity, compact = false }: { activity: Activity[]; compact?: boolean }) {
  return (
    <Panel className="p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-display text-lg font-extrabold tracking-tight">
          {compact ? 'Recent activity' : 'Activity'}
        </h3>
        <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-[11px] font-semibold text-zinc-500">
          {activity.length}
        </span>
      </div>
      {activity.length === 0 ? (
        <p className="mt-4 text-sm text-zinc-500">
          No activity yet. Sign-ins and tool use will show up here.
        </p>
      ) : (
        <ul className="mt-4 space-y-0">
          {activity.map((item, index) => (
            <li key={item.id} className="relative flex gap-3 pb-4 last:pb-0">
              {index < activity.length - 1 && (
                <span className="absolute top-3 bottom-0 left-[7px] w-px bg-zinc-200" />
              )}
              <span className="relative z-10 mt-1.5 h-3.5 w-3.5 shrink-0 rounded-full border-2 border-white bg-emerald-500 shadow-sm" />
              <div className="min-w-0 flex-1 rounded-xl border border-zinc-100 bg-zinc-50/70 px-3 py-2.5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-sm font-semibold text-zinc-900">
                    {actionLabel[item.action] || item.action}
                    <span className="font-normal text-zinc-500"> · {item.username}</span>
                  </p>
                  <time className="text-[11px] text-zinc-400">{when(item.at)}</time>
                </div>
                <p className="mt-0.5 text-sm text-zinc-500">{item.detail}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

function UsersSection({
  data,
  onChange,
  onNotice,
  onError,
}: {
  data: Overview;
  onChange: () => Promise<void>;
  onNotice: (value: string) => void;
  onError: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PublicUser | null>(null);

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-xl text-sm text-zinc-500">
          Members use the tools you assign. Admins can open this panel and every page.
        </p>
        <button
          type="button"
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-zinc-900 px-3.5 text-sm font-semibold text-white transition hover:bg-zinc-800"
        >
          <UserPlus className="h-4 w-4" />
          Add user
        </button>
      </div>

      <Panel className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead className="border-b border-zinc-100 bg-zinc-50/90 text-[11px] uppercase tracking-wide text-zinc-400">
              <tr>
                <th className="px-4 py-3 font-semibold">User</th>
                <th className="px-4 py-3 font-semibold">Role</th>
                <th className="px-4 py-3 font-semibold">Tools</th>
                <th className="px-4 py-3 font-semibold">Credits</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Last sign-in</th>
                <th className="px-4 py-3 font-semibold" />
              </tr>
            </thead>
            <tbody>
              {data.users.map((user) => {
                const tools = user.tools || defaultTools();
                const assigned = toolLabels
                  .filter((tool) => user.role === 'admin' || tools[tool.id])
                  .map((tool) => tool.label);
                return (
                  <tr
                    key={user.id}
                    className="border-t border-zinc-100 transition hover:bg-emerald-50/40"
                  >
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-emerald-600 to-zinc-900 text-[11px] font-bold text-white">
                          {initials(user.displayName || user.username)}
                        </span>
                        <div>
                          <p className="font-semibold text-zinc-900">{user.displayName}</p>
                          <p className="text-xs text-zinc-500">@{user.username}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold ${
                          user.role === 'admin'
                            ? 'bg-emerald-50 text-emerald-800'
                            : 'bg-zinc-100 text-zinc-700'
                        }`}
                      >
                        {user.role === 'admin' && <Shield className="h-3 w-3" />}
                        {user.role}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex max-w-[220px] flex-wrap gap-1">
                        {user.role === 'admin' || user.unlimitedCredits ? (
                          <span className="rounded-md bg-zinc-100 px-1.5 py-0.5 text-[11px] font-medium text-zinc-600">
                            All tools
                          </span>
                        ) : assigned.length ? (
                          assigned.map((label) => (
                            <span
                              key={label}
                              className="rounded-md bg-zinc-100 px-1.5 py-0.5 text-[11px] font-medium text-zinc-600"
                            >
                              {label}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-zinc-400">None</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      {user.role === 'admin' ? (
                        <span className="font-semibold text-emerald-700">Unlimited</span>
                      ) : (
                        <>
                          <span className="font-semibold tabular-nums text-zinc-900">{user.credits}</span>
                          <span className="ml-1 text-xs text-zinc-500">total</span>
                        </>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
                          user.disabled ? 'text-red-600' : 'text-emerald-700'
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            user.disabled ? 'bg-red-500' : 'bg-emerald-500'
                          }`}
                        />
                        {user.disabled ? 'Disabled' : 'Active'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-zinc-500">{when(user.lastLoginAt)}</td>
                    <td className="px-4 py-3.5 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          setEditing(user);
                          setOpen(true);
                        }}
                        className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>

      {open && (
        <UserDialog
          user={editing}
          selfId={data.me.id}
          onClose={() => setOpen(false)}
          onSaved={async (message) => {
            setOpen(false);
            onNotice(message);
            await onChange();
          }}
          onError={onError}
        />
      )}
    </section>
  );
}

function UserDialog({
  user,
  selfId,
  onClose,
  onSaved,
  onError,
}: {
  user: PublicUser | null;
  selfId: string;
  onClose: () => void;
  onSaved: (message: string) => Promise<void>;
  onError: (value: string) => void;
}) {
  const [username, setUsername] = useState(user?.username || '');
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [password, setPassword] = useState('');
  const [creditsToAdd, setCreditsToAdd] = useState('');
  const [unlimitedCredits, setUnlimitedCredits] = useState(user?.unlimitedCredits || false);
  const [role, setRole] = useState<Role>(user?.role || 'member');
  const [disabled, setDisabled] = useState(user?.disabled || false);
  const [tools, setTools] = useState<UserTools>(user?.tools || defaultTools());
  const [pending, setPending] = useState(false);
  const isSelf = user?.id === selfId;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    onError('');
    try {
      const response = await fetch('/api/admin/users', {
        method: user ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          user
            ? {
                id: user.id,
                displayName,
                role,
                disabled,
                password,
                tools,
                creditsToAdd: Number(creditsToAdd || 0),
                ...(unlimitedCredits !== user.unlimitedCredits ? { unlimitedCredits } : {}),
              }
            : { username, displayName, role, password, tools },
        ),
      });
      if (!response.ok) throw new Error(await readError(response));
      await onSaved(
        user
          ? Number(creditsToAdd) > 0
            ? `User updated and ${creditsToAdd} bonus credits added.`
            : unlimitedCredits !== user.unlimitedCredits
              ? `Unlimited credits ${unlimitedCredits ? 'enabled' : 'disabled'}.`
              : 'User updated.'
          : 'User added. They can sign in now.',
      );
    } catch (reason) {
      onError(reason instanceof Error ? reason.message : 'Could not save the user.');
      setPending(false);
    }
  }

  async function onDelete() {
    if (!user || !window.confirm(`Delete ${user.username}? This cannot be undone.`)) return;
    setPending(true);
    onError('');
    try {
      const response = await fetch('/api/admin/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: user.id }),
      });
      if (!response.ok) throw new Error(await readError(response));
      await onSaved('User deleted.');
    } catch (reason) {
      onError(reason instanceof Error ? reason.message : 'Could not delete the user.');
      setPending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-zinc-950/50 p-4 backdrop-blur-[2px] sm:items-center">
      <form
        onSubmit={onSubmit}
        className="max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-2xl border border-zinc-200 bg-white shadow-2xl"
      >
        <div className="border-b border-zinc-100 bg-zinc-50 px-5 py-4">
          <h3 className="font-display text-xl font-extrabold tracking-tight">
            {user ? 'Edit user' : 'Add user'}
          </h3>
          <p className="mt-0.5 text-xs text-zinc-500">
            {user ? `@${user.username}` : 'Create a member or admin account'}
          </p>
        </div>
        <div className="space-y-3 px-5 py-4">
          {!user && (
            <Field label="Username" value={username} onChange={setUsername} autoComplete="off" />
          )}
          <Field label="Display name" value={displayName} onChange={setDisplayName} />
          <Field
            label={user ? 'New password' : 'Password'}
            value={password}
            onChange={setPassword}
            type="password"
            required={!user}
            placeholder={user ? 'Leave blank to keep the current password' : 'At least 8 characters'}
          />
          {user && role === 'admin' ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3">
              <p className="text-sm font-semibold text-emerald-900">Unlimited credits</p>
              <p className="mt-0.5 text-xs text-emerald-800">
                Admins can remove watermarks without a credit limit.
              </p>
            </div>
          ) : user && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3">
              <p className="text-sm font-semibold text-emerald-900">
                {unlimitedCredits ? 'Unlimited credits' : `${user.credits} credits available`}
              </p>
              <p className="mt-0.5 text-xs text-emerald-800">
                {user.bonusCredits} purchased, referral, or admin-granted credits. No automatic daily refill.
              </p>
              <div className="mt-3 flex items-center justify-between rounded-lg border border-emerald-100 bg-white px-3 py-2.5">
                <span className="text-sm font-medium text-zinc-700">Unlimited credits</span>
                <Toggle
                  label="Unlimited credits"
                  checked={unlimitedCredits}
                  onChange={setUnlimitedCredits}
                />
              </div>
              <label className="mt-3 block">
                <span className="mb-1.5 block text-xs font-semibold text-zinc-600">
                  Add bonus credits
                </span>
                <input
                  type="number"
                  min="0"
                  max="1000000"
                  step="1"
                  value={creditsToAdd}
                  onChange={(event) => setCreditsToAdd(event.target.value)}
                  placeholder="0"
                  className="h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-emerald-500"
                />
              </label>
            </div>
          )}
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-zinc-600">Role</span>
            <select
              value={role}
              onChange={(event) => setRole(event.target.value as Role)}
              disabled={isSelf}
              className="h-11 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-sm outline-none focus:border-emerald-500 focus:bg-white"
            >
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
          </label>
          {user && (
            <div className="flex items-center justify-between rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5">
              <span className="text-sm font-medium text-zinc-700">Disabled</span>
              <Toggle
                label="Disabled"
                checked={disabled}
                disabled={isSelf}
                onChange={setDisabled}
              />
            </div>
          )}
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
            <p className="text-xs font-semibold text-zinc-600">Tools</p>
            <p className="mt-1 text-[11px] text-zinc-500">
              {role === 'admin'
                ? 'Admins always see every tool. These flags apply if the role becomes member.'
                : 'Only checked tools appear for this user.'}
            </p>
            <div className="mt-3 space-y-2">
              {toolLabels.map((tool) => (
                <div
                  key={tool.id}
                  className="flex items-center justify-between rounded-lg bg-white px-2.5 py-2"
                >
                  <span className="text-sm text-zinc-700">{tool.label}</span>
                  <Toggle
                    label={tool.label}
                    checked={tools[tool.id]}
                    onChange={(next) => setTools((current) => ({ ...current, [tool.id]: next }))}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between gap-2 border-t border-zinc-100 bg-zinc-50/80 px-5 py-3.5">
          {user ? (
            <button
              type="button"
              onClick={onDelete}
              disabled={pending || isSelf}
              className="text-sm font-semibold text-red-600 disabled:opacity-40"
            >
              Delete
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-3 py-2 text-sm font-semibold text-zinc-600 hover:bg-zinc-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-70"
            >
              {pending && <Loader2 className="h-4 w-4 animate-spin" />}
              Save
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  required = true,
  placeholder,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
  autoComplete?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-zinc-600">{label}</span>
      <input
        required={required}
        value={value}
        type={type}
        placeholder={placeholder}
        autoComplete={autoComplete}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-sm outline-none transition focus:border-emerald-500 focus:bg-white"
      />
    </label>
  );
}

function CreditPlansSection({
  plans,
  onChange,
  onNotice,
  onError,
}: {
  plans: CreditPlan[];
  onChange: () => Promise<void>;
  onNotice: (value: string) => void;
  onError: (value: string) => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [credits, setCredits] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [paymentMethodName, setPaymentMethodName] = useState('');
  const [paymentRecipientName, setPaymentRecipientName] = useState('');
  const [paymentAccountNumber, setPaymentAccountNumber] = useState('');
  const [paymentQrImageUrl, setPaymentQrImageUrl] = useState('');
  const [active, setActive] = useState(true);
  const [popular, setPopular] = useState(false);
  const [pending, setPending] = useState(false);

  function reset() {
    setEditingId(null);
    setName('');
    setCredits('');
    setPrice('');
    setDescription('');
    setPaymentMethodName('');
    setPaymentRecipientName('');
    setPaymentAccountNumber('');
    setPaymentQrImageUrl('');
    setActive(true);
    setPopular(false);
  }

  function edit(plan: CreditPlan) {
    setEditingId(plan.id);
    setName(plan.name);
    setCredits(String(plan.credits));
    setPrice(plan.price.toFixed(2));
    setDescription(plan.description);
    setPaymentMethodName(plan.paymentMethodName || '');
    setPaymentRecipientName(plan.paymentRecipientName || '');
    setPaymentAccountNumber(plan.paymentAccountNumber || '');
    setPaymentQrImageUrl(plan.paymentQrImageUrl || '');
    setActive(plan.active);
    setPopular(plan.popular);
    onError('');
    onNotice('');
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    onError('');
    try {
      const response = await fetch('/api/admin/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(editingId ? { id: editingId } : {}),
          name,
          credits: Number(credits),
          price: Number(price),
          description,
          paymentMethodName,
          paymentRecipientName,
          paymentAccountNumber,
          active,
          popular,
        }),
      });
      if (!response.ok) throw new Error(await readError(response));
      onNotice(editingId ? 'Credit plan updated.' : 'Credit plan created.');
      reset();
      await onChange();
    } catch (reason) {
      onError(reason instanceof Error ? reason.message : 'Could not save this plan.');
    } finally {
      setPending(false);
    }
  }

  async function toggleActive(plan: CreditPlan) {
    setPending(true);
    onError('');
    try {
      const response = await fetch('/api/admin/plans', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: plan.id, active: !plan.active }),
      });
      if (!response.ok) throw new Error(await readError(response));
      onNotice(`${plan.name} ${plan.active ? 'deactivated' : 'activated'}.`);
      await onChange();
    } catch (reason) {
      onError(reason instanceof Error ? reason.message : 'Could not update this plan.');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
      <Panel className="overflow-hidden">
        <div className="border-b border-zinc-100 px-5 py-4">
          <h3 className="font-display text-lg font-extrabold tracking-tight">Credit plans</h3>
          <p className="mt-1 text-sm text-zinc-500">Only active plans are shown to users on the pricing page.</p>
        </div>
        <div className="divide-y divide-zinc-100">
          {plans.length ? plans.map((plan) => (
            <div key={plan.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-zinc-900">{plan.name}</p>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${plan.active ? 'bg-emerald-100 text-emerald-800' : 'bg-zinc-100 text-zinc-500'}`}>
                    {plan.active ? 'Active' : 'Inactive'}
                  </span>
                  {plan.popular && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">Popular</span>}
                </div>
                <p className="mt-1 text-xs text-zinc-500">
                  {plan.credits.toLocaleString()} credits · ${plan.price.toFixed(2)} · {plan.description}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button type="button" disabled={pending} onClick={() => edit(plan)} className="h-9 rounded-lg border border-zinc-200 px-3 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-50">
                  Edit
                </button>
                <button type="button" disabled={pending} onClick={() => void toggleActive(plan)} className={`h-9 rounded-lg px-3 text-xs font-semibold disabled:opacity-50 ${plan.active ? 'border border-amber-200 text-amber-800 hover:bg-amber-50' : 'bg-emerald-700 text-white hover:bg-emerald-800'}`}>
                  {plan.active ? 'Deactivate' : 'Activate'}
                </button>
              </div>
            </div>
          )) : (
            <p className="px-5 py-8 text-center text-sm text-zinc-500">No plans created yet.</p>
          )}
        </div>
      </Panel>

      <Panel className="p-5">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h3 className="font-display text-lg font-extrabold tracking-tight">{editingId ? 'Edit plan' : 'Create a plan'}</h3>
            <p className="mt-1 text-sm text-zinc-500">Prices must be between $0.55 and $2.00.</p>
          </div>
          {editingId && <button type="button" onClick={reset} className="text-xs font-semibold text-zinc-500 hover:text-zinc-900">Cancel edit</button>}
        </div>
        <form onSubmit={save} className="space-y-3">
          <Field label="Plan name" value={name} onChange={setName} placeholder="e.g. Business" />
          <Field label="Short description" value={description} onChange={setDescription} placeholder="Who this plan is for" />
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Credits" value={credits} onChange={setCredits} type="number" placeholder="1500" />
            <Field label="Price (USD)" value={price} onChange={setPrice} type="number" placeholder="1.25" />
          </div>
          <div className="space-y-3 rounded-xl border border-emerald-100 bg-emerald-50/50 p-3 dark:border-emerald-900/50 dark:bg-emerald-950/20">
            <div>
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Payment method for this plan</p>
              <p className="mt-1 text-xs leading-5 text-zinc-500">
                These details appear automatically when a user selects this plan. Leave blank to use the global payment method.
              </p>
            </div>
            <Field label="Method name" value={paymentMethodName} onChange={setPaymentMethodName} placeholder="e.g. JazzCash" />
            <Field label="Receiver name" value={paymentRecipientName} onChange={setPaymentRecipientName} placeholder="Account holder" />
            <Field label="Account / mobile number" value={paymentAccountNumber} onChange={setPaymentAccountNumber} placeholder="03xx xxxxxxx" />
            {editingId ? (
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 transition hover:border-emerald-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200">
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4 text-emerald-700" />}
                {pending ? 'Uploading QR…' : paymentQrImageUrl ? 'Replace plan QR' : 'Upload plan QR'}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  disabled={pending}
                  className="sr-only"
                  onChange={async (event) => {
                    const file = event.target.files?.[0];
                    event.target.value = '';
                    if (!file || !editingId) return;
                    setPending(true);
                    onError('');
                    try {
                      const form = new FormData();
                      form.set('qrImage', file);
                      form.set('planId', editingId);
                      const response = await fetch('/api/admin/payment-qr', { method: 'POST', body: form });
                      if (!response.ok) throw new Error(await readError(response));
                      const data = (await response.json()) as { paymentQrImageUrl: string };
                      setPaymentQrImageUrl(data.paymentQrImageUrl);
                      onNotice('Plan QR image uploaded.');
                      await onChange();
                    } catch (reason) {
                      onError(reason instanceof Error ? reason.message : 'Could not upload the plan QR image.');
                    } finally {
                      setPending(false);
                    }
                  }}
                />
              </label>
            ) : (
              <p className="text-xs text-zinc-500">Save the plan first to upload its QR code.</p>
            )}
          </div>
          <div className="flex flex-wrap gap-4 rounded-xl border border-zinc-100 p-3">
            <label className="inline-flex items-center gap-2 text-sm text-zinc-700">
              <input type="checkbox" checked={active} onChange={(event) => setActive(event.target.checked)} className="h-4 w-4 accent-emerald-700" />
              Active for users
            </label>
            <label className="inline-flex items-center gap-2 text-sm text-zinc-700">
              <input type="checkbox" checked={popular} onChange={(event) => setPopular(event.target.checked)} className="h-4 w-4 accent-emerald-700" />
              Mark as popular
            </label>
          </div>
          <button type="submit" disabled={pending} className="inline-flex h-10 items-center gap-2 rounded-xl bg-emerald-700 px-4 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60">
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            {editingId ? 'Save plan changes' : 'Create plan'}
          </button>
        </form>
      </Panel>
    </div>
  );
}

function PaymentRequestsSection({
  requests,
  onChange,
  onNotice,
  onError,
}: {
  requests: PaymentRequest[];
  onChange: () => Promise<void>;
  onNotice: (value: string) => void;
  onError: (value: string) => void;
}) {
  const [pendingId, setPendingId] = useState('');

  async function review(id: string, status: 'approved' | 'rejected') {
    setPendingId(id);
    onError('');
    try {
      const response = await fetch('/api/admin/payments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });
      if (!response.ok) throw new Error(await readError(response));
      onNotice(status === 'approved' ? 'Payment approved and credits added.' : 'Payment request rejected.');
      await onChange();
    } catch (reason) {
      onError(reason instanceof Error ? reason.message : 'Could not review the payment.');
    } finally {
      setPendingId('');
    }
  }

  if (!requests.length) {
    return (
      <Panel className="flex min-h-48 flex-col items-center justify-center p-8 text-center">
        <CreditCard className="h-8 w-8 text-zinc-300" />
        <p className="mt-3 font-semibold text-zinc-700">No payment requests yet</p>
        <p className="mt-1 text-sm text-zinc-500">Submitted credit purchases will appear here for review.</p>
      </Panel>
    );
  }

  return (
    <div className="space-y-3">
      {requests.map((payment) => (
        <Panel key={payment.id} className="overflow-hidden p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-display text-lg font-bold text-zinc-900">
                  {payment.planName} · {payment.credits.toLocaleString()} credits
                </h3>
                <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${
                  payment.status === 'pending'
                    ? 'bg-amber-100 text-amber-800'
                    : payment.status === 'approved'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-zinc-100 text-zinc-600'
                }`}>
                  {payment.status}
                </span>
              </div>
              <p className="mt-1 text-sm text-zinc-600">
                @{payment.username} · ${payment.amount.toFixed(2)} · {when(payment.createdAt)}
              </p>
            </div>
            {payment.status === 'pending' && (
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={pendingId === payment.id}
                  onClick={() => void review(payment.id, 'rejected')}
                  className="h-9 rounded-lg border border-zinc-200 px-3 text-xs font-semibold text-zinc-600 hover:bg-zinc-50 disabled:opacity-50"
                >
                  Reject
                </button>
                <button
                  type="button"
                  disabled={pendingId === payment.id}
                  onClick={() => void review(payment.id, 'approved')}
                  className="h-9 rounded-lg bg-emerald-700 px-3 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
                >
                  {pendingId === payment.id ? 'Reviewing…' : 'Approve & add credits'}
                </button>
              </div>
            )}
          </div>
          <div className="mt-4 grid gap-3 border-t border-zinc-100 pt-4 sm:grid-cols-2">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Transaction ID</p>
              <p className="mt-1 break-all text-sm font-medium text-zinc-800">
                {payment.transactionId || 'Not provided'}
              </p>
            </div>
            {payment.proofFileName && (
              <a
                href={`/api/admin/payments/proof/${payment.id}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700 hover:text-emerald-900"
              >
                View payment screenshot <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </div>
          {payment.reviewedBy && (
            <p className="mt-3 text-xs text-zinc-500">
              Reviewed by @{payment.reviewedBy} · {payment.reviewedAt ? when(payment.reviewedAt) : ''}
            </p>
          )}
        </Panel>
      ))}
    </div>
  );
}

function SettingsSection({
  settings,
  paymentConfig,
  groq,
  groqKeys,
  cloudflare,
  onChange,
  onNotice,
  onError,
}: {
  settings: StudioSettings;
  paymentConfig: PaymentConfig;
  groq: ApiKeyStatus;
  groqKeys: GroqApiKeySummary[];
  cloudflare: ApiKeyStatus;
  onChange: () => Promise<void>;
  onNotice: (value: string) => void;
  onError: (value: string) => void;
}) {
  const [draft, setDraft] = useState(settings);
  const [groqKey, setGroqKey] = useState('');
  const [cfAccountId, setCfAccountId] = useState('');
  const [cfApiToken, setCfApiToken] = useState('');
  const [pending, setPending] = useState(false);
  const [groqPending, setGroqPending] = useState(false);
  const [cfPending, setCfPending] = useState(false);
  const [paymentDraft, setPaymentDraft] = useState(paymentConfig);
  const [paymentPending, setPaymentPending] = useState(false);
  const [qrPending, setQrPending] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    onError('');
    try {
      const response = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      });
      if (!response.ok) throw new Error(await readError(response));
      onNotice('Settings saved.');
      await onChange();
    } catch (reason) {
      onError(reason instanceof Error ? reason.message : 'Could not save settings.');
    } finally {
      setPending(false);
    }
  }

  const pages: {
    key: 'watermarkEnabled' | 'mockupsEnabled' | 'seoEnabled' | 'keywordsEnabled';
    label: string;
    note: string;
  }[] = [
    {
      key: 'watermarkEnabled',
      label: 'Watermark',
      note: 'Shown in the member menu. Untick to hide it immediately.',
    },
    {
      key: 'mockupsEnabled',
      label: 'Mockups',
      note: 'Shown in the member menu. Untick to hide it immediately.',
    },
    {
      key: 'seoEnabled',
      label: 'SEO',
      note: 'Shown in the member menu. Untick to hide it immediately.',
    },
    {
      key: 'keywordsEnabled',
      label: 'Keywords',
      note: 'Shown in the member menu. Untick to hide it immediately.',
    },
  ];

  async function saveFlag(patch: Partial<StudioSettings>) {
    setDraft((current) => ({ ...current, ...patch }));
    setPending(true);
    onError('');
    try {
      const response = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      if (!response.ok) throw new Error(await readError(response));
      onNotice('Saved. Members will see this within a few seconds.');
      await onChange();
    } catch (reason) {
      onError(reason instanceof Error ? reason.message : 'Could not save settings.');
      await onChange();
    } finally {
      setPending(false);
    }
  }

  async function removeGroqKey(id: string) {
    setGroqPending(true);
    onError('');
    try {
      const response = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ removeGroqApiKey: id }),
      });
      if (!response.ok) throw new Error(await readError(response));
      onNotice('Groq key removed.');
      await onChange();
    } catch (reason) {
      onError(reason instanceof Error ? reason.message : 'Could not remove the Groq key.');
    } finally {
      setGroqPending(false);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-500">
        Untick a page to hide it from members right away. Admins can still open every page.
      </p>

      <Panel className="overflow-hidden">
        <div className="flex items-start justify-between gap-3 border-b border-zinc-100 px-5 py-4">
          <div>
            <h3 className="font-display text-lg font-extrabold tracking-tight">Cloudflare Workers AI</h3>
            <p className="mt-1 text-sm text-zinc-500">
              {cloudflare.configured
                ? `Active ${cloudflare.hint}${cloudflare.source === 'environment' ? ' from the server environment' : ''}. Used for Flux mockups (Klein by default). Free plan: 10,000 neurons/day.`
                : 'Needed for mockups. Create a Workers AI API token in the Cloudflare dashboard, then paste Account ID and token here.'}
            </p>
          </div>
          <KeyBadge ok={cloudflare.configured} label={cloudflare.configured ? 'Ready' : 'Missing'} />
        </div>
        <form
          className="space-y-3 px-5 py-4"
          onSubmit={async (event) => {
            event.preventDefault();
            setCfPending(true);
            onError('');
            try {
              const response = await fetch('/api/admin/settings', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  cloudflareAccountId: cfAccountId,
                  cloudflareApiToken: cfApiToken,
                }),
              });
              if (!response.ok) throw new Error(await readError(response));
              setCfAccountId('');
              setCfApiToken('');
              onNotice(
                'Cloudflare Workers AI saved. SEO, Keywords, and Flux mockups will use it now.',
              );
              await onChange();
            } catch (reason) {
              onError(
                reason instanceof Error ? reason.message : 'Could not save Cloudflare credentials.',
              );
            } finally {
              setCfPending(false);
            }
          }}
        >
          <Field
            label="Account ID"
            value={cfAccountId}
            onChange={setCfAccountId}
            required={false}
            autoComplete="off"
            placeholder="Cloudflare account id"
          />
          <Field
            label="Workers AI API token"
            value={cfApiToken}
            onChange={setCfApiToken}
            type="password"
            required={false}
            autoComplete="off"
            placeholder="Cloudflare API token"
          />
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="submit"
              disabled={cfPending || cfAccountId.trim().length < 8 || cfApiToken.trim().length < 20}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-70"
            >
              {cfPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Save Cloudflare AI
            </button>
            {cloudflare.source === 'panel' && (
              <button
                type="button"
                disabled={cfPending}
                onClick={async () => {
                  setCfPending(true);
                  onError('');
                  try {
                    const response = await fetch('/api/admin/settings', {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ clearCloudflareAi: true }),
                    });
                    if (!response.ok) throw new Error(await readError(response));
                    onNotice('Saved Cloudflare credentials removed.');
                    await onChange();
                  } catch (reason) {
                    onError(
                      reason instanceof Error
                        ? reason.message
                        : 'Could not remove Cloudflare credentials.',
                    );
                  } finally {
                    setCfPending(false);
                  }
                }}
                className="inline-flex h-10 items-center rounded-xl border border-zinc-200 px-4 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-70"
              >
                Remove saved credentials
              </button>
            )}
          </div>
        </form>
      </Panel>

      <Panel className="overflow-hidden">
        <div className="flex items-start justify-between gap-3 border-b border-zinc-100 px-5 py-4">
          <div>
            <h3 className="font-display text-lg font-extrabold tracking-tight">Groq API key</h3>
            <p className="mt-1 text-sm text-zinc-500">
              {groq.configured
              ? `Active ${groq.hint}${groq.source === 'environment' ? ' from the server environment' : ''}. Add keys individually; they become active immediately and rotate automatically for auto-rename, SEO, Keywords, and mockup planning.`
              : 'Add a key from the Groq console. It becomes active immediately; additional keys rotate automatically for auto-rename, SEO, Keywords, and mockup planning.'}
            </p>
          </div>
          <KeyBadge ok={groq.configured} label={groq.configured ? 'Ready' : 'Missing'} />
        </div>
        <form
          className="space-y-3 px-5 py-4"
          onSubmit={async (event) => {
            event.preventDefault();
            setGroqPending(true);
            onError('');
            try {
              const response = await fetch('/api/admin/settings', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ addGroqApiKey: groqKey }),
              });
              if (!response.ok) throw new Error(await readError(response));
              setGroqKey('');
              onNotice('Groq key added and active. Requests will rotate across the configured keys.');
              await onChange();
            } catch (reason) {
              onError(reason instanceof Error ? reason.message : 'Could not save the Groq API key.');
            } finally {
              setGroqPending(false);
            }
          }}
        >
          <Field
            label="New Groq API key"
            value={groqKey}
            onChange={setGroqKey}
            type="password"
            required={false}
            autoComplete="off"
            placeholder="gsk_..."
          />
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="submit"
              disabled={groqPending || groqKey.trim().length < 12}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-70"
            >
              {groqPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Add Groq key
            </button>
            {groq.source === 'panel' && (
              <button
                type="button"
                disabled={groqPending}
                onClick={async () => {
                  setGroqPending(true);
                  onError('');
                  try {
                    const response = await fetch('/api/admin/settings', {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ clearGroqApiKey: true }),
                    });
                    if (!response.ok) throw new Error(await readError(response));
                    onNotice('Saved Groq key removed.');
                    await onChange();
                  } catch (reason) {
                    onError(
                      reason instanceof Error ? reason.message : 'Could not remove the Groq API key.',
                    );
                  } finally {
                    setGroqPending(false);
                  }
                }}
                className="inline-flex h-10 items-center rounded-xl border border-zinc-200 px-4 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-70"
              >
                Remove all saved keys
              </button>
            )}
          </div>
        </form>
        <div className="space-y-2 border-t border-zinc-100 px-5 py-4">
          <div className="flex items-center justify-between gap-3">
            <h4 className="text-sm font-semibold text-zinc-800">Configured keys</h4>
            <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-semibold text-zinc-600">
              {groqKeys.length} {groqKeys.length === 1 ? 'key' : 'keys'}
            </span>
          </div>
          {groqKeys.length ? (
            groqKeys.map((key, index) => (
              <div
                key={key.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-zinc-200 px-3 py-2.5"
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <KeyRound className="h-4 w-4 shrink-0 text-zinc-400" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-zinc-800">
                      Groq key {index + 1}{' '}
                      <span className="font-mono text-zinc-500">{key.hint}</span>
                    </p>
                    <p className="text-xs text-zinc-500">
                      {key.source === 'panel' ? 'Saved in admin panel' : 'Server environment'}
                    </p>
                  </div>
                </div>
                {key.source === 'panel' ? (
                  <button
                    type="button"
                    disabled={groqPending}
                    onClick={() => void removeGroqKey(key.id)}
                    aria-label={`Remove Groq key ${index + 1}`}
                    className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-zinc-200 px-3 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-60"
                  >
                    <XCircle className="h-3.5 w-3.5" />
                    Remove
                  </button>
                ) : (
                  <span className="shrink-0 text-xs text-zinc-500">
                    Manage in deployment settings
                  </span>
                )}
              </div>
            ))
          ) : (
            <p className="rounded-xl border border-dashed border-zinc-200 px-3 py-4 text-sm text-zinc-500">
              No Groq API keys configured.
            </p>
          )}
        </div>
      </Panel>

      <Panel className="space-y-2 p-4 sm:p-5">
        <div className="flex items-start justify-between gap-4 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3">
          <span>
            <span className="block text-sm font-semibold text-amber-950">Maintenance mode</span>
            <span className="block text-sm text-amber-800">
              Members see a maintenance screen instead of the studio. Admins keep full access.
            </span>
          </span>
          <Toggle
            label="Maintenance mode"
            checked={draft.maintenanceMode}
            onChange={(next) => void saveFlag({ maintenanceMode: next })}
          />
        </div>
        {pages.map((page) => (
          <div
            key={page.key}
            className="flex items-start justify-between gap-4 rounded-xl border border-zinc-100 px-3.5 py-3"
          >
            <span>
              <span className="block text-sm font-semibold text-zinc-900">{page.label}</span>
              <span className="block text-sm text-zinc-500">{page.note}</span>
            </span>
            <Toggle
              label={page.label}
              checked={draft[page.key]}
              onChange={(next) => void saveFlag({ [page.key]: next })}
            />
          </div>
        ))}
        <div className="flex items-start justify-between gap-4 rounded-xl border border-zinc-100 px-3.5 py-3">
          <span>
            <span className="block text-sm font-semibold text-zinc-900">Registration</span>
            <span className="block text-sm text-zinc-500">
              People can create a member account from the sign-in page.
            </span>
          </span>
          <Toggle
            label="Registration"
            checked={draft.registrationEnabled}
            onChange={(next) => void saveFlag({ registrationEnabled: next })}
          />
        </div>
      </Panel>

      <Panel className="space-y-4 p-5">
        <form onSubmit={onSubmit} className="space-y-4">
          <Field
            label="Studio name"
            value={draft.studioName}
            onChange={(studioName) => setDraft({ ...draft, studioName })}
          />
          <p className="flex items-start gap-2 text-xs leading-5 text-zinc-500">
            <KeyRound className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            The username and password in the server environment always sign in as admin, even after a
            password change here.
          </p>
          <button
            type="submit"
            disabled={pending}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-zinc-900 px-4 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-70"
          >
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            Save settings
          </button>
        </form>
      </Panel>

      <Panel className="space-y-4 p-5">
        <div>
          <h3 className="font-display text-lg font-extrabold tracking-tight">Manual payment method</h3>
          <p className="mt-1 text-sm text-zinc-500">
            These details appear on the pricing page. Admin approval adds the selected credits to the user.
          </p>
        </div>
        <form
          className="space-y-3"
          onSubmit={async (event) => {
            event.preventDefault();
            setPaymentPending(true);
            onError('');
            try {
              const response = await fetch('/api/admin/settings', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(paymentDraft),
              });
              if (!response.ok) throw new Error(await readError(response));
              onNotice('Payment method saved.');
              await onChange();
            } catch (reason) {
              onError(reason instanceof Error ? reason.message : 'Could not save payment details.');
            } finally {
              setPaymentPending(false);
            }
          }}
        >
          <Field label="Payment method name" value={paymentDraft.paymentMethodName} onChange={(value) => setPaymentDraft((current) => ({ ...current, paymentMethodName: value }))} placeholder="e.g. Mobile Wallet" />
          <Field label="Receiver name" value={paymentDraft.paymentRecipientName} onChange={(value) => setPaymentDraft((current) => ({ ...current, paymentRecipientName: value }))} />
          <Field label="Account / mobile number" value={paymentDraft.paymentAccountNumber} onChange={(value) => setPaymentDraft((current) => ({ ...current, paymentAccountNumber: value }))} />
          <div className="space-y-3 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
            <div>
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Payment QR image</p>
              <p className="mt-1 text-xs leading-5 text-zinc-500">Upload a PNG, JPG, or WebP image up to 3 MB. It is saved and added to the pricing page immediately.</p>
            </div>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 transition hover:border-emerald-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200">
              {qrPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
              {qrPending ? 'Uploading QR…' : 'Choose QR image'}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                disabled={qrPending}
                className="sr-only"
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  event.target.value = '';
                  if (!file) return;
                  setQrPending(true);
                  onError('');
                  try {
                    const form = new FormData();
                    form.set('qrImage', file);
                    const response = await fetch('/api/admin/payment-qr', { method: 'POST', body: form });
                    if (!response.ok) throw new Error(await readError(response));
                    const data = (await response.json()) as { paymentQrImageUrl: string };
                    setPaymentDraft((current) => ({ ...current, paymentQrImageUrl: data.paymentQrImageUrl }));
                    onNotice('QR image uploaded and added to the pricing page.');
                    await onChange();
                  } catch (reason) {
                    onError(reason instanceof Error ? reason.message : 'Could not upload the QR image.');
                  } finally {
                    setQrPending(false);
                  }
                }}
              />
            </label>
            {paymentDraft.paymentQrImageUrl && (
              <div className="flex items-center gap-3">
                <img
                  src={paymentDraft.paymentQrImageUrl}
                  alt="Payment QR preview"
                  className="h-24 w-24 rounded-lg border border-zinc-200 bg-white object-contain p-1 dark:border-zinc-700"
                />
                <span className="break-all text-xs text-zinc-500">
                  {paymentDraft.paymentQrImageUrl === '/api/payments/qr' ? 'Uploaded QR image' : paymentDraft.paymentQrImageUrl}
                </span>
              </div>
            )}
            <Field label="Or use an HTTPS image URL" value={paymentDraft.paymentQrImageUrl === '/api/payments/qr' ? '' : paymentDraft.paymentQrImageUrl} onChange={(value) => setPaymentDraft((current) => ({ ...current, paymentQrImageUrl: value }))} required={false} placeholder="https://…" />
          </div>
          <button type="submit" disabled={paymentPending} className="inline-flex h-10 items-center gap-2 rounded-xl bg-emerald-700 px-4 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60">
            {paymentPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Save payment method
          </button>
        </form>
      </Panel>
    </div>
  );
}
