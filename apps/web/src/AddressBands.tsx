// Where a judge takes over. Type an address or a name, click a pinned one, or
// connect a wallet (Privy SIWE) — the connected address fills this field.
//
// Typing still works without a wallet. Privy strengthens the story: the access
// token is checked on the gateway, and then "this is my wallet" is verified.

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
  /**
   * The pinned chips are the same three inputs the scenario cards use, so when
   * those cards are on screen this repeats them in wallet jargon. Defaults to
   * showing them, which is how every existing caller behaves.
   */
  showChips?: boolean;
  /** Lets a caller demote this to the secondary way in. */
  label?: string;
  /**
   * Privy-authenticated wallet. When set, show "run my wallet" which fills
   * this address and runs. Hidden when nobody is connected.
   */
  myWallet?: string | null;
}

export function AddressBands({
  value,
  onChange,
  onSubmit,
  disabled,
  showChips = true,
  label = "whose standing should back the request",
  myWallet = null,
}: Props) {
  const [touched, setTouched] = useState(false);
  const mine = myWallet?.trim() || null;

  return (
    <section className="ask-address">
      <label className="ask-address__label" htmlFor="address">
        {label}
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
        <div className="ask-address__actions">
          {mine ? (
            <button
              className="ask-address__go ask-address__go--mine"
              onClick={() => {
                setTouched(true);
                onChange(mine);
                onSubmit(mine);
              }}
              disabled={disabled}
              type="button"
              title={mine}
            >
              run my wallet
            </button>
          ) : null}
          <button
            className="ask-address__go"
            onClick={() => onSubmit()}
            disabled={disabled}
            type="button"
          >
            run both
          </button>
        </div>
      </div>

      {showChips ? (
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
      ) : null}

      {touched && value.trim() === "" ? (
        <p className="ask-address__hint">
          no wallet means human terms on the credential alone, which is a real
          outcome, not an error
        </p>
      ) : null}
    </section>
  );
}
