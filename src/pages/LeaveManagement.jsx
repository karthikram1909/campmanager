import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Calendar, ArrowLeft, AlertCircle, Upload, Download, ArrowUpDown, Filter, X, Printer, Search } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { format, parseISO } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";

export default function LeaveManagement() {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showReturnDialog, setShowReturnDialog] = useState(false);
  const [showBulkUploadDialog, setShowBulkUploadDialog] = useState(false);
  const [formData, setFormData] = useState({});
  const [returningLeave, setReturningLeave] = useState(null);
  const [bulkFile, setBulkFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [sortField, setSortField] = useState("start_date");
  const [sortDirection, setSortDirection] = useState("desc");

  // Excel-style column filters
  const [filterEmployeeName, setFilterEmployeeName] = useState([]);
  const [filterEmployeeId, setFilterEmployeeId] = useState([]);
  const [filterLeaveType, setFilterLeaveType] = useState([]);
  const [filterStartDate, setFilterStartDate] = useState([]);
  const [filterEndDate, setFilterEndDate] = useState([]);
  const [filterDuration, setFilterDuration] = useState([]);
  const [filterBedAction, setFilterBedAction] = useState([]);
  const [filterStatus, setFilterStatus] = useState([]);
  const [filterCamp, setFilterCamp] = useState([]);

  // Search states for column filters
  const [searchEmployeeName, setSearchEmployeeName] = useState("");
  const [searchEmployeeId, setSearchEmployeeId] = useState("");
  const [searchLeaveType, setSearchLeaveType] = useState("");
  const [searchStartDate, setSearchStartDate] = useState("");
  const [searchEndDate, setSearchEndDate] = useState("");
  const [searchDuration, setSearchDuration] = useState("");
  const [searchBedAction, setSearchBedAction] = useState("");
  const [searchStatus, setSearchStatus] = useState("");
  const [searchCamp, setSearchCamp] = useState("");

  const [technicianSearch, setTechnicianSearch] = useState("");

  const queryClient = useQueryClient();

  const { data: leaves = [] } = useQuery({
    queryKey: ['leaves'],
    queryFn: () => base44.entities.LeaveRequest.list('-created_date'),
  });

  const { data: technicians = [] } = useQuery({
    queryKey: ['technicians'],
    queryFn: () => base44.entities.Technician.list(),
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

  const { data: camps = [] } = useQuery({
    queryKey: ['camps'],
    queryFn: () => base44.entities.Camp.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.LeaveRequest.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leaves'] });
      setShowAddDialog(false);
      setFormData({});
      setTechnicianSearch(""); // Clear technician search after submission
    },
  });

  const bulkCreateMutation = useMutation({
    mutationFn: (data) => base44.entities.LeaveRequest.bulkCreate(data),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['leaves'] });
      setUploadResult({ success: true, count: result.length });
    },
    onError: (error) => {
      setUploadResult({ success: false, error: error.message });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.LeaveRequest.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leaves'] });
    },
  });

  const updateTechnicianMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Technician.update(id, data),
  });

  const updateBedMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Bed.update(id, data),
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const startDate = new Date(formData.start_date);
    const endDate = new Date(formData.end_date);
    const duration = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;

    const technician = technicians.find(t => t.id === formData.technician_id);

    await createMutation.mutateAsync({
      ...formData,
      duration_days: duration
    });

    await updateTechnicianMutation.mutateAsync({
      id: formData.technician_id,
      data: { status: 'on_leave' }
    });

    if (technician?.bed_id && formData.bed_action) {
      if (formData.bed_action === 'keep_reserved') {
        await updateBedMutation.mutateAsync({
          id: technician.bed_id,
          data: {
            status: 'reserved',
            reserved_for: technician.id,
            reserved_until: formData.end_date
          }
        });
      } else if (formData.bed_action === 'temporary_allocate') {
        await updateBedMutation.mutateAsync({
          id: technician.bed_id,
          data: {
            status: 'reserved',
            reserved_for: technician.id,
            reserved_until: formData.end_date
          }
        });
      }
    }

    queryClient.invalidateQueries({ queryKey: ['technicians'] });
    queryClient.invalidateQueries({ queryKey: ['beds'] });
  };

  const handleApprove = async (leave) => {
    await updateMutation.mutateAsync({ id: leave.id, data: { status: 'approved' } });
  };

  const handleReject = async (leave) => {
    await updateMutation.mutateAsync({ id: leave.id, data: { status: 'rejected' } });

    await updateTechnicianMutation.mutateAsync({
      id: leave.technician_id,
      data: { status: 'active' }
    });

    queryClient.invalidateQueries({ queryKey: ['technicians'] });
  };

  const handleReturnFromLeave = (leave) => {
    setReturningLeave(leave);
    setShowReturnDialog(true);
  };

  const confirmReturn = async () => {
    if (!returningLeave) return;

    try {
      const technician = technicians.find(t => t.id === returningLeave.technician_id);
      const originalBed = beds.find(b => b.reserved_for === technician.id);

      if (originalBed) {
        if (returningLeave.temporary_occupant_id && originalBed.technician_id) {
          await updateTechnicianMutation.mutateAsync({
            id: returningLeave.temporary_occupant_id,
            data: { bed_id: null }
          });
        }

        await updateBedMutation.mutateAsync({
          id: originalBed.id,
          data: {
            status: 'occupied',
            technician_id: technician.id,
            reserved_for: null,
            reserved_until: null
          }
        });

        await updateTechnicianMutation.mutateAsync({
          id: technician.id,
          data: {
            status: 'active',
            bed_id: originalBed.id
          }
        });
      } else {
        await updateTechnicianMutation.mutateAsync({
          id: technician.id,
          data: { status: 'active' }
        });
      }

      await updateMutation.mutateAsync({
        id: returningLeave.id,
        data: { status: 'completed' }
      });

      queryClient.invalidateQueries({ queryKey: ['technicians'] });
      queryClient.invalidateQueries({ queryKey: ['beds'] });
      queryClient.invalidateQueries({ queryKey: ['leaves'] });

      setShowReturnDialog(false);
      setReturningLeave(null);
    } catch (error) {
      console.error("Return from leave failed:", error);
    }
  };

  const downloadTemplate = () => {
    const template = `# Leave Management Template
# leave_type options: annual, sick, emergency, unpaid, other
# bed_action options: keep_reserved, temporary_allocate, no_action
# status options: pending, approved, rejected, completed
employee_id,leave_type,start_date,end_date,reason,bed_action,status
EMP001,annual,2024-02-01,2024-02-14,Annual vacation,keep_reserved,pending
EMP002,sick,2024-01-20,2024-01-22,Flu recovery,keep_reserved,pending
EMP003,emergency,2024-01-25,2024-01-27,Family emergency,temporary_allocate,pending`;

    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'leave_requests_template.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const handleBulkUpload = async () => {
    if (!bulkFile) return;

    setUploading(true);
    setUploadResult(null);

    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file: bulkFile });

      const schema = await base44.entities.LeaveRequest.schema();
      const extractResult = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: {
          type: "array",
          items: schema
        }
      });

      if (extractResult.status === "success" && extractResult.output) {
        const processedData = await Promise.all(extractResult.output.map(async (row) => {
          const tech = technicians.find(t => t.employee_id === row.employee_id);
          if (!tech) {
            console.warn(`Technician with employee_id ${row.employee_id} not found. Skipping.`);
            return null;
          }

          const startDate = new Date(row.start_date);
          const endDate = new Date(row.end_date);
          const duration = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;

          return {
            technician_id: tech.id,
            leave_type: row.leave_type,
            start_date: row.start_date,
            end_date: row.end_date,
            duration_days: duration,
            reason: row.reason,
            bed_action: row.bed_action || 'keep_reserved',
            status: row.status || 'pending'
          };
        }));

        const validData = processedData.filter(d => d !== null);

        if (validData.length > 0) {
          await bulkCreateMutation.mutateAsync(validData);
          setBulkFile(null);
        } else {
          setUploadResult({ success: false, error: "No valid leave requests found in the file after processing." });
        }
      } else {
        setUploadResult({ success: false, error: extractResult.details || "Failed to extract data from file." });
      }
    } catch (error) {
      setUploadResult({ success: false, error: error.message || "An unexpected error occurred during upload." });
    } finally {
      setUploading(false);
    }
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Get unique values for filters
  const uniqueEmployeeNames = [...new Set(leaves.map(l => {
    const tech = technicians.find(t => t.id === l.technician_id);
    return tech?.full_name || '-';
  }))].sort();

  const uniqueEmployeeIds = [...new Set(leaves.map(l => {
    const tech = technicians.find(t => t.id === l.technician_id);
    return tech?.employee_id || '-';
  }))].sort();

  const uniqueLeaveTypes = [...new Set(leaves.map(l => l.leave_type || '-'))].sort();
  const uniqueStartDates = [...new Set(leaves.map(l => l.start_date ? format(parseISO(l.start_date), 'MMM dd, yyyy') : '-'))].sort();
  const uniqueEndDates = [...new Set(leaves.map(l => l.end_date ? format(parseISO(l.end_date), 'MMM dd, yyyy') : '-'))].sort();
  const uniqueDurations = [...new Set(leaves.map(l => l.duration_days ? `${l.duration_days} days` : '-'))].sort();
  const uniqueBedActions = [...new Set(leaves.map(l => {
    if (!l.bed_action) return '-';
    return l.bed_action === 'keep_reserved' ? 'Keep Reserved' :
           l.bed_action === 'temporary_allocate' ? 'Temp Allocation' :
           'No Action';
  }))].sort();
  const uniqueStatuses = [...new Set(leaves.map(l => l.status || '-'))].sort();
  const uniqueCamps = [...new Set(leaves.map(l => {
    const tech = technicians.find(t => t.id === l.technician_id);
    const camp = tech ? camps.find(c => c.id === tech.camp_id) : null;
    return camp?.name || '-';
  }))].sort();

  // Filter technicians based on search
  const filteredTechnicians = technicians.filter(t => {
    const searchLower = technicianSearch.toLowerCase();
    return t.full_name?.toLowerCase().includes(searchLower) ||
           t.employee_id?.toLowerCase().includes(searchLower);
  });

  // Column Filter Component with Search
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

  // Apply filters and sorting
  let filteredLeaves = leaves.filter(leave => {
    const tech = technicians.find(t => t.id === leave.technician_id);
    const camp = tech ? camps.find(c => c.id === tech.camp_id) : null;
    const bedActionText = !leave.bed_action ? '-' :
                          leave.bed_action === 'keep_reserved' ? 'Keep Reserved' :
                          leave.bed_action === 'temporary_allocate' ? 'Temp Allocation' : 'No Action';

    if (filterEmployeeName.length > 0 && !filterEmployeeName.includes(tech?.full_name || '-')) return false;
    if (filterEmployeeId.length > 0 && !filterEmployeeId.includes(tech?.employee_id || '-')) return false;
    if (filterLeaveType.length > 0 && !filterLeaveType.includes(leave.leave_type || '-')) return false;
    if (filterStartDate.length > 0 && !filterStartDate.includes(leave.start_date ? format(parseISO(leave.start_date), 'MMM dd, yyyy') : '-')) return false;
    if (filterEndDate.length > 0 && !filterEndDate.includes(leave.end_date ? format(parseISO(leave.end_date), 'MMM dd, yyyy') : '-')) return false;
    if (filterDuration.length > 0 && !filterDuration.includes(leave.duration_days ? `${leave.duration_days} days` : '-')) return false;
    if (filterBedAction.length > 0 && !filterBedAction.includes(bedActionText)) return false;
    if (filterStatus.length > 0 && !filterStatus.includes(leave.status || '-')) return false;
    if (filterCamp.length > 0 && !filterCamp.includes(camp?.name || '-')) return false;

    return true;
  });

  filteredLeaves = filteredLeaves.sort((a, b) => {
    let aVal, bVal;

    if (sortField === 'employee_name') {
      const techA = technicians.find(t => t.id === a.technician_id);
      const techB = technicians.find(t => t.id === b.technician_id);
      aVal = techA?.full_name || '';
      bVal = techB?.full_name || '';
    } else if (sortField === 'employee_id') {
      const techA = technicians.find(t => t.id === a.technician_id);
      const techB = technicians.find(t => t.id === b.technician_id);
      aVal = techA?.employee_id || '';
      bVal = techB?.employee_id || '';
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

  const clearAllFilters = () => {
    setFilterEmployeeName([]);
    setFilterEmployeeId([]);
    setFilterLeaveType([]);
    setFilterStartDate([]);
    setFilterEndDate([]);
    setFilterDuration([]);
    setFilterBedAction([]);
    setFilterStatus([]);
    setFilterCamp([]);
  };

  const hasActiveFilters =
    filterEmployeeName.length > 0 ||
    filterEmployeeId.length > 0 ||
    filterLeaveType.length > 0 ||
    filterStartDate.length > 0 ||
    filterEndDate.length > 0 ||
    filterDuration.length > 0 ||
    filterBedAction.length > 0 ||
    filterStatus.length > 0 ||
    filterCamp.length > 0;

  const exportToCSV = () => {
    const headers = ['Employee Name', 'Employee ID', 'Leave Type', 'Start Date', 'End Date', 'Duration (days)', 'Bed Action', 'Status', 'Camp', 'Reason'];
    const rows = filteredLeaves.map(leave => {
      const tech = technicians.find(t => t.id === leave.technician_id);
      const camp = camps.find(c => c.id === tech?.camp_id);

      const bedActionText = leave.bed_action?.replace(/_/g, ' ').toUpperCase() || 'NO ACTION';
      const statusText = leave.status?.replace(/_/g, ' ').toUpperCase() || '-';
      const leaveTypeText = leave.leave_type?.replace(/_/g, ' ').toUpperCase() || '-';

      return [
        tech?.full_name || '-',
        tech?.employee_id || '-',
        leaveTypeText,
        leave.start_date ? format(parseISO(leave.start_date), 'dd/MM/yyyy') : '-',
        leave.end_date ? format(parseISO(leave.end_date), 'dd/MM/yyyy') : '-',
        leave.duration_days || '-',
        bedActionText,
        statusText,
        camp?.name || '-',
        leave.reason || '-'
      ];
    });

    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `leave_management_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const printReport = () => {
    window.print();
  };

  return (
    <div className="p-6 md:p-8 bg-gray-50 min-h-screen">
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-table,
          #printable-table * {
            visibility: visible;
          }
          #printable-table {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 10px;
            margin: 0;
          }
          th, td {
            border: 1px solid #000;
            padding: 4px;
            text-align: left;
          }
          th {
            background-color: #f3f4f6 !important;
            font-weight: bold;
            color: #000 !important;
          }
          tr:hover {
            background-color: inherit !important;
          }
          .no-print {
            display: none !important;
          }
          tr {
            page-break-inside: avoid;
          }
          td .badge {
            border: 1px solid #ccc; /* Ensure badges are visible */
            padding: 2px 6px;
            border-radius: 4px;
            background-color: #eee;
            color: #333;
            display: inline-block;
          }
          td .badge.default { background-color: #bfdbfe; color: #1e40af; border-color: #93c5fd; } /* Blue-ish */
          td .badge.destructive { background-color: #fecaca; color: #991b1b; border-color: #ef4444; } /* Red-ish */
          td .badge.secondary { background-color: #e2e8f0; color: #475569; border-color: #94a3b8; } /* Gray-ish */
          td .badge.outline { background-color: #fff; color: #333; border-color: #ccc; } /* White/outline */

          @page {
            size: landscape;
            margin: 1cm;
          }
        }
      `}</style>

      <div className="max-w-[1800px] mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 no-print">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Leave Management</h1>
            <p className="text-gray-600 mt-1">Track and manage technician leaves</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={exportToCSV} className="border-green-600 text-green-600 hover:bg-green-50">
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
            <Button variant="outline" onClick={printReport} className="border-blue-600 text-blue-600 hover:bg-blue-50">
              <Printer className="w-4 h-4 mr-2" />
              Print
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowBulkUploadDialog(true)}
              className="border-blue-600 text-blue-600 hover:bg-blue-50"
            >
              <Upload className="w-4 h-4 mr-2" />
              Bulk Upload
            </Button>
            <Button onClick={() => setShowAddDialog(true)} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Add Leave Request
            </Button>
          </div>
        </div>

        {/* Leave Requests Table */}
        <Card className="border-none shadow-lg overflow-hidden" id="printable-table">
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

          <div className="overflow-x-auto">
            {filteredLeaves.length === 0 ? (
              <div className="p-12 text-center">
                <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No leave requests found{hasActiveFilters ? ' matching your filters' : ''}.</p>
              </div>
            ) : (
              <table className="w-full border-collapse bg-white">
                <thead>
                  <tr className="border-b-2 border-gray-300">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                      <div className="flex items-center justify-between gap-2">
                        <span>Employee Name</span>
                        <div className="flex gap-1 no-print">
                          <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => handleSort('employee_name')}>
                            <ArrowUpDown className="w-3 h-3" />
                          </Button>
                          <ColumnFilter
                            values={uniqueEmployeeNames}
                            selected={filterEmployeeName}
                            setSelected={setFilterEmployeeName}
                            searchValue={searchEmployeeName}
                            setSearchValue={setSearchEmployeeName}
                          />
                        </div>
                      </div>
                    </th>
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
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                      <div className="flex items-center justify-between gap-2">
                        <span>Leave Type</span>
                        <div className="flex gap-1 no-print">
                          <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => handleSort('leave_type')}>
                            <ArrowUpDown className="w-3 h-3" />
                          </Button>
                          <ColumnFilter
                            values={uniqueLeaveTypes}
                            selected={filterLeaveType}
                            setSelected={setFilterLeaveType}
                            searchValue={searchLeaveType}
                            setSearchValue={setSearchLeaveType}
                          />
                        </div>
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                      <div className="flex items-center justify-between gap-2">
                        <span>Start Date</span>
                        <div className="flex gap-1 no-print">
                          <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => handleSort('start_date')}>
                            <ArrowUpDown className="w-3 h-3" />
                          </Button>
                          <ColumnFilter
                            values={uniqueStartDates}
                            selected={filterStartDate}
                            setSelected={setFilterStartDate}
                            searchValue={searchStartDate}
                            setSearchValue={setSearchStartDate}
                          />
                        </div>
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                      <div className="flex items-center justify-between gap-2">
                        <span>End Date</span>
                        <div className="flex gap-1 no-print">
                          <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => handleSort('end_date')}>
                            <ArrowUpDown className="w-3 h-3" />
                          </Button>
                          <ColumnFilter
                            values={uniqueEndDates}
                            selected={filterEndDate}
                            setSelected={setFilterEndDate}
                            searchValue={searchEndDate}
                            setSearchValue={setSearchEndDate}
                          />
                        </div>
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                      <div className="flex items-center justify-between gap-2">
                        <span>Duration</span>
                        <div className="flex gap-1 no-print">
                          <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => handleSort('duration_days')}>
                            <ArrowUpDown className="w-3 h-3" />
                          </Button>
                          <ColumnFilter
                            values={uniqueDurations}
                            selected={filterDuration}
                            setSelected={setFilterDuration}
                            searchValue={searchDuration}
                            setSearchValue={setSearchDuration}
                          />
                        </div>
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                      <div className="flex items-center justify-between gap-2">
                        <span>Bed Action</span>
                        <ColumnFilter
                          values={uniqueBedActions}
                          selected={filterBedAction}
                          setSelected={setFilterBedAction}
                          searchValue={searchBedAction}
                          setSearchValue={setSearchBedAction}
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
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                      <div className="flex items-center justify-between gap-2">
                        <span>Camp</span>
                        <ColumnFilter
                          values={uniqueCamps}
                          selected={filterCamp}
                          setSelected={setFilterCamp}
                          searchValue={searchCamp}
                          setSearchValue={setSearchCamp}
                        />
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 no-print">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLeaves.map((leave, index) => {
                    const tech = technicians.find(t => t.id === leave.technician_id);
                    const camp = tech ? camps.find(c => c.id === tech.camp_id) : null;
                    const tempTech = leave.temporary_occupant_id ? technicians.find(t => t.id === leave.temporary_occupant_id) : null;

                    return (
                      <tr
                        key={leave.id}
                        className={`border-b border-gray-200 hover:bg-gray-50 transition-colors ${
                          index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                        }`}
                      >
                        <td className="px-4 py-3 text-sm text-gray-900 border-r border-gray-200 whitespace-nowrap font-medium">
                          {tech?.full_name || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-blue-600 border-r border-gray-200 whitespace-nowrap">
                          {tech?.employee_id || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 border-r border-gray-200 whitespace-nowrap">
                          <Badge variant="outline" className="text-xs">
                            {leave.leave_type}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 border-r border-gray-200 whitespace-nowrap">
                          {leave.start_date ? format(parseISO(leave.start_date), 'MMM dd, yyyy') : '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 border-r border-gray-200 whitespace-nowrap">
                          {leave.end_date ? format(parseISO(leave.end_date), 'MMM dd, yyyy') : '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 border-r border-gray-200 whitespace-nowrap">
                          {leave.duration_days} days
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 border-r border-gray-200 whitespace-nowrap">
                          {leave.bed_action === 'keep_reserved' ? (
                            <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-300 text-xs">
                              Keep Reserved
                            </Badge>
                          ) : leave.bed_action === 'temporary_allocate' ? (
                            <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-300 text-xs">
                              Temp Allocation
                            </Badge>
                          ) : (
                            <span className="text-gray-500">No Action</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm border-r border-gray-200 whitespace-nowrap">
                          <Badge variant={
                            leave.status === 'approved' ? 'default' :
                            leave.status === 'rejected' ? 'destructive' :
                            leave.status === 'completed' ? 'secondary' : 'outline'
                          } className="text-xs">
                            {leave.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 border-r border-gray-200 whitespace-nowrap">
                          {camp?.name || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm whitespace-nowrap no-print">
                          <div className="flex gap-2">
                            {leave.status === 'pending' && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-green-600 border-green-600 hover:bg-green-50 text-xs"
                                  onClick={() => handleApprove(leave)}
                                >
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-red-600 border-red-600 hover:bg-red-50 text-xs"
                                  onClick={() => handleReject(leave)}
                                >
                                  Reject
                                </Button>
                              </>
                            )}
                            {leave.status === 'approved' && (
                              <Button
                                size="sm"
                                className="bg-blue-600 hover:bg-blue-700 text-xs"
                                onClick={() => handleReturnFromLeave(leave)}
                              >
                                <ArrowLeft className="w-3 h-3 mr-1" />
                                Return
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Table Footer */}
          <div className="bg-gray-50 px-6 py-3 border-t border-gray-200 no-print">
            <p className="text-sm text-gray-600">
              Showing <span className="font-semibold">{filteredLeaves.length}</span> of <span className="font-semibold">{leaves.length}</span> leave requests
            </p>
          </div>
        </Card>
      </div>

      {/* Add Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Leave Request</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Technician*</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className="w-full justify-between"
                  >
                    {formData.technician_id
                      ? technicians.find(t => t.id === formData.technician_id)?.full_name + ' - ' +
                        technicians.find(t => t.id === formData.technician_id)?.employee_id
                      : "Select technician..."}
                    <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandInput
                      placeholder="Search by name or employee ID..."
                      value={technicianSearch}
                      onValueChange={setTechnicianSearch}
                    />
                    <CommandEmpty>No technician found.</CommandEmpty>
                    <CommandGroup className="max-h-64 overflow-y-auto">
                      {filteredTechnicians.filter(t => t.status === 'active').map((tech) => (
                        <CommandItem
                          key={tech.id}
                          value={tech.full_name + ' - ' + tech.employee_id} // value for CommandInput filtering
                          onSelect={() => {
                            setFormData({...formData, technician_id: tech.id});
                            setTechnicianSearch("");
                          }}
                        >
                          <div className="flex flex-col">
                            <span className="font-medium">{tech.full_name}</span>
                            <span className="text-xs text-gray-500">{tech.employee_id}</span>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Leave Type*</Label>
              <Select
                value={formData.leave_type || ''}
                onValueChange={(val) => setFormData({...formData, leave_type: val})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="annual">Annual Leave</SelectItem>
                  <SelectItem value="sick">Sick Leave</SelectItem>
                  <SelectItem value="emergency">Emergency Leave</SelectItem>
                  <SelectItem value="unpaid">Unpaid Leave</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date*</Label>
                <Input
                  type="date"
                  required
                  value={formData.start_date || ''}
                  onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>End Date*</Label>
                <Input
                  type="date"
                  required
                  value={formData.end_date || ''}
                  onChange={(e) => setFormData({...formData, end_date: e.target.value})}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Bed Action*</Label>
              <Select
                value={formData.bed_action || 'keep_reserved'}
                onValueChange={(val) => setFormData({...formData, bed_action: val})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="keep_reserved">
                    <div className="flex flex-col items-start">
                      <span className="font-medium">Keep Reserved</span>
                      <span className="text-xs text-gray-500">Bed stays empty until return</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="temporary_allocate">
                    <div className="flex flex-col items-start">
                      <span className="font-medium">Allow Temporary Allocation</span>
                      <span className="text-xs text-gray-500">Bed can be used temporarily</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="no_action">
                    <div className="flex flex-col items-start">
                      <span className="font-medium">No Action</span>
                      <span className="text-xs text-gray-500">Bed status unchanged</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Reason</Label>
              <Textarea
                value={formData.reason || ''}
                onChange={(e) => setFormData({...formData, reason: e.target.value})}
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => {
                setShowAddDialog(false);
                setFormData({}); // Clear form data on cancel
                setTechnicianSearch(""); // Clear technician search on cancel
              }}>
                Cancel
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                Submit Request
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Return from Leave Dialog */}
      <Dialog open={showReturnDialog} onOpenChange={setShowReturnDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Return from Leave</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {returningLeave && (
              <>
                <Alert>
                  <AlertDescription>
                    Returning {technicians.find(t => t.id === returningLeave.technician_id)?.full_name} from leave.
                  </AlertDescription>
                </Alert>

                {returningLeave.temporary_occupant_id && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      The bed currently has a temporary occupant ({technicians.find(t => t.id === returningLeave.temporary_occupant_id)?.full_name}).
                      They will be removed from this bed and need to be reallocated.
                    </AlertDescription>
                  </Alert>
                )}

                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => setShowReturnDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={confirmReturn} className="bg-blue-600 hover:bg-blue-700">
                    Confirm Return
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk Upload Dialog */}
      <Dialog open={showBulkUploadDialog} onOpenChange={setShowBulkUploadDialog}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Bulk Upload Leave Requests</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Alert>
              <AlertDescription>
                Upload a CSV file with leave request data. Download the template below to see the required format.
                Ensure `employee_id` matches an existing technician.
              </AlertDescription>
            </Alert>

            <Button
              variant="outline"
              onClick={downloadTemplate}
              className="w-full"
            >
              <Download className="w-4 h-4 mr-2" />
              Download CSV Template
            </Button>

            <div className="space-y-2">
              <Label>Upload CSV File</Label>
              <Input
                type="file"
                accept=".csv"
                onChange={(e) => setBulkFile(e.target.files[0])}
                disabled={uploading}
              />
            </div>

            {uploadResult && (
              <Alert variant={uploadResult.success ? "default" : "destructive"}>
                {uploadResult.success
                  ? <AlertDescription className="text-green-600">Successfully uploaded {uploadResult.count} leave requests!</AlertDescription>
                  : <AlertDescription className="text-red-600">Error: {uploadResult.error}</AlertDescription>
                }
              </Alert>
            )}

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowBulkUploadDialog(false);
                  setBulkFile(null);
                  setUploadResult(null);
                }}
              >
                Close
              </Button>
              <Button
                onClick={handleBulkUpload}
                disabled={!bulkFile || uploading}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {uploading ? 'Uploading...' : 'Upload'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}