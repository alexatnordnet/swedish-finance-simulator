// ============================================================================
// INPUT VALIDATION COMPONENT
// Reusable input field with validation and Swedish formatting
// ============================================================================

import React from 'react';
import { AlertCircle, HelpCircle } from 'lucide-react';

interface InputFieldProps {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  type?: 'text' | 'number' | 'email';
  placeholder?: string;
  helpText?: string;
  error?: string;
  warning?: string;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
  prefix?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

export function InputField({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  helpText,
  error,
  warning,
  min,
  max,
  step,
  suffix,
  prefix,
  required = false,
  disabled = false,
  className = ''
}: InputFieldProps) {
  const hasError = !!error;
  const hasWarning = !!warning && !hasError;

  const inputClasses = `
    input-field
    ${hasError ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}
    ${hasWarning ? 'border-yellow-300 focus:border-yellow-500 focus:ring-yellow-500' : ''}
    ${disabled ? 'bg-gray-100 cursor-not-allowed' : ''}
    ${prefix ? 'pl-12' : ''}
    ${suffix ? 'pr-12' : ''}
    ${className}
  `.trim();

  return (
    <div className="space-y-1">
      <label className="label">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
        {helpText && (
          <button
            type="button"
            className="ml-1 text-gray-400 hover:text-gray-600"
            title={helpText}
          >
            <HelpCircle className="h-3 w-3" />
          </button>
        )}
      </label>

      <div className="relative">
        {prefix && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span className="text-gray-500 text-sm">{prefix}</span>
          </div>
        )}

        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          min={min}
          max={max}
          step={step}
          required={required}
          disabled={disabled}
          className={inputClasses}
        />

        {suffix && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <span className="text-gray-500 text-sm">{suffix}</span>
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-center text-red-600 text-sm">
          <AlertCircle className="h-4 w-4 mr-1 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {warning && !error && (
        <div className="flex items-center text-yellow-600 text-sm">
          <AlertCircle className="h-4 w-4 mr-1 flex-shrink-0" />
          <span>{warning}</span>
        </div>
      )}

      {helpText && !error && !warning && (
        <p className="text-gray-500 text-xs">{helpText}</p>
      )}
    </div>
  );
}

// Specialized input for Swedish currency
interface CurrencyInputProps extends Omit<InputFieldProps, 'type' | 'prefix' | 'onChange'> {
  value: number;
  onChange: (value: number) => void;
}

export function CurrencyInput({ value, onChange, ...props }: CurrencyInputProps) {
  const handleChange = (stringValue: string) => {
    // Remove non-numeric characters except decimal separator
    const cleanValue = stringValue.replace(/[^\d,.-]/g, '').replace(',', '.');
    const numericValue = parseFloat(cleanValue) || 0;
    onChange(numericValue);
  };

  // Format the display value
  const displayValue = value === 0 ? '' : value.toString();

  return (
    <InputField
      {...props}
      type="number"
      value={displayValue}
      onChange={handleChange}
      suffix="kr"
      step="1000"
    />
  );
}

// Specialized input for percentages
interface PercentageInputProps extends Omit<InputFieldProps, 'type' | 'suffix' | 'onChange'> {
  value: number; // As decimal (0.05 for 5%)
  onChange: (value: number) => void;
  decimalPlaces?: number;
}

export function PercentageInput({ 
  value, 
  onChange, 
  decimalPlaces = 1,
  ...props 
}: PercentageInputProps) {
  const handleChange = (stringValue: string) => {
    const numericValue = parseFloat(stringValue) || 0;
    onChange(numericValue / 100); // Convert percentage to decimal
  };

  // Convert decimal to percentage for display
  const displayValue = value === 0 ? '' : (value * 100).toFixed(decimalPlaces);

  return (
    <InputField
      {...props}
      type="number"
      value={displayValue}
      onChange={handleChange}
      suffix="%"
      step={0.1}
      min={0}
      max={100}
    />
  );
}

// Age input with Swedish formatting
interface AgeInputProps extends Omit<InputFieldProps, 'type' | 'suffix' | 'onChange'> {
  value: number;
  onChange: (value: number) => void;
}

export function AgeInput({ value, onChange, ...props }: AgeInputProps) {
  const handleChange = (stringValue: string) => {
    const numericValue = parseInt(stringValue) || 0;
    onChange(numericValue);
  };

  const displayValue = value === 0 ? '' : value.toString();

  return (
    <InputField
      {...props}
      type="number"
      value={displayValue}
      onChange={handleChange}
      suffix="år"
      min={16}
      max={100}
      step={1}
    />
  );
}
