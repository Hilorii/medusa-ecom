import { forwardRef, useImperativeHandle, useMemo, useRef } from "react"

import NativeSelect, {
  NativeSelectProps,
} from "@modules/common/components/native-select"
import { HttpTypes } from "@medusajs/types"

const CountrySelect = forwardRef<
  HTMLSelectElement,
  NativeSelectProps & {
    region?: HttpTypes.StoreRegion
    regions?: HttpTypes.StoreRegion[]
  }
>(
  (
    { placeholder = "Country", region, regions, defaultValue, ...props },
    ref
  ) => {
    const innerRef = useRef<HTMLSelectElement>(null)

    useImperativeHandle<HTMLSelectElement | null, HTMLSelectElement | null>(
      ref,
      () => innerRef.current
    )

    const countryOptions = useMemo(() => {
      if (regions?.length) {
        const seen = new Set<string>()

        return regions
          .flatMap(
            (r) =>
              r.countries?.map((country) => ({
                value: country.iso_2,
                label: country.display_name,
              })) ?? []
          )
          .filter(({ value }) => {
            if (seen.has(value)) {
              return false
            }

            seen.add(value)
            return true
          })
          .sort((a, b) => (a.label ?? "").localeCompare(b.label ?? ""))
      }

      if (region) {
        return (
          region.countries?.map((country) => ({
            value: country.iso_2,
            label: country.display_name,
          })) ?? []
        )
      }

      return []
    }, [region, regions])

    return (
      <NativeSelect
        ref={innerRef}
        placeholder={placeholder}
        defaultValue={defaultValue}
        {...props}
      >
        {countryOptions?.map(({ value, label }, index) => (
          <option key={index} value={value}>
            {label}
          </option>
        ))}
      </NativeSelect>
    )
  }
)

CountrySelect.displayName = "CountrySelect"

export default CountrySelect
