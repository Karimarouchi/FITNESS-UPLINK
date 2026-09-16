import { type ReactNode } from "react";
import { Link } from "react-router-dom";
import { LocaleSwitch } from "./LocaleContext";

type OnboardingFrameProps = {
  children: ReactNode;
  step: string;
  back?: { label: string; onClick: () => void };
};

export function OnboardingBrand() {
  return (
    <Link className="pub-logo" to="/">
      <div className="mark">
        <span>F</span>
      </div>
      <div className="word">FITNESS UPLINK</div>
    </Link>
  );
}

export function OnboardingFrame({ children, step, back }: OnboardingFrameProps) {
  return (
    <div className="fu-public ob-shell ob-shell--wide">
      <header className="ob-top">
        {back ? (
          <button className="ob-nav-back" type="button" onClick={back.onClick}>
            <span className="material-symbols-outlined">arrow_back</span>
            <span className="font-label-caps uppercase">{back.label}</span>
          </button>
        ) : (
          <OnboardingBrand />
        )}
        <div className="ob-step-meta">
          <span className="ob-step-label">{step}</span>
          <LocaleSwitch />
        </div>
      </header>
      {children}
    </div>
  );
}
