import React from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const COUNTRY_CODES = [
  { code: "+971", country: "UAE", digits: 9 },
  { code: "+91", country: "India", digits: 10 },
  { code: "+92", country: "Pakistan", digits: 10 },
  { code: "+880", country: "Bangladesh", digits: 10 },
  { code: "+63", country: "Philippines", digits: 10 },
  { code: "+977", country: "Nepal", digits: 10 },
  { code: "+94", country: "Sri Lanka", digits: 9 },
];

export default function PhoneInput({ 
  value, 
  onChange, 
  placeholder = "Enter number",
  required = false,
  className = "",
  disabled = false
}) {
  // Parse existing value if it includes country code
  const parseValue = (val) => {
    if (!val) return { countryCode: "+971", number: "" };
    
    const matchedCode = COUNTRY_CODES.find(c => val.startsWith(c.code));
    if (matchedCode) {
      const number = val.substring(matchedCode.code.length).trim();
      return { countryCode: matchedCode.code, number };
    }
    
    return { countryCode: "+971", number: val };
  };

  const { countryCode, number } = parseValue(value);
  const currentCodeConfig = COUNTRY_CODES.find(c => c.code === countryCode) || COUNTRY_CODES[0];

  const handleCountryCodeChange = (newCode) => {
    const fullNumber = number ? `${newCode} ${number}` : newCode;
    onChange(fullNumber);
  };

  const handleNumberChange = (e) => {
    const inputValue = e.target.value;
    // Allow only digits
    const digitsOnly = inputValue.replace(/\D/g, '');
    
    // Limit to expected digits for the country
    const limitedDigits = digitsOnly.slice(0, currentCodeConfig.digits);
    
    const fullNumber = limitedDigits ? `${countryCode} ${limitedDigits}` : countryCode;
    onChange(fullNumber);
  };

  return (
    <div className={`flex gap-2 ${className}`}>
      <Select
        value={countryCode}
        onValueChange={handleCountryCodeChange}
        disabled={disabled}
      >
        <SelectTrigger className="w-32">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {COUNTRY_CODES.map((item) => (
            <SelectItem key={item.code} value={item.code}>
              {item.code} {item.country}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      <div className="flex-1 relative">
        <Input
          type="text"
          value={number}
          onChange={handleNumberChange}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          maxLength={currentCodeConfig.digits}
        />
        {number && (
          <p className="text-xs text-gray-500 mt-1">
            Enter exactly {currentCodeConfig.digits} digits for {currentCodeConfig.country}
          </p>
        )}
      </div>
    </div>
  );
}