import React, { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Sparkles, Building2, CheckCircle2, AlertCircle, ArrowLeft, Filter, X, ArrowUpDown, Search } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { createPageUrl } from "@/utils";
import { Link } from "react-router-dom";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Input } from "@/components/ui/input";

export default function SmartAllocation() {
  const urlParams = new URLSearchParams(window.location.search);
  const transferRequestId = urlParams.get('transfer_request_id');

  const mode = transferRequestId ? 'transfer' : 'induction';

  const [selectedCamp, setSelectedCamp] = useState("");
  const [campSearch, setCampSearch] = useState("");
  const [campPopoverOpen, setCampPopoverOpen] = useState(false);
  const [selectedPersonnelType, setSelectedPersonnelType] = useState('technician');
  const [selectedTechnicians, setSelectedTechnicians] = useState([]);
  const [selectedExternal, setSelectedExternal] = useState([]);
  const [allocationResult, setAllocationResult] = useState(null);
  const [allocating, setAllocating] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [preferences, setPreferences] = useState({
    genderSegregation: true,
    nationalityGrouping: true,
    stateGrouping: true,
    languageGrouping: true,
    skillGrouping: false,
    ageBasedBerth: true,
    roomTypeMatching: true,
    tradeGrouping: true,
    shiftGrouping: true,
  });

  // Table sorting and filtering for personnel list
  const [personnelSortField, setPersonnelSortField] = useState("full_name");
  const [personnelSortDirection, setPersonnelSortDirection] = useState("asc");
  const [personnelSearchQuery, setPersonnelSearchQuery] = useState("");

  // Selection state for personnel in transfer request
  const [selectedPersonnelForView, setSelectedPersonnelForView] = useState([]);

  // Column filters for personnel table
  const [filterEmployeeId, setFilterEmployeeId] = useState([]);
  const [filterFullName, setFilterFullName] = useState([]);
  const [filterNationality, setFilterNationality] = useState([]);
  const [filterGender, setFilterGender] = useState([]);
  const [filterType, setFilterType] = useState([]);

  // Search states for column filters
  const [searchEmployeeId, setSearchEmployeeId] = useState("");
  const [searchFullName, setSearchFullName] = useState("");
  const [searchNationality, setSearchNationality] = useState("");
  const [searchGender, setSearchGender] = useState("");
  const [searchType, setSearchType] = useState("");

  const previewRef = useRef(null);

  const queryClient = useQueryClient();

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

  const { data: floors = [] } = useQuery({
    queryKey: ['floors'],
    queryFn: () => base44.entities.Floor.list(),
  });

  const { data: rooms = [] } = useQuery({
    queryKey: ['rooms'],
    queryFn: () => base44.entities.Room.list(),
  });

  const { data: beds = [] } = useQuery({
    queryKey: ['beds'],
    queryFn: () => base44.entities.Bed.list(),
  });

  const { data: leaves = [] } = useQuery({
    queryKey: ['leaves'],
    queryFn: () => base44.entities.LeaveRequest.list(),
  });

  const { data: transferRequests = [] } = useQuery({
    queryKey: ['transfer-requests'],
    queryFn: () => base44.entities.TransferRequest.list(),
    enabled: mode === 'transfer',
  });

  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
  });

  const { data: mealPreferences = [] } = useQuery({
    queryKey: ['meal-preferences'],
    queryFn: () => base44.entities.MealPreference.list(),
  });

  const updateTransferRequestMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.TransferRequest.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transfer-requests'] });
    }
  });

  const updateTechnicianMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Technician.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['technicians'] });
    }
  });

  const updateExternalMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ExternalPersonnel.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['external-personnel'] });
    }
  });

  const updateBedMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Bed.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['beds'] });
    }
  });

  const transferRequest = mode === 'transfer' && transferRequestId
    ? transferRequests.find(tr => tr.id === transferRequestId)
    : null;

  const sourceCamp = transferRequest ? camps.find(c => c.id === transferRequest.source_camp_id) : null;
  const targetCamp = transferRequest ? camps.find(c => c.id === transferRequest.target_camp_id) : null;

  const getMealPreferenceName = (mealPrefId) => {
    const pref = mealPreferences.find(m => m.id === mealPrefId);
    return pref ? pref.name : '-';
  };

  const getPersonnelToAllocate = () => {
    if (mode === 'transfer' && transferRequest) {
      return [
        ...technicians.filter(t => transferRequest.technician_ids?.includes(t.id) || false).map(t => ({ ...t, type: 'technician' })),
        ...externalPersonnel.filter(e => transferRequest.external_personnel_ids?.includes(e.id) || false).map(e => ({ ...e, type: 'external' }))
      ];
    } else if (mode === 'induction' && selectedCamp) {
      if (selectedPersonnelType === 'technician') {
        return technicians.filter(t => selectedTechnicians.includes(t.id)).map(t => ({ ...t, type: 'technician' }));
      } else {
        return externalPersonnel.filter(e => selectedExternal.includes(e.id)).map(e => ({ ...e, type: 'external' }));
      }
    }
    return [];
  };

  const personnelToAllocate = getPersonnelToAllocate();

  // Check for existing active allocations
  const checkForExistingAllocations = (personnelList) => {
    const issues = [];
    const activeTransferStatuses = ['beds_allocated', 'approved_for_dispatch', 'technicians_dispatched', 'partially_arrived'];

    for (const person of personnelList) {
      // Check for other active transfer requests with allocated beds for this person
      const otherActiveRequests = transferRequests.filter(req =>
        req.id !== transferRequestId && // Exclude the current request
        activeTransferStatuses.includes(req.status) &&
        (req.technician_ids?.includes(person.id) || req.external_personnel_ids?.includes(person.id))
      );

      for (const req of otherActiveRequests) {
        const otherTargetCamp = camps.find(c => c.id === req.target_camp_id);
        issues.push({
          person,
          message: `${person.full_name} (${person.employee_id || person.company_name}) already has beds allocated for transfer to ${otherTargetCamp?.name} (Request ID: ${req.id})`
        });
      }
    }
    return issues;
  };

  // Apply search and filters to personnel
  let filteredPersonnel = personnelToAllocate.filter(person => {
    const matchesSearch = !personnelSearchQuery ||
      person.full_name?.toLowerCase().includes(personnelSearchQuery.toLowerCase()) ||
      (person.type === 'technician' ? person.employee_id : person.company_name)?.toLowerCase().includes(personnelSearchQuery.toLowerCase());

    return matchesSearch;
  });

  // Apply column filters
  filteredPersonnel = filteredPersonnel.filter(person => {
    const employeeIdOrCompany = person.type === 'technician' ? person.employee_id : person.company_name;

    if (filterEmployeeId.length > 0 && !filterEmployeeId.includes(employeeIdOrCompany || '-')) return false;
    if (filterFullName.length > 0 && !filterFullName.includes(person.full_name || '-')) return false;
    if (filterNationality.length > 0 && !filterNationality.includes(person.nationality || '-')) return false;
    if (filterGender.length > 0 && !filterGender.includes(person.gender || '-')) return false;
    if (filterType.length > 0 && !filterType.includes(person.type === 'technician' ? 'Technician' : 'External')) return false;

    return true;
  });

  // Sort personnel
  const sortedPersonnel = [...filteredPersonnel].sort((a, b) => {
    let aVal = a[personnelSortField] || '';
    let bVal = b[personnelSortField] || '';

    if (personnelSortDirection === 'asc') {
      return String(aVal).localeCompare(String(bVal));
    } else {
      return String(bVal).localeCompare(String(aVal));
    }
  });

  // Handle personnel selection for viewing
  const handleSelectPersonnel = (personId) => {
    if (selectedPersonnelForView.includes(personId)) {
      setSelectedPersonnelForView(selectedPersonnelForView.filter(id => id !== personId));
    } else {
      setSelectedPersonnelForView([...selectedPersonnelForView, personId]);
    }
  };

  const handleSelectAllPersonnel = () => {
    if (selectedPersonnelForView.length === sortedPersonnel.length && sortedPersonnel.length > 0) {
      setSelectedPersonnelForView([]);
    } else {
      setSelectedPersonnelForView(sortedPersonnel.map(p => p.id));
    }
  };

  // Get unique values for filters
  const uniqueEmployeeIds = [...new Set(personnelToAllocate.map(p =>
    p.type === 'technician' ? p.employee_id : p.company_name
  ).filter(Boolean))].sort();

  const uniqueFullNames = [...new Set(personnelToAllocate.map(p => p.full_name).filter(Boolean))].sort();
  const uniqueNationalities = [...new Set(personnelToAllocate.map(p => p.nationality).filter(Boolean))].sort();
  const uniqueGenders = [...new Set(personnelToAllocate.map(p => p.gender).filter(Boolean))].sort();
  const uniqueTypes = ['Technician', 'External'];

  const handlePersonnelSort = (field) => {
    if (personnelSortField === field) {
      setPersonnelSortDirection(personnelSortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setPersonnelSortField(field);
      setPersonnelSortDirection('asc');
    }
  };

  const clearAllPersonnelFilters = () => {
    setFilterEmployeeId([]);
    setFilterFullName([]);
    setFilterNationality([]);
    setFilterGender([]);
    setFilterType([]);
    setPersonnelSearchQuery("");
    setSelectedPersonnelForView([]); // Also clear selection when clearing filters
  };

  const hasActivePersonnelFilters = filterEmployeeId.length > 0 || filterFullName.length > 0 ||
    filterNationality.length > 0 || filterGender.length > 0 ||
    filterType.length > 0 || personnelSearchQuery.trim() !== "";

  const ColumnFilter = ({ values, selected, setSelected, searchValue, setSearchValue }) => {
    const filteredValues = values.filter(v =>
      v && v.toLowerCase().includes(searchValue.toLowerCase())
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

  const campForBeds = mode === 'transfer' ? targetCamp : camps.find(c => c.id === selectedCamp);

  const getAvailablePersonnelForSelection = () => {
    if (mode !== 'induction' || !selectedCamp) return { technicians: [], external: [] };

    const techList = technicians.filter(t =>
      t.camp_id === selectedCamp &&
      !t.bed_id &&
      t.status === 'active'
    );

    const extList = externalPersonnel.filter(e => {
      if (e.bed_id) return false;
      if (e.status !== 'active') return false;
      return !e.camp_id || e.camp_id === selectedCamp;
    });

    return { technicians: techList, external: extList };
  };

  const availableForSelection = getAvailablePersonnelForSelection();



  const getAvailableBeds = () => {
    if (!campForBeds) return [];

    const campFloors = floors.filter(f => f.camp_id === campForBeds.id);
    const campRooms = rooms.filter(r => campFloors.some(f => f.id === r.floor_id));
    const campBeds = beds.filter(b => campRooms.some(r => r.id === b.room_id));

    const personnelTypeRooms = campRooms.filter(r => {
      // In transfer mode, we allocate to existing personnel types, not based on selection
      if (mode === 'transfer') {
        return true;
      } else { // Induction mode
        const oType = r.occupant_type || 'mixed'; // Default to mixed if undefined/null

        // If "Match Room Type" preference is unchecked, allow ANY non-staff room
        if (!preferences.roomTypeMatching) {
          return oType !== 'staff_only';
        }

        if (selectedPersonnelType === 'technician') {
          return oType === 'technician_only' || oType === 'mixed';
        } else {
          return oType === 'external_only' || oType === 'mixed';
        }
      }
    });

    const availableBeds = campBeds.filter(b => {
      if (!personnelTypeRooms.some(r => r.id === b.room_id)) return false;

      // If a bed is available, it's good to go
      if (b.status === 'available') return true;

      // If a bed is reserved, check if it's for a technician on temporary leave
      if (b.status === 'reserved' && b.reserved_for) {
        const leaveRequest = leaves.find(l =>
          l.technician_id === b.reserved_for &&
          l.status === 'approved' &&
          l.bed_action === 'temporary_allocate' &&
          !l.temporary_occupant_id // Only if no one is temporarily occupying it yet
        );
        // This bed is only available temporarily if it's for induction of a technician
        // or if it's a transfer and the incoming personnel can occupy a reserved spot temporarily
        if (mode === 'induction') {
          return !!leaveRequest && selectedPersonnelType === 'technician';
        } else if (mode === 'transfer') {
          // For transfer, allow temporary allocation for both technicians and external,
          // as long as the reserved bed can be filled by the transferring person's type.
          // The actual assignment logic will be handled by smart allocate.
          return !!leaveRequest;
        }
      }

      return false; // Not available or not meeting criteria
    });

    const result = availableBeds.map(bed => {
      const room = campRooms.find(r => r.id === bed.room_id);
      const floor = campFloors.find(f => f.id === room?.floor_id);
      const isTemporary = bed.status === 'reserved' && bed.reserved_for && (!bed.technician_id && !bed.external_personnel_id);
      return { ...bed, room, floor, isTemporary };
    });

    console.log("getAvailableBeds Debug:", {
      campName: campForBeds?.name,
      totalFloors: campFloors.length,
      totalRooms: campRooms.length,
      totalBedsInCamp: campBeds.length,
      roomsMatchingType: personnelTypeRooms.length,
      availableBedsCount: availableBeds.length,
      sampleBedStatus: campBeds.length > 0 ? campBeds[0].status : 'N/A'
    });

    return result;
  };

  const availableBeds = getAvailableBeds();

  console.log("SmartAllocation Render Debug:", {
    mode,
    selectedCamp,
    personnelToAllocateCount: personnelToAllocate.length,
    availableBedsCount: availableBeds.length,
    selectedTechniciansCount: selectedTechnicians.length,
    selectedExternalCount: selectedExternal.length
  });

  // Filter camps based on user's access
  // Filter camps based on user's access
  const accessibleCamps = camps.filter(c => {
    // If user data is not yet loaded, show all to avoid empty state
    if (!currentUser) return true;

    // Admins see all camps
    if (currentUser.role === 'admin') return true;

    // Users with assigned camp only see their camp
    if (currentUser.camp_id) {
      return c.id === currentUser.camp_id;
    }

    // Users without assigned camp (e.g. HQ) see all camps
    return true;
  });

  const filteredCamps = accessibleCamps.filter(c => {
    const searchLower = campSearch.toLowerCase();
    return c.name?.toLowerCase().includes(searchLower) ||
      c.code?.toLowerCase().includes(searchLower);
  });

  const smartAllocate = () => {
    console.log("Starting Smart Allocation...");
    setAllocating(true); // Show some visual feedback if possible, though this state is reused for saving

    try {
      // If personnel are selected for viewing, run allocation only for them. Otherwise, for all.
      // In Induction mode, selectedPersonnelForView is empty, so we use personnelToAllocate (which matches selection).
      const personnelToConsider = selectedPersonnelForView.length > 0
        ? personnelToAllocate.filter(p => p && selectedPersonnelForView.includes(p.id))
        : personnelToAllocate;

      console.log(`Personnel to consider: ${personnelToConsider.length}`);

      if (personnelToConsider.length === 0) {
        alert("Please select personnel to allocate, or ensure there are personnel available for allocation.");
        setAllocating(false);
        return;
      }

      // Check for existing allocations before proceeding
      const allocationIssues = checkForExistingAllocations(personnelToConsider);
      if (allocationIssues.length > 0) {
        alert(`❌ Cannot proceed - Duplicate bed allocations detected:\n\n${allocationIssues.map(i => i.message).join('\n\n')}\n\nPlease cancel/complete the other transfer requests first.`);
        setAllocating(false);
        return;
      }

      console.log(`Available beds: ${availableBeds.length}`);
      if (availableBeds.length < personnelToConsider.length) {
        alert(`Not enough beds! Need ${personnelToConsider.length} beds but only ${availableBeds.length} available.`);
        setAllocating(false);
        return;
      }

      const allocations = [];
      const usedBeds = new Set();

      // Check if camp is Induction or Exit or Project camp (use sequential logic)
      const isSequentialCamp = campForBeds && (campForBeds.camp_type === 'induction_camp' || campForBeds.camp_type === 'exit_camp' || campForBeds.camp_type === 'project_camp');
      console.log(`Camp type sequential: ${isSequentialCamp}`);

      // Sort personnel based on camp type
      const sortedPersonnelForAllocation = [...personnelToConsider].sort((a, b) => {
        if (!a || !b) return 0;

        if (isSequentialCamp) {
          // Sequential: First come, first served (by arrival date/time)
          const aDate = a.actual_arrival_date || a.expected_arrival_date || '';
          const bDate = b.actual_arrival_date || b.expected_arrival_date || '';
          if (aDate !== bDate) return aDate.localeCompare(bDate);

          const aTime = a.actual_arrival_time || a.expected_arrival_time || '';
          const bTime = b.actual_arrival_time || b.expected_arrival_time || '';
          return aTime.localeCompare(bTime);
        } else {
          // Smart allocation: Group by nationality, state, language, trade, shift, ethnicity
          if (preferences.nationalityGrouping && a.nationality !== b.nationality) {
            return (a.nationality || '').localeCompare(b.nationality || '');
          }
          if (preferences.stateGrouping && a.state !== b.state) {
            return (a.state || '').localeCompare(b.state || '');
          }
          if (preferences.languageGrouping && a.language_preference !== b.language_preference) {
            return (a.language_preference || '').localeCompare(b.language_preference || '');
          }
          if (preferences.tradeGrouping && a.trade !== b.trade) {
            return (a.trade || '').localeCompare(b.trade || '');
          }
          if (preferences.shiftGrouping && a.shift !== b.shift) {
            return (a.shift || '').localeCompare(b.shift || '');
          }
          return 0;
        }
      });

      const currentRoomOccupantsMap = new Map();
      beds.forEach(bed => {
        if (bed.status === 'occupied' && bed.room_id) {
          let occupant = null;
          let occupantType = null;
          if (bed.technician_id) {
            occupant = technicians.find(t => t.id === bed.technician_id);
            occupantType = 'technician';
          } else if (bed.external_personnel_id) {
            occupant = externalPersonnel.find(e => e.id === bed.external_personnel_id);
            occupantType = 'external';
          }

          if (occupant) {
            if (!currentRoomOccupantsMap.has(bed.room_id)) {
              currentRoomOccupantsMap.set(bed.room_id, []);
            }
            currentRoomOccupantsMap.get(bed.room_id).push({ personnel: occupant, type: occupantType });
          }
        }
      });

      // Sort beds for sequential allocation (Induction/Exit/Project camps)
      const sortedBedsForSequential = isSequentialCamp
        ? [...availableBeds].sort((a, b) => {
          // Sort by floor number, then room number, then bed number
          const aFloor = a.floor?.floor_number || '';
          const bFloor = b.floor?.floor_number || '';
          const floorCompare = String(aFloor).localeCompare(String(bFloor), undefined, { numeric: true });
          if (floorCompare !== 0) return floorCompare;

          const aRoom = a.room?.room_number || '';
          const bRoom = b.room?.room_number || '';
          const roomCompare = String(aRoom).localeCompare(String(bRoom), undefined, { numeric: true });
          if (roomCompare !== 0) return roomCompare;

          const aBed = a.bed_number || '';
          const bBed = b.bed_number || '';
          return String(aBed).localeCompare(String(bBed), undefined, { numeric: true });
        })
        : availableBeds;

      const allocationDebug = []; // Track why beds are rejected

      console.log("Starting allocation loop...");
      for (const person of sortedPersonnelForAllocation) {
        if (!person) continue;

        let bestBed = null;
        let bestScore = -Infinity;
        const rejectionReasons = []; // Track reasons for this specific person

        // Calculate age if person is a technician
        let age = null;
        if (person.type === 'technician' && person.date_of_birth) {
          const dob = new Date(person.date_of_birth);
          if (!isNaN(dob.getTime())) {
            const today = new Date();
            age = today.getFullYear() - dob.getFullYear();
            const monthDiff = today.getMonth() - dob.getMonth();
            if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
              age--;
            }
          }
        }

        if (isSequentialCamp) {
          // Sequential allocation logic...
          let bedsChecked = 0;
          for (const bed of sortedBedsForSequential) {
            if (usedBeds.has(bed.id)) continue;
            bedsChecked++;

            const room = bed.room;
            if (!room) {
              rejectionReasons.push(`Bed ${bed.bed_number}: No room found`);
              continue;
            }

            // STRICT: Enforce room type matching - different occupant types cannot be in same room
            if (room.occupant_type === 'technician_only' && person.type !== 'technician') {
              rejectionReasons.push(`Floor ${room.floor_id}, Room ${room.room_number}: Technician-only room (you are ${person.type})`);
              continue;
            }
            if (room.occupant_type === 'external_only' && person.type !== 'external') {
              rejectionReasons.push(`Floor ${room.floor_id}, Room ${room.room_number}: External-only room (you are ${person.type})`);
              continue;
            }
            if (room.occupant_type === 'staff_only') {
              rejectionReasons.push(`Floor ${room.floor_id}, Room ${room.room_number}: Staff-only room`);
              continue;
            }

            // For mixed rooms, check existing occupants to ensure types don't mix
            const currentDBOccupantsForTypeCheck = (currentRoomOccupantsMap.get(room.id) || []);
            const tentativelyAllocatedForTypeCheck = allocations.filter(a => a.bed && a.bed.room_id === room.id);

            if (room.occupant_type === 'mixed' && (currentDBOccupantsForTypeCheck.length > 0 || tentativelyAllocatedForTypeCheck.length > 0)) {
              const existingType = currentDBOccupantsForTypeCheck.length > 0
                ? currentDBOccupantsForTypeCheck[0].type
                : tentativelyAllocatedForTypeCheck[0].type;

              if (existingType !== person.type) {
                rejectionReasons.push(`Floor ${room.floor_id}, Room ${room.room_number}: Mixed room already has ${existingType} (you are ${person.type})`);
                continue;
              }
            }

            // Still enforce gender segregation if room has restrictions
            if (room.gender_restriction && room.gender_restriction !== 'mixed' && room.gender_restriction !== person.gender) {
              rejectionReasons.push(`Floor ${room.floor_id}, Room ${room.room_number}: ${room.gender_restriction} only room (you are ${person.gender})`);
              continue;
            }

            // Age 45+ must get lower berth only (always enforced in sequential)
            if (age !== null && age >= 45 && !bed.is_lower_berth) {
              rejectionReasons.push(`Floor ${room.floor_id}, Room ${room.room_number}, Bed ${bed.bed_number}: Upper berth (you need lower berth, age ${age})`);
              continue;
            }

            // Found a suitable bed - assign immediately (no scoring)
            bestBed = bed;
            break;
          }

          if (!bestBed && bedsChecked === 0) {
            rejectionReasons.push(`No available beds to check (all ${sortedBedsForSequential.length} beds already used)`);
          }
        } else {
          // Smart allocation for regular camps - use scoring system
          let bedsChecked = 0;
          for (const bed of availableBeds) {
            if (usedBeds.has(bed.id)) continue;
            bedsChecked++;

            const room = bed.room;
            if (!room) {
              rejectionReasons.push(`Bed ${bed.bed_number}: No room found`);
              continue;
            }

            // 1. Gender segregation check
            if (preferences.genderSegregation && room.gender_restriction && room.gender_restriction !== 'mixed' && room.gender_restriction !== person.gender) {
              rejectionReasons.push(`Floor ${room.floor_id}, Room ${room.room_number}: ${room.gender_restriction} only room (you are ${person.gender})`);
              continue;
            }

            // 2. Age 45+ must get lower berth only
            if (preferences.ageBasedBerth && age !== null && age >= 45 && !bed.is_lower_berth) {
              rejectionReasons.push(`Floor ${room.floor_id}, Room ${room.room_number}, Bed ${bed.bed_number}: Upper berth (you need lower berth, age ${age})`);
              continue;
            }

            // 3. Room type matching (technician, external, TR staff)
            // Should verify room occupant_type logic here...
            const oType = room.occupant_type || 'mixed';

            if (oType === 'staff_only') {
              rejectionReasons.push(`Floor ${room.floor_id}, Room ${room.room_number}: Staff-only room`);
              continue;
            }

            if (preferences.roomTypeMatching) {
              if (oType === 'technician_only' && person.type !== 'technician') {
                rejectionReasons.push(`Floor ${room.floor_id}, Room ${room.room_number}: Technician-only room (you are ${person.type})`);
                continue;
              }
              if (oType === 'external_only' && person.type !== 'external') {
                rejectionReasons.push(`Floor ${room.floor_id}, Room ${room.room_number}: External-only room (you are ${person.type})`);
                continue;
              }

              // For mixed rooms, check existing occupants to ensure types don't mix
              const currentDBOccupantsForTypeCheck = (currentRoomOccupantsMap.get(room.id) || []);
              const tentativelyAllocatedForTypeCheck = allocations.filter(a => a.bed && a.bed.room_id === room.id);

              if (oType === 'mixed' && (currentDBOccupantsForTypeCheck.length > 0 || tentativelyAllocatedForTypeCheck.length > 0)) {
                // Get the existing type in this room
                const existingType = currentDBOccupantsForTypeCheck.length > 0
                  ? currentDBOccupantsForTypeCheck[0].type
                  : tentativelyAllocatedForTypeCheck[0].type;

                // If types don't match, skip this bed
                if (existingType !== person.type) {
                  rejectionReasons.push(`Floor ${room.floor_id}, Room ${room.room_number}: Mixed room already has ${existingType} (you are ${person.type})`);
                  continue;
                }
              }
            }

            let score = 0;

            const currentDBOccupants = (currentRoomOccupantsMap.get(room.id) || []).map(o => o.personnel).filter(Boolean);
            const tentativelyAllocated = allocations.filter(a => a.bed && a.bed.room_id === room.id).map(a => a.personnel).filter(Boolean);
            const allOccupants = [...currentDBOccupants, ...tentativelyAllocated];

            // 4. Room utilization - prefer rooms with existing occupants of same group
            const currentOccupancy = allOccupants.length;
            const roomCapacity = room.capacity || 1;
            const utilizationRate = currentOccupancy / roomCapacity;

            if (allOccupants.length > 0) {
              const combinedOccupants = [person, ...allOccupants];

              // Safe checks with optional chaining
              const allSameNationality = combinedOccupants.every(o => o && o.nationality === person.nationality);
              const allSameState = combinedOccupants.every(o => o && o.state === person.state);
              const allSameLanguage = combinedOccupants.every(o => {
                if (!o) return false;
                const personLangs = (person.language_preference || '').split(',').map(l => l.trim()).filter(Boolean);
                const oLangs = (o.language_preference || '').split(',').map(l => l.trim()).filter(Boolean);
                return personLangs.length > 0 && oLangs.length > 0 && personLangs.some(pl => oLangs.includes(pl));
              });
              const allSameTrade = person.type === 'technician' && combinedOccupants.every(o => o && o.type === 'technician' && o.trade === person.trade);
              const allSameShift = person.type === 'technician' && combinedOccupants.every(o => o && o.type === 'technician' && (o.shift || 'day') === (person.shift || 'day'));

              // Strict nationality grouping
              if (preferences.nationalityGrouping && !allSameNationality) {
                // rejectionReasons.push(`Nationality mismatch in room`); // Optional: add detailed reason
                continue;
              }

              // Scoring for matching attributes
              if (allSameNationality) score += 1000;
              if (preferences.stateGrouping && allSameState) score += 800;
              if (preferences.languageGrouping && allSameLanguage) score += 700;
              if (preferences.tradeGrouping && allSameTrade) score += 500;
              if (preferences.shiftGrouping && allSameShift) score += 450;

              // Bonus for higher room utilization (prefer filling existing rooms)
              score += Math.floor(utilizationRate * 400);
            } else {
              // Empty room - base score
              score += 100;
            }

            if (score > bestScore) {
              bestScore = score;
              bestBed = bed;
            }
          }

          if (!bestBed && bedsChecked === 0) {
            rejectionReasons.push(`No available beds to check (all ${availableBeds.length} beds already used)`);
          }
        }

        if (bestBed) {
          const personType = person.type;
          allocations.push({
            type: personType,
            personnel: person,
            bed: bestBed,
            room: bestBed.room,
            floor: bestBed.floor,
            isTemporary: bestBed.isTemporary || false
          });
          usedBeds.add(bestBed.id);

          if (bestBed.room.id) {
            const roomOccupants = currentRoomOccupantsMap.get(bestBed.room.id) || [];
            roomOccupants.push({ personnel: person, type: personType });
            currentRoomOccupantsMap.set(bestBed.room.id, roomOccupants);
          }
        } else {
          // No bed found for this person - save rejection reasons
          allocationDebug.push({
            person: `${person.full_name} (${person.type === 'technician' ? person.employee_id : person.company_name})`,
            reasons: rejectionReasons.length > 0 ? rejectionReasons : ['No suitable beds found matching criteria']
          });
        }
      }

      console.log(`Allocation complete. Allocated: ${allocations.length}, Failed: ${allocationDebug.length}`);

      if (allocations.length < personnelToConsider.length) {
        const unallocatedCount = personnelToConsider.length - allocations.length;
        const over45Count = personnelToConsider.filter(p => {
          if (p.type !== 'technician' || !p.date_of_birth) return false;
          const dob = new Date(p.date_of_birth);
          if (isNaN(dob.getTime())) return false;

          const today = new Date();
          let age = today.getFullYear() - dob.getFullYear();
          const monthDiff = today.getMonth() - dob.getMonth();
          if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
            age--;
          }
          return age >= 45;
        }).length;

        let message = `❌ Could only allocate ${allocations.length} out of ${personnelToConsider.length} personnel due to constraints.\n\n`;

        if (allocationDebug.length > 0) {
          message += `🔍 REJECTION DETAILS (First 3 failed):\n\n`;
          allocationDebug.slice(0, 3).forEach((debug, idx) => {
            message += `${idx + 1}. ${debug.person}:\n`;

            // Show distinct reasons to avoid clutter
            const uniqueReasons = [...new Set(debug.reasons)];
            uniqueReasons.slice(0, 3).forEach(reason => {
              message += `   • ${reason}\n`;
            });
            if (uniqueReasons.length > 3) {
              message += `   ... and ${uniqueReasons.length - 3} more reasons\n`;
            }
            message += `\n`;
          });

          if (allocationDebug.length > 3) {
            message += `... and ${allocationDebug.length - 3} others failed.\n`;
          }
        }

        if (over45Count > 0) {
          message += `\n⚠️ Note: ${over45Count} technician(s) aged 45+ require lower berth beds.\n`;
        }

        message += `\n💡 SOLUTIONS:\n`;
        message += `• Check if rooms have correct occupant_type (technician_only/external_only/mixed)\n`;
        message += `• Ensure mixed rooms don't already have different personnel types\n`;
        message += `• Verify gender restrictions match personnel gender\n`;
        message += `• For age 45+, ensure lower berth beds are available\n`;

        alert(message);
      }

      setAllocationResult(allocations);
      setShowPreview(true);
      setAllocating(false);

      // Auto-scroll to results
      setTimeout(() => {
        if (previewRef.current) {
          previewRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    } catch (error) {
      console.error("Crash in smartAllocate:", error);
      alert(`Programmatic Error in Smart Allocation: ${error.message}\n\nSee console for details.`);
      setAllocating(false);
    }
  };

  const confirmAllocation = async () => {
    if (!allocationResult || allocationResult.length === 0) return;

    setAllocating(true);

    try {
      if (mode === 'transfer' && transferRequest) {
        const allocatedBedsData = allocationResult.map(allocation => ({
          personnel_id: allocation.personnel.id,
          personnel_type: allocation.type,
          bed_id: allocation.bed.id,
          room_id: allocation.room.id,
          floor_id: allocation.floor.id,
          is_temporary: allocation.isTemporary
        }));

        await updateTransferRequestMutation.mutateAsync({
          id: transferRequest.id,
          data: {
            allocated_beds_data: JSON.stringify(allocatedBedsData),
            status: 'beds_allocated',
            allocation_confirmed_by: currentUser?.id,
            allocation_confirmed_date: new Date().toISOString().split('T')[0]
          }
        });

        alert(`✅ Bed allocation proposal saved!\n\n${allocationResult.length} beds proposed.\n\nStatus: beds_allocated\n\nSource camp can now dispatch personnel.`);

        window.location.href = createPageUrl('IncomingTransferRequests');

      } else {
        console.log('Starting induction bed allocation...');

        for (const allocation of allocationResult) {
          const person = allocation.personnel;
          const bed = allocation.bed;

          console.log(`Allocating bed ${bed.bed_number} to ${person.full_name} (${person.id})`);

          const bedUpdate = {
            status: allocation.isTemporary ? 'reserved' : 'occupied',
            ...(allocation.type === 'technician'
              ? { technician_id: allocation.isTemporary ? null : person.id }
              : { external_personnel_id: allocation.isTemporary ? null : person.id }
            )
          };

          console.log('Updating bed with:', bedUpdate);
          await updateBedMutation.mutateAsync({
            id: bed.id,
            data: bedUpdate
          });

          if (allocation.isTemporary) {
            const leaveRequest = leaves.find(l => l.technician_id === bed.reserved_for);
            if (leaveRequest) {
              console.log('Updating leave request with temporary occupant');
              await base44.entities.LeaveRequest.update(leaveRequest.id, {
                temporary_occupant_id: person.id
              });
            }
          }

          const personnelUpdate = {
            bed_id: bed.id,
            camp_id: selectedCamp,
            status: 'active'
          };

          console.log(`Updating ${allocation.type} with:`, personnelUpdate);

          if (allocation.type === 'technician') {
            await updateTechnicianMutation.mutateAsync({
              id: person.id,
              data: personnelUpdate
            });
          } else {
            await updateExternalMutation.mutateAsync({
              id: person.id,
              data: personnelUpdate
            });
          }

          console.log(`✅ Successfully allocated bed ${bed.bed_number} to ${person.full_name}`);
        }

        console.log('Invalidating queries to refresh data...');
        await queryClient.invalidateQueries({ queryKey: ['beds'] });
        await queryClient.invalidateQueries({ queryKey: ['technicians'] });
        await queryClient.invalidateQueries({ queryKey: ['external-personnel'] });

        alert(`✅ Successfully allocated ${allocationResult.length} ${selectedPersonnelType === 'technician' ? 'technicians' : 'external personnel'}!\n\nBeds have been assigned and personnel records updated.`);

        setAllocationResult(null);
        setShowPreview(false);
        setSelectedTechnicians([]);
        setSelectedExternal([]);
      }

    } catch (error) {
      console.error('Allocation failed with error:', error);
      alert(`❌ Allocation failed: ${error.message}\n\nPlease check the console for details and try again.`);
    }

    setAllocating(false);
  };

  if (mode === 'transfer' && !transferRequest) {
    return (
      <div className="p-6 md:p-8 bg-gradient-to-br from-gray-50 to-blue-50 min-h-screen">
        <div className="max-w-4xl mx-auto">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>No Transfer Request Found</strong><br />
              This page should be accessed from the "Incoming Transfer Requests" page with a valid transfer request ID.
            </AlertDescription>
          </Alert>
          <div className="mt-4">
            <Link to={createPageUrl('IncomingTransferRequests')}>
              <Button variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Incoming Transfer Requests
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 bg-gradient-to-br from-gray-50 to-blue-50 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        {mode === 'induction' && (
          <Alert className="border-blue-200 bg-blue-50">
            <AlertCircle className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-900 text-sm">
              <strong>📍 Step 4 of 6: Smart Bed Allocation (Camp Operations)</strong><br />
              After confirming arrival, allocate beds using smart algorithm → Beds assigned based on nationality, gender, age → Status: "Active with bed" → Next: Sajja Pre-Induction
            </AlertDescription>
          </Alert>
        )}

        {/* Header */}
        <div>
          {mode === 'transfer' && (
            <Link to={createPageUrl('IncomingTransferRequests')}>
              <Button variant="ghost" className="mb-4">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Incoming Transfer Requests
              </Button>
            </Link>
          )}
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-blue-600 rounded-xl flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Smart Bed Allocation</h1>
              <p className="text-gray-600">
                {mode === 'transfer'
                  ? 'Propose bed assignments for transfer request'
                  : 'Allocate beds for new arrivals (induction)'}
              </p>
            </div>
          </div>
        </div>

        {/* Mode Badge */}
        <Badge className={mode === 'transfer' ? 'bg-blue-600' : 'bg-green-600'}>
          {mode === 'transfer' ? '🔄 Transfer Request Mode' : '🆕 New Induction Mode'}
        </Badge>

        {/* Transfer Request Info (Transfer Mode Only) */}
        {mode === 'transfer' && transferRequest && (
          <Card className="border-none shadow-lg">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50 border-b">
              <CardTitle>Transfer Request Details</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <Label className="text-sm text-gray-600">From (Source Camp)</Label>
                  <p className="text-lg font-semibold text-orange-700">{sourceCamp?.name}</p>
                </div>
                <div>
                  <Label className="text-sm text-gray-600">To (Target Camp)</Label>
                  <p className="text-lg font-semibold text-green-700">{targetCamp?.name}</p>
                </div>
                <div>
                  <Label className="text-sm text-gray-600">Personnel to Transfer</Label>
                  <p className="text-lg font-semibold">{personnelToAllocate.length}</p>
                </div>
                <div>
                  <Label className="text-sm text-gray-600">Available Beds</Label>
                  <p className="text-lg font-semibold">{availableBeds.length}</p>
                </div>
              </div>

              {personnelToAllocate.length > availableBeds.length && (
                <Alert className="mt-4 border-red-500 bg-red-50">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-800">
                    <strong>Not enough beds!</strong> Need {personnelToAllocate.length} beds but only {availableBeds.length} available.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        )}

        {/* Camp Selection (Induction Mode Only) */}
        {mode === 'induction' && (
          <Card className="border-none shadow-lg">
            <CardHeader className="bg-gradient-to-r from-green-50 to-teal-50 border-b">
              <CardTitle>Select Camp & Personnel</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="space-y-2">
                <Label>Select Camp</Label>
                <Popover open={campPopoverOpen} onOpenChange={setCampPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className="w-full justify-between h-12"
                    >
                      {selectedCamp ? camps.find(c => c.id === selectedCamp)?.name : "Select camp..."}
                      <Building2 className="ml-2 h-4 w-4 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[400px] p-0">
                    <Command>
                      <CommandInput
                        placeholder="Search camp..."
                        value={campSearch}
                        onValueChange={setCampSearch}
                      />
                      <CommandEmpty>No camp found.</CommandEmpty>
                      <CommandGroup className="max-h-64 overflow-auto">
                        {filteredCamps.map((camp) => (
                          <CommandItem
                            key={camp.id}
                            value={camp.name}
                            onSelect={() => {
                              setSelectedCamp(camp.id);
                              setCampPopoverOpen(false);
                            }}
                          >
                            <CheckCircle2
                              className={`mr-2 h-4 w-4 ${selectedCamp === camp.id ? "opacity-100" : "opacity-0"
                                }`}
                            />
                            <div className="flex flex-col">
                              <span className="font-medium">{camp.name}</span>
                              <span className="text-xs text-gray-500">{camp.code} • {camp.location}</span>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              {selectedCamp && (
                <>
                  <div className="space-y-2">
                    <Label>Personnel Type</Label>
                    <Select value={selectedPersonnelType} onValueChange={setSelectedPersonnelType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="technician">Technicians ({availableForSelection.technicians.length} available)</SelectItem>
                        <SelectItem value="external">External Personnel ({availableForSelection.external.length} available)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Select Personnel</Label>
                    <div className="border rounded-lg p-4 max-h-64 overflow-y-auto bg-white">
                      {selectedPersonnelType === 'technician' ? (
                        availableForSelection.technicians.length === 0 ? (
                          <p className="text-sm text-gray-500">No available technicians in this camp without beds</p>
                        ) : (
                          availableForSelection.technicians.map(t => (
                            <div key={t.id} className="flex items-center space-x-2 py-2">
                              <Checkbox
                                checked={selectedTechnicians.includes(t.id)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setSelectedTechnicians([...selectedTechnicians, t.id]);
                                  } else {
                                    setSelectedTechnicians(selectedTechnicians.filter(id => id !== t.id));
                                  }
                                }}
                              />
                              <label className="text-sm flex-1">
                                {t.full_name} ({t.employee_id}) - {t.nationality}
                              </label>
                            </div>
                          ))
                        )
                      ) : (
                        availableForSelection.external.length === 0 ? (
                          <p className="text-sm text-gray-500">No available external personnel without beds</p>
                        ) : (
                          availableForSelection.external.map(e => (
                            <div key={e.id} className="flex items-center space-x-2 py-2">
                              <Checkbox
                                checked={selectedExternal.includes(e.id)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setSelectedExternal([...selectedExternal, e.id]);
                                  } else {
                                    setSelectedExternal(selectedExternal.filter(id => id !== e.id));
                                  }
                                }}
                              />
                              <label className="text-sm flex-1">
                                {e.full_name} ({e.company_name}) - {e.nationality}
                              </label>
                            </div>
                          ))
                        )
                      )}
                    </div>
                    <p className="text-sm text-gray-600">
                      Selected: {selectedPersonnelType === 'technician' ? selectedTechnicians.length : selectedExternal.length} personnel
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Personnel List (Table View with Filters) */}
        {mode === 'transfer' && personnelToAllocate.length > 0 && (
          <Card className="border-none shadow-lg">
            <CardHeader className="bg-gradient-to-r from-purple-50 to-blue-50 border-b">
              <div className="flex items-center justify-between">
                <CardTitle>Personnel in Transfer Request</CardTitle>
                <div className="flex items-center gap-3">
                  {selectedPersonnelForView.length > 0 && (
                    <Badge variant="secondary" className="text-base px-3 py-1 bg-blue-100 text-blue-700">
                      {selectedPersonnelForView.length} selected
                    </Badge>
                  )}
                  <Badge variant="secondary" className="text-lg px-4 py-1">
                    {personnelToAllocate.length} total
                  </Badge>
                </div>
              </div>
            </CardHeader>

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
                {hasActivePersonnelFilters && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearAllPersonnelFilters}
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
                        checked={selectedPersonnelForView.length === sortedPersonnel.length && sortedPersonnel.length > 0}
                        onCheckedChange={handleSelectAllPersonnel}
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                      <div className="flex items-center justify-between gap-2">
                        <span>ID/Company</span>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => handlePersonnelSort('employee_id')}>
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
                          <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => handlePersonnelSort('full_name')}>
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
                          <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => handlePersonnelSort('nationality')}>
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
                        <span>Gender</span>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => handlePersonnelSort('gender')}>
                            <ArrowUpDown className="w-3 h-3" />
                          </Button>
                          <ColumnFilter
                            values={uniqueGenders}
                            selected={filterGender}
                            setSelected={setFilterGender}
                            searchValue={searchGender}
                            setSearchValue={setSearchGender}
                          />
                        </div>
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                      <div className="flex items-center justify-between gap-2">
                        <span>Meal Preference</span>
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                      <div className="flex items-center justify-between gap-2">
                        <span>Type</span>
                        <ColumnFilter
                          values={uniqueTypes}
                          selected={filterType}
                          setSelected={setFilterType}
                          searchValue={searchType}
                          setSearchValue={setSearchType}
                        />
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedPersonnel.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="px-4 py-12 text-center text-gray-500">
                        {hasActivePersonnelFilters
                          ? 'No personnel match your search/filter criteria'
                          : 'No personnel available'}
                      </td>
                    </tr>
                  ) : (
                    sortedPersonnel.map((person, index) => (
                      <tr
                        key={person.id}
                        className={`border-b border-gray-200 hover:bg-blue-50 transition-colors cursor-pointer ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                          } ${selectedPersonnelForView.includes(person.id) ? 'bg-blue-100' : ''}`}
                        onClick={() => handleSelectPersonnel(person.id)}
                      >
                        <td className="px-4 py-3 text-sm border-r border-gray-200">
                          <Checkbox
                            checked={selectedPersonnelForView.includes(person.id)}
                            onCheckedChange={() => handleSelectPersonnel(person.id)}
                          />
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 border-r border-gray-200 whitespace-nowrap font-medium">
                          {person.type === 'technician' ? person.employee_id : person.company_name}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 border-r border-gray-200 whitespace-nowrap">
                          {person.full_name}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 border-r border-gray-200 whitespace-nowrap">
                          {person.nationality || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 border-r border-gray-200 whitespace-nowrap">
                          <Badge variant={person.gender === 'male' ? 'default' : 'secondary'}>
                            {person.gender === 'male' ? '♂ Male' : '♀ Female'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 border-r border-gray-200 whitespace-nowrap">
                          {getMealPreferenceName(person.meal_preference_id)}
                        </td>
                        <td className="px-4 py-3 text-sm border-r border-gray-200 whitespace-nowrap">
                          <Badge variant="outline" className="capitalize">{person.type}</Badge>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
              <p className="text-sm text-gray-600">
                Showing <span className="font-semibold">{sortedPersonnel.length}</span> of <span className="font-semibold">{personnelToAllocate.length}</span> personnel
                {selectedPersonnelForView.length > 0 && (
                  <span className="ml-2 text-blue-700 font-semibold">
                    • {selectedPersonnelForView.length} selected
                  </span>
                )}
              </p>
            </div>
          </Card>
        )}

        {/* Allocation Preferences - Only for regular camps */}
        {campForBeds && personnelToAllocate.length > 0 && campForBeds.camp_type !== 'induction_camp' && campForBeds.camp_type !== 'exit_camp' && campForBeds.camp_type !== 'project_camp' && (
          <Card className="border-none shadow-lg">
            <CardHeader className="bg-gradient-to-r from-purple-50 to-blue-50 border-b">
              <CardTitle>Allocation Preferences</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="genderSegregation"
                    checked={preferences.genderSegregation}
                    onCheckedChange={(checked) => setPreferences(prev => ({ ...prev, genderSegregation: !!checked }))}
                  />
                  <label htmlFor="genderSegregation" className="text-sm font-medium">
                    Enforce Gender Segregation (per room restrictions)
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="nationalityGrouping"
                    checked={preferences.nationalityGrouping}
                    onCheckedChange={(checked) => setPreferences(prev => ({ ...prev, nationalityGrouping: !!checked }))}
                  />
                  <label htmlFor="nationalityGrouping" className="text-sm font-medium">
                    Prioritize Nationality Grouping (strict)
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="stateGrouping"
                    checked={preferences.stateGrouping}
                    onCheckedChange={(checked) => setPreferences(prev => ({ ...prev, stateGrouping: !!checked }))}
                  />
                  <label htmlFor="stateGrouping" className="text-sm font-medium">
                    Prioritize State Grouping (within same nationality)
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="ageBasedBerth"
                    checked={preferences.ageBasedBerth}
                    onCheckedChange={(checked) => setPreferences(prev => ({ ...prev, ageBasedBerth: !!checked }))}
                  />
                  <label htmlFor="ageBasedBerth" className="text-sm font-medium">
                    Age 45+ → Lower Berth Only
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="languageGrouping"
                    checked={preferences.languageGrouping}
                    onCheckedChange={(checked) => setPreferences(prev => ({ ...prev, languageGrouping: !!checked }))}
                  />
                  <label htmlFor="languageGrouping" className="text-sm font-medium">
                    Prioritize Language Preference Grouping
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="tradeGrouping"
                    checked={preferences.tradeGrouping}
                    onCheckedChange={(checked) => setPreferences(prev => ({ ...prev, tradeGrouping: !!checked }))}
                  />
                  <label htmlFor="tradeGrouping" className="text-sm font-medium">
                    Prioritize Trade/Skill Grouping
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="shiftGrouping"
                    checked={preferences.shiftGrouping}
                    onCheckedChange={(checked) => setPreferences(prev => ({ ...prev, shiftGrouping: !!checked }))}
                  />
                  <label htmlFor="shiftGrouping" className="text-sm font-medium">
                    Prioritize Day/Night Shift Grouping
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="roomTypeMatching"
                    checked={preferences.roomTypeMatching}
                    onCheckedChange={(checked) => setPreferences(prev => ({ ...prev, roomTypeMatching: !!checked }))}
                  />
                  <label htmlFor="roomTypeMatching" className="text-sm font-medium">
                    Match Room Type (Technician/External/Mixed)
                  </label>
                </div>
              </div>

              <Alert className="mt-4 bg-blue-50 border-blue-200">
                <Sparkles className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-sm text-blue-900">
                  <strong>Smart Allocation Logic (For Regular Camps):</strong>
                  <ol className="list-decimal ml-5 mt-2 space-y-1 text-xs">
                    <li><strong>Occupant type segregation (STRICT)</strong> - Technicians, External Personnel, and Staff cannot share rooms</li>
                    <li>Age 45+ allocated to lower berth beds only</li>
                    <li>Nationality grouping (strict matching within rooms)</li>
                    <li>Gender segregation per room restrictions</li>
                    <li>Room utilization (prefer filling existing rooms with same profiles)</li>
                    <li>Trade/skill grouping for technicians</li>
                    <li>Day/night shift grouping for technicians</li>
                    <li>State/province grouping</li>
                    <li>Language preference grouping</li>
                    <li>Ethnicity preference matching</li>
                  </ol>
                  <p className="text-xs mt-2 font-semibold">
                    This applies to: Induction→Regular, Regular→Regular transfers
                  </p>
                </AlertDescription>
              </Alert>

              <div className="mt-6 flex justify-end">
                <Button
                  onClick={smartAllocate}
                  disabled={personnelToAllocate.length === 0 || availableBeds.length === 0}
                  className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Run Smart Allocation
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Sequential Allocation Button - For induction/exit camps */}
        {campForBeds && personnelToAllocate.length > 0 && (campForBeds.camp_type === 'induction_camp' || campForBeds.camp_type === 'exit_camp' || campForBeds.camp_type === 'project_camp') && (
          <Card className="border-none shadow-lg">
            <CardHeader className="bg-gradient-to-r from-purple-50 to-blue-50 border-b">
              <CardTitle>Sequential Allocation (First Come, First Served)</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <Alert className="mb-4 border-blue-200 bg-blue-50">
                <AlertCircle className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-900">
                  <strong>Sequential Allocation for {campForBeds.camp_type === 'induction_camp' ? 'Induction' : campForBeds.camp_type === 'exit_camp' ? 'Exit' : 'Project'} Camp:</strong>
                  <ul className="list-disc ml-5 mt-2 space-y-1 text-xs">
                    <li>Beds assigned in order based on arrival time</li>
                    <li>Starts from first floor and room sequentially</li>
                    <li><strong>Occupant type segregation enforced</strong> - Technicians, External Personnel, and Staff stay in separate rooms</li>
                    <li>Gender segregation per room restrictions</li>
                    <li>Age 45+ automatically assigned lower berth beds</li>
                  </ul>
                </AlertDescription>
              </Alert>

              <div className="flex justify-end">
                <Button
                  onClick={smartAllocate}
                  disabled={personnelToAllocate.length === 0 || availableBeds.length === 0}
                  className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Allocate Beds Sequentially
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Allocation Preview */}
        {showPreview && allocationResult && allocationResult.length > 0 && (
          <div ref={previewRef}>
            <Card className="border-none shadow-lg">
              <CardHeader className="border-b bg-gradient-to-r from-purple-50 to-blue-50">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>
                      {mode === 'transfer' ? 'Allocation Preview (Proposed Beds)' : 'Allocation Preview (Final)'}
                    </CardTitle>
                    <p className="text-sm text-gray-600 mt-1">
                      {allocationResult.length} personnel will be assigned beds
                      {mode === 'transfer' && ' • Status will become: beds_allocated'}
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <Button variant="outline" onClick={() => setShowPreview(false)}>
                      Cancel
                    </Button>
                    <Button
                      onClick={confirmAllocation}
                      disabled={allocating}
                      className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                    >
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      {allocating ? 'Saving...' : (mode === 'transfer' ? 'Confirm Bed Proposal' : 'Confirm Allocation')}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                {mode === 'transfer' && (
                  <Alert className="mb-4 border-blue-500 bg-blue-50">
                    <AlertCircle className="h-4 w-4 text-blue-600" />
                    <AlertDescription className="text-blue-900">
                      <strong>Important:</strong> This will PROPOSE bed allocations only. Beds will NOT be actually allocated yet.<br />
                      Actual allocation happens when personnel arrive at the target camp and fingerprint attendance is captured.
                    </AlertDescription>
                  </Alert>
                )}

                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b-2 border-gray-300 bg-gray-50">
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Personnel</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Type</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Nationality</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Gender</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Floor</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Room</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Bed</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allocationResult.map((allocation, index) => (
                        <tr
                          key={`${allocation.type}-${allocation.personnel.id}`}
                          className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                        >
                          <td className="px-4 py-3 text-sm border-b">
                            <div>
                              <p className="font-medium">{allocation.personnel.full_name}</p>
                              <p className="text-xs text-gray-500">
                                {allocation.type === 'technician' ? allocation.personnel.employee_id : allocation.personnel.company_name}
                              </p>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm border-b">
                            <Badge variant="outline" className="capitalize">{allocation.type}</Badge>
                          </td>
                          <td className="px-4 py-3 text-sm border-b">{allocation.personnel.nationality || '-'}</td>
                          <td className="px-4 py-3 text-sm border-b">
                            <Badge variant={allocation.personnel.gender === 'male' ? 'default' : 'secondary'}>
                              {allocation.personnel.gender === 'male' ? '♂ Male' : '♀ Female'}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-sm border-b">Floor {allocation.floor?.floor_number || '-'}</td>
                          <td className="px-4 py-3 text-sm border-b">Room {allocation.room?.room_number || '-'}</td>
                          <td className="px-4 py-3 text-sm border-b">Bed {allocation.bed?.bed_number || '-'}</td>
                          <td className="px-4 py-3 text-sm border-b">
                            <Badge className={mode === 'transfer' ? "bg-orange-100 text-orange-700" : "bg-green-100 text-green-700"}>
                              {mode === 'transfer' ? 'Proposed' : 'Allocated'}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}