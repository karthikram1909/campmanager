import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowRight, Send, Users, Building2, AlertCircle, Calendar, Clock, User, Search, X, Filter, ArrowUpDown } from "lucide-react";
import { format, addDays, startOfDay } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export default function InitiateTransfer() {
  const [personnelType, setPersonnelType] = useState("technician");
  const [sourceCampId, setSourceCampId] = useState("");
  const [targetCampId, setTargetCampId] = useState("");
  const [selectedPersonnelIds, setSelectedPersonnelIds] = useState([]);
  const [reasonForMovement, setReasonForMovement] = useState("");
  const [selectedTransferSlot, setSelectedTransferSlot] = useState("");
  const [flexibleTransferDate, setFlexibleTransferDate] = useState("");
  const [flexibleTransferTime, setFlexibleTransferTime] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [slotSearchQuery, setSlotSearchQuery] = useState("");

  // Table filters and sorting
  const [sortField, setSortField] = useState("employee_id");
  const [sortDirection, setSortDirection] = useState("asc");
  const [personnelSearchQuery, setPersonnelSearchQuery] = useState("");

  // Column filters
  const [filterEmployeeId, setFilterEmployeeId] = useState([]);
  const [filterFullName, setFilterFullName] = useState([]);
  const [filterNationality, setFilterNationality] = useState([]);
  const [filterTrade, setFilterTrade] = useState([]);
  const [filterDepartment, setFilterDepartment] = useState([]);
  const [filterMealPref, setFilterMealPref] = useState([]);

  // Column filter search
  const [searchEmployeeId, setSearchEmployeeId] = useState("");
  const [searchFullName, setSearchFullName] = useState("");
  const [searchNationality, setSearchNationality] = useState("");
  const [searchTrade, setSearchTrade] = useState("");
  const [searchDepartment, setSearchDepartment] = useState("");
  const [searchMealPref, setSearchMealPref] = useState("");

  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: async () => {
      try {
        return await base44.auth.me();
      } catch (error) {
        // No login required mode - return null
        return null;
      }
    },
  });

  const { data: allCamps = [] } = useQuery({
    queryKey: ['camps'],
    queryFn: () => base44.entities.Camp.list(),
  });

  // Filter source camps based on user's camp assignment
  const sourceCamps = React.useMemo(() => {
    if (!currentUser) return allCamps;
    if (currentUser.role === 'admin') return allCamps; // Admin sees all camps
    if (!currentUser.camp_id) return allCamps; // If no camp assigned, show all

    // Non-admin users only see their assigned camp as source
    return allCamps.filter(c => c.id === currentUser.camp_id);
  }, [allCamps, currentUser]);

  const { data: technicians = [] } = useQuery({
    queryKey: ['technicians'],
    queryFn: () => base44.entities.Technician.list(),
  });

  const { data: externalPersonnel = [] } = useQuery({
    queryKey: ['external-personnel'],
    queryFn: () => base44.entities.ExternalPersonnel.list(),
  });

  const { data: mealPreferences = [] } = useQuery({
    queryKey: ['meal-preferences'],
    queryFn: () => base44.entities.MealPreference.list(),
  });

  const { data: schedulePolices = [] } = useQuery({
    queryKey: ['schedule-policies'],
    queryFn: () => base44.entities.TransferSchedulePolicy.list(),
  });

  const { data: disciplinaryActions = [] } = useQuery({
    queryKey: ['disciplinary-actions'],
    queryFn: () => base44.entities.DisciplinaryAction.list(),
  });

  const { data: allTransferRequests = [] } = useQuery({
    queryKey: ['all-transfer-requests'],
    queryFn: () => base44.entities.TransferRequest.list(),
  });

  // Find Sajja camp
  const sajjaCamp = allCamps.find(c => c.code?.toLowerCase() === 'sajja' || c.name?.toLowerCase().includes('sajja'));

  const createTransferRequestMutation = useMutation({
    mutationFn: (data) => base44.entities.TransferRequest.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transfer-requests'] });
    }
  });

  // Determine active schedule policy based on current date
  const getActiveSchedulePolicy = () => {
    const today = new Date();
    const currentMonthDay = format(today, 'MM-dd');

    const activePolicy = schedulePolices.find(policy => {
      if (!policy.is_active) return false;

      const startDate = policy.start_date.substring(5); // Get MM-DD
      const endDate = policy.end_date.substring(5); // Get MM-DD

      // Handle year wrap-around (e.g., winter: Dec to Feb)
      if (startDate <= endDate) {
        return currentMonthDay >= startDate && currentMonthDay <= endDate;
      } else {
        return currentMonthDay >= startDate || currentMonthDay <= endDate;
      }
    });

    // Default fallback if no policy is active
    return activePolicy || {
      season_name: "Default",
      allowed_days: ["Tuesday", "Sunday"],
      allowed_time_slots: ["14:30", "15:00", "15:30", "16:00", "16:30", "17:00", "17:30", "18:00", "18:30"]
    };
  };

  const activePolicy = getActiveSchedulePolicy();

  // Generate upcoming transfer slots based on active policy
  const generateTransferSlots = () => {
    const slots = [];
    const timeSlots = activePolicy.allowed_time_slots || ["14:30", "15:00", "15:30", "16:00", "16:30", "17:00", "17:30", "18:00", "18:30"];
    const allowedDays = activePolicy.allowed_days || ["Tuesday", "Sunday"];

    // Map day names to day numbers
    const dayNameToNumber = {
      "Sunday": 0,
      "Monday": 1,
      "Tuesday": 2,
      "Wednesday": 3,
      "Thursday": 4,
      "Friday": 5,
      "Saturday": 6
    };

    const allowedDayNumbers = allowedDays.map(day => dayNameToNumber[day]);
    const today = startOfDay(new Date());

    for (let i = 0; i < 42; i++) {
      const date = addDays(today, i);
      const dayOfWeek = date.getDay();

      if (allowedDayNumbers.includes(dayOfWeek)) {
        timeSlots.forEach(time => {
          const dayName = Object.keys(dayNameToNumber).find(key => dayNameToNumber[key] === dayOfWeek);
          slots.push({
            date: format(date, 'yyyy-MM-dd'),
            time: time,
            displayDate: format(date, 'EEE, dd/MMM/yyyy'),
            dayName: dayName,
            value: `${format(date, 'yyyy-MM-dd')}|${time}`,
            searchText: `${dayName} ${format(date, 'dd/MMM/yyyy')} ${time}`.toLowerCase()
          });
        });
      }
    }

    return slots;
  };

  const transferSlots = generateTransferSlots();
  const filteredTransferSlots = transferSlots.filter(slot =>
    slot.searchText.includes(slotSearchQuery.toLowerCase())
  );

  const getMealPreferenceName = (mealPrefId) => {
    const pref = mealPreferences.find(m => m.id === mealPrefId);
    return pref ? pref.name : '-';
  };

  // Filter available personnel based on transfer reason


  const availablePersonnel = personnelType === 'technician'
    ? technicians.filter(t => {
      // Must be in source camp
      if (t.camp_id !== sourceCampId) return false;

      // Exclude if already part of an active transfer request
      const isInActiveTransfer = allTransferRequests.some(req => {
        const activeStatuses = ['pending_allocation', 'beds_allocated', 'approved_for_dispatch', 'technicians_dispatched', 'partially_arrived'];
        return activeStatuses.includes(req.status) && req.technician_ids?.includes(t.id);
      });
      if (isInActiveTransfer) return false;

      // Exclude technicians in pre-induction without beds (must complete bed allocation first)
      if (t.induction_status === 'pre_induction' && !t.bed_id) return false;

      // Exclude technicians in Sajja pre-induction who haven't completed induction
      if (sajjaCamp && t.camp_id === sajjaCamp.id && t.induction_status === 'pre_induction' && !t.induction_completion_date) {
        return false;
      }

      // For exit case transfers, only show terminated/absconded technicians OR those with resignation/termination actions
      if (reasonForMovement === 'exit_case') {
        const hasTerminatedStatus = t.status === 'terminated' || t.status === 'absconded';
        const hasResignation = disciplinaryActions.some(
          action => action.technician_id === t.id && action.action_type === 'resignation'
        );
        const hasTermination = disciplinaryActions.some(
          action => action.technician_id === t.id && action.action_type === 'termination'
        );

        return hasTerminatedStatus || hasResignation || hasTermination;
      }

      // For all other transfer reasons, only show active technicians
      return t.status === 'active';
    })
    : externalPersonnel.filter(e => {
      if (e.camp_id !== sourceCampId) return false;

      // Exclude if already part of an active transfer request
      const isInActiveTransfer = allTransferRequests.some(req => {
        const activeStatuses = ['pending_allocation', 'beds_allocated', 'approved_for_dispatch', 'technicians_dispatched', 'partially_arrived'];
        return activeStatuses.includes(req.status) && req.external_personnel_ids?.includes(e.id);
      });
      if (isInActiveTransfer) return false;

      return e.status === 'active';
    });

  // Apply search and filters
  let filteredPersonnel = availablePersonnel.filter(person => {
    const matchesSearch = !personnelSearchQuery ||
      person.full_name?.toLowerCase().includes(personnelSearchQuery.toLowerCase()) ||
      (personnelType === 'technician' ? person.employee_id : person.company_name)?.toLowerCase().includes(personnelSearchQuery.toLowerCase());

    if (!matchesSearch) return false;

    const employeeIdOrCompany = personnelType === 'technician' ? person.employee_id : person.company_name;
    const tradeOrRole = personnelType === 'technician' ? person.trade : person.role;
    const mealPrefName = getMealPreferenceName(person.meal_preference_id);

    if (filterEmployeeId.length > 0 && !filterEmployeeId.includes(employeeIdOrCompany || '-')) return false;
    if (filterFullName.length > 0 && !filterFullName.includes(person.full_name || '-')) return false;
    if (filterNationality.length > 0 && !filterNationality.includes(person.nationality || '-')) return false;
    if (filterTrade.length > 0 && !filterTrade.includes(tradeOrRole || '-')) return false;
    if (filterDepartment.length > 0 && personnelType === 'technician' && !filterDepartment.includes(person.department || '-')) return false;
    if (filterMealPref.length > 0 && !filterMealPref.includes(mealPrefName)) return false;

    return true;
  });

  // Sort personnel
  const sortedPersonnel = [...filteredPersonnel].sort((a, b) => {
    let aVal;
    let bVal;

    // Handle specific fields for technician/external and defaults
    if (sortField === 'employee_id' && personnelType === 'technician') {
      aVal = a.employee_id || '';
      bVal = b.employee_id || '';
    } else if (sortField === 'company_name' && personnelType === 'external') {
      aVal = a.company_name || '';
      bVal = b.company_name || '';
    } else if (sortField === 'trade' && personnelType === 'technician') {
      aVal = a.trade || '';
      bVal = b.trade || '';
    } else if (sortField === 'role' && personnelType === 'external') {
      aVal = a.role || '';
      bVal = b.role || '';
    } else {
      aVal = a[sortField] || '';
      bVal = b[sortField] || '';
    }

    // Ensure string comparison
    aVal = String(aVal);
    bVal = String(bVal);

    if (sortDirection === 'asc') {
      return aVal.localeCompare(bVal);
    } else {
      return bVal.localeCompare(aVal);
    }
  });

  // Get unique values for filters
  const uniqueEmployeeIds = [...new Set(availablePersonnel.map(p =>
    personnelType === 'technician' ? p.employee_id : p.company_name
  ).filter(Boolean))].sort();

  const uniqueFullNames = [...new Set(availablePersonnel.map(p => p.full_name).filter(Boolean))].sort();
  const uniqueNationalities = [...new Set(availablePersonnel.map(p => p.nationality).filter(Boolean))].sort();
  const uniqueTrades = [...new Set(availablePersonnel.map(p =>
    personnelType === 'technician' ? p.trade : p.role
  ).filter(Boolean))].sort();
  const uniqueDepartments = personnelType === 'technician'
    ? [...new Set(availablePersonnel.map(p => p.department).filter(Boolean))].sort()
    : [];
  const uniqueMealPrefs = [...new Set(availablePersonnel.map(p =>
    getMealPreferenceName(p.meal_preference_id)
  ))].sort();

  const handleSort = (field) => {
    // Adjust sortField based on personnelType if it's the ID/Company or Trade/Role field
    let actualSortField = field;
    if (field === 'employee_id' && personnelType === 'external') actualSortField = 'company_name';
    if (field === 'company_name' && personnelType === 'technician') actualSortField = 'employee_id';
    if (field === 'trade' && personnelType === 'external') actualSortField = 'role';
    if (field === 'role' && personnelType === 'technician') actualSortField = 'trade';

    if (sortField === actualSortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(actualSortField);
      setSortDirection('asc');
    }
  };

  const clearAllFilters = () => {
    setFilterEmployeeId([]);
    setFilterFullName([]);
    setFilterNationality([]);
    setFilterTrade([]);
    setFilterDepartment([]);
    setFilterMealPref([]);
    setPersonnelSearchQuery("");
    setSearchEmployeeId("");
    setSearchFullName("");
    setSearchNationality("");
    setSearchTrade("");
    setSearchDepartment("");
    setSearchMealPref("");
  };

  const hasActiveFilters = filterEmployeeId.length > 0 || filterFullName.length > 0 ||
    filterNationality.length > 0 || filterTrade.length > 0 || filterDepartment.length > 0 ||
    filterMealPref.length > 0 || personnelSearchQuery.trim() !== "";

  const ColumnFilter = ({ values, selected, setSelected, searchValue, setSearchValue }) => {
    const filteredValues = values.filter(v =>
      String(v).toLowerCase().includes(searchValue.toLowerCase())
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
              onClick={(e) => e.stopPropagation()}
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

  const handleSelectPerson = (personId) => {
    if (selectedPersonnelIds.includes(personId)) {
      setSelectedPersonnelIds(selectedPersonnelIds.filter(id => id !== personId));
    } else {
      setSelectedPersonnelIds([...selectedPersonnelIds, personId]);
    }
  };

  const handleSelectAll = () => {
    if (selectedPersonnelIds.length === sortedPersonnel.length && sortedPersonnel.length > 0) {
      setSelectedPersonnelIds([]);
    } else {
      setSelectedPersonnelIds(sortedPersonnel.map(p => p.id));
    }
  };

  const sourceCamp = allCamps.find(c => c.id === sourceCampId);
  const targetCamp = allCamps.find(c => c.id === targetCampId);

  // Check if flexible scheduling is allowed
  // 1. Induction camp to regular or exit camp
  // 2. Regular camp to exit camp
  const isFlexibleSchedulingAllowed =
    (sourceCamp?.camp_type === 'induction_camp' &&
      (targetCamp?.camp_type === 'regular_camp' || targetCamp?.camp_type === 'exit_camp')) ||
    (sourceCamp?.camp_type === 'regular_camp' && targetCamp?.camp_type === 'exit_camp');

  const handleSubmit = async () => {
    if (!sourceCampId || !targetCampId || !reasonForMovement || selectedPersonnelIds.length === 0) {
      alert("Please fill in all required fields and select at least one person");
      return;
    }

    // Validate scheduling based on camp types
    if (isFlexibleSchedulingAllowed) {
      if (!flexibleTransferDate) {
        alert("Please select a transfer date");
        return;
      }
    } else {
      if (!selectedTransferSlot) {
        alert("Please select a transfer date and time slot");
        return;
      }
    }

    // Validate exit case technicians
    if (reasonForMovement === 'exit_case' && personnelType === 'technician') {
      const invalidTechnicians = [];

      for (const techId of selectedPersonnelIds) {
        const tech = technicians.find(t => t.id === techId);

        // Check if technician status is terminated or absconded
        const hasTerminatedStatus = tech?.status === 'terminated' || tech?.status === 'absconded';

        // Check if there's a resignation disciplinary action for this technician
        const hasResignation = disciplinaryActions.some(
          action => action.technician_id === techId && action.action_type === 'resignation'
        );

        // Check if there's a termination disciplinary action for this technician
        const hasTermination = disciplinaryActions.some(
          action => action.technician_id === techId && action.action_type === 'termination'
        );

        // Technician must have either terminated/absconded status OR a resignation/termination action
        if (!hasTerminatedStatus && !hasResignation && !hasTermination) {
          invalidTechnicians.push(tech?.full_name || tech?.employee_id || 'Unknown');
        }
      }

      if (invalidTechnicians.length > 0) {
        alert(
          `⚠️ Exit Case Validation Failed\n\n` +
          `For "Exit Case" transfers, all technicians must have:\n` +
          `• Status: Terminated or Absconded, OR\n` +
          `• A Resignation/Termination disciplinary action record\n\n` +
          `The following technicians do not meet this requirement:\n` +
          `${invalidTechnicians.map(name => `• ${name}`).join('\n')}\n\n` +
          `Please update their status or disciplinary records before proceeding.`
        );
        return;
      }
    }

    setSubmitting(true);

    try {
      let transferDate, transferTime;

      if (isFlexibleSchedulingAllowed) {
        transferDate = flexibleTransferDate;
        transferTime = flexibleTransferTime || null;
      } else {
        [transferDate, transferTime] = selectedTransferSlot.split('|');
      }

      const transferData = {
        source_camp_id: sourceCampId,
        target_camp_id: targetCampId,
        request_date: new Date().toISOString().split('T')[0],
        reason_for_movement: reasonForMovement,
        scheduled_dispatch_date: transferDate,
        scheduled_dispatch_time: transferTime,
        notes: notes,
        status: 'pending_allocation'
      };

      // Only add requested_by if user is logged in
      if (currentUser?.id) {
        transferData.requested_by = currentUser.id;
      }

      if (personnelType === 'technician') {
        transferData.technician_ids = selectedPersonnelIds;
        transferData.external_personnel_ids = [];
      } else {
        transferData.technician_ids = [];
        transferData.external_personnel_ids = selectedPersonnelIds;
      }

      await createTransferRequestMutation.mutateAsync(transferData);

      alert(`Transfer request submitted successfully!\n\n${selectedPersonnelIds.length} ${personnelType === 'technician' ? 'technicians' : 'external personnel'} will be transferred.\n\nThe target camp manager will now allocate beds.`);

      setSelectedPersonnelIds([]);
      setReasonForMovement("");
      setSelectedTransferSlot("");
      setFlexibleTransferDate("");
      setFlexibleTransferTime("");
      setNotes("");
      setSourceCampId("");
      setTargetCampId("");
      clearAllFilters(); // Clear filters on successful submission

    } catch (error) {
      alert(`Failed to submit transfer request: ${error.message}`);
    }

    setSubmitting(false);
  };

  const selectedSlotDetails = selectedTransferSlot
    ? transferSlots.find(s => s.value === selectedTransferSlot)
    : null;

  // Calculate how many personnel are excluded due to active transfers or pre-induction
  const totalInCamp = personnelType === 'technician'
    ? technicians.filter(t => t.camp_id === sourceCampId && t.status === 'active').length
    : externalPersonnel.filter(e => e.camp_id === sourceCampId && e.status === 'active').length;
  const excludedCount = totalInCamp - availablePersonnel.length;

  // Count how many are excluded specifically due to Sajja pre-induction
  const sajjaPreInductionCount = personnelType === 'technician'
    ? technicians.filter(t =>
      t.camp_id === sourceCampId &&
      sajjaCamp &&
      t.camp_id === sajjaCamp.id &&
      t.induction_status === 'pre_induction' &&
      !t.induction_completion_date
    ).length
    : 0;

  return (
    <div className="p-6 md:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-[1800px] mx-auto space-y-6">
        <Alert className="border-blue-200 bg-blue-50">
          <AlertCircle className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-900 text-sm">
            <strong>📍 Step 1 of 4: Initiate Transfer Request</strong><br />
            Select personnel → Choose target camp → Schedule dispatch → Submit request → Target camp allocates beds → Next: My Transfer Requests (to approve/dispatch)
          </AlertDescription>
        </Alert>

        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
              <Send className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Initiate Transfer</h1>
              <p className="text-gray-600">Request personnel transfer between camps</p>
            </div>
          </div>
        </div>

        {!isFlexibleSchedulingAllowed && (
          <Alert className="bg-blue-50 border-blue-200">
            <Calendar className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-900">
              <strong>Transfer Schedule Policy ({activePolicy.season_name}):</strong> Regular camp-to-camp transfers can only be scheduled on <strong>{activePolicy.allowed_days?.join(', ')}</strong> between <strong>{activePolicy.allowed_time_slots?.[0]} and {activePolicy.allowed_time_slots?.[activePolicy.allowed_time_slots.length - 1]}</strong>.
            </AlertDescription>
          </Alert>
        )}

        {isFlexibleSchedulingAllowed && (
          <Alert className="bg-green-50 border-green-200">
            <Calendar className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-900">
              <strong>Flexible Scheduling:</strong> This transfer can be scheduled at any date and time.
            </AlertDescription>
          </Alert>
        )}

        <Card className="border-none shadow-md">
          <CardHeader className="bg-gradient-to-r from-purple-50 to-blue-50 border-b">
            <CardTitle>Personnel Type</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="flex gap-4">
              <Button
                variant={personnelType === 'technician' ? 'default' : 'outline'}
                onClick={() => {
                  setPersonnelType('technician');
                  setSelectedPersonnelIds([]);
                  clearAllFilters();
                }}
                className="flex-1"
              >
                <Users className="w-4 h-4 mr-2" />
                Technicians
              </Button>
              <Button
                variant={personnelType === 'external' ? 'default' : 'outline'}
                onClick={() => {
                  setPersonnelType('external');
                  setSelectedPersonnelIds([]);
                  clearAllFilters();
                }}
                className="flex-1"
              >
                <User className="w-4 h-4 mr-2" />
                External Personnel
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-white">
          <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-purple-50">
            <CardTitle>Transfer Configuration</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="source-camp">From Camp (Source)*</Label>
                <Select value={sourceCampId} onValueChange={(value) => {
                  setSourceCampId(value);
                  setSelectedPersonnelIds([]);
                  clearAllFilters();
                }}>
                  <SelectTrigger id="source-camp" className="mt-2">
                    <SelectValue placeholder="Select source camp..." />
                  </SelectTrigger>
                  <SelectContent>
                    {sourceCamps.map(camp => (
                      <SelectItem key={camp.id} value={camp.id}>
                        {camp.name} - {camp.code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="target-camp">To Camp (Target)*</Label>
                <Select value={targetCampId} onValueChange={setTargetCampId}>
                  <SelectTrigger id="target-camp" className="mt-2">
                    <SelectValue placeholder="Select target camp..." />
                  </SelectTrigger>
                  <SelectContent>
                    {allCamps.filter(c => c.id !== sourceCampId).map(camp => (
                      <SelectItem key={camp.id} value={camp.id}>
                        {camp.name} - {camp.code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              <div>
                <Label htmlFor="reason">Reason for Transfer*</Label>
                <Select value={reasonForMovement} onValueChange={setReasonForMovement}>
                  <SelectTrigger id="reason" className="mt-2">
                    <SelectValue placeholder="Select reason for movement..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="onboarding_transfer">Onboarding Transfer (Post-Induction)</SelectItem>
                    <SelectItem value="project_transfer">Project Transfer</SelectItem>
                    <SelectItem value="roommate_issue">Unhappy with Roommate</SelectItem>
                    <SelectItem value="camp_environment">Camp Environment Issue</SelectItem>
                    <SelectItem value="urgent_requirement">Urgent Requirement at Different Project</SelectItem>
                    <SelectItem value="camp_closure">Camp Closing/Project Completion</SelectItem>
                    <SelectItem value="skill_requirement">Specific Skill Required</SelectItem>
                    <SelectItem value="personal_request">Personal Request</SelectItem>
                    <SelectItem value="disciplinary">Disciplinary Reason</SelectItem>
                    <SelectItem value="exit_case">Exit Case</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {isFlexibleSchedulingAllowed ? (
                <div>
                  <Label htmlFor="transfer-date">Scheduled Transfer Date & Time*</Label>
                  <div className="grid grid-cols-2 gap-4 mt-2">
                    <div>
                      <Input
                        id="transfer-date"
                        type="date"
                        value={flexibleTransferDate}
                        onChange={(e) => setFlexibleTransferDate(e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                      />
                    </div>
                    <div>
                      <Input
                        id="transfer-time"
                        type="time"
                        value={flexibleTransferTime}
                        onChange={(e) => setFlexibleTransferTime(e.target.value)}
                      />
                    </div>
                  </div>
                  {flexibleTransferDate && (
                    <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center gap-2 text-sm text-green-800">
                        <Calendar className="w-4 h-4" />
                        <span className="font-medium">Scheduled:</span>
                        <span>{format(new Date(flexibleTransferDate), 'EEE, dd/MMM/yyyy')}</span>
                        {flexibleTransferTime && (
                          <>
                            <Clock className="w-4 h-4 ml-2" />
                            <span>{flexibleTransferTime}</span>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <Label htmlFor="transfer-slot">Scheduled Transfer Date & Time*</Label>
                  <Select
                    value={selectedTransferSlot}
                    onValueChange={(value) => {
                      setSelectedTransferSlot(value);
                      setSlotSearchQuery("");
                    }}
                    onOpenChange={(open) => {
                      if (!open) {
                        setSlotSearchQuery("");
                      }
                    }}
                  >
                    <SelectTrigger id="transfer-slot" className="mt-2">
                      <SelectValue placeholder="Select date and time slot..." />
                    </SelectTrigger>
                    <SelectContent className="max-h-96">
                      <div className="sticky top-0 bg-white z-10 p-2 border-b">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <Input
                            placeholder="Search dates and times..."
                            value={slotSearchQuery}
                            onChange={(e) => setSlotSearchQuery(e.target.value)}
                            className="pl-9 pr-9 h-9"
                            onClick={(e) => e.stopPropagation()}
                            onKeyDown={(e) => e.stopPropagation()}
                          />
                          {slotSearchQuery && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSlotSearchQuery("");
                              }}
                              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                      {filteredTransferSlots.length === 0 ? (
                        <div className="text-center py-8 text-sm text-gray-500">
                          No slots found matching "{slotSearchQuery}"
                        </div>
                      ) : (
                        filteredTransferSlots.map((slot) => (
                          <SelectItem key={slot.value} value={slot.value}>
                            <div className="flex items-center gap-3">
                              <Badge variant="outline" className="min-w-[80px]">
                                {slot.dayName}
                              </Badge>
                              <span className="font-medium">{slot.displayDate}</span>
                              <span className="text-gray-600">at {slot.time}</span>
                            </div>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  {selectedSlotDetails && (
                    <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center gap-2 text-sm text-green-800">
                        <Calendar className="w-4 h-4" />
                        <span className="font-medium">Selected:</span>
                        <span>{selectedSlotDetails.dayName}, {selectedSlotDetails.displayDate}</span>
                        <Clock className="w-4 h-4 ml-2" />
                        <span>{selectedSlotDetails.time}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}


            </div>
          </CardContent>
        </Card>

        {sourceCampId && (
          <Card className="border-none shadow-lg">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>
                    Select {personnelType === 'technician' ? 'Technicians' : 'External Personnel'} to Transfer
                  </CardTitle>
                  {excludedCount > 0 && (
                    <Alert className="bg-yellow-50 border-yellow-200 mt-3 mb-0">
                      <AlertCircle className="h-4 w-4 text-yellow-600" />
                      <AlertDescription className="text-yellow-900">
                        {excludedCount} {personnelType === 'technician' ? 'technician' : 'external personnel'}{excludedCount > 1 ? 's are' : ' is'} excluded:
                        {sajjaPreInductionCount > 0 && (
                          <span className="block mt-1">
                            • {sajjaPreInductionCount} in Sajja pre-induction (must complete induction first)
                          </span>
                        )}
                        {excludedCount - sajjaPreInductionCount > 0 && (
                          <span className="block mt-1">
                            • {excludedCount - sajjaPreInductionCount} in active transfer requests
                          </span>
                        )}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
                <Badge variant="secondary" className="text-lg px-4 py-1">
                  {selectedPersonnelIds.length} selected
                </Badge>
              </div>
            </CardHeader>

            {availablePersonnel.length === 0 && !hasActiveFilters ? (
              <CardContent className="p-12 text-center">
                <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600">No active {personnelType === 'technician' ? 'technicians' : 'external personnel'} in this camp</p>
              </CardContent>
            ) : (
              <>
                {/* Search and Filter Bar */}
                <div className="p-4 border-b bg-gray-50">
                  <div className="flex items-center gap-4">
                    <div className="flex-1 relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        type="text"
                        placeholder="Search by name or ID..."
                        value={personnelSearchQuery}
                        onChange={(e) => setPersonnelSearchQuery(e.target.value)}
                        className="pl-10 pr-10"
                      />
                      {personnelSearchQuery && (
                        <button
                          onClick={() => setPersonnelSearchQuery("")}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    {hasActiveFilters && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={clearAllFilters}
                        className="text-blue-700 hover:bg-blue-50"
                      >
                        <X className="w-4 h-4 mr-1" />
                        Clear All Filters
                      </Button>
                    )}
                  </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse bg-white">
                    <thead>
                      <tr className="border-b-2 border-gray-300">
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                          <Checkbox
                            checked={selectedPersonnelIds.length === sortedPersonnel.length && sortedPersonnel.length > 0}
                            onCheckedChange={handleSelectAll}
                          />
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                          <div className="flex items-center justify-between gap-2">
                            <span>{personnelType === 'technician' ? 'Employee ID' : 'Company'}</span>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => handleSort(personnelType === 'technician' ? 'employee_id' : 'company_name')}>
                                <ArrowUpDown className="w-3 h-3" />
                              </Button>
                              <ColumnFilter
                                values={uniqueEmployeeIds}
                                selected={filterEmployeeId}
                                setSelected={setFilterEmployeeId}
                                searchValue={searchEmployeeId}
                                setSearchValue={setSearchEmployeeId}
                              />
                            </div>
                          </div>
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                          <div className="flex items-center justify-between gap-2">
                            <span>Full Name</span>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => handleSort('full_name')}>
                                <ArrowUpDown className="w-3 h-3" />
                              </Button>
                              <ColumnFilter
                                values={uniqueFullNames}
                                selected={filterFullName}
                                setSelected={setFilterFullName}
                                searchValue={searchFullName}
                                setSearchValue={setSearchFullName}
                              />
                            </div>
                          </div>
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                          <div className="flex items-center justify-between gap-2">
                            <span>Nationality</span>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => handleSort('nationality')}>
                                <ArrowUpDown className="w-3 h-3" />
                              </Button>
                              <ColumnFilter
                                values={uniqueNationalities}
                                selected={filterNationality}
                                setSelected={setFilterNationality}
                                searchValue={searchNationality}
                                setSearchValue={setSearchNationality}
                              />
                            </div>
                          </div>
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                          <div className="flex items-center justify-between gap-2">
                            <span>{personnelType === 'technician' ? 'Trade' : 'Role'}</span>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => handleSort(personnelType === 'technician' ? 'trade' : 'role')}>
                                <ArrowUpDown className="w-3 h-3" />
                              </Button>
                              <ColumnFilter
                                values={uniqueTrades}
                                selected={filterTrade}
                                setSelected={setFilterTrade}
                                searchValue={searchTrade}
                                setSearchValue={setSearchTrade}
                              />
                            </div>
                          </div>
                        </th>
                        {personnelType === 'technician' && (
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                            <div className="flex items-center justify-between gap-2">
                              <span>Department</span>
                              <div className="flex gap-1">
                                <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => handleSort('department')}>
                                  <ArrowUpDown className="w-3 h-3" />
                                </Button>
                                <ColumnFilter
                                  values={uniqueDepartments}
                                  selected={filterDepartment}
                                  setSelected={setFilterDepartment}
                                  searchValue={searchDepartment}
                                  setSearchValue={setSearchDepartment}
                                />
                              </div>
                            </div>
                          </th>
                        )}
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                          <div className="flex items-center justify-between gap-2">
                            <span>Meal Preference</span>
                            <ColumnFilter
                              values={uniqueMealPrefs}
                              selected={filterMealPref}
                              setSelected={setFilterMealPref}
                              searchValue={searchMealPref}
                              setSearchValue={setSearchMealPref}
                            />
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedPersonnel.length === 0 ? (
                        <tr>
                          <td colSpan={personnelType === 'technician' ? 7 : 6} className="px-4 py-12 text-center text-gray-500">
                            {hasActiveFilters
                              ? 'No personnel match your search/filter criteria'
                              : 'No personnel available'}
                          </td>
                        </tr>
                      ) : (
                        sortedPersonnel.map((person, index) => (
                          <tr
                            key={person.id}
                            className={`border-b border-gray-200 hover:bg-blue-50 transition-colors cursor-pointer ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                              } ${selectedPersonnelIds.includes(person.id) ? 'bg-blue-100' : ''}`}
                            onClick={() => handleSelectPerson(person.id)}
                          >
                            <td className="px-4 py-3 text-sm border-r border-gray-200">
                              <Checkbox
                                checked={selectedPersonnelIds.includes(person.id)}
                                onCheckedChange={() => handleSelectPerson(person.id)}
                              />
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900 border-r border-gray-200 whitespace-nowrap font-medium">
                              {personnelType === 'technician' ? person.employee_id : person.company_name}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900 border-r border-gray-200 whitespace-nowrap">
                              {person.full_name}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-700 border-r border-gray-200 whitespace-nowrap">
                              {person.nationality || '-'}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-700 border-r border-gray-200 whitespace-nowrap">
                              {personnelType === 'technician' ? (person.trade || '-') : (person.role || '-')}
                            </td>
                            {personnelType === 'technician' && (
                              <td className="px-4 py-3 text-sm text-gray-700 border-r border-gray-200 whitespace-nowrap">
                                {person.department || '-'}
                              </td>
                            )}
                            <td className="px-4 py-3 text-sm text-gray-700 border-r border-gray-200 whitespace-nowrap">
                              {getMealPreferenceName(person.meal_preference_id)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
                  <p className="text-sm text-gray-600">
                    Showing <span className="font-semibold">{sortedPersonnel.length}</span> of <span className="font-semibold">{availablePersonnel.length}</span> personnel
                  </p>
                </div>
              </>
            )}
          </Card>
        )}

        {selectedPersonnelIds.length > 0 && sourceCamp && targetCamp &&
          ((isFlexibleSchedulingAllowed && flexibleTransferDate) || (!isFlexibleSchedulingAllowed && selectedSlotDetails)) && (
            <Card className="border-l-4 border-l-green-600 shadow-lg bg-green-50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-gray-900 mb-2">Ready to Submit Transfer Request</p>
                    <div className="flex items-center gap-3 text-sm text-gray-700">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-blue-600" />
                        <span className="font-medium">{sourceCamp.name}</span>
                      </div>
                      <ArrowRight className="w-4 h-4 text-gray-400" />
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-green-600" />
                        <span className="font-medium">{targetCamp.name}</span>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mt-2">
                      {selectedPersonnelIds.length} {personnelType === 'technician' ? 'technicians' : 'external personnel'} selected
                    </p>
                    <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                      <Calendar className="w-4 h-4 text-green-600" />
                      {isFlexibleSchedulingAllowed && flexibleTransferDate ? (
                        <span>Scheduled: {format(new Date(flexibleTransferDate), 'EEE, dd/MMM/yyyy')}{flexibleTransferTime && ` at ${flexibleTransferTime}`}</span>
                      ) : selectedSlotDetails ? (
                        <span>Scheduled: {selectedSlotDetails.dayName}, {selectedSlotDetails.displayDate} at {selectedSlotDetails.time}</span>
                      ) : null}
                    </div>
                  </div>
                  <Button
                    onClick={handleSubmit}
                    disabled={submitting || !sourceCampId || !targetCampId || !reasonForMovement ||
                      (isFlexibleSchedulingAllowed ? !flexibleTransferDate : !selectedTransferSlot) ||
                      selectedPersonnelIds.length === 0}
                    className="bg-green-600 hover:bg-green-700"
                    size="lg"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    {submitting ? 'Submitting...' : 'Submit Transfer Request'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
      </div>
    </div>
  );
}