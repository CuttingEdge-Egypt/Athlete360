import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface CountrySelectProps {
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  countries: string[];
  className?: string;
  testId?: string;
}

export function CountrySelect({
  value,
  onValueChange,
  placeholder = "Select country...",
  countries,
  className,
  testId,
}: CountrySelectProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between bg-white border-gray-300 text-gray-800 hover:bg-primary hover:text-white hover:border-primary transition-colors",
            className
          )}
          data-testid={testId}
        >
          {value && countries.includes(value)
            ? value
            : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 text-gray-500" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0 bg-white border-gray-200 shadow-lg">
        <Command className="bg-white">
          <CommandInput
            placeholder="Search countries..."
            className="h-9 text-gray-800 placeholder:text-gray-400 bg-white"
          />
          <CommandList>
            <CommandEmpty className="text-gray-500 py-2 text-center text-sm">
              No country found.
            </CommandEmpty>
            <CommandGroup>
              {countries.map((country) => (
                <CommandItem
                  key={country}
                  value={country}
                  onSelect={(currentValue) => {
                    onValueChange(currentValue === value ? "" : currentValue);
                    setOpen(false);
                  }}
                  className="text-gray-700 hover:!bg-primary hover:!text-white data-[selected=true]:bg-primary data-[selected=true]:text-white"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === country ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {country}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}