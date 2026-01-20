import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ArrowLeftRight, Users, CheckCircle2, AlertCircle, Download, Printer, ArrowUpDown, Filter, X } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export default function BulkTransfer() {
  const [selectedPersonnelType, setSelectedPersonnelType] = useState('technician');
  const [sourceCamp, setSourceCamp] = useState("");
  const [targetCamp, setTargetCamp] = useState("");
  const [transferDate, setTransferDate] = useState(new Date().toISOString().split('T')[0]);
  const [transferTime, setTransferTime] = useState("14:30");
  const [reasonForMovement, setReasonForMovement] = useState("");
  const [selectedTechnicians, setSelectedTechnicians] = useState([]);
  const [selectedExternal, setSelectedExternal] = useState([]);
  const [transferring, setTransferring] = useState(false);
  const [transferResult, setTransferResult] = useState(null);
  const [sortField, setSortField] = useState("employee_id");
  const [sortDirection, setSortDirection] = useState("asc");

  // Excel-style column filters
  const [filterEmployeeId, setFilterEmployeeId] = useState([]);
  const [filterFullName, setFilterFullName] = useState([]);
  const [filterNationality, setFilterNationality] = useState([]);
  const [filterEthnicity, setFilterEthnicity] = useState([]);
  const [filterTrade, setFilterTrade] = useState([]);
  const [filterDepartment, setFilterDepartment] = useState([]);
  const [filterCurrentCamp, setFilterCurrentCamp] = useState([]);
  const [filterStatus, setFilterStatus] = useState([]);

  // Search states for column filters
  const [searchEmployeeId, setSearchEmployeeId] = useState("");
  const [searchFullName, setSearchFullName] = useState("");
  const [searchNationality, setSearchNationality] = useState("");
  const [searchEthnicity, setSearchEthnicity] = useState("");
  const [searchTrade, setSearchTrade] = useState("");
  const [searchDepartment, setSearchDepartment] = useState("");
  const [searchCurrentCamp, setSearchCurrentCamp] = useState("");
  const [searchStatus, setSearchStatus] = useState("");

  const queryClient = useQueryClient();

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

  const createTransferLogMutation = useMutation({
    mutationFn: (data) => base44.entities.TechnicianTransferLog.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transfer-logs'] });
    }
  });

  // Find Sajja camp for special conditions
  const sajjaCamp = camps.find(c => c.code?.toLowerCase() === 'sajja' || c.name?.toLowerCase().includes('sajja'));

  // ADDED: Find Sonapur Exit camp(s)
  const sonapurExitCamps = camps.filter(camp => {
    const nameMatch = camp.name?.toLowerCase().includes('sonapur') && camp.name?.toLowerCase().includes('exit');
    const codeMatch = camp.code?.toLowerCase().includes('sonapur') && camp.code?.toLowerCase().includes('exit');
    return nameMatch || codeMatch;
  });

  // MODIFIED: Filter technicians - exclude Sajja pre-induction technicians
  const eligibleTechnicians = technicians.filter(t => {
    // Must be in source camp and active
    if (t.camp_id !== sourceCamp || t.status !== 'active') return false;
    
    // ADDED: If in Sajja Camp, must have completed induction
    if (sajjaCamp && t.camp_id === sajjaCamp.id) {
      // Only allow transfer if induction is completed
      if (t.induction_status !== 'induction_completed') return false;
    }
    
    return true;
  });

  // MODIFIED: Filter external personnel - exclude Sajja camp if needed
  const eligibleExternal = externalPersonnel.filter(e => {
    if (e.camp_id !== sourceCamp || e.status !== 'active') return false;
    
    // External personnel from Sajja can be transferred (no induction requirement)
    return true;
  });

  const currentList = selectedPersonnelType === 'technician' ? eligibleTechnicians : eligibleExternal;

  // Apply column filters
  let filteredPersonnel = currentList.filter(person => {
    const camp = camps.find(c => c.id === person.camp_id);
    
    if (selectedPersonnelType === 'technician') {
      if (filterEmployeeId.length > 0 && !filterEmployeeId.includes(person.employee_id || '-')) return false;
      if (filterFullName.length > 0 && !filterFullName.includes(person.full_name || '-')) return false;
      if (filterNationality.length > 0 && !filterNationality.includes(person.nationality || '-')) return false;
      if (filterEthnicity.length > 0 && !filterEthnicity.includes(person.ethnicity || '-')) return false;
      if (filterTrade.length > 0 && !filterTrade.includes(person.trade || '-')) return false;
      if (filterDepartment.length > 0 && !filterDepartment.includes(person.department || '-')) return false;
      if (filterCurrentCamp.length > 0 && !filterCurrentCamp.includes(camp?.name || '-')) return false;
      if (filterStatus.length > 0 && !filterStatus.includes(person.status || '-')) return false;
    } else {
      if (filterFullName.length > 0 && !filterFullName.includes(person.full_name || '-')) return false;
      if (filterNationality.length > 0 && !filterNationality.includes(person.nationality || '-')) return false;
      if (filterEthnicity.length > 0 && !filterEthnicity.includes(person.ethnicity || '-')) return false;
      if (filterCurrentCamp.length > 0 && !filterCurrentCamp.includes(camp?.name || '-')) return false;
      if (filterStatus.length > 0 && !filterStatus.includes(person.status || '-')) return false;
    }

    return true;
  });

  // Sort
  const sortedPersonnel = [...filteredPersonnel].sort((a, b) => {
    const aVal = a[sortField] || '';
    const bVal = b[sortField] || '';

    if (sortDirection === 'asc') {
      return aVal > bVal ? 1 : -1;
    } else {
      return aVal < bVal ? 1 : -1;
    }
  });

  // Get unique values for filters
  const uniqueEmployeeIds = [...new Set(currentList.map(t => t.employee_id || '-'))].sort();
  const uniqueFullNames = [...new Set(currentList.map(t => t.full_name || '-'))].sort();
  const uniqueNationalities = [...new Set(currentList.map(t => t.nationality || '-'))].sort();
  const uniqueEthnicities = [...new Set(currentList.map(t => t.ethnicity || '-'))].sort();
  const uniqueTrades = [...new Set(currentList.map(t => t.trade || '-'))].sort();
  const uniqueDepartments = [...new Set(currentList.map(t => t.department || '-'))].sort();
  const uniqueCamps = [...new Set(currentList.map(t => {
    const camp = camps.find(c => c.id === t.camp_id);
    return camp?.name || '-';
  }))].sort();
  const uniqueStatuses = [...new Set(currentList.map(t => t.status || '-'))].sort();

  // Validate if date is Tuesday (2) or Sunday (0)
  const isValidTransferDay = (dateString) => {
    if (!dateString) return false;
    const date = new Date(dateString);
    const day = date.getDay();
    return day === 0 || day === 2;
  };

  // Validate if time is between 14:30 and 18:30
  const isValidTransferTime = (timeString) => {
    if (!timeString) return false;
    const [hours, minutes] = timeString.split(':').map(Number);
    const timeInMinutes = hours * 60 + minutes;
    const startTime = 14 * 60 + 30; // 2:30 PM
    const endTime = 18 * 60 + 30; // 6:30 PM
    return timeInMinutes >= startTime && timeInMinutes <= endTime;
  };

  const getNextValidTransferDates = () => {
    const dates = [];
    const today = new Date();
    
    // Iterate for a reasonable number of days to find enough valid dates
    for (let i = 0; i < 30; i++) { 
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const day = date.getDay(); // 0 for Sunday, 1 for Monday, ..., 6 for Saturday
      
      if (day === 0 || day === 2) { // Sunday or Tuesday
        dates.push(date.toISOString().split('T')[0]);
      }
      
      if (dates.length >= 8) break; // Get at least 8 upcoming valid dates
    }
    
    return dates;
  };

  const validTransferDates = getNextValidTransferDates();

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleSelectAll = () => {
    if (selectedPersonnelType === 'technician') {
      if (selectedTechnicians.length === sortedPersonnel.length) {
        setSelectedTechnicians([]);
      } else {
        setSelectedTechnicians(sortedPersonnel.map(t => t.id));
      }
    } else {
      if (selectedExternal.length === sortedPersonnel.length) {
        setSelectedExternal([]);
      } else {
        setSelectedExternal(sortedPersonnel.map(e => e.id));
      }
    }
  };

  const handleBulkTransfer = async () => {
    const selectedList = selectedPersonnelType === 'technician' 
      ? selectedTechnicians 
      : selectedExternal;

    if (selectedList.length === 0) {
      alert("Please select at least one person to transfer");
      return;
    }

    if (!sourceCamp || !targetCamp) {
      alert("Please select both source and target camps");
      return;
    }

    if (sourceCamp === targetCamp) {
      alert("Source and target camps must be different");
      return;
    }

    if (!reasonForMovement.trim()) {
      alert("⚠️ Please provide a reason for this transfer");
      return;
    }

    if (!isValidTransferDay(transferDate)) {
      alert("⚠️ Transfers can only be scheduled for Tuesday or Sunday");
      return;
    }

    if (!isValidTransferTime(transferTime)) {
      alert("⚠️ Transfer time must be between 2:30 PM (14:30) and 6:30 PM (18:30)");
      return;
    }

    const dayName = new Date(transferDate).toLocaleDateString('en-US', { weekday: 'long' });

    // ADDED: Check if target camp is a Sonapur Exit camp
    const targetCampData = camps.find(c => c.id === targetCamp);
    const isTransferToSonapurExit = sonapurExitCamps.some(c => c.id === targetCamp);

    const confirmTransfer = window.confirm(
      `Are you sure you want to transfer ${selectedList.length} ${selectedPersonnelType === 'technician' ? 'technician(s)' : 'external personnel'}?\n\n` +
      `From: ${camps.find(c => c.id === sourceCamp)?.name}\n` +
      `To: ${targetCampData?.name}\n\n` +
      `Reason: ${reasonForMovement}\n` +
      `Scheduled: ${dayName}, ${transferDate} at ${transferTime}\n\n` +
      `This will mark the transfer as "Pending Approval" by a camp manager.${isTransferToSonapurExit && selectedPersonnelType === 'technician' ? '\n\n🚪 Exit Process: Technicians will be automatically added to Sonapur Exit Tracker upon arrival confirmation.' : ''}`
    );

    if (!confirmTransfer) return;

    setTransferring(true);
    setTransferResult(null);

    try {
      let successCount = 0;
      let errorCount = 0;
      const errors = [];

      for (const personId of selectedList) {
        let person = null;
        try {
          person = selectedPersonnelType === 'technician'
            ? technicians.find(t => t.id === personId)
            : externalPersonnel.find(e => e.id === personId);

          if (!person) {
            errors.push(`Person ID ${personId}: Not found`);
            errorCount++;
            continue;
          }

          const oldBedId = person.bed_id;
          const oldCampId = person.camp_id;

          // Free up current bed if occupied
          if (person.bed_id) {
            await updateBedMutation.mutateAsync({
              id: person.bed_id,
              data: {
                status: 'available',
                technician_id: null,
                external_personnel_id: null
              }
            });
          }

          // Update person - remove bed, change camp, set transfer date, clear approval
          const updateData = {
            camp_id: targetCamp,
            bed_id: null,
            last_transfer_date: transferDate,
            transfer_approved_by: null,
            reason_for_movement: reasonForMovement
          };

          // ADDED: If transferring to Sonapur Exit camp and person is a technician, set exit tracking fields
          if (isTransferToSonapurExit && selectedPersonnelType === 'technician') {
            updateData.sonapur_exit_camp_id = targetCamp;
            updateData.sonapur_exit_start_date = transferDate;
            updateData.exit_process_status = 'in_process';
          }

          if (selectedPersonnelType === 'technician') {
            await updateTechnicianMutation.mutateAsync({
              id: personId,
              data: updateData
            });
          } else {
            await updateExternalMutation.mutateAsync({
              id: personId,
              data: updateData
            });
          }

          // CREATE TRANSFER LOG ENTRY
          const logData = {
            from_camp_id: oldCampId,
            to_camp_id: targetCamp,
            transfer_date: transferDate,
            transfer_time: transferTime,
            reason_for_movement: reasonForMovement,
            transferred_by: currentUser?.id,
            from_bed_id: oldBedId || null,
            to_bed_id: null,
            notes: `Bulk transfer - Pending approval${isTransferToSonapurExit && selectedPersonnelType === 'technician' ? ' • Exit process started' : ''}`
          };

          if (selectedPersonnelType === 'technician') {
            logData.technician_id = personId;
          } else {
            logData.external_personnel_id = personId;
          }

          await createTransferLogMutation.mutateAsync(logData);

          successCount++;
        } catch (err) {
          errorCount++;
          errors.push(`${person?.full_name || personId}: ${err.message}`);
        }
      }

      setTransferResult({
        success: true,
        transferred: successCount,
        failed: errorCount,
        errors: errors
      });

      if (selectedPersonnelType === 'technician') {
        setSelectedTechnicians([]);
      } else {
        setSelectedExternal([]);
      }

      if (successCount > 0) {
        alert(`Successfully transferred ${successCount} ${selectedPersonnelType === 'technician' ? 'technician(s)' : 'external personnel'} from ${camps.find(c => c.id === sourceCamp)?.name} to ${targetCampData?.name}.\n\nStatus: Pending Approval\n\nCamp managers can approve these transfers in the "Pending Transfers" page.${isTransferToSonapurExit && selectedPersonnelType === 'technician' ? '\n\n🚪 Exit tracking has been initiated for all transferred technicians.' : ''}`);
      }

      if (errorCount > 0) {
        alert(`Failed to transfer ${errorCount} person(s). Check details below.`);
      }

    } catch (error) {
      setTransferResult({
        success: false,
        message: `Transfer failed: ${error.message}`
      });
    }

    setTransferring(false);
  };

  const clearAllFilters = () => {
    setFilterEmployeeId([]);
    setFilterFullName([]);
    setFilterNationality([]);
    setFilterEthnicity([]);
    setFilterTrade([]);
    setFilterDepartment([]);
    setFilterCurrentCamp([]);
    setFilterStatus([]);
  };

  const hasActiveFilters = filterEmployeeId.length > 0 || filterFullName.length > 0 ||
    filterNationality.length > 0 || filterEthnicity.length > 0 || filterTrade.length > 0 ||
    filterDepartment.length > 0 || filterCurrentCamp.length > 0 || filterStatus.length > 0;

  // Count blocked technicians at Sajja for the alert
  const blockedTechniciansAtSajja = technicians.filter(t => 
    sourceCamp && sajjaCamp && t.camp_id === sourceCamp &&
    t.camp_id === sajjaCamp.id &&
    t.status === 'active' &&
    t.induction_status !== 'induction_completed'
  );

  // Column Filter Component
  const ColumnFilter = ({ values, selected, setSelected, searchValue, setSearchValue }) => {
    const filteredValues = values.filter(v =>
      v.toLowerCase().includes(searchValue.toLowerCase())
    );

    const toggleValue = (value) => {
      setSelected(prev =>
        prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
      );
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
          <div className="p-2 border-b">
            <Input
              placeholder="Search..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              className="h-8"
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
              <div className="text-center text-sm text-gray-500 py-2">No results</div>
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
                className="w-full"
                onClick={() => setSelected([])}
              >
                Clear Filter
              </Button>
            </div>
          )}
        </PopoverContent>
      </Popover>
    );
  };

  const exportToCSV = () => {
    const headers = selectedPersonnelType === 'technician' 
      ? ['Employee ID', 'Full Name', 'Nationality', 'Ethnicity', 'Trade', 'Department', 'Current Camp', 'Status']
      : ['Full Name', 'Company', 'Role', 'Nationality', 'Ethnicity', 'Current Camp', 'Status'];
    
    const rows = sortedPersonnel.map(person => {
      const camp = camps.find(c => c.id === person.camp_id);
      
      if (selectedPersonnelType === 'technician') {
        return [
          person.employee_id || '-',
          person.full_name,
          person.nationality || '-',
          person.ethnicity || '-',
          person.trade || '-',
          person.department || '-',
          camp?.name || '-',
          person.status || '-'
        ];
      } else {
        return [
          person.full_name,
          person.company_name || '-',
          person.role || '-',
          person.nationality || '-',
          person.ethnicity || '-',
          camp?.name || '-',
          person.status || '-'
        ];
      }
    });

    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `bulk_transfer_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const printReport = () => {
    window.print();
  };

  const currentSelected = selectedPersonnelType === 'technician' ? selectedTechnicians : selectedExternal;

  return (
    <div className="p-6 md:p-8 bg-gray-50 min-h-screen">
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-section,
          #printable-section * {
            visibility: visible;
          }
          #printable-section {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="max-w-[1800px] mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 no-print">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Bulk Transfer</h1>
            <p className="text-gray-600 mt-1">Transfer multiple personnel between camps</p>
          </div>
        </div>

        {/* Personnel Type Selection */}
        <Card className="border-none shadow-lg bg-white no-print">
          <CardContent className="p-6">
            <Label className="text-base font-semibold mb-3 block">Select Personnel Type to Transfer</Label>
            <div className="grid md:grid-cols-2 gap-4">
              <Button
                variant={selectedPersonnelType === 'technician' ? 'default' : 'outline'}
                onClick={() => {
                  setSelectedPersonnelType('technician');
                  setSelectedExternal([]);
                  setTransferResult(null);
                  clearAllFilters();
                }}
                className="flex-1 h-12"
              >
                <Users className="w-4 h-4 mr-2" />
                Technicians
              </Button>
              <Button
                variant={selectedPersonnelType === 'external' ? 'default' : 'outline'}
                onClick={() => {
                  setSelectedPersonnelType('external');
                  setSelectedTechnicians([]);
                  setTransferResult(null);
                  clearAllFilters();
                }}
                className="flex-1 h-12"
              >
                <Users className="w-4 h-4 mr-2" />
                External Personnel
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Transfer Schedule Info Alert */}
        <Alert className="bg-blue-50 border-l-4 border-l-blue-600 no-print">
          <AlertCircle className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-900">
            <strong>Transfer Schedule Policy:</strong> Camp-to-camp transfers are only allowed on <strong>Tuesday and Sunday</strong>, between <strong>2:30 PM (14:30) and 6:30 PM (18:30)</strong>.
          </AlertDescription>
        </Alert>

        {/* ADDED: Alert if transferring from Sajja and technicians are blocked */}
        {sajjaCamp && sourceCamp === sajjaCamp.id && blockedTechniciansAtSajja.length > 0 && selectedPersonnelType === 'technician' && (
          <Alert className="border-l-4 border-l-orange-600 bg-orange-50 no-print">
            <AlertCircle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-800">
              <strong>Sajja Camp Transfer Policy:</strong> {blockedTechniciansAtSajja.length} technician(s) are excluded from transfer selection because they haven't completed their pre-induction period. 
              Only technicians with <strong>induction_completed</strong> status can be transferred out of Sajja Camp.
            </AlertDescription>
          </Alert>
        )}

        {/* Transfer Configuration */}
        <Card className="border-none shadow-lg bg-white no-print">
          <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-purple-50">
            <CardTitle>Transfer Configuration</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid md:grid-cols-4 gap-6">
              <div className="space-y-2">
                <Label htmlFor="source-camp">Filter Source Camp*</Label>
                <Select value={sourceCamp} onValueChange={(value) => {
                  setSourceCamp(value);
                  setSelectedTechnicians([]);
                  setSelectedExternal([]);
                  setTransferResult(null);
                  clearAllFilters();
                }}>
                  <SelectTrigger id="source-camp">
                    <SelectValue placeholder="Select source camp..." />
                  </SelectTrigger>
                  <SelectContent>
                    {camps.map(camp => (
                      <SelectItem key={camp.id} value={camp.id}>
                        {camp.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-center">
                <ArrowLeftRight className="w-6 h-6 text-blue-600 mt-6" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="target-camp">Target Camp*</Label>
                <Select value={targetCamp} onValueChange={setTargetCamp}>
                  <SelectTrigger id="target-camp">
                    <SelectValue placeholder="Select target camp..." />
                  </SelectTrigger>
                  <SelectContent>
                    {camps.filter(c => c.id !== sourceCamp).map(camp => (
                      <SelectItem key={camp.id} value={camp.id}>
                        {camp.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="mt-6 grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="transfer-date">Transfer Date* (Tuesday/Sunday only)</Label>
                <Select value={transferDate} onValueChange={setTransferDate}>
                  <SelectTrigger id="transfer-date">
                    <SelectValue placeholder="Select date..." />
                  </SelectTrigger>
                  <SelectContent>
                    {validTransferDates.map(date => {
                      const dateObj = new Date(date);
                      const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
                      const formatted = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                      return (
                        <SelectItem key={date} value={date}>
                          {dayName}, {formatted}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="transfer-time">Transfer Time* (2:30 PM - 6:30 PM)</Label>
                <Select value={transferTime} onValueChange={setTransferTime}>
                  <SelectTrigger id="transfer-time">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="14:30">2:30 PM (14:30)</SelectItem>
                    <SelectItem value="15:00">3:00 PM (15:00)</SelectItem>
                    <SelectItem value="15:30">3:30 PM (15:30)</SelectItem>
                    <SelectItem value="16:00">4:00 PM (16:00)</SelectItem>
                    <SelectItem value="16:30">4:30 PM (16:30)</SelectItem>
                    <SelectItem value="17:00">5:00 PM (17:00)</SelectItem>
                    <SelectItem value="17:30">5:30 PM (17:30)</SelectItem>
                    <SelectItem value="18:00">6:00 PM (18:00)</SelectItem>
                    <SelectItem value="18:30">6:30 PM (18:30)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="mt-4">
              <Label htmlFor="reason">Reason for Transfer*</Label>
              <Select value={reasonForMovement} onValueChange={setReasonForMovement}>
                <SelectTrigger id="reason">
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

            <div className="mt-6 flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-600" />
                <span className="font-medium">{currentSelected.length} {selectedPersonnelType === 'technician' ? 'technician(s)' : 'external personnel'} selected</span>
              </div>
              <div className="text-gray-500">•</div>
              <div className="flex items-center gap-2">
                <span className="text-gray-600">Available for selection: {sortedPersonnel.length}</span>
              </div>
              {targetCamp && (
                <>
                  <div className="text-gray-500">•</div>
                  <div className="flex items-center gap-2 bg-orange-50 px-3 py-1 rounded-full">
                    <AlertCircle className="w-4 h-4 text-orange-600" />
                    <span className="text-orange-700 font-medium">Approval Status: Pending Approval</span>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Transfer Result Alert */}
        {transferResult && (
          <Alert variant={transferResult.success ? "default" : "destructive"} className="no-print">
            <AlertDescription>
              {transferResult.success ? (
                <div>
                  <CheckCircle2 className="w-5 h-5 inline mr-2" />
                  Successfully transferred {transferResult.transferred} {selectedPersonnelType === 'technician' ? 'technician(s)' : 'external personnel'}
                  {transferResult.failed > 0 && ` (${transferResult.failed} failed)`}
                  {transferResult.errors.length > 0 && (
                    <div className="mt-2 text-sm">
                      <strong>Errors:</strong>
                      <ul className="list-disc pl-5 mt-1">
                        {transferResult.errors.map((err, idx) => (
                          <li key={idx}>{err}</li>
                        ))}
                      </ul>
                    </div>
              )}
                </div>
              ) : (
                <div>
                  <AlertCircle className="w-5 h-5 inline mr-2" />
                  {transferResult.message}
                </div>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Table */}
        {sourceCamp && (
          <Card className="border-none shadow-lg overflow-hidden" id="printable-section">
            {hasActiveFilters && (
              <div className="bg-blue-50 border-b border-blue-200 px-6 py-3 no-print">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-blue-700 font-medium">
                    <Filter className="w-4 h-4 inline mr-2" />
                    Column filters active
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

            <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50 border-b">
              <div className="flex items-center justify-between">
                <CardTitle>Select {selectedPersonnelType === 'technician' ? 'Technicians' : 'External Personnel'} ({sortedPersonnel.length})</CardTitle>
                <div className="flex gap-2 no-print">
                  <Button variant="outline" size="sm" onClick={exportToCSV}>
                    <Download className="w-4 h-4 mr-2" />
                    Export
                  </Button>
                  <Button variant="outline" size="sm" onClick={printReport}>
                    <Printer className="w-4 h-4 mr-2" />
                    Print
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSelectAll}
                  >
                    {currentSelected.length === sortedPersonnel.length ? 'Deselect All' : `Select All (${sortedPersonnel.length})`}
                  </Button>
                </div>
              </div>
            </CardHeader>

            <div className="overflow-x-auto">
              {sortedPersonnel.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-lg font-medium text-gray-500">No personnel found in selected camp</p>
                </div>
              ) : (
                <table className="w-full border-collapse bg-white">
                  <thead>
                    <tr className="border-b-2 border-gray-300">
                      <th className="px-4 py-3 text-left bg-gray-50 border-r border-gray-200 no-print">
                        <Checkbox
                          checked={currentSelected.length === sortedPersonnel.length && sortedPersonnel.length > 0}
                          onCheckedChange={handleSelectAll}
                        />
                      </th>
                      {selectedPersonnelType === 'technician' && (
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                          <div className="flex items-center justify-between gap-2">
                            <span>Employee ID</span>
                            <div className="flex gap-1 no-print">
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
                      )}
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                        <div className="flex items-center justify-between gap-2">
                          <span>Full Name</span>
                          <div className="flex gap-1 no-print">
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
                          <div className="flex gap-1 no-print">
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
                          <span>Ethnicity</span>
                          <div className="flex gap-1 no-print">
                            <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => handleSort('ethnicity')}>
                              <ArrowUpDown className="w-3 h-3" />
                            </Button>
                            <ColumnFilter
                              values={uniqueEthnicities}
                              selected={filterEthnicity}
                              setSelected={setFilterEthnicity}
                              searchValue={searchEthnicity}
                              setSearchValue={setSearchEthnicity}
                            />
                          </div>
                        </div>
                      </th>
                      {selectedPersonnelType === 'technician' ? (
                        <>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                            <div className="flex items-center justify-between gap-2">
                              <span>Trade</span>
                              <div className="flex gap-1 no-print">
                                <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => handleSort('trade')}>
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
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                            <div className="flex items-center justify-between gap-2">
                              <span>Department</span>
                              <div className="flex gap-1 no-print">
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
                        </>
                      ) : (
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                          <span>Company / Role</span>
                        </th>
                      )}
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                        <div className="flex items-center justify-between gap-2">
                          <span>Current Camp</span>
                          <ColumnFilter
                            values={uniqueCamps}
                            selected={filterCurrentCamp}
                            setSelected={setFilterCurrentCamp}
                            searchValue={searchCurrentCamp}
                            setSearchValue={setSearchCurrentCamp}
                          />
                        </div>
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                        <div className="flex items-center justify-between gap-2">
                          <span>Status</span>
                          <div className="flex gap-1 no-print">
                            <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => handleSort('status')}>
                              <ArrowUpDown className="w-3 h-3" />
                            </Button>
                            <ColumnFilter
                              values={uniqueStatuses}
                              selected={filterStatus}
                              setSelected={setFilterStatus}
                              searchValue={searchStatus}
                              setSearchValue={setSearchStatus}
                            />
                          </div>
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedPersonnel.map((person, index) => {
                      const camp = camps.find(c => c.id === person.camp_id);
                      const isSelected = currentSelected.includes(person.id);

                      return (
                        <tr
                          key={person.id}
                          className={`border-b border-gray-200 hover:bg-blue-50 transition-colors cursor-pointer ${
                            index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                          } ${isSelected ? 'bg-blue-50' : ''}`}
                          onClick={() => {
                            if (selectedPersonnelType === 'technician') {
                              setSelectedTechnicians(prev =>
                                prev.includes(person.id)
                                  ? prev.filter(id => id !== person.id)
                                  : [...prev, person.id]
                              );
                            } else {
                              setSelectedExternal(prev =>
                                prev.includes(person.id)
                                  ? prev.filter(id => id !== person.id)
                                  : [...prev, person.id]
                              );
                            }
                          }}
                        >
                          <td className="px-4 py-3 text-sm border-r border-gray-200 no-print">
                            <Checkbox checked={isSelected} />
                          </td>
                          {selectedPersonnelType === 'technician' && (
                            <td className="px-4 py-3 text-sm font-medium text-blue-600 border-r border-gray-200 whitespace-nowrap">
                              {person.employee_id}
                            </td>
                          )}
                          <td className="px-4 py-3 text-sm text-gray-900 border-r border-gray-200 whitespace-nowrap font-medium">
                            {person.full_name}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700 border-r border-gray-200 whitespace-nowrap">
                            {person.nationality || '-'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700 border-r border-gray-200 whitespace-nowrap">
                            {person.ethnicity || '-'}
                          </td>
                          {selectedPersonnelType === 'technician' ? (
                            <>
                              <td className="px-4 py-3 text-sm text-gray-700 border-r border-gray-200 whitespace-nowrap">
                                {person.trade || '-'}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-700 border-r border-gray-200 whitespace-nowrap">
                                {person.department || '-'}
                              </td>
                            </>
                          ) : (
                            <td className="px-4 py-3 text-sm text-gray-700 border-r border-gray-200 whitespace-nowrap">
                              {person.company_name || '-'} / {person.role || '-'}
                            </td>
                          )}
                          <td className="px-4 py-3 text-sm text-gray-700 border-r border-gray-200 whitespace-nowrap">
                            {camp?.name || '-'}
                          </td>
                          <td className="px-4 py-3 text-sm border-r border-gray-200 whitespace-nowrap">
                            <Badge variant="default" className="text-xs">
                              {person.status?.replace(/_/g, ' ')}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
              <p className="text-sm text-gray-600">
                Showing <span className="font-semibold">{sortedPersonnel.length}</span> of {currentList.length} {selectedPersonnelType === 'technician' ? 'technicians' : 'external personnel'}
              </p>
            </div>
          </Card>
        )}

        {/* Submit Button */}
        {sourceCamp && targetCamp && currentSelected.length > 0 && (
          <div className="flex justify-end no-print">
            <Button
              onClick={handleBulkTransfer}
              disabled={transferring}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              size="lg"
            >
              <ArrowLeftRight className="w-5 h-5 mr-2" />
              {transferring ? 'Transferring...' : `Submit Transfer (Pending Approval)`}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}