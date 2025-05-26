// src/components/ui/number-input.tsx
import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Minus, Plus } from "lucide-react";

interface NumberInputProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  className?: string;
}

export function NumberInput({
  value,
  onChange,
  min = 0,
  max = Infinity,
  className,
}: NumberInputProps) {
  const [internalValue, setInternalValue] = useState(value);

  const handleIncrement = () => {
    const newValue = Math.min(max, internalValue + 1);
    setInternalValue(newValue);
    onChange(newValue);
  };

  const handleDecrement = () => {
    const newValue = Math.max(min, internalValue - 1);
    setInternalValue(newValue);
    onChange(newValue);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseInt(e.target.value) || min;
    if (newValue >= min && newValue <= max) {
      setInternalValue(newValue);
      onChange(newValue);
    }
  };

  return (
    <div className={cn("flex items-center space-x-2", className)}>
      <Button
        variant="outline"
        size="icon"
        type="button"
        onClick={handleDecrement}
        disabled={internalValue <= min}
        className="h-8 w-8 shrink-0"
      >
        <Minus className="h-4 w-4" />
      </Button>
      <Input
        type="number"
        value={internalValue}
        onChange={handleChange}
        min={min}
        max={max}
        inputMode="none" // Prevents keyboard on mobile
        className="w-full max-w-[200px] text-center"
        // Optional: readOnly to further prevent keyboard, but allows manual typing
        // readOnly
      />
      <Button
        variant="outline"
        size="icon"
        type="button"
        onClick={handleIncrement}
        disabled={internalValue >= max}
        className="h-8 w-8 shrink-0"
      >
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
}
