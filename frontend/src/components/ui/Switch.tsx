type SwitchProps = {
  on: boolean;
  onToggle: () => void;
  label: string;
};

export function Switch({ on, onToggle, label }: SwitchProps) {
  return (
    <button
      className={on ? "switch on" : "switch"}
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onToggle}
    />
  );
}
