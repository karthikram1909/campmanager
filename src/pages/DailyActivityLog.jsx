import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Search, Calendar as CalendarIcon, Upload, Download, ArrowUpDown, Filter, X, Printer, CheckCircle2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";


export default function DailyActivityLog() {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showBulkUploadDialog, setShowBulkUploadDialog] = useState(false);
  const [formData, setFormData] = useState({
    date: format(new Date(), 'yyyy-MM-dd')
  });
  const [bulkFile, setBulkFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [filterDate, setFilterDate] = useState(""); // Changed from today's date to empty string to show all entries
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState("date");
  const [sortDirection, setSortDirection] = useState("desc");
  
  // Excel-style column filters
  const [filterDateCol, setFilterDateCol] = useState([]);
  const [filterEmployeeName, setFilterEmployeeName] = useState([]);
  const [filterEmployeeId, setFilterEmployeeId] = useState([]);
  const [filterStatusType, setFilterStatusType] = useState([]);
  const [filterSite, setFilterSite] = useState([]);
  const [filterLocation, setFilterLocation] = useState([]);
  const [filterCheckIn, setFilterCheckIn] = useState([]);
  const [filterCheckOut, setFilterCheckOut] = useState([]);

  // Search states for column filters
  const [searchDateCol, setSearchDateCol] = useState("");
  const [searchEmployeeName, setSearchEmployeeName] = useState("");
  const [searchEmployeeId, setSearchEmployeeId] = useState("");
  const [searchStatusType, setSearchStatusType] = useState("");
  const [searchSite, setSearchSite] = useState("");
  const [searchLocation, setSearchLocation] = useState("");
  const [searchCheckIn, setSearchCheckIn] = useState("");
  const [searchCheckOut, setSearchCheckOut] = useState("");

  const [technicianSearch, setTechnicianSearch] = useState("");
  const [siteSearch, setSiteSearch] = useState("");

  // States for bulk/multi-technician entry
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedTechnicianIds, setSelectedTechnicianIds] = useState([]);
  const [statusType, setStatusType] = useState('');
  const [siteId, setSiteId] = useState('');
  const [locationDetails, setLocationDetails] = useState('');
  const [checkInTime, setCheckInTime] = useState('');
  const [checkOutTime, setCheckOutTime] = useState('');
  const [notes, setNotes] = useState('');
  const [sickLeaveReason, setSickLeaveReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState(null);
  
  const queryClient = useQueryClient();

  const { data: dailyStatuses = [] } = useQuery({
    queryKey: ['daily-statuses'],
    queryFn: () => base44.entities.DailyStatus.list('-date'),
  });

  const { data: technicians = [] } = useQuery({
    queryKey: ['technicians'],
    queryFn: () => base44.entities.Technician.list(),
  });

  const { data: sites = [] } = useQuery({
    queryKey: ['sites'],
    queryFn: () => base44.entities.Site.list(),
  });

  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
  });

  // Check for preselected technicians from URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const preselected = urlParams.get('preselected');
    const date = urlParams.get('date');
    
    if (preselected) {
      const techIds = preselected.split(',');
      setSelectedTechnicianIds(techIds);
      // Automatically open the add dialog if preselected technicians exist
      setShowAddDialog(true);
    }
    
    if (date) {
      setSelectedDate(date);
      setFormData(prev => ({ ...prev, date: date })); // Also update formData for the single add dialog
    }
  }, []);

  // Filter technicians based on search (only active technicians)
  const filteredTechnicians = technicians.filter(t => {
    const searchLower = technicianSearch.toLowerCase();
    return t.status === 'active' && // Only show active technicians
           (t.full_name?.toLowerCase().includes(searchLower) || 
            t.employee_id?.toLowerCase().includes(searchLower));
  });

  // Filter sites based on search
  const filteredSites = sites.filter(s => {
    const searchLower = siteSearch.toLowerCase();
    return s.name?.toLowerCase().includes(searchLower) || 
           s.location?.toLowerCase().includes(searchLower);
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.DailyStatus.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-statuses'] });
      setShowAddDialog(false);
      setFormData({ date: format(new Date(), 'yyyy-MM-dd') });
    },
  });

  const bulkCreateMutation = useMutation({
    mutationFn: (data) => base44.entities.DailyStatus.bulkCreate(data),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['daily-statuses'] });
      // The result here is for the bulk upload function, not the multi-select submit result directly
      // However, we can re-use the setUploadResult or handle it directly in handleSubmit if it's for the dialog
      // For the bulk upload dialog, this is okay. For the new multi-tech feature, handleSubmit will manage setSubmitResult
    },
    onError: (error) => {
      // Similarly, for bulk upload dialog this is fine. For multi-tech, handleSubmit will manage setSubmitResult
    },
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (selectedTechnicianIds.length > 0) {
      // Multi-technician submission
      setSubmitting(true);
      setSubmitResult(null);
      
      try {
        const records = selectedTechnicianIds.map(techId => ({
          technician_id: techId,
          date: selectedDate,
          status_type: statusType,
          site_id: statusType === 'at_site' ? siteId : null,
          location_details: locationDetails,
          check_in_time: checkInTime,
          check_out_time: checkOutTime,
          notes: statusType === 'on_leave_sick' && sickLeaveReason 
            ? `Sick Leave Reason: ${sickLeaveReason}${notes ? '\n' + notes : ''}` 
            : notes,
          recorded_by: currentUser?.id
        }));
        
        await bulkCreateMutation.mutateAsync(records);
        
        setSubmitResult({ success: true, count: records.length });
        
        // Reset form
        setSelectedTechnicianIds([]);
        setStatusType('');
        setSiteId('');
        setLocationDetails('');
        setCheckInTime('');
        setCheckOutTime('');
        setNotes('');
        setSickLeaveReason('');
        setSelectedDate(format(new Date(), 'yyyy-MM-dd')); // Reset selected date for next use
        
        setTimeout(() => {
          setShowAddDialog(false);
          setSubmitResult(null);
        }, 2000);
        
      } catch (error) {
        setSubmitResult({ success: false, error: error.message || "An unknown error occurred." });
      } finally {
        setSubmitting(false);
      }
    } else {
      // Single technician submission
      const submitData = {
        ...formData,
        recorded_by: currentUser?.id
      };
      
      // If sick leave, prepend reason to notes
      if (formData.status_type === 'on_leave_sick' && sickLeaveReason) {
        submitData.notes = `Sick Leave Reason: ${sickLeaveReason}${formData.notes ? '\n' + formData.notes : ''}`;
      }
      
      createMutation.mutate(submitData);
    }
  };

  const downloadTemplate = () => {
    const template = `# Daily Activity Log Template
# status_type options: at_site, in_camp, hospital_visit, visa_renewal, shopping, prayer, on_leave_sick, on_leave_annual, unaccounted, other_out_of_camp
# For at_site: provide site_name. For other types: provide location_details
employee_id,date,status_type,site_name,location_details,check_in_time,check_out_time,notes
EMP001,2024-01-15,at_site,Site A - Project X,,08:00,17:00,Regular work day
EMP002,2024-01-15,hospital_visit,,City Hospital,09:00,11:00,Routine checkup
EMP003,2024-01-15,shopping,,Mall of Dubai,14:00,16:00,Grocery shopping
EMP004,2024-01-15,prayer,,Camp Mosque,13:00,13:30,Friday prayer
EMP005,2024-01-15,in_camp,,,,,"Resting in camp"`;

    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'daily_activity_template.csv';
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
      
      const schema = await base44.entities.DailyStatus.schema();
      const extractResult = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: {
          type: "array",
          items: schema
        }
      });

      if (extractResult.status === "success" && extractResult.output) {
        // Map employee_id to technician_id and site_name to site_id
        const processedData = await Promise.all(extractResult.output.map(async (row) => {
          const tech = technicians.find(t => t.employee_id === row.employee_id);
          let siteId = null;
          
          if (row.site_name) {
            const site = sites.find(s => s.name === row.site_name);
            siteId = site?.id;
          }
          
          return {
            technician_id: tech?.id,
            date: row.date,
            status_type: row.status_type,
            site_id: siteId,
            location_details: row.location_details,
            check_in_time: row.check_in_time,
            check_out_time: row.check_out_time,
            notes: row.notes,
            recorded_by: currentUser?.id
          };
        }));

        const validData = processedData.filter(d => d.technician_id); // Only process rows where technician is found
        await bulkCreateMutation.mutateAsync(validData); // This will trigger the onSuccess for bulkCreateMutation
        setUploadResult({ success: true, count: validData.length }); // Custom success message for this specific dialog
        setBulkFile(null); // Clear the file input
      } else {
        setUploadResult({ success: false, error: extractResult.details || "Failed to extract data from file" });
      }
    } catch (error) {
      setUploadResult({ success: false, error: error.message || "An unexpected error occurred during upload." });
    } finally {
      setUploading(false);
    }
  };

  const getStatusIcon = (statusType) => {
    const icons = {
      'at_site': '🏗️',
      'in_camp': '🏠',
      'hospital_visit': '🏥',
      'visa_renewal': '📋',
      'shopping': '🛒',
      'prayer': '🕌',
      'on_leave_sick': '🤒',
      'on_leave_annual': '🏖️',
      'unaccounted': '❓',
      'other_out_of_camp': '📍'
    };
    return icons[statusType] || '📍';
  };

  const getStatusColor = (statusType) => {
    const colors = {
      'at_site': 'bg-blue-100 text-blue-700',
      'in_camp': 'bg-green-100 text-green-700',
      'hospital_visit': 'bg-red-100 text-red-700',
      'visa_renewal': 'bg-purple-100 text-purple-700',
      'shopping': 'bg-pink-100 text-pink-700',
      'prayer': 'bg-teal-100 text-teal-700',
      'on_leave_sick': 'bg-orange-100 text-orange-700',
      'on_leave_annual': 'bg-yellow-100 text-yellow-700',
      'unaccounted': 'bg-gray-100 text-gray-700',
      'other_out_of_camp': 'bg-indigo-100 text-indigo-700'
    };
    return colors[statusType] || 'bg-gray-100 text-gray-700';
  };

  // Apply quick filters first
  let filteredStatuses = dailyStatuses.filter(status => {
    const tech = technicians.find(t => t.id === status.technician_id);
    const matchesDate = !filterDate || status.date === filterDate;
    const matchesStatus = filterStatus === 'all' || status.status_type === filterStatus;
    const matchesSearch = !searchQuery || 
      tech?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tech?.employee_id?.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesDate && matchesStatus && matchesSearch;
  });

  // Apply Excel-style column filters
  filteredStatuses = filteredStatuses.filter(status => {
    const tech = technicians.find(t => t.id === status.technician_id);
    const site = sites.find(s => s.id === status.site_id);

    // For date column filter, format dates to match 'dd/MM/yyyy' if not '-'
    const formattedStatusDate = status.date ? format(parseISO(status.date), 'dd/MM/yyyy') : '-';
    if (filterDateCol.length > 0 && !filterDateCol.includes(formattedStatusDate)) return false;

    if (filterEmployeeName.length > 0 && !filterEmployeeName.includes(tech?.full_name || '-')) return false;
    if (filterEmployeeId.length > 0 && !filterEmployeeId.includes(tech?.employee_id || '-')) return false;
    
    // For status type column filter, format to match 'ICON Status Type'
    const formattedStatusType = status.status_type ? `${getStatusIcon(status.status_type)} ${status.status_type.replace(/_/g, ' ')}` : '-';
    if (filterStatusType.length > 0 && !filterStatusType.includes(formattedStatusType)) return false;
    
    if (filterSite.length > 0 && !filterSite.includes(site?.name || '-')) return false;
    if (filterLocation.length > 0 && !filterLocation.includes(status.location_details || '-')) return false;
    if (filterCheckIn.length > 0 && !filterCheckIn.includes(status.check_in_time || '-')) return false;
    if (filterCheckOut.length > 0 && !filterCheckOut.includes(status.check_out_time || '-')) return false;

    return true;
  });

  // Get unique values for each column (from original data for full selection)
  const uniqueDates = [...new Set(dailyStatuses.map(s => s.date || '-'))]
    .sort((a, b) => {
      if (a === '-' || b === '-') return a.localeCompare(b);
      return new Date(b).getTime() - new Date(a).getTime();
    })
    .map(date => date === '-' ? '-' : format(parseISO(date), 'dd/MM/yyyy'));

  const uniqueEmployeeNames = [...new Set(dailyStatuses.map(s => {
    const tech = technicians.find(t => t.id === s.technician_id);
    return tech?.full_name || '-';
  }))].sort();
  const uniqueEmployeeIds = [...new Set(dailyStatuses.map(s => {
    const tech = technicians.find(t => t.id === s.technician_id);
    return tech?.employee_id || '-';
  }))].sort();
  const uniqueStatusTypes = [...new Set(dailyStatuses.map(s => s.status_type || '-'))]
    .sort()
    .map(type => type === '-' ? '-' : `${getStatusIcon(type)} ${type.replace(/_/g, ' ')}`);
  const uniqueSites = [...new Set(dailyStatuses.map(s => {
    const site = sites.find(si => si.id === s.site_id);
    return site?.name || '-';
  }))].sort();
  const uniqueLocations = [...new Set(dailyStatuses.map(s => s.location_details || '-'))].sort();
  const uniqueCheckIns = [...new Set(dailyStatuses.map(s => s.check_in_time || '-'))].sort();
  const uniqueCheckOuts = [...new Set(dailyStatuses.map(s => s.check_out_time || '-'))].sort();

  // Sort activities
  const sortedStatuses = [...filteredStatuses].sort((a, b) => {
    let aVal, bVal;

    switch (sortField) {
      case 'date':
        aVal = a.date ? new Date(a.date).getTime() : 0;
        bVal = b.date ? new Date(b.date).getTime() : 0;
        break;
      case 'employee_name':
        aVal = technicians.find(t => t.id === a.technician_id)?.full_name || '';
        bVal = technicians.find(t => t.id === b.technician_id)?.full_name || '';
        break;
      case 'employee_id':
        aVal = technicians.find(t => t.id === a.technician_id)?.employee_id || '';
        bVal = technicians.find(t => t.id === b.technician_id)?.employee_id || '';
        break;
      case 'status_type':
        aVal = a.status_type || '';
        bVal = b.status_type || '';
        break;
      case 'site':
        aVal = sites.find(s => s.id === a.site_id)?.name || '';
        bVal = sites.find(s => s.id === b.site_id)?.name || '';
        break;
      case 'location_details':
        aVal = a.location_details || '';
        bVal = b.location_details || '';
        break;
      case 'check_in_time':
      case 'check_out_time':
        aVal = a[sortField] || '';
        bVal = b[sortField] || '';
        // Handle time comparison by converting to a comparable format, e.g., minutes from midnight
        if (aVal && typeof aVal === 'string' && aVal.includes(':') && bVal && typeof bVal === 'string' && bVal.includes(':')) {
          const [aH, aM] = aVal.split(':').map(Number);
          const [bH, bM] = bVal.split(':').map(Number);
          aVal = aH * 60 + aM;
          bVal = bH * 60 + bM;
        }
        break;
      default:
        aVal = a[sortField] || '';
        bVal = b[sortField] || '';
    }
    
    if (aVal === bVal) return 0;
    
    let comparison = 0;
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      comparison = aVal - bVal;
    } else {
      comparison = String(aVal).localeCompare(String(bVal));
    }

    return sortDirection === 'asc' ? comparison : -comparison;
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
    setFilterDateCol([]);
    setFilterEmployeeName([]);
    setFilterEmployeeId([]);
    setFilterStatusType([]);
    setFilterSite([]);
    setFilterLocation([]);
    setFilterCheckIn([]);
    setFilterCheckOut([]);
  };

  const hasActiveColumnFilters = filterDateCol.length > 0 || filterEmployeeName.length > 0 ||
    filterEmployeeId.length > 0 || filterStatusType.length > 0 || filterSite.length > 0 ||
    filterLocation.length > 0 || filterCheckIn.length > 0 || filterCheckOut.length > 0;

  // Column Filter Component
  const ColumnFilter = ({ values, selected, setSelected, searchValue, setSearchValue, headerText }) => {
    const filteredValues = values.filter(v =>
      v.toLowerCase().includes(searchValue.toLowerCase())
    );

    const toggleValue = (value) => {
      setSelected(prevSelected => {
        if (prevSelected.includes(value)) {
          return prevSelected.filter(v => v !== value);
        } else {
          return [...prevSelected, value];
        }
      });
    };

    const isAllSelected = selected.length === values.length && values.length > 0;
    const isIndeterminate = selected.length > 0 && selected.length < values.length;

    const handleSelectAll = (checked) => {
      if (checked) {
        setSelected([...values]);
      } else {
        setSelected([]);
      }
    };

    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 px-2 -mr-1">
            <Filter className={`w-3 h-3 ${selected.length > 0 ? 'text-blue-600' : 'text-gray-400'}`} />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-0" align="start">
          <div className="p-2 border-b">
            <Input
              placeholder={`Search ${headerText}...`}
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              className="h-8"
            />
          </div>
          <div className="max-h-64 overflow-y-auto p-2">
            {values.length > 0 && (
              <div className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded cursor-pointer" onClick={() => handleSelectAll(!isAllSelected)}>
                <Checkbox
                  checked={isAllSelected}
                  indeterminate={isIndeterminate}
                  onCheckedChange={handleSelectAll}
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
    const headers = ['Date', 'Employee Name', 'Employee ID', 'Status Type', 'Site', 'Location Details', 'Check-in Time', 'Check-out Time', 'Notes'];
    const rows = sortedStatuses.map(status => {
      const tech = technicians.find(t => t.id === status.technician_id);
      const site = sites.find(s => s.id === status.site_id);

      return [
        status.date ? format(parseISO(status.date), 'dd/MM/yyyy') : '-',
        tech?.full_name || '-',
        tech?.employee_id || '-',
        status.status_type?.replace(/_/g, ' ') || '-',
        site?.name || '-',
        status.location_details || '-',
        status.check_in_time || '-',
        status.check_out_time || '-',
        status.notes || '-'
      ];
    });

    const csv = [
      headers.map(h => `"${h}"`).join(','),
      ...rows.map(row => row.map(cell => `"${cell?.toString().replace(/"/g, '""')}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `daily_activity_log_${format(new Date(), 'yyyy-MM-dd_HH-mm-ss')}.csv`;
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
            border-collapse: collapse; /* Ensure table borders are visible */
          }
          #printable-table table {
            width: 100%;
            border-collapse: collapse;
            font-size: 10px;
          }
          #printable-table th, 
          #printable-table td {
            border: 1px solid #000;
            padding: 4px;
            text-align: left;
            background-color: transparent !important; /* Remove background colors for print */
            color: black !important; /* Ensure text is black */
          }
          #printable-table th {
            background-color: #f3f4f6 !important;
            font-weight: bold;
          }
          #printable-table tr:hover {
            background-color: inherit !important;
          }
          /* Hide non-essential elements for print */
          .no-print {
            display: none !important;
          }
          /* Ensure badge content is visible */
          #printable-table .badge {
            background-color: transparent !important;
            color: black !important;
            border: 1px solid #ccc;
            padding: 2px 4px;
            display: inline-block;
          }
          #printable-table tr {
            page-break-inside: avoid;
          }
          @page {
            size: landscape;
            margin: 1cm;
          }
          /* Ensure header/footer is clear for print */
          header, footer, nav, aside, .button, .input, .select, .dialog, .popover, .alert, .card-header, .card-footer {
            display: none !important;
          }
          /* Ensure page title is visible */
          h1 {
            visibility: visible !important;
            display: block !important;
            font-size: 24px;
            margin-bottom: 20px;
            text-align: center;
          }
        }
      `}</style>

      <div className="max-w-[1800px] mx-auto space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 no-print">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Daily Activity Log</h1>
            <p className="text-gray-600 mt-1">Track technician daily activities and whereabouts</p>
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
              Log Activity
            </Button>
          </div>
        </div>

        {/* Quick Filters */}
        <Card className="border-none shadow-md no-print">
          <CardContent className="p-6">
            <div className="grid md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Filter by Date</Label>
                <div className="relative">
                  <CalendarIcon className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                  <Input
                    type="date"
                    value={filterDate}
                    onChange={(e) => setFilterDate(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Filter by Status</Label>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="at_site">At Site</SelectItem>
                    <SelectItem value="in_camp">In Camp</SelectItem>
                    <SelectItem value="hospital_visit">Hospital Visit</SelectItem>
                    <SelectItem value="visa_renewal">Visa Renewal</SelectItem>
                    <SelectItem value="shopping">Shopping</SelectItem>
                    <SelectItem value="prayer">Prayer</SelectItem>
                    <SelectItem value="on_leave_sick">Sick Leave</SelectItem>
                    <SelectItem value="on_leave_annual">Annual Leave</SelectItem>
                    <SelectItem value="unaccounted">Unaccounted</SelectItem>
                    <SelectItem value="other_out_of_camp">Other Out of Camp</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Search Technician</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Name or Employee ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2 flex items-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setFilterDate(""); // Changed to empty string to clear the filter
                    setFilterStatus("all");
                    setSearchQuery("");
                  }}
                  className="w-full"
                >
                  Clear Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Activity Table */}
        <Card className="border-none shadow-lg overflow-hidden" id="printable-table">
          {hasActiveColumnFilters && (
            <div className="bg-blue-50 border-b border-blue-200 px-6 py-3 no-print">
              <div className="flex items-center justify-between">
                <p className="text-sm text-blue-700 font-medium">
                  <Filter className="w-4 h-4 inline mr-2" />
                  Column filters active
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAllColumnFilters}
                  className="text-blue-700 hover:text-blue-900 hover:bg-blue-100"
                >
                  <X className="w-4 h-4 mr-1" />
                  Clear All Column Filters
                </Button>
              </div>
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse bg-white">
              <thead>
                <tr className="border-b-2 border-gray-300">
                  <th className="min-w-[120px] px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                    <div className="flex items-center justify-between gap-1">
                      <span>Date</span>
                      <div className="flex gap-1 items-center no-print">
                        <Button variant="ghost" size="sm" className="h-8 px-2 -mr-1" onClick={() => handleSort('date')}>
                          <ArrowUpDown className={`w-3 h-3 ${sortField === 'date' ? 'text-blue-600' : 'text-gray-400'}`} />
                        </Button>
                        <ColumnFilter
                          values={uniqueDates}
                          selected={filterDateCol}
                          setSelected={setFilterDateCol}
                          searchValue={searchDateCol}
                          setSearchValue={setSearchDateCol}
                          headerText="Date"
                        />
                      </div>
                    </div>
                  </th>
                  <th className="min-w-[150px] px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                    <div className="flex items-center justify-between gap-1">
                      <span>Employee Name</span>
                      <div className="flex gap-1 items-center no-print">
                        <Button variant="ghost" size="sm" className="h-8 px-2 -mr-1" onClick={() => handleSort('employee_name')}>
                          <ArrowUpDown className={`w-3 h-3 ${sortField === 'employee_name' ? 'text-blue-600' : 'text-gray-400'}`} />
                        </Button>
                        <ColumnFilter
                          values={uniqueEmployeeNames}
                          selected={filterEmployeeName}
                          setSelected={setFilterEmployeeName}
                          searchValue={searchEmployeeName}
                          setSearchValue={setSearchEmployeeName}
                          headerText="Employee Name"
                        />
                      </div>
                    </div>
                  </th>
                  <th className="min-w-[120px] px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                    <div className="flex items-center justify-between gap-1">
                      <span>Employee ID</span>
                      <div className="flex gap-1 items-center no-print">
                        <Button variant="ghost" size="sm" className="h-8 px-2 -mr-1" onClick={() => handleSort('employee_id')}>
                          <ArrowUpDown className={`w-3 h-3 ${sortField === 'employee_id' ? 'text-blue-600' : 'text-gray-400'}`} />
                        </Button>
                        <ColumnFilter
                          values={uniqueEmployeeIds}
                          selected={filterEmployeeId}
                          setSelected={setFilterEmployeeId}
                          searchValue={searchEmployeeId}
                          setSearchValue={setSearchEmployeeId}
                          headerText="Employee ID"
                        />
                      </div>
                    </div>
                  </th>
                  <th className="min-w-[150px] px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                    <div className="flex items-center justify-between gap-1">
                      <span>Activity Status</span>
                      <div className="flex gap-1 items-center no-print">
                        <Button variant="ghost" size="sm" className="h-8 px-2 -mr-1" onClick={() => handleSort('status_type')}>
                          <ArrowUpDown className={`w-3 h-3 ${sortField === 'status_type' ? 'text-blue-600' : 'text-gray-400'}`} />
                        </Button>
                        <ColumnFilter
                          values={uniqueStatusTypes}
                          selected={filterStatusType}
                          setSelected={setFilterStatusType}
                          searchValue={searchStatusType}
                          setSearchValue={setSearchStatusType}
                          headerText="Activity Status"
                        />
                      </div>
                    </div>
                  </th>
                  <th className="min-w-[150px] px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                    <div className="flex items-center justify-between gap-1">
                      <span>Site</span>
                      <div className="flex gap-1 items-center no-print">
                        <Button variant="ghost" size="sm" className="h-8 px-2 -mr-1" onClick={() => handleSort('site')}>
                          <ArrowUpDown className={`w-3 h-3 ${sortField === 'site' ? 'text-blue-600' : 'text-gray-400'}`} />
                        </Button>
                        <ColumnFilter
                          values={uniqueSites}
                          selected={filterSite}
                          setSelected={setFilterSite}
                          searchValue={searchSite}
                          setSearchValue={setSearchSite}
                          headerText="Site"
                        />
                      </div>
                    </div>
                  </th>
                  <th className="min-w-[200px] px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                    <div className="flex items-center justify-between gap-1">
                      <span>Location Details</span>
                      <div className="flex gap-1 items-center no-print">
                        <Button variant="ghost" size="sm" className="h-8 px-2 -mr-1" onClick={() => handleSort('location_details')}>
                          <ArrowUpDown className={`w-3 h-3 ${sortField === 'location_details' ? 'text-blue-600' : 'text-gray-400'}`} />
                        </Button>
                        <ColumnFilter
                          values={uniqueLocations}
                          selected={filterLocation}
                          setSelected={setFilterLocation}
                          searchValue={searchLocation}
                          setSearchValue={setSearchLocation}
                          headerText="Location Details"
                        />
                      </div>
                    </div>
                  </th>
                  <th className="min-w-[120px] px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                    <div className="flex items-center justify-between gap-1">
                      <span>Check-in</span>
                      <div className="flex gap-1 items-center no-print">
                        <Button variant="ghost" size="sm" className="h-8 px-2 -mr-1" onClick={() => handleSort('check_in_time')}>
                          <ArrowUpDown className={`w-3 h-3 ${sortField === 'check_in_time' ? 'text-blue-600' : 'text-gray-400'}`} />
                        </Button>
                        <ColumnFilter
                          values={uniqueCheckIns}
                          selected={filterCheckIn}
                          setSelected={setFilterCheckIn}
                          searchValue={searchCheckIn}
                          setSearchValue={setSearchCheckIn}
                          headerText="Check-in"
                        />
                      </div>
                    </div>
                  </th>
                  <th className="min-w-[120px] px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                    <div className="flex items-center justify-between gap-1">
                      <span>Check-out</span>
                      <div className="flex gap-1 items-center no-print">
                        <Button variant="ghost" size="sm" className="h-8 px-2 -mr-1" onClick={() => handleSort('check_out_time')}>
                          <ArrowUpDown className={`w-3 h-3 ${sortField === 'check_out_time' ? 'text-blue-600' : 'text-gray-400'}`} />
                        </Button>
                        <ColumnFilter
                          values={uniqueCheckOuts}
                          selected={filterCheckOut}
                          setSelected={setFilterCheckOut}
                          searchValue={searchCheckOut}
                          setSearchValue={setSearchCheckOut}
                          headerText="Check-out"
                        />
                      </div>
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50">
                    Notes
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedStatuses.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="px-4 py-12 text-center text-gray-500">
                      <CalendarIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p>No activities logged for selected filters</p>
                    </td>
                  </tr>
                ) : (
                  sortedStatuses.map((status, index) => {
                    const tech = technicians.find(t => t.id === status.technician_id);
                    const site = sites.find(s => s.id === status.site_id);
                    
                    return (
                      <tr
                        key={status.id}
                        className={`border-b border-gray-200 hover:bg-blue-50 transition-colors ${
                          index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                        }`}
                      >
                        <td className="px-4 py-3 text-sm text-gray-900 border-r border-gray-200 whitespace-nowrap font-medium">
                          {status.date ? format(parseISO(status.date), 'dd/MM/yyyy') : '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 border-r border-gray-200 whitespace-nowrap">
                          {tech?.full_name || 'Unknown'}
                        </td>
                        <td className="px-4 py-3 text-sm text-blue-600 font-medium border-r border-gray-200 whitespace-nowrap">
                          {tech?.employee_id || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm border-r border-gray-200 whitespace-nowrap">
                          <Badge className={`${getStatusColor(status.status_type)} badge`}>
                            {getStatusIcon(status.status_type)} {status.status_type?.replace(/_/g, ' ')}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 border-r border-gray-200 whitespace-nowrap">
                          {site?.name || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 border-r border-gray-200">
                          {status.location_details || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 border-r border-gray-200 whitespace-nowrap">
                          {status.check_in_time || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 border-r border-gray-200 whitespace-nowrap">
                          {status.check_out_time || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 max-w-xs">
                          {status.notes || '-'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {sortedStatuses.length > 0 && (
            <div className="bg-gray-50 px-6 py-3 border-t border-gray-200 no-print">
              <p className="text-sm text-gray-600">
                Showing <span className="font-semibold">{sortedStatuses.length}</span> of <span className="font-semibold">{dailyStatuses.length}</span> activities
              </p>
            </div>
          )}
        </Card>
      </div>

      {/* Add Activity Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Log Daily Activity</DialogTitle>
          </DialogHeader>
          
          {submitResult && (
            <Alert variant={submitResult.success ? "default" : "destructive"} className="mb-4">
              <AlertDescription>
                {submitResult.success ? (
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5" />
                    <span>Successfully logged activity for {submitResult.count} technician(s)!</span>
                  </div>
                ) : (
                  <span>Error: {submitResult.error}</span>
                )}
              </AlertDescription>
            </Alert>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Technician(s)*</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className="w-full justify-between min-h-[38px] h-auto"
                  >
                    <div className="flex flex-wrap gap-1 flex-1">
                      {selectedTechnicianIds.length === 0 ? (
                        <span className="text-gray-500">Select technician(s)...</span>
                      ) : (
                        selectedTechnicianIds.map(id => {
                          const tech = technicians.find(t => t.id === id);
                          return tech ? (
                            <Badge key={id} variant="secondary" className="gap-1">
                              {tech.full_name} ({tech.employee_id})
                              <X 
                                className="h-3 w-3 cursor-pointer hover:text-red-600" 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedTechnicianIds(prev => prev.filter(tId => tId !== id));
                                }}
                              />
                            </Badge>
                          ) : null;
                        })
                      )}
                    </div>
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
                      {filteredTechnicians.map((tech) => (
                        <CommandItem
                          key={tech.id}
                          value={tech.id}
                          onSelect={() => {
                            if (selectedTechnicianIds.includes(tech.id)) {
                              setSelectedTechnicianIds(prev => prev.filter(id => id !== tech.id));
                            } else {
                              setSelectedTechnicianIds(prev => [...prev, tech.id]);
                            }
                          }}
                        >
                          <div className="flex items-center gap-2 flex-1">
                            <Checkbox 
                              checked={selectedTechnicianIds.includes(tech.id)}
                              onCheckedChange={() => {
                                // This is handled by the onSelect of CommandItem, but Checkbox needs onCheckedChange prop
                                if (selectedTechnicianIds.includes(tech.id)) {
                                  setSelectedTechnicianIds(prev => prev.filter(id => id !== tech.id));
                                } else {
                                  setSelectedTechnicianIds(prev => [...prev, tech.id]);
                                }
                              }}
                            />
                            <div className="flex flex-col">
                              <span className="font-medium">{tech.full_name}</span>
                              <span className="text-xs text-gray-500">{tech.employee_id}</span>
                            </div>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </Command>
                  {selectedTechnicianIds.length > 0 && (
                    <div className="border-t p-2 bg-gray-50">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="w-full text-xs"
                        onClick={() => setSelectedTechnicianIds([])}
                      >
                        Clear All ({selectedTechnicianIds.length})
                      </Button>
                    </div>
                  )}
                </PopoverContent>
              </Popover>
              {selectedTechnicianIds.length > 0 && (
                <p className="text-xs text-gray-600">
                  {selectedTechnicianIds.length} technician(s) selected
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Date*</Label>
              <Input
                type="date"
                required
                value={selectedTechnicianIds.length > 0 ? selectedDate : formData.date || ''}
                onChange={(e) => {
                  if (selectedTechnicianIds.length > 0) {
                    setSelectedDate(e.target.value);
                  } else {
                    setFormData({...formData, date: e.target.value});
                  }
                }}
              />
            </div>

            <div className="space-y-2">
              <Label>Activity Status*</Label>
              <Select
                value={selectedTechnicianIds.length > 0 ? statusType : formData.status_type || ''}
                onValueChange={(val) => {
                  if (selectedTechnicianIds.length > 0) {
                    setStatusType(val);
                  } else {
                    setFormData({...formData, status_type: val});
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="at_site">🏗️ At Site</SelectItem>
                  <SelectItem value="in_camp">🏠 In Camp</SelectItem>
                  <SelectItem value="hospital_visit">🏥 Hospital Visit</SelectItem>
                  <SelectItem value="visa_renewal">📋 Visa Renewal</SelectItem>
                  <SelectItem value="shopping">🛒 Shopping</SelectItem>
                  <SelectItem value="prayer">🕌 Prayer</SelectItem>
                  <SelectItem value="on_leave_sick">🤒 Sick Leave</SelectItem>
                  <SelectItem value="on_leave_annual">🏖️ Annual Leave</SelectItem>
                  <SelectItem value="unaccounted">❓ Unaccounted</SelectItem>
                  <SelectItem value="other_out_of_camp">📍 Other Out of Camp</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(selectedTechnicianIds.length > 0 ? statusType : formData.status_type) === 'at_site' && (
              <div className="space-y-2">
                <Label>Site*</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className="w-full justify-between"
                    >
                      {(selectedTechnicianIds.length > 0 ? siteId : formData.site_id)
                        ? sites.find(s => s.id === (selectedTechnicianIds.length > 0 ? siteId : formData.site_id))?.name
                        : "Select site..."}
                      <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0" align="start">
                    <Command>
                      <CommandInput 
                        placeholder="Search by site name or location..." 
                        value={siteSearch}
                        onValueChange={setSiteSearch}
                      />
                      <CommandEmpty>No site found.</CommandEmpty>
                      <CommandGroup className="max-h-64 overflow-y-auto">
                        {filteredSites.map((site) => (
                          <CommandItem
                            key={site.id}
                            value={site.id}
                            onSelect={() => {
                              if (selectedTechnicianIds.length > 0) {
                                setSiteId(site.id);
                              } else {
                                setFormData({...formData, site_id: site.id});
                              }
                              setSiteSearch("");
                            }}
                          >
                            <div className="flex flex-col">
                              <span className="font-medium">{site.name}</span>
                              <span className="text-xs text-gray-500">{site.location}</span>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            )}

            {(selectedTechnicianIds.length > 0 ? statusType : formData.status_type) === 'on_leave_sick' && (
              <div className="space-y-2">
                <Label>Reason for Sick Leave* <span className="text-red-500">*</span></Label>
                <Textarea
                  required
                  value={sickLeaveReason}
                  onChange={(e) => setSickLeaveReason(e.target.value)}
                  rows={3}
                  placeholder="Please provide the reason for sick leave..."
                  className="border-orange-300 focus:border-orange-500"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>Location Details</Label>
              <Input
                value={selectedTechnicianIds.length > 0 ? locationDetails : formData.location_details || ''}
                onChange={(e) => {
                  if (selectedTechnicianIds.length > 0) {
                    setLocationDetails(e.target.value);
                  } else {
                    setFormData({...formData, location_details: e.target.value});
                  }
                }}
                placeholder="Specific location or address"
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Check-in Time</Label>
                <Input
                  type="time"
                  value={selectedTechnicianIds.length > 0 ? checkInTime : formData.check_in_time || ''}
                  onChange={(e) => {
                    if (selectedTechnicianIds.length > 0) {
                      setCheckInTime(e.target.value);
                    } else {
                      setFormData({...formData, check_in_time: e.target.value});
                    }
                  }}
                />
              </div>

              <div className="space-y-2">
                <Label>Check-out Time</Label>
                <Input
                  type="time"
                  value={selectedTechnicianIds.length > 0 ? checkOutTime : formData.check_out_time || ''}
                  onChange={(e) => {
                    if (selectedTechnicianIds.length > 0) {
                      setCheckOutTime(e.target.value);
                    } else {
                      setFormData({...formData, check_out_time: e.target.value});
                    }
                  }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={selectedTechnicianIds.length > 0 ? notes : formData.notes || ''}
                onChange={(e) => {
                  if (selectedTechnicianIds.length > 0) {
                    setNotes(e.target.value);
                  } else {
                    setFormData({...formData, notes: e.target.value});
                  }
                }}
                rows={3}
                placeholder="Additional details about the activity"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => {
                setShowAddDialog(false);
                setSelectedTechnicianIds([]); // Clear multi-select state
                setSelectedDate(format(new Date(), 'yyyy-MM-dd')); // Reset multi-select date state
                setStatusType(''); // Reset multi-select status type state
                setSiteId(''); // Reset multi-select site state
                setLocationDetails(''); // Reset multi-select location state
                setCheckInTime(''); // Reset multi-select check-in state
                setCheckOutTime(''); // Reset multi-select check-out state
                setNotes(''); // Reset multi-select notes state
                setSickLeaveReason(''); // Reset sick leave reason state
                setFormData({ date: format(new Date(), 'yyyy-MM-dd') }); // Reset single-select form data
                setSubmitResult(null); // Clear any submission results
              }}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                className="bg-blue-600 hover:bg-blue-700"
                disabled={submitting || (selectedTechnicianIds.length === 0 && !formData.technician_id)}
              >
                {submitting ? 'Logging...' : `Log Activity${selectedTechnicianIds.length > 1 ? ` (${selectedTechnicianIds.length})` : ''}`}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Bulk Upload Dialog */}
      <Dialog open={showBulkUploadDialog} onOpenChange={setShowBulkUploadDialog}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Bulk Upload Daily Activities</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Alert>
              <AlertDescription>
                Upload a CSV file with daily activity data. Download the template below to see the required format.
                Ensure `employee_id` and `site_name` (if applicable) exactly match existing records.
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
                <AlertDescription>
                  {uploadResult.success 
                    ? `Successfully uploaded ${uploadResult.count} activities!`
                    : `Error: ${uploadResult.error}`
                  }
                </AlertDescription>
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