import * as React from "react"
import * as ReactDOM from "react-dom"
import { ChevronDown, Check } from "lucide-react"
import { cn } from "@/app/utils/utils"

interface SelectProps {
  value: string
  onValueChange: (value: string) => void
  children: React.ReactNode
  placeholder?: string
  className?: string
}

interface SelectItemProps {
  value: string
  children: React.ReactNode
  className?: string
}

interface SelectContentProps {
  children: React.ReactNode
  className?: string
}

interface SelectTriggerProps extends React.ComponentPropsWithoutRef<"button"> {
  children: React.ReactNode
  className?: string
}

interface SelectValueProps {
  placeholder?: string
}

const SelectContext = React.createContext<{
  value: string
  onValueChange: (value: string) => void
  isOpen: boolean
  setIsOpen: (open: boolean) => void
  triggerRef: React.RefObject<HTMLButtonElement | null> | null
}>({
  value: "",
  onValueChange: () => {},
  isOpen: false,
  setIsOpen: () => {},
  triggerRef: null,
})

const Select = ({ value, onValueChange, children, className }: SelectProps) => {
  const [isOpen, setIsOpen] = React.useState(false)
  const triggerRef = React.useRef<HTMLButtonElement>(null)

  return (
    <SelectContext.Provider value={{ value, onValueChange, isOpen, setIsOpen, triggerRef }}>
      <div className={cn("relative", className)}>
        {children}
      </div>
    </SelectContext.Provider>
  )
}

const SelectTrigger = React.forwardRef<
  HTMLButtonElement,
  SelectTriggerProps
>(({ children, className, ...rest }, ref) => {
  const { isOpen, setIsOpen, triggerRef } = React.useContext(SelectContext)
  
  return (
    <button
      ref={triggerRef}
      type="button"
      {...rest}
      className={cn(
        "flex h-12 w-full items-center justify-between rounded-md border-2 border-border bg-card px-3 py-2 text-sm font-semibold ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 shadow-sm hover:bg-muted transition-all duration-200",
        className
      )}
      onClick={() => setIsOpen(!isOpen)}
    >
      {children}
      <ChevronDown className="h-4 w-4 opacity-70" />
    </button>
  )
})
SelectTrigger.displayName = "SelectTrigger"

const SelectValue = ({ placeholder }: SelectValueProps) => {
  const { value } = React.useContext(SelectContext)
  
  return (
    <span className={cn(!value && "text-muted-foreground")}>
      {value || placeholder}
    </span>
  )
}

const SelectContent = React.forwardRef<
  HTMLDivElement,
  SelectContentProps
>(({ children, className }, ref) => {
  const { isOpen, setIsOpen, triggerRef } = React.useContext(SelectContext)
  const [position, setPosition] = React.useState<{ top: number; left: number; width: number } | null>(null)
  
  React.useEffect(() => {
    if (isOpen && triggerRef?.current) {
      const updatePosition = () => {
        const rect = triggerRef.current!.getBoundingClientRect()
        setPosition({
          top: rect.bottom + 8,
          left: rect.left,
          width: rect.width,
        })
      }
      
      // Update position immediately
      updatePosition()
      
      // Also update on scroll/resize
      window.addEventListener('scroll', updatePosition, true)
      window.addEventListener('resize', updatePosition)
      
      return () => {
        window.removeEventListener('scroll', updatePosition, true)
        window.removeEventListener('resize', updatePosition)
      }
    } else {
      setPosition(null)
    }
  }, [isOpen, triggerRef])
  
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        ref && 'current' in ref && ref.current && 
        !ref.current.contains(event.target as Node) &&
        triggerRef?.current && !triggerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }
    
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, setIsOpen, ref, triggerRef])
  
  if (!isOpen || !position) return null
  
  return ReactDOM.createPortal(
    <div
      ref={ref}
      className={cn(
        "fixed bg-popover text-popover-foreground border-2 border-border rounded-lg shadow-lg",
        className
      )}
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
        width: `${position.width}px`,
        zIndex: 9999,
      }}
    >
      {children}
    </div>,
    document.body
  )
})
SelectContent.displayName = "SelectContent"

const SelectItem = React.forwardRef<
  HTMLDivElement,
  SelectItemProps
>(({ value, children, className }, ref) => {
  const { value: selectedValue, onValueChange, setIsOpen } = React.useContext(SelectContext)
  const isSelected = selectedValue === value
  
  return (
    <div
      ref={ref}
      className={cn(
        "relative flex w-full cursor-default select-none items-center rounded-md py-2 pl-8 pr-3 text-sm font-semibold outline-none focus:bg-muted focus:text-muted-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 hover:bg-muted hover:text-muted-foreground transition-all duration-200",
        isSelected && "bg-muted text-muted-foreground",
        className
      )}
      onClick={() => {
        onValueChange(value)
        setIsOpen(false)
      }}
    >
      {isSelected && <Check className="absolute left-2 h-4 w-4" />}
      {children}
    </div>
  )
})
SelectItem.displayName = "SelectItem"

export {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
}

