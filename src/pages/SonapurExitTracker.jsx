import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { AlertCircle, CheckCircle2, Clock, LogOut, AlertTriangle, Download, Printer, Car, Plane, ChevronDown, ChevronUp, Search, ArrowUpDown, Filter, X } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { differenceInDays, parseISO, format } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export default function SonapurExitTracker() {
  const [selectedTechnician, setSelectedTechnician] = useState(null);
  const [expandedRows, setExpandedRows] = useState({});
  const [showVehicleDialog, setShowVehicleDialog] = useState(false);
  const [showDepartureDialog, setShowDepartureDialog] = useState(false);
  const [showDeportDialog, setShowDeportDialog] = useState(false);
  const [checklistData, setChecklistData] = useState({});
  const [vehicleData, setVehicleData] = useState({});
  const [selectedCamp, setSelectedCamp] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState("employee_id");
  const [sortDirection, setSortDirection] = useState("asc");

  // Excel-style column filters
  const [filterEmployeeId, setFilterEmployeeId] = useState([]);
  const [filterFullName, setFilterFullName] = useState([]);
  const [filterNationality, setFilterNationality] = useState([]);
  const [filterDaysInProcess, setFilterDaysInProcess] = useState([]);
  const [filterStatus, setFilterStatus] = useState([]);
  const [filterProgress, setFilterProgress] = useState([]);
  const [filterFlight, setFilterFlight] = useState([]);
  const [filterVehicle, setFilterVehicle] = useState([]);
  const [filterCamp, setFilterCamp] = useState([]);

  // Search states for column filters
  const [searchEmployeeId, setSearchEmployeeId] = useState("");
  const [searchFullName, setSearchFullName] = useState("");
  const [searchNationality, setSearchNationality] = useState("");
  const [searchDaysInProcess, setSearchDaysInProcess] = useState("");
  const [searchStatus, setSearchStatus] = useState("");
  const [searchProgress, setSearchProgress] = useState("");
  const [searchFlight, setSearchFlight] = useState("");
  const [searchVehicle, setSearchVehicle] = useState("");
  const [searchCamp, setSearchCamp] = useState("");

  const queryClient = useQueryClient();

  const { data: technicians = [] } = useQuery({
    queryKey: ['technicians'],
    queryFn: () => base44.entities.Technician.list(),
  });

  const { data: camps = [] } = useQuery({
    queryKey: ['camps'],
    queryFn: () => base44.entities.Camp.list(),
  });

  const { data: beds = [] } = useQuery({
    queryKey: ['beds'],
    queryFn: () => base44.entities.Bed.list(),
  });

  const updateTechnicianMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Technician.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['technicians'] });
      setShowVehicleDialog(false);
      setShowDepartureDialog(false);
      setSelectedTechnician(null);
    },
  });

  const updateBedMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Bed.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['beds'] });
    },
  });

  // Find Sonapur Exit Camp(s)
  const sonapurExitCamps = camps.filter(camp => {
    const nameMatch = camp.name?.toLowerCase().includes('sonapur') && camp.name?.toLowerCase().includes('exit');
    const codeMatch = camp.code?.toLowerCase().includes('sonapur') && camp.code?.toLowerCase().includes('exit');
    return nameMatch || codeMatch;
  });

  // Get technicians in exit process at Sonapur
  const techniciansInExitProcess = technicians.filter(tech => {
    const isInSonapurExit = sonapurExitCamps.some(camp => camp.id === tech.camp_id);
    const hasStartedProcess = tech.sonapur_exit_start_date && tech.exit_process_status !== 'formalities_completed';
    
    return isInSonapurExit && hasStartedProcess;
  }).map(tech => {
    const daysInProcess = tech.sonapur_exit_start_date 
      ? differenceInDays(new Date(), parseISO(tech.sonapur_exit_start_date))
      : 0;
    
    const isOverdue = daysInProcess > 7;
    
    const checklistItems = [
      tech.toolbox_returned,
      tech.id_card_returned,
      tech.penalty_cleared,
      tech.ticket_booked,
      tech.final_settlement_processed,
      tech.medical_cleared,
      tech.exit_visa_obtained,
      tech.handover_completed,
      tech.personal_belongings_cleared
    ];
    
    const completedCount = checklistItems.filter(item => item === true).length;
    const totalCount = checklistItems.length;
    const allCompleted = completedCount === totalCount;
    
    return {
      ...tech,
      daysInProcess,
      isOverdue,
      completedCount,
      totalCount,
      allCompleted
    };
  });

  // Apply camp filter
  let filteredTechnicians = selectedCamp === "all" 
    ? techniciansInExitProcess
    : techniciansInExitProcess.filter(t => t.camp_id === selectedCamp);

  // Apply global search
  if (searchQuery.trim()) {
    const searchLower = searchQuery.toLowerCase();
    filteredTechnicians = filteredTechnicians.filter(tech =>
      tech.employee_id?.toLowerCase().includes(searchLower) ||
      tech.full_name?.toLowerCase().includes(searchLower) ||
      tech.nationality?.toLowerCase().includes(searchLower)
    );
  }

  // Apply Excel-style column filters
  filteredTechnicians = filteredTechnicians.filter(tech => {
    const camp = camps.find(c => c.id === tech.camp_id);
    const statusText = tech.isOverdue ? 'Overdue' : 'On Track';
    const progressText = `${tech.completedCount}/${tech.totalCount}`;
    const flightText = tech.exit_flight_number || 'Not scheduled';
    const vehicleText = tech.airport_drop_vehicle_number || 'Not assigned';
    const campName = camp?.name || '-';

    if (filterEmployeeId.length > 0 && !filterEmployeeId.includes(tech.employee_id || '-')) return false;
    if (filterFullName.length > 0 && !filterFullName.includes(tech.full_name || '-')) return false;
    if (filterNationality.length > 0 && !filterNationality.includes(tech.nationality || '-')) return false;
    if (filterDaysInProcess.length > 0 && !filterDaysInProcess.includes(`Day ${tech.daysInProcess}`)) return false;
    if (filterStatus.length > 0 && !filterStatus.includes(statusText)) return false;
    if (filterProgress.length > 0 && !filterProgress.includes(progressText)) return false;
    if (filterFlight.length > 0 && !filterFlight.includes(flightText)) return false;
    if (filterVehicle.length > 0 && !filterVehicle.includes(vehicleText)) return false;
    if (filterCamp.length > 0 && !filterCamp.includes(campName)) return false;

    return true;
  });

  // Sort technicians
  const sortedTechnicians = [...filteredTechnicians].sort((a, b) => {
    let aVal, bVal;
    
    switch (sortField) {
      case 'employee_id':
        aVal = a.employee_id || '';
        bVal = b.employee_id || '';
        break;
      case 'full_name':
        aVal = a.full_name || '';
        bVal = b.full_name || '';
        break;
      case 'nationality':
        aVal = a.nationality || '';
        bVal = b.nationality || '';
        break;
      case 'daysInProcess':
        aVal = a.daysInProcess;
        bVal = b.daysInProcess;
        break;
      case 'progress':
        aVal = a.completedCount;
        bVal = b.completedCount;
        break;
      default:
        aVal = '';
        bVal = '';
    }

    if (sortDirection === 'asc') {
      return typeof aVal === 'string' ? aVal.localeCompare(bVal) : aVal - bVal;
    } else {
      return typeof aVal === 'string' ? bVal.localeCompare(aVal) : bVal - aVal;
    }
  });

  // Get unique values for filters
  const uniqueEmployeeIds = [...new Set(techniciansInExitProcess.map(t => t.employee_id || '-'))].sort();
  const uniqueFullNames = [...new Set(techniciansInExitProcess.map(t => t.full_name || '-'))].sort();
  const uniqueNationalities = [...new Set(techniciansInExitProcess.map(t => t.nationality || '-'))].sort();
  const uniqueDaysInProcess = [...new Set(techniciansInExitProcess.map(t => `Day ${t.daysInProcess}`))].sort((a, b) => {
    const aNum = parseInt(a.replace('Day ', ''));
    const bNum = parseInt(b.replace('Day ', ''));
    return aNum - bNum;
  });
  const uniqueStatuses = ['On Track', 'Overdue'];
  const uniqueProgress = [...new Set(techniciansInExitProcess.map(t => `${t.completedCount}/${t.totalCount}`))].sort();
  const uniqueFlights = [...new Set(techniciansInExitProcess.map(t => t.exit_flight_number || 'Not scheduled'))].sort();
  const uniqueVehicles = [...new Set(techniciansInExitProcess.map(t => t.airport_drop_vehicle_number || 'Not assigned'))].sort();
  const uniqueCamps = [...new Set(techniciansInExitProcess.map(t => {
    const camp = camps.find(c => c.id === t.camp_id);
    return camp?.name || '-';
  }))].sort();

  const onTrackCount = filteredTechnicians.filter(t => !t.isOverdue).length;
  const overdueCount = filteredTechnicians.filter(t => t.isOverdue).length;

  const toggleRowExpansion = (techId) => {
    setExpandedRows(prev => ({
      ...prev,
      [techId]: !prev[techId]
    }));
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const clearAllFilters = () => {
    setFilterEmployeeId([]);
    setFilterFullName([]);
    setFilterNationality([]);
    setFilterDaysInProcess([]);
    setFilterStatus([]);
    setFilterProgress([]);
    setFilterFlight([]);
    setFilterVehicle([]);
    setFilterCamp([]);
    setSearchQuery("");
    setSelectedCamp("all");
  };

  const hasActiveFilters = 
    filterEmployeeId.length > 0 ||
    filterFullName.length > 0 ||
    filterNationality.length > 0 ||
    filterDaysInProcess.length > 0 ||
    filterStatus.length > 0 ||
    filterProgress.length > 0 ||
    filterFlight.length > 0 ||
    filterVehicle.length > 0 ||
    filterCamp.length > 0 ||
    searchQuery.trim() !== "" ||
    selectedCamp !== "all";

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
          <Button variant="ghost" size="sm" className="h-8 px-2" onClick={(e) => e.stopPropagation()}>
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

  const handleUpdateChecklistInline = async (tech, field, value) => {
    const updatedData = {
      [field]: value
    };

    const checklistFields = [
      'toolbox_returned',
      'id_card_returned',
      'penalty_cleared',
      'ticket_booked',
      'final_settlement_processed',
      'medical_cleared',
      'exit_visa_obtained',
      'handover_completed',
      'personal_belongings_cleared'
    ];

    const allValues = checklistFields.map(f => 
      f === field ? value : tech[f]
    );
    const allCompleted = allValues.every(v => v === true);

    const daysInProcess = tech.sonapur_exit_start_date 
      ? differenceInDays(new Date(), parseISO(tech.sonapur_exit_start_date))
      : 0;
    
    let newStatus = 'in_process';
    if (daysInProcess > 7 && !allCompleted) {
      newStatus = 'overdue';
    }

    updatedData.exit_process_status = newStatus;

    await updateTechnicianMutation.mutateAsync({
      id: tech.id,
      data: updatedData
    });
  };

  const handleAssignVehicle = (tech) => {
    setSelectedTechnician(tech);
    setVehicleData({
      exit_flight_number: tech.exit_flight_number || '',
      exit_flight_time: tech.exit_flight_time || '',
      expected_country_exit_date: tech.expected_country_exit_date || '',
      airport_drop_vehicle_number: tech.airport_drop_vehicle_number || '',
      airport_drop_driver_name: tech.airport_drop_driver_name || '',
      airport_drop_scheduled_time: tech.airport_drop_scheduled_time || '',
      airport_drop_status: tech.airport_drop_status || 'not_scheduled'
    });
    setShowVehicleDialog(true);
  };

  const handleSaveVehicleAssignment = async () => {
    if (!selectedTechnician) return;

    if (!vehicleData.airport_drop_vehicle_number || !vehicleData.airport_drop_driver_name) {
      alert("Please enter vehicle number and driver name");
      return;
    }

    await updateTechnicianMutation.mutateAsync({
      id: selectedTechnician.id,
      data: {
        ...vehicleData,
        airport_drop_status: 'scheduled'
      }
    });

    alert(`✅ Vehicle assigned for ${selectedTechnician.full_name}'s airport drop`);
  };

  const handleMarkDeparture = (tech) => {
    setSelectedTechnician(tech);
    setShowDepartureDialog(true);
  };

  const handleConfirmDeparture = async () => {
    if (!selectedTechnician) return;

    if (!confirm(`Confirm that ${selectedTechnician.full_name} has departed for the airport and left the country?`)) {
      return;
    }

    try {
      // First update the technician
      await updateTechnicianMutation.mutateAsync({
        id: selectedTechnician.id,
        data: {
          airport_drop_status: 'dropped_at_airport',
          actual_country_exit_date: format(new Date(), 'yyyy-MM-dd'),
          status: 'exited_country',
          exit_process_status: 'formalities_completed',
          exit_formal_completion_date: format(new Date(), 'yyyy-MM-dd'),
          bed_id: null,
          camp_id: null
        }
      });

      // Then free the bed
      if (selectedTechnician.bed_id) {
        await updateBedMutation.mutateAsync({
          id: selectedTechnician.bed_id,
          data: {
            status: 'available',
            technician_id: null,
            reserved_for: null,
            reserved_until: null
          }
        });
      }

      alert(`✅ ${selectedTechnician.full_name} marked as departed. Status updated to "Exited Country".`);
      setShowDepartureDialog(false);
      setSelectedTechnician(null);
    } catch (error) {
      console.error('Error confirming departure:', error);
      alert(`Failed to mark departure: ${error.response?.data?.message || error.message}`);
    }
  };

  const handleSetDeportStatus = (tech, willDeport) => {
    updateTechnicianMutation.mutateAsync({
      id: tech.id,
      data: {
        deport_from_uae: willDeport
      }
    });
    setShowDeportDialog(false);
  };

  const handleCompleteExitFormalities = async (tech) => {
    if (!tech.allCompleted) {
      alert("All checklist items must be completed before finalizing exit formalities.");
      return;
    }

    if (tech.deport_from_uae === undefined || tech.deport_from_uae === null) {
      alert("Please set Deport status (Yes/No) before completing exit formalities.");
      return;
    }

    if (!confirm(`Complete exit formalities for ${tech.full_name}? This will mark them as exited and free their bed.`)) {
      return;
    }

    try {
      // First update the technician
      await updateTechnicianMutation.mutateAsync({
        id: tech.id,
        data: {
          status: 'exited_country',
          exit_process_status: 'formalities_completed',
          exit_formal_completion_date: format(new Date(), 'yyyy-MM-dd'),
          actual_country_exit_date: format(new Date(), 'yyyy-MM-dd'),
          bed_id: null,
          camp_id: null
        }
      });

      // Then free the bed
      if (tech.bed_id) {
        await updateBedMutation.mutateAsync({
          id: tech.bed_id,
          data: {
            status: 'available',
            technician_id: null,
            reserved_for: null,
            reserved_until: null
          }
        });
      }
    } catch (error) {
      console.error('Error completing exit formalities:', error);
      alert(`Failed to complete exit formalities: ${error.response?.data?.message || error.message}`);
    }
  };

  const exportToCSV = () => {
    const headers = ['Employee ID', 'Full Name', 'Nationality', 'Camp', 'Start Date', 'Days in Process', 'Status', 'Progress', 'Flight Details', 'Vehicle', 'Driver', 'Drop Status', 'Toolbox', 'ID Card', 'Penalty', 'Ticket', 'Settlement', 'Medical', 'Exit Visa', 'Handover', 'Belongings'];
    
    const rows = sortedTechnicians.map(tech => {
      const camp = camps.find(c => c.id === tech.camp_id);
      return [
        tech.employee_id,
        tech.full_name,
        tech.nationality,
        camp?.name || '-',
        tech.sonapur_exit_start_date || '-',
        tech.daysInProcess,
        tech.isOverdue ? 'OVERDUE' : 'On Track',
        `${tech.completedCount}/${tech.totalCount}`,
        tech.exit_flight_number ? `${tech.exit_flight_number} @ ${tech.exit_flight_time || 'TBD'}` : '-',
        tech.airport_drop_vehicle_number || '-',
        tech.airport_drop_driver_name || '-',
        tech.airport_drop_status?.replace(/_/g, ' ') || '-',
        tech.toolbox_returned ? 'Yes' : 'No',
        tech.id_card_returned ? 'Yes' : 'No',
        tech.penalty_cleared ? 'Yes' : 'No',
        tech.ticket_booked ? 'Yes' : 'No',
        tech.final_settlement_processed ? 'Yes' : 'No',
        tech.medical_cleared ? 'Yes' : 'No',
        tech.exit_visa_obtained ? 'Yes' : 'No',
        tech.handover_completed ? 'Yes' : 'No',
        tech.personal_belongings_cleared ? 'Yes' : 'No'
      ];
    });

    const csv = [headers, ...rows].map(row => 
      row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    ).join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `sonapur_exit_tracker_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const getDropStatusBadge = (status) => {
    const configs = {
      'not_scheduled': { color: 'bg-gray-100 text-gray-700', label: 'Not Scheduled' },
      'scheduled': { color: 'bg-blue-100 text-blue-700', label: 'Scheduled' },
      'driver_dispatched': { color: 'bg-purple-100 text-purple-700', label: 'Driver Dispatched' },
      'dropped_at_airport': { color: 'bg-green-600 text-white', label: 'Dropped at Airport' },
      'cancelled': { color: 'bg-red-100 text-red-700', label: 'Cancelled' }
    };
    const config = configs[status] || configs['not_scheduled'];
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  if (sonapurExitCamps.length === 0) {
    return (
      <div className="p-6 md:p-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Sonapur Exit Camp Not Found</strong><br/>
            Please create a camp with "Sonapur" and "Exit" in its name or code to use this tracker.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 bg-gradient-to-br from-gray-50 to-orange-50 min-h-screen">
      <div className="max-w-[1800px] mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-orange-600 to-red-600 rounded-xl flex items-center justify-center">
              <LogOut className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Sonapur Exit Camp Tracker</h1>
              <p className="text-gray-600">Manage exit formalities and airport drop assignments</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={exportToCSV} className="border-green-600 text-green-600 hover:bg-green-50">
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
            <Button variant="outline" onClick={() => window.print()} className="border-blue-600 text-blue-600 hover:bg-blue-50">
              <Printer className="w-4 h-4 mr-2" />
              Print
            </Button>
          </div>
        </div>

        {/* Info Alert */}
        <Alert>
          <Clock className="h-4 w-4" />
          <AlertDescription>
            <strong>Exit Process Policy:</strong> All exit formalities must be completed within <strong>7 days</strong> of entry to Sonapur Exit Camp. Click on any row to expand and complete the checklist.
          </AlertDescription>
        </Alert>

        {/* Summary Cards */}
        <div className="grid md:grid-cols-3 gap-4">
          <Card className="border-none shadow-md bg-gradient-to-br from-blue-50 to-blue-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-600 font-medium mb-1">Total in Process</p>
                  <p className="text-3xl font-bold text-blue-900">{techniciansInExitProcess.length}</p>
                  <p className="text-xs text-blue-700 mt-1">
                    {sortedTechnicians.length} shown after filters
                  </p>
                </div>
                <LogOut className="w-12 h-12 text-blue-600 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-md bg-gradient-to-br from-green-50 to-green-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-600 font-medium mb-1">On Track (&lt;7 days)</p>
                  <p className="text-3xl font-bold text-green-900">{onTrackCount}</p>
                </div>
                <CheckCircle2 className="w-12 h-12 text-green-600 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-md bg-gradient-to-br from-red-50 to-red-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-red-600 font-medium mb-1">Overdue (&gt;7 days)</p>
                  <p className="text-3xl font-bold text-red-900">{overdueCount}</p>
                </div>
                <AlertTriangle className="w-12 h-12 text-red-600 opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filter Bar */}
        <Card className="border-none shadow-md">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Global search by Employee ID, Name, or Nationality..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              {sonapurExitCamps.length > 1 && (
                <Select value={selectedCamp} onValueChange={setSelectedCamp}>
                  <SelectTrigger className="w-full md:w-64">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sonapur Exit Camps</SelectItem>
                    {sonapurExitCamps.map(camp => (
                      <SelectItem key={camp.id} value={camp.id}>{camp.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Technicians Table */}
        <Card className="border-none shadow-lg">
          {hasActiveFilters && (
            <div className="bg-blue-50 border-b border-blue-200 px-6 py-3">
              <div className="flex items-center justify-between">
                <p className="text-sm text-blue-700 font-medium">
                  <Filter className="w-4 h-4 inline mr-2" />
                  {searchQuery ? 'Global search + column filters active' : 'Filters active'}
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

          <CardHeader className="bg-gradient-to-r from-orange-50 to-red-50 border-b">
            <CardTitle>Exit Process Tracker ({sortedTechnicians.length} Technicians)</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {sortedTechnicians.length === 0 ? (
              <div className="p-12 text-center">
                <CheckCircle2 className="w-16 h-16 text-green-600 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  {hasActiveFilters ? 'No technicians match your filters' : 'No Pending Exit Formalities'}
                </h3>
                <p className="text-gray-600">
                  {hasActiveFilters ? 'Try adjusting your search or filters' : 'All technicians have completed their exit process'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b-2 border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase w-12"></th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                        <div className="flex items-center justify-between gap-1">
                          <span onClick={() => handleSort('employee_id')} className="cursor-pointer">Employee ID</span>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" className="h-8 px-2" onClick={(e) => {e.stopPropagation(); handleSort('employee_id');}}>
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
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                        <div className="flex items-center justify-between gap-1">
                          <span onClick={() => handleSort('full_name')} className="cursor-pointer">Full Name</span>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" className="h-8 px-2" onClick={(e) => {e.stopPropagation(); handleSort('full_name');}}>
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
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                        <div className="flex items-center justify-between gap-1">
                          <span onClick={() => handleSort('nationality')} className="cursor-pointer">Nationality</span>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" className="h-8 px-2" onClick={(e) => {e.stopPropagation(); handleSort('nationality');}}>
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
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                        <div className="flex items-center justify-between gap-1">
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
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                        <div className="flex items-center justify-between gap-1">
                          <span onClick={() => handleSort('daysInProcess')} className="cursor-pointer">Days</span>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" className="h-8 px-2" onClick={(e) => {e.stopPropagation(); handleSort('daysInProcess');}}>
                              <ArrowUpDown className="w-3 h-3" />
                            </Button>
                            <ColumnFilter
                              values={uniqueDaysInProcess}
                              selected={filterDaysInProcess}
                              setSelected={setFilterDaysInProcess}
                              searchValue={searchDaysInProcess}
                              setSearchValue={setSearchDaysInProcess}
                            />
                          </div>
                        </div>
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                        <div className="flex items-center justify-between gap-1">
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
                        <div className="flex items-center justify-between gap-1">
                          <span onClick={() => handleSort('progress')} className="cursor-pointer">Progress</span>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" className="h-8 px-2" onClick={(e) => {e.stopPropagation(); handleSort('progress');}}>
                              <ArrowUpDown className="w-3 h-3" />
                            </Button>
                            <ColumnFilter
                              values={uniqueProgress}
                              selected={filterProgress}
                              setSelected={setFilterProgress}
                              searchValue={searchProgress}
                              setSearchValue={setSearchProgress}
                            />
                          </div>
                        </div>
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                        <div className="flex items-center justify-between gap-1">
                          <span>Flight</span>
                          <ColumnFilter
                            values={uniqueFlights}
                            selected={filterFlight}
                            setSelected={setFilterFlight}
                            searchValue={searchFlight}
                            setSearchValue={setSearchFlight}
                          />
                        </div>
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                        <div className="flex items-center justify-between gap-1">
                          <span>Vehicle</span>
                          <ColumnFilter
                            values={uniqueVehicles}
                            selected={filterVehicle}
                            setSelected={setFilterVehicle}
                            searchValue={searchVehicle}
                            setSearchValue={setSearchVehicle}
                          />
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedTechnicians.map((tech, index) => {
                      const isExpanded = expandedRows[tech.id];
                      const camp = camps.find(c => c.id === tech.camp_id);

                      return (
                        <React.Fragment key={tech.id}>
                          <tr 
                            className={`border-b hover:bg-gray-50 cursor-pointer transition-colors ${
                              index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                            } ${tech.isOverdue ? 'border-l-4 border-l-red-600' : ''}`}
                            onClick={() => toggleRowExpansion(tech.id)}
                          >
                            <td className="px-4 py-3">
                              {isExpanded ? (
                                <ChevronUp className="w-4 h-4 text-gray-600" />
                              ) : (
                                <ChevronDown className="w-4 h-4 text-gray-600" />
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm font-medium text-blue-600">
                              {tech.employee_id}
                            </td>
                            <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                              {tech.full_name}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-700">
                              {tech.nationality}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-700">
                              {camp?.name || '-'}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              {tech.isOverdue ? (
                                <Badge className="bg-red-600">
                                  <AlertTriangle className="w-3 h-3 mr-1" />
                                  Day {tech.daysInProcess}
                                </Badge>
                              ) : (
                                <Badge className="bg-green-600">
                                  Day {tech.daysInProcess}
                                </Badge>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              {tech.isOverdue ? (
                                <Badge variant="destructive">Overdue</Badge>
                              ) : (
                                <Badge className="bg-blue-100 text-blue-700">On Track</Badge>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <div className="flex items-center gap-2">
                                <div className="w-24 bg-gray-200 rounded-full h-2">
                                  <div 
                                    className={`h-2 rounded-full transition-all ${
                                      tech.allCompleted ? 'bg-green-600' : 'bg-blue-600'
                                    }`}
                                    style={{ width: `${(tech.completedCount / tech.totalCount) * 100}%` }}
                                  />
                                </div>
                                <span className="text-xs font-medium whitespace-nowrap">
                                  {tech.completedCount}/{tech.totalCount}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm">
                              {tech.exit_flight_number ? (
                                <div>
                                  <p className="font-medium text-gray-900">{tech.exit_flight_number}</p>
                                  {tech.exit_flight_time && (
                                    <p className="text-xs text-gray-600">{tech.exit_flight_time}</p>
                                  )}
                                </div>
                              ) : (
                                <span className="text-gray-400 text-xs">Not scheduled</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              {tech.airport_drop_vehicle_number ? (
                                <div>
                                  <p className="font-medium text-gray-900">{tech.airport_drop_vehicle_number}</p>
                                  <p className="text-xs text-gray-600">{tech.airport_drop_driver_name}</p>
                                </div>
                              ) : (
                                <span className="text-gray-400 text-xs">Not assigned</span>
                              )}
                            </td>
                          </tr>

                          {/* Expanded Row Content */}
                          {isExpanded && (
                            <tr className="bg-gradient-to-r from-blue-50 to-purple-50">
                              <td colSpan="10" className="px-6 py-6">
                                <div className="space-y-6">
                                  {/* Technician Details */}
                                  <div className="flex items-start justify-between">
                                    <div>
                                      <h3 className="text-lg font-bold text-gray-900 mb-2">{tech.full_name}</h3>
                                      <div className="flex flex-wrap gap-2">
                                        <Badge variant="outline">{tech.employee_id}</Badge>
                                        <Badge variant="secondary">{tech.nationality}</Badge>
                                        <Badge variant="outline">{camp?.name}</Badge>
                                        {tech.sonapur_exit_start_date && (
                                          <Badge variant="outline">
                                            Started: {format(parseISO(tech.sonapur_exit_start_date), 'MMM dd, yyyy')}
                                          </Badge>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  {/* Flight & Vehicle Info */}
                                  <div className="grid md:grid-cols-2 gap-4">
                                    <div className="p-4 bg-white rounded-lg border-2 border-blue-200">
                                      <div className="flex items-center gap-2 mb-3">
                                        <Plane className="w-5 h-5 text-blue-600" />
                                        <span className="font-semibold text-gray-900">Flight Details</span>
                                      </div>
                                      {tech.exit_flight_number ? (
                                        <div className="space-y-1">
                                          <p className="text-sm">
                                            <strong>Flight:</strong> {tech.exit_flight_number}
                                          </p>
                                          {tech.exit_flight_time && (
                                            <p className="text-sm">
                                              <strong>Time:</strong> {tech.exit_flight_time}
                                            </p>
                                          )}
                                          {tech.expected_country_exit_date && (
                                            <p className="text-sm">
                                              <strong>Date:</strong> {format(parseISO(tech.expected_country_exit_date), 'MMM dd, yyyy')}
                                            </p>
                                          )}
                                        </div>
                                      ) : (
                                        <p className="text-sm text-gray-500">No flight scheduled yet</p>
                                      )}
                                    </div>

                                    <div className="p-4 bg-white rounded-lg border-2 border-green-200">
                                      <div className="flex items-center gap-2 mb-3">
                                        <Car className="w-5 h-5 text-green-600" />
                                        <span className="font-semibold text-gray-900">Airport Drop</span>
                                      </div>
                                      {tech.airport_drop_vehicle_number ? (
                                        <div className="space-y-2">
                                          <p className="text-sm">
                                            <strong>Vehicle:</strong> {tech.airport_drop_vehicle_number}
                                          </p>
                                          <p className="text-sm">
                                            <strong>Driver:</strong> {tech.airport_drop_driver_name}
                                          </p>
                                          {tech.airport_drop_scheduled_time && (
                                            <p className="text-sm">
                                              <strong>Pickup:</strong> {tech.airport_drop_scheduled_time}
                                            </p>
                                          )}
                                          <div className="pt-2">
                                            {getDropStatusBadge(tech.airport_drop_status)}
                                          </div>
                                        </div>
                                      ) : (
                                        <p className="text-sm text-gray-500">No vehicle assigned yet</p>
                                      )}
                                    </div>
                                  </div>

                                  {/* Exit Checklist */}
                                  <div className="p-4 bg-white rounded-lg border-2 border-gray-200">
                                    <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                                      Exit Formalities Checklist
                                    </h4>
                                    
                                    <div className="grid md:grid-cols-3 gap-4 mb-4">
                                      <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50" onClick={(e) => e.stopPropagation()}>
                                        <Checkbox
                                          id={`toolbox-${tech.id}`}
                                          checked={tech.toolbox_returned || false}
                                          onCheckedChange={(checked) => handleUpdateChecklistInline(tech, 'toolbox_returned', checked)}
                                        />
                                        <Label htmlFor={`toolbox-${tech.id}`} className="text-sm font-medium cursor-pointer">
                                          Toolbox Returned
                                        </Label>
                                      </div>

                                      <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50" onClick={(e) => e.stopPropagation()}>
                                        <Checkbox
                                          id={`idcard-${tech.id}`}
                                          checked={tech.id_card_returned || false}
                                          onCheckedChange={(checked) => handleUpdateChecklistInline(tech, 'id_card_returned', checked)}
                                        />
                                        <Label htmlFor={`idcard-${tech.id}`} className="text-sm font-medium cursor-pointer">
                                          ID Card Returned
                                        </Label>
                                      </div>

                                      <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50" onClick={(e) => e.stopPropagation()}>
                                        <Checkbox
                                          id={`penalty-${tech.id}`}
                                          checked={tech.penalty_cleared || false}
                                          onCheckedChange={(checked) => handleUpdateChecklistInline(tech, 'penalty_cleared', checked)}
                                        />
                                        <Label htmlFor={`penalty-${tech.id}`} className="text-sm font-medium cursor-pointer">
                                          Penalty Cleared
                                        </Label>
                                      </div>

                                      <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50" onClick={(e) => e.stopPropagation()}>
                                        <Checkbox
                                          id={`ticket-${tech.id}`}
                                          checked={tech.ticket_booked || false}
                                          onCheckedChange={(checked) => handleUpdateChecklistInline(tech, 'ticket_booked', checked)}
                                        />
                                        <Label htmlFor={`ticket-${tech.id}`} className="text-sm font-medium cursor-pointer">
                                          Ticket Booked
                                        </Label>
                                      </div>

                                      <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50" onClick={(e) => e.stopPropagation()}>
                                        <Checkbox
                                          id={`settlement-${tech.id}`}
                                          checked={tech.final_settlement_processed || false}
                                          onCheckedChange={(checked) => handleUpdateChecklistInline(tech, 'final_settlement_processed', checked)}
                                        />
                                        <Label htmlFor={`settlement-${tech.id}`} className="text-sm font-medium cursor-pointer">
                                          Final Settlement
                                        </Label>
                                      </div>

                                      <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50" onClick={(e) => e.stopPropagation()}>
                                        <Checkbox
                                          id={`medical-${tech.id}`}
                                          checked={tech.medical_cleared || false}
                                          onCheckedChange={(checked) => handleUpdateChecklistInline(tech, 'medical_cleared', checked)}
                                        />
                                        <Label htmlFor={`medical-${tech.id}`} className="text-sm font-medium cursor-pointer">
                                          Medical Cleared
                                        </Label>
                                      </div>

                                      <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50" onClick={(e) => e.stopPropagation()}>
                                        <Checkbox
                                          id={`visa-${tech.id}`}
                                          checked={tech.exit_visa_obtained || false}
                                          onCheckedChange={(checked) => handleUpdateChecklistInline(tech, 'exit_visa_obtained', checked)}
                                        />
                                        <Label htmlFor={`visa-${tech.id}`} className="text-sm font-medium cursor-pointer">
                                          Exit Visa Obtained
                                        </Label>
                                      </div>

                                      <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50" onClick={(e) => e.stopPropagation()}>
                                        <Checkbox
                                          id={`handover-${tech.id}`}
                                          checked={tech.handover_completed || false}
                                          onCheckedChange={(checked) => handleUpdateChecklistInline(tech, 'handover_completed', checked)}
                                        />
                                        <Label htmlFor={`handover-${tech.id}`} className="text-sm font-medium cursor-pointer">
                                          Handover Completed
                                        </Label>
                                      </div>

                                      <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50" onClick={(e) => e.stopPropagation()}>
                                        <Checkbox
                                          id={`belongings-${tech.id}`}
                                          checked={tech.personal_belongings_cleared || false}
                                          onCheckedChange={(checked) => handleUpdateChecklistInline(tech, 'personal_belongings_cleared', checked)}
                                        />
                                        <Label htmlFor={`belongings-${tech.id}`} className="text-sm font-medium cursor-pointer">
                                          Personal Belongings
                                        </Label>
                                      </div>
                                    </div>

                                    {/* Progress Bar */}
                                    <div className="mb-4">
                                      <div className="flex justify-between text-sm mb-2">
                                        <span className="font-medium">Overall Progress</span>
                                        <span className="font-bold">
                                          {Math.round((tech.completedCount / tech.totalCount) * 100)}%
                                        </span>
                                      </div>
                                      <div className="w-full bg-gray-200 rounded-full h-4">
                                        <div 
                                          className={`h-4 rounded-full transition-all ${
                                            tech.allCompleted ? 'bg-green-600' : 'bg-blue-600'
                                          }`}
                                          style={{ width: `${(tech.completedCount / tech.totalCount) * 100}%` }}
                                        />
                                      </div>
                                    </div>

                                    {/* Deport Status Section */}
                                    {tech.allCompleted && (tech.deport_from_uae === undefined || tech.deport_from_uae === null) && (
                                      <Alert className="bg-yellow-50 border-yellow-300">
                                        <AlertCircle className="h-4 w-4 text-yellow-600" />
                                        <AlertDescription className="text-yellow-900">
                                          <strong>Next Step Required:</strong> Please specify if this technician will depart from UAE or stay in UAE.
                                        </AlertDescription>
                                      </Alert>
                                    )}

                                    {tech.deport_from_uae !== undefined && tech.deport_from_uae !== null && (
                                      <div className="p-3 bg-blue-50 border-2 border-blue-200 rounded-lg">
                                        <div className="flex items-center justify-between">
                                          <div>
                                            <p className="text-sm font-semibold text-blue-900">Deport Status</p>
                                            <p className="text-sm text-blue-700">
                                              {tech.deport_from_uae ? '✈️ Will depart from UAE' : '🏢 Staying in UAE (No deportation)'}
                                            </p>
                                          </div>
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => {
                                              setSelectedTechnician(tech);
                                              setShowDeportDialog(true);
                                            }}
                                            className="border-blue-600 text-blue-600 hover:bg-blue-100"
                                          >
                                            Change
                                          </Button>
                                        </div>
                                      </div>
                                    )}

                                    {/* Action Buttons */}
                                    <div className="flex flex-wrap gap-3" onClick={(e) => e.stopPropagation()}>
                                      {/* Set Deport Status - shows first if not set */}
                                      {tech.allCompleted && (tech.deport_from_uae === undefined || tech.deport_from_uae === null) && (
                                        <Button
                                          size="sm"
                                          onClick={() => {
                                            setSelectedTechnician(tech);
                                            setShowDeportDialog(true);
                                          }}
                                          className="bg-yellow-600 hover:bg-yellow-700 text-white"
                                        >
                                          <AlertCircle className="w-4 h-4 mr-1" />
                                          Set Deport Status
                                        </Button>
                                      )}

                                      {/* Assign Vehicle - only if deport_from_uae is true */}
                                      {tech.allCompleted && tech.deport_from_uae === true && (
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => handleAssignVehicle(tech)}
                                          className="border-green-600 text-green-600 hover:bg-green-50"
                                        >
                                          <Car className="w-4 h-4 mr-1" />
                                          {tech.airport_drop_vehicle_number ? 'Update' : 'Assign'} Vehicle
                                        </Button>
                                      )}

                                      {/* Mark Departed - only if vehicle scheduled */}
                                      {tech.deport_from_uae === true && tech.airport_drop_status === 'scheduled' && (
                                        <Button
                                          size="sm"
                                          onClick={() => handleMarkDeparture(tech)}
                                          className="bg-orange-600 hover:bg-orange-700"
                                        >
                                          <Plane className="w-4 h-4 mr-1" />
                                          Mark Departed
                                        </Button>
                                      )}

                                      {/* Complete Exit - only if deport status is set and NOT deporting (staying in UAE) */}
                                      {tech.allCompleted && tech.deport_from_uae === false && (
                                        <Button
                                          size="sm"
                                          onClick={() => handleCompleteExitFormalities(tech)}
                                          className="bg-green-600 hover:bg-green-700"
                                        >
                                          <CheckCircle2 className="w-4 h-4 mr-1" />
                                          Complete Exit (No Deportation)
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>

          <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              Showing <span className="font-semibold">{sortedTechnicians.length}</span> of <span className="font-semibold">{techniciansInExitProcess.length}</span> exit cases
            </p>
          </div>
        </Card>
      </div>

      {/* Assign Vehicle Dialog */}
      <Dialog open={showVehicleDialog} onOpenChange={setShowVehicleDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Car className="w-5 h-5 text-green-600" />
              Assign Vehicle for Airport Drop - {selectedTechnician?.full_name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 p-4">
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-900">
                <strong>✅ All checklist items completed!</strong> You can now assign the vehicle for airport drop.
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Exit Flight Number</Label>
                <Input
                  value={vehicleData.exit_flight_number || ''}
                  onChange={(e) => setVehicleData({...vehicleData, exit_flight_number: e.target.value})}
                  placeholder="e.g., EK542"
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Flight Date</Label>
                  <Input
                    type="date"
                    value={vehicleData.expected_country_exit_date || ''}
                    onChange={(e) => setVehicleData({...vehicleData, expected_country_exit_date: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Flight Time</Label>
                  <Input
                    type="time"
                    value={vehicleData.exit_flight_time || ''}
                    onChange={(e) => setVehicleData({...vehicleData, exit_flight_time: e.target.value})}
                  />
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Car className="w-4 h-4" />
                  Vehicle Assignment
                </h4>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Vehicle Number*</Label>
                    <Input
                      value={vehicleData.airport_drop_vehicle_number || ''}
                      onChange={(e) => setVehicleData({...vehicleData, airport_drop_vehicle_number: e.target.value})}
                      placeholder="e.g., DXB-12345"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Driver Name*</Label>
                    <Input
                      value={vehicleData.airport_drop_driver_name || ''}
                      onChange={(e) => setVehicleData({...vehicleData, airport_drop_driver_name: e.target.value})}
                      placeholder="Driver full name"
                    />
                  </div>
                </div>

                <div className="space-y-2 mt-4">
                  <Label>Scheduled Pickup Time from Camp</Label>
                  <Input
                    type="time"
                    value={vehicleData.airport_drop_scheduled_time || ''}
                    onChange={(e) => setVehicleData({...vehicleData, airport_drop_scheduled_time: e.target.value})}
                  />
                  <p className="text-xs text-gray-500">
                    Time when driver should pick up technician from camp
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => {
                  setShowVehicleDialog(false);
                  setVehicleData({});
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveVehicleAssignment}
                className="bg-green-600 hover:bg-green-700"
              >
                <Car className="w-4 h-4 mr-2" />
                Assign Vehicle
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Deport Status Dialog */}
      <Dialog open={showDeportDialog} onOpenChange={setShowDeportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-600" />
              Set Deport Status - {selectedTechnician?.full_name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 p-4">
            <Alert className="bg-blue-50 border-blue-200">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-900">
                <strong>Important Decision:</strong> Will this technician depart from UAE or stay in UAE after exit formalities?
              </AlertDescription>
            </Alert>

            <div className="space-y-3">
              <Button
                className="w-full h-auto py-4 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700"
                onClick={() => handleSetDeportStatus(selectedTechnician, true)}
              >
                <div className="text-left w-full">
                  <div className="flex items-center gap-2 mb-1">
                    <Plane className="w-5 h-5" />
                    <span className="font-bold text-lg">Yes - Deport from UAE</span>
                  </div>
                  <p className="text-sm opacity-90">
                    Technician will leave UAE. Vehicle assignment and airport drop required.
                  </p>
                </div>
              </Button>

              <Button
                className="w-full h-auto py-4 bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700"
                onClick={() => handleSetDeportStatus(selectedTechnician, false)}
              >
                <div className="text-left w-full">
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle2 className="w-5 h-5" />
                    <span className="font-bold text-lg">No - Staying in UAE</span>
                  </div>
                  <p className="text-sm opacity-90">
                    Technician stays in UAE. No deportation or airport drop needed.
                  </p>
                </div>
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowDeportDialog(false);
                setSelectedTechnician(null);
              }}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Departure Dialog */}
      <Dialog open={showDepartureDialog} onOpenChange={setShowDepartureDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plane className="w-5 h-5 text-orange-600" />
              Confirm Departure
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 p-4">
            <Alert className="bg-orange-50 border-orange-200">
              <AlertCircle className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-orange-900">
                <strong>Confirm Airport Departure:</strong> This will mark {selectedTechnician?.full_name} as departed to the airport and officially left the country.
              </AlertDescription>
            </Alert>

            <div className="p-4 bg-gray-50 rounded-lg border">
              <h4 className="font-semibold mb-3">Departure Details:</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Flight:</span>
                  <span className="font-medium">{selectedTechnician?.exit_flight_number || 'Not set'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Flight Date:</span>
                  <span className="font-medium">
                    {selectedTechnician?.expected_country_exit_date 
                      ? format(parseISO(selectedTechnician.expected_country_exit_date), 'MMM dd, yyyy')
                      : 'Not set'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Vehicle:</span>
                  <span className="font-medium">{selectedTechnician?.airport_drop_vehicle_number || 'Not assigned'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Driver:</span>
                  <span className="font-medium">{selectedTechnician?.airport_drop_driver_name || 'Not assigned'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Actual Departure Date:</span>
                  <span className="font-medium text-orange-600">{format(new Date(), 'MMM dd, yyyy')}</span>
                </div>
              </div>
            </div>

            <Alert className="bg-yellow-50 border-yellow-200">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-900 text-sm">
                After confirming, the technician will be marked as <strong>"Exited Country"</strong> and their bed will be freed automatically.
              </AlertDescription>
            </Alert>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowDepartureDialog(false);
                setSelectedTechnician(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmDeparture}
              className="bg-orange-600 hover:bg-orange-700"
            >
              <Plane className="w-4 h-4 mr-2" />
              Confirm Departure
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}