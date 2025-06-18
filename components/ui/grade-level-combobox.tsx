'use client'

import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { gradeLevels } from "@/lib/constants/grade-levels"

interface GradeLevelComboboxProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  allowCustom?: boolean
}

export function GradeLevelCombobox({ 
  value, 
  onChange, 
  placeholder = "พิมพ์ระดับชั้น เช่น ป.4, Grade 3...",
  allowCustom = true 
}: GradeLevelComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [searchValue, setSearchValue] = React.useState("")

  // Filter grade levels based on search
  const filteredGrades = React.useMemo(() => {
    if (!searchValue || searchValue.length < 1) {
      return []
    }
    
    const search = searchValue.toLowerCase()
    return gradeLevels.filter(grade => 
      grade.value.toLowerCase().includes(search) ||
      grade.label.toLowerCase().includes(search)
    )
  }, [searchValue])

  // Group filtered grades by category
  const groupedGrades = React.useMemo(() => {
    return filteredGrades.reduce((acc, grade) => {
      if (!acc[grade.category]) {
        acc[grade.category] = []
      }
      acc[grade.category].push(grade)
      return acc
    }, {} as Record<string, typeof gradeLevels>)
  }, [filteredGrades])

  // Find label for current value
  const currentLabel = gradeLevels.find(g => g.value === value)?.label || value

  const handleSelect = (selectedValue: string) => {
    onChange(selectedValue)
    setOpen(false)
    setSearchValue("")
  }

  const handleCustomValue = () => {
    if (allowCustom && searchValue && !gradeLevels.find(g => 
      g.value.toLowerCase() === searchValue.toLowerCase() ||
      g.label.toLowerCase() === searchValue.toLowerCase()
    )) {
      onChange(searchValue)
      setOpen(false)
      setSearchValue("")
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {value ? currentLabel : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start" style={{ maxHeight: '300px' }}>
        <Command>
          <CommandInput 
            placeholder="พิมพ์ ป.4, Grade 3, Year 5..." 
            value={searchValue}
            onValueChange={setSearchValue}
          />
          <CommandEmpty>
            {searchValue.length < 1 ? (
              <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                <p className="font-medium">พิมพ์เพื่อค้นหาระดับชั้น</p>
                <p className="text-xs mt-1">เช่น: ป.4, ประถม, Grade 3, Year 5</p>
              </div>
            ) : allowCustom && searchValue && !filteredGrades.length ? (
              <div 
                className="px-2 py-2 cursor-pointer hover:bg-gray-100"
                onClick={handleCustomValue}
              >
                ใช้ "{searchValue}"
              </div>
            ) : (
              "ไม่พบระดับชั้นที่ค้นหา"
            )}
          </CommandEmpty>
          {searchValue.length === 1 && (
            <CommandGroup heading="ตัวอย่างที่ใช้บ่อย">
              <CommandItem onSelect={() => handleSelect('ป.1')}>
                ป.1 (ประถมศึกษาปีที่ 1)
              </CommandItem>
              <CommandItem onSelect={() => handleSelect('ป.4')}>
                ป.4 (ประถมศึกษาปีที่ 4)
              </CommandItem>
              <CommandItem onSelect={() => handleSelect('ม.1')}>
                ม.1 (มัธยมศึกษาปีที่ 1)
              </CommandItem>
              <CommandItem onSelect={() => handleSelect('Grade 1')}>
                Grade 1
              </CommandItem>
              <CommandItem onSelect={() => handleSelect('Year 1')}>
                Year 1
              </CommandItem>
            </CommandGroup>
          )}
          {Object.entries(groupedGrades).map(([category, grades]) => (
            <CommandGroup key={category} heading={category}>
              {grades.map((grade) => (
                <CommandItem
                  key={grade.value}
                  value={grade.label}
                  onSelect={() => handleSelect(grade.value)}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === grade.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {grade.label}
                </CommandItem>
              ))}
            </CommandGroup>
          ))}
        </Command>
      </PopoverContent>
    </Popover>
  )
}