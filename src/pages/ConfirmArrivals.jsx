import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
  Fingerprint, 
  Clock,
  AlertCircle,
  Building2,
  Search,
  Filter,
  X,
  ArrowUpDown,
  Calendar as CalendarIcon
} from "lucide-react";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";

export default function ConfirmArrivals() {
  const [searchQuery, setSearchQuery] = useState("");
  const [confirmingId, setConfirmingId] = useState(null);
  const [showArrivalDialog, setShowArrivalDialog] = useState(false);
  const [selectedArrival, setSelectedArrival] = useState(null);
  const [arrivalFormData, setArrivalFormData] = useState({
    actual_arrival_date: new Date(),
    actual_arrival_time: new Date().toTimeString().slice(0, 5),
    biometric_capture_date: new Date()
  });

  // Sorting
  const [sortField, setSortField] = useState("full_name");
  const [sortDirection, setSortDirection] = useState("asc");

  // Top-level filters
  const [filterTypeTop, setFilterTypeTop] = useState("all");
  const [filterSourceCampTop, setFilterSourceCampTop] = useState("all");
  const [filterTargetCampTop, setFilterTargetCampTop] = useState("all");

  // Excel-style column filters
  const [filterEmployeeId, setFilterEmployeeId] = useState([]);
  const [filterFullName, setFilterFullName] = useState([]);
  const [filterType, setFilterType] = useState([]);
  const [filterNationality, setFilterNationality] = useState([]);
  const [filterSourceCamp, setFilterSourceCamp] = useState([]);
  const [filterTargetCamp, setFilterTargetCamp] = useState([]);

  // Search states for filters
  const [searchEmployeeId, setSearchEmployeeId] = useState("");
  const [searchFullName, setSearchFullName] = useState("");
  const [searchType, setSearchType] = useState("");
  const [searchNationality, setSearchNationality] = useState("");
  const [searchSourceCamp, setSearchSourceCamp] = useState("");
  const [searchTargetCamp, setSearchTargetCamp] = useState("");

  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
  });

  const { data: transferRequests = [] } = useQuery({
    queryKey: ['transfer-requests'],
    queryFn: () => base44.entities.TransferRequest.list('-request_date'),
  });

  const { data: camps = [] } = useQuery({
    queryKey: ['camps'],
    queryFn: () => base44.entities.Camp.list(),
  });

  const { data: technicians = [] } = useQuery({
    queryKey: ['technicians'],
    queryFn: () => base44.entities.Technician.list(),
  });

  const { data: externalPersonnel = [] } = useQuery({
    queryKey: ['external-personnel'],
    queryFn: () => base44.entities.ExternalPersonnel.list(),
  });

  const { data: beds = [] } = useQuery({
    queryKey: ['beds'],
    queryFn: () => base44.entities.Bed.list(),
  });

  const { data: rooms = [] } = useQuery({
    queryKey: ['rooms'],
    queryFn: () => base44.entities.Room.list(),
  });

  const { data: floors = [] } = useQuery({
    queryKey: ['floors'],
    queryFn: () => base44.entities.Floor.list(),
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

  const updateTransferRequestMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.TransferRequest.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transfer-requests'] });
    }
  });

  const createTransferLogMutation = useMutation({
    mutationFn: (data) => base44.entities.TechnicianTransferLog.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transfer-logs'] });
    }
  });
  
  // Filter dispatched requests based on user's camp assignment
  const dispatchedRequests = transferRequests.filter(tr => {
    if (tr.status !== 'technicians_dispatched' && tr.status !== 'partially_arrived') return false;
    
    // Admins see all pending arrivals
    if (currentUser?.role === 'admin') return true;
    
    // Users with assigned camp only see arrivals to their camp
    if (currentUser?.camp_id) {
      return tr.target_camp_id === currentUser.camp_id;
    }
    
    // Users without assigned camp see nothing
    return false;
  });

  const pendingArrivals = [];
  
  dispatchedRequests.forEach(request => {
    const techList = (request.technician_ids || [])
      .map(tid => technicians.find(t => t.id === tid))
      .filter(t => t && t.status === 'pending_arrival');
    
    const extList = (request.external_personnel_ids || [])
      .map(eid => externalPersonnel.find(e => e.id === eid))
      .filter(e => e && e.status === 'pending_arrival');
    
    [...techList, ...extList].forEach(person => {
      const isTech = techList.includes(person);
      pendingArrivals.push({
        person,
        type: isTech ? 'technician' : 'external',
        transferRequest: request,
        sourceCamp: camps.find(c => c.id === request.source_camp_id),
        targetCamp: camps.find(c => c.id === request.target_camp_id),
      });
    });
  });

  // Apply search and top-level filters
  let filteredArrivals = pendingArrivals;

  if (searchQuery.trim()) {
    const searchLower = searchQuery.toLowerCase();
    filteredArrivals = filteredArrivals.filter(arrival => 
      arrival.person.full_name?.toLowerCase().includes(searchLower) ||
      arrival.person.employee_id?.toLowerCase().includes(searchLower) ||
      arrival.sourceCamp?.name?.toLowerCase().includes(searchLower) ||
      arrival.targetCamp?.name?.toLowerCase().includes(searchLower) ||
      arrival.type.toLowerCase().includes(searchLower) ||
      arrival.person.nationality?.toLowerCase().includes(searchLower)
    );
  }

  if (filterTypeTop !== 'all') {
    filteredArrivals = filteredArrivals.filter(a => a.type === filterTypeTop);
  }

  if (filterSourceCampTop !== 'all') {
    filteredArrivals = filteredArrivals.filter(a => a.sourceCamp?.id === filterSourceCampTop);
  }

  if (filterTargetCampTop !== 'all') {
    filteredArrivals = filteredArrivals.filter(a => a.targetCamp?.id === filterTargetCampTop);
  }

  // Apply column filters
  filteredArrivals = filteredArrivals.filter(arrival => {
    if (filterEmployeeId.length > 0 && !filterEmployeeId.includes(arrival.person.employee_id || '-')) return false;
    if (filterFullName.length > 0 && !filterFullName.includes(arrival.person.full_name || '-')) return false;
    if (filterType.length > 0 && !filterType.includes(arrival.type)) return false;
    if (filterNationality.length > 0 && !filterNationality.includes(arrival.person.nationality || '-')) return false;
    if (filterSourceCamp.length > 0 && !filterSourceCamp.includes(arrival.sourceCamp?.name || '-')) return false;
    if (filterTargetCamp.length > 0 && !filterTargetCamp.includes(arrival.targetCamp?.name || '-')) return false;
    return true;
  });

  // Sort
  const sortedArrivals = [...filteredArrivals].sort((a, b) => {
    let aVal, bVal;

    switch (sortField) {
      case 'employee_id':
        aVal = a.person.employee_id || '';
        bVal = b.person.employee_id || '';
        break;
      case 'full_name':
        aVal = a.person.full_name || '';
        bVal = b.person.full_name || '';
        break;
      case 'type':
        aVal = a.type;
        bVal = b.type;
        break;
      case 'nationality':
        aVal = a.person.nationality || '';
        bVal = b.person.nationality || '';
        break;
      case 'source_camp':
        aVal = a.sourceCamp?.name || '';
        bVal = b.sourceCamp?.name || '';
        break;
      case 'target_camp':
        aVal = a.targetCamp?.name || '';
        bVal = b.targetCamp?.name || '';
        break;
      default:
        aVal = '';
        bVal = '';
    }

    if (sortDirection === 'asc') {
      return String(aVal).localeCompare(String(bVal));
    } else {
      return String(bVal).localeCompare(String(aVal));
    }
  });

  // Get unique values for filters
  const uniqueEmployeeIds = [...new Set(pendingArrivals.map(a => a.person.employee_id || '-'))].sort();
  const uniqueFullNames = [...new Set(pendingArrivals.map(a => a.person.full_name || '-'))].sort();
  const uniqueTypes = [...new Set(pendingArrivals.map(a => a.type))].sort();
  const uniqueNationalities = [...new Set(pendingArrivals.map(a => a.person.nationality || '-'))].sort();
  const uniqueSourceCamps = [...new Set(pendingArrivals.map(a => a.sourceCamp?.name || '-'))].sort();
  const uniqueTargetCamps = [...new Set(pendingArrivals.map(a => a.targetCamp?.name || '-'))].sort();

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const clearAllFilters = () => {
    setSearchQuery("");
    setFilterTypeTop("all");
    setFilterSourceCampTop("all");
    setFilterTargetCampTop("all");
    setFilterEmployeeId([]);
    setFilterFullName([]);
    setFilterType([]);
    setFilterNationality([]);
    setFilterSourceCamp([]);
    setFilterTargetCamp([]);
  };

  const hasActiveFilters = 
    searchQuery.trim() !== "" ||
    filterTypeTop !== "all" ||
    filterSourceCampTop !== "all" ||
    filterTargetCampTop !== "all" ||
    filterEmployeeId.length > 0 ||
    filterFullName.length > 0 ||
    filterType.length > 0 ||
    filterNationality.length > 0 ||
    filterSourceCamp.length > 0 ||
    filterTargetCamp.length > 0;

  const handleOpenDialog = (arrival) => {
    setSelectedArrival(arrival);
    setArrivalFormData({
      actual_arrival_date: new Date(),
      actual_arrival_time: new Date().toTimeString().slice(0, 5),
      biometric_capture_date: new Date()
    });
    setShowArrivalDialog(true);
  };

  const handleConfirmArrival = async () => {
    if (!selectedArrival) return;

    setConfirmingId(selectedArrival.person.id);

    try {
      const arrival = selectedArrival;
      const arrivalDate = format(arrivalFormData.actual_arrival_date, 'yyyy-MM-dd');
      const arrivalTime = arrivalFormData.actual_arrival_time;
      const biometricDate = format(arrivalFormData.biometric_capture_date, 'yyyy-MM-dd');
      
      console.log('🔍 Starting arrival confirmation for:', arrival.person.full_name);
      console.log('📅 Arrival Date:', arrivalDate);
      console.log('🕐 Arrival Time:', arrivalTime);
      
      const request = arrival.transferRequest;
      
      // CRITICAL: Parse the allocated beds data
      let allocatedBedsData = [];
      if (request.allocated_beds_data) {
        try {
          allocatedBedsData = JSON.parse(request.allocated_beds_data);
          console.log('📋 Allocated beds data:', allocatedBedsData);
        } catch (e) {
          console.error('Failed to parse allocated_beds_data:', e);
        }
      }

      // Find the bed allocation for THIS specific person
      const bedAllocation = allocatedBedsData.find(
        allocation => allocation.personnel_id === arrival.person.id
      );

      console.log('🛏️ Bed allocation for this person:', bedAllocation);

      if (!bedAllocation) {
        alert('❌ No bed allocation found for this person!\n\nPlease go back and run Smart Allocation first.');
        setConfirmingId(null);
        return;
      }

      const allocatedBed = beds.find(b => b.id === bedAllocation.bed_id);
      
      if (!allocatedBed) {
        alert('❌ Allocated bed not found in database!');
        setConfirmingId(null);
        return;
      }

      console.log('🛏️ Allocated bed details:', allocatedBed);

      const oldBedId = arrival.person.bed_id;

      // Step 1: Update the BED entity
      const bedUpdate = {
        status: bedAllocation.is_temporary ? 'reserved' : 'occupied',
        ...(arrival.type === 'technician' 
          ? { technician_id: bedAllocation.is_temporary ? null : arrival.person.id }
          : { external_personnel_id: bedAllocation.is_temporary ? null : arrival.person.id }
        )
      };

      console.log('📝 Updating bed with:', bedUpdate);
      
      await updateBedMutation.mutateAsync({
        id: allocatedBed.id,
        data: bedUpdate
      });

      console.log('✅ Bed updated successfully');

      // Check if target camp is a Sonapur Exit camp
      const targetCamp = arrival.targetCamp;
      const isSonapurExitCamp = targetCamp && (
        (targetCamp.name?.toLowerCase().includes('sonapur') && targetCamp.name?.toLowerCase().includes('exit')) ||
        (targetCamp.code?.toLowerCase().includes('sonapur') && targetCamp.code?.toLowerCase().includes('exit'))
      );

      // Step 2: Update the PERSONNEL entity with bed_id, camp_id, status, and fingerprint attendance timestamp
      const personnelUpdate = {
        bed_id: allocatedBed.id,
        camp_id: request.target_camp_id,
        status: 'active',
        actual_arrival_date: arrivalDate,
        actual_arrival_time: arrivalTime,
        biometric_capture_date: biometricDate,
        last_transfer_date: arrivalDate,
        transfer_approved_by: currentUser?.id,
        reason_for_movement: request.reason_for_movement,
        // CRITICAL: Reset camp induction for new camp
        camp_induction_completed: false,
        camp_induction_date: null,
        camp_induction_time: null
      };

      // ADDED: If transferring to Sonapur Exit camp and person is a technician, set exit tracking fields
      if (isSonapurExitCamp && arrival.type === 'technician') {
        personnelUpdate.sonapur_exit_camp_id = request.target_camp_id;
        personnelUpdate.sonapur_exit_start_date = arrivalDate;
        personnelUpdate.exit_process_status = 'in_process';
        console.log('🚪 Sonapur Exit Camp detected - Setting exit tracking fields');
      }

      console.log('📝 Updating personnel with:', personnelUpdate);

      if (arrival.type === 'technician') {
        await updateTechnicianMutation.mutateAsync({
          id: arrival.person.id,
          data: personnelUpdate
        });
      } else {
        await updateExternalMutation.mutateAsync({
          id: arrival.person.id,
          data: personnelUpdate
        });
      }

      console.log('✅ Personnel updated successfully');

      // Step 2.5: CREATE TRANSFER LOG ENTRY - FIXED: Use source and target camp IDs from the transfer request
      const logData = {
        from_camp_id: request.source_camp_id,
        to_camp_id: request.target_camp_id,
        transfer_date: arrivalDate,
        transfer_time: arrivalTime,
        reason_for_movement: request.reason_for_movement,
        transfer_request_id: request.id,
        transferred_by: currentUser?.id,
        from_bed_id: oldBedId || null,
        to_bed_id: allocatedBed.id,
        notes: `Arrival confirmed via fingerprint attendance${isSonapurExitCamp && arrival.type === 'technician' ? ' • Exit process started' : ''}`
      };

      if (arrival.type === 'technician') {
        logData.technician_id = arrival.person.id;
      } else {
        logData.external_personnel_id = arrival.person.id;
      }

      await createTransferLogMutation.mutateAsync(logData);
      console.log('✅ Transfer log created successfully');

      // Step 3: Update transfer request status
      const remainingArrivals = pendingArrivals.filter(
        a => a.transferRequest.id === request.id && a.person.id !== arrival.person.id
      );

      const newStatus = remainingArrivals.length === 0 ? 'completed' : 'partially_arrived';

      console.log('📝 Updating transfer request status to:', newStatus);

      await updateTransferRequestMutation.mutateAsync({
        id: request.id,
        data: { status: newStatus }
      });

      console.log('✅ Transfer request updated successfully');

      // Step 4: Invalidate all queries
      await queryClient.invalidateQueries();

      const formatDisplayDate = (dateStr) => {
        try {
          const date = new Date(dateStr);
          const day = String(date.getDate()).padStart(2, '0');
          const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          const month = monthNames[date.getMonth()];
          const year = date.getFullYear();
          return `${day}/${month}/${year}`;
        } catch {
          return dateStr;
        }
      };

      alert(`✅ Fingerprint Attendance Captured!\n\n${arrival.person.full_name} confirmed at:\n📅 Date: ${formatDisplayDate(arrivalDate)}\n🕐 Time: ${arrivalTime}\n\nBed Assignment:\n• Camp: ${arrival.targetCamp?.name}\n• Floor: ${bedAllocation.floor_id ? floors.find(f => f.id === bedAllocation.floor_id)?.floor_number : 'N/A'}\n• Room: ${bedAllocation.room_id ? rooms.find(r => r.id === bedAllocation.room_id)?.room_number : 'N/A'}\n• Bed: ${allocatedBed.bed_number}${isSonapurExitCamp && arrival.type === 'technician' ? '\n\n🚪 Exit Process Started - Visible on Sonapur Exit Tracker' : ''}`);

      setShowArrivalDialog(false);
      setSelectedArrival(null);

    } catch (error) {
      console.error('❌ Confirmation failed:', error);
      alert(`❌ Failed to confirm arrival: ${error.message}\n\nPlease check the console for details.`);
    }

    setConfirmingId(null);
  };

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

  return (
    <div className="p-6 md:p-8 bg-gradient-to-br from-gray-50 to-blue-50 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-gradient-to-br from-green-600 to-teal-600 rounded-xl flex items-center justify-center">
              <Fingerprint className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Confirm Arrivals</h1>
              <p className="text-gray-600">Capture fingerprint attendance and complete bed allocation</p>
            </div>
          </div>
        </div>

        <Alert className="bg-blue-50 border-blue-200">
          <AlertCircle className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-900">
            <strong>📍 Step 3 of 4: Confirm Arrivals (Target Camp - Camp-Specific Access)</strong><br/>
            <span className="text-sm">After source camp dispatches → Personnel arrive at YOUR camp → Capture fingerprint + allocate beds → Status: "Active" → Next: Camp Induction (if required)</span>
          </AlertDescription>
        </Alert>

        {/* Summary Card */}
        <Card className="border-none shadow-lg bg-gradient-to-r from-green-50 to-teal-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Clock className="w-8 h-8 text-green-600" />
                <div>
                  <p className="text-sm text-gray-600">Pending Transfer Arrivals</p>
                  <p className="text-3xl font-bold text-gray-900">{sortedArrivals.length}</p>
                  <p className="text-sm text-gray-600">
                    {sortedArrivals.filter(a => a.type === 'technician').length} technicians, 
                    {sortedArrivals.filter(a => a.type === 'external').length} external
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Compact Filter Bar */}
        <Card className="border-none shadow-md">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-3">
              {/* Search Input */}
              <div className="flex-1 md:max-w-md relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search personnel..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-10 h-10"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Type Dropdown */}
              <Select value={filterTypeTop} onValueChange={setFilterTypeTop}>
                <SelectTrigger className="w-full md:w-40 h-10">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="technician">Technician</SelectItem>
                  <SelectItem value="external">External</SelectItem>
                </SelectContent>
              </Select>

              {/* Source Camp Dropdown */}
              <Select value={filterSourceCampTop} onValueChange={setFilterSourceCampTop}>
                <SelectTrigger className="w-full md:w-44 h-10">
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
                <SelectTrigger className="w-full md:w-44 h-10">
                  <SelectValue placeholder="All Target" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Target Camps</SelectItem>
                  {camps.map(camp => (
                    <SelectItem key={camp.id} value={camp.id}>{camp.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Active Filters Indicator */}
            {hasActiveFilters && (
              <div className="mt-3 flex items-center justify-between">
                <p className="text-xs text-gray-600">
                  {searchQuery && <span className="font-medium">Search: "{searchQuery}"</span>}
                  {(filterTypeTop !== 'all' || filterSourceCampTop !== 'all' || filterTargetCampTop !== 'all') && (
                    <span className="ml-2 text-blue-600 font-medium">
                      • {[
                        filterTypeTop !== 'all' && 'Type',
                        filterSourceCampTop !== 'all' && 'Source Camp',
                        filterTargetCampTop !== 'all' && 'Target Camp'
                      ].filter(Boolean).join(', ')} filtered
                    </span>
                  )}
                </p>
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



        {sortedArrivals.length === 0 ? (
          <Card className="border-none shadow-lg">
            <CardContent className="p-12 text-center">
              <Fingerprint className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-lg font-medium text-gray-700">
                {hasActiveFilters ? 'No arrivals match your filters' : 'No Pending Arrivals'}
              </p>
              <p className="text-sm text-gray-500 mt-2">
                {hasActiveFilters 
                  ? 'Try adjusting your search or filters'
                  : 'Personnel will appear here after they\'ve been dispatched from the source camp'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-none shadow-lg">
            {hasActiveFilters && (
              <div className="bg-blue-50 border-b border-blue-200 px-6 py-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-blue-700 font-medium">
                    <Filter className="w-4 h-4 inline mr-2" />
                    {searchQuery ? 'Global search + column filters active' : 'Column filters active'}
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

            <CardHeader className="bg-gradient-to-r from-green-50 to-teal-50 border-b">
              <CardTitle>Pending Transfer Arrivals ({sortedArrivals.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Actions</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                        <div className="flex items-center justify-between gap-2">
                          <span>Employee ID</span>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => handleSort('employee_id')}>
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
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
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
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                        <div className="flex items-center justify-between gap-2">
                          <span>Type</span>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => handleSort('type')}>
                              <ArrowUpDown className="w-3 h-3" />
                            </Button>
                            <ColumnFilter
                              values={uniqueTypes}
                              selected={filterType}
                              setSelected={setFilterType}
                              searchValue={searchType}
                              setSearchValue={setSearchType}
                            />
                          </div>
                        </div>
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
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
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                        <div className="flex items-center justify-between gap-2">
                          <span>From Camp</span>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => handleSort('source_camp')}>
                              <ArrowUpDown className="w-3 h-3" />
                            </Button>
                            <ColumnFilter
                              values={uniqueSourceCamps}
                              selected={filterSourceCamp}
                              setSelected={setFilterSourceCamp}
                              searchValue={searchSourceCamp}
                              setSearchValue={setSearchSourceCamp}
                            />
                          </div>
                        </div>
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                        <div className="flex items-center justify-between gap-2">
                          <span>To Camp</span>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => handleSort('target_camp')}>
                              <ArrowUpDown className="w-3 h-3" />
                            </Button>
                            <ColumnFilter
                              values={uniqueTargetCamps}
                              selected={filterTargetCamp}
                              setSelected={setFilterTargetCamp}
                              searchValue={searchTargetCamp}
                              setSearchValue={setSearchTargetCamp}
                            />
                          </div>
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {sortedArrivals.map((arrival, index) => (
                      <tr key={arrival.person.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-6 py-4">
                          <Button
                            size="sm"
                            onClick={() => handleOpenDialog(arrival)}
                            disabled={confirmingId === arrival.person.id}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <Fingerprint className="w-4 h-4 mr-2" />
                            {confirmingId === arrival.person.id ? 'Confirming...' : 'Confirm'}
                          </Button>
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-blue-600">
                          {arrival.person.employee_id || '-'}
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">
                          {arrival.person.full_name}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <Badge variant={arrival.type === 'technician' ? 'default' : 'secondary'}>
                            {arrival.type}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700">
                          {arrival.person.nationality || '-'}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-orange-600" />
                            <span className="text-orange-700 font-medium">{arrival.sourceCamp?.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-green-600" />
                            <span className="text-green-700 font-medium">{arrival.targetCamp?.name}</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Arrival Confirmation Dialog */}
        {showArrivalDialog && selectedArrival && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-3xl max-h-[90vh] overflow-y-auto">
              <CardHeader className="bg-gradient-to-r from-green-50 to-teal-50 border-b">
                <CardTitle className="flex items-center gap-2">
                  <Fingerprint className="w-5 h-5 text-green-600" />
                  Confirm Arrival - {selectedArrival.person.full_name}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Actual Arrival Date*</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left font-normal">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {format(arrivalFormData.actual_arrival_date, 'dd/MMM/yyyy')}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={arrivalFormData.actual_arrival_date}
                          onSelect={(date) => setArrivalFormData({ ...arrivalFormData, actual_arrival_date: date })}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="arrival-time" className="text-sm font-medium">Actual Arrival Time*</Label>
                    <Input
                      id="arrival-time"
                      type="time"
                      value={arrivalFormData.actual_arrival_time}
                      onChange={(e) => setArrivalFormData({ ...arrivalFormData, actual_arrival_time: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Biometric Capture Date*</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <Fingerprint className="mr-2 h-4 w-4" />
                        {format(arrivalFormData.biometric_capture_date, 'dd/MMM/yyyy')}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={arrivalFormData.biometric_capture_date}
                        onSelect={(date) => setArrivalFormData({ ...arrivalFormData, biometric_capture_date: date })}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Display Emergency Contact & Legal Nominee (Read-only from Onboarding) */}
                {selectedArrival.type === 'technician' && (selectedArrival.person.emergency_contact_no || selectedArrival.person.legal_nominee_name) && (
                  <div className="border-t pt-4 mt-4">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">Emergency Contact & Legal Nominee</h3>
                    <div className="bg-gray-50 rounded-lg p-4 space-y-3 text-sm">
                      {selectedArrival.person.emergency_contact_no && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Emergency Contact:</span>
                          <span className="font-medium text-gray-900">
                            {selectedArrival.person.emergency_contact_no}
                            {selectedArrival.person.emergency_contact_no_relationship && (
                              <span className="text-xs text-gray-500 ml-2">({selectedArrival.person.emergency_contact_no_relationship})</span>
                            )}
                          </span>
                        </div>
                      )}
                      {selectedArrival.person.emergency_contact_no_2 && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Emergency Contact 2:</span>
                          <span className="font-medium text-gray-900">
                            {selectedArrival.person.emergency_contact_no_2}
                            {selectedArrival.person.emergency_contact_no_2_relationship && (
                              <span className="text-xs text-gray-500 ml-2">({selectedArrival.person.emergency_contact_no_2_relationship})</span>
                            )}
                          </span>
                        </div>
                      )}
                      {selectedArrival.person.legal_nominee_name && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Legal Nominee:</span>
                          <span className="font-medium text-gray-900">
                            {selectedArrival.person.legal_nominee_name}
                            {selectedArrival.person.nominee_relationship && (
                              <span className="text-xs text-gray-500 ml-2">({selectedArrival.person.nominee_relationship})</span>
                            )}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

              </CardContent>
              <div className="p-6 border-t bg-gray-50 flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowArrivalDialog(false);
                    setSelectedArrival(null);
                  }}
                  disabled={confirmingId === selectedArrival.person.id}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleConfirmArrival}
                  disabled={confirmingId === selectedArrival.person.id}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Fingerprint className="w-4 h-4 mr-2" />
                  {confirmingId === selectedArrival.person.id ? 'Confirming...' : 'Confirm Arrival'}
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}