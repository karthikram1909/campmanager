import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Users, Plus, Search, Filter, X, Download, FileText, CheckCircle2, AlertCircle, Clock, Upload, ArrowUpDown, Globe, UserCheck, UserX, Printer, Pencil, Activity } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { format } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { formatDate } from "@/components/utils/dateFormatter";

export default function Technicians() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingTechnician, setEditingTechnician] = useState(null);
  const [showBulkUploadDialog, setShowBulkUploadDialog] = useState(false);
  const [bulkFile, setBulkFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [sortField, setSortField] = useState("employee_id");
  const [sortDirection, setSortDirection] = useState("asc");
  const [showBreakdowns, setShowBreakdowns] = useState(true);
  const [showSearch, setShowSearch] = useState(true);
  const [formData, setFormData] = useState({});
  const [urlEditChecked, setUrlEditChecked] = useState(false);

  // Excel-style column filters (multi-select)
  const [filterEmployeeId, setFilterEmployeeId] = useState([]);
  const [filterFullName, setFilterFullName] = useState([]);
  const [filterNationalityCol, setFilterNationalityCol] = useState([]);
  const [filterEthnicityCol, setFilterEthnicityCol] = useState([]);
  const [filterGender, setFilterGender] = useState([]);
  const [filterPhone, setFilterPhone] = useState([]);
  const [filterEmail, setFilterEmail] = useState([]);
  const [filterTradeCol, setFilterTradeCol] = useState([]);
  const [filterDepartment, setFilterDepartment] = useState([]);
  const [filterStatusCol, setFilterStatusCol] = useState([]);
  const [filterCampCol, setFilterCampCol] = useState([]);
  const [filterFloorCol, setFilterFloorCol] = useState([]);
  const [filterRoomCol, setFilterRoomCol] = useState([]);
  const [filterBed, setFilterBed] = useState([]);
  const [filterInductionDate, setFilterInductionDate] = useState([]);
  const [filterExitDate, setFilterExitDate] = useState([]);
  const [filterExpectedCountryExitDate, setFilterExpectedCountryExitDate] = useState([]);
  const [filterActualCountryExitDate, setFilterActualCountryExitDate] = useState([]);

  // Search states for column filters
  const [searchEmployeeId, setSearchEmployeeId] = useState("");
  const [searchFullName, setSearchFullName] = useState("");
  const [searchNationalityCol, setSearchNationalityCol] = useState("");
  const [searchEthnicityCol, setSearchEthnicityCol] = useState("");
  const [searchGender, setSearchGender] = useState("");
  const [searchPhone, setSearchPhone] = useState("");
  const [searchEmail, setSearchEmail] = useState("");
  const [searchTradeCol, setSearchTradeCol] = useState("");
  const [searchDepartment, setSearchDepartment] = useState("");
  const [searchStatusCol, setSearchStatusCol] = useState("");
  const [searchCampCol, setSearchCampCol] = useState("");
  const [searchFloorCol, setSearchFloorCol] = useState("");
  const [searchRoomCol, setSearchRoomCol] = useState("");
  const [searchBed, setSearchBed] = useState("");
  const [searchInductionDate, setSearchInductionDate] = useState("");
  const [searchExitDate, setSearchExitDate] = useState("");
  const [searchExpectedCountryExitDate, setSearchExpectedCountryExitDate] = useState("");
  const [searchActualCountryExitDate, setSearchActualCountryExitDate] = useState("");

  const queryClient = useQueryClient();

  const { data: technicians = [], refetch: refetchTechnicians, isRefetching: isRefetchingTechnicians, isLoading } = useQuery({
    queryKey: ['technicians'],
    queryFn: () => base44.entities.Technician.list('-created_date'),
    staleTime: 0, // Always fetch latest
    refetchOnWindowFocus: true, // Refetch when window regains focus
  });

  const { data: camps = [] } = useQuery({
    queryKey: ['camps'],
    queryFn: () => base44.entities.Camp.list(),
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list(),
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  const { data: beds = [] } = useQuery({
    queryKey: ['beds'],
    queryFn: () => base44.entities.Bed.list(),
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  const { data: rooms = [] } = useQuery({
    queryKey: ['rooms'],
    queryFn: () => base44.entities.Room.list(),
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  const { data: floors = [] } = useQuery({
    queryKey: ['floors'],
    queryFn: () => base44.entities.Floor.list(),
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  const { data: mealPreferences = [] } = useQuery({
    queryKey: ['meal-preferences'],
    queryFn: () => base44.entities.MealPreference.list(),
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  const { data: disciplinary = [] } = useQuery({
    queryKey: ['disciplinary'],
    queryFn: () => base44.entities.DisciplinaryAction.list(),
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Technician.create(data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['technicians'] });
      await refetchTechnicians(); // Force immediate refetch
      setShowAddDialog(false);
      setFormData({});
      alert("Technician added successfully!");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Technician.update(id, data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['technicians'] });
      await refetchTechnicians(); // Force immediate refetch
      setShowEditDialog(false);
      setEditingTechnician(null);
      alert("Technician status updated successfully!");
    },
  });

  const bulkCreateMutation = useMutation({
    mutationFn: (data) => base44.entities.Technician.bulkCreate(data),
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ['technicians'] });
      await refetchTechnicians(); // Force immediate refetch
      setUploadResult({ success: true, count: result.length });
    },
    onError: (error) => {
      setUploadResult({ success: false, error: error.message });
    },
  });



  // Handle URL parameter for auto-opening edit dialog
  React.useEffect(() => {
    if (urlEditChecked || !technicians || technicians.length === 0) return;

    const urlParams = new URLSearchParams(window.location.search);
    const editId = urlParams.get('edit');

    if (editId) {
      const techToEdit = technicians.find(t => t.id === editId);
      if (techToEdit) {
        handleEdit(techToEdit);
      }
    }

    setUrlEditChecked(true);
  }, [technicians, urlEditChecked]);


  // Show loading state AFTER all hooks but BEFORE data processing
  if (isLoading) {
    return (
      <div className="p-6 md:p-8 min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading technicians...</p>
        </div>
      </div>
    );
  }

  const nationalities = [...new Set(technicians.map(t => t.nationality).filter(Boolean))];
  const ethnicities = [...new Set(technicians.map(t => t.ethnicity).filter(Boolean))];
  const activeTechnicians = technicians.filter(t => t.status === 'active').length;
  const onLeave = technicians.filter(t => t.status === 'on_leave').length;
  const pendingArrival = technicians.filter(t => t.status === 'pending_arrival').length;

  // Count technicians with actual inactive statuses
  const inactiveOrExitedTechniciansCount = technicians.filter(t =>
    ['exited_country', 'suspended', 'absconded', 'transferred'].includes(t.status)
  ).length;

  const trades = [...new Set(technicians.map(t => t.trade).filter(Boolean))];

  // Apply search filter
  let filteredTechnicians = technicians.filter(tech => {
    const matchesSearch = !searchQuery ||
      tech.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tech.employee_id?.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesSearch;
  });

  // Apply Excel-style column filters
  filteredTechnicians = filteredTechnicians.filter(tech => {
    const bed = beds.find(b => b.id === tech.bed_id);
    const room = bed ? rooms.find(r => r.id === bed.room_id) : null;
    const floor = room ? floors.find(f => f.id === room.floor_id) : null;
    const camp = camps.find(c => c.id === tech.camp_id);

    if (filterEmployeeId.length > 0 && !filterEmployeeId.includes(tech.employee_id || '-')) return false;
    if (filterFullName.length > 0 && !filterFullName.includes(tech.full_name || '-')) return false;
    if (filterNationalityCol.length > 0 && !filterNationalityCol.includes(tech.nationality || '-')) return false;
    if (filterEthnicityCol.length > 0 && !filterEthnicityCol.includes(tech.ethnicity || '-')) return false;
    if (filterGender.length > 0 && !filterGender.includes(tech.gender || '-')) return false;
    if (filterPhone.length > 0 && !filterPhone.includes(tech.phone || '-')) return false;
    if (filterEmail.length > 0 && !filterEmail.includes(tech.email || '-')) return false;
    if (filterTradeCol.length > 0 && !filterTradeCol.includes(tech.trade || '-')) return false;
    if (filterDepartment.length > 0 && !filterDepartment.includes(tech.department || '-')) return false;
    if (filterStatusCol.length > 0 && !filterStatusCol.includes(tech.status || '-')) return false;
    if (filterCampCol.length > 0 && !filterCampCol.includes(camp?.name || '-')) return false;
    if (filterFloorCol.length > 0 && !filterFloorCol.includes(floor ? `Floor ${floor.floor_number}` : '-')) return false;
    if (filterRoomCol.length > 0 && !filterRoomCol.includes(room ? `Room ${room.room_number}` : '-')) return false;
    if (filterBed.length > 0 && !filterBed.includes(bed ? `Bed ${bed.bed_number}` : '-')) return false;
    if (filterInductionDate.length > 0 && !filterInductionDate.includes(formatDate(tech.induction_date))) return false;
    if (filterExitDate.length > 0 && !filterExitDate.includes(formatDate(tech.exit_date))) return false;
    if (filterExpectedCountryExitDate.length > 0 && !filterExpectedCountryExitDate.includes(formatDate(tech.expected_country_exit_date))) return false;
    if (filterActualCountryExitDate.length > 0 && !filterActualCountryExitDate.includes(formatDate(tech.actual_country_exit_date))) return false;

    return true;
  });

  // Get unique values for each column
  const uniqueEmployeeIds = [...new Set(technicians.map(t => t.employee_id || '-'))].sort();
  const uniqueFullNames = [...new Set(technicians.map(t => t.full_name || '-'))].sort();
  const uniqueNationalities = [...new Set(technicians.map(t => t.nationality || '-'))].sort();
  const uniqueEthnicities = [...new Set(technicians.map(t => t.ethnicity || '-'))].sort();
  const uniqueGenders = [...new Set(technicians.map(t => t.gender || '-'))].sort();
  const uniquePhones = [...new Set(technicians.map(t => t.phone || '-'))].sort();
  const uniqueEmails = [...new Set(technicians.map(t => t.email || '-'))].sort();
  const uniqueTrades = [...new Set(technicians.map(t => t.trade || '-'))].sort();
  const uniqueDepartments = [...new Set(technicians.map(t => t.department || '-'))].sort();
  const uniqueStatuses = [...new Set(technicians.map(t => t.status || '-'))].sort();
  const uniqueCamps = [...new Set(technicians.map(t => {
    const camp = camps.find(c => c.id === t.camp_id);
    return camp?.name || '-';
  }))].sort();
  const uniqueFloors = [...new Set(technicians.map(t => {
    const bed = beds.find(b => b.id === t.bed_id);
    const room = bed ? rooms.find(r => r.id === bed.room_id) : null;
    const floor = room ? floors.find(f => f.id === room.floor_id) : null;
    return floor ? `Floor ${floor.floor_number}` : '-';
  }))].sort();
  const uniqueRooms = [...new Set(technicians.map(t => {
    const bed = beds.find(b => b.id === t.bed_id);
    const room = bed ? rooms.find(r => r.id === bed.room_id) : null;
    return room ? `Room ${room.room_number}` : '-';
  }))].sort();
  const uniqueBeds = [...new Set(technicians.map(t => {
    const bed = beds.find(b => b.id === t.bed_id);
    return bed ? `Bed ${bed.bed_number}` : '-';
  }))].sort();
  const uniqueInductionDates = [...new Set(technicians.map(t => formatDate(t.induction_date)))].sort();
  const uniqueExitDates = [...new Set(technicians.map(t => formatDate(t.exit_date)))].sort();
  const uniqueExpectedCountryExitDates = [...new Set(technicians.map(t => formatDate(t.expected_country_exit_date)))].sort();
  const uniqueActualCountryExitDates = [...new Set(technicians.map(t => formatDate(t.actual_country_exit_date)))].sort();

  const sortedTechnicians = [...filteredTechnicians].sort((a, b) => {
    const aVal = a[sortField] || '';
    const bVal = b[sortField] || '';

    if (sortField === 'date_of_birth' || sortField === 'passport_expiry_date' || sortField === 'health_insurance_expiry_date' || sortField === 'induction_date' || sortField === 'exit_date' || sortField === 'expected_country_exit_date' || sortField === 'actual_country_exit_date') {
      const dateA = aVal ? new Date(aVal) : new Date(0); // Use epoch for null/empty dates
      const dateB = bVal ? new Date(bVal) : new Date(0);
      return sortDirection === 'asc' ? dateA.getTime() - dateB.getTime() : dateB.getTime() - dateA.getTime();
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

  const handleSubmit = (e) => {
    e.preventDefault();

    const dataToSubmit = {
      ...formData,
    };

    createMutation.mutate(dataToSubmit);
  };

  const handleEdit = (technician) => {
    setEditingTechnician({
      ...technician,
      exit_date: technician.exit_date || '',
      expected_country_exit_date: technician.expected_country_exit_date || '',
      actual_country_exit_date: technician.actual_country_exit_date || '',
      health_insurance_no: technician.health_insurance_no || '',
      health_insurance_expiry_date: technician.health_insurance_expiry_date || '',
      ticket_ref: technician.ticket_ref || '',
      flight_number: technician.flight_number || '',
      airline: technician.airline || ''
    });
    setShowEditDialog(true);
  };

  const handleUpdateSubmit = (e) => {
    e.preventDefault();

    if (editingTechnician.status === 'pending_exit' && !editingTechnician.expected_country_exit_date) {
      alert("Please provide the expected country exit date for pending_exit status");
      return;
    }

    if (editingTechnician.status === 'exited_country' && !editingTechnician.actual_country_exit_date) {
      alert("Please provide the actual country exit date for exited_country status");
      return;
    }

    const updateData = {
      status: editingTechnician.status,
      exit_date: editingTechnician.exit_date || null,
      expected_country_exit_date: editingTechnician.expected_country_exit_date || null,
      actual_country_exit_date: editingTechnician.actual_country_exit_date || null
    };

    // Include pending arrival fields if status is pending_arrival
    if (editingTechnician.status === 'pending_arrival') {
      updateData.health_insurance_no = editingTechnician.health_insurance_no || null;
      updateData.health_insurance_expiry_date = editingTechnician.health_insurance_expiry_date || null;
      updateData.ticket_ref = editingTechnician.ticket_ref || null;
      updateData.flight_number = editingTechnician.flight_number || null;
      updateData.airline = editingTechnician.airline || null;
    }

    updateMutation.mutate({
      id: editingTechnician.id,
      data: updateData
    });
  };

  const downloadTemplate = () => {
    const template = `# Technicians Template
# gender options: male, female
# marital_status options: single, married, divorced, widowed
# status options: active, on_leave, pending_exit, exited_country, transferred, terminated, absconded, suspended
employee_id,full_name,nationality,ethnicity,gender,date_of_birth,phone,email,state,marital_status,passport_no,passport_expiry_date,health_insurance_no,health_insurance_expiry_date,trade,department,status,induction_date,exit_date,expected_country_exit_date,actual_country_exit_date,bed_id
EMP001,John Doe,Indian,Asian,male,1990-01-15,+971501234567,john@example.com,Kerala,married,P123456,2030-12-31,HI789012,2025-12-31,Electrician,Maintenance,active,2020-01-01,,,,,bed-123
EMP002,Jane Smith,Filipino,Asian,female,1992-03-20,+971507654321,jane@example.com,Manila,single,P234567,2029-06-30,HI890123,2025-06-30,Plumber,Maintenance,pending_exit,2021-06-15,2024-01-31,2024-02-10,,bed-456`;

    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'technicians_template.csv';
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
      // Parse file locally
      const text = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = (e) => reject(e);
        reader.readAsText(bulkFile);
      });

      // Simple CSV parser
      const rows = text.split('\n')
        .map(row => row.trim())
        .filter(row => row && !row.startsWith('#')); // Remove comments and empty lines

      if (rows.length < 2) {
        throw new Error("Invalid CSV format. Header or data missing.");
      }

      const headers = rows[0].split(',').map(h => h.trim());

      // Normalize headers to match database columns
      const headerMapping = {
        'employee id': 'employee_id',
        'employee_id': 'employee_id',
        'id': 'employee_id',
        'full name': 'full_name',
        'full_name': 'full_name',
        'name': 'full_name',
        'employee name': 'full_name',
        'employee_name': 'full_name',
        'nationality': 'nationality',
        'ethnicity': 'ethnicity',
        'gender': 'gender',
        'date of birth': 'date_of_birth',
        'date_of_birth': 'date_of_birth',
        'dob': 'date_of_birth',
        'ate_of_bir': 'date_of_birth', // From screenshot cutoff
        'phone': 'phone',
        'mobile': 'phone',
        'contact': 'phone',
        'email': 'email',
        'state': 'state',
        'marital status': 'marital_status',
        'marital_status': 'marital_status',
        'arital_stat': 'marital_status', // From screenshot cutoff
        'passport no': 'passport_no',
        'passport_no': 'passport_no',
        'passport number': 'passport_no',
        'passport_number': 'passport_no',
        'passport_num': 'passport_no',
        'sport_num': 'passport_no', // From screenshot cutoff
        'passport expiry date': 'passport_expiry_date',
        'passport_expiry_date': 'passport_expiry_date',
        'passport_expiry': 'passport_expiry_date',
        'ssport_exp': 'passport_expiry_date', // From screenshot cutoff
        'health insurance no': 'health_insurance_no',
        'health_insurance_no': 'health_insurance_no',
        'insurance no': 'health_insurance_no',
        'insurance_no': 'health_insurance_no',
        'health insurance expiry date': 'health_insurance_expiry_date',
        'health_insurance_expiry_date': 'health_insurance_expiry_date',
        'insurance expiry': 'health_insurance_expiry_date',
        'trade': 'trade',
        'position': 'trade',
        'designation': 'trade',
        'department': 'department',
        'status': 'status',
        'induction date': 'induction_date',
        'induction_date': 'induction_date',
        'joining date': 'induction_date',
        'duction_da': 'induction_date', // From screenshot cutoff
        'exit date': 'exit_date',
        'exit_date': 'exit_date',
        'expected country exit date': 'expected_country_exit_date',
        'expected_country_exit_date': 'expected_country_exit_date',
        'actual country exit date': 'actual_country_exit_date',
        'actual_country_exit_date': 'actual_country_exit_date',
        'ed_actual_': 'actual_country_exit_date', // From screenshot cutoff?
        'bed id': 'bed_id',
        'bed_id': 'bed_id',
        'bed': 'bed_id'
      };

      const normalizedHeaders = headers.map(h => {
        const lowerH = h.toLowerCase().replace(/['"]/g, '').trim();
        // Try exact match first
        // Handle cutoff headers from screenshot if possible or just partial matching
        for (const [key, value] of Object.entries(headerMapping)) {
          if (lowerH === key || lowerH.includes(key)) return value;
        }

        if (lowerH.includes('employee') && (lowerH.includes('full') || lowerH.includes('name'))) return 'full_name'; // Fallback for oyee_full...
        if (lowerH.includes('oyee_full')) return 'full_name';

        // Try partial match for some common ones
        if (lowerH.includes('passport') && lowerH.includes('expiry')) return 'passport_expiry_date';
        if (lowerH.includes('insurance') && lowerH.includes('expiry')) return 'health_insurance_expiry_date';
        if (lowerH.includes('passport') && (lowerH.includes('no') || lowerH.includes('num'))) return 'passport_no';
        if (lowerH.includes('insurance') && (lowerH.includes('no') || lowerH.includes('num'))) return 'health_insurance_no';
        if (lowerH.includes('birth')) return 'date_of_birth';

        return lowerH; // Fallback to original (lowercased)
      });

      const data = rows.slice(1).map(row => {
        const values = row.split(',').map(v => v.trim());
        const obj = {};

        // Skip empty rows
        if (values.length === 1 && values[0] === '') return null;

        normalizedHeaders.forEach((header, i) => {
          let value = values[i];
          // Handle optional values
          if (value !== undefined) {
            value = value.trim();
            // Remove wrapping quotes if present
            if (value.startsWith('"') && value.endsWith('"')) {
              value = value.substring(1, value.length - 1);
            }
            if (value !== '') {
              obj[header] = value;
            }
          }
        });
        return obj;
      }).filter(Boolean);

      const convertDate = (dateStr) => {
        if (!dateStr) return null;

        if (typeof dateStr !== 'string') return null;

        if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
          return dateStr;
        }

        if (dateStr.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
          const [day, month, year] = dateStr.split('/');
          return `${year}-${month}-${day}`;
        }

        return dateStr;
      };

      const normalizedData = data.map(tech => ({
        ...tech,
        date_of_birth: convertDate(tech.date_of_birth),
        induction_date: convertDate(tech.induction_date),
        exit_date: convertDate(tech.exit_date),
        expected_country_exit_date: convertDate(tech.expected_country_exit_date),
        actual_country_exit_date: convertDate(tech.actual_country_exit_date),
        expected_arrival_date: convertDate(tech.expected_arrival_date),
        actual_arrival_date: convertDate(tech.actual_arrival_date),
        last_transfer_date: convertDate(tech.last_transfer_date),
        passport_expiry_date: convertDate(tech.passport_expiry_date),
        health_insurance_expiry_date: convertDate(tech.health_insurance_expiry_date)
      }));

      // Try to upload the file to storage for record-keeping, but don't fail the whole process if it fails
      try {
        await base44.integrations.Core.UploadFile({ file: bulkFile });
      } catch (uploadErr) {
        console.warn("File upload to storage failed, but proceeding with data insertion:", uploadErr);
      }

      await bulkCreateMutation.mutateAsync(normalizedData);
      setBulkFile(null);
      // Success message is handled by mutation onSuccess

    } catch (error) {
      console.error("Bulk upload error:", error);
      setUploadResult({ success: false, error: error.message });
    }

    setUploading(false);
  };

  const clearAllColumnFilters = () => {
    setFilterEmployeeId([]);
    setFilterFullName([]);
    setFilterNationalityCol([]);
    setFilterEthnicityCol([]);
    setFilterGender([]);
    setFilterPhone([]);
    setFilterEmail([]);
    setFilterTradeCol([]);
    setFilterDepartment([]);
    setFilterStatusCol([]);
    setFilterCampCol([]);
    setFilterFloorCol([]);
    setFilterRoomCol([]);
    setFilterBed([]);
    setFilterInductionDate([]);
    setFilterExitDate([]);
    setFilterExpectedCountryExitDate([]);
    setFilterActualCountryExitDate([]);
  };

  const hasActiveColumnFilters = filterEmployeeId.length > 0 || filterFullName.length > 0 ||
    filterNationalityCol.length > 0 || filterEthnicityCol.length > 0 || filterGender.length > 0 ||
    filterPhone.length > 0 || filterEmail.length > 0 || filterTradeCol.length > 0 ||
    filterDepartment.length > 0 || filterStatusCol.length > 0 || filterCampCol.length > 0 ||
    filterFloorCol.length > 0 || filterRoomCol.length > 0 || filterBed.length > 0 ||
    filterInductionDate.length > 0 || filterExitDate.length > 0 ||
    filterExpectedCountryExitDate.length > 0 || filterActualCountryExitDate.length > 0;



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
    const headers = [
      'Employee ID', 'Full Name', 'Nationality', 'State', 'Marital Status',
      'Passport No', 'Passport Expiry Date', 'Health Insurance No', 'Health Insurance Expiry Date',
      'Ethnicity', 'Gender', 'Date of Birth', 'Phone', 'Email', 'Trade', 'Department', 'Status',
      'Camp', 'Floor', 'Room', 'Bed', 'Induction Date', 'Employment Exit Date',
      'Expected Country Exit Date', 'Actual Country Exit Date'
    ];
    const rows = sortedTechnicians.map(tech => {
      const camp = camps.find(c => c.id === tech.camp_id);
      const bed = beds.find(b => b.id === tech.bed_id);
      const room = bed ? rooms.find(r => r.id === bed.room_id) : null;
      const floor = room ? floors.find(f => f.id === room.floor_id) : null;

      return [
        tech.employee_id,
        tech.full_name,
        tech.nationality || '-',
        tech.state || '-',
        tech.marital_status || '-',
        tech.passport_no || '-',
        formatDate(tech.passport_expiry_date),
        tech.health_insurance_no || '-',
        formatDate(tech.health_insurance_expiry_date),
        tech.ethnicity || '-',
        tech.gender || '-',
        formatDate(tech.date_of_birth),
        tech.phone || '-',
        tech.email || '-',
        tech.trade || '-',
        tech.department || '-',
        tech.status?.replace(/_/g, ' '),
        camp?.name || '-',
        floor ? `Floor ${floor.floor_number}` : '-',
        room ? `Room ${room.room_number}` : '-',
        bed ? `Bed ${bed.bed_number}` : '-',
        formatDate(tech.induction_date),
        formatDate(tech.exit_date),
        formatDate(tech.expected_country_exit_date),
        formatDate(tech.actual_country_exit_date)
      ];
    });

    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `technicians_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const printReport = () => {
    window.print();
  };

  return (
    <div className="p-6 md:p-8 bg-gradient-to-br from-gray-50 to-blue-50 min-h-screen">
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
            padding: 10px;
          }
          #printable-table .card-title, #printable-table .card-title * {
            visibility: visible;
            display: block !important;
          }
          #printable-table table {
            width: 100%;
            border-collapse: collapse;
            font-size: 8px;
          }
          #printable-table th, #printable-table td {
            border: 1px solid #000;
            padding: 2px;
            text-align: left;
            white-space: nowrap;
          }
          #printable-table th {
            background-color: #f3f4f6 !important;
            font-weight: bold;
          }
          #printable-table tr:hover {
            background-color: inherit !important;
          }
          .no-print {
            display: none !important;
          }
          tr {
            page-break-inside: avoid;
          }
          @page {
            size: landscape;
            margin: 0.5cm;
          }
        }
      `}</style>

      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 no-print">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Technicians</h1>
            <p className="text-gray-600 mt-1">{filteredTechnicians.length} of {technicians.length} technicians</p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={refetchTechnicians}
              disabled={isRefetchingTechnicians}
              className="border-indigo-600 text-indigo-600 hover:bg-indigo-50"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isRefetchingTechnicians ? 'animate-spin' : ''}`} />
              {isRefetchingTechnicians ? 'Refreshing...' : 'Refresh'}
            </Button>
            <Button variant="outline" onClick={exportToCSV} className="border-green-600 text-green-600 hover:bg-green-50">
              <Download className="w-4 h-4 mr-2" />
              Download Excel
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
              Add Technician
            </Button>
          </div>
        </div>

        {/* Dashboard Tiles */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 no-print">
          <Card className="border-none shadow-md hover:shadow-lg transition-shadow bg-gradient-to-br from-blue-50 to-blue-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-600 mb-1">Total Technicians</p>
                  <p className="text-3xl font-bold text-blue-900">{technicians.length.toLocaleString()}</p>
                </div>
                <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
                  <Users className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-md hover:shadow-lg transition-shadow bg-gradient-to-br from-green-50 to-green-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-600 mb-1">Active</p>
                  <p className="text-3xl font-bold text-green-900">{activeTechnicians.toLocaleString()}</p>
                </div>
                <div className="w-12 h-12 bg-green-600 rounded-xl flex items-center justify-center">
                  <UserCheck className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-md hover:shadow-lg transition-shadow bg-gradient-to-br from-yellow-50 to-yellow-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-yellow-600 mb-1">Pending Arrival</p>
                  <p className="text-3xl font-bold text-yellow-900">{pendingArrival.toLocaleString()}</p>
                </div>
                <div className="w-12 h-12 bg-yellow-600 rounded-xl flex items-center justify-center">
                  <Clock className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-md hover:shadow-lg transition-shadow bg-gradient-to-br from-orange-50 to-orange-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-orange-600 mb-1">On Leave</p>
                  <p className="text-3xl font-bold text-orange-900">{onLeave.toLocaleString()}</p>
                </div>
                <div className="w-12 h-12 bg-orange-600 rounded-xl flex items-center justify-center">
                  <UserX className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-md hover:shadow-lg transition-shadow bg-gradient-to-br from-red-50 to-red-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-red-600 mb-1">Inactive/Exited</p>
                  <p className="text-3xl font-bold text-red-900">{inactiveOrExitedTechniciansCount.toLocaleString()}</p>
                </div>
                <div className="w-12 h-12 bg-red-600 rounded-xl flex items-center justify-center">
                  <UserX className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-md hover:shadow-lg transition-shadow bg-gradient-to-br from-purple-50 to-purple-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-600 mb-1">Nationalities</p>
                  <p className="text-3xl font-bold text-purple-900">{nationalities.length}</p>
                  <p className="text-xs text-purple-600 mt-1">{ethnicities.length} Ethnicities</p>
                </div>
                <div className="w-12 h-12 bg-purple-600 rounded-xl flex items-center justify-center">
                  <Globe className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Nationality & Ethnicity Breakdown */}
        <div className="flex items-center justify-between mb-2 no-print">
          <h3 className="text-lg font-semibold text-gray-900">Demographics Breakdown</h3>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowBreakdowns(!showBreakdowns)}
            className="text-sm"
          >
            {showBreakdowns ? 'Hide' : 'Show'} Demographics
          </Button>
        </div>

        {showBreakdowns && (
          <div className="grid md:grid-cols-2 gap-4 no-print">
            <Card className="border-none shadow-md">
              <CardContent className="p-6">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Globe className="w-5 h-5 text-blue-600" />
                  Top Nationalities
                </h3>
                <div className="space-y-3">
                  {Object.entries(
                    technicians.reduce((acc, t) => {
                      if (t.nationality) {
                        acc[t.nationality] = (acc[t.nationality] || 0) + 1;
                      }
                      return acc;
                    }, {})
                  )
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 5)
                    .map(([nationality, count]) => (
                      <div key={nationality} className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1">
                          <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                          <span className="text-sm text-gray-700">{nationality}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-32 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full"
                              style={{ width: `${(count / technicians.length) * 100}%` }}
                            />
                          </div>
                          <span className="text-sm font-semibold text-gray-900 w-12 text-right">
                            {count.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-md">
              <CardContent className="p-6">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5 text-purple-600" />
                  Top Ethnicities
                </h3>
                <div className="space-y-3">
                  {Object.entries(
                    technicians.reduce((acc, t) => {
                      if (t.ethnicity) {
                        acc[t.ethnicity] = (acc[t.ethnicity] || 0) + 1;
                      }
                      return acc;
                    }, {})
                  )
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 5)
                    .map(([ethnicity, count]) => (
                      <div key={ethnicity} className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1">
                          <div className="w-2 h-2 bg-purple-600 rounded-full"></div>
                          <span className="text-sm text-gray-700">{ethnicity}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-32 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-purple-600 h-2 rounded-full"
                              style={{ width: `${(count / technicians.length) * 100}%` }}
                            />
                          </div>
                          <span className="text-sm font-semibold text-gray-900 w-12 text-right">
                            {count.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Search Section */}
        <div className="flex items-center justify-between mb-2 no-print">
          <h3 className="text-lg font-semibold text-gray-900">Search</h3>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSearch(!showSearch)}
            className="text-sm"
          >
            {showSearch ? 'Hide' : 'Show'} Search
          </Button>
        </div>

        {showSearch && (
          <Card className="border-none shadow-md no-print">
            <CardContent className="p-6">
              <div className="relative">
                <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search by name or employee ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Excel-style Table */}
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

          <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100 border-b">
            <CardTitle className="card-title">Technicians ({sortedTechnicians.length})</CardTitle>
          </CardHeader>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse bg-white">
              <thead>
                <tr className="border-b-2 border-gray-300">
                  <th className="px-3 py-2 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200 no-print">
                    Actions
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
                          selected={filterNationalityCol}
                          setSelected={setFilterNationalityCol}
                          searchValue={searchNationalityCol}
                          setSearchValue={setSearchNationalityCol}
                        />
                      </div>
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                    <div className="flex items-center justify-between gap-2">
                      <span>State</span>
                      <Button variant="ghost" size="sm" className="h-8 px-2 no-print" onClick={() => handleSort('state')}>
                        <ArrowUpDown className="w-3 h-3" />
                      </Button>
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                    <div className="flex items-center justify-between gap-2">
                      <span>Marital Status</span>
                      <Button variant="ghost" size="sm" className="h-8 px-2 no-print" onClick={() => handleSort('marital_status')}>
                        <ArrowUpDown className="w-3 h-3" />
                      </Button>
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                    <div className="flex items-center justify-between gap-2">
                      <span>Passport No</span>
                      <Button variant="ghost" size="sm" className="h-8 px-2 no-print" onClick={() => handleSort('passport_no')}>
                        <ArrowUpDown className="w-3 h-3" />
                      </Button>
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                    <div className="flex items-center justify-between gap-2">
                      <span>Passport Expiry</span>
                      <Button variant="ghost" size="sm" className="h-8 px-2 no-print" onClick={() => handleSort('passport_expiry_date')}>
                        <ArrowUpDown className="w-3 h-3" />
                      </Button>
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                    <div className="flex items-center justify-between gap-2">
                      <span>Health Ins. No</span>
                      <Button variant="ghost" size="sm" className="h-8 px-2 no-print" onClick={() => handleSort('health_insurance_no')}>
                        <ArrowUpDown className="w-3 h-3" />
                      </Button>
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                    <div className="flex items-center justify-between gap-2">
                      <span>Health Ins. Expiry</span>
                      <Button variant="ghost" size="sm" className="h-8 px-2 no-print" onClick={() => handleSort('health_insurance_expiry_date')}>
                        <ArrowUpDown className="w-3 h-3" />
                      </Button>
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
                          selected={filterEthnicityCol}
                          setSelected={setFilterEthnicityCol}
                          searchValue={searchEthnicityCol}
                          setSearchValue={setSearchEthnicityCol}
                        />
                      </div>
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                    <div className="flex items-center justify-between gap-2">
                      <span>Gender</span>
                      <div className="flex gap-1 no-print">
                        <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => handleSort('gender')}>
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
                      <span>Date of Birth</span>
                      <Button variant="ghost" size="sm" className="h-8 px-2 no-print" onClick={() => handleSort('date_of_birth')}>
                        <ArrowUpDown className="w-3 h-3" />
                      </Button>
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                    <div className="flex items-center justify-between gap-2">
                      <span>Phone</span>
                      <ColumnFilter
                        values={uniquePhones}
                        selected={filterPhone}
                        setSelected={setFilterPhone}
                        searchValue={searchPhone}
                        setSearchValue={setSearchPhone}
                      />
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                    <div className="flex items-center justify-between gap-2">
                      <span>Email</span>
                      <ColumnFilter
                        values={uniqueEmails}
                        selected={filterEmail}
                        setSelected={setFilterEmail}
                        searchValue={searchEmail}
                        setSearchValue={setSearchEmail}
                      />
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                    <div className="flex items-center justify-between gap-2">
                      <span>Trade</span>
                      <div className="flex gap-1 no-print">
                        <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => handleSort('trade')}>
                          <ArrowUpDown className="w-3 h-3" />
                        </Button>
                        <ColumnFilter
                          values={uniqueTrades}
                          selected={filterTradeCol}
                          setSelected={setFilterTradeCol}
                          searchValue={searchTradeCol}
                          setSearchValue={setSearchTradeCol}
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
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                    <div className="flex items-center justify-between gap-2">
                      <span>Status</span>
                      <div className="flex gap-1 no-print">
                        <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => handleSort('status')}>
                          <ArrowUpDown className="w-3 h-3" />
                        </Button>
                        <ColumnFilter
                          values={uniqueStatuses}
                          selected={filterStatusCol}
                          setSelected={setFilterStatusCol}
                          searchValue={searchStatusCol}
                          setSearchValue={setSearchStatusCol}
                        />
                      </div>
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                    <div className="flex items-center justify-between gap-2">
                      <span>Camp</span>
                      <ColumnFilter
                        values={uniqueCamps}
                        selected={filterCampCol}
                        setSelected={setFilterCampCol}
                        searchValue={searchCampCol}
                        setSearchValue={setSearchCampCol}
                      />
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                    <div className="flex items-center justify-between gap-2">
                      <span>Floor</span>
                      <ColumnFilter
                        values={uniqueFloors}
                        selected={filterFloorCol}
                        setSelected={setFilterFloorCol}
                        searchValue={searchFloorCol}
                        setSearchValue={setSearchFloorCol}
                      />
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                    <div className="flex items-center justify-between gap-2">
                      <span>Room</span>
                      <ColumnFilter
                        values={uniqueRooms}
                        selected={filterRoomCol}
                        setSelected={setFilterRoomCol}
                        searchValue={searchRoomCol}
                        setSearchValue={setSearchRoomCol}
                      />
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                    <div className="flex items-center justify-between gap-2">
                      <span>Bed</span>
                      <ColumnFilter
                        values={uniqueBeds}
                        selected={filterBed}
                        setSelected={setFilterBed}
                        searchValue={searchBed}
                        setSearchValue={setSearchBed}
                      />
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                    <div className="flex items-center justify-between gap-2">
                      <span>Induction Date</span>
                      <div className="flex gap-1 no-print">
                        <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => handleSort('induction_date')}>
                          <ArrowUpDown className="w-3 h-3" />
                        </Button>
                        <ColumnFilter
                          values={uniqueInductionDates}
                          selected={filterInductionDate}
                          setSelected={setFilterInductionDate}
                          searchValue={searchInductionDate}
                          setSearchValue={setSearchInductionDate}
                        />
                      </div>
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                    <div className="flex items-center justify-between gap-2">
                      <span>Employment Exit Date</span>
                      <div className="flex gap-1 no-print">
                        <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => handleSort('exit_date')}>
                          <ArrowUpDown className="w-3 h-3" />
                        </Button>
                        <ColumnFilter
                          values={uniqueExitDates}
                          selected={filterExitDate}
                          setSelected={setFilterExitDate}
                          searchValue={searchExitDate}
                          setSearchValue={setSearchExitDate}
                        />
                      </div>
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                    <div className="flex items-center justify-between gap-2">
                      <span>Expected Country Exit Date</span>
                      <div className="flex gap-1 no-print">
                        <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => handleSort('expected_country_exit_date')}>
                          <ArrowUpDown className="w-3 h-3" />
                        </Button>
                        <ColumnFilter
                          values={uniqueExpectedCountryExitDates}
                          selected={filterExpectedCountryExitDate}
                          setSelected={setFilterExpectedCountryExitDate}
                          searchValue={searchExpectedCountryExitDate}
                          setSearchValue={setSearchExpectedCountryExitDate}
                        />
                      </div>
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                    <div className="flex items-center justify-between gap-2">
                      <span>Actual Country Exit Date</span>
                      <div className="flex gap-1 no-print">
                        <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => handleSort('actual_country_exit_date')}>
                          <ArrowUpDown className="w-3 h-3" />
                        </Button>
                        <ColumnFilter
                          values={uniqueActualCountryExitDates}
                          selected={filterActualCountryExitDate}
                          setSelected={setFilterActualCountryExitDate}
                          searchValue={searchActualCountryExitDate}
                          setSearchValue={setSearchActualCountryExitDate}
                        />
                      </div>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan="26" className="px-4 py-12 text-center text-gray-500">
                      Loading technicians...
                    </td>
                  </tr>
                ) : sortedTechnicians.length === 0 ? (
                  <tr>
                    <td colSpan="26" className="px-4 py-12 text-center text-gray-500">
                      <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p>No technicians found</p>
                    </td>
                  </tr>
                ) : (
                  sortedTechnicians.map((tech, index) => {
                    const camp = camps.find(c => c.id === tech.camp_id);
                    const bed = beds.find(b => b.id === tech.bed_id);
                    const room = bed ? rooms.find(r => r.id === bed.room_id) : null;
                    const floor = room ? floors.find(f => f.id === room.floor_id) : null;

                    return (
                      <tr
                        key={tech.id}
                        className={`border-b border-gray-200 hover:bg-blue-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                          }`}
                      >
                        <td className="px-3 py-2 text-sm border-r border-gray-200 whitespace-nowrap no-print">
                          <div className="flex gap-1 justify-center">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(tech)}
                              className="h-8 w-8 p-0"
                              title="Edit Technician Status"
                            >
                              <Pencil className="w-4 h-4 text-blue-600" />
                            </Button>
                            {tech?.id && (
                              <Link to={createPageUrl(`TechnicianMedicalHistory`) + `?technician_id=${tech.id}`}>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Medical History">
                                  <Activity className="w-4 h-4 text-red-600" />
                                </Button>
                              </Link>
                            )}
                            {tech?.id && (
                              <Link to={createPageUrl(`TechnicianDetailReport`) + `?technician_id=${tech.id}`}>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Full Detail Report">
                                  <FileText className="w-4 h-4 text-purple-600" />
                                </Button>
                              </Link>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-blue-600 border-r border-gray-200 whitespace-nowrap">
                          {tech.employee_id}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 border-r border-gray-200 whitespace-nowrap font-medium">
                          {tech.full_name}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 border-r border-gray-200 whitespace-nowrap">
                          {tech.nationality || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 border-r border-gray-200 whitespace-nowrap">
                          {tech.state || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 border-r border-gray-200 whitespace-nowrap">
                          {tech.marital_status || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 border-r border-gray-200 whitespace-nowrap">
                          {tech.passport_no || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 border-r border-gray-200 whitespace-nowrap">
                          {formatDate(tech.passport_expiry_date)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 border-r border-gray-200 whitespace-nowrap">
                          {tech.health_insurance_no || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 border-r border-gray-200 whitespace-nowrap">
                          {formatDate(tech.health_insurance_expiry_date)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 border-r border-gray-200 whitespace-nowrap">
                          {tech.ethnicity || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 border-r border-gray-200 whitespace-nowrap">
                          {tech.gender || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 border-r border-gray-200 whitespace-nowrap">
                          {formatDate(tech.date_of_birth)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 border-r border-gray-200 whitespace-nowrap">
                          {tech.phone || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 border-r border-gray-200">
                          {tech.email || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 border-r border-gray-200 whitespace-nowrap">
                          {tech.trade || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 border-r border-gray-200 whitespace-nowrap">
                          {tech.department || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm border-r border-gray-200 whitespace-nowrap">
                          <Badge variant={
                            tech.status === 'active' ? 'default' :
                              tech.status === 'on_leave' || tech.status === 'pending_exit' || tech.status === 'pending_arrival' ? 'secondary' :
                                tech.status === 'exited_country' ? 'outline' :
                                  tech.status === 'suspended' ? 'outline' : 'destructive'
                          } className="text-xs">
                            {tech.status?.replace(/_/g, ' ')}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 border-r border-gray-200 whitespace-nowrap">
                          {camp?.name || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 border-r border-gray-200 whitespace-nowrap">
                          {floor ? `Floor ${floor.floor_number}` : '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 border-r border-gray-200 whitespace-nowrap">
                          {room ? `Room ${room.room_number}` : '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 border-r border-gray-200 whitespace-nowrap">
                          {bed ? `Bed ${bed.bed_number}` : '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 border-r border-gray-200 whitespace-nowrap">
                          {formatDate(tech.induction_date)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 border-r border-gray-200 whitespace-nowrap">
                          {formatDate(tech.exit_date)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 border-r border-gray-200 whitespace-nowrap">
                          {formatDate(tech.expected_country_exit_date)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 border-r border-gray-200 whitespace-nowrap">
                          {formatDate(tech.actual_country_exit_date)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="bg-gray-50 px-6 py-3 border-t border-gray-200 no-print">
            <p className="text-sm text-gray-600">
              Showing <span className="font-semibold">{sortedTechnicians.length}</span> of <span className="font-semibold">{technicians.length}</span> technicians
            </p>
          </div>
        </Card>
      </div>

      {/* Add Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Technician</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Employee ID*</Label>
                <Input
                  required
                  value={formData.employee_id || ''}
                  onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Full Name*</Label>
                <Input
                  required
                  value={formData.full_name || ''}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Nationality*</Label>
                <Input
                  required
                  value={formData.nationality || ''}
                  onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>State/Province</Label>
                <Input
                  value={formData.state || ''}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Ethnicity</Label>
                <Input
                  value={formData.ethnicity || ''}
                  onChange={(e) => setFormData({ ...formData, ethnicity: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Gender*</Label>
                <Select
                  value={formData.gender || ''}
                  onValueChange={(value) => setFormData({ ...formData, gender: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Marital Status</Label>
                <Select
                  value={formData.marital_status || ''}
                  onValueChange={(value) => setFormData({ ...formData, marital_status: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single">Single</SelectItem>
                    <SelectItem value="married">Married</SelectItem>
                    <SelectItem value="divorced">Divorced</SelectItem>
                    <SelectItem value="widowed">Widowed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Date of Birth</Label>
                <Input
                  type="date"
                  value={formData.date_of_birth || ''}
                  onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Passport No</Label>
                <Input
                  value={formData.passport_no || ''}
                  onChange={(e) => setFormData({ ...formData, passport_no: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Passport Expiry Date</Label>
                <Input
                  type="date"
                  value={formData.passport_expiry_date || ''}
                  onChange={(e) => setFormData({ ...formData, passport_expiry_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Health Insurance No</Label>
                <Input
                  value={formData.health_insurance_no || ''}
                  onChange={(e) => setFormData({ ...formData, health_insurance_no: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Health Insurance Expiry Date</Label>
                <Input
                  type="date"
                  value={formData.health_insurance_expiry_date || ''}
                  onChange={(e) => setFormData({ ...formData, health_insurance_expiry_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  value={formData.phone || ''}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Trade</Label>
                <Input
                  value={formData.trade || ''}
                  onChange={(e) => setFormData({ ...formData, trade: e.target.value })}
                  placeholder="e.g. Electrician, Plumber"
                />
              </div>
              <div className="space-y-2">
                <Label>Department</Label>
                <Input
                  value={formData.department || ''}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={formData.status || 'active'}
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending_arrival">Pending Arrival</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="on_leave">On Leave</SelectItem>
                    <SelectItem value="pending_exit">Pending Exit (In Camp)</SelectItem>
                    <SelectItem value="exited_country">Exited Country</SelectItem>
                    <SelectItem value="transferred">Transferred</SelectItem>
                    <SelectItem value="terminated">Terminated</SelectItem>
                    <SelectItem value="absconded">Absconded</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Induction Date</Label>
                <Input
                  type="date"
                  value={formData.induction_date || ''}
                  onChange={(e) => setFormData({ ...formData, induction_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Employment Exit Date</Label>
                <Input
                  type="date"
                  value={formData.exit_date || ''}
                  onChange={(e) => setFormData({ ...formData, exit_date: e.target.value })}
                />
                <p className="text-xs text-gray-500">Date employment was terminated</p>
              </div>
              <div className="space-y-2">
                <Label>Expected Country Exit Date</Label>
                <Input
                  type="date"
                  value={formData.expected_country_exit_date || ''}
                  onChange={(e) => setFormData({ ...formData, expected_country_exit_date: e.target.value })}
                />
                <p className="text-xs text-gray-500">Expected date to leave UAE</p>
              </div>
              <div className="space-y-2">
                <Label>Actual Country Exit Date</Label>
                <Input
                  type="date"
                  value={formData.actual_country_exit_date || ''}
                  onChange={(e) => setFormData({ ...formData, actual_country_exit_date: e.target.value })}
                />
                <p className="text-xs text-gray-500">Actual date left UAE</p>
              </div>
            </div>
            <DialogFooter className="gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setShowAddDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                Add Technician
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Bulk Upload Dialog */}
      <Dialog open={showBulkUploadDialog} onOpenChange={setShowBulkUploadDialog}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Bulk Upload Technicians</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Alert>
              <AlertDescription>
                Upload a CSV file with technician data. Download the template below to see the required format.
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
                    ? `Successfully uploaded ${uploadResult.count} technicians!`
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

      {/* Edit Technician Status Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Update Technician Status</DialogTitle>
          </DialogHeader>

          {editingTechnician && (
            <form onSubmit={handleUpdateSubmit} className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <p className="text-sm font-medium text-blue-900">{editingTechnician.full_name}</p>
                <p className="text-xs text-blue-700">Employee ID: {editingTechnician.employee_id}</p>
                <p className="text-xs text-blue-700">Current Status: <Badge variant="outline">{editingTechnician.status?.replace(/_/g, ' ')}</Badge></p>
              </div>

              {/* Display Emergency Contact & Legal Nominee (Read-only) */}
              {(editingTechnician.emergency_contact_no || editingTechnician.legal_nominee_name) && (
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Emergency Contact & Legal Nominee</h4>
                  <div className="space-y-2 text-sm">
                    {editingTechnician.emergency_contact_no && (
                      <div className="flex justify-between items-center py-1 border-b border-gray-200">
                        <span className="text-gray-600">Emergency Contact:</span>
                        <span className="font-medium text-gray-900">
                          {editingTechnician.emergency_contact_no}
                          {editingTechnician.emergency_contact_no_relationship && (
                            <span className="text-xs text-gray-500 ml-2">({editingTechnician.emergency_contact_no_relationship})</span>
                          )}
                        </span>
                      </div>
                    )}
                    {editingTechnician.emergency_contact_no_2 && (
                      <div className="flex justify-between items-center py-1 border-b border-gray-200">
                        <span className="text-gray-600">Emergency Contact 2:</span>
                        <span className="font-medium text-gray-900">
                          {editingTechnician.emergency_contact_no_2}
                          {editingTechnician.emergency_contact_no_2_relationship && (
                            <span className="text-xs text-gray-500 ml-2">({editingTechnician.emergency_contact_no_2_relationship})</span>
                          )}
                        </span>
                      </div>
                    )}
                    {editingTechnician.legal_nominee_name && (
                      <div className="flex justify-between items-center py-1">
                        <span className="text-gray-600">Legal Nominee:</span>
                        <span className="font-medium text-gray-900">
                          {editingTechnician.legal_nominee_name}
                          {editingTechnician.nominee_relationship && (
                            <span className="text-xs text-gray-500 ml-2">({editingTechnician.nominee_relationship})</span>
                          )}
                        </span>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-3 italic">These details were captured during onboarding and are read-only here.</p>
                </div>
              )}

              <div className="space-y-2">
                <Label>New Status*</Label>
                <Select
                  value={editingTechnician.status}
                  onValueChange={(val) => setEditingTechnician({ ...editingTechnician, status: val })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending_arrival">Pending Arrival</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="on_leave">On Leave</SelectItem>
                    <SelectItem value="pending_exit">Pending Exit (In Camp)</SelectItem>
                    <SelectItem value="exited_country">Exited Country</SelectItem>
                    <SelectItem value="absconded">Absconded</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {editingTechnician.status === 'pending_arrival' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Health Insurance No</Label>
                      <Input
                        value={editingTechnician.health_insurance_no || ''}
                        onChange={(e) => setEditingTechnician({ ...editingTechnician, health_insurance_no: e.target.value })}
                        placeholder="e.g., HI789012"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Health Insurance Expiry Date</Label>
                      <Input
                        type="date"
                        value={editingTechnician.health_insurance_expiry_date || ''}
                        onChange={(e) => setEditingTechnician({ ...editingTechnician, health_insurance_expiry_date: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Ticket Reference</Label>
                    <Input
                      value={editingTechnician.ticket_ref || ''}
                      onChange={(e) => setEditingTechnician({ ...editingTechnician, ticket_ref: e.target.value })}
                      placeholder="e.g., TKT123456"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Flight Number</Label>
                      <Input
                        value={editingTechnician.flight_number || ''}
                        onChange={(e) => setEditingTechnician({ ...editingTechnician, flight_number: e.target.value })}
                        placeholder="e.g., EK201"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Airline</Label>
                      <Input
                        value={editingTechnician.airline || ''}
                        onChange={(e) => setEditingTechnician({ ...editingTechnician, airline: e.target.value })}
                        placeholder="e.g., Emirates"
                      />
                    </div>
                  </div>

                  <Alert className="bg-blue-50 border-blue-200">
                    <AlertCircle className="h-4 w-4 text-blue-600" />
                    <AlertDescription className="text-blue-800 text-sm">
                      <strong>Pending Arrival Status:</strong> Edit flight and insurance details before the technician arrives.
                    </AlertDescription>
                  </Alert>
                </>
              )}

              {editingTechnician.status === 'pending_exit' && (
                <>
                  <div className="space-y-2">
                    <Label>Employment Exit Date</Label>
                    <Input
                      type="date"
                      value={editingTechnician.exit_date || ''}
                      onChange={(e) => setEditingTechnician({ ...editingTechnician, exit_date: e.target.value })}
                    />
                    <p className="text-xs text-gray-500">Date when employment was terminated</p>
                  </div>

                  <div className="space-y-2">
                    <Label>Expected Country Exit Date*</Label>
                    <Input
                      type="date"
                      required
                      value={editingTechnician.expected_country_exit_date || ''}
                      onChange={(e) => setEditingTechnician({ ...editingTechnician, expected_country_exit_date: e.target.value })}
                    />
                    <p className="text-xs text-gray-500">When is the technician expected to leave the country?</p>
                  </div>

                  <Alert className="bg-orange-50 border-orange-200">
                    <AlertCircle className="h-4 w-4 text-orange-600" />
                    <AlertDescription className="text-orange-800 text-sm">
                      <strong>Pending Exit Status:</strong> Technician remains in camp and occupies a bed until they actually leave the country.
                      Track their departure on the Dashboard to ensure timely exit.
                    </AlertDescription>
                  </Alert>
                </>
              )}

              {editingTechnician.status === 'exited_country' && (
                <>
                  <div className="space-y-2">
                    <Label>Employment Exit Date</Label>
                    <Input
                      type="date"
                      value={editingTechnician.exit_date || ''}
                      onChange={(e) => setEditingTechnician({ ...editingTechnician, exit_date: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Actual Country Exit Date*</Label>
                    <Input
                      type="date"
                      required
                      value={editingTechnician.actual_country_exit_date || ''}
                      onChange={(e) => setEditingTechnician({ ...editingTechnician, actual_country_exit_date: e.target.value })}
                    />
                    <p className="text-xs text-gray-500">When did the technician actually leave the country?</p>
                  </div>

                  <Alert className="bg-green-50 border-green-200">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-800 text-sm">
                      <strong>Exited Country:</strong> Technician has left the country. Their bed will be freed up for allocation.
                    </AlertDescription>
                  </Alert>
                </>
              )}

              {['absconded', 'suspended', 'terminated'].includes(editingTechnician.status) && (
                <>
                  <div className="space-y-2">
                    <Label>Employment Exit Date</Label>
                    <Input
                      type="date"
                      value={editingTechnician.exit_date || ''}
                      onChange={(e) => setEditingTechnician({ ...editingTechnician, exit_date: e.target.value })}
                    />
                  </div>

                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-sm">
                      <strong>Inactive Status:</strong> This status indicates the technician is no longer actively employed.
                    </AlertDescription>
                  </Alert>
                </>
              )}

              <DialogFooter className="gap-2">
                {editingTechnician.id && (
                  <Link to={createPageUrl(`TechnicianMedicalHistory`) + `?technician_id=${editingTechnician.id}`}>
                    <Button variant="outline" className="text-blue-600 hover:bg-blue-50">
                      <Activity className="w-4 h-4 mr-2" />
                      View Full History
                    </Button>
                  </Link>
                )}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowEditDialog(false);
                    setEditingTechnician(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700"
                  disabled={updateMutation.isLoading}
                >
                  {updateMutation.isLoading ? 'Updating...' : 'Update Status'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}