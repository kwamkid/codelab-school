// components/layout/branch-selector.tsx
'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useBranch } from '@/contexts/BranchContext';
import { getBranches } from '@/lib/services/branches';
import { Branch } from '@/types/models';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Building2 } from 'lucide-react';
import { Badge } from "@/components/ui/badge";

export function BranchSelector() {
  const { adminUser, isSuperAdmin, canAccessBranch } = useAuth();
  const { selectedBranchId, setSelectedBranchId } = useBranch();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBranches();
  }, [adminUser]);

  const loadBranches = async () => {
    try {
      const allBranches = await getBranches();
      
      // Filter branches based on user role
      let availableBranches = allBranches;
      
      if (!isSuperAdmin() && adminUser?.branchIds && adminUser.branchIds.length > 0) {
        // Branch admin - show only assigned branches
        availableBranches = allBranches.filter(branch => 
          adminUser.branchIds.includes(branch.id)
        );
      }
      
      setBranches(availableBranches);
      
      // Set default branch if not selected
      if (!selectedBranchId && availableBranches.length > 0) {
        // If user has preferred branch
        if (adminUser?.branchIds && adminUser.branchIds.length === 1) {
          setSelectedBranchId(adminUser.branchIds[0]);
        } else {
          // Select first active branch
          const firstActive = availableBranches.find(b => b.isActive);
          if (firstActive) {
            setSelectedBranchId(firstActive.id);
          }
        }
      }
    } catch (error) {
      console.error('Error loading branches:', error);
    } finally {
      setLoading(false);
    }
  };

  // Don't show selector if user has only one branch
  if (!isSuperAdmin() && adminUser?.branchIds && adminUser.branchIds.length === 1) {
    const branch = branches.find(b => b.id === adminUser.branchIds[0]);
    if (branch) {
      return (
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Building2 className="h-4 w-4" />
          <span className="font-medium">{branch.name}</span>
        </div>
      );
    }
    return null;
  }

  // Don't show if no branches available
  if (branches.length === 0) {
    return null;
  }

  // For super admin - show "All Branches" option
  const showAllOption = isSuperAdmin();

  return (
    <div className="flex items-center gap-2">
      <Building2 className="h-4 w-4 text-gray-500" />
      <Select 
        value={selectedBranchId || 'all'} 
        onValueChange={(value) => setSelectedBranchId(value === 'all' ? null : value)}
        disabled={loading}
      >
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="เลือกสาขา" />
        </SelectTrigger>
        <SelectContent>
          {showAllOption && (
            <SelectItem value="all">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                <span>ทุกสาขา</span>
                <Badge variant="secondary" className="ml-auto text-xs">
                  {branches.length}
                </Badge>
              </div>
            </SelectItem>
          )}
          {branches.map((branch) => (
            <SelectItem key={branch.id} value={branch.id}>
              <div className="flex items-center justify-between w-full">
                <span>{branch.name}</span>
                {!branch.isActive && (
                  <Badge variant="secondary" className="ml-2 text-xs">
                    ปิด
                  </Badge>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}