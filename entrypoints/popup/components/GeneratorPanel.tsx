import { useState } from 'react';

import {
  DEFAULT_GENERATOR_OPTIONS,
  generatePassword,
  MIN_LENGTH,
  type GeneratorOptions,
} from '@/lib/generator';

const SLIDER_MAX = 64;

const TOGGLES: { key: keyof GeneratorOptions; label: string }[] = [
  { key: 'uppercase', label: 'A–Z' },
  { key: 'lowercase', label: 'a–z' },
  { key: 'digits', label: '0–9' },
  { key: 'symbols', label: '!@#' },
  { key: 'excludeAmbiguous', label: 'Avoid look-alikes (0/O, 1/l)' },
];

interface Props {
  onUse: (password: string) => void;
}

export function GeneratorPanel({ onUse }: Props) {
  const [options, setOptions] = useState(DEFAULT_GENERATOR_OPTIONS);
  const [preview, setPreview] = useState(() =>
    generatePassword(DEFAULT_GENERATOR_OPTIONS),
  );

  function update(next: GeneratorOptions) {
    const anyType =
      next.uppercase || next.lowercase || next.digits || next.symbols;
    if (!anyType) return; // keep at least one character type selected
    setOptions(next);
    setPreview(generatePassword(next));
  }

  return (
    <div className="generator">
      <output className="generator__preview">{preview}</output>

      <label className="generator__length">
        <span>Length: {options.length}</span>
        <input
          type="range"
          min={MIN_LENGTH}
          max={SLIDER_MAX}
          value={options.length}
          onChange={(e) =>
            update({ ...options, length: Number(e.target.value) })
          }
        />
      </label>

      <div className="generator__toggles">
        {TOGGLES.map(({ key, label }) => (
          <label key={key} className="check">
            <input
              type="checkbox"
              checked={Boolean(options[key])}
              onChange={(e) => update({ ...options, [key]: e.target.checked })}
            />
            {label}
          </label>
        ))}
      </div>

      <div className="actions">
        <button
          type="button"
          onClick={() => setPreview(generatePassword(options))}
        >
          Regenerate
        </button>
        <button
          type="button"
          className="primary"
          onClick={() => onUse(preview)}
        >
          Use this password
        </button>
      </div>
    </div>
  );
}
