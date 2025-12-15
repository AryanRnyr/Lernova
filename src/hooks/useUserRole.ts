import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

type AppRole = 'student' | 'instructor' | 'admin';

interface RoleWithApproval {
  role: AppRole;
  is_approved: boolean;
}

export const useUserRole = () => {
  const { user } = useAuth();
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [approvedRoles, setApprovedRoles] = useState<AppRole[]>([]);
  const [isRejectedInstructor, setIsRejectedInstructor] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRoles = async () => {
      if (!user) {
        setRoles([]);
        setApprovedRoles([]);
        setIsRejectedInstructor(false);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('user_roles')
        .select('role, is_approved')
        .eq('user_id', user.id);

      if (error) {
        console.error('Error fetching roles:', error);
        setRoles([]);
        setApprovedRoles([]);
      } else {
        const rolesData = data as RoleWithApproval[] ?? [];
        setRoles(rolesData.map((r) => r.role));
        // Only set approved roles
        setApprovedRoles(rolesData.filter((r) => r.is_approved).map((r) => r.role));
        // Check if user has an unapproved instructor role (rejected or pending)
        const hasUnapprovedInstructor = rolesData.some(
          (r) => r.role === 'instructor' && !r.is_approved
        );
        setIsRejectedInstructor(hasUnapprovedInstructor);
      }
      setLoading(false);
    };

    fetchRoles();
  }, [user]);

  const hasRole = (role: AppRole) => roles.includes(role);
  const hasApprovedRole = (role: AppRole) => approvedRoles.includes(role);
  const isAdmin = () => hasApprovedRole('admin');
  // Instructor must be approved to have instructor privileges
  const isInstructor = () => hasApprovedRole('instructor');
  const isStudent = () => hasRole('student');
  const isPendingInstructor = () => hasRole('instructor') && !hasApprovedRole('instructor');

  return { 
    roles, 
    approvedRoles,
    loading, 
    hasRole, 
    hasApprovedRole,
    isAdmin, 
    isInstructor, 
    isStudent,
    isPendingInstructor,
    isRejectedInstructor
  };
};
