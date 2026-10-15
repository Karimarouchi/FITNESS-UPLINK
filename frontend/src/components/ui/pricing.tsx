import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import NumberFlow from "@number-flow/react";
import confetti from "canvas-confetti";
import { motion } from "framer-motion";
import { Check, Star } from "lucide-react";
import { buttonVariants } from "@/components/ui/shadcn-button";
import { Label } from "@/components/ui/label";
import { PricingSwitch } from "@/components/ui/pricing-switch";
import { useMediaQuery } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";

export type PricingPlan = {
  name: string;
  price: string;
  yearlyPrice: string;
  period: string;
  yearlyPeriod: string;
  features: string[];
  description: string;
  buttonText: string;
  href: string;
  isPopular: boolean;
};

type PricingProps = {
  plans: PricingPlan[];
  currency?: string;
  title?: string;
  description?: string;
};

export function Pricing({
  plans,
  currency = "TND",
  title = "Des offres lisibles.",
  description = "Mensuel ou annuel. Les montants et les fonctions viennent du back-office.",
}: PricingProps) {
  const [isMonthly, setIsMonthly] = useState(true);
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const switchRef = useRef<HTMLButtonElement>(null);
  const trio = plans.length === 3;

  function handleToggle(checked: boolean) {
    setIsMonthly(!checked);
    if (!checked || !switchRef.current) return;
    const rect = switchRef.current.getBoundingClientRect();
    confetti({
      particleCount: 50,
      spread: 60,
      origin: {
        x: (rect.left + rect.width / 2) / window.innerWidth,
        y: (rect.top + rect.height / 2) / window.innerHeight,
      },
      colors: ["#0048FC", "#4d7cff", "#0f172a", "#e8eeff"],
      ticks: 200,
      gravity: 1.2,
      decay: 0.94,
      startVelocity: 30,
      shapes: ["circle"],
    });
  }

  return (
    <div className="w-full py-4">
      <div className="mb-10 text-center space-y-3">
        <h2 className="font-[Manrope] text-4xl font-extrabold tracking-[-0.03em] text-ink sm:text-5xl">{title}</h2>
        <p className="mx-auto max-w-2xl whitespace-pre-line text-lg text-muted-foreground">
          {description}
        </p>
      </div>

      <div className="mb-10 flex flex-wrap items-center justify-center gap-3">
        <Label className="inline-flex cursor-pointer items-center gap-3 text-ink">
          <span className={cn("text-sm font-semibold", isMonthly ? "text-ink" : "text-muted-foreground")}>Mensuel</span>
          <PricingSwitch ref={switchRef} checked={!isMonthly} onCheckedChange={handleToggle} />
          <span className={cn("text-sm font-semibold", !isMonthly ? "text-ink" : "text-muted-foreground")}>
            Annuel <span className="text-secondary">(souvent plus avantageux)</span>
          </span>
        </Label>
      </div>

      <div
        className={cn(
          "grid grid-cols-1 gap-8 sm:grid-cols-2 lg:gap-10",
          plans.length >= 3 ? "md:grid-cols-3" : "md:grid-cols-2",
        )}
      >
        {plans.map((plan, index) => {
          const amount = Number(isMonthly ? plan.price : plan.yearlyPrice);
          const hasPrice = Number.isFinite(amount) && amount > 0;
          return (
            <motion.div
              key={`${plan.name}-${index}`}
              initial={{ y: 36, opacity: 0 }}
              whileInView={
                isDesktop && trio
                  ? { y: plan.isPopular ? -16 : 0, opacity: 1 }
                  : { y: 0, opacity: 1 }
              }
              viewport={{ once: true }}
              transition={{
                duration: 0.8,
                type: "spring",
                stiffness: 100,
                damping: 28,
                delay: 0.08 * index,
              }}
              className={cn(
                "relative flex flex-col rounded-2xl border bg-white p-8 text-center shadow-sm",
                plan.isPopular ? "z-10 border-2 border-secondary" : "border-border",
              )}
            >
              {plan.isPopular ? (
                <div className="absolute top-0 right-0 flex items-center rounded-bl-xl rounded-tr-xl bg-secondary px-2 py-0.5">
                  <Star className="h-4 w-4 fill-current text-on-secondary" />
                  <span className="ml-1 font-semibold text-on-secondary">Populaire</span>
                </div>
              ) : null}
              <div className="flex flex-1 flex-col">
                <h3 className="font-[Manrope] text-xl font-extrabold tracking-[-0.02em] text-ink">{plan.name}</h3>
                <div className="mt-6 flex items-end justify-center gap-x-2">
                  <span className="font-[Manrope] text-5xl font-extrabold tracking-[-0.04em] text-foreground">
                    {hasPrice ? (
                      <NumberFlow
                        value={amount}
                        format={{
                          style: "decimal",
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 0,
                        }}
                        locales="fr-FR"
                        transformTiming={{ duration: 500, easing: "ease-out" }}
                        willChange
                      />
                    ) : (
                      "—"
                    )}
                  </span>
                  <span className="pb-1 font-['Geist_Mono'] text-xs font-medium text-muted-foreground">
                    {hasPrice ? `${currency} / ${isMonthly ? plan.period : plan.yearlyPeriod}` : "Prix administré"}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {isMonthly ? "facturé chaque mois" : "facturé chaque année"}
                </p>
                <ul className="mt-6 flex flex-col gap-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <Check className="mt-1 h-4 w-4 shrink-0 text-secondary" />
                      <span className="text-left text-sm text-ink" style={{ wordSpacing: "0.08em" }}>
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>
                <hr className="my-4 w-full border-border" />
                <Link
                  to={plan.href}
                  className={cn(
                    buttonVariants({ variant: "outline" }),
                    "w-full text-base font-semibold tracking-tight transition-all duration-300 hover:bg-secondary hover:text-on-secondary",
                    plan.isPopular ? "bg-secondary text-on-secondary border-secondary" : "bg-white text-ink",
                  )}
                >
                  {plan.buttonText}
                </Link>
                <p className="mt-6 text-xs leading-5 text-muted-foreground">{plan.description}</p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
