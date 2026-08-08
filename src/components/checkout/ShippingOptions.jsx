import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'

// Renders the real-time carrier rate options returned by
// /api/shipping-quote (see services/shippingService.js) as a radio group.
// `options` is null until a quote has been fetched for the current address.
export default function ShippingOptions({ options, selectedId, onSelect, loading, error }) {
  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-500">
        <Spinner className="size-4" />
        Calculating shipping and tax for this address...
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700" role="alert">
        {error}
      </div>
    )
  }

  if (!options) {
    return (
      <p className="rounded-lg border border-dashed border-slate-200 px-3 py-3 text-sm text-slate-500">
        Enter your state and ZIP/postal code above to see shipping options and estimated tax.
      </p>
    )
  }

  return (
    <RadioGroup value={selectedId} onValueChange={onSelect} className="gap-2.5">
      {options.map((option) => (
        <Label
          key={option.id}
          htmlFor={`shipping-${option.id}`}
          className={`flex cursor-pointer items-center justify-between gap-4 rounded-lg border px-3.5 py-3 font-normal transition-colors ${
            selectedId === option.id ? 'border-emerald-500 bg-emerald-50/60' : 'border-slate-200 hover:bg-slate-50'
          }`}
        >
          <span className="flex items-center gap-3">
            <RadioGroupItem id={`shipping-${option.id}`} value={option.id} />
            <span>
              <span className="block font-semibold text-slate-900">{option.label}</span>
              <span className="block text-xs text-slate-500">{option.description}</span>
            </span>
          </span>
          <span className="font-semibold text-slate-900">
            {option.amount === 0 ? 'Free' : `$${option.amount.toFixed(2)}`}
          </span>
        </Label>
      ))}
    </RadioGroup>
  )
}
