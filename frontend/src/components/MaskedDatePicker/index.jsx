import DatePicker from "react-datepicker";

import { formatDateInput, parseMaskedDate } from "../../utils/dateInput";
import "react-datepicker/dist/react-datepicker.css";

const toDateValue = (value) => {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;

  if (typeof value === "string") {
    const dateOnlyMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (dateOnlyMatch) {
      const [, year, month, day] = dateOnlyMatch.map(Number);
      return new Date(year, month - 1, day);
    }
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export default function MaskedDatePicker({
  value,
  onChange,
  size = "big",
  minDate,
  maxDate,
  placeholderText = "DD/MM/YYYY",
}) {
  const selectedDate = toDateValue(value);

  return (
    <DatePicker
      selected={selectedDate}
      dateFormat="dd/MM/yyyy"
      placeholderText={placeholderText}
      minDate={minDate}
      maxDate={maxDate}
      showMonthDropdown
      showYearDropdown
      dropdownMode="select"
      scrollableYearDropdown
      yearDropdownItemNumber={120}
      onChange={(date) => onChange(date)}
      onChangeRaw={(e) => {
        if (!e.target.value) return;

        const formatted = formatDateInput(e.target.value);
        e.target.value = formatted;

        const parsed = parseMaskedDate(formatted);
        if (parsed) onChange(parsed);
      }}
      onKeyDown={(e) => {
        const allowed = [
          "Backspace",
          "Tab",
          "ArrowLeft",
          "ArrowRight",
          "Delete",
        ];
        if (!allowed.includes(e.key) && !/\d/.test(e.key)) {
          e.preventDefault();
        }
      }}
      className={`w-full border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
        size === "big"
          ? "px-4 py-2 pr-10 rounded-md text-sm"
          : "px-2 py-1.5 rounded-md text-xs"
      }`}
    />
  );
}
