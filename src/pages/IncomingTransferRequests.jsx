import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
  ArrowDownToLine, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Users,
  Sparkles,
  AlertCircle,
  Eye,
  Filter,
  X,
  ArrowUpDown,
  Search
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { createPageUrl } from "@/utils";

export default function IncomingTransferRequests() {
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [detailsRequest, setDetailsRequest] = useState(null);

  // Sorting
  const [sortField, setSortField] = useState("request_date");
  const [sortDirection, setSortDirection] = useState("desc");

  // Global search and top-level filters
  const [globalSearch, setGlobalSearch] = useState("");
  const [filterStatusTop, setFilterStatusTop] = useState("all");
  const [filterSourceCampTop, setFilterSourceCampTop] = useState("all");
  const [filterReasonTop, setFilterReasonTop] = useState("all");

  // Excel-style column filters
  const [filterRequestDate, setFilterRequestDate] = useState([]);
  const [filterSourceCamp, setFilterSourceCamp] = useState([]);
  const [filterTargetCamp, setFilterTargetCamp] = useState([]);
  const [filterReason, setFilterReason] = useState([]);
  const [filterPersonnelCount, setFilterPersonnelCount] = useState([]);
  const [filterPersonnelNames, setFilterPersonnelNames] = useState([]);
  const [filterStatus, setFilterStatus] = useState([]);
  const [filterRequestedBy, setFilterRequestedBy] = useState([]);

  // Search states for filters
  const [searchRequestDate, setSearchRequestDate] = useState("");
  const [searchSourceCamp, setSearchSourceCamp] = useState("");
  const [searchTargetCamp, setSearchTargetCamp] = useState("");
  const [searchReason, setSearchReason] = useState("");
  const [searchPersonnelCount, setSearchPersonnelCount] = useState("");
  const [searchPersonnelNames, setSearchPersonnelNames] = useState("");
  const [searchStatus, setSearchStatus] = useState("");
  const [searchRequestedBy, setSearchRequestedBy] = useState("");

  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
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

  const { data: disciplinaryActions = [] } = useQuery({
    queryKey: ['disciplinary-actions'],
    queryFn: () => base44.entities.DisciplinaryAction.list(),
  });

  const { data: disciplinaryActionTypes = [] } = useQuery({
    queryKey: ['disciplinary-action-types'],
    queryFn: () => base44.entities.DisciplinaryActionType.list(),
  });

  const updateTransferRequestMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.TransferRequest.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transfer-requests'] });
    }
  });

  // Filter incoming requests based on user role and assigned camp
  const myIncomingRequests = transferRequests.filter(tr => {
    const validStatuses = ['pending_allocation', 'beds_allocated', 'allocation_rejected'];
    if (!validStatuses.includes(tr.status)) return false;
    
    // Admins see all incoming requests
    if (currentUser?.role === 'admin') return true;
    
    // Users with assigned camp see requests targeting their camp
    if (currentUser?.camp_id) {
      return tr.target_camp_id === currentUser.camp_id;
    }
    
    return false;
  });

  const handleReject = async () => {
    if (!selectedRequest || !rejectionReason.trim()) {
      alert("Please provide a reason for rejection");
      return;
    }

    try {
      await updateTransferRequestMutation.mutateAsync({
        id: selectedRequest.id,
        data: {
          status: 'allocation_rejected',
          rejection_reason: rejectionReason,
          rejected_by: currentUser?.email,
          rejected_date: new Date().toISOString().split('T')[0],
          allocation_confirmed_by: currentUser?.id,
          allocation_confirmed_date: new Date().toISOString().split('T')[0]
        }
      });

      alert("Transfer request rejected");
      setShowRejectDialog(false);
      setSelectedRequest(null);
      setRejectionReason("");
    }
    catch (error) {
      alert(`Failed to reject request: ${error.message}`);
    }
  };

  const getPersonnelList = (request) => {
    const techList = technicians.filter(t => request.technician_ids?.includes(t.id) || false);
    const extList = externalPersonnel.filter(e => request.external_personnel_ids?.includes(e.id) || false);
    return [...techList, ...extList];
  };

  const getPersonnelDisplay = (request) => {
    const personnel = getPersonnelList(request);
    if (personnel.length === 0) return "No personnel";
    if (personnel.length <= 3) {
      return personnel.map(p => p.full_name).join(", ");
    }
    return `${personnel.slice(0, 3).map(p => p.full_name).join(", ")} +${personnel.length - 3} more`;
  };

  const getDisciplinaryInfo = (technicianId) => {
    const actions = disciplinaryActions.filter(d => d.technician_id === technicianId);
    if (actions.length === 0) return null;
    
    const latestAction = actions.sort((a, b) => 
      new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime()
    )[0];
    
    const actionType = disciplinaryActionTypes.find(t => t.id === latestAction.action_type_id);
    
    return {
      actionTypeName: actionType?.name || latestAction.action_type || '-',
      violation: latestAction.violation || '-',
      date: latestAction.date
    };
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    try {
      return format(parseISO(dateStr), 'dd/MMM/yyyy');
    } catch {
      return '-';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'pending_allocation':
        return 'Pending Allocation';
      case 'beds_allocated':
        return 'Beds Allocated';
      case 'allocation_rejected':
        return 'Rejected';
      default:
        return status;
    }
  };

  // Apply global search and top-level filters first
  let searchFilteredRequests = myIncomingRequests;
  
  if (globalSearch.trim()) {
    const searchLower = globalSearch.toLowerCase().trim();
    searchFilteredRequests = searchFilteredRequests.filter(req => {
      const sourceCamp = camps.find(c => c.id === req.source_camp_id);
      const targetCamp = camps.find(c => c.id === req.target_camp_id);
      const requestedBy = users.find(u => u.id === req.requested_by);
      const personnel = getPersonnelList(req);
      const requestDate = formatDate(req.request_date);
      const reason = req.reason_for_movement ? req.reason_for_movement.replace(/_/g, ' ') : '-';
      const statusText = getStatusText(req.status);

      const searchableFields = [
        requestDate,
        sourceCamp?.name || '',
        targetCamp?.name || '',
        reason,
        statusText,
        requestedBy?.full_name || '',
        ...personnel.map(p => p.full_name),
        ...personnel.map(p => p.employee_id || p.company_name || '')
      ];

      return searchableFields.some(field => 
        field.toLowerCase().includes(searchLower)
      );
    });
  }

  if (filterStatusTop !== 'all') {
    searchFilteredRequests = searchFilteredRequests.filter(req => getStatusText(req.status) === filterStatusTop);
  }

  if (filterSourceCampTop !== 'all') {
    searchFilteredRequests = searchFilteredRequests.filter(req => req.source_camp_id === filterSourceCampTop);
  }

  if (filterReasonTop !== 'all') {
    searchFilteredRequests = searchFilteredRequests.filter(req => {
      const reason = req.reason_for_movement ? req.reason_for_movement.replace(/_/g, ' ') : '-';
      return reason === filterReasonTop;
    });
  }

  // Apply column filters
  let filteredRequests = searchFilteredRequests.filter(req => {
    const sourceCamp = camps.find(c => c.id === req.source_camp_id);
    const targetCamp = camps.find(c => c.id === req.target_camp_id);
    const requestedBy = users.find(u => u.id === req.requested_by);
    const personnel = getPersonnelList(req);
    const requestDate = formatDate(req.request_date);
    const reason = req.reason_for_movement ? req.reason_for_movement.replace(/_/g, ' ') : '-';
    const statusText = getStatusText(req.status);

    if (filterRequestDate.length > 0 && !filterRequestDate.includes(requestDate)) return false;
    if (filterSourceCamp.length > 0 && !filterSourceCamp.includes(sourceCamp?.name || '-')) return false;
    if (filterTargetCamp.length > 0 && !filterTargetCamp.includes(targetCamp?.name || '-')) return false;
    if (filterReason.length > 0 && !filterReason.includes(reason)) return false;
    if (filterPersonnelCount.length > 0 && !filterPersonnelCount.includes(String(personnel.length))) return false;
    if (filterStatus.length > 0 && !filterStatus.includes(statusText)) return false;
    if (filterRequestedBy.length > 0 && !filterRequestedBy.includes(requestedBy?.full_name || '-')) return false;

    if (filterPersonnelNames.length > 0) {
      const hasMatchingName = personnel.some(p => filterPersonnelNames.includes(p.full_name));
      if (!hasMatchingName) return false;
    }

    return true;
  });

  // Sort
  const sortedRequests = [...filteredRequests].sort((a, b) => {
    let aVal, bVal;

    if (sortField === 'request_date') {
      aVal = a.request_date || '';
      bVal = b.request_date || '';
      const dateA = aVal ? new Date(aVal) : new Date(0);
      const dateB = bVal ? new Date(bVal) : new Date(0);
      return sortDirection === 'asc' ? dateA.getTime() - dateB.getTime() : dateB.getTime() - dateA.getTime();
    } else if (sortField === 'source_camp') {
      const campA = camps.find(c => c.id === a.source_camp_id);
      const campB = camps.find(c => c.id === b.source_camp_id);
      aVal = campA?.name || '';
      bVal = campB?.name || '';
    } else if (sortField === 'target_camp') {
      const campA = camps.find(c => c.id === a.target_camp_id);
      const campB = camps.find(c => c.id === b.target_camp_id);
      aVal = campA?.name || '';
      bVal = campB?.name || '';
    } else if (sortField === 'requested_by') {
      const userA = users.find(u => u.id === a.requested_by);
      const userB = users.find(u => u.id === b.requested_by);
      aVal = userA?.full_name || '';
      bVal = userB?.full_name || '';
    } else if (sortField === 'personnel_count') {
      aVal = getPersonnelList(a).length;
      bVal = getPersonnelList(b).length;
    } else {
      aVal = a[sortField] || '';
      bVal = b[sortField] || '';
    }

    if (sortDirection === 'asc') {
      return aVal > bVal ? 1 : -1;
    } else {
      return aVal < bVal ? 1 : -1;
    }
  });

  // Get unique values for filters
  const uniqueRequestDates = [...new Set(searchFilteredRequests.map(r => formatDate(r.request_date)))].sort();
  const uniqueSourceCamps = [...new Set(searchFilteredRequests.map(r => {
    const camp = camps.find(c => c.id === r.source_camp_id);
    return camp?.name || '-';
  }))].sort();
  const uniqueTargetCamps = [...new Set(searchFilteredRequests.map(r => {
    const camp = camps.find(c => c.id === r.target_camp_id);
    return camp?.name || '-';
  }))].sort();
  const uniqueReasons = [...new Set(searchFilteredRequests.map(r => 
    r.reason_for_movement ? r.reason_for_movement.replace(/_/g, ' ') : '-'
  ))].sort();
  const uniquePersonnelCounts = [...new Set(searchFilteredRequests.map(r => String(getPersonnelList(r).length)))].sort((a, b) => Number(a) - Number(b));
  const uniqueStatuses = [...new Set(searchFilteredRequests.map(r => getStatusText(r.status)))].sort();
  const uniqueRequestedBy = [...new Set(searchFilteredRequests.map(r => {
    const user = users.find(u => u.id === r.requested_by);
    return user?.full_name || '-';
  }))].sort();

  const allPersonnelNames = [...new Set(
    searchFilteredRequests.flatMap(r => getPersonnelList(r).map(p => p.full_name))
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
    setFilterStatus([]);
    setFilterRequestedBy([]);
    setGlobalSearch("");
    setFilterStatusTop("all");
    setFilterSourceCampTop("all");
    setFilterReasonTop("all");
  };

  const hasActiveFilters = 
    filterRequestDate.length > 0 ||
    filterSourceCamp.length > 0 ||
    filterTargetCamp.length > 0 ||
    filterReason.length > 0 ||
    filterPersonnelCount.length > 0 ||
    filterPersonnelNames.length > 0 ||
    filterStatus.length > 0 ||
    filterRequestedBy.length > 0 ||
    globalSearch.trim() !== "" ||
    filterStatusTop !== "all" ||
    filterSourceCampTop !== "all" ||
    filterReasonTop !== "all";

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
      <div className="max-w-[1800px] mx-auto space-y-6">
        {/* Header */}
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
              <ArrowDownToLine className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Incoming Transfer Requests</h1>
              <p className="text-gray-600">Review and allocate beds for incoming personnel</p>
            </div>
          </div>
        </div>

        <Alert className="bg-blue-50 border-blue-200">
          <AlertCircle className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-900">
            <strong>Workflow:</strong> Review requests → Use Smart Allocation → Confirm beds → Source camp dispatches personnel → Capture fingerprint attendance on arrival
          </AlertDescription>
        </Alert>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-none shadow-lg overflow-hidden">
            <div className="h-2 bg-gradient-to-r from-orange-400 to-orange-600"></div>
            <CardContent className="p-5 bg-gradient-to-br from-orange-100 to-orange-50">
              <div className="flex items-center justify-between mb-2">
                <Clock className="w-10 h-10 text-orange-600" />
                <div className="text-right">
                  <p className="text-3xl font-bold text-orange-900">
                    {myIncomingRequests.filter(r => r.status === 'pending_allocation').length}
                  </p>
                </div>
              </div>
              <p className="text-sm font-semibold text-orange-700 uppercase tracking-wide">Pending Allocation</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg overflow-hidden">
            <div className="h-2 bg-gradient-to-r from-green-400 to-green-600"></div>
            <CardContent className="p-5 bg-gradient-to-br from-green-100 to-green-50">
              <div className="flex items-center justify-between mb-2">
                <CheckCircle2 className="w-10 h-10 text-green-600" />
                <div className="text-right">
                  <p className="text-3xl font-bold text-green-900">
                    {myIncomingRequests.filter(r => r.status === 'beds_allocated').length}
                  </p>
                </div>
              </div>
              <p className="text-sm font-semibold text-green-700 uppercase tracking-wide">Beds Allocated</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg overflow-hidden">
            <div className="h-2 bg-gradient-to-r from-red-400 to-red-600"></div>
            <CardContent className="p-5 bg-gradient-to-br from-red-100 to-red-50">
              <div className="flex items-center justify-between mb-2">
                <XCircle className="w-10 h-10 text-red-600" />
                <div className="text-right">
                  <p className="text-3xl font-bold text-red-900">
                    {myIncomingRequests.filter(r => r.status === 'allocation_rejected').length}
                  </p>
                </div>
              </div>
              <p className="text-sm font-semibold text-red-700 uppercase tracking-wide">Rejected</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg overflow-hidden">
            <div className="h-2 bg-gradient-to-r from-blue-400 to-blue-600"></div>
            <CardContent className="p-5 bg-gradient-to-br from-blue-100 to-blue-50">
              <div className="flex items-center justify-between mb-2">
                <Users className="w-10 h-10 text-blue-600" />
                <div className="text-right">
                  <p className="text-3xl font-bold text-blue-900">
                    {myIncomingRequests.reduce((sum, r) => sum + getPersonnelList(r).length, 0)}
                  </p>
                </div>
              </div>
              <p className="text-sm font-semibold text-blue-700 uppercase tracking-wide">Total Personnel</p>
            </CardContent>
          </Card>
        </div>

        {/* Compact Filter Bar */}
        <Card className="border-none shadow-md">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-3">
              {/* Search Input */}
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

              {/* Status Dropdown */}
              <Select value={filterStatusTop} onValueChange={setFilterStatusTop}>
                <SelectTrigger className="w-full md:w-44 h-10">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="Pending Allocation">Pending Allocation</SelectItem>
                  <SelectItem value="Beds Allocated">Beds Allocated</SelectItem>
                  <SelectItem value="Rejected">Rejected</SelectItem>
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
                  <SelectItem value="exit case">Exit Case</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Active Filters Indicator */}
            {hasActiveFilters && (
              <div className="mt-3 flex items-center justify-between">
                <p className="text-xs text-gray-600">
                  {globalSearch && <span className="font-medium">Search: "{globalSearch}"</span>}
                  {(filterStatusTop !== 'all' || filterSourceCampTop !== 'all' || filterReasonTop !== 'all') && (
                    <span className="ml-2 text-blue-600 font-medium">
                      • {[
                        filterStatusTop !== 'all' && 'Status',
                        filterSourceCampTop !== 'all' && 'Source Camp',
                        filterReasonTop !== 'all' && 'Reason'
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

        {/* Table */}
        <Card className="border-none shadow-lg overflow-hidden">
          {hasActiveFilters && (
            <div className="bg-blue-50 border-b border-blue-200 px-6 py-3">
              <div className="flex items-center justify-between">
                <p className="text-sm text-blue-700 font-medium">
                  <Filter className="w-4 h-4 inline mr-2" />
                  {globalSearch ? 'Global search + column filters active' : 'Column filters active'}
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
            <CardTitle>Incoming Requests ({sortedRequests.length})</CardTitle>
          </CardHeader>

          <div className="overflow-x-auto">
            {sortedRequests.length === 0 ? (
              <div className="p-12 text-center">
                <ArrowDownToLine className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-900 mb-2">No Incoming Transfer Requests</h3>
                <p className="text-gray-600">
                  {hasActiveFilters 
                    ? 'No requests match your search/filter criteria'
                    : 'Transfer requests will appear here when other camps want to send personnel to your camps'}
                </p>
              </div>
            ) : (
              <table className="w-full border-collapse bg-white">
                <thead>
                  <tr className="border-b-2 border-gray-300">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                      Actions
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                      Personnel Codes
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
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                      <div className="flex items-center justify-between gap-2">
                        <span>Target Camp</span>
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
                      Action Type
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                      Violation
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                      <div className="flex items-center justify-between gap-2">
                        <span>Count</span>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => handleSort('personnel_count')}>
                            <ArrowUpDown className="w-3 h-3" />
                          </Button>
                          <ColumnFilter
                            values={uniquePersonnelCounts}
                            selected={filterPersonnelCount}
                            setSelected={setFilterPersonnelCount}
                            searchValue={searchPersonnelCount}
                            setSearchValue={setSearchPersonnelCount}
                          />
                        </div>
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
                        <span>Requested By</span>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => handleSort('requested_by')}>
                            <ArrowUpDown className="w-3 h-3" />
                          </Button>
                          <ColumnFilter
                            values={uniqueRequestedBy}
                            selected={filterRequestedBy}
                            setSelected={setFilterRequestedBy}
                            searchValue={searchRequestedBy}
                            setSearchValue={setSearchRequestedBy}
                          />
                        </div>
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
                  </tr>
                </thead>
                <tbody>
                  {sortedRequests.map((request, index) => {
                    const sourceCamp = camps.find(c => c.id === request.source_camp_id);
                    const targetCamp = camps.find(c => c.id === request.target_camp_id);
                    const requestedBy = users.find(u => u.id === request.requested_by);
                    const personnel = getPersonnelList(request);

                    return (
                      <tr
                        key={request.id}
                        className={`border-b border-gray-200 hover:bg-blue-50 transition-colors ${
                          index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                        }`}
                      >
                        <td className="px-4 py-3 text-sm border-r border-gray-200 whitespace-nowrap">
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setDetailsRequest(request);
                                setShowDetailsDialog(true);
                              }}
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              View
                            </Button>

                            {request.status === 'pending_allocation' && (
                              <>
                                <Button
                                  size="sm"
                                  className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                                  onClick={() => {
                                    window.location.href = createPageUrl('SmartAllocation') + `?transfer_request_id=${request.id}`;
                                  }}
                                >
                                  <Sparkles className="w-4 h-4 mr-1" />
                                  Allocate
                                </Button>

                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedRequest(request);
                                    setShowRejectDialog(true);
                                  }}
                                >
                                  <XCircle className="w-4 h-4 mr-1" />
                                  Reject
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 border-r border-gray-200">
                          {personnel.length === 0 ? (
                            <span className="text-gray-400">-</span>
                          ) : personnel.length <= 3 ? (
                            <div className="space-y-1">
                              {personnel.map((person, idx) => (
                                <div key={idx} className="text-xs font-mono text-blue-600">
                                  {person.employee_id || person.company_name || '-'}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div>
                              <div className="space-y-1">
                                {personnel.slice(0, 3).map((person, idx) => (
                                  <div key={idx} className="text-xs font-mono text-blue-600">
                                    {person.employee_id || person.company_name || '-'}
                                  </div>
                                ))}
                              </div>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <button className="text-blue-600 hover:text-blue-800 text-xs font-medium mt-1 hover:underline">
                                    +{personnel.length - 3} more...
                                  </button>
                                </PopoverTrigger>
                                <PopoverContent className="w-80 max-h-96 overflow-y-auto" align="start">
                                  <div className="space-y-1">
                                    <p className="font-semibold text-sm mb-2 text-gray-700">All Codes ({personnel.length})</p>
                                    {personnel.map((person, idx) => (
                                      <div key={idx} className="text-sm py-1 border-b border-gray-100 last:border-0">
                                        <span className="font-mono text-blue-600">{person.employee_id || person.company_name || '-'}</span>
                                        <span className="text-gray-500"> - {person.full_name}</span>
                                      </div>
                                    ))}
                                  </div>
                                </PopoverContent>
                              </Popover>
                            </div>
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
                        <td className="px-4 py-3 text-sm text-gray-700 border-r border-gray-200">
                          {(() => {
                            if (!['disciplinary', 'exit_case'].includes(request.reason_for_movement)) return '-';
                            const techIds = request.technician_ids || [];
                            if (techIds.length === 0) return '-';
                            
                            const disciplinaryInfos = techIds
                              .map(id => getDisciplinaryInfo(id))
                              .filter(info => info !== null);
                            
                            if (disciplinaryInfos.length === 0) return '-';
                            
                            if (disciplinaryInfos.length === 1) {
                              return disciplinaryInfos[0].actionTypeName;
                            }
                            
                            return (
                              <Popover>
                                <PopoverTrigger asChild>
                                  <button className="text-blue-600 hover:text-blue-800 text-xs font-medium hover:underline">
                                    {disciplinaryInfos.length} action(s)
                                  </button>
                                </PopoverTrigger>
                                <PopoverContent className="w-80" align="start">
                                  <div className="space-y-2">
                                    {disciplinaryInfos.map((info, idx) => (
                                      <div key={idx} className="text-sm py-1 border-b border-gray-100 last:border-0">
                                        {info.actionTypeName}
                                      </div>
                                    ))}
                                  </div>
                                </PopoverContent>
                              </Popover>
                            );
                          })()}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 border-r border-gray-200">
                          {(() => {
                            if (!['disciplinary', 'exit_case'].includes(request.reason_for_movement)) return '-';
                            const techIds = request.technician_ids || [];
                            if (techIds.length === 0) return '-';
                            
                            const disciplinaryInfos = techIds
                              .map(id => getDisciplinaryInfo(id))
                              .filter(info => info !== null);
                            
                            if (disciplinaryInfos.length === 0) return '-';
                            
                            if (disciplinaryInfos.length === 1) {
                              return (
                                <div className="max-w-xs">
                                  <p className="text-sm truncate" title={disciplinaryInfos[0].violation}>
                                    {disciplinaryInfos[0].violation}
                                  </p>
                                </div>
                              );
                            }
                            
                            return (
                              <Popover>
                                <PopoverTrigger asChild>
                                  <button className="text-blue-600 hover:text-blue-800 text-xs font-medium hover:underline">
                                    View {disciplinaryInfos.length} violation(s)
                                  </button>
                                </PopoverTrigger>
                                <PopoverContent className="w-96" align="start">
                                  <div className="space-y-2">
                                    {disciplinaryInfos.map((info, idx) => (
                                      <div key={idx} className="text-sm p-2 bg-gray-50 rounded">
                                        <p className="font-medium text-gray-900">{info.actionTypeName}</p>
                                        <p className="text-gray-700 text-xs mt-1">{info.violation}</p>
                                      </div>
                                    ))}
                                  </div>
                                </PopoverContent>
                              </Popover>
                            );
                          })()}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 border-r border-gray-200 text-center font-medium">
                          {personnel.length}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 border-r border-gray-200">
                          {personnel.length === 0 ? (
                            <span className="text-gray-400">-</span>
                          ) : personnel.length <= 2 ? (
                            <div className="space-y-1">
                              {personnel.map((person, idx) => (
                                <div key={idx}>{person.full_name}</div>
                              ))}
                            </div>
                          ) : (
                            <div>
                              <div className="space-y-1">
                                {personnel.slice(0, 2).map((person, idx) => (
                                  <div key={idx}>{person.full_name}</div>
                                ))}
                              </div>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <button className="text-blue-600 hover:text-blue-800 text-xs font-medium mt-1 hover:underline">
                                    and {personnel.length - 2} more...
                                  </button>
                                </PopoverTrigger>
                                <PopoverContent className="w-80 max-h-96 overflow-y-auto" align="start">
                                  <div className="space-y-1">
                                    <p className="font-semibold text-sm mb-2 text-gray-700">All Personnel ({personnel.length})</p>
                                    {personnel.map((person, idx) => (
                                      <div key={idx} className="text-sm py-1 border-b border-gray-100 last:border-0">
                                        <span className="font-medium">{person.full_name}</span>
                                        <span className="text-gray-500"> ({person.employee_id || person.company_name})</span>
                                      </div>
                                    ))}
                                  </div>
                                </PopoverContent>
                              </Popover>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 border-r border-gray-200">
                          {requestedBy?.full_name || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm border-r border-gray-200 whitespace-nowrap">
                          {request.status === 'pending_allocation' && (
                            <Badge className="bg-orange-600">
                              <Clock className="w-3 h-3 mr-1" />
                              Pending Allocation
                            </Badge>
                          )}
                          {request.status === 'beds_allocated' && (
                            <Badge className="bg-green-600">
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Beds Allocated
                            </Badge>
                          )}
                          {request.status === 'allocation_rejected' && (
                            <div>
                              <Badge className="bg-red-600 mb-2">
                                <XCircle className="w-3 h-3 mr-1" />
                                Rejected
                              </Badge>
                              <div className="space-y-1">
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
                            </div>
                          )}
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
              Showing <span className="font-semibold">{sortedRequests.length}</span> of <span className="font-semibold">{myIncomingRequests.length}</span> requests
            </p>
          </div>
        </Card>

        {/* Reject Dialog */}
        <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reject Transfer Request</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Please provide a reason for rejecting this transfer request. This will be communicated to the source camp.
              </p>
              <Textarea
                placeholder="Enter rejection reason..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={4}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleReject}>
                Confirm Rejection
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Details Dialog */}
        <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Transfer Request Details</DialogTitle>
            </DialogHeader>
            {detailsRequest && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">From</p>
                    <p className="font-semibold">{camps.find(c => c.id === detailsRequest.source_camp_id)?.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">To</p>
                    <p className="font-semibold">{camps.find(c => c.id === detailsRequest.target_camp_id)?.name}</p>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-gray-600 mb-2">Personnel List</p>
                  <div className="space-y-2">
                    {getPersonnelList(detailsRequest).map((person) => {
                      const isTech = technicians.find(t => t.id === person.id);
                      const disciplinaryInfo = isTech ? getDisciplinaryInfo(person.id) : null;
                      
                      return (
                        <div key={person.id} className="p-3 bg-gray-50 rounded-lg">
                          <p className="font-semibold">{person.full_name}</p>
                          <p className="text-sm text-gray-600">
                            {isTech ? `Technician - ${person.employee_id}` : `External - ${person.company_name}`}
                          </p>
                          {disciplinaryInfo && ['disciplinary', 'exit_case'].includes(detailsRequest.reason_for_movement) && (
                            <div className="mt-2 pt-2 border-t border-gray-200">
                              <p className="text-xs text-gray-600">Action Type:</p>
                              <p className="text-sm font-medium text-red-700">{disciplinaryInfo.actionTypeName}</p>
                              <p className="text-xs text-gray-600 mt-1">Violation:</p>
                              <p className="text-sm text-gray-900">{disciplinaryInfo.violation}</p>
                              {disciplinaryInfo.date && (
                                <p className="text-xs text-gray-500 mt-1">Date: {formatDate(disciplinaryInfo.date)}</p>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button onClick={() => setShowDetailsDialog(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}