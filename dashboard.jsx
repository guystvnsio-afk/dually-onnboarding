// Dually Ops Dashboard — client build tracker on top of the Google Sheet
// Password gate → fetch status rows → table + drawer → update stages back to Sheet

const { useState, useEffect, useMemo, useRef } = React;

// =========================================================
// CONFIG — paste your Apps Script Web App URL here (same URL
// as the onboarding form uses; the script now handles both).
// =========================================================
const DASH_CONFIG = {
  APPS_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbypsbkN7TeNcpfUSv7RPJhWB5Yx6L2nCMy6gi4XxYlC_13LYfvuCG9GeUVagRA2bTGnkQ/exec',
  PASSWORD: '2026dually',
  SLA_DAYS: 4, // "Needs attention" if launch > this many days after setup fee
  STALE_HOURS: 24 // "Needs attention" if any stage has been 'running' > this
};

// Build stages in order — column keys must match the Apps Script's status tab
const STAGES = [
  { key: 'setupFeeCollected',   label: 'Setup fee collected' },
  { key: 'formSubmitted',       label: 'Onboarding form submitted' },
  { key: 'uploadsReceived',     label: 'Uploads received' },
  { key: 'subAccountImported',  label: 'Sub-account imported' },
  { key: 'brand',               label: 'Brand' },
  { key: 'copy',                label: 'Website copy' },
  { key: 'websiteCreated',      label: 'Website created' },
  { key: 'perspectiveCreated',  label: 'Perspective funnel created' },
  { key: 'gmbCreated',          label: 'GMB profile created' },
  { key: 'alex',                label: 'Alex (chatbot)' },
  { key: 'a2p',                 label: 'A2P / Sendblue number' },
  { key: 'launchCallScheduled', label: 'Launch call scheduled' },
  { key: 'subscriptionPaid',    label: 'Subscription payment active' },
  { key: 'adsOn',               label: 'Ads (Exclusive tier only)' },
  { key: 'readyToLaunch',       label: 'Ready to launch' }
];

const STATUSES = ['pending', 'running', 'done', 'blocked', 'skipped'];

// Keys within `answers` we consider meaningful; the rest we show under "Other"
const ANSWER_GROUPS = [
  { title: 'Identity', keys: ['legalName','displayName','npn','stateResident','statesLicensed'] },
  { title: 'Contact + availability', keys: ['proEmail','cell','timezone','availability','calendarUrl'] },
  { title: 'Plan + products', keys: ['tier','agentType','products','primaryProduct','icp','targetAge'] },
  { title: 'Brand', keys: ['brandColors','brandVibe','existingWebsite','existingSocials','heroCity','tagline','aboutParagraph'] },
  { title: 'Website copy', keys: ['valueProp','differentiators','process','ctaText','faq'] },
  { title: 'Tech', keys: ['ghlAccountEmail','a2pReady','paymentsReady','chatWidgetPreference'] },
  { title: 'Chatbot', keys: ['botName','botTone','botAgeMin','botAgeMax','offLimits'] },
  { title: 'Launch', keys: ['launchConcern','launchDate','preferredContactMethod','notes'] }
];

// -------- auth + persistence --------
const AUTH_KEY = 'dually-dash-auth';
const FILTER_KEY = 'dually-dash-filters';

// -------- helpers --------
const fmtDate = (iso) => {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    if (isNaN(d)) return String(iso);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch { return String(iso); }
};
const daysSince = (iso) => {
  if (!iso) return null;
  const d = new Date(iso); if (isNaN(d)) return null;
  return Math.floor((Date.now() - d.getTime()) / (1000*60*60*24));
};
const hoursSince = (iso) => {
  if (!iso) return null;
  const d = new Date(iso); if (isNaN(d)) return null;
  return Math.floor((Date.now() - d.getTime()) / (1000*60*60));
};

// Figure out which clients need attention
function computeAttention(c) {
  const reasons = [];
  // SLA: setup fee > SLA_DAYS ago and not ready to launch
  const setupStage = c.stages?.setupFeeCollected;
  const setupDate = setupStage?.status === 'done' ? setupStage.when : c.setupFeeDate;
  const days = daysSince(setupDate);
  if (days != null && days > DASH_CONFIG.SLA_DAYS && c.stages?.readyToLaunch?.status !== 'done') {
    reasons.push(`${days}d since setup fee · not launched`);
  }
  // Any stage 'running' > STALE_HOURS
  Object.entries(c.stages || {}).forEach(([k, v]) => {
    if (v.status === 'running' && v.when) {
      const h = hoursSince(v.when);
      if (h != null && h > DASH_CONFIG.STALE_HOURS) {
        const stage = STAGES.find(s => s.key === k);
        reasons.push(`"${stage?.label || k}" stuck ${h}h`);
      }
    }
  });
  return reasons;
}

function progressPct(c) {
  const keys = STAGES.filter(s => s.key !== 'adsOn' || c.tier === 'exclusive').map(s => s.key);
  const done = keys.filter(k => c.stages?.[k]?.status === 'done').length;
  return Math.round((done / keys.length) * 100);
}

// =========================================================
// ROOT
// =========================================================
function Dashboard() {
  const [authed, setAuthed] = useState(() => {
    try { return localStorage.getItem(AUTH_KEY) === '1'; } catch { return false; }
  });
  if (!authed) return <Gate onAuth={() => setAuthed(true)} />;
  return <DashApp />;
}

function Gate({ onAuth }) {
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const submit = (e) => {
    e.preventDefault();
    if (pw === DASH_CONFIG.PASSWORD) {
      try { localStorage.setItem(AUTH_KEY, '1'); } catch {}
      onAuth();
    } else {
      setErr('Wrong password.');
    }
  };
  return (
    <div className="gate">
      <form className="gate__card" onSubmit={submit}>
        <div className="gate__brand">Dually · Ops</div>
        <div className="gate__tag">Client build tracker · internal</div>
        <div className="gate__label">Password</div>
        <input
          className="gate__input" type="password" autoFocus
          value={pw} onChange={(e) => { setPw(e.target.value); setErr(''); }}
        />
        {err && <div className="gate__err">{err}</div>}
        <button className="gate__btn" type="submit">Enter dashboard</button>
      </form>
    </div>
  );
}

// =========================================================
// DASH APP
// =========================================================
function DashApp() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null); // submissionId
  const [toast, setToast] = useState(null);
  const [view, setView] = useState('all'); // all | attention | launching | launched

  // filters
  const [filters, setFilters] = useState(() => {
    try { return JSON.parse(localStorage.getItem(FILTER_KEY) || '{}'); } catch { return {}; }
  });
  const setFilter = (k, v) => {
    const next = { ...filters, [k]: v };
    setFilters(next);
    try { localStorage.setItem(FILTER_KEY, JSON.stringify(next)); } catch {}
  };

  const fetchClients = async () => {
    setLoading(true); setError('');
    try {
      const url = DASH_CONFIG.APPS_SCRIPT_URL + '?action=listClients&pw=' + encodeURIComponent(DASH_CONFIG.PASSWORD);
      const res = await fetch(url);
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || 'Failed to load');
      setClients(json.clients || []);
    } catch (e) {
      setError(String(e.message || e));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { fetchClients(); }, []);

  const updateStage = async (submissionId, stageKey, status) => {
    const body = {
      action: 'updateStage',
      pw: DASH_CONFIG.PASSWORD,
      submissionId, stageKey, status,
      when: new Date().toISOString()
    };
    // Optimistic update
    setClients(cs => cs.map(c => c.submissionId === submissionId
      ? { ...c, stages: { ...(c.stages||{}), [stageKey]: { status, when: body.when } } }
      : c));
    try {
      await fetch(DASH_CONFIG.APPS_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(body)
      });
      setToast({ kind: 'ok', msg: 'Saved' });
    } catch (e) {
      setToast({ kind: 'err', msg: 'Save failed — retry' });
    }
    setTimeout(() => setToast(null), 1800);
  };

  const updateNotes = async (submissionId, notes) => {
    setClients(cs => cs.map(c => c.submissionId === submissionId ? { ...c, notes } : c));
    try {
      await fetch(DASH_CONFIG.APPS_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'updateNotes', pw: DASH_CONFIG.PASSWORD, submissionId, notes })
      });
    } catch {}
  };

  // Derived — compute attention reasons per client
  const enriched = useMemo(() => clients.map(c => ({
    ...c,
    _attention: computeAttention(c),
    _pct: progressPct(c)
  })), [clients]);

  // Filter
  const filtered = useMemo(() => {
    let list = enriched;
    if (view === 'attention') list = list.filter(c => c._attention.length > 0);
    else if (view === 'launching') list = list.filter(c => c._pct < 100 && c._pct >= 50);
    else if (view === 'launched') list = list.filter(c => c.stages?.readyToLaunch?.status === 'done');

    if (filters.tier) list = list.filter(c => (c.tier || '').toLowerCase() === filters.tier);
    if (filters.agentType) list = list.filter(c => (c.agentType || '').toLowerCase() === filters.agentType.toLowerCase());
    if (filters.q) {
      const q = filters.q.toLowerCase();
      list = list.filter(c => JSON.stringify(c).toLowerCase().includes(q));
    }
    return list;
  }, [enriched, view, filters]);

  // KPI numbers
  const kpis = useMemo(() => {
    const attentionCount = enriched.filter(c => c._attention.length > 0).length;
    const launched = enriched.filter(c => c.stages?.readyToLaunch?.status === 'done').length;
    const active = enriched.length - launched;
    const thisWeek = enriched.filter(c => {
      const s = c.stages?.readyToLaunch;
      if (s?.status !== 'done' || !s.when) return false;
      return daysSince(s.when) <= 7;
    }).length;
    return { active, thisWeek, attentionCount, launched };
  }, [enriched]);

  const selectedClient = selected ? enriched.find(c => c.submissionId === selected) : null;

  return (
    <div className="dash">
      <aside className="dash-side">
        <div className="dash-side__brand">Dually</div>
        <div className="dash-side__tag">Ops · Build tracker</div>
        <nav className="dash-nav">
          <button className={`dash-nav__item ${view === 'all' ? 'dash-nav__item--active' : ''}`} onClick={() => setView('all')}>
            All clients <span className="dash-nav__count">{enriched.length}</span>
          </button>
          <button className={`dash-nav__item dash-nav__item--alert ${view === 'attention' ? 'dash-nav__item--active' : ''}`} onClick={() => setView('attention')}>
            Needs attention <span className="dash-nav__count">{kpis.attentionCount}</span>
          </button>
          <button className={`dash-nav__item ${view === 'launching' ? 'dash-nav__item--active' : ''}`} onClick={() => setView('launching')}>
            In-build <span className="dash-nav__count">{enriched.filter(c => c._pct < 100 && c._pct >= 50).length}</span>
          </button>
          <button className={`dash-nav__item ${view === 'launched' ? 'dash-nav__item--active' : ''}`} onClick={() => setView('launched')}>
            Launched <span className="dash-nav__count">{kpis.launched}</span>
          </button>
        </nav>
        <div className="dash-side__foot">
          v1 · sheet-backed<br/>
          <span style={{ color: 'var(--text-3)' }}>{clients.length} records</span>
        </div>
      </aside>

      <main className="dash-main">
        <div className="dash-head">
          <div>
            <h1 className="dash-head__title">
              {view === 'all' && 'All clients'}
              {view === 'attention' && 'Needs attention'}
              {view === 'launching' && 'In-build'}
              {view === 'launched' && 'Launched'}
            </h1>
            <div className="dash-head__sub">
              {loading ? 'Loading…' : `${filtered.length} of ${enriched.length} clients`}
              {error && <span style={{ color: 'var(--red)', marginLeft: 12 }}>· {error}</span>}
            </div>
          </div>
          <div className="dash-head__actions">
            <button className="dash-btn" onClick={fetchClients}>↻ Refresh</button>
            <button className="dash-btn" onClick={() => { try { localStorage.removeItem(AUTH_KEY); } catch {} ; location.reload(); }}>Sign out</button>
          </div>
        </div>

        <div className="kpi-grid">
          <div className="kpi">
            <div className="kpi__label">Active builds</div>
            <div className="kpi__value">{kpis.active}</div>
            <div className="kpi__delta">Not yet launched</div>
          </div>
          <div className="kpi kpi--good">
            <div className="kpi__label">Launched · 7 days</div>
            <div className="kpi__value">{kpis.thisWeek}</div>
            <div className="kpi__delta">Went live this week</div>
          </div>
          <div className={`kpi ${kpis.attentionCount ? 'kpi--alert' : ''}`}>
            <div className="kpi__label">Needs attention</div>
            <div className="kpi__value">{kpis.attentionCount}</div>
            <div className="kpi__delta">SLA risk or stuck stage</div>
          </div>
          <div className="kpi">
            <div className="kpi__label">Launched all-time</div>
            <div className="kpi__value">{kpis.launched}</div>
            <div className="kpi__delta">Total</div>
          </div>
        </div>

        {view === 'all' && kpis.attentionCount > 0 && (
          <div className="attention">
            <div className="attention__head">
              <div className="attention__title">
                <span className="attention__dot" />
                Needs attention · {kpis.attentionCount}
              </div>
              <button className="dash-btn" onClick={() => setView('attention')}>View all →</button>
            </div>
            {enriched.filter(c => c._attention.length > 0).slice(0, 3).map(c => (
              <ClientRow key={c.submissionId} c={c} onClick={() => setSelected(c.submissionId)} attention />
            ))}
          </div>
        )}

        <div className="filters">
          <input
            className="filters__search"
            placeholder="Search name, email, NPN, anything…"
            value={filters.q || ''}
            onChange={(e) => setFilter('q', e.target.value)}
          />
          <select className="filters__sel" value={filters.tier || ''} onChange={(e) => setFilter('tier', e.target.value)}>
            <option value="">All tiers</option>
            <option value="exclusive">Exclusive</option>
            <option value="standard">Standard</option>
            <option value="starter">Starter</option>
          </select>
          <select className="filters__sel" value={filters.agentType || ''} onChange={(e) => setFilter('agentType', e.target.value)}>
            <option value="">All agent types</option>
            <option value="FEX">FEX</option>
            <option value="IUL">IUL</option>
            <option value="Annuity">Annuity</option>
          </select>
          {(filters.q || filters.tier || filters.agentType) && (
            <button className="filters__clear" onClick={() => { setFilters({}); try { localStorage.removeItem(FILTER_KEY); } catch {}; }}>Clear</button>
          )}
        </div>

        {loading ? (
          <div className="loading">Loading clients…</div>
        ) : filtered.length === 0 ? (
          <div className="table-wrap">
            <div className="table-empty">
              <div className="table-empty__big">
                {clients.length === 0 ? 'No submissions yet' : 'No matches'}
              </div>
              <div className="table-empty__sub">
                {clients.length === 0
                  ? 'When agents fill out onboard.duallymkt.com, they\'ll appear here.'
                  : 'Try clearing filters.'}
              </div>
            </div>
          </div>
        ) : (
          <div className="table-wrap">
            <div className="client-row client-row--head">
              <div>Client</div>
              <div>Tier</div>
              <div>Agent</div>
              <div>Progress</div>
              <div>Days</div>
              <div>Next</div>
            </div>
            {filtered.map(c => (
              <ClientRow key={c.submissionId} c={c}
                onClick={() => setSelected(c.submissionId)}
                attention={c._attention.length > 0} />
            ))}
          </div>
        )}
      </main>

      {selectedClient && (
        <Drawer
          c={selectedClient}
          onClose={() => setSelected(null)}
          onUpdateStage={updateStage}
          onUpdateNotes={updateNotes}
        />
      )}

      {toast && (
        <div className={`toast toast--${toast.kind}`}>{toast.msg}</div>
      )}
    </div>
  );
}

// =========================================================
// CLIENT ROW
// =========================================================
function ClientRow({ c, onClick, attention }) {
  const tierBadge = (c.tier || '').toLowerCase();
  const agentBadge = (c.agentType || '').toLowerCase();
  const setupStage = c.stages?.setupFeeCollected;
  const setupDate = setupStage?.status === 'done' ? setupStage.when : c.setupFeeDate;
  const days = daysSince(setupDate);
  const daysCls = days == null ? '' : (days > DASH_CONFIG.SLA_DAYS ? 'days-col--alert' : (days > 2 ? 'days-col--warn' : ''));

  // next stage = first non-done, non-skipped
  const applicable = STAGES.filter(s => s.key !== 'adsOn' || tierBadge === 'exclusive');
  const next = applicable.find(s => {
    const st = c.stages?.[s.key]?.status;
    return st !== 'done' && st !== 'skipped';
  });

  return (
    <div className={`client-row ${attention ? 'client-row--attention' : ''}`} onClick={onClick}>
      <div>
        <div className="client-name">{c.displayName || c.legalName || '—'}</div>
        <div className="client-sub">{c.submissionId}</div>
      </div>
      <div>
        {c.tier
          ? <span className={`badge badge--${tierBadge}`}>{c.tier}</span>
          : <span className="badge">—</span>}
      </div>
      <div>
        {c.agentType
          ? <span className={`badge badge--${agentBadge}`}>{c.agentType}</span>
          : <span className="badge">—</span>}
      </div>
      <div>
        <div className="progress-dots">
          {applicable.map(s => {
            const st = c.stages?.[s.key]?.status || 'pending';
            return <span key={s.key} className={`pdot pdot--${st}`} title={`${s.label} · ${st}`} />;
          })}
        </div>
        <div className="progress-meta">{c._pct}% · {applicable.filter(s => c.stages?.[s.key]?.status === 'done').length}/{applicable.length}</div>
      </div>
      <div className={`days-col ${daysCls}`}>
        {days == null ? '—' : `${days}d`}
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-3)' }}>
        {next ? next.label : '✓ Complete'}
      </div>
    </div>
  );
}

// =========================================================
// DRAWER — client detail with checklist + answers + notes
// =========================================================
function Drawer({ c, onClose, onUpdateStage, onUpdateNotes }) {
  const [tab, setTab] = useState('checklist'); // checklist | answers | notes
  const [notes, setNotes] = useState(c.notes || '');
  const notesTimer = useRef(null);

  useEffect(() => { setNotes(c.notes || ''); }, [c.submissionId]);

  const onNotesChange = (v) => {
    setNotes(v);
    clearTimeout(notesTimer.current);
    notesTimer.current = setTimeout(() => onUpdateNotes(c.submissionId, v), 700);
  };

  const applicable = STAGES.filter(s => s.key !== 'adsOn' || (c.tier || '').toLowerCase() === 'exclusive');

  return (
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <aside className="drawer">
        <div className="drawer__head">
          <div>
            <h2 className="drawer__title">{c.displayName || c.legalName || 'Client'}</h2>
            <div className="drawer__sub">
              {c.submissionId} · {c.tier || 'no tier'} · {c.agentType || 'no type'} · {c._pct}% built
            </div>
          </div>
          <button className="drawer__close" onClick={onClose}>×</button>
        </div>

        <div className="drawer__body">
          <div className="drawer-tabs">
            <button className={`drawer-tab ${tab === 'checklist' ? 'drawer-tab--active' : ''}`} onClick={() => setTab('checklist')}>Checklist</button>
            <button className={`drawer-tab ${tab === 'answers' ? 'drawer-tab--active' : ''}`} onClick={() => setTab('answers')}>Answers</button>
            <button className={`drawer-tab ${tab === 'notes' ? 'drawer-tab--active' : ''}`} onClick={() => setTab('notes')}>Notes + links</button>
          </div>

          {tab === 'checklist' && (
            <div className="checklist">
              {applicable.map((s, i) => {
                const stage = c.stages?.[s.key] || { status: 'pending' };
                return (
                  <div key={s.key} className={`check check--${stage.status}`}>
                    <span className="check__num">{String(i+1).padStart(2,'0')}</span>
                    <span className="check__label">{s.label}</span>
                    <span className="check__when">{stage.when ? fmtDate(stage.when) : ''}</span>
                    <select
                      className="check__sel"
                      value={stage.status}
                      onChange={(e) => onUpdateStage(c.submissionId, s.key, e.target.value)}
                    >
                      {STATUSES.map(st => <option key={st} value={st}>{st}</option>)}
                    </select>
                  </div>
                );
              })}
            </div>
          )}

          {tab === 'answers' && <AnswerViewer answers={c.answers || {}} />}

          {tab === 'notes' && (
            <div>
              <div className="ans-group__title">Internal notes</div>
              <textarea
                className="notes-area"
                value={notes}
                onChange={(e) => onNotesChange(e.target.value)}
                placeholder="Build notes, blockers, next steps…"
              />
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-4)', marginTop: 6, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                Auto-saves as you type
              </div>

              <div className="ans-group__title" style={{ marginTop: 24 }}>Quick links</div>
              <div className="drawer-meta">
                {c.docUrl && <a className="meta-link" target="_blank" rel="noopener" href={c.docUrl}>Full record · Google Doc</a>}
                {c.ghlContactUrl && <a className="meta-link" target="_blank" rel="noopener" href={c.ghlContactUrl}>GHL Contact</a>}
                {(c.answers?.proEmail) && <a className="meta-link" href={`mailto:${c.answers.proEmail}`}>Email agent</a>}
                {(c.answers?.cell) && <a className="meta-link" href={`tel:${c.answers.cell}`}>Call</a>}
              </div>

              <div className="ans-group__title" style={{ marginTop: 24 }}>Attention flags</div>
              {c._attention.length === 0 ? (
                <div style={{ color: 'var(--green)', fontSize: 13 }}>✓ On track</div>
              ) : c._attention.map((r, i) => (
                <div key={i} style={{ color: 'var(--red)', fontSize: 13, marginBottom: 4 }}>· {r}</div>
              ))}
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

// =========================================================
// ANSWER VIEWER
// =========================================================
function AnswerViewer({ answers }) {
  const used = new Set();
  const groups = ANSWER_GROUPS.map(g => ({
    title: g.title,
    items: g.keys.filter(k => answers[k] != null).map(k => { used.add(k); return [k, answers[k]]; })
  })).filter(g => g.items.length > 0);

  // Leftover keys
  const other = Object.entries(answers || {}).filter(([k]) => !used.has(k));
  if (other.length) groups.push({ title: 'Other', items: other });

  if (groups.length === 0) {
    return <div style={{ color: 'var(--text-3)', fontSize: 13 }}>No onboarding answers on file for this client yet.</div>;
  }

  const renderVal = (v) => {
    if (v == null || v === '') return <span className="ans__val ans__val--empty">—</span>;
    if (Array.isArray(v)) return <span className="ans__val">{v.join(', ')}</span>;
    if (typeof v === 'object') return <span className="ans__val">{JSON.stringify(v, null, 2)}</span>;
    return <span className="ans__val">{String(v)}</span>;
  };

  return (
    <div>
      {groups.map(g => (
        <div key={g.title} className="ans-group">
          <div className="ans-group__title">{g.title}</div>
          {g.items.map(([k, v]) => (
            <div key={k} className="ans">
              <span className="ans__key">{k}</span>
              {renderVal(v)}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
