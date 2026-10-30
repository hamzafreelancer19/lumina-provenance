'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import {
  KeyRound,
  LayoutDashboard,
  Loader2,
  ScrollText,
  Settings,
  Shield,
  UserPlus,
  Users,
} from 'lucide-react';

type Role = 'admin' | 'member';
type Section = 'overview' | 'users' | 'activity' | 'settings';

type PublicUser = {
  id: string;
  username: string;
  displayName: string;
  role: Role;
  disabled: boolean;
  createdAt: number;
  lastLoginAt: number | null;
};

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
  registrationEnabled: boolean;
  maintenanceMode: boolean;
};

type ApiKeyStatus = {
  configured: boolean;
  source: 'panel' | 'environment' | 'none';
  hint: string;
};

type Overview = {
  me: { id: string; username: string };
  users: PublicUser[];
  activity: Activity[];
  settings: StudioSettings;
  stats: {
    users: number;
    active: number;
    admins: number;
    events24h: number;
    logins24h: number;
    watermark: number;
    mockups: number;
    seo: number;
  };
  xai: ApiKeyStatus;
};

const nav: { id: Section; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'activity', label: 'Activity', icon: ScrollText },
  { id: 'settings', label: 'Settings', icon: Settings },
];

const actionLabel: Record<string, string> = {
  login: 'Sign in',
  logout: 'Sign out',
  watermark: 'Watermark',
  mockups: 'Mockups',
  seo: 'SEO',
  register: 'Registered',
  'user.create': 'User added',
  'user.update': 'User updated',
  'user.delete': 'User removed',
  'settings.update': 'Settings',
};

function when(value: number | null) {
  if (!value) return 'Never';
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(value);
}

async function readError(response: Response) {
  const data = (await response.json().catch(() => null)) as { error?: string } | null;
  return data?.error || 'Something went wrong.';
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

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 lg:flex-row">
      <aside className="lg:w-56 lg:shrink-0">
        <div className="rounded-3xl border border-white/80 bg-white p-3 shadow-[0_16px_50px_-32px_rgba(6,78,59,0.45)]">
          <p className="px-3 pb-2 pt-1 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-700">
            Admin
          </p>
          <nav className="flex gap-1 overflow-x-auto lg:flex-col" aria-label="Admin">
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
                  className={`flex shrink-0 items-center gap-2 rounded-2xl px-3 py-2 text-sm font-semibold transition ${
                    active ? 'bg-emerald-600 text-white' : 'text-zinc-600 hover:bg-zinc-100'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>
      </aside>

      <main className="min-w-0 flex-1">
        {error && (
          <p className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
            {error}
          </p>
        )}
        {notice && (
          <p className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            {notice}
          </p>
        )}
        {loading || !data ? (
          <div className="flex h-48 items-center justify-center text-zinc-500">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : section === 'overview' ? (
          <OverviewSection data={data} />
        ) : section === 'users' ? (
          <UsersSection data={data} onChange={refresh} onNotice={setNotice} onError={setError} />
        ) : section === 'activity' ? (
          <ActivitySection activity={data.activity} />
        ) : (
          <SettingsSection
            settings={data.settings}
            xai={data.xai}
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
    { label: 'Users', value: data.stats.users, note: `${data.stats.active} active` },
    { label: 'Admins', value: data.stats.admins, note: 'Can open this panel' },
    { label: 'Sign-ins, 24h', value: data.stats.logins24h, note: `${data.stats.events24h} events` },
    { label: 'Watermark', value: data.stats.watermark, note: 'Cleans logged' },
    { label: 'Mockups', value: data.stats.mockups, note: 'Image calls' },
    { label: 'SEO', value: data.stats.seo, note: 'Listings written' },
  ];

  return (
    <section className="space-y-4">
      <div>
        <h1 className="font-display text-2xl font-extrabold tracking-tight">Overview</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Signed in as {data.me.username}. xAI key {data.xai.configured ? `is set (${data.xai.hint})` : 'is missing'}.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <article key={card.label} className="rounded-3xl border border-white bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">{card.label}</p>
            <p className="mt-2 font-display text-3xl font-extrabold">{card.value}</p>
            <p className="mt-1 text-sm text-zinc-500">{card.note}</p>
          </article>
        ))}
      </div>
      <ActivitySection activity={data.activity.slice(0, 8)} compact />
    </section>
  );
}

function ActivitySection({ activity, compact = false }: { activity: Activity[]; compact?: boolean }) {
  return (
    <section className="rounded-3xl border border-white bg-white p-4 shadow-sm sm:p-5">
      <h2 className="font-display text-lg font-extrabold">{compact ? 'Recent activity' : 'Activity'}</h2>
      {activity.length === 0 ? (
        <p className="mt-3 text-sm text-zinc-500">No activity yet. Sign-ins and tool use will show up here.</p>
      ) : (
        <ul className="mt-3 divide-y divide-zinc-100">
          {activity.map((item) => (
            <li key={item.id} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-zinc-900">
                  {actionLabel[item.action] || item.action}
                  <span className="font-normal text-zinc-500"> · {item.username}</span>
                </p>
                <p className="text-sm text-zinc-500">{item.detail}</p>
              </div>
              <time className="shrink-0 text-xs text-zinc-400">{when(item.at)}</time>
            </li>
          ))}
        </ul>
      )}
    </section>
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
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight">Users</h1>
          <p className="mt-1 text-sm text-zinc-500">Members can use the tools. Admins can use this panel.</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
          className="inline-flex h-10 items-center gap-2 rounded-2xl bg-emerald-600 px-3 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          <UserPlus className="h-4 w-4" />
          Add user
        </button>
      </div>

      <div className="overflow-hidden rounded-3xl border border-white bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-400">
              <tr>
                <th className="px-4 py-3 font-semibold">User</th>
                <th className="px-4 py-3 font-semibold">Role</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Last sign-in</th>
                <th className="px-4 py-3 font-semibold" />
              </tr>
            </thead>
            <tbody>
              {data.users.map((user) => (
                <tr key={user.id} className="border-t border-zinc-100">
                  <td className="px-4 py-3">
                    <p className="font-semibold">{user.displayName}</p>
                    <p className="text-xs text-zinc-500">{user.username}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2 py-1 text-xs font-semibold text-zinc-700">
                      {user.role === 'admin' && <Shield className="h-3 w-3" />}
                      {user.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={user.disabled ? 'text-red-600' : 'text-emerald-700'}>
                      {user.disabled ? 'Disabled' : 'Active'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-zinc-500">{when(user.lastLoginAt)}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => {
                        setEditing(user);
                        setOpen(true);
                      }}
                      className="rounded-xl px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

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
  const [role, setRole] = useState<Role>(user?.role || 'member');
  const [disabled, setDisabled] = useState(user?.disabled || false);
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
            ? { id: user.id, displayName, role, disabled, password }
            : { username, displayName, role, password },
        ),
      });
      if (!response.ok) throw new Error(await readError(response));
      await onSaved(user ? 'User updated.' : 'User added. They can sign in now.');
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
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-zinc-950/40 p-4 sm:items-center">
      <form onSubmit={onSubmit} className="w-full max-w-md rounded-3xl bg-white p-5 shadow-xl">
        <h2 className="font-display text-xl font-extrabold">{user ? 'Edit user' : 'Add user'}</h2>
        <div className="mt-4 space-y-3">
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
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-zinc-600">Role</span>
            <select
              value={role}
              onChange={(event) => setRole(event.target.value as Role)}
              disabled={isSelf}
              className="h-11 w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-3 text-sm outline-none focus:border-emerald-500 focus:bg-white"
            >
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
          </label>
          {user && (
            <label className="flex items-center gap-2 text-sm text-zinc-700">
              <input
                type="checkbox"
                checked={disabled}
                disabled={isSelf}
                onChange={(event) => setDisabled(event.target.checked)}
              />
              Disabled
            </label>
          )}
        </div>
        <div className="mt-5 flex items-center justify-between gap-2">
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
            <button type="button" onClick={onClose} className="rounded-2xl px-3 py-2 text-sm font-semibold text-zinc-600">
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending}
              className="inline-flex h-10 items-center gap-2 rounded-2xl bg-emerald-600 px-4 text-sm font-semibold text-white disabled:opacity-70"
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
        className="h-11 w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-3 text-sm outline-none focus:border-emerald-500 focus:bg-white"
      />
    </label>
  );
}

function SettingsSection({
  settings,
  xai,
  onChange,
  onNotice,
  onError,
}: {
  settings: StudioSettings;
  xai: ApiKeyStatus;
  onChange: () => Promise<void>;
  onNotice: (value: string) => void;
  onError: (value: string) => void;
}) {
  const [draft, setDraft] = useState(settings);
  const [apiKey, setApiKey] = useState('');
  const [pending, setPending] = useState(false);
  const [keyPending, setKeyPending] = useState(false);

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

  const pages: { key: 'watermarkEnabled' | 'mockupsEnabled' | 'seoEnabled'; label: string; note: string }[] = [
    { key: 'watermarkEnabled', label: 'Watermark', note: 'Shown in the member menu. Untick to hide it immediately.' },
    { key: 'mockupsEnabled', label: 'Mockups', note: 'Shown in the member menu. Untick to hide it immediately.' },
    { key: 'seoEnabled', label: 'SEO', note: 'Shown in the member menu. Untick to hide it immediately.' },
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

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl font-extrabold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Untick a page to hide it from members right away. Admins can still open every page.
        </p>
      </div>
      <form
        className="space-y-4 rounded-3xl border border-white bg-white p-5 shadow-sm"
        onSubmit={async (event) => {
          event.preventDefault();
          setKeyPending(true);
          onError('');
          try {
            const response = await fetch('/api/admin/settings', {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ xaiApiKey: apiKey }),
            });
            if (!response.ok) throw new Error(await readError(response));
            setApiKey('');
            onNotice('API key saved. Mockups and SEO will use it now.');
            await onChange();
          } catch (reason) {
            onError(reason instanceof Error ? reason.message : 'Could not save the API key.');
          } finally {
            setKeyPending(false);
          }
        }}
      >
        <div>
          <h2 className="font-display text-lg font-extrabold">xAI API key</h2>
          <p className="mt-1 text-sm text-zinc-500">
            {xai.configured
              ? `Active key ${xai.hint}${xai.source === 'environment' ? ' from the server environment' : ''}. Saving a new key replaces it for the whole studio.`
              : 'No key yet. Paste one from the xAI console. Mockups and SEO will use it immediately.'}
          </p>
        </div>
        <Field
          label="API key"
          value={apiKey}
          onChange={setApiKey}
          type="password"
          required={false}
          autoComplete="off"
          placeholder="xai-..."
        />
        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={keyPending || apiKey.trim().length < 12}
            className="inline-flex h-10 items-center gap-2 rounded-2xl bg-emerald-600 px-4 text-sm font-semibold text-white disabled:opacity-70"
          >
            {keyPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Save API key
          </button>
          {xai.source === 'panel' && (
            <button
              type="button"
              disabled={keyPending}
              onClick={async () => {
                setKeyPending(true);
                onError('');
                try {
                  const response = await fetch('/api/admin/settings', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ clearApiKey: true }),
                  });
                  if (!response.ok) throw new Error(await readError(response));
                  onNotice('Saved API key removed.');
                  await onChange();
                } catch (reason) {
                  onError(reason instanceof Error ? reason.message : 'Could not remove the API key.');
                } finally {
                  setKeyPending(false);
                }
              }}
              className="inline-flex h-10 items-center rounded-2xl border border-zinc-200 px-4 text-sm font-semibold text-zinc-700 disabled:opacity-70"
            >
              Remove saved key
            </button>
          )}
        </div>
      </form>
      <section className="space-y-3 rounded-3xl border border-white bg-white p-5 shadow-sm">
        <label className="flex items-start justify-between gap-4 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-3">
          <span>
            <span className="block text-sm font-semibold text-amber-950">Maintenance mode</span>
            <span className="block text-sm text-amber-800">
              Members see a maintenance screen instead of the studio. Admins keep full access.
            </span>
          </span>
          <input
            type="checkbox"
            checked={draft.maintenanceMode}
            onChange={(event) => void saveFlag({ maintenanceMode: event.target.checked })}
            className="mt-1"
          />
        </label>
        {pages.map((page) => (
          <label key={page.key} className="flex items-start justify-between gap-4 rounded-2xl border border-zinc-100 px-3 py-3">
            <span>
              <span className="block text-sm font-semibold">{page.label}</span>
              <span className="block text-sm text-zinc-500">{page.note}</span>
            </span>
            <input
              type="checkbox"
              checked={draft[page.key]}
              onChange={(event) => void saveFlag({ [page.key]: event.target.checked })}
              className="mt-1"
            />
          </label>
        ))}
        <label className="flex items-start justify-between gap-4 rounded-2xl border border-zinc-100 px-3 py-3">
          <span>
            <span className="block text-sm font-semibold">Registration</span>
            <span className="block text-sm text-zinc-500">People can create a member account from the sign-in page.</span>
          </span>
          <input
            type="checkbox"
            checked={draft.registrationEnabled}
            onChange={(event) => void saveFlag({ registrationEnabled: event.target.checked })}
            className="mt-1"
          />
        </label>
      </section>
      <form onSubmit={onSubmit} className="space-y-4 rounded-3xl border border-white bg-white p-5 shadow-sm">
        <Field label="Studio name" value={draft.studioName} onChange={(studioName) => setDraft({ ...draft, studioName })} />
        <p className="flex items-start gap-2 text-xs leading-5 text-zinc-500">
          <KeyRound className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          The username and password in the server environment always sign in as admin, even after a password change here.
        </p>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-10 items-center gap-2 rounded-2xl bg-emerald-600 px-4 text-sm font-semibold text-white disabled:opacity-70"
        >
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          Save settings
        </button>
      </form>
    </div>
  );
}
