// file: /providers/AdminAuthProvider.tsx
// feature: Authentication - Role-based access control provider
/*
// Role-based access
export default function AdminDashboard() {
  return (
    <Administrator>
      <div>Admin Dashboard Content</div>
    </Administrator>
  );
}

// Permission-based access
export default function UserManagement() {
  return (
    <WithPermission 
      permissions={[AdminPermission.MANAGE_USERS]}
      fallback={<div>Not authorized</div>}
    >
      <div>User Management Tools</div>
    </WithPermission>
  );
}

// Combining role and permission checks
export default function FinancialReporting() {
  const { isFinancier } = useAdminAuth();
  
  return (
    <WithPermission 
      permissions={[AdminPermission.VIEW_ANALYTICS]}
      fallback={<div>Not authorized</div>}
    >
      {isFinancier ? (
        <div>Financial Reporting Dashboard</div>
      ) : (
        <div>Insufficient permissions</div>
      )}
    </WithPermission>
  );
} 
*/
import React, { 
    createContext, 
    useContext, 
    ReactNode, 
    useState, 
    useEffect 
  } from 'react';
  import { useQuery } from "convex/react";
  import { api } from "@/convex/_generated/api";
  import { useRouter } from "next/navigation";
  import { 
    AdminRole, 
    AdminPermission 
  } from "@/convex/auth/types";
  
  // Define the context type for admin authentication
  interface AdminAuthContextType {
    isAdmin: boolean;
    adminRole: AdminRole | null;
    isAdministrator: boolean;
    isSysOp: boolean;
    isModerator: boolean;
    isFinancier: boolean;
    isLoading: boolean;
    permissions: AdminPermission[];
  }
  
  // Create the admin authentication context
  const AdminAuthContext = createContext<AdminAuthContextType>({
    isAdmin: false,
    adminRole: null,
    isAdministrator: false,
    isSysOp: false,
    isModerator: false,
    isFinancier: false,
    isLoading: true,
    permissions: [],
  });
  
  // Provider component for admin authentication context
  export function AdminAuthProvider({ children }: { children: ReactNode }) {
    // Use the Convex helper functions instead of duplicating logic here
    const viewer = useQuery(api.users.viewer);
    const adminDetails = useQuery(api.users.getAdminDetails);
    const isSysOpValue = useQuery(api.users.isSysOp);
    const isModeratorValue = useQuery(api.users.isModerator);
    const isFinancierValue = useQuery(api.users.isFinancier);
  
    const [contextValue, setContextValue] = useState<AdminAuthContextType>({
      isAdmin: false,
      adminRole: null,
      isAdministrator: false,
      isSysOp: false,
      isModerator: false,
      isFinancier: false,
      isLoading: true,
      permissions: [],
    });
  
    useEffect(() => {
      if (
        viewer !== undefined && 
        adminDetails !== undefined && 
        isSysOpValue !== undefined && 
        isModeratorValue !== undefined && 
        isFinancierValue !== undefined
      ) {
        const role = viewer?.adminRole as AdminRole | null;
  
        setContextValue({
          isAdmin: viewer?.isAdmin ?? false,
          adminRole: role,
          isAdministrator: role === AdminRole.ADMINISTRATOR,
          isSysOp: isSysOpValue ?? false,
          isModerator: isModeratorValue ?? false,
          isFinancier: isFinancierValue ?? false,
          isLoading: false,
          permissions: adminDetails?.permissions || [],
        });
      }
    }, [viewer, adminDetails, isSysOpValue, isModeratorValue, isFinancierValue]);
  
    return (
      <AdminAuthContext.Provider value={contextValue}>
        {children}
      </AdminAuthContext.Provider>
    );
  }
  
  // Custom hook to access admin authentication context
  export function useAdminAuth() {
    return useContext(AdminAuthContext);
  }
  
  // Higher-order component creator for role-based rendering
  function createRoleComponent(roleCheck: (context: AdminAuthContextType) => boolean) {
    return function RoleComponent({ children }: { children: ReactNode }) {
      const adminAuth = useAdminAuth();
      const router = useRouter();
  
      useEffect(() => {
        if (!adminAuth.isLoading && !roleCheck(adminAuth)) {
          router.push('/unauthorized');
        }
      }, [adminAuth, router]);
  
      if (adminAuth.isLoading) return null;
      return roleCheck(adminAuth) ? <>{children}</> : null;
    };
  }
  
  // Role-specific components
  export const Administrator = createRoleComponent(ctx => ctx.isAdministrator);
  export const SysOp = createRoleComponent(ctx => ctx.isSysOp);
  export const Moderator = createRoleComponent(ctx => ctx.isModerator);
  export const Financier = createRoleComponent(ctx => ctx.isFinancier);
  export const NonAdmin = createRoleComponent(ctx => !ctx.isAdmin);
  
  // Utility component for permission-based rendering
  export function WithPermission({ 
    permissions, 
    children, 
    fallback = null 
  }: { 
    permissions: AdminPermission[], 
    children: ReactNode, 
    fallback?: ReactNode 
  }) {
    const { permissions: userPermissions, isLoading } = useAdminAuth();
  
    if (isLoading) return null;
    
    const hasRequiredPermissions = permissions.every(perm => 
      userPermissions.includes(perm)
    );
  
    return hasRequiredPermissions ? <>{children}</> : <>{fallback}</>;
  }