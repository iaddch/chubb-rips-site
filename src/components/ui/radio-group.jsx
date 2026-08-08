"use client";;
import { RadioGroup as RadioGroupPrimitive } from "@base-ui/react/radio-group";
import { Radio as RadioPrimitive } from "@base-ui/react/radio";
import { cn } from "@/lib/utils";

function RadioGroup({
  className,
  ...props
}) {
  return (
    <RadioGroupPrimitive
      className={cn("grid gap-2", className)}
      data-slot="radio-group"
      {...props} />
  );
}

function RadioGroupItem({
  className,
  ...props
}) {
  return (
    <RadioPrimitive.Root
      className={cn(
        "aspect-square size-4.5 shrink-0 rounded-full border border-input bg-background shadow-xs/5 outline-none ring-ring/24 transition-shadow focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 data-[checked]:border-primary data-[checked]:bg-primary",
        className
      )}
      data-slot="radio-group-item"
      {...props}>
      <RadioPrimitive.Indicator
        className="flex items-center justify-center text-primary-foreground data-[unchecked]:hidden"
        data-slot="radio-group-indicator">
        <span className="size-1.5 rounded-full bg-current" />
      </RadioPrimitive.Indicator>
    </RadioPrimitive.Root>
  );
}

export { RadioGroup, RadioGroupItem };
