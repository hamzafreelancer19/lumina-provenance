'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { ArrowLeft, ArrowRight, Check, Clock3, Copy, CreditCard, ImageUp, Loader2, Sparkles } from 'lucide-react';

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

type PaymentConfig = {
  paymentMethodName: string;
  paymentRecipientName: string;
  paymentAccountNumber: string;
  paymentQrImageUrl: string;
};

type PaymentRequest = {
  id: string;
  planName: string;
  credits: number;
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  transactionId: string;
  createdAt: number;
};

async function readError(response: Response) {
  const data = (await response.json().catch(() => null)) as { error?: string } | null;
  return data?.error || 'Could not submit the payment request.';
}

export function PricingPage() {
  const [config, setConfig] = useState<PaymentConfig | null>(null);
  const [plans, setPlans] = useState<CreditPlan[]>([]);
  const [requests, setRequests] = useState<PaymentRequest[]>([]);
  const [selectedPlan, setSelectedPlan] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [proof, setProof] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [accountCopied, setAccountCopied] = useState(false);
  const [copyError, setCopyError] = useState('');
  const activePlan = plans.find((plan) => plan.id === selectedPlan) || plans.find((plan) => plan.popular) || plans[0];
  const activePaymentConfig = activePlan
    ? {
        paymentMethodName: activePlan.paymentMethodName || config?.paymentMethodName || '',
        paymentRecipientName: activePlan.paymentRecipientName || config?.paymentRecipientName || '',
        paymentAccountNumber: activePlan.paymentAccountNumber || config?.paymentAccountNumber || '',
        paymentQrImageUrl: activePlan.paymentQrImageUrl || config?.paymentQrImageUrl || '',
      }
    : config;
  const hasPaymentDetails = Boolean(
    activePaymentConfig?.paymentMethodName &&
      activePaymentConfig.paymentRecipientName &&
      activePaymentConfig.paymentAccountNumber,
  );
  const pendingRequest = useMemo(() => requests.find((request) => request.status === 'pending'), [requests]);

  useEffect(() => {
    setAccountCopied(false);
    setCopyError('');
  }, [selectedPlan]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [configResponse, requestResponse] = await Promise.all([
          fetch('/api/payments/config', { cache: 'no-store' }),
          fetch('/api/payments/requests', { cache: 'no-store' }),
        ]);
        if (!configResponse.ok || !requestResponse.ok) {
          throw new Error('Could not load payment options. Please refresh the page.');
        }
        const paymentConfig = (await configResponse.json()) as PaymentConfig & { plans: CreditPlan[] };
        const data = (await requestResponse.json()) as { requests: PaymentRequest[] };
        if (!cancelled) {
          setConfig(paymentConfig);
          setPlans(paymentConfig.plans);
          setSelectedPlan(
            (current) =>
              paymentConfig.plans.find((plan) => plan.id === current)?.id ||
              paymentConfig.plans.find((plan) => plan.popular)?.id ||
              paymentConfig.plans[0]?.id ||
              '',
          );
          setRequests(data.requests);
        }
      } catch (reason) {
        if (!cancelled) setError(reason instanceof Error ? reason.message : 'Could not load payment options.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function copyPaymentAccount() {
    const accountNumber = activePaymentConfig?.paymentAccountNumber;
    if (!accountNumber) return;
    setCopyError('');
    try {
      await navigator.clipboard.writeText(accountNumber);
      setAccountCopied(true);
      window.setTimeout(() => setAccountCopied(false), 1800);
    } catch {
      setCopyError('Could not copy. Please select the account number and copy it manually.');
    }
  }

  async function submitPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setNotice('');
    if (!activePlan) {
      setError('There are no active plans available right now.');
      return;
    }
    if (!transactionId.trim() && !proof) {
      setError('Enter your transaction ID or attach a payment screenshot.');
      return;
    }

    const form = new FormData();
    form.set('planId', selectedPlan);
    form.set('transactionId', transactionId.trim());
    if (proof) form.set('proof', proof);

    setSubmitting(true);
    try {
      const response = await fetch('/api/payments/requests', { method: 'POST', body: form });
      if (!response.ok) throw new Error(await readError(response));
      const data = (await response.json()) as { payment: PaymentRequest };
      setRequests((current) => [data.payment, ...current]);
      setTransactionId('');
      setProof(null);
      const input = document.getElementById('payment-proof') as HTMLInputElement | null;
      if (input) input.value = '';
      setNotice('Payment submitted. Credits will be added after an admin verifies it.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not submit the payment request.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <Link href="/" className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-zinc-500 transition hover:text-zinc-900 dark:hover:text-zinc-100">
        <ArrowLeft className="h-4 w-4" />
        Back to studio
      </Link>

      <section className="overflow-hidden rounded-[30px] border border-zinc-200/80 bg-white/90 shadow-[0_24px_70px_-44px_rgba(6,78,59,0.35)] dark:border-zinc-800 dark:bg-zinc-950/80">
        <div className="relative overflow-hidden bg-gradient-to-br from-zinc-950 via-zinc-900 to-emerald-950 px-6 py-10 text-center text-white sm:px-10 sm:py-14">
          <div className="absolute -left-16 -top-24 h-72 w-72 rounded-full bg-emerald-400/10 blur-3xl" />
          <div className="relative mx-auto max-w-2xl">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-[11px] font-semibold text-emerald-200">
              <Sparkles className="h-3.5 w-3.5" /> Simple credit top-ups
            </span>
            <h1 className="mt-4 font-display text-3xl font-extrabold tracking-tight sm:text-5xl">
              Pick a plan. Keep creating.
            </h1>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-zinc-300">
              Credits cover watermark removal. Choose a one-time pack, pay using the displayed method, then submit your transaction ID or receipt for admin review.
            </p>
          </div>
        </div>

        <div className="p-5 sm:p-8 lg:p-10">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {plans.map((plan) => {
              const active = selectedPlan === plan.id;
              return (
                <button
                  type="button"
                  key={plan.id}
                  onClick={() => setSelectedPlan(plan.id)}
                  aria-pressed={active}
                  className={`relative flex min-h-52 flex-col rounded-2xl border p-5 text-left transition ${
                    active
                      ? 'border-emerald-600 bg-emerald-50/80 shadow-[0_12px_30px_-20px_rgba(5,150,105,0.7)] ring-2 ring-emerald-500/15 dark:border-emerald-500 dark:bg-emerald-950/30'
                      : 'border-zinc-200 bg-white hover:border-emerald-300 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-emerald-900'
                  }`}
                >
                  {plan.popular && (
                    <span className="absolute -top-2.5 right-4 rounded-full bg-emerald-700 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
                      Popular
                    </span>
                  )}
                  <span className="flex items-center justify-between">
                    <span className="text-sm font-bold text-zinc-700 dark:text-zinc-300">{plan.name}</span>
                    <span className={`flex h-5 w-5 items-center justify-center rounded-full border ${active ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-zinc-300 dark:border-zinc-700'}`}>
                      {active && <Check className="h-3.5 w-3.5" />}
                    </span>
                  </span>
                  <span className="mt-4 font-display text-3xl font-extrabold tracking-tight text-zinc-950 dark:text-zinc-50">
                    ${plan.price.toFixed(2)}
                  </span>
                  <span className="mt-1 text-sm font-semibold text-emerald-800 dark:text-emerald-300">
                    {plan.credits.toLocaleString()} credits
                  </span>
                  <span className="mt-auto pt-4 text-xs leading-5 text-zinc-500">{plan.description}</span>
                </button>
              );
            })}
          </div>
          {!loading && plans.length === 0 && (
            <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
              No plans are available right now. Please check back later.
            </p>
          )}

          <div className="mt-8 grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
            <section className="rounded-2xl border border-zinc-200 bg-zinc-50/70 p-5 dark:border-zinc-800 dark:bg-zinc-900/40 sm:p-6">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-emerald-700 shadow-sm dark:bg-zinc-900 dark:text-emerald-300">
                  <CreditCard className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="font-display text-lg font-bold text-zinc-900 dark:text-zinc-100">Payment details</h2>
                  <p className="text-xs text-zinc-500">{activePlan ? `Send exactly $${activePlan.price.toFixed(2)} to this account.` : 'Select an active plan to see its price.'}</p>
                </div>
              </div>
              {loading ? (
                <div className="mt-6 flex items-center gap-2 text-sm text-zinc-500"><Loader2 className="h-4 w-4 animate-spin" />Loading payment method…</div>
              ) : hasPaymentDetails && activePaymentConfig ? (
                <div className="mt-5 grid gap-4 sm:grid-cols-[1fr_auto]">
                  <dl className="space-y-3">
                    <div><dt className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Method</dt><dd className="mt-0.5 font-semibold text-zinc-900 dark:text-zinc-100">{activePaymentConfig.paymentMethodName}</dd></div>
                    <div><dt className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Account name</dt><dd className="mt-0.5 font-semibold text-zinc-900 dark:text-zinc-100">{activePaymentConfig.paymentRecipientName}</dd></div>
                    <div>
                      <dt className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Number / account</dt>
                      <div className="mt-0.5 flex items-center gap-2">
                        <dd className="select-all font-mono text-lg font-bold text-emerald-800 dark:text-emerald-300">
                          {activePaymentConfig.paymentAccountNumber}
                        </dd>
                        <button
                          type="button"
                          onClick={copyPaymentAccount}
                          aria-label={accountCopied ? 'Account number copied' : 'Copy account number'}
                          className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-2 text-[11px] font-semibold text-zinc-600 transition hover:border-emerald-300 hover:text-emerald-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-emerald-800 dark:hover:text-emerald-300"
                        >
                          {accountCopied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                          {accountCopied ? 'Copied' : 'Copy'}
                        </button>
                      </div>
                      {copyError && <p role="alert" className="mt-1 text-[11px] text-rose-600 dark:text-rose-400">{copyError}</p>}
                    </div>
                  </dl>
                  {activePaymentConfig.paymentQrImageUrl ? (
                    <img src={activePaymentConfig.paymentQrImageUrl} alt="Payment QR code" className="h-40 w-40 object-contain" />
                  ) : (
                    <div className="flex min-h-32 items-center justify-center rounded-xl border border-dashed border-zinc-300 px-4 text-center text-xs text-zinc-400 dark:border-zinc-700">QR code not provided</div>
                  )}
                </div>
              ) : (
                <p className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
                  Payment details are being set up. Please try again later or contact an admin.
                </p>
              )}
              <p className="mt-4 flex items-start gap-2 text-xs leading-5 text-zinc-500">
                <Clock3 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                Credits are added after manual payment review. Please keep your receipt until approval.
              </p>
            </section>

            <form onSubmit={submitPayment} className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950 sm:p-6">
              <div>
                <h2 className="font-display text-lg font-bold text-zinc-900 dark:text-zinc-100">Submit payment</h2>
                <p className="mt-1 text-xs text-zinc-500">
                  {activePlan
                    ? `Selected: ${activePlan.name} · ${activePlan.credits.toLocaleString()} credits · $${activePlan.price.toFixed(2)}`
                    : 'No active plan selected'}
                </p>
              </div>
              {pendingRequest ? (
                <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30">
                  <div className="flex items-center gap-2 font-semibold text-amber-900 dark:text-amber-200">
                    <Clock3 className="h-4 w-4" /> Payment under review
                  </div>
                  <p className="mt-1 text-sm text-amber-800 dark:text-amber-300">
                    Your {pendingRequest.planName} payment request is pending. You can submit another after it is reviewed.
                  </p>
                </div>
              ) : (
                <>
                  <label className="mt-5 block">
                    <span className="mb-1.5 block text-xs font-semibold text-zinc-700 dark:text-zinc-300">Transaction ID</span>
                    <input
                      value={transactionId}
                      onChange={(event) => setTransactionId(event.target.value)}
                      maxLength={120}
                      placeholder="Enter your payment reference"
                      className="h-11 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-sm outline-none transition focus:border-emerald-500 focus:bg-white dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                    />
                  </label>
                  <label className="mt-4 block">
                    <span className="mb-1.5 block text-xs font-semibold text-zinc-700 dark:text-zinc-300">Payment screenshot (optional)</span>
                    <span className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-3 py-3 text-sm text-zinc-600 hover:border-emerald-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
                      <ImageUp className="h-5 w-5 text-emerald-700 dark:text-emerald-400" />
                      <span className="min-w-0 flex-1 truncate">{proof?.name || 'Choose a receipt image'}</span>
                      <input
                        id="payment-proof"
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="sr-only"
                        onChange={(event) => setProof(event.target.files?.[0] || null)}
                      />
                    </span>
                    <span className="mt-1 block text-[11px] text-zinc-400">PNG, JPG, or WebP · up to 5 MB</span>
                  </label>
                  {error && <p role="alert" className="mt-4 rounded-xl bg-rose-50 px-3 py-2.5 text-sm text-rose-700 dark:bg-rose-950/30 dark:text-rose-300">{error}</p>}
                  {notice && <p role="status" className="mt-4 rounded-xl bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300">{notice}</p>}
                  <button
                    type="submit"
                    disabled={submitting || loading || !hasPaymentDetails || !activePlan}
                    className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                    {submitting ? 'Submitting…' : 'I’ve paid — submit for review'}
                  </button>
                </>
              )}
              {notice && pendingRequest && <p role="status" className="mt-4 rounded-xl bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300">{notice}</p>}
              {!pendingRequest && !error && !notice && <p className="mt-3 text-center text-[11px] text-zinc-400">By submitting, you confirm that the payment was sent for this selected plan.</p>}
            </form>
          </div>

          {requests.length > 0 && (
            <section className="mt-8">
              <h2 className="mb-3 font-display text-lg font-bold text-zinc-900 dark:text-zinc-100">Your payment history</h2>
              <div className="divide-y divide-zinc-100 rounded-2xl border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-950">
                {requests.map((request) => (
                  <div key={request.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5">
                    <div>
                      <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">{request.planName} · {request.credits.toLocaleString()} credits · ${request.amount.toFixed(2)}</p>
                      <p className="mt-0.5 text-xs text-zinc-500">{new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(request.createdAt)}</p>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${request.status === 'approved' ? 'bg-emerald-100 text-emerald-800' : request.status === 'pending' ? 'bg-amber-100 text-amber-800' : 'bg-zinc-100 text-zinc-600'}`}>
                      {request.status}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </section>
    </main>
  );
}
