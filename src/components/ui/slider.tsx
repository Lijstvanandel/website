import * as React from "react";
import { cn } from "@/lib/utils";

export interface SliderProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "defaultValue" | "onChange"> {
  min?: number;
  max?: number;
  step?: number;
  value?: number[];
  defaultValue?: number[];
  onValueChange?: (value: number[]) => void;
  disabled?: boolean;
}

const Slider = React.forwardRef<HTMLDivElement, SliderProps>(
  (
    {
      className,
      min = 0,
      max = 100,
      step = 1,
      value: controlledValue,
      defaultValue = [0],
      onValueChange,
      disabled = false,
      ...props
    },
    ref
  ) => {
    const trackRef = React.useRef<HTMLDivElement>(null);
    const [internalValue, setInternalValue] = React.useState<number[]>(
      controlledValue || defaultValue
    );
    const [activeThumbIndex, setActiveThumbIndex] = React.useState<number | null>(null);

    const values = controlledValue !== undefined ? controlledValue : internalValue;

    const clamp = (val: number, minVal: number, maxVal: number) => {
      const stepped = Math.round((val - minVal) / step) * step + minVal;
      const rounded = Math.round(stepped * 1000) / 1000;
      return Math.min(Math.max(rounded, minVal), maxVal);
    };

    const getPercentage = (val: number) => {
      if (max <= min) return 0;
      return Math.min(Math.max(((val - min) / (max - min)) * 100, 0), 100);
    };

    const updateValue = (index: number, rawVal: number) => {
      if (disabled) return;
      const newValues = [...values];

      if (values.length === 1) {
        newValues[0] = clamp(rawVal, min, max);
      } else if (values.length >= 2) {
        if (index === 0) {
          const rightLimit = values[1];
          newValues[0] = clamp(rawVal, min, rightLimit);
        } else {
          const leftLimit = values[0];
          newValues[1] = clamp(rawVal, leftLimit, max);
        }
      }

      if (controlledValue === undefined) {
        setInternalValue(newValues);
      }
      onValueChange?.(newValues);
    };

    const getValueFromPointer = (clientX: number): number => {
      if (!trackRef.current) return min;
      const rect = trackRef.current.getBoundingClientRect();
      const ratio = Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1);
      return min + ratio * (max - min);
    };

    const handlePointerDownThumb = (
      index: number,
      e: React.PointerEvent<HTMLSpanElement>
    ) => {
      if (disabled) return;
      e.stopPropagation();
      e.preventDefault();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      setActiveThumbIndex(index);
    };

    const handlePointerMoveThumb = (
      index: number,
      e: React.PointerEvent<HTMLSpanElement>
    ) => {
      if (activeThumbIndex !== index || disabled) return;
      const newVal = getValueFromPointer(e.clientX);
      updateValue(index, newVal);
    };

    const handlePointerUpThumb = (
      index: number,
      e: React.PointerEvent<HTMLSpanElement>
    ) => {
      if (activeThumbIndex === index) {
        try {
          (e.target as HTMLElement).releasePointerCapture(e.pointerId);
        } catch {
          // ignore
        }
        setActiveThumbIndex(null);
      }
    };

    const handleTrackPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
      if (disabled) return;
      const clickVal = getValueFromPointer(e.clientX);

      // Find closest thumb
      let closestIdx = 0;
      let minDiff = Infinity;
      values.forEach((v, idx) => {
        const diff = Math.abs(v - clickVal);
        if (diff < minDiff) {
          minDiff = diff;
          closestIdx = idx;
        }
      });

      updateValue(closestIdx, clickVal);
      setActiveThumbIndex(closestIdx);
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLSpanElement>) => {
      if (disabled) return;
      let nextVal = values[index];
      if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
        nextVal -= step;
        e.preventDefault();
      } else if (e.key === "ArrowRight" || e.key === "ArrowUp") {
        nextVal += step;
        e.preventDefault();
      } else if (e.key === "Home") {
        nextVal = index === 0 ? min : values[index - 1];
        e.preventDefault();
      } else if (e.key === "End") {
        nextVal = index === values.length - 1 ? max : values[index + 1];
        e.preventDefault();
      } else {
        return;
      }
      updateValue(index, nextVal);
    };

    // Range bar left and width calculation
    let rangeLeft = 0;
    let rangeWidth = 0;
    if (values.length === 1) {
      rangeLeft = 0;
      rangeWidth = getPercentage(values[0]);
    } else if (values.length >= 2) {
      rangeLeft = getPercentage(values[0]);
      rangeWidth = Math.max(0, getPercentage(values[1]) - rangeLeft);
    }

    return (
      <div
        ref={ref}
        role="group"
        className={cn(
          "relative flex w-full touch-none select-none items-center py-2",
          disabled && "opacity-50 pointer-events-none",
          className
        )}
        {...props}
      >
        <div
          ref={trackRef}
          onPointerDown={handleTrackPointerDown}
          className="relative h-2 w-full grow overflow-hidden rounded-full bg-secondary cursor-pointer"
        >
          <div
            className="absolute h-full bg-primary rounded-full transition-all duration-75"
            style={{
              left: `${rangeLeft}%`,
              width: `${rangeWidth}%`,
            }}
          />
        </div>

        {values.map((val, idx) => {
          const percent = getPercentage(val);
          return (
            <span
              key={idx}
              role="slider"
              tabIndex={disabled ? -1 : 0}
              aria-valuemin={idx === 0 ? min : values[idx - 1]}
              aria-valuemax={idx === values.length - 1 ? max : values[idx + 1]}
              aria-valuenow={val}
              onPointerDown={(e) => handlePointerDownThumb(idx, e)}
              onPointerMove={(e) => handlePointerMoveThumb(idx, e)}
              onPointerUp={(e) => handlePointerUpThumb(idx, e)}
              onPointerCancel={(e) => handlePointerUpThumb(idx, e)}
              onKeyDown={(e) => handleKeyDown(idx, e)}
              style={{
                left: `${percent}%`,
                top: "50%",
              }}
              className={cn(
                "absolute -translate-x-1/2 -translate-y-1/2 block h-4 w-4 rounded-full border-2 border-primary bg-background shadow-sm ring-offset-background transition-transform",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                "cursor-grab active:cursor-grabbing hover:scale-125",
                activeThumbIndex === idx && "scale-125 ring-2 ring-ring ring-offset-2",
                disabled && "pointer-events-none opacity-50"
              )}
            />
          );
        })}
      </div>
    );
  }
);

Slider.displayName = "Slider";

export { Slider };
