// ============================================================================
// UTILITY FUNCTIONS
// Formatting, calculations, and helper functions
// ============================================================================

/**
 * Format currency in Swedish kronor
 */
export function formatCurrency(amount: number, options?: {
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
  compact?: boolean;
}): string {
  const { minimumFractionDigits = 0, maximumFractionDigits = 0, compact = false } = options || {};
  
  if (compact && Math.abs(amount) >= 1000000) {
    const millions = amount / 1000000;
    return `${millions.toFixed(1)} Mkr`;
  }
  
  if (compact && Math.abs(amount) >= 1000) {
    const thousands = amount / 1000;
    return `${thousands.toFixed(0)} tkr`;
  }
  
  return new Intl.NumberFormat('sv-SE', {
    style: 'currency',
    currency: 'SEK',
    minimumFractionDigits,
    maximumFractionDigits
  }).format(amount);
}

/**
 * Format percentage
 */
export function formatPercentage(decimal: number, decimalPlaces: number = 1): string {
  return new Intl.NumberFormat('sv-SE', {
    style: 'percent',
    minimumFractionDigits: decimalPlaces,
    maximumFractionDigits: decimalPlaces
  }).format(decimal);
}

/**
 * Format large numbers with Swedish thousand separators
 */
export function formatNumber(amount: number, decimalPlaces: number = 0): string {
  return new Intl.NumberFormat('sv-SE', {
    minimumFractionDigits: decimalPlaces,
    maximumFractionDigits: decimalPlaces
  }).format(amount);
}

/**
 * Calculate compound growth
 */
export function calculateCompoundGrowth(
  principal: number, 
  rate: number, 
  years: number, 
  periodsPerYear: number = 1
): number {
  return principal * Math.pow(1 + rate / periodsPerYear, periodsPerYear * years);
}

/**
 * Calculate present value
 */
export function calculatePresentValue(
  futureValue: number, 
  rate: number, 
  years: number
): number {
  return futureValue / Math.pow(1 + rate, years);
}

/**
 * Calculate annuity payment
 */
export function calculateAnnuityPayment(
  principal: number, 
  rate: number, 
  periods: number
): number {
  if (rate === 0) return principal / periods;
  return principal * (rate * Math.pow(1 + rate, periods)) / (Math.pow(1 + rate, periods) - 1);
}

/**
 * Calculate monthly payment for loan
 */
export function calculateMonthlyLoanPayment(
  loanAmount: number,
  annualInterestRate: number,
  loanTermYears: number
): number {
  const monthlyRate = annualInterestRate / 12;
  const numberOfPayments = loanTermYears * 12;
  
  if (monthlyRate === 0) {
    return loanAmount / numberOfPayments;
  }
  
  return loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, numberOfPayments)) / 
         (Math.pow(1 + monthlyRate, numberOfPayments) - 1);
}

/**
 * Calculate inflation-adjusted value
 */
export function adjustForInflation(
  amount: number, 
  inflationRate: number, 
  years: number
): number {
  return amount / Math.pow(1 + inflationRate, years);
}

/**
 * Calculate real return (nominal return adjusted for inflation)
 */
export function calculateRealReturn(
  nominalReturn: number, 
  inflationRate: number
): number {
  return (1 + nominalReturn) / (1 + inflationRate) - 1;
}

/**
 * Generate color for charts based on value
 */
export function getChartColor(value: number, max: number): string {
  const percentage = Math.abs(value) / max;
  
  if (value >= 0) {
    // Green gradient for positive values
    const opacity = Math.min(percentage, 1);
    return `rgba(34, 197, 94, ${opacity})`;
  } else {
    // Red gradient for negative values
    const opacity = Math.min(percentage, 1);
    return `rgba(239, 68, 68, ${opacity})`;
  }
}

/**
 * Validate Swedish personal number (personnummer)
 */
export function validatePersonnummer(personnummer: string): boolean {
  // Basic validation for YYYYMMDD-XXXX format
  const regex = /^(\d{4})(\d{2})(\d{2})-(\d{4})$/;
  const match = personnummer.match(regex);
  
  if (!match) return false;
  
  const [, year, month, day] = match;
  const yearNum = parseInt(year);
  const monthNum = parseInt(month);
  const dayNum = parseInt(day);
  
  // Basic date validation
  if (monthNum < 1 || monthNum > 12) return false;
  if (dayNum < 1 || dayNum > 31) return false;
  if (yearNum < 1900 || yearNum > new Date().getFullYear()) return false;
  
  return true;
}

/**
 * Calculate age from birth year
 */
export function calculateAge(birthYear: number): number {
  return new Date().getFullYear() - birthYear;
}

/**
 * Calculate retirement years remaining
 */
export function yearsToRetirement(currentAge: number, retirementAge: number): number {
  return Math.max(0, retirementAge - currentAge);
}

/**
 * Format time duration in Swedish
 */
export function formatDuration(years: number): string {
  if (years === 0) return "0 år";
  if (years === 1) return "1 år";
  return `${Math.round(years)} år`;
}

/**
 * Calculate net worth trend
 */
export function calculateNetWorthTrend(
  currentNetWorth: number,
  previousNetWorth: number
): {
  change: number;
  changePercent: number;
  trend: 'up' | 'down' | 'flat';
} {
  const change = currentNetWorth - previousNetWorth;
  const changePercent = previousNetWorth !== 0 ? change / previousNetWorth : 0;
  
  let trend: 'up' | 'down' | 'flat' = 'flat';
  if (change > 0) trend = 'up';
  else if (change < 0) trend = 'down';
  
  return { change, changePercent, trend };
}

/**
 * Deep clone an object (simple implementation)
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Debounce function for input handling
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout>;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Generate a simple hash for caching
 */
export function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash.toString();
}

/**
 * Safe number parsing with fallback
 */
export function safeParseNumber(value: string | number, fallback: number = 0): number {
  if (typeof value === 'number') return isNaN(value) ? fallback : value;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? fallback : parsed;
}

/**
 * Clamp a number between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Linear interpolation
 */
export function lerp(start: number, end: number, factor: number): number {
  return start + (end - start) * factor;
}

/**
 * Check if a value is within a reasonable range for Swedish financial data
 */
export function isReasonableSEKAmount(amount: number): boolean {
  return amount >= 0 && amount <= 100_000_000; // Up to 100 million SEK
}

/**
 * Format age display
 */
export function formatAge(age: number): string {
  return `${age} år`;
}

/**
 * Generate CSV data from projections
 */
export function generateCSV(data: any[], headers: string[]): string {
  const csvHeaders = headers.join(',');
  const csvRows = data.map(row => 
    headers.map(header => {
      const value = row[header];
      if (typeof value === 'number') {
        return value.toFixed(2);
      }
      return `"${value}"`;
    }).join(',')
  );
  
  return [csvHeaders, ...csvRows].join('\n');
}

/**
 * Financial year display (show as "2025" instead of year 0)
 */
export function formatSimulationYear(year: number, startYear: number = new Date().getFullYear()): string {
  return (startYear + year).toString();
}
