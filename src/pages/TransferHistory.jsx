import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { History, ArrowRight, Building2, Calendar, User, Search, Download, Filter, X, ArrowUpDown, GraduationCap, CheckCircle2, AlertCircle } from "lucide-react";
import { format, parseISO } from "date-fns";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Helper functions defined at the top
const getReasonLabel = (reason) => {
  const labels = {
    'onboarding_transfer': 'Onboarding Transfer',
    'project_transfer': 'Project Transfer',
    'roommate_issue': 'Roommate Issue',
    'camp_environment': 'Camp Environment',
    'urgent_requirement': 'Urgent Requirement',
    'camp_closure': 'Camp Closure',
    'skill_requirement': 'Skill Requirement',
    'personal_request': 'Personal Request',
    'disciplinary': 'Disciplinary',
    'exit_case': 'Exit Case',
    'other': 'Other'
  };
  return labels[reason] || reason || '-';
};

const getReasonColor = (reason) => {
  const colors = {
    'onboarding_transfer': 'bg-blue-100 text-blue-700',
    'project_transfer': 'bg-purple-100 text-purple-700',
    'roommate_issue': 'bg-orange-100 text-orange-700',
    'camp_environment': 'bg-yellow-100 text-yellow-700',
    'urgent_requirement': 'bg-red-100 text-red-700',
    'camp_closure': 'bg-gray-100 text-gray-700',
    'skill_requirement': 'bg-green-100 text-green-700',
    'personal_request': 'bg-indigo-100 text-indigo-700',
    'disciplinary': 'bg-red-100 text-red-700',
    'exit_case': 'bg-pink-100 text-pink-700',
    'other': 'bg-gray-100 text-gray-700'
  };
  return colors[reason] || 'bg-gray-100 text-gray-700';
};

export default function TransferHistory() {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState("transfer_date");
  const [sortDirection, setSortDirection] = useState("desc");

  // Excel-style column filters
  const [filterDate, setFilterDate] = useState([]);
  const [filterTime, setFilterTime] = useState([]);
  const [filterPerson, setFilterPerson] = useState([]);
  const [filterType, setFilterType] = useState([]);
  const [filterEmployeeId, setFilterEmployeeId] = useState([]);
  const [filterFromCamp, setFilterFromCamp] = useState([]);
  const [filterToCamp, setFilterToCamp] = useState([]);
  const [filterReason, setFilterReason] = useState([]);
  const [filterTransferredBy, setFilterTransferredBy] = useState([]);
  const [filterInductionStatus, setFilterInductionStatus] = useState([]);
  const [filterSonapurExit, setFilterSonapurExit] = useState([]);

  // Search states for column filters
  const [searchDate, setSearchDate] = useState("");
  const [searchTime, setSearchTime] = useState("");
  const [searchPerson, setSearchPerson] = useState("");
  const [searchType, setSearchType] = useState("");
  const [searchEmployeeId, setSearchEmployeeId] = useState("");
  const [searchFromCamp, setSearchFromCamp] = useState("");
  const [searchToCamp, setSearchToCamp] = useState("");
  const [searchReason, setSearchReason] = useState("");
  const [searchTransferredBy, setSearchTransferredBy] = useState("");
  const [searchInductionStatus, setSearchInductionStatus] = useState("");
  const [searchSonapurExit, setSearchSonapurExit] = useState("");

  const { data: transferLogs = [] } = useQuery({
    queryKey: ['transfer-logs'],
    queryFn: () => base44.entities.TechnicianTransferLog.list('-transfer_date'),
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

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
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

  // Find Sajja camp
  const sajjaCamp = camps.find(c => c.code?.toLowerCase() === 'sajja' || c.name?.toLowerCase().includes('sajja'));

  // Find Sonapur Exit camps
  const sonapurExitCamps = camps.filter(camp => {
    const nameMatch = camp.name?.toLowerCase().includes('sonapur') && camp.name?.toLowerCase().includes('exit');
    const codeMatch = camp.code?.toLowerCase().includes('sonapur') && camp.code?.toLowerCase().includes('exit');
    return nameMatch || codeMatch;
  });

  // Enrich transfer logs with person and camp details
  const enrichedLogs = transferLogs.map(log => {
    let person = null;
    let personnelType = null;

    if (log.technician_id) {
      person = technicians.find(t => t.id === log.technician_id);
      personnelType = 'technician';
    } else if (log.external_personnel_id) {
      person = externalPersonnel.find(e => e.id === log.external_personnel_id);
      personnelType = 'external';
    }

    const fromCamp = camps.find(c => c.id === log.from_camp_id);
    const toCamp = camps.find(c => c.id === log.to_camp_id);
    const transferredBy = users.find(u => u.id === log.transferred_by);
    const fromBed = beds.find(b => b.id === log.from_bed_id);
    const toBed = beds.find(b => b.id === log.to_bed_id);

    // Check if this transfer involved Sajja Camp
    const isFromSajja = sajjaCamp && log.from_camp_id === sajjaCamp.id;
    const isToSajja = sajjaCamp && log.to_camp_id === sajjaCamp.id;

    // Check if this transfer involved Sonapur Exit Camp
    const isToSonapurExit = sonapurExitCamps.some(c => c.id === log.to_camp_id);

    // Get induction status if person is a technician
    let inductionInfo = null;
    if (personnelType === 'technician' && person) {
      inductionInfo = {
        status: person.induction_status || 'not_started',
        completionDate: person.induction_completion_date,
        isFromSajja,
        isToSajja
      };
    }

    // Get exit process info if applicable
    let exitInfo = null;
    if (personnelType === 'technician' && person && isToSonapurExit) {
      exitInfo = {
        exitProcessStatus: person.exit_process_status || 'not_in_exit',
        exitStartDate: person.sonapur_exit_start_date,
        hasExitedCountry: person.status === 'exited_country',
        actualCountryExitDate: person.actual_country_exit_date
      };
    }

    return {
      ...log,
      person,
      personnelType,
      fromCamp,
      toCamp,
      transferredBy,
      fromBed,
      toBed,
      inductionInfo,
      exitInfo,
      isFromSajja,
      isToSajja,
      isToSonapurExit
    };
  });

  // Apply search filter
  let filteredLogs = enrichedLogs;

  if (searchQuery.trim()) {
    const searchLower = searchQuery.toLowerCase();
    filteredLogs = filteredLogs.filter(log =>
      log.person?.full_name?.toLowerCase().includes(searchLower) ||
      log.person?.employee_id?.toLowerCase().includes(searchLower) ||
      log.fromCamp?.name?.toLowerCase().includes(searchLower) ||
      log.toCamp?.name?.toLowerCase().includes(searchLower)
    );
  }

  // Apply Excel-style column filters
  filteredLogs = filteredLogs.filter(log => {
    const dateStr = log.transfer_date || '-';
    const timeStr = log.transfer_time || '-';
    const personName = log.person?.full_name || 'Unknown';
    const type = log.personnelType ? (log.personnelType === 'technician' ? 'Technician' : 'External') : '-';
    const employeeId = log.person?.employee_id || '-';
    const fromCampName = log.fromCamp?.name || '-';
    const toCampName = log.toCamp?.name || '-';
    const reason = getReasonLabel(log.reason_for_movement);
    const transferredByName = log.transferredBy?.full_name || '-';
    
    // Induction status label
    let inductionStatusLabel = 'N/A';
    if (log.inductionInfo && (log.isFromSajja || log.isToSajja)) {
      const statusLabels = {
        'not_started': 'Not Started',
        'pre_induction': 'Pre-Induction',
        'induction_completed': 'Completed',
        'overdue_induction': 'Overdue'
      };
      inductionStatusLabel = statusLabels[log.inductionInfo.status] || log.inductionInfo.status;
    }

    // Sonapur Exit label
    let sonapurExitLabel = 'N/A';
    if (log.isToSonapurExit && log.exitInfo) {
      sonapurExitLabel = log.exitInfo.hasExitedCountry ? 'Completed - Left Country' : 'Exit Process Started';
    }

    if (filterDate.length > 0 && !filterDate.includes(dateStr)) return false;
    if (filterTime.length > 0 && !filterTime.includes(timeStr)) return false;
    if (filterPerson.length > 0 && !filterPerson.includes(personName)) return false;
    if (filterType.length > 0 && !filterType.includes(type)) return false;
    if (filterEmployeeId.length > 0 && !filterEmployeeId.includes(employeeId)) return false;
    if (filterFromCamp.length > 0 && !filterFromCamp.includes(fromCampName)) return false;
    if (filterToCamp.length > 0 && !filterToCamp.includes(toCampName)) return false;
    if (filterReason.length > 0 && !filterReason.includes(reason)) return false;
    if (filterTransferredBy.length > 0 && !filterTransferredBy.includes(transferredByName)) return false;
    if (filterInductionStatus.length > 0 && !filterInductionStatus.includes(inductionStatusLabel)) return false;
    if (filterSonapurExit.length > 0 && !filterSonapurExit.includes(sonapurExitLabel)) return false;

    return true;
  });

  // Get unique values for each column
  const uniqueDates = [...new Set(enrichedLogs.map(l => l.transfer_date || '-'))].sort().reverse();
  const uniqueTimes = [...new Set(enrichedLogs.map(l => l.transfer_time || '-'))].sort();
  const uniquePersons = [...new Set(enrichedLogs.map(l => l.person?.full_name || 'Unknown'))].sort();
  const uniqueTypes = ['Technician', 'External'];
  const uniqueEmployeeIds = [...new Set(enrichedLogs.map(l => l.person?.employee_id || '-'))].sort();
  const uniqueFromCamps = [...new Set(enrichedLogs.map(l => l.fromCamp?.name || '-'))].sort();
  const uniqueToCamps = [...new Set(enrichedLogs.map(l => l.toCamp?.name || '-'))].sort();
  const uniqueReasons = [...new Set(enrichedLogs.map(l => getReasonLabel(l.reason_for_movement)))].sort();
  const uniqueTransferredBy = [...new Set(enrichedLogs.map(l => l.transferredBy?.full_name || '-'))].sort();

  // NEW: Unique values for Sajja Induction and Sonapur Exit
  const uniqueInductionStatuses = [...new Set(enrichedLogs.map(l => {
    if (l.inductionInfo && (l.isFromSajja || l.isToSajja)) {
      const statusLabels = {
        'not_started': 'Not Started',
        'pre_induction': 'Pre-Induction',
        'induction_completed': 'Completed',
        'overdue_induction': 'Overdue'
      };
      return statusLabels[l.inductionInfo.status] || l.inductionInfo.status;
    }
    return 'N/A';
  }))].sort();

  const uniqueSonapurExitStatuses = ['Exit Process Started', 'Completed - Left Country', 'N/A'];

  // Sort
  const sortedLogs = [...filteredLogs].sort((a, b) => {
    let aVal = a[sortField] || '';
    let bVal = b[sortField] || '';

    // Handle nested properties
    if (sortField === 'person') {
      aVal = a.person?.full_name || '';
      bVal = b.person?.full_name || '';
    } else if (sortField === 'fromCamp') {
      aVal = a.fromCamp?.name || '';
      bVal = b.fromCamp?.name || '';
    } else if (sortField === 'toCamp') {
      aVal = a.toCamp?.name || '';
      bVal = b.toCamp?.name || '';
    } else if (sortField === 'transferredBy') {
      aVal = a.transferredBy?.full_name || '';
      bVal = b.transferredBy?.full_name || '';
    }

    if (sortDirection === 'asc') {
      return String(aVal).localeCompare(String(bVal));
    } else {
      return String(bVal).localeCompare(String(aVal));
    }
  });

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const clearAllColumnFilters = () => {
    setFilterDate([]);
    setFilterTime([]);
    setFilterPerson([]);
    setFilterType([]);
    setFilterEmployeeId([]);
    setFilterFromCamp([]);
    setFilterToCamp([]);
    setFilterReason([]);
    setFilterTransferredBy([]);
    setFilterInductionStatus([]);
    setFilterSonapurExit([]);
    setSearchQuery("");
  };

  const hasActiveColumnFilters = 
    filterDate.length > 0 || filterTime.length > 0 || filterPerson.length > 0 ||
    filterType.length > 0 || filterEmployeeId.length > 0 || filterFromCamp.length > 0 ||
    filterToCamp.length > 0 || filterReason.length > 0 || filterTransferredBy.length > 0 ||
    filterInductionStatus.length > 0 || filterSonapurExit.length > 0 ||
    searchQuery.trim() !== "";

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

  const exportToCSV = () => {
    const headers = ['Date', 'Time', 'Person', 'Type', 'Employee ID', 'From Camp', 'To Camp', 'Reason', 'Sajja Induction', 'Induction Completion Date', 'Exit Process', 'Transferred By'];
    
    const rows = sortedLogs.map(log => {
      let inductionStatus = 'N/A';
      let inductionDate = '-';
      if (log.inductionInfo && (log.isFromSajja || log.isToSajja)) {
        const statusLabels = {
          'not_started': 'Not Started',
          'pre_induction': 'Pre-Induction',
          'induction_completed': 'Completed',
          'overdue_induction': 'Overdue'
        };
        inductionStatus = statusLabels[log.inductionInfo.status] || log.inductionInfo.status;
        inductionDate = log.inductionInfo.completionDate || '-';
      }

      let exitStatus = 'N/A';
      if (log.isToSonapurExit && log.exitInfo) {
        exitStatus = log.exitInfo.hasExitedCountry ? 'Completed - Left Country' : 'Exit Process Started';
      }

      return [
        log.transfer_date,
        log.transfer_time || '-',
        log.person?.full_name || 'Unknown',
        log.personnelType || '-',
        log.person?.employee_id || '-',
        log.fromCamp?.name || '-',
        log.toCamp?.name || '-',
        getReasonLabel(log.reason_for_movement),
        inductionStatus,
        inductionDate,
        exitStatus,
        log.transferredBy?.full_name || '-'
      ];
    });

    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `transfer_history_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  // Count Sajja-related transfers
  const sajjaTransfers = enrichedLogs.filter(l => l.isFromSajja || l.isToSajja);
  const onboardingTransfersFromSajja = enrichedLogs.filter(l => 
    l.isFromSajja && 
    l.reason_for_movement === 'onboarding_transfer' &&
    l.inductionInfo?.status === 'induction_completed'
  );
  const sonapurExitTransfers = enrichedLogs.filter(l => l.isToSonapurExit);

  return (
    <div className="p-6 md:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-[1800px] mx-auto space-y-6">
        <Alert className="border-blue-200 bg-blue-50">
          <AlertCircle className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-900 text-sm">
            <strong>📍 Audit Trail: Transfer History</strong><br/>
            View complete record of all personnel movements → Track Sajja induction completion → Monitor exit process → Full transparency of camp transfers
          </AlertDescription>
        </Alert>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
              <History className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Transfer History</h1>
              <p className="text-gray-600">Complete record of all personnel transfers</p>
            </div>
          </div>
          {sortedLogs.length > 0 && (
            <Button onClick={exportToCSV} variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card className="border-none shadow-md">
            <CardContent className="p-6">
              <p className="text-sm text-gray-600 mb-1">Total Transfers</p>
              <p className="text-3xl font-bold text-gray-900">{enrichedLogs.length}</p>
            </CardContent>
          </Card>
          <Card className="border-none shadow-md">
            <CardContent className="p-6">
              <p className="text-sm text-gray-600 mb-1">Technicians Moved</p>
              <p className="text-3xl font-bold text-blue-600">
                {enrichedLogs.filter(log => log.personnelType === 'technician').length}
              </p>
            </CardContent>
          </Card>
          <Card className="border-none shadow-md">
            <CardContent className="p-6">
              <p className="text-sm text-gray-600 mb-1">External Personnel</p>
              <p className="text-3xl font-bold text-purple-600">
                {enrichedLogs.filter(log => log.personnelType === 'external').length}
              </p>
            </CardContent>
          </Card>
          <Card className="border-none shadow-md bg-gradient-to-br from-orange-50 to-orange-100">
            <CardContent className="p-6">
              <p className="text-sm text-orange-600 mb-1 font-medium">Sajja Inductions</p>
              <p className="text-3xl font-bold text-orange-900">{onboardingTransfersFromSajja.length}</p>
              <p className="text-xs text-orange-700 mt-1">{sajjaTransfers.length} total Sajja transfers</p>
            </CardContent>
          </Card>
          <Card className="border-none shadow-md bg-gradient-to-br from-red-50 to-pink-100">
            <CardContent className="p-6">
              <p className="text-sm text-red-600 mb-1 font-medium">Exit Transfers</p>
              <p className="text-3xl font-bold text-red-900">{sonapurExitTransfers.length}</p>
              <p className="text-xs text-red-700 mt-1">To Sonapur Exit</p>
            </CardContent>
          </Card>
        </div>

        {/* Search Bar */}
        <Card className="border-none shadow-md">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search by name, ID, or camp..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
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
          </CardContent>
        </Card>

        {/* Transfer History Table */}
        <Card className="border-none shadow-lg">
          {hasActiveColumnFilters && (
            <div className="bg-blue-50 border-b border-blue-200 px-6 py-3">
              <div className="flex items-center justify-between">
                <p className="text-sm text-blue-700 font-medium">
                  <Filter className="w-4 h-4 inline mr-2" />
                  Filters active
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAllColumnFilters}
                  className="text-blue-700 hover:text-blue-900 hover:bg-blue-100"
                >
                  <X className="w-4 h-4 mr-1" />
                  Clear All Filters
                </Button>
              </div>
            </div>
          )}

          <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50 border-b">
            <CardTitle>Transfer Records ({sortedLogs.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {sortedLogs.length === 0 ? (
              <div className="text-center py-12">
                <History className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-lg font-medium text-gray-500">
                  {hasActiveColumnFilters ? 'No transfers match your filters' : 'No transfer history yet'}
                </p>
                <p className="text-sm text-gray-400 mt-2">
                  {hasActiveColumnFilters 
                    ? 'Try adjusting your search or filters'
                    : 'Transfer records will appear here as personnel move between camps'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse bg-white">
                  <thead>
                    <tr className="border-b-2 border-gray-300">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                        <div className="flex items-center justify-between gap-2">
                          <span>Date</span>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => handleSort('transfer_date')}>
                              <ArrowUpDown className="w-3 h-3" />
                            </Button>
                            <ColumnFilter
                              values={uniqueDates}
                              selected={filterDate}
                              setSelected={setFilterDate}
                              searchValue={searchDate}
                              setSearchValue={setSearchDate}
                            />
                          </div>
                        </div>
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                        <div className="flex items-center justify-between gap-2">
                          <span>Time</span>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => handleSort('transfer_time')}>
                              <ArrowUpDown className="w-3 h-3" />
                            </Button>
                            <ColumnFilter
                              values={uniqueTimes}
                              selected={filterTime}
                              setSelected={setFilterTime}
                              searchValue={searchTime}
                              setSearchValue={setSearchTime}
                            />
                          </div>
                        </div>
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                        <div className="flex items-center justify-between gap-2">
                          <span>Person</span>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => handleSort('person')}>
                              <ArrowUpDown className="w-3 h-3" />
                            </Button>
                            <ColumnFilter
                              values={uniquePersons}
                              selected={filterPerson}
                              setSelected={setFilterPerson}
                              searchValue={searchPerson}
                              setSearchValue={setSearchPerson}
                            />
                          </div>
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
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                        <div className="flex items-center justify-between gap-2">
                          <span>Employee ID</span>
                          <ColumnFilter
                            values={uniqueEmployeeIds}
                            selected={filterEmployeeId}
                            setSelected={setFilterEmployeeId}
                            searchValue={searchEmployeeId}
                            setSearchValue={setSearchEmployeeId}
                          />
                        </div>
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                        <div className="flex items-center justify-between gap-2">
                          <span>From Camp</span>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => handleSort('fromCamp')}>
                              <ArrowUpDown className="w-3 h-3" />
                            </Button>
                            <ColumnFilter
                              values={uniqueFromCamps}
                              selected={filterFromCamp}
                              setSelected={setFilterFromCamp}
                              searchValue={searchFromCamp}
                              setSearchValue={setSearchFromCamp}
                            />
                          </div>
                        </div>
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                        <div className="flex items-center justify-between gap-2">
                          <span>To Camp</span>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => handleSort('toCamp')}>
                              <ArrowUpDown className="w-3 h-3" />
                            </Button>
                            <ColumnFilter
                              values={uniqueToCamps}
                              selected={filterToCamp}
                              setSelected={setFilterToCamp}
                              searchValue={searchToCamp}
                              setSearchValue={setSearchToCamp}
                            />
                          </div>
                        </div>
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                        <div className="flex items-center justify-between gap-2">
                          <span>Sajja Induction</span>
                          <ColumnFilter
                            values={uniqueInductionStatuses}
                            selected={filterInductionStatus}
                            setSelected={setFilterInductionStatus}
                            searchValue={searchInductionStatus}
                            setSearchValue={setSearchInductionStatus}
                          />
                        </div>
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                        <div className="flex items-center justify-between gap-2">
                          <span>Exit Process</span>
                          <ColumnFilter
                            values={uniqueSonapurExitStatuses}
                            selected={filterSonapurExit}
                            setSelected={setFilterSonapurExit}
                            searchValue={searchSonapurExit}
                            setSearchValue={setSearchSonapurExit}
                          />
                        </div>
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                        <div className="flex items-center justify-between gap-2">
                          <span>Reason</span>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => handleSort('reason_for_movement')}>
                              <ArrowUpDown className="w-3 h-3" />
                            </Button>
                            <ColumnFilter
                              values={uniqueReasons}
                              selected={filterReason}
                              setSelected={setFilterReason}
                              searchValue={searchReason}
                              setSearchValue={setSearchReason}
                            />
                          </div>
                        </div>
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                        <div className="flex items-center justify-between gap-2">
                          <span>Transferred By</span>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => handleSort('transferredBy')}>
                              <ArrowUpDown className="w-3 h-3" />
                            </Button>
                            <ColumnFilter
                              values={uniqueTransferredBy}
                              selected={filterTransferredBy}
                              setSelected={setFilterTransferredBy}
                              searchValue={searchTransferredBy}
                              setSearchValue={setSearchTransferredBy}
                            />
                          </div>
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedLogs.map((log, index) => {
                      // Determine induction status label
                      let inductionStatusLabel = 'N/A';
                      let inductionBadgeClass = 'bg-gray-100 text-gray-600';
                      
                      if (log.inductionInfo && (log.isFromSajja || log.isToSajja)) {
                        const statusLabels = {
                          'not_started': { label: 'Not Started', color: 'bg-gray-100 text-gray-700' },
                          'pre_induction': { label: 'Pre-Induction', color: 'bg-yellow-100 text-yellow-700' },
                          'induction_completed': { label: 'Completed', color: 'bg-green-600 text-white' },
                          'overdue_induction': { label: 'Overdue', color: 'bg-red-600 text-white' }
                        };
                        const statusData = statusLabels[log.inductionInfo.status] || { label: log.inductionInfo.status, color: 'bg-gray-100 text-gray-600' };
                        inductionStatusLabel = statusData.label;
                        inductionBadgeClass = statusData.color;
                      }

                      return (
                        <tr key={log.id} className={`border-b border-gray-200 hover:bg-blue-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                          <td className="px-4 py-3 text-sm border-r border-gray-200 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-gray-400" />
                              <span className="font-medium text-gray-900">
                                {log.transfer_date ? format(parseISO(log.transfer_date), 'dd/MM/yyyy') : '-'}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700 border-r border-gray-200 whitespace-nowrap">
                            {log.transfer_time || '-'}
                          </td>
                          <td className="px-4 py-3 text-sm border-r border-gray-200 whitespace-nowrap">
                            <div>
                              <p className="font-semibold text-gray-900">{log.person?.full_name || 'Unknown'}</p>
                              {log.person?.employee_id && (
                                <p className="text-xs text-gray-500">{log.person.employee_id}</p>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm border-r border-gray-200 whitespace-nowrap">
                            <Badge variant={log.personnelType === 'technician' ? 'default' : 'secondary'}>
                              {log.personnelType === 'technician' ? 'Technician' : 'External'}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700 border-r border-gray-200 whitespace-nowrap">
                            {log.person?.employee_id || '-'}
                          </td>
                          <td className="px-4 py-3 text-sm border-r border-gray-200 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <Building2 className="w-4 h-4 text-orange-600" />
                              <div>
                                <p className="font-medium text-orange-700">
                                  {log.fromCamp?.name || '-'}
                                  {log.isFromSajja && (
                                    <Badge variant="outline" className="ml-2 text-xs bg-orange-50 border-orange-300 text-orange-700">
                                      <GraduationCap className="w-3 h-3 mr-1 inline" />
                                      Sajja
                                    </Badge>
                                  )}
                                </p>
                                {log.fromBed && (
                                  <p className="text-xs text-gray-500">
                                    Bed: {log.fromBed.bed_number}
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm border-r border-gray-200 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <ArrowRight className="w-4 h-4 text-gray-400" />
                              <Building2 className="w-4 h-4 text-green-600" />
                              <div>
                                <p className="font-medium text-green-700">
                                  {log.toCamp?.name || '-'}
                                  {log.isToSajja && (
                                    <Badge variant="outline" className="ml-2 text-xs bg-orange-50 border-orange-300 text-orange-700">
                                      <GraduationCap className="w-3 h-3 mr-1 inline" />
                                      Sajja
                                    </Badge>
                                  )}
                                  {log.isToSonapurExit && (
                                    <Badge variant="outline" className="ml-2 text-xs bg-red-50 border-red-300 text-red-700">
                                      Exit Camp
                                    </Badge>
                                  )}
                                </p>
                                {log.toBed && (
                                  <p className="text-xs text-gray-500">
                                    Bed: {log.toBed.bed_number}
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm border-r border-gray-200 whitespace-nowrap">
                            {log.inductionInfo && (log.isFromSajja || log.isToSajja) ? (
                              <div className="space-y-1">
                                <Badge className={inductionBadgeClass}>
                                  {inductionStatusLabel}
                                </Badge>
                                {log.inductionInfo.completionDate && (
                                  <p className="text-xs text-gray-600">
                                    {format(parseISO(log.inductionInfo.completionDate), 'dd/MM/yyyy')}
                                  </p>
                                )}
                              </div>
                            ) : (
                              <span className="text-gray-400 text-xs">N/A</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm border-r border-gray-200 whitespace-nowrap">
                            {log.isToSonapurExit && log.exitInfo ? (
                              <div className="space-y-1">
                                {log.exitInfo.hasExitedCountry ? (
                                  <>
                                    <Badge className="bg-green-600 text-white">
                                      <CheckCircle2 className="w-3 h-3 mr-1 inline" />
                                      Completed
                                    </Badge>
                                    {log.exitInfo.actualCountryExitDate && (
                                      <p className="text-xs text-gray-600">
                                        Left: {format(parseISO(log.exitInfo.actualCountryExitDate), 'dd/MM/yyyy')}
                                      </p>
                                    )}
                                  </>
                                ) : (
                                  <>
                                    <Badge className="bg-red-600 text-white">
                                      Started
                                    </Badge>
                                    {log.exitInfo.exitStartDate && (
                                      <p className="text-xs text-gray-600">
                                        {format(parseISO(log.exitInfo.exitStartDate), 'dd/MM/yyyy')}
                                      </p>
                                    )}
                                  </>
                                )}
                              </div>
                            ) : (
                              <span className="text-gray-400 text-xs">N/A</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm border-r border-gray-200 whitespace-nowrap">
                            <Badge className={getReasonColor(log.reason_for_movement)}>
                              {getReasonLabel(log.reason_for_movement)}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-sm border-r border-gray-200 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4 text-gray-400" />
                              <p className="text-gray-700">{log.transferredBy?.full_name || '-'}</p>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>

          <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              Showing <span className="font-semibold">{sortedLogs.length}</span> of <span className="font-semibold">{enrichedLogs.length}</span> transfers
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}