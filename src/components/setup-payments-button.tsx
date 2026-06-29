import { startStripeOnboarding } from "@/app/dashboard/payouts/actions";
import { Button } from "@/components/ui/button";

export function SetupPaymentsButton({
  redirectTo,
  label = "Setup Payments",
  size = "default",
  className,
}: {
  redirectTo: string;
  label?: string;
  size?: "default" | "sm" | "lg";
  className?: string;
}) {
  return (
    <form action={startStripeOnboarding}>
      <input type="hidden" name="redirectTo" value={redirectTo} />
      <Button type="submit" size={size} className={className}>
        {label}
      </Button>
    </form>
  );
}
