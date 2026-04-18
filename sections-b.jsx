// Sections 6-10 + Tier select + Completion

const Section6_Testimonials = ({ data, update }) => {
  const items = data.testimonials || [];
  const setItems = v => update('testimonials', v);
  return (
    <>
      <div className="group">
        <div className="group__header">
          <h3 className="group__title">Existing testimonials</h3>
          <p className="group__hint">Pre-populates your site on day one. Skip if you don't have any — we'll show "review coming soon" cards and fire Testimonial.io requests as soon as you close your first clients.</p>
        </div>
        <Field label="Do you have any existing testimonials?">
          <CheckGrid
            value={data.hasTestimonials}
            onChange={v => update('hasTestimonials', v)}
            options={['Yes — adding them below', "No — I'll collect them"]}
            multi={false}
          />
        </Field>
        {data.hasTestimonials === 'Yes — adding them below' && (
          <>
            {items.map((t, i) => (
              <TestimonialRow
                key={i}
                idx={i}
                value={t}
                onChange={next => setItems(items.map((x, j) => j === i ? next : x))}
                onRemove={() => setItems(items.filter((_, j) => j !== i))}
              />
            ))}
            <button
              type="button"
              className="btn btn--ghost btn--small"
              onClick={() => setItems([...items, { quote: '', name: '', city: '', product: '' }])}
              style={{ marginTop: 8 }}
            >
              <Icon name="plus" className="" style={{ width: 12, height: 12 }} />
              Add testimonial
            </button>
          </>
        )}
      </div>
    </>
  );
};

const Section7_Tech = ({ data, update }) => (
  <>
    <div className="group">
      <div className="group__header">
        <h3 className="group__title">Accounts</h3>
        <p className="group__hint">Everything needed to wire Perspective, GHL, calendar, and chat without a follow-up call.</p>
      </div>
      <Field label="Perspective account?">
        <CheckGrid
          value={data.hasPerspective}
          onChange={v => update('hasPerspective', v)}
          options={['Yes', 'No — create one for me']}
          multi={false}
        />
      </Field>
      {data.hasPerspective === 'Yes' && (
        <Field label="Perspective login email">
          <Input value={data.perspectiveEmail} onChange={v => update('perspectiveEmail', v)} type="email" />
        </Field>
      )}
      <Field label="GHL sub-account through Dually?">
        <CheckGrid
          value={data.hasGhl}
          onChange={v => update('hasGhl', v)}
          options={['Yes', 'No — needs to be created']}
          multi={false}
        />
      </Field>
    </div>

    <div className="group">
      <div className="group__header">
        <h3 className="group__title">Calendar</h3>
      </div>
      <Field label="Calendar provider">
        <CheckGrid
          value={data.calendarProvider}
          onChange={v => update('calendarProvider', v)}
          options={['Google', 'Outlook']}
          multi={false}
        />
      </Field>
      <Field label="Email to connect">
        <Input value={data.calendarEmail} onChange={v => update('calendarEmail', v)} type="email" />
      </Field>
      <Field label="Booking page title" hint="What clients see">
        <Input
          value={data.bookingTitle}
          onChange={v => update('bookingTitle', v)}
          placeholder={`Free 20-Min Consultation with ${data.displayName || 'You'}`}
        />
      </Field>
      <Field label="Confirmation message" hint="Or leave blank for Dually default">
        <Textarea value={data.bookingConfirm} onChange={v => update('bookingConfirm', v)} rows={3} />
      </Field>
      <Field label="Fields to collect before the call">
        <CheckGrid
          value={data.bookingFields}
          onChange={v => update('bookingFields', v)}
          options={['Dually default (name, phone, email, product)', 'Custom — I\'ll note below']}
          multi={false}
        />
      </Field>
      {data.bookingFields === 'Custom — I\'ll note below' && (
        <Field label="Custom fields">
          <Textarea value={data.customBookingFields} onChange={v => update('customBookingFields', v)} rows={2} />
        </Field>
      )}
    </div>

    <div className="group">
      <div className="group__header">
        <h3 className="group__title">Compliance + payments</h3>
      </div>
      <Field label="A2P SMS registration">
        <CheckGrid
          value={data.a2pStatus}
          onChange={v => update('a2pStatus', v)}
          options={['Already registered', 'Not yet — start for me', 'No idea what this is']}
          multi={false}
        />
      </Field>
      <Field label="Stripe or payment processor connected to GHL?">
        <CheckGrid
          value={data.stripe}
          onChange={v => update('stripe', v)}
          options={['Yes', 'No', 'Not needed yet']}
          multi={false}
        />
      </Field>
    </div>
  </>
);

const Section8_Leads = ({ data, update }) => (
  <>
    <div className="group">
      <div className="group__header">
        <h3 className="group__title">Lead sources at launch</h3>
        <p className="group__hint">Drives which workflows fire on day one.</p>
      </div>
      <Field label="Where will your leads come from?">
        <CheckGrid
          value={data.leadSources}
          onChange={v => update('leadSources', v)}
          options={['Buying leads from Dually', 'My own Meta ads', 'Referrals / organic', 'Combination', 'Other']}
        />
      </Field>
      {(data.leadSources || []).includes('Other') && (
        <Field label="Tell us more">
          <Input value={data.leadSourceOther} onChange={v => update('leadSourceOther', v)} />
        </Field>
      )}
    </div>

    <div className="group">
      <div className="group__header">
        <h3 className="group__title">Meta + tracking</h3>
      </div>
      <Field label="Meta Business Manager account?">
        <CheckGrid
          value={data.hasMeta}
          onChange={v => update('hasMeta', v)}
          options={['Yes', 'No', 'Not sure']}
          multi={false}
        />
      </Field>
      <Field label="Facebook pixel installed anywhere?">
        <CheckGrid
          value={data.hasPixel}
          onChange={v => update('hasPixel', v)}
          options={['Yes', 'No', 'Not sure']}
          multi={false}
        />
      </Field>
    </div>

    <div className="group">
      <div className="group__header">
        <h3 className="group__title">Pipeline + imports</h3>
      </div>
      <Field label="Initial pipeline stage for new leads">
        <CheckGrid
          value={data.pipelineStage}
          onChange={v => update('pipelineStage', v)}
          options={['Dually default (New Lead)', 'Custom']}
          multi={false}
        />
      </Field>
      {data.pipelineStage === 'Custom' && (
        <Field label="Custom stage name">
          <Input value={data.customStage} onChange={v => update('customStage', v)} />
        </Field>
      )}
      <Field label="Existing lead list to import?">
        <CheckGrid
          value={data.hasLeadList}
          onChange={v => update('hasLeadList', v)}
          options={['Yes', 'No']}
          multi={false}
        />
      </Field>
      {data.hasLeadList === 'Yes' && (
        <Field label="How many leads, roughly?" hint="We'll send a CSV upload link in the follow-up email">
          <Input value={data.leadListSize} onChange={v => update('leadListSize', v)} placeholder="e.g. 340 leads from 2024 Meta campaign" />
        </Field>
      )}
    </div>
  </>
);

const Section9_Chatbot = ({ data, update }) => (
  <>
    <div className="group">
      <div className="group__header">
        <h3 className="group__title">Assistant identity</h3>
      </div>
      <div className="field--row" style={{ display: 'flex', gap: 16 }}>
        <Field label="What should the chatbot be called?">
          <Input value={data.botName} onChange={v => update('botName', v)} placeholder="Alex" />
        </Field>
        <Field label="Tone preference">
          <Select
            value={data.botTone}
            onChange={v => update('botTone', v)}
            options={['Warm and conversational', 'More professional and formal', 'Somewhere in between']}
          />
        </Field>
      </div>
    </div>

    <div className="group">
      <div className="group__header">
        <h3 className="group__title">Qualification rules</h3>
      </div>
      <Field label="Products the chatbot should qualify for">
        <CheckGrid
          value={data.botProducts}
          onChange={v => update('botProducts', v)}
          options={['Final Expense', 'IUL', 'Whole Life']}
        />
      </Field>
      <div className="field--row" style={{ display: 'flex', gap: 16 }}>
        <Field label="FEX age range">
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Input value={data.fexMin} onChange={v => update('fexMin', v)} placeholder="50" />
            <span style={{ color: 'var(--ink-3)' }}>to</span>
            <Input value={data.fexMax} onChange={v => update('fexMax', v)} placeholder="80" />
          </div>
        </Field>
        <Field label="IUL age range">
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Input value={data.iulMin} onChange={v => update('iulMin', v)} placeholder="25" />
            <span style={{ color: 'var(--ink-3)' }}>to</span>
            <Input value={data.iulMax} onChange={v => update('iulMax', v)} placeholder="65" />
          </div>
        </Field>
      </div>
      <Field label="Handoff response time">
        <CheckGrid
          value={data.handoffTime}
          onChange={v => update('handoffTime', v)}
          options={['Within 1 hour', 'Within 2–4 hours', 'Within same business day']}
          multi={false}
        />
      </Field>
      <Field label="Topics the bot should never touch" hint="Specific carriers, health conditions, etc.">
        <Textarea value={data.botNever} onChange={v => update('botNever', v)} rows={2} />
      </Field>
    </div>
  </>
);

const Section10_Preferences = ({ data, update }) => (
  <>
    <div className="group">
      <div className="group__header">
        <h3 className="group__title">Launch call setup</h3>
        <p className="group__hint">So we don't waste the 30 minutes re-explaining basics.</p>
      </div>
      <Field label="Have you watched the Dually vault videos?">
        <CheckGrid
          value={data.watchedVault}
          onChange={v => update('watchedVault', v)}
          options={['All of them', 'Some of them', 'Not yet']}
          multi={false}
        />
      </Field>
      <Field label="Biggest concern or priority for the launch call?" required>
        <Textarea
          value={data.launchConcern}
          onChange={v => update('launchConcern', v)}
          rows={4}
          placeholder="Open — this tells us where to spend the 30 minutes."
        />
      </Field>
      <Field label="Technical comfort level">
        <CheckGrid
          value={data.techLevel}
          onChange={v => update('techLevel', v)}
          options={[
            'Very comfortable — know GHL well',
            'Moderate — used CRMs before',
            'Low — new to all of this'
          ]}
          multi={false}
        />
      </Field>
    </div>

    <div className="group">
      <div className="group__header">
        <h3 className="group__title">Team + logistics</h3>
      </div>
      <Field label="Virtual assistant or team member needs GHL access?">
        <CheckGrid
          value={data.hasVA}
          onChange={v => update('hasVA', v)}
          options={['Yes', 'Just me']}
          multi={false}
        />
      </Field>
      {data.hasVA === 'Yes' && (
        <div className="field--row" style={{ display: 'flex', gap: 16 }}>
          <Field label="Name"><Input value={data.vaName} onChange={v => update('vaName', v)} /></Field>
          <Field label="Email"><Input value={data.vaEmail} onChange={v => update('vaEmail', v)} type="email" /></Field>
        </div>
      )}
      <Field label="Preferred launch call format">
        <CheckGrid
          value={data.callFormat}
          onChange={v => update('callFormat', v)}
          options={['Zoom (screen share)', 'Google Meet', 'Phone only']}
          multi={false}
        />
      </Field>
      <Field label="Anything else we should know?">
        <Textarea value={data.notes} onChange={v => update('notes', v)} rows={3} />
      </Field>
    </div>
  </>
);

// Tier selection (section 0)
const Section0_Tier = ({ data, update }) => (
  <>
    <div className="group">
      <div className="group__header">
        <h3 className="group__title">What kind of agent are you?</h3>
        <p className="group__hint">Picks your snapshot — determines what gets deployed and which questions we'll ask next. You can sell across types; choose your primary.</p>
      </div>
      <div className="agent-cards">
        {[
          { id: 'fex', abbrev: 'FEX / Whole', name: 'Final Expense', desc: 'Senior market. FEX, whole life, simplified-issue.' },
          { id: 'iul', abbrev: 'IUL', name: 'Indexed Universal Life', desc: 'Consumer and business-owner cash accumulation.' },
          { id: 'ann', abbrev: 'Annuity', name: 'Annuity / Retirement', desc: 'Retirement income, rollovers, fixed + indexed.' }
        ].map(t => (
          <button
            key={t.id}
            type="button"
            className={`agent-card ${data.agentType === t.id ? 'agent-card--on' : ''}`}
            onClick={() => update('agentType', t.id)}
          >
            <div className="agent-card__abbrev">{t.abbrev}</div>
            <div className="agent-card__name">{t.name}</div>
            <div className="agent-card__desc">{t.desc}</div>
          </button>
        ))}
      </div>
    </div>

    <div className="group">
      <div className="group__header">
        <h3 className="group__title">Confirm your plan</h3>
        <p className="group__hint">What you signed up for. Change any time with our team.</p>
      </div>
      <div className="tiers">
        {[
          { id: 'launch', name: 'Launch', price: '$397', per: '/mo',
            features: ['Fully built CRM + pipeline', '14 done-for-you automations', 'Branded website + funnel', '24/7 Conversation AI', 'A2P registration handled'] },
          { id: 'growth', name: 'Growth', price: '$597', per: '/mo', badge: 'Most popular',
            features: ['Everything in Launch', '24/7 Voice AI Concierge', 'Google Business Profile', 'Monthly strategy call', 'Priority support'] },
          { id: 'exclusive', name: 'Exclusive Leads', price: '$997+', per: '/mo + ad spend',
            features: ['Growth plan required', 'Exclusive territory', 'DFY Meta ads + creative', 'Custom landing pages', '$1,500/mo min ad spend'] }
        ].map(t => (
          <div key={t.id} className={`tier ${data.tier === t.id ? 'tier--on' : ''}`} onClick={() => update('tier', t.id)} role="button">
            {t.badge && <span className="tier__badge">{t.badge}</span>}
            <div className="tier__name">{t.name}</div>
            <div className="tier__price">{t.price}<span style={{ fontSize: 14, opacity: 0.55, marginLeft: 2 }}>{t.per}</span></div>
            <ul className="tier__features">{t.features.map((f, i) => <li key={i}>{f}</li>)}</ul>
          </div>
        ))}
      </div>
      <Field label="Committed to the 30-Day Fast Start track?" hint="Required for the booking guarantee">
        <CheckGrid value={data.fastStart} onChange={v => update('fastStart', v)} options={['Yes', 'Not yet']} multi={false} />
      </Field>
    </div>
  </>
);

Object.assign(window, {
  Section0_Tier,
  Section6_Testimonials, Section7_Tech, Section8_Leads,
  Section9_Chatbot, Section10_Preferences
});
