import React, { createContext, useContext, useState, useCallback, useId, useEffect } from 'react';

export interface BreadcrumbItem {
  label: string;
  path?: string;
  icon?: string; // name of a Lucide icon
  isCollapsed?: boolean;
}

interface StackEntry {
  id: string;
  items: BreadcrumbItem[];
}

interface BreadcrumbContextType {
  extraItems: BreadcrumbItem[];
  registerExtraItems: (id: string, items: BreadcrumbItem[]) => void;
  unregisterExtraItems: (id: string) => void;
}

const BreadcrumbContext = createContext<BreadcrumbContextType | undefined>(undefined);

export function BreadcrumbProvider({ children }: { children: React.ReactNode }) {
  const [stack, setStack] = useState<StackEntry[]>([]);

  const registerExtraItems = useCallback((id: string, items: BreadcrumbItem[]) => {
    setStack((prev) => {
      // If already registered, update it, otherwise append to stack
      const exists = prev.some((entry) => entry.id === id);
      if (exists) {
        return prev.map((entry) => (entry.id === id ? { id, items } : entry));
      }
      return [...prev, { id, items }];
    });
  }, []);

  const unregisterExtraItems = useCallback((id: string) => {
    setStack((prev) => prev.filter((entry) => entry.id !== id));
  }, []);

  // Derived flat array of extra items in registration order
  const extraItems = React.useMemo(() => {
    return stack.reduce<BreadcrumbItem[]>((acc, entry) => [...acc, ...entry.items], []);
  }, [stack]);

  return (
    <BreadcrumbContext.Provider value={{ extraItems, registerExtraItems, unregisterExtraItems }}>
      {children}
    </BreadcrumbContext.Provider>
  );
}

export function useBreadcrumbContext() {
  const context = useContext(BreadcrumbContext);
  if (!context) {
    throw new Error('useBreadcrumbContext must be used within a BreadcrumbProvider');
  }
  return context;
}

/**
 * Custom hook to dynamically append items to the global breadcrumb.
 * Automatically registers when mounted and unregisters when unmounted.
 */
export function useBreadcrumbs(items: BreadcrumbItem[]) {
  const { registerExtraItems, unregisterExtraItems } = useBreadcrumbContext();
  const id = useId();

  // Stringify key items properties to avoid unnecessary re-registrations
  const itemsSerialized = JSON.stringify(items);

  useEffect(() => {
    registerExtraItems(id, items);
    return () => {
      unregisterExtraItems(id);
    };
  }, [id, itemsSerialized, registerExtraItems, unregisterExtraItems]);
}
