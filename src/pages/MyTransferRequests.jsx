import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Send, Clock, CheckCircle2, XCircle, Truck, Utensils, AlertCircle, Filter, X, ArrowUpDown, Search, PackageCheck } from "lucide-react";
import { format, parseISO } from "date-fns";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export default function MyTransferRequests() {
  const [sortField, setSortField] = useState("request_date");
  const [sortDirection, setSortDirection] = useState("desc");
  const [rejectDialog, setRejectDialog] = useState(false);
  const [rejectingRequest, setRejectingRequest] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");

  // Global search and top-level filters
  const [globalSearch, setGlobalSearch] = useState("");
  const [filterStatusTop, setFilterStatusTop] = useState([]); // Changed to array for multi-select
  const [filterSourceCampTop, setFilterSourceCampTop] = useState("all");
  const [filterTargetCampTop, setFilterTargetCampTop] = useState("all");
  const [filterReasonTop, setFilterReasonTop] = useState("all");
  const [searchStatusTop, setSearchStatusTop] = useState(""); // Search within status filter

  // Excel-style column filters
  const [filterRequestDate, setFilterRequestDate] = useState([]);
  const [filterSourceCamp, setFilterSourceCamp] = useState([]);
  const [filterTargetCamp, setFilterTargetCamp] = useState([]);
  const [filterReason, setFilterReason] = useState([]);
  const [filterPersonnelCount, setFilterPersonnelCount] = useState([]);
  const [filterPersonnelNames, setFilterPersonnelNames] = useState([]);
  const [filterMealPrefs, setFilterMealPrefs] = useState([]);
  const [filterStatus, setFilterStatus] = useState([]);
  const [filterScheduledDate, setFilterScheduledDate] = useState([]);
  const [filterMealCoupons, setFilterMealCoupons] = useState([]);

  // Search states for filters
  const [searchRequestDate, setSearchRequestDate] = useState("");
  const [searchSourceCamp, setSearchSourceCamp] = useState("");
  const [searchTargetCamp, setSearchTargetCamp] = useState("");
  const [searchReason, setSearchReason] = useState("");
  const [searchPersonnelCount, setSearchPersonnelCount] = useState("");
  const [searchPersonnelNames, setSearchPersonnelNames] = useState("");
  const [searchMealPrefs, setSearchMealPrefs] = useState("");
  const [searchStatus, setSearchStatus] = useState("");
  const [searchScheduledDate, setSearchScheduledDate] = useState("");
  const [searchMealCoupons, setSearchMealCoupons] = useState("");

  const queryClient = useQueryClient();

  const { data: requests = [] } = useQuery({
    queryKey: ['transfer-requests'],
    queryFn: () => base44.entities.TransferRequest.list('-request_date'),
  });

  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
  });

  const { data: technicians = [] } = useQuery({
    queryKey: ['technicians'],
    queryFn: () => base44.entities.Technician.list(),
  });

  const { data: externalPersonnel = [] } = useQuery({
    queryKey: ['external-personnel'],
    queryFn: () => base44.entities.ExternalPersonnel.list(),
  });

  const { data: camps = [] } = useQuery({
    queryKey: ['camps'],
    queryFn: () => base44.entities.Camp.list(),
  });

  const { data: beds = [] } = useQuery({
    queryKey: ['beds'],
    queryFn: () => base44.entities.Bed.list(),
  });

  const { data: mealPreferences = [] } = useQuery({
    queryKey: ['meal-preferences'],
    queryFn: () => base44.entities.MealPreference.list(),
  });

  const { data: userRoles = [], isLoading: userRolesLoading } = useQuery({
    queryKey: ['user-roles'],
    queryFn: () => base44.entities.UserRole.list(),
    enabled: !!currentUser?.id,
  });

  const { data: roles = [], isLoading: rolesLoading } = useQuery({
    queryKey: ['roles'],
    queryFn: () => base44.entities.Role.list(),
    enabled: !!currentUser?.id,
  });

  const updateRequestMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.TransferRequest.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transfer-requests'] });
    },
  });

  const updateTechnicianMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Technician.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['technicians'] });
    },
  });

  const updateExternalMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ExternalPersonnel.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['external-personnel'] });
    },
  });

  const updateBedMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Bed.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['beds'] });
    },
  });

  const toggleMealCouponsCollected = async (request) => {
    const newStatus = !request.old_meal_coupons_collected;
    
    try {
      await updateRequestMutation.mutateAsync({
        id: request.id,
        data: {
          old_meal_coupons_collected: newStatus
        }
      });
    } catch (error) {
      alert(`Failed to update meal coupon status: ${error.message}`);
    }
  };

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
    if (!permission) return true;
    if (!currentUser) return false;
    if (currentUser.role === 'admin') return true;
    return userPermissions.includes(permission);
  };

  // Check if user has a specific role name
  const hasRoleName = (roleName) => {
    if (!currentUser?.email) return false;
    if (currentUser.role === 'admin') return true;
    
    const userRoleRecords = userRoles.filter(ur => ur.user_email === currentUser.email);
    const userRoleIds = userRoleRecords.map(ur => ur.role_id);
    const userRolesList = roles.filter(r => userRoleIds.includes(r.id));
    
    return userRolesList.some(role => role.name === roleName);
  };

  // Wait for permissions data to load before determining access
  const permissionsLoading = userRolesLoading || rolesLoading;
  
  // Admins, Camp Managers, and users with approval/dispatch permissions see all requests
  const canSeeAllRequests = currentUser?.role === 'admin' || 
    currentUser?.is_camp_manager ||
    hasPermission('approve_transfer_requests') ||
    hasPermission('dispatch_transfer_requests');
  
  // Debug logging
  console.log('MyTransferRequests Debug:', {
    currentUser: currentUser?.email,
    currentUserRole: currentUser?.role,
    isCampManager: currentUser?.is_camp_manager,
    permissionsLoading,
    canSeeAllRequests,
    userPermissions,
    hasApprovePermission: hasPermission('approve_transfer_requests'),
    hasDispatchPermission: hasPermission('dispatch_transfer_requests'),
    requestsCount: requests.length,
    userRolesCount: userRoles.length,
    rolesCount: roles.length,
    myRequestsCount: canSeeAllRequests ? requests.length : requests.filter(req => req.requested_by === currentUser?.id || req.created_by === currentUser?.email).length,
    // Role name checks
    has02Onboarding: hasRoleName('02.onboarding'),
    has10CPOOffice: hasRoleName('10.CPO Office'),
    userRolesList: userRoles.filter(ur => ur.user_email === currentUser?.email).map(ur => {
      const role = roles.find(r => r.id === ur.role_id);
      return role?.name;
    })
  });
  
  // Show loading state while permissions are being fetched
  const myRequests = permissionsLoading
    ? [] // Don't filter yet if still loading
    : (canSeeAllRequests
        ? requests
        : requests.filter(req => req.requested_by === currentUser?.id || req.created_by === currentUser?.email));

  const handleApproveForDispatch = async (request) => {
    const confirmApproval = window.confirm(
      `Approve this transfer for dispatch?\n\nThis will mark the request as ready to dispatch, allowing you to proceed with sending the personnel.`
    );

    if (!confirmApproval) return;

    try {
      await updateRequestMutation.mutateAsync({
        id: request.id,
        data: {
          status: 'approved_for_dispatch',
        }
      });
      alert("Transfer approved for dispatch! You can now dispatch the personnel.");
    } catch (error) {
      alert(`Failed to approve: ${error.message}`);
    }
  };

  const handleRejectTransfer = async () => {
    if (!rejectionReason.trim()) {
      alert('Please provide a reason for rejection');
      return;
    }

    try {
      await updateRequestMutation.mutateAsync({
        id: rejectingRequest.id,
        data: {
          status: 'allocation_rejected',
          rejection_reason: rejectionReason.trim(),
          rejected_by: currentUser?.email,
          rejected_date: new Date().toISOString().split('T')[0]
        }
      });
      alert("Transfer request rejected.");
      setRejectDialog(false);
      setRejectingRequest(null);
      setRejectionReason("");
    } catch (error) {
      alert(`Failed to reject: ${error.message}`);
    }
  };

  const handleDispatch = async (request) => {
    // Check for duplicate allocations before dispatching
    const activeTransferStatuses = ['beds_allocated', 'approved_for_dispatch', 'technicians_dispatched', 'partially_arrived'];
    const personnelInRequest = [
      ...(request.technician_ids || []),
      ...(request.external_personnel_ids || [])
    ];

    const duplicateIssues = [];
    for (const personId of personnelInRequest) {
      const otherActiveRequests = requests.filter(req => 
        req.id !== request.id &&
        activeTransferStatuses.includes(req.status) &&
        (req.technician_ids?.includes(personId) || req.external_personnel_ids?.includes(personId))
      );

      if (otherActiveRequests.length > 0) {
        const person = technicians.find(t => t.id === personId) || externalPersonnel.find(e => e.id === personId);
        for (const otherReq of otherActiveRequests) {
          const otherTarget = camps.find(c => c.id === otherReq.target_camp_id);
          duplicateIssues.push(`${person?.full_name} (${person?.employee_id || person?.company_name}) has active allocation to ${otherTarget?.name}`);
        }
      }
    }

    if (duplicateIssues.length > 0) {
      alert(`❌ Cannot dispatch - Duplicate allocations detected:\n\n${duplicateIssues.join('\n')}\n\nPlease cancel/complete the other transfer requests first.`);
      return;
    }

    const confirmDispatch = window.confirm(
      `Mark personnel as dispatched?\n\nThis will update their camp and reserve their beds at the target camp.\nPersonnel will be marked as "Pending Arrival" until confirmed by the receiving camp.`
    );

    if (!confirmDispatch) return;

    try {
      const allocatedBeds = request.allocated_beds_data ? JSON.parse(request.allocated_beds_data) : {};
      
      for (const techId of (request.technician_ids || [])) {
        const bedId = allocatedBeds[techId];
        await updateTechnicianMutation.mutateAsync({
          id: techId,
          data: {
            camp_id: request.target_camp_id,
            bed_id: bedId || null,
            status: 'pending_arrival'
          }
        });

        if (bedId) {
          await updateBedMutation.mutateAsync({
            id: bedId,
            data: {
              status: 'reserved',
              reserved_for: techId,
              technician_id: null
            }
          });
        }
      }

      for (const extId of (request.external_personnel_ids || [])) {
        const bedId = allocatedBeds[extId];
        await updateExternalMutation.mutateAsync({
          id: extId,
          data: {
            camp_id: request.target_camp_id,
            bed_id: bedId || null,
            status: 'pending_arrival'
          }
        });

        if (bedId) {
          await updateBedMutation.mutateAsync({
            id: bedId,
            data: {
              status: 'reserved',
              reserved_for: extId,
              external_personnel_id: null
            }
          });
        }
      }

      await updateRequestMutation.mutateAsync({
        id: request.id,
        data: {
          status: 'technicians_dispatched',
          dispatch_date: new Date().toISOString().split('T')[0],
          dispatched_by: currentUser?.id
        }
      });

      alert("Personnel dispatched successfully! They are now marked as 'Pending Arrival' at the target camp.");
    } catch (error) {
      alert(`Failed to dispatch: ${error.message}`);
    }
  };

  const getStatusInfo = (status) => {
    switch (status) {
      case 'pending_allocation':
        return { icon: Clock, color: 'bg-orange-600', text: 'Awaiting Bed Allocation' };
      case 'beds_allocated':
        return { icon: CheckCircle2, color: 'bg-green-600', text: 'Beds Allocated' };
      case 'approved_for_dispatch':
        return { icon: PackageCheck, color: 'bg-blue-600', text: 'Approved for Dispatch' };
      case 'allocation_rejected':
        return { icon: XCircle, color: 'bg-red-600', text: 'Request Rejected' };
      case 'technicians_dispatched':
        return { icon: Truck, color: 'bg-purple-600', text: 'Personnel Dispatched' };
      case 'completed':
        return { icon: CheckCircle2, color: 'bg-green-700', text: 'Transfer Completed' };
      default:
        return { icon: Clock, color: 'bg-gray-600', text: status };
    }
  };

  const getRequestPersonnel = (request) => {
    const techIds = request.technician_ids || [];
    const extIds = request.external_personnel_ids || [];
    
    return {
      technicians: technicians.filter(t => techIds.includes(t.id)),
      external: externalPersonnel.filter(e => extIds.includes(e.id)),
      total: techIds.length + extIds.length
    };
  };

  const getMealPreferenceName = (mealPrefId) => {
    const pref = mealPreferences.find(m => m.id === mealPrefId);
    return pref ? pref.name : 'Not Set';
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    try {
      return format(parseISO(dateStr), 'dd/MM/yyyy');
    } catch {
      return '-';
    }
  };

  const getPersonnelWithMealPrefs = (request) => {
    const personnel = getRequestPersonnel(request);
    const allPersonnel = [
      ...personnel.technicians.map(t => ({
        name: t.full_name,
        employeeId: t.employee_id,
        mealPref: getMealPreferenceName(t.meal_preference_id),
        type: 'technician'
      })),
      ...personnel.external.map(e => ({
        name: e.full_name,
        employeeId: e.company_name,
        mealPref: getMealPreferenceName(e.meal_preference_id),
        type: 'external'
      }))
    ];
    return allPersonnel;
  };

  // Available status options for the multi-select dropdown
  const availableStatuses = [
    'Awaiting Bed Allocation',
    'Beds Allocated',
    'Approved for Dispatch',
    'Personnel Dispatched',
    'Request Rejected',
    'Transfer Completed'
  ];

  // Apply global search and top-level filters first
  let searchFilteredRequests = myRequests;
  
  // Apply global search
  if (globalSearch.trim()) {
    const searchLower = globalSearch.toLowerCase().trim();
    searchFilteredRequests = searchFilteredRequests.filter(req => {
      const sourceCamp = camps.find(c => c.id === req.source_camp_id);
      const targetCamp = camps.find(c => c.id === req.target_camp_id);
      const personnelWithMealPrefs = getPersonnelWithMealPrefs(req);
      const statusInfo = getStatusInfo(req.status);
      const requestDate = formatDate(req.request_date);
      const scheduledDate = req.scheduled_dispatch_date ? `${formatDate(req.scheduled_dispatch_date)} ${req.scheduled_dispatch_time || ''}`.trim() : '-';
      const mealCouponsStatus = req.old_meal_coupons_collected ? 'Collected' : 'Not Collected';
      const reason = req.reason_for_movement ? req.reason_for_movement.replace(/_/g, ' ') : '-';

      const searchableFields = [
        requestDate,
        sourceCamp?.name || '',
        targetCamp?.name || '',
        reason,
        statusInfo.text,
        scheduledDate,
        mealCouponsStatus,
        ...personnelWithMealPrefs.map(p => p.name),
        ...personnelWithMealPrefs.map(p => p.employeeId),
        ...personnelWithMealPrefs.map(p => p.mealPref)
      ];

      return searchableFields.some(field => 
        String(field).toLowerCase().includes(searchLower)
      );
    });
  }

  // Apply top-level status filter (multi-select)
  if (filterStatusTop.length > 0) {
    searchFilteredRequests = searchFilteredRequests.filter(req => {
      const statusInfo = getStatusInfo(req.status);
      return filterStatusTop.includes(statusInfo.text);
    });
  }

  if (filterSourceCampTop !== 'all') {
    searchFilteredRequests = searchFilteredRequests.filter(req => req.source_camp_id === filterSourceCampTop);
  }

  if (filterTargetCampTop !== 'all') {
    searchFilteredRequests = searchFilteredRequests.filter(req => req.target_camp_id === filterTargetCampTop);
  }

  if (filterReasonTop !== 'all') {
    searchFilteredRequests = searchFilteredRequests.filter(req => {
      const reason = req.reason_for_movement ? req.reason_for_movement.replace(/_/g, ' ') : '-';
      return reason === filterReasonTop;
    });
  }

  // Apply column filters on top of global search results
  let filteredRequests = searchFilteredRequests.filter(req => {
    const sourceCamp = camps.find(c => c.id === req.source_camp_id);
    const targetCamp = camps.find(c => c.id === req.target_camp_id);
    const personnel = getRequestPersonnel(req);
    const personnelWithMealPrefs = getPersonnelWithMealPrefs(req);
    const statusInfo = getStatusInfo(req.status);
    const requestDate = formatDate(req.request_date);
    const scheduledDate = req.scheduled_dispatch_date ? `${formatDate(req.scheduled_dispatch_date)} ${req.scheduled_dispatch_time || ''}`.trim() : '-';
    const mealCouponsStatus = req.old_meal_coupons_collected ? 'Collected' : 'Not Collected';
    const reason = req.reason_for_movement ? req.reason_for_movement.replace(/_/g, ' ') : '-';

    if (filterRequestDate.length > 0 && !filterRequestDate.includes(requestDate)) return false;
    if (filterSourceCamp.length > 0 && !filterSourceCamp.includes(sourceCamp?.name || '-')) return false;
    if (filterTargetCamp.length > 0 && !filterTargetCamp.includes(targetCamp?.name || '-')) return false;
    if (filterReason.length > 0 && !filterReason.includes(reason)) return false;
    if (filterPersonnelCount.length > 0 && !filterPersonnelCount.includes(String(personnel.total))) return false;
    if (filterStatus.length > 0 && !filterStatus.includes(statusInfo.text)) return false;
    if (filterScheduledDate.length > 0 && !filterScheduledDate.includes(scheduledDate)) return false;
    if (filterMealCoupons.length > 0 && !filterMealCoupons.includes(mealCouponsStatus)) return false;

    if (filterPersonnelNames.length > 0) {
      const hasMatchingName = personnelWithMealPrefs.some(p => filterPersonnelNames.includes(p.name));
      if (!hasMatchingName) return false;
    }

    if (filterMealPrefs.length > 0) {
      const hasMatchingPref = personnelWithMealPrefs.some(p => filterMealPrefs.includes(p.mealPref));
      if (!hasMatchingPref) return false;
    }

    return true;
  });

  // Sort
  const sortedRequests = [...filteredRequests].sort((a, b) => {
    let aVal = a[sortField] || '';
    let bVal = b[sortField] || '';

    if (sortField === 'request_date' || sortField === 'scheduled_dispatch_date' || sortField === 'dispatch_date') {
      const dateA = aVal ? new Date(aVal) : new Date(0);
      const dateB = bVal ? new Date(bVal) : new Date(0);
      return sortDirection === 'asc' ? dateA.getTime() - dateB.getTime() : dateB.getTime() - dateA.getTime();
    }

    if (sortDirection === 'asc') {
      return String(aVal).localeCompare(String(bVal));
    } else {
      return String(bVal).localeCompare(String(aVal));
    }
  });

  // Get unique values for filters (based on searchFilteredRequests, not myRequests)
  const uniqueRequestDates = [...new Set(searchFilteredRequests.map(r => formatDate(r.request_date)))].sort();
  const uniqueSourceCamps = [...new Set(searchFilteredRequests.map(r => {
    const camp = camps.find(c => c.id === r.source_camp_id);
    return camp?.name || '-';
  }))].sort();
  const uniqueTargetCamps = [...new Set(searchFilteredRequests.map(r => {
    const camp = camps.find(c => c.id === r.target_camp_id);
    return camp?.name || '-';
  }))].sort();
  const uniqueReasons = [...new Set(searchFilteredRequests.map(r => r.reason_for_movement ? r.reason_for_movement.replace(/_/g, ' ') : '-'))].sort();
  const uniquePersonnelCounts = [...new Set(searchFilteredRequests.map(r => {
    const personnel = getRequestPersonnel(r);
    return String(personnel.total);
  }))].sort((a, b) => Number(a) - Number(b));
  const uniqueStatuses = [...new Set(searchFilteredRequests.map(r => getStatusInfo(r.status).text))].sort();
  const uniqueScheduledDates = [...new Set(searchFilteredRequests.map(r => 
    r.scheduled_dispatch_date ? `${formatDate(r.scheduled_dispatch_date)} ${r.scheduled_dispatch_time || ''}`.trim() : '-'
  ))].sort();
  const uniqueMealCoupons = ['Collected', 'Not Collected'];

  // New: Get unique personnel names and meal preferences across all requests
  const allPersonnelNames = [...new Set(
    searchFilteredRequests.flatMap(r => {
      const personnelWithMealPrefs = getPersonnelWithMealPrefs(r);
      return personnelWithMealPrefs.map(p => p.name);
    })
  )].sort();

  const allMealPrefs = [...new Set(
    searchFilteredRequests.flatMap(r => {
      const personnelWithMealPrefs = getPersonnelWithMealPrefs(r);
      return personnelWithMealPrefs.map(p => p.mealPref);
    })
  )].sort();

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const clearAllFilters = () => {
    setFilterRequestDate([]);
    setFilterSourceCamp([]);
    setFilterTargetCamp([]);
    setFilterReason([]);
    setFilterPersonnelCount([]);
    setFilterPersonnelNames([]);
    setFilterMealPrefs([]);
    setFilterStatus([]);
    setFilterScheduledDate([]);
    setFilterMealCoupons([]);
    setGlobalSearch("");
    setFilterStatusTop([]); // Changed to empty array
    setFilterSourceCampTop("all");
    setFilterTargetCampTop("all");
    setFilterReasonTop("all");
    setSearchStatusTop(""); // Clear search for status filter
  };

  const hasActiveFilters = filterRequestDate.length > 0 || filterSourceCamp.length > 0 ||
    filterTargetCamp.length > 0 || filterReason.length > 0 || filterPersonnelCount.length > 0 ||
    filterPersonnelNames.length > 0 || filterMealPrefs.length > 0 ||
    filterStatus.length > 0 || filterScheduledDate.length > 0 || filterMealCoupons.length > 0 ||
    globalSearch.trim() !== "" || filterStatusTop.length > 0 || filterSourceCampTop !== "all" || // Changed condition
    filterTargetCampTop !== "all" || filterReasonTop !== "all";

  const ColumnFilter = ({ values, selected, setSelected, searchValue, setSearchValue }) => {
    const filteredValues = values.filter(v =>
      v.toLowerCase().includes(searchValue.toLowerCase())
    );

    const toggleValue = (value) => {
      if (selected.includes(value)) {
        setSelected(selected.filter(v => v !== value));
      } else {
        setSelected([...selected, value]);
      }
    };

    const toggleAll = () => {
      if (selected.length === values.length && values.length > 0) {
        setSelected([]);
      } else {
        setSelected([...values]);
      }
    };

    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 px-2">
            <Filter className={`w-3 h-3 ${selected.length > 0 ? 'text-blue-600' : 'text-gray-400'}`} />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-0" align="start">
          <div className="p-2 border-b bg-gray-50">
            <Input
              placeholder="Search..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              className="h-8 text-sm"
              autoFocus
            />
          </div>
          <div className="max-h-64 overflow-y-auto p-2">
            {values.length > 0 && (
              <div className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded cursor-pointer" onClick={toggleAll}>
                <Checkbox
                  checked={selected.length === values.length && values.length > 0}
                  onCheckedChange={toggleAll}
                />
                <label className="text-sm font-medium cursor-pointer">
                  (Select All)
                </label>
              </div>
            )}
            {filteredValues.length === 0 ? (
              <div className="text-center text-sm text-gray-500 py-4">
                No results found
              </div>
            ) : (
              filteredValues.map((value) => (
                <div
                  key={value}
                  className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
                  onClick={() => toggleValue(value)}
                >
                  <Checkbox
                    checked={selected.includes(value)}
                    onCheckedChange={() => toggleValue(value)}
                  />
                  <label className="text-sm cursor-pointer flex-1">
                    {value}
                  </label>
                </div>
              ))
            )}
          </div>
          {selected.length > 0 && (
            <div className="p-2 border-t bg-gray-50">
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs"
                onClick={() => setSelected([])}
              >
                Clear Filter ({selected.length})
              </Button>
            </div>
          )}
        </PopoverContent>
      </Popover>
    );
  };

  // Helper functions for Status Multi-Select
  const toggleStatusFilter = (status) => {
    if (filterStatusTop.includes(status)) {
      setFilterStatusTop(filterStatusTop.filter(s => s !== status));
    } else {
      setFilterStatusTop([...filterStatusTop, status]);
    }
  };

  const toggleAllStatuses = () => {
    if (filterStatusTop.length === availableStatuses.length) {
      setFilterStatusTop([]);
    } else {
      setFilterStatusTop([...availableStatuses]);
    }
  };

  const filteredStatusOptions = availableStatuses.filter(s =>
    s.toLowerCase().includes(searchStatusTop.toLowerCase())
  );

  return (
    <div className="p-6 md:p-8 bg-gradient-to-br from-gray-50 to-blue-50 min-h-screen">
      <div className="max-w-[1800px] mx-auto space-y-6">
        <Alert className="border-blue-200 bg-blue-50">
          <AlertCircle className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-900 text-sm">
            <strong>📍 Step 2 of 4: Review & Dispatch Transfers (Source Camp)</strong><br/>
            View your requests → Target camp allocates beds → CPO Office approves (onboarding) → Dispatch personnel → Next: Confirm Arrivals (target camp)
          </AlertDescription>
        </Alert>

        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Transfer Requests</h1>
          <p className="text-gray-600 mt-1">{sortedRequests.length} of {myRequests.length} requests</p>
        </div>

        {/* Compact Filter Bar */}
        <Card className="border-none shadow-md">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-3">
              {/* Search Input - Adjusted width */}
              <div className="flex-1 md:max-w-md relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search requests..."
                  value={globalSearch}
                  onChange={(e) => setGlobalSearch(e.target.value)}
                  className="pl-10 pr-10 h-10"
                />
                {globalSearch && (
                  <button
                    onClick={() => setGlobalSearch("")}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Status Multi-Select Dropdown */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full md:w-44 h-10 justify-between">
                    <span className="truncate">
                      {filterStatusTop.length === 0 ? 'All Statuses' : 
                       filterStatusTop.length === 1 ? filterStatusTop[0] : 
                       `${filterStatusTop.length} statuses`}
                    </span>
                    <Filter className={`w-4 h-4 ml-2 ${filterStatusTop.length > 0 ? 'text-blue-600' : ''}`} />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-72 p-0" align="start">
                  <div className="p-2 border-b bg-gray-50">
                    <Input
                      placeholder="Search statuses..."
                      value={searchStatusTop}
                      onChange={(e) => setSearchStatusTop(e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="max-h-64 overflow-y-auto p-2">
                    <div className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded cursor-pointer" onClick={toggleAllStatuses}>
                      <Checkbox
                        checked={filterStatusTop.length === availableStatuses.length && availableStatuses.length > 0}
                        onCheckedChange={toggleAllStatuses}
                      />
                      <label className="text-sm font-medium cursor-pointer">
                        (Select All)
                      </label>
                    </div>
                    {filteredStatusOptions.length === 0 ? (
                      <div className="text-center text-sm text-gray-500 py-4">
                        No results found
                      </div>
                    ) : (
                      filteredStatusOptions.map((status) => (
                        <div
                          key={status}
                          className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
                          onClick={() => toggleStatusFilter(status)}
                        >
                          <Checkbox
                            checked={filterStatusTop.includes(status)}
                            onCheckedChange={() => toggleStatusFilter(status)}
                          />
                          <label className="text-sm cursor-pointer flex-1">
                            {status}
                          </label>
                        </div>
                      ))
                    )}
                  </div>
                  {filterStatusTop.length > 0 && (
                    <div className="p-2 border-t bg-gray-50">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full text-xs"
                        onClick={() => setFilterStatusTop([])}
                      >
                        Clear ({filterStatusTop.length})
                      </Button>
                    </div>
                  )}
                </PopoverContent>
              </Popover>

              {/* Source Camp Dropdown */}
              <Select value={filterSourceCampTop} onValueChange={setFilterSourceCampTop}>
                <SelectTrigger className="w-full md:w-40 h-10">
                  <SelectValue placeholder="All Source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Source Camps</SelectItem>
                  {camps.map(camp => (
                    <SelectItem key={camp.id} value={camp.id}>{camp.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Target Camp Dropdown */}
              <Select value={filterTargetCampTop} onValueChange={setFilterTargetCampTop}>
                <SelectTrigger className="w-full md:w-40 h-10">
                  <SelectValue placeholder="All Target" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Target Camps</SelectItem>
                  {camps.map(camp => (
                    <SelectItem key={camp.id} value={camp.id}>{camp.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Reason Dropdown */}
              <Select value={filterReasonTop} onValueChange={setFilterReasonTop}>
                <SelectTrigger className="w-full md:w-44 h-10">
                  <SelectValue placeholder="All Reasons" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Reasons</SelectItem>
                  <SelectItem value="onboarding transfer">Onboarding Transfer</SelectItem>
                  <SelectItem value="project transfer">Project Transfer</SelectItem>
                  <SelectItem value="roommate issue">Roommate Issue</SelectItem>
                  <SelectItem value="camp environment">Camp Environment</SelectItem>
                  <SelectItem value="urgent requirement">Urgent Requirement</SelectItem>
                  <SelectItem value="camp closure">Camp Closure</SelectItem>
                  <SelectItem value="skill requirement">Skill Requirement</SelectItem>
                  <SelectItem value="personal request">Personal Request</SelectItem>
                  <SelectItem value="disciplinary">Disciplinary</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Active Filters Indicator */}
            {hasActiveFilters && (
              <div className="mt-3 flex items-center justify-between">
                <div className="flex flex-wrap gap-2 items-center">
                  {globalSearch && (
                    <Badge variant="outline" className="bg-blue-50 text-blue-700">
                      Search: "{globalSearch}"
                    </Badge>
                  )}
                  {filterStatusTop.length > 0 && (
                    <Badge variant="outline" className="bg-blue-50 text-blue-700">
                      Status: {filterStatusTop.length} selected
                    </Badge>
                  )}
                  {filterSourceCampTop !== 'all' && (
                    <Badge variant="outline" className="bg-blue-50 text-blue-700">
                      Source Camp: {camps.find(c => c.id === filterSourceCampTop)?.name || filterSourceCampTop}
                    </Badge>
                  )}
                  {filterTargetCampTop !== 'all' && (
                    <Badge variant="outline" className="bg-blue-50 text-blue-700">
                      Target Camp: {camps.find(c => c.id === filterTargetCampTop)?.name || filterTargetCampTop}
                    </Badge>
                  )}
                  {filterReasonTop !== 'all' && (
                    <Badge variant="outline" className="bg-blue-50 text-blue-700">
                      Reason: {filterReasonTop.replace(/_/g, ' ')}
                    </Badge>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAllFilters}
                  className="text-xs text-blue-700 hover:text-blue-900 hover:bg-blue-50 h-7"
                >
                  <X className="w-3 h-3 mr-1" />
                  Clear All
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="border-none shadow-lg overflow-hidden">
            <div className="h-2 bg-gradient-to-r from-orange-400 to-orange-600"></div>
            <CardContent className="p-5 bg-gradient-to-br from-orange-100 to-orange-50">
              <div className="flex items-center justify-between mb-2">
                <Clock className="w-10 h-10 text-orange-600" />
                <div className="text-right">
                  <p className="text-3xl font-bold text-orange-900">
                    {myRequests.filter(r => r.status === 'pending_allocation').length}
                  </p>
                </div>
              </div>
              <p className="text-xs font-semibold text-orange-700 uppercase tracking-wide">Pending</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg overflow-hidden">
            <div className="h-2 bg-gradient-to-r from-green-400 to-green-600"></div>
            <CardContent className="p-5 bg-gradient-to-br from-green-100 to-green-50">
              <div className="flex items-center justify-between mb-2">
                <CheckCircle2 className="w-10 h-10 text-green-600" />
                <div className="text-right">
                  <p className="text-3xl font-bold text-green-900">
                    {myRequests.filter(r => r.status === 'beds_allocated').length}
                  </p>
                </div>
              </div>
              <p className="text-xs font-semibold text-green-700 uppercase tracking-wide">Beds Allocated</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg overflow-hidden">
            <div className="h-2 bg-gradient-to-r from-blue-400 to-blue-600"></div>
            <CardContent className="p-5 bg-gradient-to-br from-blue-100 to-blue-50">
              <div className="flex items-center justify-between mb-2">
                <PackageCheck className="w-10 h-10 text-blue-600" />
                <div className="text-right">
                  <p className="text-3xl font-bold text-blue-900">
                    {myRequests.filter(r => r.status === 'approved_for_dispatch').length}
                  </p>
                </div>
              </div>
              <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Approved</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg overflow-hidden">
            <div className="h-2 bg-gradient-to-r from-purple-400 to-purple-600"></div>
            <CardContent className="p-5 bg-gradient-to-br from-purple-100 to-purple-50">
              <div className="flex items-center justify-between mb-2">
                <Truck className="w-10 h-10 text-purple-600" />
                <div className="text-right">
                  <p className="text-3xl font-bold text-purple-900">
                    {myRequests.filter(r => r.status === 'technicians_dispatched').length}
                  </p>
                </div>
              </div>
              <p className="text-xs font-semibold text-purple-700 uppercase tracking-wide">Dispatched</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg overflow-hidden">
            <div className="h-2 bg-gradient-to-r from-red-400 to-red-600"></div>
            <CardContent className="p-5 bg-gradient-to-br from-red-100 to-red-50">
              <div className="flex items-center justify-between mb-2">
                <XCircle className="w-10 h-10 text-red-600" />
                <div className="text-right">
                  <p className="text-3xl font-bold text-red-900">
                    {myRequests.filter(r => r.status === 'allocation_rejected').length}
                  </p>
                </div>
              </div>
              <p className="text-xs font-semibold text-red-700 uppercase tracking-wide">Rejected</p>
            </CardContent>
          </Card>
        </div>

        {/* Table */}
        <Card className="border-none shadow-lg overflow-hidden">
          {hasActiveFilters && (
            <div className="bg-blue-50 border-b border-blue-200 px-6 py-3">
              <div className="flex items-center justify-between">
                <p className="text-sm text-blue-700 font-medium">
                  <Filter className="w-4 h-4 inline mr-2" />
                  {globalSearch ? 'Global search + filters active' : 'Filters active'}
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAllFilters}
                  className="text-blue-700 hover:text-blue-900 hover:bg-blue-100"
                >
                  <X className="w-4 h-4 mr-1" />
                  Clear All Filters
                </Button>
              </div>
            </div>
          )}

          <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100 border-b">
            <CardTitle>Transfer Requests ({sortedRequests.length})</CardTitle>
          </CardHeader>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse bg-white">
              <thead>
                <tr className="border-b-2 border-gray-300">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                    Actions
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                    <div className="flex items-center justify-between gap-2">
                      <span>Request Date</span>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => handleSort('request_date')}>
                          <ArrowUpDown className="w-3 h-3" />
                        </Button>
                        <ColumnFilter
                          values={uniqueRequestDates}
                          selected={filterRequestDate}
                          setSelected={setFilterRequestDate}
                          searchValue={searchRequestDate}
                          setSearchValue={setSearchRequestDate}
                        />
                      </div>
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                    <div className="flex items-center justify-between gap-2">
                      <span>Source Camp</span>
                      <ColumnFilter
                        values={uniqueSourceCamps}
                        selected={filterSourceCamp}
                        setSelected={setFilterSourceCamp}
                        searchValue={searchSourceCamp}
                        setSearchValue={setSearchSourceCamp}
                      />
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                    <div className="flex items-center justify-between gap-2">
                      <span>Target Camp</span>
                      <ColumnFilter
                        values={uniqueTargetCamps}
                        selected={filterTargetCamp}
                        setSelected={setFilterTargetCamp}
                        searchValue={searchTargetCamp}
                        setSearchValue={setSearchTargetCamp}
                      />
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                    <div className="flex items-center justify-between gap-2">
                      <span>Reason</span>
                      <ColumnFilter
                        values={uniqueReasons}
                        selected={filterReason}
                        setSelected={setFilterReason}
                        searchValue={searchReason}
                        setSearchValue={setSearchReason}
                      />
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                    <div className="flex items-center justify-between gap-2">
                      <span>Count</span>
                      <ColumnFilter
                        values={uniquePersonnelCounts}
                        selected={filterPersonnelCount}
                        setSelected={setFilterPersonnelCount}
                        searchValue={searchPersonnelCount}
                        setSearchValue={setSearchPersonnelCount}
                      />
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                    <div className="flex items-center justify-between gap-2">
                      <span>Personnel</span>
                      <ColumnFilter
                        values={allPersonnelNames}
                        selected={filterPersonnelNames}
                        setSelected={setFilterPersonnelNames}
                        searchValue={searchPersonnelNames}
                        setSearchValue={setSearchPersonnelNames}
                      />
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                    <div className="flex items-center justify-between gap-2">
                      <span>Meal Preferences</span>
                      <ColumnFilter
                        values={allMealPrefs}
                        selected={filterMealPrefs}
                        setSelected={setFilterMealPrefs}
                        searchValue={searchMealPrefs}
                        setSearchValue={setSearchMealPrefs}
                      />
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                    <div className="flex items-center justify-between gap-2">
                      <span>Status</span>
                      <ColumnFilter
                        values={uniqueStatuses}
                        selected={filterStatus}
                        setSelected={setFilterStatus}
                        searchValue={searchStatus}
                        setSearchValue={setSearchStatus}
                      />
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                    <div className="flex items-center justify-between gap-2">
                      <span>Scheduled Dispatch</span>
                      <ColumnFilter
                        values={uniqueScheduledDates}
                        selected={filterScheduledDate}
                        setSelected={setFilterScheduledDate}
                        searchValue={searchScheduledDate}
                        setSearchValue={setSearchScheduledDate}
                      />
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                    <div className="flex items-center justify-between gap-2">
                      <span>Meal Coupons</span>
                      <ColumnFilter
                        values={uniqueMealCoupons}
                        selected={filterMealCoupons}
                        setSelected={setFilterMealCoupons}
                        searchValue={searchMealCoupons}
                        setSearchValue={setSearchMealCoupons}
                      />
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {permissionsLoading ? (
                  <tr>
                    <td colSpan="11" className="px-4 py-12 text-center text-gray-500">
                      <Clock className="w-16 h-16 text-gray-300 mx-auto mb-4 animate-spin" />
                      <h3 className="text-xl font-bold text-gray-900 mb-2">Loading permissions...</h3>
                      <p className="text-gray-600">Please wait</p>
                    </td>
                  </tr>
                ) : sortedRequests.length === 0 ? (
                  <tr>
                    <td colSpan="11" className="px-4 py-12 text-center text-gray-500">
                      <Send className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-xl font-bold text-gray-900 mb-2">No Transfer Requests</h3>
                      <p className="text-gray-600">
                        {hasActiveFilters 
                          ? 'No requests match your search/filter criteria'
                          : "You haven't created any transfer requests yet"}
                      </p>
                    </td>
                  </tr>
                ) : (
                  sortedRequests.map((request, index) => {
                    const personnel = getRequestPersonnel(request);
                    const personnelWithMealPrefs = getPersonnelWithMealPrefs(request);
                    const sourceCamp = camps.find(c => c.id === request.source_camp_id);
                    const targetCamp = camps.find(c => c.id === request.target_camp_id);
                    const statusInfo = getStatusInfo(request.status);
                    const StatusIcon = statusInfo.icon;

                    // Check if this is a Sajja onboarding transfer (no CPO approval needed)
                    const isSajjaOnboardingTransfer = 
                      sourceCamp?.camp_type === 'induction_camp' && 
                      (targetCamp?.camp_type === 'regular_camp' || targetCamp?.camp_type === 'exit_camp') &&
                      request.reason_for_movement === 'onboarding_transfer';

                    const displayedPersonnel = personnelWithMealPrefs.slice(0, 2);
                    const remainingCount = personnelWithMealPrefs.length - 2;

                    // Can collect coupons when beds are allocated, approved, or dispatched
                    const canCollectCoupons = request.status === 'beds_allocated' || request.status === 'approved_for_dispatch' || request.status === 'technicians_dispatched';

                    return (
                      <tr
                        key={request.id}
                        className={`border-b border-gray-200 hover:bg-blue-50 transition-colors ${
                          index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                        }`}
                      >
                        <td className="px-4 py-3 text-sm border-r border-gray-200 whitespace-nowrap">
                          {currentUser?.role === 'admin' ? (
                            // Admin sees all buttons
                            <>
                              {request.status === 'beds_allocated' && !isSajjaOnboardingTransfer && (
                                <div className="flex gap-2">
                                  <Button
                                    onClick={() => handleApproveForDispatch(request)}
                                    size="sm"
                                    className="bg-gradient-to-r from-green-600 to-emerald-600"
                                  >
                                    <CheckCircle2 className="w-4 h-4 mr-1" />
                                    Approve
                                  </Button>
                                  <Button
                                    onClick={() => {
                                      setRejectingRequest(request);
                                      setRejectDialog(true);
                                    }}
                                    size="sm"
                                    variant="destructive"
                                  >
                                    <XCircle className="w-4 h-4 mr-1" />
                                    Reject
                                  </Button>
                                </div>
                              )}
                              {(request.status === 'approved_for_dispatch' || 
                                (request.status === 'beds_allocated' && isSajjaOnboardingTransfer)) && (
                                <Button
                                  onClick={() => handleDispatch(request)}
                                  size="sm"
                                  className="bg-gradient-to-r from-blue-600 to-purple-600"
                                >
                                  <Truck className="w-4 h-4 mr-1" />
                                  Dispatch
                                </Button>
                              )}
                            </>
                          ) : (
                            // Role-based buttons for non-admin users
                            <>
                              {/* Approve/Reject buttons: For 10.CPO Office role, but NOT for Sajja onboarding transfers */}
                              {request.status === 'beds_allocated' && 
                               hasRoleName('10.CPO Office') && 
                               !isSajjaOnboardingTransfer && (
                                <div className="flex gap-2">
                                  <Button
                                    onClick={() => handleApproveForDispatch(request)}
                                    size="sm"
                                    className="bg-gradient-to-r from-green-600 to-emerald-600"
                                  >
                                    <CheckCircle2 className="w-4 h-4 mr-1" />
                                    Approve
                                  </Button>
                                  <Button
                                    onClick={() => {
                                      setRejectingRequest(request);
                                      setRejectDialog(true);
                                    }}
                                    size="sm"
                                    variant="destructive"
                                  >
                                    <XCircle className="w-4 h-4 mr-1" />
                                    Reject
                                  </Button>
                                </div>
                              )}

                              {/* Dispatch button: For 02.Onboarding Team OR 05.TR Team roles */}
                              {(request.status === 'approved_for_dispatch' || 
                                (request.status === 'beds_allocated' && isSajjaOnboardingTransfer)) && 
                               (hasRoleName('02.Onboarding Team') || hasRoleName('05.TR Team')) && (
                                <Button
                                  onClick={() => handleDispatch(request)}
                                  size="sm"
                                  className="bg-gradient-to-r from-blue-600 to-purple-600"
                                >
                                  <Truck className="w-4 h-4 mr-1" />
                                  Dispatch
                                </Button>
                              )}
                            </>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 border-r border-gray-200 whitespace-nowrap">
                          {formatDate(request.request_date)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 border-r border-gray-200 whitespace-nowrap">
                          {sourceCamp?.name || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 border-r border-gray-200 whitespace-nowrap">
                          {targetCamp?.name || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 border-r border-gray-200">
                          {request.reason_for_movement ? request.reason_for_movement.replace(/_/g, ' ') : '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 border-r border-gray-200 text-center font-medium">
                          {personnel.total}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 border-r border-gray-200">
                          {personnelWithMealPrefs.length === 0 ? (
                            <span className="text-gray-400">-</span>
                          ) : personnelWithMealPrefs.length <= 2 ? (
                            <div className="space-y-1">
                              {personnelWithMealPrefs.map((person, idx) => (
                                <div key={idx}>
                                  {person.name} ({person.employeeId})
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div>
                              <div className="space-y-1">
                                {displayedPersonnel.map((person, idx) => (
                                  <div key={idx}>
                                    {person.name} ({person.employeeId})
                                  </div>
                                ))}
                              </div>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <button className="text-blue-600 hover:text-blue-800 text-xs font-medium mt-1 hover:underline">
                                    and {remainingCount} more...
                                  </button>
                                </PopoverTrigger>
                                <PopoverContent className="w-80 max-h-96 overflow-y-auto" align="start">
                                  <div className="space-y-1">
                                    <p className="font-semibold text-sm mb-2 text-gray-700">All Personnel ({personnelWithMealPrefs.length})</p>
                                    {personnelWithMealPrefs.map((person, idx) => (
                                      <div key={idx} className="text-sm py-1 border-b border-gray-100 last:border-0">
                                        <span className="font-medium">{person.name}</span>
                                        <span className="text-gray-500"> ({person.employeeId})</span>
                                      </div>
                                    ))}
                                  </div>
                                </PopoverContent>
                              </Popover>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 border-r border-gray-200">
                          {personnelWithMealPrefs.length === 0 ? (
                            <span className="text-gray-400">-</span>
                          ) : personnelWithMealPrefs.length <= 2 ? (
                            <div className="space-y-1">
                              {personnelWithMealPrefs.map((person, idx) => (
                                <div key={idx}>
                                  {person.mealPref}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div>
                              <div className="space-y-1">
                                {displayedPersonnel.map((person, idx) => (
                                  <div key={idx}>
                                    {person.mealPref}
                                  </div>
                                ))}
                              </div>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <button className="text-blue-600 hover:text-blue-800 text-xs font-medium mt-1 hover:underline">
                                    and {remainingCount} more...
                                  </button>
                                </PopoverTrigger>
                                <PopoverContent className="w-80 max-h-96 overflow-y-auto" align="start">
                                  <div className="space-y-1">
                                    <p className="font-semibold text-sm mb-2 text-gray-700">All Meal Preferences ({personnelWithMealPrefs.length})</p>
                                    {personnelWithMealPrefs.map((person, idx) => (
                                      <div key={idx} className="text-sm py-1 border-b border-gray-100 last:border-0">
                                        <span className="font-medium">{person.name}</span>
                                        <span className="text-gray-500"> - {person.mealPref}</span>
                                      </div>
                                    ))}
                                  </div>
                                </PopoverContent>
                              </Popover>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm border-r border-gray-200 whitespace-nowrap">
                          <Badge className={statusInfo.color}>
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {statusInfo.text}
                          </Badge>
                          {request.status === 'allocation_rejected' && (
                            <div className="mt-2 space-y-1">
                              {request.rejection_reason && (
                                <div className="text-xs text-red-600">
                                  <span className="font-semibold">Reason:</span> {request.rejection_reason}
                                </div>
                              )}
                              {request.rejected_by && (
                                <div className="text-xs text-gray-600">
                                  <span className="font-semibold">Rejected by:</span> {request.rejected_by}
                                </div>
                              )}
                              {request.rejected_date && (
                                <div className="text-xs text-gray-600">
                                  <span className="font-semibold">Date:</span> {formatDate(request.rejected_date)}
                                </div>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 border-r border-gray-200 whitespace-nowrap">
                          {request.scheduled_dispatch_date ? (
                            <div>
                              <div>{formatDate(request.scheduled_dispatch_date)}</div>
                              <div className="text-xs text-gray-500">{request.scheduled_dispatch_time || '-'}</div>
                            </div>
                          ) : '-'}
                        </td>
                        <td className="px-4 py-3 text-sm border-r border-gray-200 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            {request.old_meal_coupons_collected ? (
                              <Badge className="bg-green-100 text-green-700">
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                Collected
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-red-100 text-red-700 border-red-300">
                                <AlertCircle className="w-3 h-3 mr-1" />
                                Not Collected
                              </Badge>
                            )}
                            {canCollectCoupons && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleMealCouponsCollected(request)}
                                className="h-7 px-2 text-xs"
                                title={request.old_meal_coupons_collected ? "Mark as Not Collected" : "Mark as Collected"}
                              >
                                <Utensils className="w-3 h-3" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              Showing <span className="font-semibold">{sortedRequests.length}</span> of <span className="font-semibold">{myRequests.length}</span> requests
            </p>
          </div>
        </Card>
      </div>

      {/* Rejection Dialog */}
      <Dialog open={rejectDialog} onOpenChange={setRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Transfer Request</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Reason for Rejection*</Label>
              <Textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Please provide a clear reason for rejecting this transfer request..."
                rows={4}
                className="mt-2"
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setRejectDialog(false);
                  setRejectingRequest(null);
                  setRejectionReason("");
                }}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleRejectTransfer}
              >
                Reject Transfer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}