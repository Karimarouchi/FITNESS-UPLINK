import { Minus, Plus } from "lucide-react";
import { UI_SCALE_DEFAULT, UI_SCALE_MIN, useUiScale } from "@/features/theme/UiScaleContext";

/** A− / value / A+ stepper for the display size. Clicking the value returns to the default size. */
export function SizeControl({ className = "" }: { className?: string }) {
  const { scale, max, increase, decrease, reset } = useUiScale();
  return (
    <div className={`ui-size${className ? ` ${className}` : ""}`} role="group" aria-label="Taille de l’affichage">
      <button type="button" aria-label="Réduire la taille" title="Réduire la taille" disabled={scale <= UI_SCALE_MIN} onClick={decrease}>
        <Minus size={14} aria-hidden="true" />
      </button>
      <button
        type="button"
        className="ui-size-value"
        aria-label={`Taille actuelle : ${scale} %. Rétablir ${UI_SCALE_DEFAULT} %`}
        title={`Rétablir ${UI_SCALE_DEFAULT} %`}
        onClick={reset}
      >
        {scale} %
      </button>
      <button type="button" aria-label="Augmenter la taille" title="Augmenter la taille" disabled={scale >= max} onClick={increase}>
        <Plus size={14} aria-hidden="true" />
      </button>
    </div>
  );
}
