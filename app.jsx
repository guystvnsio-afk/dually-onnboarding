// Main app shell: welcome → wizard → completion, with autosave + tweaks

const { useState: useStateApp, useEffect: useEffectApp, useMemo: useMemoApp, useRef: useRefApp } = React;

const STORAGE_KEY = 'dually-onboarding-v1';
const TWEAKS_KEY = 'dually-onboarding-tweaks';

// ============================================================
// SUBMIT DESTINATIONS — edit these when your endpoints are live
// ============================================================
// 1. GHL_WEBHOOK_URL — GHL Workflow → Trigger → "Inbound Webhook"
//    Copy the "Webhook URL" it gives you. GHL will receive the JSON,
//    create/update a Contact, and run whatever workflow steps you add.
// 2. APPS_SCRIPT_URL — see /SUBMIT-SETUP.md for the 20-line Apps Script
//    that writes each submission to a Google Sheet row + a Google Doc.
// 3. STATUS_POLL_URL — optional. Your orchestration layer (GHL workflow,
//    Make scenario, Airtable webhook) writes agent status back here,
//    keyed by submissionId. Omit to keep the completion screen static.
// ============================================================
const SUBMIT_CONFIG = {
  GHL_WEBHOOK_URL: 'https://services.leadconnectorhq.com/hooks/H4nZBmPg2l8C2c5tY4iz/webhook-trigger/2063e6b5-1a3b-4fd2-b201-3d7f235342ea',
  APPS_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbziRCPKkQhk_L9SFPTHuksMOHdeE4V-AUFeDdpRoKZ3zMT_2dLBZEcQ-boQh0mK7lMccg/exec',
  STATUS_POLL_URL: '',   // e.g. 'https://script.google.com/macros/s/AKfy.../exec?status='
  SECONDARY_UPLOAD_URL: '' // link emailed to agent for logo/headshot/photos
};

// Build the submission payload — flat keys that are easy to map in GHL + Sheets
function buildSubmitPayload(data) {
  const submissionId = `DUA-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  return {
    submissionId,
    submittedAt: new Date().toISOString(),
    source: 'onboard.duallymkt.com',
    version: 'v1',
    // Mirror useful top-level fields so GHL workflow conditions are easy:
    agentType: data.agentType || '',
    tier: data.tier || '',
    legalName: data.legalName || '',
    displayName: data.displayName || '',
    proEmail: data.proEmail || '',
    cell: data.cell || '',
    npn: data.npn || '',
    primaryProduct: data.primaryProduct || '',
    heroCity: data.heroCity || '',
    // Full payload for the AI build agent:
    answers: data
  };
}

async function postJSON(url, payload) {
  if (!url) return { ok: false, skipped: true };
  try {
    // no-cors fallback: GHL inbound webhooks + Apps Script doPost both accept
    // opaque cross-origin POSTs. We can't read the response in no-cors mode,
    // but the request goes through. Try CORS first, fall back to no-cors.
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // avoids CORS preflight
      body: JSON.stringify(payload)
    });
    return { ok: res.ok || res.type === 'opaque', status: res.status };
  } catch (e) {
    try {
      await fetch(url, {
        method: 'POST', mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload)
      });
      return { ok: true, opaque: true };
    } catch (e2) {
      return { ok: false, error: String(e2) };
    }
  }
}

async function submitOnboarding(data) {
  const payload = buildSubmitPayload(data);
  // Post only to Apps Script — it relays to GHL server-side (no CORS issues,
  // and GHL receives a clean application/json body so the reference-payload
  // capture works on first hit).
  const sheet = await postJSON(SUBMIT_CONFIG.APPS_SCRIPT_URL, payload);
  const ghl = { ok: true, skipped: true, relayed: true };
  // Save a local copy of the payload with the ID, so retries preserve it
  try {
    const prior = JSON.parse(localStorage.getItem('dually-submissions') || '[]');
    prior.push({ submissionId: payload.submissionId, submittedAt: payload.submittedAt, ghl, sheet });
    localStorage.setItem('dually-submissions', JSON.stringify(prior));
  } catch {}
  return {
    submissionId: payload.submissionId,
    ghl, sheet,
    anyOk: sheet.ok || sheet.skipped,
    bothSkipped: sheet.skipped
  };
}

const SECTIONS = [
  { id: 'tier',          label: 'Your plan',        eyebrow: 'Step 01 · Agent type + plan', title: ['Let\'s get ', <span key="1">you deployed.</span>], intro: "Pick your agent type and lock in the plan you signed up for. This is what determines everything the AI team builds.", Comp: null },
  { id: 'identity',      label: 'Identity',         eyebrow: 'Step 02 · Identity + licensing', title: ['Who you are, ', <span key="1">on paper.</span>], intro: "Legal name, NPN, states. The compliance-footer stuff. Nothing here is marketing — just the facts we're required to display.", Comp: null },
  { id: 'contact',       label: 'Contact',          eyebrow: 'Step 03 · Contact + availability', title: ['How leads ', <span key="1">reach you.</span>], intro: 'Your GHL number gets embedded on every page and automation. Availability drives your booking calendar.', Comp: null },
  { id: 'products',      label: 'Products + ICP',   eyebrow: 'Step 04 · Products + ideal client', title: ['What you sell, ', <span key="1">and to whom.</span>], intro: "Determines chatbot routing, pipeline tags, website cards, funnel copy — basically everything downstream. We've tailored the options to your agent type.", Comp: null },
  { id: 'brand',         label: 'Brand',            eyebrow: 'Step 05 · Brand + visual identity', title: ['Your ', <span key="1">look.</span>], intro: "Colors and existing web presence. We'll email a separate upload form for your logo, headshot, and photos — don't fight this form for that.", Comp: null },
  { id: 'copy',          label: 'Website copy',     eyebrow: 'Step 06 · Website copy', title: ['The ', <span key="1">words</span>, ' on your site.'], intro: "Every text block on your site gets filled from this section. Write like you'd talk to a client over coffee. Stuck? Hit the AI helper — it drafts from your bullets.", Comp: null },
  { id: 'testimonials',  label: 'Social proof',     eyebrow: 'Step 07 · Testimonials', title: ['Proof that ', <span key="1">works.</span>], intro: "Skip if you don't have any — we'll show 'review coming soon' placeholders and fire Testimonial.io requests as soon as you close your first clients.", Comp: null },
  { id: 'tech',          label: 'Tech + calendar',  eyebrow: 'Step 08 · Tech connections', title: ['Wiring the ', <span key="1">stack.</span>], intro: 'Perspective, GHL, calendar, chat widget, A2P, payments. All the plumbing.', Comp: null },
  { id: 'leads',         label: 'Lead sources',     eyebrow: 'Step 09 · Lead source setup', title: ['Where your ', <span key="1">pipeline</span>, ' starts.'], intro: 'Drives which workflows fire on day one and how the router is configured.', Comp: null },
  { id: 'chatbot',       label: 'Chatbot',          eyebrow: 'Step 10 · Chatbot configuration', title: ['Meet ', <span key="1">Alex</span>, ' — or rename him.'], intro: "Personalizing the AI assistant that texts your leads 24/7. It'll qualify them using these rules and hand off to you when they're ready.", Comp: null },
  { id: 'prefs',         label: 'Final details',    eyebrow: 'Step 11 · Onboarding preferences', title: ['Last ', <span key="1">few things.</span>], intro: 'So your launch call hits the ground running.', Comp: null },
];

// Attach Comp references after section modules load
const getSections = () => SECTIONS.map(s => ({
  ...s,
  Comp: ({
    tier: Section0_Tier,
    identity: Section1_Identity,
    contact: Section2_Contact,
    products: Section3_Products,
    brand: Section4_Brand,
    copy: Section5_Copy,
    testimonials: Section6_Testimonials,
    tech: Section7_Tech,
    leads: Section8_Leads,
    chatbot: Section9_Chatbot,
    prefs: Section10_Preferences
  })[s.id]
}));

// defaults for section completeness checks
const REQUIRED_BY_SECTION = {
  tier: ['tier', 'agentType'],
  identity: ['legalName', 'npn'],
  contact: ['cell', 'proEmail', 'timezone'],
  products: ['products', 'primaryProduct', 'icp'],
  brand: [],
  copy: ['heroCity'],
  testimonials: [],
  tech: [],
  leads: [],
  chatbot: [],
  prefs: ['launchConcern']
};

const sectionDone = (sectionId, data) => {
  const reqs = REQUIRED_BY_SECTION[sectionId] || [];
  return reqs.every(k => {
    const v = data[k];
    if (Array.isArray(v)) return v.length > 0;
    if (v && typeof v === 'object') return v.name || v.dataURL;
    return v != null && String(v).trim() !== '';
  });
};

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "theme": "navy",
  "density": "comfortable",
  "showProgress": true,
  "tone": "warm"
}/*EDITMODE-END*/;

function App() {
  const [screen, setScreen] = useStateApp('welcome'); // welcome | wizard | done
  const [stepIdx, setStepIdx] = useStateApp(0);
  const [data, setData] = useStateApp({});
  const [visited, setVisited] = useStateApp(new Set(['tier']));
  const [saveBadge, setSaveBadge] = useStateApp('Saved');
  const [tweaksOpen, setTweaksOpen] = useStateApp(false);
  const [tweaksEnabled, setTweaksEnabled] = useStateApp(false);
  const [tweaks, setTweaks] = useStateApp(TWEAK_DEFAULTS);
  const [submitState, setSubmitState] = useStateApp({ status: 'idle' }); // idle | submitting | ok | error

  // Load persisted state on mount
  useEffectApp(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const { data: d, stepIdx: s, screen: scr, visited: v } = JSON.parse(raw);
        if (d) setData(d);
        if (typeof s === 'number') setStepIdx(s);
        if (scr) setScreen(scr);
        if (Array.isArray(v)) setVisited(new Set(v));
      }
      const rt = localStorage.getItem(TWEAKS_KEY);
      if (rt) setTweaks({ ...TWEAK_DEFAULTS, ...JSON.parse(rt) });
    } catch {}
  }, []);

  // Persist
  useEffectApp(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        data, stepIdx, screen, visited: Array.from(visited)
      }));
      setSaveBadge('Saved');
    } catch (e) {
      setSaveBadge('Save error');
    }
  }, [data, stepIdx, screen, visited]);

  useEffectApp(() => {
    localStorage.setItem(TWEAKS_KEY, JSON.stringify(tweaks));
    document.documentElement.dataset.theme = tweaks.theme;
  }, [tweaks]);

  // Tweaks host integration
  useEffectApp(() => {
    const onMsg = (e) => {
      if (!e.data) return;
      if (e.data.type === '__activate_edit_mode') setTweaksEnabled(true);
      else if (e.data.type === '__deactivate_edit_mode') setTweaksEnabled(false);
    };
    window.addEventListener('message', onMsg);
    window.parent?.postMessage({ type: '__edit_mode_available' }, '*');
    return () => window.removeEventListener('message', onMsg);
  }, []);

  const sections = useMemoApp(() => getSections(), []);
  const total = sections.length;
  const section = sections[stepIdx];

  const update = (k, v) => {
    setData(d => ({ ...d, [k]: v }));
    setSaveBadge('Saving…');
  };

  const goTo = (idx) => {
    setStepIdx(idx);
    setVisited(v => new Set([...v, sections[idx].id]));
    window.scrollTo({ top: 0 });
  };

  const next = () => {
    if (stepIdx < total - 1) goTo(stepIdx + 1);
    else {
      // Final step: submit to GHL + Sheet, then show completion
      setSubmitState({ status: 'submitting' });
      setScreen('done');
      submitOnboarding(data).then(result => {
        setSubmitState({ status: result.anyOk ? 'ok' : 'error', ...result });
      }).catch(err => {
        setSubmitState({ status: 'error', error: String(err) });
      });
    }
  };
  const retrySubmit = () => {
    setSubmitState({ status: 'submitting' });
    submitOnboarding(data).then(result => {
      setSubmitState({ status: result.anyOk ? 'ok' : 'error', ...result });
    });
  };
  const prev = () => stepIdx > 0 ? goTo(stepIdx - 1) : setScreen('welcome');

  const completedCount = sections.filter(s => sectionDone(s.id, data)).length;
  const pct = Math.round((completedCount / total) * 100);

  // =========== SCREENS ===========
  if (screen === 'welcome') {
    return <Welcome
      data={data}
      onStart={() => { setScreen('wizard'); setStepIdx(0); setVisited(new Set(['tier'])); }}
      onResume={() => { setScreen('wizard'); }}
      hasProgress={Object.keys(data).length > 0}
      pct={pct}
      tweaksProps={{ tweaksEnabled, tweaksOpen, setTweaksOpen, tweaks, setTweaks }}
    />;
  }

  if (screen === 'done') {
    return <Completion
      data={data}
      submitState={submitState}
      onRetry={retrySubmit}
      onBack={() => setScreen('wizard')}
      onReset={() => {
        if (confirm('Start over? This wipes your saved answers.')) {
          localStorage.removeItem(STORAGE_KEY);
          setData({}); setStepIdx(0); setVisited(new Set(['tier'])); setScreen('welcome');
        }
      }}
      tweaksProps={{ tweaksEnabled, tweaksOpen, setTweaksOpen, tweaks, setTweaks }}
    />;
  }

  // Wizard
  const Comp = section.Comp;
  return (
    <div className="app">
      <aside className="sidebar">
        <div className="sidebar__brand">
          <div className="sidebar__brand-name">Dually</div>
        </div>
        <div className="sidebar__tag">Agent onboarding · v1</div>
        <h1 className="sidebar__title">
          Your agency,<br/>
          <span>deployed</span> in 24 hrs.
        </h1>
        <p className="sidebar__subtitle">
          Answer once. Your AI team provisions everything — CRM, site, funnels, Alex, automations — from these answers.
        </p>

        {tweaks.showProgress && (
          <div className="progress">
            <div className="progress__label">
              <span>Progress</span><span>{pct}%</span>
            </div>
            <div className="progress__bar">
              <div className="progress__fill" style={{ width: `${pct}%` }} />
            </div>
          </div>
        )}

        <ul className="steps">
          {sections.map((s, i) => {
            const done = sectionDone(s.id, data);
            const active = i === stepIdx;
            const klass = `step ${active ? 'step--active' : ''} ${done && !active ? 'step--done' : ''}`;
            return (
              <li key={s.id}>
                <button className={klass} onClick={() => goTo(i)}>
                  <span className="step__num">
                    {done && !active
                      ? <svg className="step__check" viewBox="0 0 24 24"><polyline points="4 12 9 17 20 6"/></svg>
                      : String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="step__label">{s.label}</span>
                </button>
              </li>
            );
          })}
        </ul>

        <div className="sidebar__foot">
          <span>Auto-saved locally</span>
          <span className="sidebar__save">
            <span className="sidebar__save-dot" />
            {saveBadge}
          </span>
        </div>
      </aside>

      <main className="main">
        <div className="section__eyebrow">{section.eyebrow}</div>
        <h2 className="section__title">{section.title}</h2>
        <p className="section__intro">{section.intro}</p>

        <Comp data={data} update={update} />

        <div className="actions">
          <button className="btn btn--ghost" onClick={prev}>
            <Icon name="arrowLeft" className="" style={{ width: 14, height: 14 }} />
            {stepIdx === 0 ? 'Back to welcome' : 'Previous'}
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-3)' }}>
              {String(stepIdx + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
            </span>
            <button className="btn btn--primary" onClick={next}>
              {stepIdx === total - 1 ? 'Submit + hand off to AI team' : 'Continue'}
              <Icon name="arrow" className="btn__arrow" style={{ width: 14, height: 14 }} />
            </button>
          </div>
        </div>
      </main>

      {tweaksEnabled && (
        <TweaksPanel open={tweaksOpen} setOpen={setTweaksOpen} tweaks={tweaks} setTweaks={setTweaks} />
      )}
    </div>
  );
}

function Welcome({ data, onStart, onResume, hasProgress, pct, tweaksProps }) {
  const displayName = data.displayName || data.legalName || '';
  return (
    <div className="welcome">
      <div className="welcome__card">
        <div className="welcome__logo">Dually</div>
        <div className="welcome__eyebrow">Agent onboarding</div>
        <h1 className="welcome__title">
          One form.<br/>
          <span>Your agency</span>, deployed.
        </h1>
        <p className="welcome__lede">
          Every field here replaces a kickoff call. Answer thoroughly and our AI team — Provisioner, Brand, Copy, Alex, Ads — assembles your CRM, website, funnel, chatbot, and 14 automations from your answers. 20 to 25 minutes, auto-saved, finishable in multiple sittings.
        </p>
        <div className="welcome__meta">
          <div className="welcome__meta-item">
            <span className="welcome__meta-k">Time</span>
            <span className="welcome__meta-v">~22 min</span>
          </div>
          <div className="welcome__meta-item">
            <span className="welcome__meta-k">Sections</span>
            <span className="welcome__meta-v">11</span>
          </div>
          <div className="welcome__meta-item">
            <span className="welcome__meta-k">Saves as you go</span>
            <span className="welcome__meta-v">Yes</span>
          </div>
          {hasProgress && (
            <div className="welcome__meta-item">
              <span className="welcome__meta-k">Your progress</span>
              <span className="welcome__meta-v" style={{ color: 'var(--gold)' }}>{pct}%</span>
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          {hasProgress ? (
            <>
              <button className="btn btn--gold" onClick={onResume}>
                Pick up where {displayName ? displayName.split(' ')[0] : 'you'} left off
                <Icon name="arrow" className="btn__arrow" style={{ width: 14, height: 14 }} />
              </button>
              <button className="btn btn--ghost" onClick={onStart}>Start fresh</button>
            </>
          ) : (
            <button className="btn btn--gold" onClick={onStart}>
              Begin
              <Icon name="arrow" className="btn__arrow" style={{ width: 14, height: 14 }} />
            </button>
          )}
        </div>
        <div style={{ marginTop: 40, fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-3)' }}>
          Compliance footer · data handled per your Dually MSA · TLS + encrypted at rest
        </div>
      </div>
      {tweaksProps.tweaksEnabled && (
        <TweaksPanel open={tweaksProps.tweaksOpen} setOpen={tweaksProps.setTweaksOpen} tweaks={tweaksProps.tweaks} setTweaks={tweaksProps.setTweaks} />
      )}
    </div>
  );
}

function Completion({ data, submitState, onRetry, onBack, onReset, tweaksProps }) {
  const name = (data.displayName || data.legalName || 'Agent').split(' ')[0];
  const submittedAt = useMemoApp(() => new Date().toLocaleString(), []);

  // Optional: poll status endpoint if configured
  const [agentStatus, setAgentStatus] = useStateApp({}); // { PRV: 'running'|'done'|'queued'|'skipped', ... }
  useEffectApp(() => {
    if (!SUBMIT_CONFIG.STATUS_POLL_URL || !submitState.submissionId || submitState.status !== 'ok') return;
    let cancelled = false;
    const poll = async () => {
      try {
        const res = await fetch(SUBMIT_CONFIG.STATUS_POLL_URL + encodeURIComponent(submitState.submissionId));
        if (!res.ok) return;
        const json = await res.json();
        if (!cancelled && json && json.agents) setAgentStatus(json.agents);
      } catch {}
    };
    poll();
    const id = setInterval(poll, 15000);
    return () => { cancelled = true; clearInterval(id); };
  }, [submitState.submissionId, submitState.status]);

  const agents = [
    { id: 'PRV', name: 'Provisioner', desc: 'Creating your GHL sub-account, deploying the snapshot for your agent type, wiring your calendar.', eta: 'Running · ~3 min' },
    { id: 'BRA', name: 'Brand', desc: 'Assembling your visual system from your colors, headshot, and logo. Generating the website shell.', eta: 'Queued · starts after Provisioner' },
    { id: 'COP', name: 'Copy', desc: 'Drafting hero, About, FAQ, funnel, and 30-day social calendar from your inputs.', eta: 'Queued · ~8 min' },
    { id: 'ALX', name: data.botName || 'Alex', desc: 'Training your chatbot on your products, ICP, age rules, and off-limit topics.', eta: 'Queued · ~5 min' },
    { id: 'A2P', name: 'Compliance', desc: 'Pre-filling your A2P registration. Human review required before submit (you\'ll get an email).', eta: 'Queued · needs your sign-off' },
    { id: 'ADS', name: 'Ads', desc: 'If Exclusive Leads: cloning the campaign template for your territory and product.', eta: data.tier === 'exclusive' ? 'Queued' : 'Skipped — not on Exclusive Leads' },
  ];
  const statusFor = (a) => {
    const live = agentStatus[a.id];
    if (live === 'done')    return { label: 'Complete', cls: 'handoff__status--done' };
    if (live === 'running') return { label: 'Running now', cls: 'handoff__status--running' };
    if (live === 'error')   return { label: 'Needs attention', cls: 'handoff__status--error' };
    if (live === 'skipped') return { label: 'Skipped', cls: 'handoff__status--skipped' };
    if (live === 'queued')  return { label: 'Queued', cls: '' };
    return { label: a.eta, cls: '' };
  };

  return (
    <div className="welcome" style={{ display: 'block', minHeight: '100vh' }}>
      <div className="done-hero">
        <div className="done-hero__mark">
          {submitState.status === 'submitting' ? (
            <svg viewBox="0 0 24 24" style={{ animation: 'spin 1s linear infinite' }}>
              <circle cx="12" cy="12" r="9" fill="none" strokeDasharray="40 20" />
            </svg>
          ) : submitState.status === 'error' ? (
            <svg viewBox="0 0 24 24"><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg>
          ) : (
            <svg viewBox="0 0 24 24"><polyline points="4 12 9 17 20 6"/></svg>
          )}
        </div>

        <div className="welcome__eyebrow">
          {submitState.status === 'submitting' && 'Sending to your AI team…'}
          {submitState.status === 'ok' && `Submitted · ${submittedAt}`}
          {submitState.status === 'error' && 'Submission failed — saved locally'}
          {submitState.status === 'idle' && `Ready · ${submittedAt}`}
        </div>

        <h1 className="welcome__title" style={{ fontSize: 56 }}>
          {submitState.status === 'error' ? (
            <>Hang on, <span>{name}</span>.<br/>Let's retry that.</>
          ) : (
            <>Thanks, <span>{name}</span>.<br/>We've got it from here.</>
          )}
        </h1>

        {submitState.status === 'error' ? (
          <p className="welcome__lede">
            We couldn't reach the build queue just now. Your answers are safe in your browser — hit retry, or email them to <a href="mailto:onboarding@duallymkt.com" style={{ color: 'var(--gold)' }}>onboarding@duallymkt.com</a> and we'll process manually.
          </p>
        ) : (
          <p className="welcome__lede">
            Your answers are in the hands of your AI team. You don't need another call unless you want one — we'll email the moment your account is live (usually within 4 business hours), with direct links to your new website, CRM, and chatbot.
          </p>
        )}

        {submitState.status === 'ok' && submitState.submissionId && (
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.12em', color: 'var(--ink-3)', marginTop: -8, marginBottom: 24, textTransform: 'uppercase' }}>
            Ref · {submitState.submissionId}
            {SUBMIT_CONFIG.SECONDARY_UPLOAD_URL && <>  ·  <a href={SUBMIT_CONFIG.SECONDARY_UPLOAD_URL} style={{ color: 'var(--gold)' }}>Upload logo + headshot</a></>}
          </div>
        )}

        {submitState.bothSkipped && submitState.status === 'ok' && (
          <div style={{ padding: 12, border: '1px dashed var(--line)', borderRadius: 8, fontSize: 13, color: 'var(--ink-3)', marginBottom: 24 }}>
            <strong style={{ color: 'var(--gold)' }}>Preview mode:</strong> no submit endpoint is configured, so your answers stayed in this browser. Add GHL_WEBHOOK_URL or APPS_SCRIPT_URL in <code>app.jsx</code> before launch.
          </div>
        )}

        <div className="handoff">
          <div className="handoff__title">AI Team · dispatch</div>
          <ul className="handoff__list">
            {agents.map(a => {
              const st = statusFor(a);
              return (
                <li key={a.id} className="handoff__item">
                  <div className="handoff__agent">{a.id}</div>
                  <div className="handoff__body">
                    <div className="handoff__name">{a.name}</div>
                    <div className="handoff__desc">{a.desc}</div>
                    <div className={`handoff__status ${st.cls}`}>
                      <span className="handoff__status-dot" />
                      {st.label}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        <div style={{ display: 'flex', gap: 12, marginTop: 32, flexWrap: 'wrap' }}>
          <button className="btn btn--ghost" onClick={onBack}>
            <Icon name="arrowLeft" className="" style={{ width: 14, height: 14 }} />
            Back to form
          </button>
          {submitState.status === 'error' && (
            <button className="btn btn--primary" onClick={onRetry}>
              Retry submission
              <Icon name="arrow" className="btn__arrow" style={{ width: 14, height: 14 }} />
            </button>
          )}
          <button className="btn btn--ghost" onClick={onReset}>Reset everything</button>
        </div>
      </div>
      {tweaksProps.tweaksEnabled && (
        <TweaksPanel open={tweaksProps.tweaksOpen} setOpen={tweaksProps.setTweaksOpen} tweaks={tweaksProps.tweaks} setTweaks={tweaksProps.setTweaks} />
      )}
    </div>
  );
}

function TweaksPanel({ open, setOpen, tweaks, setTweaks }) {
  const set = (k, v) => {
    setTweaks(prev => ({ ...prev, [k]: v }));
    window.parent?.postMessage({ type: '__edit_mode_set_keys', edits: { [k]: v } }, '*');
  };
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{
          position: 'fixed', bottom: 20, right: 20, zIndex: 1000,
          background: 'var(--navy)', color: 'var(--gold)', border: 'none',
          padding: '10px 14px', borderRadius: 8, cursor: 'pointer',
          fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.12em',
          textTransform: 'uppercase', boxShadow: 'var(--shadow-lg)'
        }}
      >
        Tweaks
      </button>
    );
  }
  const themes = [
    { id: 'navy', color: '#0A1628' },
    { id: 'ink', color: '#171614' },
    { id: 'sage', color: '#1F2E26' },
  ];
  return (
    <div className="tweaks">
      <div className="tweaks__head">
        <span className="tweaks__title">Tweaks</span>
        <button className="tweaks__close" onClick={() => setOpen(false)}>×</button>
      </div>
      <div className="tweaks__row">
        <span className="tweaks__label">Palette</span>
        <div className="tweaks__control">
          {themes.map(t => (
            <button
              key={t.id}
              className={`tweaks__swatch ${tweaks.theme === t.id ? 'tweaks__swatch--on' : ''}`}
              style={{ background: t.color }}
              onClick={() => set('theme', t.id)}
              title={t.id}
            />
          ))}
        </div>
      </div>
      <div className="tweaks__row">
        <span className="tweaks__label">Progress bar</span>
        <button
          onClick={() => set('showProgress', !tweaks.showProgress)}
          style={{
            background: tweaks.showProgress ? 'var(--gold)' : 'var(--line)',
            color: tweaks.showProgress ? 'var(--navy)' : 'var(--ink-3)',
            border: 'none', padding: '4px 10px', borderRadius: 12,
            fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.08em',
            textTransform: 'uppercase', cursor: 'pointer'
          }}
        >
          {tweaks.showProgress ? 'On' : 'Off'}
        </button>
      </div>
      <div className="tweaks__row">
        <span className="tweaks__label">Microcopy tone</span>
        <div className="tweaks__control">
          {['warm', 'formal', 'crisp'].map(t => (
            <button
              key={t}
              onClick={() => set('tone', t)}
              style={{
                background: tweaks.tone === t ? 'var(--navy)' : 'transparent',
                color: tweaks.tone === t ? 'var(--gold)' : 'var(--ink-2)',
                border: '1px solid var(--line)',
                padding: '4px 8px', borderRadius: 6,
                fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.06em',
                textTransform: 'uppercase', cursor: 'pointer'
              }}
            >
              {t}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
