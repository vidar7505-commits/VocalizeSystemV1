import * as React from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { AnimatePresence, motion } from "framer-motion"

const SelectContext = React.createContext(null)

const Select = ({ children, value, onValueChange, open, onOpenChange }) => {
  const [internalOpen, setInternalOpen] = React.useState(false)
  const isControlledOpen = open !== undefined
  const isOpen = isControlledOpen ? open : internalOpen
  const handleOpenChange = (newOpen) => {
    if (!isControlledOpen) setInternalOpen(newOpen)
    onOpenChange?.(newOpen)
  }

  const triggerRef = React.useRef(null);
  const contentRef = React.useRef(null);

  const contextValue = {
    value,
    onValueChange,
    isOpen,
    setIsOpen: handleOpenChange,
    triggerRef,
    contentRef
  };

  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        isOpen &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target) &&
        contentRef.current &&
        !contentRef.current.contains(event.target)
      ) {
        handleOpenChange(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, handleOpenChange]);


  return (
    <SelectContext.Provider value={contextValue}>
      <div className="relative">
        {children}
      </div>
    </SelectContext.Provider>
  )
}

const SelectTrigger = React.forwardRef(({ className, children, ...props }, ref) => {
  const { isOpen, setIsOpen, triggerRef } = React.useContext(SelectContext)

  const handleRef = (node) => {
    triggerRef.current = node;
    if (typeof ref === 'function') {
      ref(node);
    } else if (ref) {
      ref.current = node;
    }
  };

  return (
    <button
      ref={handleRef}
      type="button"
      onClick={() => setIsOpen(!isOpen)}
      className={cn(
        "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    >
      <div className="truncate flex-1 text-left">{children}</div>
      <ChevronDown className="h-4 w-4 opacity-50 shrink-0" />
    </button>
  )
})
SelectTrigger.displayName = "SelectTrigger"

const SelectValue = React.forwardRef(({ className, placeholder, children, ...props }, ref) => {
  return (
    <span ref={ref} className={cn("block truncate", className)} {...props}>
      {children || placeholder}
    </span>
  )
})
SelectValue.displayName = "SelectValue"

const SelectContent = React.forwardRef(({ className, children, position = "popper", ...props }, ref) => {
  const { isOpen, setIsOpen, contentRef } = React.useContext(SelectContext)

  const handleRef = (node) => {
    contentRef.current = node;
    if (typeof ref === 'function') {
      ref(node);
    } else if (ref) {
      ref.current = node;
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -5 }}
          transition={{ duration: 0.1, ease: 'easeInOut' }}
          ref={handleRef}
          className={cn(
            "absolute z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover text-white shadow-md w-full mt-1",
            className
          )}
          {...props}
        >
          <div className="p-1 w-full max-h-60 overflow-y-auto">
            {children}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
})
SelectContent.displayName = "SelectContent"

const SelectItem = React.forwardRef(({ className, children, value, ...props }, ref) => {
  const { value: selectedValue, onValueChange, setIsOpen } = React.useContext(SelectContext)
  const isSelected = selectedValue === value

  return (
    <div
      ref={ref}
      onClick={(e) => {
        e.stopPropagation()
        onValueChange?.(value)
        setIsOpen(false)
      }}
      className={cn(
        "relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 pl-2 pr-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 hover:bg-accent hover:text-accent-foreground",
        isSelected && "bg-accent text-accent-foreground font-semibold",
        className
      )}
      {...props}
    >
      <span className="truncate w-full text-left">{children}</span>
    </div>
  )
})
SelectItem.displayName = "SelectItem"

export { Select, SelectTrigger, SelectValue, SelectContent, SelectItem }