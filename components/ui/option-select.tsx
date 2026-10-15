"use client"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type Option = { value: string; label: string }

/**
 * A themed, rounded replacement for a native single-choice `<select>`.
 * It submits `name` with its form, so it works in server-action forms.
 * With no "" option, an empty value shows the placeholder instead.
 */
function OptionSelect({
  className,
  defaultValue,
  disabled,
  id,
  name,
  onValueChange,
  options,
  placeholder,
  required,
  value,
}: {
  className?: string
  defaultValue?: string
  disabled?: boolean
  id?: string
  name?: string
  onValueChange?: (value: string) => void
  options: readonly Option[]
  placeholder?: string
  required?: boolean
  value?: string
}) {
  const hasEmptyOption = options.some((option) => option.value === "")
  const normalise = (next: string | undefined) =>
    next === "" && !hasEmptyOption ? null : next
  return (
    <Select
      name={name}
      items={options}
      defaultValue={normalise(defaultValue)}
      value={normalise(value)}
      onValueChange={
        onValueChange ? (next) => onValueChange(next ?? "") : undefined
      }
      disabled={disabled}
      required={required}
    >
      <SelectTrigger id={id} className={className ?? "w-full"}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent align="start" alignItemWithTrigger={false}>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export { OptionSelect }
