import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutDashboard, Users, Building2, FileText,
  Briefcase, AlertTriangle, BarChart3, ArrowLeftRight, Sparkles, ClipboardList, FileWarning, UserPlus, GitPullRequest, UserCheck, Calendar, Wrench, ChevronDown, Search, X, Clock,
  Send, Inbox, Fingerprint, CheckCircle2, LogOut, Activity, Hospital, PartyPopper, Utensils, History, Car, RefreshCw, Shield, Bed, User
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export default function Layout({ children }) {
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const sidebarContentRef = React.useRef(null);

  // Fetch current user and their permissions
  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: async () => {
      try {
        return await base44.auth.me();
      } catch (error) {
        return null;
      }
    },
  });

  const { data: userRoles = [] } = useQuery({
    queryKey: ['user-roles'],
    queryFn: () => base44.entities.UserRole.list(),
    enabled: !!currentUser?.id,
  });

  const { data: roles = [] } = useQuery({
    queryKey: ['roles'],
    queryFn: () => base44.entities.Role.list(),
    enabled: !!currentUser?.id,
  });

  // Fetch data for count badges
  const { data: transferRequests = [] } = useQuery({
    queryKey: ['transfer-requests-count'],
    queryFn: () => base44.entities.TransferRequest.list(),
    enabled: !!currentUser?.id,
    staleTime: 5 * 60 * 1000,
  });

  const { data: technicians = [] } = useQuery({
    queryKey: ['technicians-count'],
    queryFn: () => base44.entities.Technician.list(),
    enabled: !!currentUser?.id,
    staleTime: 5 * 60 * 1000,
  });

  const { data: leaveRequests = [] } = useQuery({
    queryKey: ['leave-requests-count'],
    queryFn: () => base44.entities.LeaveRequest.list(),
    enabled: !!currentUser?.id,
    staleTime: 5 * 60 * 1000,
  });

  const { data: maintenanceRequests = [] } = useQuery({
    queryKey: ['maintenance-requests-count'],
    queryFn: () => base44.entities.MaintenanceRequest.list(),
    enabled: !!currentUser?.id,
    staleTime: 5 * 60 * 1000,
  });

  const { data: mealPreferenceChanges = [] } = useQuery({
    queryKey: ['meal-preference-changes-count'],
    queryFn: () => base44.entities.MealPreferenceChangeRequest.list(),
    enabled: !!currentUser?.id,
    staleTime: 5 * 60 * 1000,
  });

  const { data: attendance = [] } = useQuery({
    queryKey: ['attendance-count'],
    queryFn: () => base44.entities.Attendance.list(),
    enabled: !!currentUser?.id,
    staleTime: 5 * 60 * 1000,
  });

  const { data: technicianDocuments = [] } = useQuery({
    queryKey: ['technician-documents-count'],
    queryFn: () => base44.entities.TechnicianDocument.list(),
    enabled: !!currentUser?.id,
    staleTime: 5 * 60 * 1000,
  });

  const { data: campDocuments = [] } = useQuery({
    queryKey: ['camp-documents-count'],
    queryFn: () => base44.entities.CampDocument.list(),
    enabled: !!currentUser?.id,
    staleTime: 5 * 60 * 1000,
  });

  // Get user's permissions
  const userPermissions = React.useMemo(() => {
    if (!currentUser?.email) return [];

    const userRoleRecords = userRoles.filter(ur => ur.user_email === currentUser.email);
    const userRoleIds = userRoleRecords.map(ur => ur.role_id);
    const userRolesList = roles.filter(r => userRoleIds.includes(r.id));

    const allPermissions = new Set();
    userRolesList.forEach(role => {
      if (role.permissions) {
        try {
          const perms = typeof role.permissions === 'string'
            ? JSON.parse(role.permissions)
            : role.permissions;
          if (Array.isArray(perms)) {
            perms.forEach(p => allPermissions.add(p));
          }
        } catch (e) {
          console.error('Error parsing permissions for role:', role.name, e);
        }
      }
    });

    return Array.from(allPermissions);
  }, [currentUser, userRoles, roles]);

  // Check if user has a specific permission
  const hasPermission = (permission) => {
    // console.log(`Checking permission: ${permission}, User Role: ${currentUser?.role}`);
    if (!permission) return true; // No permission required
    if (!currentUser) return true; // Public access (or layout handles redirection)

    // CRITICAL: Admin bypass - check specifically for 'admin' string
    if (currentUser.role === 'admin') return true;

    // Legacy/Custom Roles check
    return userPermissions.includes(permission);
  };

  // Calculate counts for badges
  const incomingRequestsCount = React.useMemo(() => {
    if (!currentUser) return 0;
    const validStatuses = ['pending_allocation', 'beds_allocated', 'allocation_rejected'];
    return transferRequests.filter(tr => {
      if (!validStatuses.includes(tr.status)) return false;
      if (currentUser.role === 'admin') return true;
      if (currentUser.camp_id) {
        return tr.target_camp_id === currentUser.camp_id;
      }
      return false;
    }).length;
  }, [transferRequests, currentUser]);

  const myTransferRequestsCount = React.useMemo(() => {
    if (!currentUser) return 0;
    const canSeeAllRequests = currentUser.role === 'admin' ||
      currentUser.is_camp_manager ||
      hasPermission('approve_transfer_requests') ||
      hasPermission('dispatch_transfer_requests');

    const myRequests = canSeeAllRequests
      ? transferRequests
      : transferRequests.filter(req => req.requested_by === currentUser.id || req.created_by === currentUser.email);

    return myRequests.filter(req => !['completed', 'cancelled'].includes(req.status)).length;
  }, [transferRequests, currentUser, userPermissions]);

  // Expected Arrivals Count
  const expectedArrivalsCount = React.useMemo(() => {
    if (!currentUser) return 0;
    return technicians.filter(t => t.status === 'pending_arrival').length;
  }, [technicians, currentUser]);

  // Sajja Pre-Induction Count (Overdue)
  const sajjaInductionCount = React.useMemo(() => {
    if (!currentUser) return 0;
    const today = new Date();
    return technicians.filter(t => {
      if (t.induction_status !== 'pre_induction') return false;
      if (!t.sajja_induction_start_date) return false;
      const startDate = new Date(t.sajja_induction_start_date);
      const daysDiff = Math.floor((today - startDate) / (1000 * 60 * 60 * 24));
      return daysDiff > 7;
    }).length;
  }, [technicians, currentUser]);

  // Confirm Arrivals Count
  const confirmArrivalsCount = React.useMemo(() => {
    if (!currentUser) return 0;
    const pendingStatuses = ['technicians_dispatched', 'partially_arrived'];
    return transferRequests.filter(tr => pendingStatuses.includes(tr.status)).length;
  }, [transferRequests, currentUser]);

  // Camp Induction Overdue Count
  const campInductionCount = React.useMemo(() => {
    if (!currentUser) return 0;
    const today = new Date();
    return technicians.filter(t => {
      if (t.camp_induction_completed) return false;
      if (!t.camp_induction_required) return false;
      if (!t.actual_arrival_date) return false;
      const arrivalDate = new Date(t.actual_arrival_date);
      const daysDiff = Math.floor((today - arrivalDate) / (1000 * 60 * 60 * 24));
      return daysDiff > 3;
    }).length;
  }, [technicians, currentUser]);

  // Pending Transfers Count
  const pendingTransfersCount = React.useMemo(() => {
    if (!currentUser) return 0;
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    return technicians.filter(t => {
      if (!t.last_transfer_date) return false;
      if (t.transfer_approved_by) return false;
      const transferDate = new Date(t.last_transfer_date);
      return transferDate >= thirtyDaysAgo;
    }).length;
  }, [technicians, currentUser]);

  // Leave Management Count (Pending)
  const leaveManagementCount = React.useMemo(() => {
    if (!currentUser) return 0;
    return leaveRequests.filter(l => l.status === 'pending').length;
  }, [leaveRequests, currentUser]);

  // Maintenance Requests Count (Pending/In Progress)
  const maintenanceRequestsCount = React.useMemo(() => {
    if (!currentUser) return 0;
    return maintenanceRequests.filter(m => ['pending', 'in_progress'].includes(m.status)).length;
  }, [maintenanceRequests, currentUser]);

  // Meal Preference Changes Count (Pending)
  const mealPreferenceChangesCount = React.useMemo(() => {
    if (!currentUser) return 0;
    return mealPreferenceChanges.filter(m => m.status === 'pending').length;
  }, [mealPreferenceChanges, currentUser]);

  // Attendance Absent Count (Today)
  const absentTodayCount = React.useMemo(() => {
    if (!currentUser) return 0;
    const today = new Date().toISOString().split('T')[0];
    const todayAttendance = attendance.filter(a => a.date === today && a.status === 'absent');
    return todayAttendance.length;
  }, [attendance, currentUser]);

  // Expiry Follow-up Count (Next 30 days)
  const expiryFollowupCount = React.useMemo(() => {
    if (!currentUser) return 0;
    const today = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(today.getDate() + 30);

    const expiringTechDocs = technicianDocuments.filter(doc => {
      if (!doc.expiry_date || !doc.is_active) return false;
      const expiryDate = new Date(doc.expiry_date);
      return expiryDate >= today && expiryDate <= thirtyDaysFromNow;
    });

    const expiringCampDocs = campDocuments.filter(doc => {
      if (!doc.expiry_date || !doc.is_active) return false;
      const expiryDate = new Date(doc.expiry_date);
      return expiryDate >= today && expiryDate <= thirtyDaysFromNow;
    });

    return expiringTechDocs.length + expiringCampDocs.length;
  }, [technicianDocuments, campDocuments, currentUser]);

  // Sonapur Exit Tracker Count (Overdue)
  const sonapurExitCount = React.useMemo(() => {
    if (!currentUser) return 0;
    const today = new Date();
    return technicians.filter(t => {
      if (t.exit_process_status !== 'in_process') return false;
      if (!t.sonapur_exit_start_date) return false;
      const startDate = new Date(t.sonapur_exit_start_date);
      const daysDiff = Math.floor((today - startDate) / (1000 * 60 * 60 * 24));
      return daysDiff > 7;
    }).length;
  }, [technicians, currentUser]);

  const navigationItems = [
    {
      label: "Master",
      icon: LayoutDashboard,
      permissions: ["view_dashboard", "manage_technicians", "manage_external_personnel", "manage_camps", "manage_hospitals", "manage_projects", "manage_meal_preferences"],
      items: [
        { title: "Dashboard", url: createPageUrl("Dashboard"), icon: LayoutDashboard, permission: "view_dashboard" },
        { title: "Fix Dates", url: createPageUrl("FixDates"), icon: Calendar, permission: "fix_dates" },
        { title: "Bed Diagnostics", url: createPageUrl("BedDiagnostics"), icon: Wrench, permission: "bed_diagnostics" },
        { title: "Technicians", url: createPageUrl("Technicians"), icon: Users, permission: "manage_technicians" },
        { title: "External Personnel", url: createPageUrl("ExternalPersonnelManagement"), icon: Users, permission: "manage_external_personnel" },
        { title: "Camps", url: createPageUrl("Camps"), icon: Building2, permission: "manage_camps" },
        { title: "Hospitals", url: createPageUrl("Hospitals"), icon: Hospital, permission: "manage_hospitals" },
        { title: "Projects", url: createPageUrl("Projects"), icon: Briefcase, permission: "manage_projects" },
        { title: "Meal Preferences", url: createPageUrl("MealPreferences"), icon: Utensils, permission: "manage_meal_preferences" },
      ]
    },
    {
      label: "Onboarding",
      icon: UserPlus,
      permissions: ["onboarding_form", "airport_pickup_plan", "expected_arrivals", "sajja_pre_induction", "induction_master", "pipeline_report"],
      items: [
        { title: "Onboarding Form", url: createPageUrl("OnboardingForm"), icon: UserPlus, permission: "onboarding_form" },
        { title: "Airport Pickup Plan", url: createPageUrl("AirportPickupManagement"), icon: Car, permission: "airport_pickup_plan" },
        { title: "Expected Arrivals", url: createPageUrl("ExpectedArrivals"), icon: UserCheck, permission: "expected_arrivals", count: expectedArrivalsCount },
        { title: "Sajja Pre-Induction", url: createPageUrl("SajjaInductionTracker"), icon: Clock, permission: "sajja_pre_induction", count: sajjaInductionCount },
        { title: "Induction Master", url: createPageUrl("InductionMaster"), icon: ClipboardList, permission: "induction_master" },
        { title: "Pipeline Report", url: createPageUrl("OnboardingPipelineReport"), icon: BarChart3, permission: "pipeline_report" },
      ]
    },
    {
      label: "Camp Transfers",
      icon: ArrowLeftRight,
      permissions: ["initiate_transfer", "my_transfer_requests", "incoming_requests", "confirm_arrivals", "camp_induction", "transfer_history", "schedule_policies"],
      items: [
        { title: "Initiate Transfer", url: createPageUrl("InitiateTransfer"), icon: Send, permission: "initiate_transfer" },
        { title: "My Transfer Requests", url: createPageUrl("MyTransferRequests"), icon: FileText, permission: "my_transfer_requests", count: myTransferRequestsCount },
        { title: "Incoming Requests", url: createPageUrl("IncomingTransferRequests"), icon: Inbox, permission: "incoming_requests", count: incomingRequestsCount },
        { title: "Confirm Arrivals", url: createPageUrl("ConfirmArrivals"), icon: Fingerprint, permission: "confirm_arrivals", count: confirmArrivalsCount },
        { title: "Camp Induction", url: createPageUrl("CampInductionTracker"), icon: CheckCircle2, permission: "camp_induction", count: campInductionCount },
        { title: "Transfer History", url: createPageUrl("TransferHistory"), icon: History, permission: "transfer_history" },
        { title: "Schedule Policies", url: createPageUrl("TransferSchedulePolicies"), icon: Calendar, permission: "schedule_policies" },
      ]
    },
    {
      label: "Camp Operations",
      icon: Building2,
      permissions: ["manage_visitors", "smart_allocation", "manual_allocation", "bulk_transfer", "pending_transfers", "attendance", "daily_activity_log", "meal_preference_changes"],
      items: [
        { title: "Visitors", url: createPageUrl("Visitors"), icon: Users, permission: "manage_visitors" },
        { title: "Smart Allocation", url: createPageUrl("SmartAllocation"), icon: Sparkles, permission: "smart_allocation" },
        { title: "Manual Allocation", url: createPageUrl("ManualAllocation"), icon: Bed, permission: "manual_allocation" },
        { title: "Bulk Transfer", url: createPageUrl("BulkTransfer"), icon: ArrowLeftRight, permission: "bulk_transfer" },
        { title: "Pending Transfers", url: createPageUrl("PendingTransfers"), icon: GitPullRequest, permission: "pending_transfers", count: pendingTransfersCount },
        { title: "Attendance/Absent", url: createPageUrl("Attendance"), icon: ClipboardList, permission: "attendance", count: absentTodayCount },
        { title: "Daily Activity Log", url: createPageUrl("DailyActivityLog"), icon: ClipboardList, permission: "daily_activity_log" },
        { title: "Meal Preference Changes", url: createPageUrl("PendingMealPreferenceChanges"), icon: Utensils, permission: "meal_preference_changes", count: mealPreferenceChangesCount },
      ]
    },
    {
      label: "Asset Maintenance",
      icon: Wrench,
      permissions: ["asset_dashboard", "pm_scheduler", "maintenance_requests"],
      items: [
        { title: "Asset Dashboard", url: createPageUrl("AssetDashboard"), icon: Wrench, permission: "asset_dashboard" },
        { title: "PM Scheduler", url: createPageUrl("MaintenanceScheduler"), icon: Calendar, permission: "pm_scheduler" },
        { title: "Maintenance Requests", url: createPageUrl("MaintenanceRequests"), icon: AlertTriangle, permission: "maintenance_requests", count: maintenanceRequestsCount },
      ]
    },
    {
      label: "Medical & Health",
      icon: Activity,
      permissions: ["medical_management"],
      items: [
        { title: "Medical Management", url: createPageUrl("MedicalManagement"), icon: Activity, permission: "medical_management" },
      ]
    },
    {
      label: "EID & Visa",
      icon: FileText,
      permissions: ["appointment_management"],
      items: [
        { title: "Appointment Management", url: createPageUrl("AppointmentManagement"), icon: FileText, permission: "appointment_management" },
      ]
    },
    {
      label: "Recreation & Welfare",
      icon: PartyPopper,
      permissions: ["event_management", "my_events"],
      items: [
        { title: "Event Management", url: createPageUrl("EventManagement"), icon: PartyPopper, permission: "event_management" },
        { title: "My Events", url: createPageUrl("MyEvents"), icon: Calendar, permission: "my_events" },
      ]
    },
    {
      label: "Personal",
      icon: Users,
      permissions: [],
      items: [
        { title: "My Profile", url: createPageUrl("MyProfile"), icon: User, permission: null },
        { title: "My Meal Preferences", url: createPageUrl("MyMealPreferences"), icon: Utensils, permission: null },
      ]
    },
    {
      label: "Camp Hiring (TR)",
      icon: RefreshCw,
      permissions: ["camp_renewal", "hiring_requests", "new_hiring_request"],
      items: [
        { title: "Camp Renewal", url: createPageUrl("CampRenewalProcess"), icon: RefreshCw, permission: "camp_renewal" },
        { title: "Hiring Requests", url: createPageUrl("CampHiringRequests"), icon: Building2, permission: "hiring_requests" },
        { title: "New Request", url: createPageUrl("CreateCampHiringRequest"), icon: FileText, permission: "new_hiring_request" },
      ]
    },
    {
      label: "Compliance & HR",
      icon: ClipboardList,
      permissions: ["manage_documents", "expiry_followup", "leave_management", "disciplinary", "disciplinary_action_types", "sonapur_exit_tracker", "technician_report"],
      items: [
        { title: "Documents", url: createPageUrl("Documents"), icon: FileText, permission: "manage_documents" },
        { title: "Expiry Follow-up", url: createPageUrl("ExpiryReport"), icon: FileWarning, permission: "expiry_followup", count: expiryFollowupCount },
        { title: "Leave Management", url: createPageUrl("LeaveManagement"), icon: Briefcase, permission: "leave_management", count: leaveManagementCount },
        { title: "Disciplinary", url: createPageUrl("Disciplinary"), icon: AlertTriangle, permission: "disciplinary" },
        { title: "Disciplinary Action Types", url: createPageUrl("DisciplinaryActionTypes"), icon: ClipboardList, permission: "disciplinary_action_types" },
        { title: "Sonapur Exit Tracker", url: createPageUrl("SonapurExitTracker"), icon: LogOut, permission: "sonapur_exit_tracker", count: sonapurExitCount },
        { title: "Technician Report", url: createPageUrl("TechnicianDetailReport"), icon: FileText, permission: "technician_report" },
      ]
    },
    {
      label: "Reporting",
      icon: BarChart3,
      permissions: ["view_reports"],
      items: [
        { title: "Reports", url: createPageUrl("Reports"), icon: BarChart3, permission: "view_reports" },
      ]
    },
    {
      label: "Admin",
      icon: Shield,
      permissions: ["manage_roles", "manage_sla"],
      items: [
        { title: "Roles & Permissions", url: createPageUrl("RolesAndPermissions"), icon: Shield, permission: "manage_roles" },
        { title: "SLA Management", url: createPageUrl("SlaManagement"), icon: Clock, permission: "manage_sla" },
      ]
    },
    {
      label: "Help",
      icon: FileText,
      permissions: [],
      items: [
        { title: "System Guide", url: createPageUrl("Help"), icon: FileText, permission: "system_guide" },
        { title: "Download BRD", url: createPageUrl("Help"), icon: FileText, permission: "download_brd" },
      ]
    },
  ];

  // Filter navigation based on permissions
  const filteredNavigationItems = React.useMemo(() => {
    return navigationItems
      .map(group => {
        // Filter items within the group
        const filteredItems = group.items.filter(item => hasPermission(item.permission));

        // Only include group if it has at least one visible item
        if (filteredItems.length === 0) return null;

        return {
          ...group,
          items: filteredItems,
        };
      })
      .filter(Boolean);
  }, [userPermissions, currentUser]);

  // Filter navigation items based on search - preserve original index
  const filteredNavigation = filteredNavigationItems.map((group, originalIndex) => {
    const filteredItems = group.items.filter(item =>
      item.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return {
      ...group,
      items: filteredItems,
      hasResults: filteredItems.length > 0,
      originalIndex: originalIndex // Preserve original index for state management
    };
  }).filter(group => group.hasResults);



  // Determine what to display based on search query
  const displayNavigation = searchQuery
    ? filteredNavigation
    : filteredNavigationItems.map((group, index) => ({
      ...group,
      hasResults: true, // All groups have results when no search
      originalIndex: index // Ensure original index is always present
    }));

  const hasNoResults = searchQuery && filteredNavigation.length === 0;

  return (
    <SidebarProvider defaultOpen={true} style={{ "--sidebar-width": "280px", "--sidebar-width-icon": "80px" }}>
      <style>{`
        [data-sidebar] {
          background-color: #041847 !important;
        }
        [data-sidebar] > * {
          background-color: #041847 !important;
        }
        .submenu-item-active {
          background-color: var(--active-bg) !important;
        }
      `}</style>
      <div className="min-h-screen flex w-full" style={{ backgroundColor: '#18203fff' }}>
        <Sidebar collapsible="icon" className="border-r h-screen overflow-hidden" style={{ borderColor: '#E5E7ED', backgroundColor: '#041847 !important' }}>
          <SidebarHeader className="border-b p-6" style={{ borderColor: '#041847', backgroundColor: '#041847 !important' }}>
            <div className="flex items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-3 flex-1">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg" style={{ backgroundColor: '#FF8A00' }}>
                  <Building2 className="w-6 h-6 text-white" />
                </div>
                <div className="group-data-[collapsible=icon]:hidden flex-1">
                  <h2 className="font-bold text-white text-lg">CampManager</h2>
                  <p className="text-xs" style={{ color: '#FFFFFF' }}>Labor Camp System</p>
                </div>
              </div>
              <div className="flex gap-2">
                {currentUser ? (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => base44.auth.logout()}
                          className="p-2 rounded-lg transition-colors hover:bg-red-600 text-white group-data-[collapsible=icon]:mx-auto"
                          title="Logout"
                        >
                          <LogOut className="w-5 h-5" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        <p>Logout</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ) : (
                  <Link
                    to="/Login"
                    className="p-2 rounded-lg transition-colors hover:bg-blue-600 text-white group-data-[collapsible=icon]:mx-auto"
                    title="Login"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" /><polyline points="10 17 15 12 10 7" /><line x1="15" x2="3" y1="12" y2="12" /></svg>
                  </Link>
                )}
                <SidebarTrigger className="p-2 rounded-lg transition-colors hover:bg-white/10 text-white" />
              </div>
            </div>

            {/* Search Input */}
            <div className="relative group-data-[collapsible=icon]:hidden">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search pages..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-9 h-9 text-sm focus:ring-1 bg-white text-gray-900"
                style={{ borderColor: '#E5E7ED' }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 hover:opacity-70 text-gray-400"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </SidebarHeader>

          <SidebarContent ref={sidebarContentRef} className="p-3 overflow-y-auto h-full" style={{ backgroundColor: '#041847 !important' }}>
            {hasNoResults ? (
              <div className="text-center py-8 px-4">
                <Search className="w-12 h-12 mx-auto mb-3 text-black" style={{ opacity: 0.3 }} />
                <p className="text-sm text-black" style={{ opacity: 0.8 }}>No pages found</p>
                <p className="text-xs mt-1 text-black" style={{ opacity: 0.6 }}>Try a different search term</p>
              </div>
            ) : (
              displayNavigation.map((group) => {
                const submenuThemes = [
                  { bg: '#1E3A8A', hover: '#2563EB', label: 'Blue' },
                  { bg: '#7C3AED', hover: '#9333EA', label: 'Purple' },
                  { bg: '#059669', hover: '#10B981', label: 'Green' },
                  { bg: '#DC2626', hover: '#EF4444', label: 'Red' },
                  { bg: '#FF6B00', hover: '#FF8C00', label: 'Orange' },
                  { bg: '#0891B2', hover: '#06B6D4', label: 'Cyan' },
                  { bg: '#BE185D', hover: '#EC4899', label: 'Pink' },
                  { bg: '#65A30D', hover: '#84CC16', label: 'Lime' },
                  { bg: '#4F46E5', hover: '#6366F1', label: 'Indigo' },
                  { bg: '#0D9488', hover: '#14B8A6', label: 'Teal' },
                  { bg: '#B91C1C', hover: '#DC2626', label: 'Crimson' },
                  { bg: '#7C2D12', hover: '#92400E', label: 'Brown' },
                  { bg: '#1F2937', hover: '#374151', label: 'Gray' },
                  { bg: '#374151', hover: '#4B5563', label: 'Slate' },
                ];
                const theme = submenuThemes[group.originalIndex % submenuThemes.length];

                return (
                  <SidebarGroup key={group.originalIndex} className="mb-2 group-data-[collapsible=icon]:mb-4">
                    <Popover>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <PopoverTrigger asChild>
                              <button className="w-full">
                                <SidebarGroupLabel className="text-xs font-semibold uppercase tracking-wider px-3 py-2.5 mb-1 flex items-center cursor-pointer transition-all hover:bg-white/10 rounded-lg group-data-[collapsible=icon]:px-2 group-data-[collapsible=icon]:justify-center" style={{ color: '#FFFFFF', opacity: 0.85 }}>
                                  <group.icon className="w-5 h-5 group-data-[collapsible=icon]:w-6 group-data-[collapsible=icon]:h-6" style={{ color: '#FFFFFF', opacity: 0.9 }} />
                                  <span className="ml-2 group-data-[collapsible=icon]:hidden">{group.label}</span>
                                  <ChevronDown
                                    className="w-4 h-4 -rotate-90 ml-auto group-data-[collapsible=icon]:hidden"
                                    style={{ color: '#FFFFFF', opacity: 0.7 }}
                                  />
                                </SidebarGroupLabel>
                              </button>
                            </PopoverTrigger>
                          </TooltipTrigger>
                          <TooltipContent side="right" className="group-data-[state=open]:hidden">
                            <p>{group.label}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>

                      <PopoverContent
                        side="right"
                        align="start"
                        className="w-72 p-0 ml-2 border-none shadow-2xl overflow-hidden"
                        style={{ backgroundColor: theme.bg }}
                      >
                        <div className="p-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                          <h3 className="font-semibold text-white text-sm">{group.label}</h3>
                        </div>
                        <SidebarMenu className="p-2" style={{ backgroundColor: `rgba(255, 255, 255, 0.15)` }}>
                          {group.items.map((item) => (
                            <SidebarMenuItem key={item.title}>
                              <SidebarMenuButton
                                asChild
                                className="transition-all duration-200 mb-0.5"
                              >
                                <Link
                                  to={item.url}
                                  style={{
                                    backgroundColor: location.pathname === item.url ? theme.hover : 'rgba(255, 255, 255, 0.15)',
                                    color: '#FFFFFF',
                                    fontWeight: '600',
                                    '--active-bg': theme.hover,
                                  }}
                                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all hover:shadow-lg ${location.pathname === item.url ? 'submenu-item-active' : ''}`}
                                  onMouseEnter={(e) => {
                                    if (location.pathname !== item.url) {
                                      e.currentTarget.style.backgroundColor = theme.hover;
                                      e.currentTarget.style.fontWeight = '700';
                                    }
                                  }}
                                  onMouseLeave={(e) => {
                                    if (location.pathname !== item.url) {
                                      e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.15)';
                                      e.currentTarget.style.fontWeight = '600';
                                    }
                                  }}
                                >
                                  <item.icon className="w-5 h-5 flex-shrink-0" />
                                  <span className="font-medium text-sm">{item.title}</span>
                                  {item.count > 0 && (
                                    <span className="ml-auto bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center">
                                      {item.count}
                                    </span>
                                  )}
                                  {location.pathname === item.url && !item.count && (
                                    <div className="ml-auto w-2 h-2 rounded-full bg-white shadow-sm" />
                                  )}
                                </Link>
                              </SidebarMenuButton>
                            </SidebarMenuItem>
                          ))}
                        </SidebarMenu>
                      </PopoverContent>
                    </Popover>
                  </SidebarGroup>
                );
              })
            )}
          </SidebarContent>
        </Sidebar>

        <main className="flex-1 flex flex-col">
          <header className="px-6 py-4 border-b flex items-center justify-between" style={{ backgroundColor: '#ffffff', borderColor: '#E5E7ED' }}>
            <SidebarTrigger className="p-2 rounded-lg transition-colors hover:bg-gray-100 border" style={{ borderColor: '#E5E7ED' }} />
            {currentUser && (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 rounded-lg border border-blue-200">
                  <User className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-900">{currentUser.full_name || currentUser.email}</span>
                  {currentUser.role === 'admin' && (
                    <span className="text-xs px-2 py-0.5 bg-blue-600 text-white rounded">Admin</span>
                  )}
                </div>
                <button
                  onClick={() => base44.auth.logout()}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg border border-red-200 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </div>
            )}
          </header>

          <div className="flex-1 overflow-auto">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}