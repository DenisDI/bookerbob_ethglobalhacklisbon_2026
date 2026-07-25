// Where a judge takes over. Type an address or a name, or click a pinned one.
//
// A text field rather than a wallet connect, on purpose: connecting a wallet on
// stage fails often and proves nothing extra, while typing works from any
// laptop, including the judge's own. Consent is the act of typing.

import { useState } from "react";

export interface Showcase {
  input: string;
  label: string;
}

/** Verified live on 2026-07-25; each one lands on a different term. */
export const SHOWCASE: Showcase[] = [
  { input: "vitalik.eth", label: "vitalik.eth" },
  { input: "0x62e2ceb6933a0747579f4f9f96d3253a7af0b237", label: "long-time borrower" },
  { input: "0x646c5ba59f30cf73deea9b00e13aead674c6b07a", label: "first-day wallet" },
];

interface Props {
  value: string;
  onChange(next: string): void;
  /** A chip passes its own value, so one click both fills and runs. */
  onSubmit(override?: string): void;
  disabled: boolean;
}

export function AddressBands({ value, onChange, onSubmit, disabled }: Props) {
  const [touched, setTouched] = useState(false);

  return (
    <section className="ask-address">
      <label className="ask-address__label" htmlFor="address">
        whose standing should back the request
      </label>

      <div className="ask-address__row">
        <input
          id="address"
          className="ask-address__input"
          value={value}
          placeholder="0x… or a name.eth"
          spellCheck={false}
          autoComplete="off"
          onChange={(e) => {
            setTouched(true);
            onChange(e.target.value);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !disabled) onSubmit();
          }}
        />
        <button
          className="ask-address__go"
          onClick={() => onSubmit()}
          disabled={disabled}
          type="button"
        >
          run both
        </button>
      </div>

      <div className="chips">
        {SHOWCASE.map((chip) => (
          <button
            key={chip.input}
            type="button"
            className={`chip ${value === chip.input ? "chip--on" : ""}`}
            disabled={disabled}
            onClick={() => {
              setTouched(true);
              onChange(chip.input);
              onSubmit(chip.input);
            }}
          >
            {chip.label}
          </button>
        ))}
      </div>

      {touched && value.trim() === "" ? (
        <p className="ask-address__hint">
          no wallet means human terms on the credential alone, which is a real
          outcome, not an error
        </p>
      ) : null}
    </section>
  );
}
