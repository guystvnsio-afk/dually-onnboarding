// Section components — sections 1-5
const { useState: useStateS1 } = React;

const Section1_Identity = ({ data, update }) => (
  <>
    <div className="group">
      <div className="group__header">
        <h3 className="group__title">Legal basics</h3>
        <p className="group__hint">Required for your website compliance footer and GHL setup.</p>
      </div>
      <div className="field--row" style={{ display: 'flex', gap: 16 }}>
        <Field label="Full legal name" required>
          <Input value={data.legalName} onChange={v => update('legalName', v)} placeholder="Jane A. Doe" />
        </Field>
        <Field label="Preferred / display name" hint="If different">
          <Input value={data.displayName} onChange={v => update('displayName', v)} placeholder="Jane Doe" />
        </Field>
      </div>
      <Field label="Agency / brand name" hint='Or type "Independent"'>
        <Input value={data.agencyName} onChange={v => update('agencyName', v)} placeholder="Doe Family Insurance" />
      </Field>
    </div>

    <div className="group">
      <div className="group__header">
        <h3 className="group__title">Licensing</h3>
        <p className="group__hint">These live in your footer and compliance blocks. We verify each one before launch.</p>
      </div>
      <div className="field--row" style={{ display: 'flex', gap: 16 }}>
        <Field label="NPN number" required>
          <Input value={data.npn} onChange={v => update('npn', v)} placeholder="12345678" />
        </Field>
        <Field label="Years licensed">
          <Input type="number" value={data.yearsLicensed} onChange={v => update('yearsLicensed', v)} placeholder="7" />
        </Field>
      </div>
      <Field label="State license number(s)" hint="Separate with commas">
        <Input value={data.stateLicenses} onChange={v => update('stateLicenses', v)} placeholder="AZ-123456, TX-987654" />
      </Field>
      <Field label="Licensed states" hint="List all">
        <Input value={data.licensedStates} onChange={v => update('licensedStates', v)} placeholder="AZ, TX, NV, CA" />
      </Field>
      <Field label="Carrier appointments" hint="List all">
        <Textarea
          value={data.carriers}
          onChange={v => update('carriers', v)}
          placeholder="Mutual of Omaha, Transamerica, Americo, Foresters, SBLI…"
        />
      </Field>
    </div>
  </>
);

const Section2_Contact = ({ data, update }) => (
  <>
    <div className="group">
      <div className="group__header">
        <h3 className="group__title">Phone + email</h3>
        <p className="group__hint">The GHL number is what leads text and call. Personal number stays internal.</p>
      </div>
      <div className="field--row" style={{ display: 'flex', gap: 16 }}>
        <Field label="Personal cell" hint="Internal use only" required>
          <Input value={data.cell} onChange={v => update('cell', v)} placeholder="(555) 555-5555" />
        </Field>
        <Field label="GHL phone number" hint="Pending is fine">
          <Input value={data.ghlPhone} onChange={v => update('ghlPhone', v)} placeholder="(555) 555-0123 or 'pending'" />
        </Field>
      </div>
      <div className="field--row" style={{ display: 'flex', gap: 16 }}>
        <Field label="Professional email" required>
          <Input type="email" value={data.proEmail} onChange={v => update('proEmail', v)} placeholder="jane@agency.com" />
        </Field>
        <Field label="Email for lead notifications">
          <Input type="email" value={data.leadEmail} onChange={v => update('leadEmail', v)} placeholder="leads@agency.com" />
        </Field>
      </div>
      <Field label="Preferred notification method">
        <CheckGrid
          value={data.notifyMethod}
          onChange={v => update('notifyMethod', v)}
          options={['SMS', 'Email', 'Both']}
          multi={false}
        />
      </Field>
    </div>

    <div className="group">
      <div className="group__header">
        <h3 className="group__title">Availability</h3>
        <p className="group__hint">Drives your booking calendar logic.</p>
      </div>
      <Field label="Time zone" required>
        <Select
          value={data.timezone}
          onChange={v => update('timezone', v)}
          options={['Eastern (ET)', 'Central (CT)', 'Mountain (MT)', 'Pacific (PT)', 'Alaska (AKT)', 'Hawaii (HST)']}
        />
      </Field>
      <Field label="Days available for appointments">
        <CheckGrid
          value={data.days}
          onChange={v => update('days', v)}
          options={['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']}
        />
      </Field>
      <Field label="Hours available" hint="e.g. 9am–6pm">
        <Input value={data.hours} onChange={v => update('hours', v)} placeholder="9:00 AM – 6:00 PM" />
      </Field>
      <div className="field--row" style={{ display: 'flex', gap: 16 }}>
        <Field label="Buffer between appointments">
          <Select
            value={data.buffer}
            onChange={v => update('buffer', v)}
            options={['0 min', '15 min', '30 min', '45 min', '60 min']}
          />
        </Field>
        <Field label="Max appointments per day">
          <Input type="number" value={data.maxAppts} onChange={v => update('maxAppts', v)} placeholder="8" />
        </Field>
      </div>
    </div>
  </>
);

const Section3_Products = ({ data, update }) => {
  const t = data.agentType;
  const productOpts = t === 'iul'
    ? ['Indexed Universal Life (IUL)', 'Whole Life', 'Term Life', 'Annuity (cross-sell)']
    : t === 'ann'
    ? ['Fixed Annuity', 'Indexed Annuity (FIA)', 'MYGA', 'IUL (cross-sell)', 'Rollover 401k / IRA']
    : ['Final Expense (FEX)', 'Whole Life', 'Term Life', 'Medicare (future)', 'Mortgage Protection (future)'];
  const primaryOpts = t === 'iul'
    ? ['IUL — consumer', 'IUL — business owner', 'Whole Life', 'Term Life']
    : t === 'ann'
    ? ['Fixed / MYGA', 'Indexed Annuity (FIA)', 'Rollover / retirement planning']
    : ['Final Expense', 'Whole Life', 'Term Life'];

  return (
  <>
    <div className="group">
      <div className="group__header">
        <h3 className="group__title">Products you sell</h3>
        <p className="group__hint">Determines chatbot routing, pipeline tags, website card content, and funnel copy. Tailored to your agent type.</p>
      </div>
      <Field label="Products offered" required>
        <CheckGrid value={data.products} onChange={v => update('products', v)} options={productOpts} />
      </Field>
      <Field label="Primary product focus" hint="What you want most leads for" required>
        <CheckGrid value={data.primaryProduct} onChange={v => update('primaryProduct', v)} options={primaryOpts} multi={false} />
      </Field>
    </div>

    <div className="group">
      <div className="group__header">
        <h3 className="group__title">Ideal client profile</h3>
        <p className="group__hint">Written in your words. Alex the chatbot uses this to qualify.</p>
      </div>
      <Field label="Target client age range">
        <Input value={data.ageRange} onChange={v => update('ageRange', v)} placeholder="50–80" />
      </Field>
      <Field label="Who is your ideal client?" required>
        <Textarea
          value={data.icp}
          onChange={v => update('icp', v)}
          placeholder="Homeowners 55+ who want to make sure their family isn't stuck with funeral costs. Usually blue-collar, married, one or two kids grown and out of the house."
          rows={4}
        />
        <AIHelper
          label="Tighten this into one sentence"
          prompt={`Rewrite this ideal-client description as one crisp sentence a chatbot could use to qualify prospects. No fluff, no adjectives pile-up. Original:\n\n"${data.icp || ''}"\n\nReturn just the sentence.`}
          disabled={!data.icp}
          onResult={v => update('icp', v)}
        />
      </Field>
      <div className="field--row" style={{ display: 'flex', gap: 16 }}>
        <Field label="Average premium per policy">
          <Input value={data.avgPremium} onChange={v => update('avgPremium', v)} placeholder="$1,200" />
        </Field>
        <Field label="Policies per month currently">
          <Input type="number" value={data.policiesMonth} onChange={v => update('policiesMonth', v)} placeholder="12" />
        </Field>
      </div>
    </div>
  </>
  );
};

const Section4_Brand = ({ data, update }) => (
  <>
    <div className="group">
      <div className="group__header">
        <h3 className="group__title">Colors</h3>
        <p className="group__hint">No preference? Leave blank — we'll use the Dually navy/white/gold template.</p>
      </div>
      <div className="field--row" style={{ display: 'flex', gap: 16 }}>
        <Field label="Primary brand color">
          <ColorInput value={data.primaryColor} onChange={v => update('primaryColor', v)} />
        </Field>
        <Field label="Secondary brand color">
          <ColorInput value={data.secondaryColor} onChange={v => update('secondaryColor', v)} />
        </Field>
      </div>
    </div>

    <div className="group">
      <div className="group__header">
        <h3 className="group__title">Assets — sent separately</h3>
        <p className="group__hint">Don't upload anything here. We send a secondary form link as soon as this is submitted so you can drop files from your desktop, phone, or email without wrestling with this form.</p>
      </div>
      <div className="upload-later">
        <div className="upload-later__icon">
          <svg viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round"><path d="M22 6l-10 7L2 6"/><rect x="2" y="4" width="20" height="16" rx="2"/></svg>
        </div>
        <div>
          <strong>Upload link emailed after submit.</strong> You'll get a tidy form for logo (PNG w/ transparent bg), headshot (min 800×800), and any extra lifestyle / office / family photos.
        </div>
      </div>
    </div>

    <div className="group">
      <div className="group__header">
        <h3 className="group__title">Existing web presence</h3>
      </div>
      <Field label="Existing website URL" hint="Leave blank if none">
        <Input value={data.existingWebsite} onChange={v => update('existingWebsite', v)} placeholder="https://…" />
      </Field>
      <div className="field--row" style={{ display: 'flex', gap: 16 }}>
        <Field label="LinkedIn"><Input value={data.linkedin} onChange={v => update('linkedin', v)} placeholder="linkedin.com/in/…" /></Field>
        <Field label="Facebook"><Input value={data.facebook} onChange={v => update('facebook', v)} placeholder="facebook.com/…" /></Field>
      </div>
      <div className="field--row" style={{ display: 'flex', gap: 16 }}>
        <Field label="Instagram"><Input value={data.instagram} onChange={v => update('instagram', v)} placeholder="instagram.com/…" /></Field>
        <Field label="Other"><Input value={data.otherSocial} onChange={v => update('otherSocial', v)} placeholder="YouTube, TikTok, etc." /></Field>
      </div>
    </div>
  </>
);

const Section5_Copy = ({ data, update }) => (
  <>
    <div className="group">
      <div className="group__header">
        <h3 className="group__title">Hero section</h3>
        <p className="group__hint">Fills the top of your homepage.</p>
      </div>
      <Field label="City and state to display" required>
        <Input value={data.heroCity} onChange={v => update('heroCity', v)} placeholder="Phoenix, AZ" />
      </Field>
      <Field label="Tagline / positioning statement" hint="Optional — we'll write from your inputs if blank">
        <Input value={data.tagline} onChange={v => update('tagline', v)} placeholder="Protecting Arizona families — one promise at a time." />
        <AIHelper
          label="Draft a tagline for me"
          prompt={`Write 3 short tagline options (max 8 words each) for an independent life-insurance agent. Context:\n- City/state: ${data.heroCity || 'not provided'}\n- Primary product: ${data.primaryProduct || 'not provided'}\n- Ideal client: ${data.icp || 'not provided'}\n- Voice: warm, credible, not corporate.\n\nReturn the best one on its own line, then two alternates prefixed with "—".`}
          onResult={v => update('tagline', v.split('\n')[0].replace(/^["'\-–—\s]+|["'\s]+$/g, ''))}
        />
      </Field>
    </div>

    <div className="group">
      <div className="group__header">
        <h3 className="group__title">About page</h3>
        <p className="group__hint">Tell it the way you'd tell it to a client over coffee. Don't be corporate.</p>
      </div>
      <Field label="Why did you become an insurance agent?" hint="2–4 sentences">
        <Textarea
          value={data.whyAgent}
          onChange={v => update('whyAgent', v)}
          placeholder="Tell the story…"
          rows={4}
        />
      </Field>
      <Field label="Who do you typically help?">
        <Textarea
          value={data.typicalClient}
          onChange={v => update('typicalClient', v)}
          placeholder="Your typical client in a few sentences."
          rows={3}
        />
      </Field>
      <Field label="What makes your approach different?" hint="2–3 sentences">
        <Textarea
          value={data.differentiator}
          onChange={v => update('differentiator', v)}
          placeholder="What's different about working with you?"
          rows={3}
        />
      </Field>
      <Field label="Personal story or background" hint="Optional but powerful">
        <Textarea
          value={data.personalStory}
          onChange={v => update('personalStory', v)}
          placeholder="Anything that shaped how you do this work?"
          rows={3}
        />
        <AIHelper
          label="Draft my About paragraph"
          prompt={`Using the bullet points below, write a single ~120-word About paragraph in first person for an independent insurance agent's website. Warm, credible, not corporate. No bullets in the output — flowing prose.\n\n- Why I became an agent: ${data.whyAgent || '(blank)'}\n- Who I help: ${data.typicalClient || '(blank)'}\n- What's different: ${data.differentiator || '(blank)'}\n- Personal: ${data.personalStory || '(blank)'}\n\nReturn just the paragraph.`}
          onResult={v => update('aboutParagraph', v)}
        />
      </Field>
      {data.aboutParagraph && (
        <Field label="Generated About paragraph" hint="Edit freely">
          <Textarea
            value={data.aboutParagraph}
            onChange={v => update('aboutParagraph', v)}
            rows={6}
          />
        </Field>
      )}
      <Field label="Credentials, awards, recognitions" hint="Optional">
        <Textarea value={data.credentials} onChange={v => update('credentials', v)} rows={2} />
      </Field>
    </div>

    <div className="group">
      <div className="group__header">
        <h3 className="group__title">Trust bar</h3>
      </div>
      <Field label="Families helped / policies issued" hint="Conservative number is fine">
        <Input value={data.familiesHelped} onChange={v => update('familiesHelped', v)} placeholder="450" />
      </Field>
    </div>

    <div className="group">
      <div className="group__header">
        <h3 className="group__title">FAQ answers</h3>
      </div>
      <Field label="Do you require a medical exam?">
        <CheckGrid
          value={data.medicalExam}
          onChange={v => update('medicalExam', v)}
          options={['Yes', 'No', 'Depends on product']}
          multi={false}
        />
      </Field>
      <Field label="Typical approval timeline">
        <Input value={data.approvalTimeline} onChange={v => update('approvalTimeline', v)} placeholder="Same day to 2 weeks" />
      </Field>
      <Field label="Work with pre-existing conditions?">
        <CheckGrid
          value={data.preExisting}
          onChange={v => update('preExisting', v)}
          options={['Yes', 'Sometimes', 'Rarely']}
          multi={false}
        />
      </Field>
      <Field label="How are you compensated?" hint="This literally goes in your FAQ">
        <Textarea
          value={data.compensation}
          onChange={v => update('compensation', v)}
          rows={2}
          placeholder="I'm paid by the carrier — no cost to you for the consultation."
        />
      </Field>
    </div>
  </>
);

Object.assign(window, {
  Section1_Identity, Section2_Contact, Section3_Products,
  Section4_Brand, Section5_Copy
});
