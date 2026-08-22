import { useState, useEffect } from 'react';

const COUNTRY_CODES = [
  { code: '+92', flag: '🇵🇰', label: 'PK' },
  { code: '+1',  flag: '🇺🇸', label: 'US' },
  { code: '+44', flag: '🇬🇧', label: 'UK' },
  { code: '+971', flag: '🇦🇪', label: 'UAE' },
  { code: '+966', flag: '🇸🇦', label: 'SA' }
];

export default function PhoneInput({ value = '', onChange, name = 'phone', placeholder = '0300-1234567' }) {
  // Parse initial value to separate country code and number
  const [country, setCountry] = useState('+92');
  const [localNumber, setLocalNumber] = useState('');

  useEffect(() => {
    if (!value) {
      setLocalNumber('');
      return;
    }
    
    // Attempt to split an existing full number (e.g. +92 300-1234567)
    let foundCode = COUNTRY_CODES.find(c => value.startsWith(c.code));
    if (foundCode) {
      setCountry(foundCode.code);
      let remainder = value.slice(foundCode.code.length).trim();
      setLocalNumber(formatLocal(remainder));
    } else {
      setLocalNumber(formatLocal(value));
    }
  }, [value]);

  function formatLocal(text) {
    // Strip all non-digits
    const raw = text.replace(/\D/g, '');
    if (!raw) return '';

    if (raw.startsWith('0')) {
      // Format: 0XXX-XXXXXXX
      const prefix = raw.slice(0, 4);
      const suffix = raw.slice(4, 11);
      return suffix ? `${prefix}-${suffix}` : prefix;
    } else {
      // Format: XXX-XXXXXXX
      const prefix = raw.slice(0, 3);
      const suffix = raw.slice(3, 10);
      return suffix ? `${prefix}-${suffix}` : prefix;
    }
  }

  function handleNumberChange(e) {
    const formatted = formatLocal(e.target.value);
    setLocalNumber(formatted);
    // Propagate the full number up
    const fullNumber = formatted ? `${country} ${formatted}` : '';
    onChange({ target: { name, value: fullNumber } });
  }

  function handleCountryChange(e) {
    const newCountry = e.target.value;
    setCountry(newCountry);
    const fullNumber = localNumber ? `${newCountry} ${localNumber}` : '';
    onChange({ target: { name, value: fullNumber } });
  }

  return (
    <div style={{ display: 'flex', gap: '6px', width: '100%' }}>
      <div style={{ position: 'relative', width: '84px', flexShrink: 0 }}>
        <select 
          className="input" 
          value={country} 
          onChange={handleCountryChange}
          style={{ paddingLeft: '24px', paddingRight: '12px', fontSize: '0.8rem', cursor: 'pointer' }}
        >
          {COUNTRY_CODES.map(c => (
            <option key={c.code} value={c.code}>{c.code}</option>
          ))}
        </select>
        <div style={{ position: 'absolute', top: '50%', left: '6px', transform: 'translateY(-50%)', pointerEvents: 'none', fontSize: '0.8rem' }}>
          {COUNTRY_CODES.find(c => c.code === country)?.flag}
        </div>
      </div>
      
      <input
        type="tel"
        className="input"
        placeholder={placeholder}
        value={localNumber}
        onChange={handleNumberChange}
        style={{ flex: 1, minWidth: 0, fontSize: '0.82rem', paddingLeft: '8px', paddingRight: '8px' }}
      />
    </div>
  );
}
