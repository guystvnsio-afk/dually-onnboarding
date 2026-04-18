// Reusable form primitives for Dually onboarding
const { useState, useRef, useEffect, useCallback, useMemo } = React;

const Icon = ({ name, className }) => {
  const paths = {
    check: <polyline points="4 12 9 17 20 6" />,
    arrow: <path d="M5 12h14M13 5l7 7-7 7" />,
    arrowLeft: <path d="M19 12H5M11 5l-7 7 7 7" />,
    upload: <g><path d="M12 16V4M5 11l7-7 7 7"/><path d="M20 16v4H4v-4"/></g>,
    sparkle: <g><path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5z"/><path d="M18 15l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z"/></g>,
    save: <g><path d="M5 3h11l3 3v15H5z"/><path d="M8 3v5h8V3"/></g>,
    plus: <path d="M12 5v14M5 12h14" />,
    trash: <g><path d="M4 7h16M10 11v6M14 11v6"/><path d="M6 7l1 13h10l1-13"/><path d="M9 4h6v3H9z"/></g>,
    user: <g><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-7 8-7s8 3 8 7"/></g>,
    shield: <path d="M12 3l8 3v6c0 5-4 8-8 9-4-1-8-4-8-9V6z"/>,
  };
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {paths[name]}
    </svg>
  );
};

const Field = ({ label, hint, required, children, aiSlot }) => (
  <div className="field">
    {label && (
      <label className="label">
        {label}
        {required && <span className="label__req">REQ</span>}
        {hint && <span className="label__hint">{hint}</span>}
      </label>
    )}
    {children}
    {aiSlot}
  </div>
);

const Input = ({ value, onChange, placeholder, type = 'text', ...rest }) => (
  <input
    className="input"
    type={type}
    value={value || ''}
    onChange={e => onChange(e.target.value)}
    placeholder={placeholder}
    {...rest}
  />
);

const Textarea = ({ value, onChange, placeholder, rows, ...rest }) => (
  <textarea
    className="textarea"
    value={value || ''}
    onChange={e => onChange(e.target.value)}
    placeholder={placeholder}
    rows={rows}
    {...rest}
  />
);

const Select = ({ value, onChange, options, placeholder }) => (
  <select className="select input" value={value || ''} onChange={e => onChange(e.target.value)}>
    <option value="">{placeholder || 'Select…'}</option>
    {options.map(o => (
      <option key={typeof o === 'string' ? o : o.value} value={typeof o === 'string' ? o : o.value}>
        {typeof o === 'string' ? o : o.label}
      </option>
    ))}
  </select>
);

const Check = ({ label, checked, onChange, radio }) => (
  <button
    type="button"
    className={`check ${radio ? 'check--radio' : ''} ${checked ? 'check--on' : ''}`}
    onClick={() => onChange(!checked)}
  >
    <span className="check__box">
      {!radio && (
        <svg viewBox="0 0 24 24"><polyline points="4 12 9 17 20 6" /></svg>
      )}
    </span>
    <span>{label}</span>
  </button>
);

const CheckGrid = ({ options, value, onChange, multi = true }) => {
  const set = new Set(Array.isArray(value) ? value : value ? [value] : []);
  return (
    <div className="check-grid">
      {options.map(o => {
        const v = typeof o === 'string' ? o : o.value;
        const label = typeof o === 'string' ? o : o.label;
        const on = set.has(v);
        return (
          <Check
            key={v}
            label={label}
            checked={on}
            radio={!multi}
            onChange={next => {
              if (multi) {
                const newSet = new Set(set);
                if (next) newSet.add(v); else newSet.delete(v);
                onChange(Array.from(newSet));
              } else {
                onChange(next ? v : '');
              }
            }}
          />
        );
      })}
    </div>
  );
};

const ColorInput = ({ value, onChange, placeholder }) => {
  const hex = /^#[0-9a-f]{6}$/i.test(value || '') ? value : '#0A1628';
  return (
    <div className="color-row">
      <input
        type="color"
        value={hex}
        onChange={e => onChange(e.target.value)}
      />
      <input
        className="input"
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder || '#0A1628 or describe'}
      />
    </div>
  );
};

const UploadField = ({ value, onChange, title, sub, accept = 'image/*' }) => {
  const fileRef = useRef(null);
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    if (value && value instanceof File) {
      const url = URL.createObjectURL(value);
      setPreview(url);
      return () => URL.revokeObjectURL(url);
    } else if (typeof value === 'string' && value) {
      setPreview(value);
    } else {
      setPreview(null);
    }
  }, [value]);

  const handleFile = (f) => {
    if (!f) return;
    // Store as dataURL so it persists in localStorage
    const reader = new FileReader();
    reader.onload = () => onChange({ name: f.name, size: f.size, dataURL: reader.result });
    reader.readAsDataURL(f);
  };

  const hasFile = value && (value.dataURL || value.name);
  return (
    <div
      className={`upload ${hasFile ? 'upload--has' : ''}`}
      onClick={() => fileRef.current?.click()}
      onDragOver={e => { e.preventDefault(); }}
      onDrop={e => { e.preventDefault(); handleFile(e.dataTransfer.files[0]); }}
    >
      <input
        ref={fileRef}
        type="file"
        accept={accept}
        style={{ display: 'none' }}
        onChange={e => handleFile(e.target.files[0])}
      />
      {hasFile && value.dataURL && accept.startsWith('image') ? (
        <img className="upload__preview" src={value.dataURL} alt="" />
      ) : (
        <div className="upload__icon"><Icon name="upload" /></div>
      )}
      <div className="upload__main">
        {hasFile ? value.name : title}
      </div>
      <div className="upload__sub">
        {hasFile ? `${Math.round((value.size || 0) / 1024)} KB · click to replace` : sub}
      </div>
    </div>
  );
};

// AI assist — uses window.claude.complete when available, with a local fallback
const AIHelper = ({ label, prompt, onResult, disabled }) => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');
  const [error, setError] = useState('');

  const run = async () => {
    setLoading(true); setError(''); setResult('');
    try {
      if (typeof window.claude?.complete === 'function') {
        const out = await window.claude.complete(prompt);
        setResult(String(out).trim());
      } else {
        // local mock
        await new Promise(r => setTimeout(r, 900));
        setResult('AI assist runs against Claude in production. Preview is using a placeholder response. Connect your deployment to populate suggestions here.');
      }
    } catch (e) {
      setError(e.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ marginTop: 8 }}>
      <button type="button" className="btn--ai" onClick={run} disabled={disabled || loading}>
        <Icon name="sparkle" className="" />
        {loading ? 'Thinking…' : label}
      </button>
      {result && (
        <div className="ai-panel">
          <div className="ai-panel__head">
            <span className="ai-panel__label">Suggested</span>
            <button className="ai-panel__use" onClick={() => { onResult(result); setResult(''); }}>
              Use this
            </button>
          </div>
          {result}
        </div>
      )}
      {error && <div style={{ color: 'var(--red)', fontSize: 12, marginTop: 6 }}>{error}</div>}
    </div>
  );
};

// Testimonial sub-form
const TestimonialRow = ({ value, onChange, onRemove, idx }) => (
  <div className="testi">
    <div className="testi__head">
      <span>Testimonial {idx + 1}</span>
      <button className="btn btn--ghost btn--small" onClick={onRemove} type="button">
        <Icon name="trash" className="" style={{ width: 12, height: 12 }} /> Remove
      </button>
    </div>
    <Field label="Quote">
      <Textarea
        value={value.quote}
        onChange={v => onChange({ ...value, quote: v })}
        placeholder="What did they say?"
        rows={3}
      />
    </Field>
    <div className="field--row" style={{ display: 'flex', gap: 16 }}>
      <Field label="First name + last initial">
        <Input
          value={value.name}
          onChange={v => onChange({ ...value, name: v })}
          placeholder="e.g. Jessica M."
        />
      </Field>
      <Field label="City, state">
        <Input
          value={value.city}
          onChange={v => onChange({ ...value, city: v })}
          placeholder="Phoenix, AZ"
        />
      </Field>
      <Field label="Product">
        <Input
          value={value.product}
          onChange={v => onChange({ ...value, product: v })}
          placeholder="e.g. FEX"
        />
      </Field>
    </div>
  </div>
);

// Export to window for other scripts
Object.assign(window, {
  Icon, Field, Input, Textarea, Select, Check, CheckGrid,
  ColorInput, UploadField, AIHelper, TestimonialRow
});
