// contexts/BranchContext.tsx
'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';

interface BranchContextType {
  selectedBranchId: string | null;
  setSelectedBranchId: (branchId: string | null) => void;
  isAllBranches: boolean;
  canViewBranch: (branchId: string) => boolean;
}

const BranchContext = createContext<BranchContextType | undefined>(undefined);

export function BranchProvider({ children }: { children: ReactNode }) {
  const { adminUser, isSuperAdmin, canAccessBranch } = useAuth();
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(() => {
    // Load from localStorage
    if (typeof window !== 'undefined') {
      return localStorage.getItem('selectedBranchId');
    }
    return null;
  });

  // Save to localStorage when changed
  useEffect(() => {
    if (selectedBranchId) {
      localStorage.setItem('selectedBranchId', selectedBranchId);
    } else {
      localStorage.removeItem('selectedBranchId');
    }
  }, [selectedBranchId]);

  // Validate selected branch when user changes
  useEffect(() => {
    if (selectedBranchId && adminUser && !isSuperAdmin()) {
      // Check if user still has access to selected branch
      if (!canAccessBranch(selectedBranchId)) {
        // Reset to first available branch
        if (adminUser.branchIds && adminUser.branchIds.length > 0) {
          setSelectedBranchId(adminUser.branchIds[0]);
        } else {
          setSelectedBranchId(null);
        }
      }
    }
  }, [adminUser, selectedBranchId, isSuperAdmin, canAccessBranch]);

  const canViewBranch = (branchId: string): boolean => {
    // If viewing all branches (super admin only)
    if (!selectedBranchId) {
      return isSuperAdmin();
    }
    
    // If specific branch selected, must match and have access
    return selectedBranchId === branchId && canAccessBranch(branchId);
  };

  const value: BranchContextType = {
    selectedBranchId,
    setSelectedBranchId,
    isAllBranches: !selectedBranchId && isSuperAdmin(),
    canViewBranch
  };

  return (
    <BranchContext.Provider value={value}>
      {children}
    </BranchContext.Provider>
  );
}

export function useBranch() {
  const context = useContext(BranchContext);
  if (context === undefined) {
    throw new Error('useBranch must be used within a BranchProvider');
  }
  return context;
}