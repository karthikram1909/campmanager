import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Building2, Clock, CheckCircle2, XCircle, AlertCircle, Eye, Filter, X, ArrowUpDown, Download } from "lucide-react";
import { format, parseISO } from "date-fns";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";

export default function CampHiringRequests() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [reasonFilter, setReasonFilter] = useState("all");
  const [sortField, setSortField] = useState("created_date");
  const [sortDirection, setSortDirection] = useState("desc");

  // Column filters
  const [filterRequestedBy, setFilterRequestedBy] = useState([]);
  const [filterCapacity, setFilterCapacity] = useState([]);
  const [filterReason, setFilterReason] = useState([]);
  const [filterStatus, setFilterStatus] = useState([]);
  const [filterPeriod, setFilterPeriod] = useState([]);

  const [searchRequestedBy, setSearchRequestedBy] = useState("");
  const [searchCapacity, setSearchCapacity] = useState("");
  const [searchReason, setSearchReason] = useState("");
  const [searchStatus, setSearchStatus] = useState("");
  const [searchPeriod, setSearchPeriod] = useState("");

  const { data: requests = [] } = useQuery({
    queryKey: ['camp-hiring-requests'],
    queryFn: () => base44.entities.CampHiringRequest.list('-created_date'),
  });

  const { data: audits = [] } = useQuery({
    queryKey: ['camp-audits'],
    queryFn: () => base44.entities.CampAudit.list(),
  });

  const { data: procurementDecisions = [] } = useQuery({
    queryKey: ['procurement-decisions'],
    queryFn: () => base44.entities.ProcurementDecision.list(),
  });

  const { data: camps = [] } = useQuery({
    queryKey: ['camps'],
    queryFn: () => base44.entities.Camp.list(),
  });

  // Get status badge
  const getStatusBadge = (status) => {
    const configs = {
      'draft': { color: 'bg-gray-100 text-gray-700', icon: Clock },
      'pending_manpower_control': { color: 'bg-blue-100 text-blue-700', icon: Clock },
      'pending_initial_approval': { color: 'bg-yellow-100 text-yellow-700', icon: Clock },
      'approved_for_audit': { color: 'bg-purple-100 text-purple-700', icon: CheckCircle2 },
      'pending_be_audit': { color: 'bg-blue-100 text-blue-700', icon: Clock },
      'pending_lft_hsse_audits': { color: 'bg-blue-100 text-blue-700', icon: Clock },
      'pending_procurement_comparison': { color: 'bg-indigo-100 text-indigo-700', icon: Clock },
      'pending_cpo_decision': { color: 'bg-orange-100 text-orange-700', icon: Clock },
      'approved_for_hiring': { color: 'bg-green-600 text-white', icon: CheckCircle2 },
      'camp_created': { color: 'bg-green-800 text-white', icon: CheckCircle2 },
      'rejected_by_manpower_control': { color: 'bg-red-100 text-red-700', icon: XCircle },
      'rejected_initial_approval': { color: 'bg-red-100 text-red-700', icon: XCircle },
      'rejected_by_be_audit': { color: 'bg-red-100 text-red-700', icon: XCircle },
      'rejected_by_lft_audit': { color: 'bg-red-100 text-red-700', icon: XCircle },
      'rejected_by_hsse_audit': { color: 'bg-red-100 text-red-700', icon: XCircle },
      'rejected_by_procurement': { color: 'bg-red-100 text-red-700', icon: XCircle },
      'rejected_by_cpo': { color: 'bg-red-100 text-red-700', icon: XCircle },
    };
    const config = configs[status] || { color: 'bg-gray-100 text-gray-700', icon: AlertCircle };
    const Icon = config.icon;
    return (
      <Badge className={`${config.color} text-xs flex items-center gap-1 w-fit`}>
        <Icon className="w-3 h-3" />
        {status?.replace(/_/g, ' ')}
      </Badge>
    );
  };

  // Apply filters
  let filteredRequests = requests.filter(req => {
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = !searchQuery ||
      req.created_by?.toLowerCase().includes(searchLower) ||
      req.reason_details?.toLowerCase().includes(searchLower);

    const matchesStatus = statusFilter === 'all' || req.status === statusFilter;
    const matchesReason = reasonFilter === 'all' || req.reason === reasonFilter;

    // Column filters
    if (filterRequestedBy.length > 0 && !filterRequestedBy.includes(req.created_by || '-')) return false;
    if (filterCapacity.length > 0 && !filterCapacity.includes(String(req.required_capacity || '-'))) return false;
    if (filterReason.length > 0 && !filterReason.includes(req.reason?.replace(/_/g, ' ').toUpperCase() || '-')) return false;
    if (filterStatus.length > 0 && !filterStatus.includes(req.status || '-')) return false;
    if (filterPeriod.length > 0) {
      const periodText = `${format(parseISO(req.period_start_date), 'MMM dd, yyyy')} - ${format(parseISO(req.period_end_date), 'MMM dd, yyyy')}`;
      if (!filterPeriod.includes(periodText)) return false;
    }

    return matchesSearch && matchesStatus && matchesReason;
  });

  // Sort
  const sortedRequests = [...filteredRequests].sort((a, b) => {
    let aVal = a[sortField] || '';
    let bVal = b[sortField] || '';

    if (sortDirection === 'asc') {
      return aVal > bVal ? 1 : -1;
    } else {
      return aVal < bVal ? 1 : -1;
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

  // Get unique values
  const uniqueRequestedBy = [...new Set(requests.map(r => r.created_by || '-'))].sort();
  const uniqueCapacities = [...new Set(requests.map(r => String(r.required_capacity || '-')))].sort();
  const uniqueReasons = [...new Set(requests.map(r => r.reason?.replace(/_/g, ' ').toUpperCase() || '-'))].sort();
  const uniqueStatuses = [...new Set(requests.map(r => r.status || '-'))].sort();
  const uniquePeriods = [...new Set(requests.map(r => {
    if (!r.period_start_date || !r.period_end_date) return '-';
    return `${format(parseISO(r.period_start_date), 'MMM dd, yyyy')} - ${format(parseISO(r.period_end_date), 'MMM dd, yyyy')}`;
  }))].sort();

  const clearAllFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setReasonFilter("all");
    setFilterRequestedBy([]);
    setFilterCapacity([]);
    setFilterReason([]);
    setFilterStatus([]);
    setFilterPeriod([]);
  };

  const hasActiveFilters = searchQuery || statusFilter !== 'all' || reasonFilter !== 'all' ||
    filterRequestedBy.length > 0 || filterCapacity.length > 0 || filterReason.length > 0 ||
    filterStatus.length > 0 || filterPeriod.length > 0;

  // Stats
  const pendingCount = requests.filter(r => r.status?.includes('pending')).length;
  const approvedCount = requests.filter(r => r.status === 'approved_for_hiring' || r.status === 'camp_created').length;
  const rejectedCount = requests.filter(r => r.status?.includes('rejected')).length;
  const inAuditCount = requests.filter(r =>
    r.status === 'pending_be_audit' ||
    r.status === 'pending_lft_hsse_audits'
  ).length;

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
                <Checkbox checked={selected.length === values.length} />
                <label className="text-sm font-medium cursor-pointer">(Select All)</label>
              </div>
            )}
            {filteredValues.map((value) => (
              <div
                key={value}
                className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
                onClick={() => toggleValue(value)}
              >
                <Checkbox checked={selected.includes(value)} />
                <label className="text-sm cursor-pointer flex-1">{value}</label>
              </div>
            ))}
          </div>
          {selected.length > 0 && (
            <div className="p-2 border-t">
              <Button variant="outline" size="sm" className="w-full" onClick={() => setSelected([])}>
                Clear Filter
              </Button>
            </div>
          )}
        </PopoverContent>
      </Popover>
    );
  };

  const exportToCSV = () => {
    const headers = ['Request ID', 'Requested By', 'Capacity', 'Period', 'Reason', 'Status', 'Created Date'];
    const rows = sortedRequests.map(req => [
      req.id,
      req.created_by || '-',
      req.required_capacity,
      `${format(parseISO(req.period_start_date), 'dd/MM/yyyy')} - ${format(parseISO(req.period_end_date), 'dd/MM/yyyy')}`,
      req.reason?.replace(/_/g, ' '),
      req.status?.replace(/_/g, ' '),
      format(parseISO(req.created_date), 'dd/MM/yyyy HH:mm')
    ]);

    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `camp_hiring_requests_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 md:p-8 bg-gradient-to-br from-gray-50 to-blue-50 min-h-screen">
      <div className="max-w-[1800px] mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Camp Hiring Module (TR)</h1>
              <p className="text-gray-600 mt-1">Request, audit, and procure temporary residence camps</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={exportToCSV} className="border-green-600 text-green-600 hover:bg-green-50">
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
            <Link to={createPageUrl("CreateCampHiringRequest")}>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                New Request
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-4 gap-4">
          <Card className="border-none shadow-md bg-gradient-to-br from-yellow-50 to-yellow-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-yellow-600 font-medium mb-1">Pending</p>
                  <p className="text-3xl font-bold text-yellow-900">{pendingCount}</p>
                </div>
                <Clock className="w-10 h-10 text-yellow-600 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-md bg-gradient-to-br from-purple-50 to-purple-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-purple-600 font-medium mb-1">In Audit</p>
                  <p className="text-3xl font-bold text-purple-900">{inAuditCount}</p>
                </div>
                <AlertCircle className="w-10 h-10 text-purple-600 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-md bg-gradient-to-br from-green-50 to-green-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-600 font-medium mb-1">Approved</p>
                  <p className="text-3xl font-bold text-green-900">{approvedCount}</p>
                </div>
                <CheckCircle2 className="w-10 h-10 text-green-600 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-md bg-gradient-to-br from-red-50 to-red-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-red-600 font-medium mb-1">Rejected</p>
                  <p className="text-3xl font-bold text-red-900">{rejectedCount}</p>
                </div>
                <XCircle className="w-10 h-10 text-red-600 opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="border-none shadow-md">
          <CardContent className="p-4">
            <div className="grid md:grid-cols-4 gap-4">
              <div className="relative">
                <Input
                  placeholder="Search requests..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="pending_manpower_control">Pending Manpower Control</SelectItem>
                  <SelectItem value="pending_initial_approval">Pending Initial Approval</SelectItem>
                  <SelectItem value="pending_be_audit">Pending BE Audit</SelectItem>
                  <SelectItem value="pending_lft_hsse_audits">Pending LFT/HSSE Audits</SelectItem>
                  <SelectItem value="pending_procurement_comparison">Pending Procurement</SelectItem>
                  <SelectItem value="pending_cpo_decision">Pending CPO Decision</SelectItem>
                  <SelectItem value="approved_for_hiring">Approved for Hiring</SelectItem>
                  <SelectItem value="camp_created">Camp Created</SelectItem>
                  <SelectItem value="rejected_by_manpower_control">Rejected by Manpower Control</SelectItem>
                  <SelectItem value="rejected_initial_approval">Rejected Initial Approval</SelectItem>
                  <SelectItem value="rejected_by_be_audit">Rejected by BE Audit</SelectItem>
                  <SelectItem value="rejected_by_lft_audit">Rejected by LFT Audit</SelectItem>
                  <SelectItem value="rejected_by_hsse_audit">Rejected by HSSE Audit</SelectItem>
                  <SelectItem value="rejected_by_procurement">Rejected by Procurement</SelectItem>
                  <SelectItem value="rejected_by_cpo">Rejected by CPO</SelectItem>
                </SelectContent>
              </Select>
              <Select value={reasonFilter} onValueChange={setReasonFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Reasons" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Reasons</SelectItem>
                  <SelectItem value="manpower_increase">Manpower Increase</SelectItem>
                  <SelectItem value="expiry">Expiry</SelectItem>
                  <SelectItem value="relocation">Relocation</SelectItem>
                  <SelectItem value="expansion">Expansion</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
              {hasActiveFilters && (
                <Button variant="outline" onClick={clearAllFilters} className="border-blue-600 text-blue-600">
                  <X className="w-4 h-4 mr-2" />
                  Clear Filters
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Requests Table */}
        <Card className="border-none shadow-lg">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50 border-b">
            <CardTitle>Camp Hiring Requests ({sortedRequests.length})</CardTitle>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b-2 border-gray-300 bg-gray-50">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                    <div className="flex items-center justify-between gap-2">
                      <span>Requested By</span>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => handleSort('created_by')}>
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
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                    <div className="flex items-center justify-between gap-2">
                      <span>Capacity</span>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => handleSort('required_capacity')}>
                          <ArrowUpDown className="w-3 h-3" />
                        </Button>
                        <ColumnFilter
                          values={uniqueCapacities}
                          selected={filterCapacity}
                          setSelected={setFilterCapacity}
                          searchValue={searchCapacity}
                          setSearchValue={setSearchCapacity}
                        />
                      </div>
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                    <div className="flex items-center justify-between gap-2">
                      <span>Period</span>
                      <ColumnFilter
                        values={uniquePeriods}
                        selected={filterPeriod}
                        setSelected={setFilterPeriod}
                        searchValue={searchPeriod}
                        setSearchValue={setSearchPeriod}
                      />
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                    <div className="flex items-center justify-between gap-2">
                      <span>Reason</span>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => handleSort('reason')}>
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
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
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
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                    <div className="flex items-center justify-between gap-2">
                      <span>Created</span>
                      <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => handleSort('created_date')}>
                        <ArrowUpDown className="w-3 h-3" />
                      </Button>
                    </div>
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedRequests.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center">
                      <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <p className="text-lg font-medium text-gray-500">
                        {hasActiveFilters ? 'No requests match your filters' : 'No camp hiring requests yet'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  sortedRequests.map((req, index) => (
                    <tr
                      key={req.id}
                      className={`border-b hover:bg-blue-50 transition-colors ${
                        index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                      }`}
                    >
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {req.created_by || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        <Badge variant="outline" className="text-blue-700 border-blue-300">
                          {req.required_capacity} beds
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {format(parseISO(req.period_start_date), 'MMM dd, yyyy')} - {format(parseISO(req.period_end_date), 'MMM dd, yyyy')}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <Badge variant="secondary" className="text-xs">
                          {req.reason?.replace(/_/g, ' ')}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        {getStatusBadge(req.status)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {format(parseISO(req.created_date), 'MMM dd, yyyy')}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Link to={createPageUrl("CampHiringRequestDetail") + `?request_id=${req.id}`}>
                          <Button variant="ghost" size="sm" className="text-blue-600 hover:bg-blue-50">
                            <Eye className="w-4 h-4 mr-1" />
                            View
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="bg-gray-50 px-6 py-3 border-t">
            <p className="text-sm text-gray-600">
              Showing <span className="font-semibold">{sortedRequests.length}</span> of {requests.length} requests
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}