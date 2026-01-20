import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, AlertTriangle, ArrowUpDown, Filter, X, AlertCircle, CheckCircle, Download, Printer, Search, Send } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { format, parseISO } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";

export default function Disciplinary() {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [formData, setFormData] = useState({
    termination_reason: '',
    exit_process_choice: '' // New: tracks user choice for termination
  });
  const [sortField, setSortField] = useState("date");
  const [sortDirection, setSortDirection] = useState("desc");
  const [activeTab, setActiveTab] = useState("all");
  const [initiatingTransfer, setInitiatingTransfer] = useState(false);
  const [showTransferTypeDialog, setShowTransferTypeDialog] = useState(false);
  const [selectedActionForTransfer, setSelectedActionForTransfer] = useState(null);

  // Excel-style column filters
  const [filterEmployeeName, setFilterEmployeeName] = useState([]);
  const [filterEmployeeId, setFilterEmployeeId] = useState([]);
  const [filterDate, setFilterDate] = useState([]);
  const [filterActionType, setFilterActionType] = useState([]);
  const [filterSeverity, setFilterSeverity] = useState([]);
  const [filterViolation, setFilterViolation] = useState([]);
  const [filterReportedBy, setFilterReportedBy] = useState([]);
  const [filterFollowUp, setFilterFollowUp] = useState([]);

  // Search states for column filters
  const [searchEmployeeName, setSearchEmployeeName] = useState("");
  const [searchEmployeeId, setSearchEmployeeId] = useState("");
  const [searchDate, setSearchDate] = useState("");
  const [searchActionType, setSearchActionType] = useState("");
  const [searchSeverity, setSearchSeverity] = useState("");
  const [searchViolation, setSearchViolation] = useState("");
  const [searchReportedBy, setSearchReportedBy] = useState("");
  const [searchFollowUp, setSearchFollowUp] = useState("");

  const [technicianSearch, setTechnicianSearch] = useState("");
  const [technicianPopoverOpen, setTechnicianPopoverOpen] = useState(false);

  const queryClient = useQueryClient();

  const { data: actions = [] } = useQuery({
    queryKey: ['disciplinary'],
    queryFn: () => base44.entities.DisciplinaryAction.list('-date'),
  });

  const { data: technicians = [] } = useQuery({
    queryKey: ['technicians'],
    queryFn: () => base44.entities.Technician.list(),
  });

  const { data: actionTypes = [] } = useQuery({
    queryKey: ['disciplinary-action-types'],
    queryFn: () => base44.entities.DisciplinaryActionType.list('display_order'),
  });

  const { data: camps = [] } = useQuery({
    queryKey: ['camps'],
    queryFn: () => base44.entities.Camp.list(),
  });

  const { data: transferRequests = [] } = useQuery({
    queryKey: ['transfer-requests'],
    queryFn: () => base44.entities.TransferRequest.list(),
  });

  // Only show active technicians in the form
  const activeTechnicians = technicians.filter(t => t.status === 'active');

  // Filter technicians based on search
  const filteredTechnicians = activeTechnicians.filter(t => {
    const searchLower = technicianSearch.toLowerCase();
    return t.full_name?.toLowerCase().includes(searchLower) ||
           t.employee_id?.toLowerCase().includes(searchLower);
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.DisciplinaryAction.create(data),
    onSuccess: async (createdAction, variables) => {
      queryClient.invalidateQueries({ queryKey: ['disciplinary'] });
      
      // Auto-create transfer for resignation/termination
      // Check both action_type_id (new) and action_type (legacy) fields
      const actionType = actionTypes.find(at => at.id === variables.action_type_id);
      const isExitCase = actionType?.name?.toLowerCase() === 'resignation' || 
                         actionType?.name?.toLowerCase() === 'termination' ||
                         variables.action_type?.toLowerCase() === 'resignation' ||
                         variables.action_type?.toLowerCase() === 'termination';
      
      if (isExitCase && variables.technician_id) {
        const technician = technicians.find(t => t.id === variables.technician_id);
        const sonapurExitCamp = camps.find(c => 
          c.camp_type === 'exit_camp' || 
          c.name?.toLowerCase().includes('sonapur') && c.name?.toLowerCase().includes('exit')
        );
        
        if (technician?.camp_id && sonapurExitCamp && technician.camp_id !== sonapurExitCamp.id) {
          const existingTransfer = transferRequests.find(tr => 
            tr.technician_ids?.includes(variables.technician_id) &&
            tr.target_camp_id === sonapurExitCamp.id &&
            tr.status !== 'cancelled'
          );
          
          if (!existingTransfer) {
            try {
              await createTransferMutation.mutateAsync({
                source_camp_id: technician.camp_id,
                target_camp_id: sonapurExitCamp.id,
                request_date: new Date().toISOString().split('T')[0],
                reason_for_movement: 'exit_case',
                technician_ids: [technician.id],
                external_personnel_ids: [],
                status: 'pending_allocation',
                notes: 'Auto-generated from Disciplinary Action (Resignation/Termination)'
              });
            } catch (error) {
              console.error('Auto-transfer creation failed:', error);
            }
          }
        }
      }
      
      setShowAddDialog(false);
      setFormData({});
      setTechnicianSearch("");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.DisciplinaryAction.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['disciplinary'] });
    },
  });

  const createTransferMutation = useMutation({
    mutationFn: (data) => base44.entities.TransferRequest.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transfer-requests'] });
      alert('Transfer request to Sonapur Exit Camp created successfully! Check My Transfer Requests page.');
      setInitiatingTransfer(false);
      setShowTransferTypeDialog(false);
      setSelectedActionForTransfer(null);
    },
    onError: (error) => {
      console.error('Error creating transfer request:', error);
      alert('Failed to create transfer request. Please try again.');
      setInitiatingTransfer(false);
    }
  });

  const updateTechnicianMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Technician.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['technicians'] });
      alert('Technician moved to Sonapur Exit Tracker (Direct Deport)!');
      setInitiatingTransfer(false);
      setShowTransferTypeDialog(false);
      setSelectedActionForTransfer(null);
    },
    onError: (error) => {
      console.error('Error updating technician:', error);
      alert('Failed to update technician status. Please try again.');
      setInitiatingTransfer(false);
    }
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Check if termination action type is selected and termination_reason is required
    const selectedActionType = actionTypes.find(at => at.id === formData.action_type_id);
    if (selectedActionType?.name?.toLowerCase() === 'termination' && !formData.termination_reason) {
      alert("Please select a termination reason");
      return;
    }
    
    // NEW: Check if termination action type is selected and exit_process_choice is required
    if (selectedActionType?.name?.toLowerCase() === 'termination' && !formData.exit_process_choice) {
      alert("Please select an exit process option (Initiate Camp Transfer or Direct Deport)");
      return;
    }
    
    // Execute the chosen exit process before creating the disciplinary action
    if (selectedActionType?.name?.toLowerCase() === 'termination' && formData.exit_process_choice) {
      const technician = technicians.find(t => t.id === formData.technician_id);
      const sonapurExitCamp = camps.find(c => 
        c.camp_type === 'exit_camp' || 
        c.name?.toLowerCase().includes('sonapur') && c.name?.toLowerCase().includes('exit')
      );

      if (!sonapurExitCamp) {
        alert('Sonapur Exit Camp not found. Please create it first.');
        return;
      }

      if (formData.exit_process_choice === 'camp_transfer') {
        // Create transfer request
        const existingTransfer = transferRequests.find(tr => 
          tr.technician_ids?.includes(formData.technician_id) &&
          tr.target_camp_id === sonapurExitCamp.id &&
          tr.status !== 'cancelled'
        );
        
        if (!existingTransfer) {
          try {
            await createTransferMutation.mutateAsync({
              source_camp_id: technician.camp_id,
              target_camp_id: sonapurExitCamp.id,
              request_date: new Date().toISOString().split('T')[0],
              reason_for_movement: 'exit_case',
              technician_ids: [technician.id],
              external_personnel_ids: [],
              status: 'pending_allocation',
              notes: 'Auto-generated from Disciplinary Action (Termination)'
            });
          } catch (error) {
            console.error('Transfer creation failed:', error);
            alert('Failed to create transfer request. Please try again.');
            return;
          }
        }
      } else if (formData.exit_process_choice === 'direct_deport') {
        // Direct update to Sonapur Exit Tracker
        try {
          await updateTechnicianMutation.mutateAsync({
            id: technician.id,
            data: {
              camp_id: sonapurExitCamp.id,
              sonapur_exit_camp_id: sonapurExitCamp.id,
              sonapur_exit_start_date: new Date().toISOString().split('T')[0],
              status: 'pending_exit',
              exit_process_status: 'in_process'
            }
          });
        } catch (error) {
          console.error('Direct deport failed:', error);
          alert('Failed to update technician status. Please try again.');
          return;
        }
      }
    }
    
    createMutation.mutate(formData);
  };

  const handleInitiateTransfer = (action) => {
    setSelectedActionForTransfer(action);
    setShowTransferTypeDialog(true);
  };

  const handleTransferTypeSelection = async (transferType) => {
    if (!selectedActionForTransfer || !selectedActionForTransfer.technician_id) {
      alert('No technician selected');
      return;
    }

    const technician = technicians.find(t => t.id === selectedActionForTransfer.technician_id);
    if (!technician) {
      alert('Technician not found');
      return;
    }

    setInitiatingTransfer(true);

    if (transferType === 'direct_deport') {
      // Direct Deport - Move to Sonapur Exit Tracker
      const sonapurExitCamp = camps.find(c => 
        c.camp_type === 'exit_camp' || 
        c.name?.toLowerCase().includes('sonapur') && c.name?.toLowerCase().includes('exit')
      );

      if (!sonapurExitCamp) {
        alert('Sonapur Exit Camp not found. Please create it first.');
        setInitiatingTransfer(false);
        return;
      }

      try {
        await updateTechnicianMutation.mutateAsync({
          id: technician.id,
          data: {
            camp_id: sonapurExitCamp.id,
            sonapur_exit_camp_id: sonapurExitCamp.id,
            sonapur_exit_start_date: new Date().toISOString().split('T')[0],
            status: 'pending_exit',
            exit_process_status: 'in_process'
          }
        });
      } catch (error) {
        console.error('Direct deport error:', error);
      }
    } else if (transferType === 'camp_transfer') {
      // Sonapur Exit Camp Transfer
      if (!technician.camp_id) {
        alert('Technician has no camp assigned');
        setInitiatingTransfer(false);
        return;
      }

      const sonapurExitCamp = camps.find(c => 
        c.camp_type === 'exit_camp' || 
        c.name?.toLowerCase().includes('sonapur') && c.name?.toLowerCase().includes('exit')
      );

      if (!sonapurExitCamp) {
        alert('Sonapur Exit Camp not found. Please create it first.');
        setInitiatingTransfer(false);
        return;
      }

      if (technician.camp_id === sonapurExitCamp.id) {
        alert('Technician is already at Sonapur Exit Camp');
        setInitiatingTransfer(false);
        return;
      }

      const existingTransfer = transferRequests.find(tr => 
        tr.technician_ids?.includes(selectedActionForTransfer.technician_id) &&
        tr.target_camp_id === sonapurExitCamp.id &&
        tr.status !== 'cancelled'
      );

      if (existingTransfer) {
        alert('Transfer request already exists for this technician.');
        setInitiatingTransfer(false);
        return;
      }

      try {
        await createTransferMutation.mutateAsync({
          source_camp_id: technician.camp_id,
          target_camp_id: sonapurExitCamp.id,
          request_date: new Date().toISOString().split('T')[0],
          reason_for_movement: 'exit_case',
          technician_ids: [technician.id],
          external_personnel_ids: [],
          status: 'pending_allocation',
          notes: 'Auto-generated from Disciplinary Action (Resignation/Termination)'
        });
      } catch (error) {
        console.error('Camp transfer error:', error);
      }
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

  const markFollowUpComplete = async (actionId) => {
    await updateMutation.mutateAsync({
      id: actionId,
      data: { follow_up_required: false }
    });
  };

  // Get actions requiring follow-up
  const followUpActions = actions.filter(a => a.follow_up_required);
  const criticalFollowUps = followUpActions.filter(a => a.severity === 'critical' || a.severity === 'major');

  // Get unique values for filters
  const uniqueEmployeeNames = [...new Set(actions.map(a => {
    const tech = technicians.find(t => t.id === a.technician_id);
    return tech?.full_name || '-';
  }))].sort();

  const uniqueEmployeeIds = [...new Set(actions.map(a => {
    const tech = technicians.find(t => t.id === a.technician_id);
    return tech?.employee_id || '-';
  }))].sort();

  const uniqueDates = [...new Set(actions.map(a => a.date ? format(parseISO(a.date), 'dd/MMM/yyyy') : '-'))].sort();
  const uniqueActionTypes = [...new Set(actions.map(a => {
    const actionType = actionTypes.find(at => at.id === a.action_type_id);
    return actionType?.name || a.action_type?.replace(/_/g, ' ').toUpperCase() || '-';
  }))].sort();
  const uniqueSeverities = [...new Set(actions.map(a => a.severity || '-'))].sort();
  const uniqueViolations = [...new Set(actions.map(a => a.violation || '-'))].sort();
  const uniqueReportedBy = [...new Set(actions.map(a => a.reported_by || '-'))].sort();
  const uniqueFollowUp = ['Yes', 'No'];

  // Column Filter Component
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

  // Apply filters based on active tab
  let filteredAndSortedActions = actions.filter(action => {
    // Tab filtering
    if (activeTab === "follow-up" && !action.follow_up_required) return false;
    if (activeTab === "completed" && action.follow_up_required) return false;

    const tech = technicians.find(t => t.id === action.technician_id);
    const followUpText = action.follow_up_required ? 'Yes' : 'No';

    if (filterEmployeeName.length > 0 && !filterEmployeeName.includes(tech?.full_name || '-')) return false;
    if (filterEmployeeId.length > 0 && !filterEmployeeId.includes(tech?.employee_id || '-')) return false;
    if (filterDate.length > 0 && !filterDate.includes(action.date ? format(parseISO(action.date), 'dd/MMM/yyyy') : '-')) return false;
    const actionTypeName = actionTypes.find(at => at.id === action.action_type_id)?.name || action.action_type?.replace(/_/g, ' ').toUpperCase() || '-';
    if (filterActionType.length > 0 && !filterActionType.includes(actionTypeName)) return false;
    if (filterSeverity.length > 0 && !filterSeverity.includes(action.severity || '-')) return false;
    if (filterViolation.length > 0 && !filterViolation.includes(action.violation || '-')) return false;
    if (filterReportedBy.length > 0 && !filterReportedBy.includes(action.reported_by || '-')) return false;
    if (filterFollowUp.length > 0 && !filterFollowUp.includes(followUpText)) return false;

    return true;
  });

  filteredAndSortedActions = filteredAndSortedActions.sort((a, b) => {
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
    setFilterDate([]);
    setFilterActionType([]);
    setFilterSeverity([]);
    setFilterViolation([]);
    setFilterReportedBy([]);
    setFilterFollowUp([]);
  };

  const hasActiveFilters =
    filterEmployeeName.length > 0 ||
    filterEmployeeId.length > 0 ||
    filterDate.length > 0 ||
    filterActionType.length > 0 ||
    filterSeverity.length > 0 ||
    filterViolation.length > 0 ||
    filterReportedBy.length > 0 ||
    filterFollowUp.length > 0;

  const exportToCSV = () => {
    const headers = ['Employee Name', 'Employee ID', 'Date', 'Action Type', 'Severity', 'Violation', 'Action Taken', 'Reported By', 'Witness', 'Follow-up Required', 'Notes'];
    const rows = filteredAndSortedActions.map(action => {
      const tech = technicians.find(t => t.id === action.technician_id);

      return [
        tech?.full_name || '-',
        tech?.employee_id || '-',
        action.date ? format(parseISO(action.date), 'dd/MMM/yyyy') : '-',
        actionTypes.find(at => at.id === action.action_type_id)?.name || action.action_type?.replace(/_/g, ' ').toUpperCase(),
        action.severity?.toUpperCase(),
        action.violation || '-',
        action.action_taken || '-',
        action.reported_by || '-',
        action.witness || '-',
        action.follow_up_required ? 'Yes' : 'No',
        action.notes || '-'
      ];
    });

    const csv = [headers, ...rows].map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `disciplinary_actions_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const printReport = () => {
    window.print();
  };

  const TableContent = ({ showFollowUpAction = false }) => (
    <>
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
        {filteredAndSortedActions.length === 0 ? (
          <div className="p-12 text-center">
            <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">
              {activeTab === "follow-up"
                ? "No actions requiring follow-up"
                : activeTab === "completed"
                ? "No completed actions"
                : hasActiveFilters
                ? "No disciplinary actions found matching your filters"
                : "No disciplinary actions found"}
            </p>
          </div>
        ) : (
          <table className="w-full border-collapse bg-white">
            <thead>
              <tr className="border-b-2 border-gray-300">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                  <div className="flex items-center justify-between gap-2 no-print">
                    <span>Employee Name</span>
                    <div className="flex gap-1">
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
                  <span className="print-only">Employee Name</span>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                  <div className="flex items-center justify-between gap-2 no-print">
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
                  <span className="print-only">Employee ID</span>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                  <div className="flex items-center justify-between gap-2 no-print">
                    <span>Date</span>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => handleSort('date')}>
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
                  <span className="print-only">Date</span>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                  <div className="flex items-center justify-between gap-2 no-print">
                    <span>Action Type</span>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => handleSort('action_type')}>
                        <ArrowUpDown className="w-3 h-3" />
                      </Button>
                      <ColumnFilter
                        values={uniqueActionTypes}
                        selected={filterActionType}
                        setSelected={setFilterActionType}
                        searchValue={searchActionType}
                        setSearchValue={setSearchActionType}
                      />
                    </div>
                  </div>
                  <span className="print-only">Action Type</span>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                  <div className="flex items-center justify-between gap-2 no-print">
                    <span>Severity</span>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => handleSort('severity')}>
                        <ArrowUpDown className="w-3 h-3" />
                      </Button>
                      <ColumnFilter
                        values={uniqueSeverities}
                        selected={filterSeverity}
                        setSelected={setFilterSeverity}
                        searchValue={searchSeverity}
                        setSearchValue={setSearchSeverity}
                      />
                    </div>
                  </div>
                  <span className="print-only">Severity</span>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                  <div className="flex items-center justify-between gap-2 no-print">
                    <span>Violation</span>
                    <ColumnFilter
                      values={uniqueViolations}
                      selected={filterViolation}
                      setSelected={setFilterViolation}
                      searchValue={searchViolation}
                      setSearchValue={setSearchViolation}
                    />
                  </div>
                  <span className="print-only">Violation</span>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                  <div className="flex items-center justify-between gap-2 no-print">
                    <span>Reported By</span>
                    <ColumnFilter
                      values={uniqueReportedBy}
                      selected={filterReportedBy}
                      setSelected={setFilterReportedBy}
                      searchValue={searchReportedBy}
                      setSearchValue={setSearchReportedBy}
                    />
                  </div>
                  <span className="print-only">Reported By</span>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                  <div className="flex items-center justify-between gap-2 no-print">
                    <span>Follow-up</span>
                    <ColumnFilter
                      values={uniqueFollowUp}
                      selected={filterFollowUp}
                      setSelected={setFilterFollowUp}
                      searchValue={searchFollowUp}
                      setSearchValue={setSearchFollowUp}
                    />
                  </div>
                  <span className="print-only">Follow-up</span>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 no-print">
                  {showFollowUpAction ? 'Action' : 'Transfer'}
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredAndSortedActions.map((action, index) => {
                const tech = technicians.find(t => t.id === action.technician_id);

                return (
                  <tr
                    key={action.id}
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
                      {action.date ? format(parseISO(action.date), 'dd/MMM/yyyy') : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 border-r border-gray-200 whitespace-nowrap">
                      <Badge variant="outline" className="text-xs">
                        {actionTypes.find(at => at.id === action.action_type_id)?.name || action.action_type?.replace(/_/g, ' ')}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm border-r border-gray-200 whitespace-nowrap">
                      <Badge variant={
                        action.severity === 'critical' ? 'destructive' :
                        action.severity === 'major' ? 'destructive' :
                        action.severity === 'moderate' ? 'outline' : 'secondary'
                      } className="text-xs">
                        {action.severity}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 border-r border-gray-200">
                      <div className="max-w-xs truncate" title={action.violation}>
                        {action.violation || '-'}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 border-r border-gray-200 whitespace-nowrap">
                      {action.reported_by || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm border-r border-gray-200 whitespace-nowrap">
                      {action.follow_up_required ? (
                        <Badge className="bg-yellow-100 text-yellow-700 text-xs">Yes</Badge>
                      ) : (
                        <Badge className="bg-green-100 text-green-700 text-xs">Completed</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm whitespace-nowrap no-print">
                      {(() => {
                        const actionType = actionTypes.find(at => at.id === action.action_type_id);
                        const isExitCase = actionType?.name?.toLowerCase() === 'resignation' || 
                                           actionType?.name?.toLowerCase() === 'termination' ||
                                           action.action_type?.toLowerCase() === 'resignation' ||
                                           action.action_type?.toLowerCase() === 'termination';

                        if (showFollowUpAction && action.follow_up_required) {
                          return (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-green-600 border-green-600 hover:bg-green-50 text-xs"
                              onClick={() => markFollowUpComplete(action.id)}
                            >
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Mark Complete
                            </Button>
                          );
                        }

                        if (isExitCase && action.technician_id) {
                          const tech = technicians.find(t => t.id === action.technician_id);
                          const sonapurExitCamp = camps.find(c => 
                            c.camp_type === 'exit_camp' || 
                            c.name?.toLowerCase().includes('sonapur') && c.name?.toLowerCase().includes('exit')
                          );
                          const existingTransfer = transferRequests.find(tr => 
                            tr.technician_ids?.includes(action.technician_id) &&
                            tr.target_camp_id === sonapurExitCamp?.id &&
                            tr.status !== 'cancelled'
                          );

                          if (tech?.camp_id && sonapurExitCamp && tech.camp_id !== sonapurExitCamp.id && !existingTransfer) {
                            return (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-red-600 border-red-600 hover:bg-red-50 text-xs"
                                onClick={() => handleInitiateTransfer(action)}
                              >
                                <Send className="w-3 h-3 mr-1" />
                                Initiate Transfer
                              </Button>
                            );
                          }

                          if (existingTransfer) {
                            return (
                              <Badge className="bg-green-100 text-green-700 text-xs">
                                Transfer Exists
                              </Badge>
                            );
                          }
                        }

                        return <span className="text-gray-400 text-xs">-</span>;
                      })()}
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
          Showing <span className="font-semibold">{filteredAndSortedActions.length}</span> of <span className="font-semibold">{actions.length}</span> disciplinary actions
        </p>
      </div>
    </>
  );

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
            border: none;
            box-shadow: none;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 9px;
          }
          th, td {
            border: 1px solid #000;
            padding: 3px;
            text-align: left;
          }
          th {
            background-color: #f3f4f6 !important;
            font-weight: bold;
          }
          tr:hover {
            background-color: inherit !important;
          }
          .no-print {
            display: none !important;
          }
          .print-only {
            display: block !important;
          }
          tr {
            page-break-inside: avoid;
          }
          @page {
            size: landscape;
            margin: 1cm;
          }
        }
        .print-only {
          display: none;
        }
      `}</style>

      <div className="max-w-[1800px] mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Disciplinary Actions</h1>
            <p className="text-gray-600 mt-1">Track and manage disciplinary cases</p>
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
            <Button onClick={() => setShowAddDialog(true)} className="bg-red-600 hover:bg-red-700">
              <Plus className="w-4 h-4 mr-2" />
              Log Action
            </Button>
          </div>
        </div>

        {/* Follow-up Alerts */}
        {followUpActions.length > 0 && (
          <Alert className="border-l-4 border-l-yellow-500 bg-yellow-50">
            <AlertCircle className="h-5 w-5 text-yellow-600" />
            <AlertDescription className="ml-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-yellow-900">
                    {followUpActions.length} Action{followUpActions.length > 1 ? 's' : ''} Requiring Follow-up
                  </p>
                  {criticalFollowUps.length > 0 && (
                    <p className="text-sm text-yellow-700 mt-1">
                      Including {criticalFollowUps.length} critical/major case{criticalFollowUps.length > 1 ? 's' : ''}
                    </p>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveTab("follow-up")}
                  className="border-yellow-600 text-yellow-700 hover:bg-yellow-100"
                >
                  View All
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="all" className="relative">
              All Actions
              <Badge variant="secondary" className="ml-2 text-xs">
                {actions.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="follow-up" className="relative">
              Follow-up Required
              {followUpActions.length > 0 && (
                <Badge className="ml-2 bg-yellow-500 text-white text-xs">
                  {followUpActions.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="completed">
              Completed
              <Badge variant="secondary" className="ml-2 text-xs">
                {actions.filter(a => !a.follow_up_required).length}
              </Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-6">
            <Card className={`border-none shadow-lg overflow-hidden ${
                activeTab === 'follow-up' ? 'border-l-4 border-l-yellow-500' :
                activeTab === 'completed' ? 'border-l-4 border-l-green-500' : ''
              }`} id="printable-table">
              <TableContent showFollowUpAction={activeTab === 'follow-up'} />
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Add Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Disciplinary Action</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Technician* <span className="text-xs text-gray-500 font-normal">(Active only)</span></Label>
              <Popover open={technicianPopoverOpen} onOpenChange={setTechnicianPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className="w-full justify-between"
                  >
                    {formData.technician_id
                      ? technicians.find(t => t.id === formData.technician_id)?.full_name + ' - ' +
                        (technicians.find(t => t.id === formData.technician_id)?.employee_id || '')
                      : "Select technician..."}
                    <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
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
                          value={tech.full_name + ' - ' + tech.employee_id}
                          onSelect={() => {
                            setFormData({...formData, technician_id: tech.id});
                            setTechnicianSearch("");
                            setTechnicianPopoverOpen(false);
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

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date*</Label>
                <Input
                  type="date"
                  required
                  value={formData.date || ''}
                  onChange={(e) => setFormData({...formData, date: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>Severity*</Label>
                <Select
                  value={formData.severity || ''}
                  onValueChange={(val) => setFormData({...formData, severity: val})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select severity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="minor">Minor</SelectItem>
                    <SelectItem value="moderate">Moderate</SelectItem>
                    <SelectItem value="major">Major</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Action Type*</Label>
              <Select
                value={formData.action_type_id || ''}
                onValueChange={(val) => {
                  const actionType = actionTypes.find(at => at.id === val);
                  setFormData({...formData, action_type_id: val, action_type: actionType?.code || '', termination_reason: ''});
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select action type" />
                </SelectTrigger>
                <SelectContent>
                  {actionTypes.filter(at => at.is_active !== false).map(at => (
                    <SelectItem key={at.id} value={at.id}>{at.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {formData.action_type_id && actionTypes.find(at => at.id === formData.action_type_id)?.name?.toLowerCase() === 'termination' && (
              <div className="space-y-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="space-y-2">
                  <Label>Termination Reason*</Label>
                  <Select
                    value={formData.termination_reason || ''}
                    onValueChange={(val) => setFormData({...formData, termination_reason: val})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select termination reason" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="illegal_activity">Illegal Activity</SelectItem>
                      <SelectItem value="fight">Fight</SelectItem>
                      <SelectItem value="theft">Theft</SelectItem>
                      <SelectItem value="property_damage">Property Damage</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Exit Process Required*</Label>
                  <Select
                    value={formData.exit_process_choice || ''}
                    onValueChange={(val) => setFormData({...formData, exit_process_choice: val})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose exit process..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="camp_transfer">Initiate Camp Transfer</SelectItem>
                      <SelectItem value="direct_deport">Direct Deport</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-red-700">
                    {formData.exit_process_choice === 'camp_transfer' && 
                      'Will create transfer request to Sonapur Exit Camp for bed allocation and formalities'}
                    {formData.exit_process_choice === 'direct_deport' && 
                      'Will move technician directly to Sonapur Exit Tracker (no camp transfer needed)'}
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>Violation Description*</Label>
              <Textarea
                required
                value={formData.violation || ''}
                onChange={(e) => setFormData({...formData, violation: e.target.value})}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Action Taken*</Label>
              <Textarea
                required
                value={formData.action_taken || ''}
                onChange={(e) => setFormData({...formData, action_taken: e.target.value})}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Reported By</Label>
              <Input
                value={formData.reported_by || ''}
                onChange={(e) => setFormData({...formData, reported_by: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <Label>Witness</Label>
              <Input
                value={formData.witness || ''}
                onChange={(e) => setFormData({...formData, witness: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <Label>Additional Notes</Label>
              <Textarea
                value={formData.notes || ''}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                rows={2}
              />
            </div>

            <div className="flex items-center space-x-2 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <Checkbox
                id="follow_up"
                checked={formData.follow_up_required || false}
                onCheckedChange={(checked) => setFormData({...formData, follow_up_required: checked})}
              />
              <Label htmlFor="follow_up" className="cursor-pointer flex-1">
                <span className="font-semibold text-yellow-900">Follow-up Required</span>
                <p className="text-xs text-yellow-700 mt-1">
                  Check this box if this case requires additional monitoring or follow-up actions
                </p>
              </Label>
            </div>

            {formData.action_type_id && actionTypes.find(at => at.id === formData.action_type_id)?.name?.toLowerCase() === 'resignation' && formData.technician_id && (() => {
                const sonapurExitCamp = camps.find(c => 
                  c.camp_type === 'exit_camp' || 
                  c.name?.toLowerCase().includes('sonapur') && c.name?.toLowerCase().includes('exit')
                );
                const existingTransfer = transferRequests.find(tr => 
                  tr.technician_ids?.includes(formData.technician_id) &&
                  tr.target_camp_id === sonapurExitCamp?.id &&
                  tr.status !== 'cancelled'
                );
                
                return (
                  <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-semibold text-orange-900">Exit Process Required</p>
                        <p className="text-xs text-orange-700 mt-1">
                          {existingTransfer 
                            ? 'Transfer request to Sonapur Exit Camp already exists for this technician.'
                            : 'Resignation detected. Automatically initiate transfer to Sonapur Exit Camp for exit formalities.'}
                        </p>
                      </div>
                      {!existingTransfer && (
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => handleInitiateTransfer({ technician_id: formData.technician_id })}
                          disabled={initiatingTransfer}
                          className="bg-orange-600 hover:bg-orange-700 ml-3"
                        >
                          Initiate Camp Transfer
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })()}

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => { 
                setShowAddDialog(false); 
                setTechnicianSearch(""); 
                setFormData({ termination_reason: '', exit_process_choice: '' });
              }}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                className="bg-red-600 hover:bg-red-700"
                disabled={
                  formData.action_type_id && 
                  actionTypes.find(at => at.id === formData.action_type_id)?.name?.toLowerCase() === 'termination' && 
                  !formData.exit_process_choice
                }
              >
                Log Action
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Transfer Type Selection Dialog */}
      <Dialog open={showTransferTypeDialog} onOpenChange={setShowTransferTypeDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Select Transfer Type</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-gray-600">
              Choose how to process this exit case:
            </p>
            
            <Button
              onClick={() => handleTransferTypeSelection('camp_transfer')}
              disabled={initiatingTransfer}
              className="w-full bg-blue-600 hover:bg-blue-700 h-auto py-4 flex flex-col items-start"
            >
              <span className="font-semibold mb-1">Sonapur Exit Camp Transfer</span>
              <span className="text-xs font-normal opacity-90">
                Create transfer request for bed allocation and formalities at Sonapur Exit Camp
              </span>
            </Button>

            <Button
              onClick={() => handleTransferTypeSelection('direct_deport')}
              disabled={initiatingTransfer}
              variant="outline"
              className="w-full border-orange-600 text-orange-600 hover:bg-orange-50 h-auto py-4 flex flex-col items-start"
            >
              <span className="font-semibold mb-1">Direct Deport</span>
              <span className="text-xs font-normal">
                Move directly to Sonapur Exit Tracker (no camp transfer needed)
              </span>
            </Button>
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowTransferTypeDialog(false);
                setSelectedActionForTransfer(null);
              }}
              disabled={initiatingTransfer}
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}