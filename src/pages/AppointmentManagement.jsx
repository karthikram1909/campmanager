import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Calendar, AlertCircle, Upload, FileText, Plus, Search, Download, Printer, Filter, X, ArrowUpDown } from "lucide-react";
import { format, parseISO, differenceInDays } from "date-fns";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { createPageUrl } from "@/utils";

export default function AppointmentManagement() {
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [showRescheduleDialog, setShowRescheduleDialog] = useState(false);
  const [appointmentType, setAppointmentType] = useState('medical_test');
  const [selectedTechnicians, setSelectedTechnicians] = useState([]);
  const [appointmentData, setAppointmentData] = useState({
    appointment_date: format(new Date(), 'yyyy-MM-dd'),
    appointment_time: '09:00',
    appointment_location: '',
    notes: ''
  });
  const [hospitalSearchQuery, setHospitalSearchQuery] = useState('');
  const [showAddHospitalDialog, setShowAddHospitalDialog] = useState(false);
  const [newHospitalData, setNewHospitalData] = useState({});
  
  const [showSlipUploadDialog, setShowSlipUploadDialog] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [rescheduleData, setRescheduleData] = useState({});
  const [medicalSlipFile, setMedicalSlipFile] = useState(null);
  const [tawjeehSlipFile, setTawjeehSlipFile] = useState(null);
  const [uploadingSlips, setUploadingSlips] = useState(false);

  // Table filters and sorting
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState("appointment_date");
  const [sortDirection, setSortDirection] = useState("desc");
  const [renewalFilter, setRenewalFilter] = useState("all"); // all, new, renewal

  // Excel-style column filters
  const [filterDate, setFilterDate] = useState([]);
  const [filterTime, setFilterTime] = useState([]);
  const [filterTechName, setFilterTechName] = useState([]);
  const [filterEmployeeId, setFilterEmployeeId] = useState([]);
  const [filterCamp, setFilterCamp] = useState([]);
  const [filterType, setFilterType] = useState([]);
  const [filterLocation, setFilterLocation] = useState([]);
  const [filterStatus, setFilterStatus] = useState([]);
  const [filterDeparture, setFilterDeparture] = useState([]);
  const [filterReturn, setFilterReturn] = useState([]);
  const [filterResult, setFilterResult] = useState([]);
  const [filterEIDExpiry, setFilterEIDExpiry] = useState([]);

  // Search states for filters
  const [searchDate, setSearchDate] = useState("");
  const [searchTime, setSearchTime] = useState("");
  const [searchTechName, setSearchTechName] = useState("");
  const [searchEmployeeId, setSearchEmployeeId] = useState("");
  const [searchCamp, setSearchCamp] = useState("");
  const [searchType, setSearchType] = useState("");
  const [searchLocation, setSearchLocation] = useState("");
  const [searchStatus, setSearchStatus] = useState("");
  const [searchDeparture, setSearchDeparture] = useState("");
  const [searchReturn, setSearchReturn] = useState("");
  const [searchResult, setSearchResult] = useState("");
  const [searchEIDExpiry, setSearchEIDExpiry] = useState("");

  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
  });

  const { data: appointments = [] } = useQuery({
    queryKey: ['appointments'],
    queryFn: () => base44.entities.Appointment.list('-appointment_date'),
  });

  const { data: technicians = [] } = useQuery({
    queryKey: ['technicians'],
    queryFn: () => base44.entities.Technician.list(),
  });

  const { data: camps = [] } = useQuery({
    queryKey: ['camps'],
    queryFn: () => base44.entities.Camp.list(),
  });

  const { data: hospitals = [] } = useQuery({
    queryKey: ['hospitals'],
    queryFn: () => base44.entities.Hospital.list(),
  });

  const createAppointmentMutation = useMutation({
    mutationFn: (data) => base44.entities.Appointment.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
  });

  const updateAppointmentMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Appointment.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
  });

  const createDisciplinaryMutation = useMutation({
    mutationFn: (data) => base44.entities.DisciplinaryAction.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['disciplinary'] });
    },
  });

  const createHospitalMutation = useMutation({
    mutationFn: (data) => base44.entities.Hospital.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hospitals'] });
      setShowAddHospitalDialog(false);
      setNewHospitalData({});
      alert("Hospital added successfully!");
    },
  });

  const isHR = currentUser?.role === 'admin';
  const canDoHRActions = isHR;
  const canDoCampBossActions = true;

  // Helper function to check EID expiry status
  const getEIDExpiryStatus = (tech) => {
    if (!tech.eid_expiry_date) return { status: 'no_eid', daysRemaining: null, label: 'No EID', color: 'bg-gray-100 text-gray-700' };
    
    const today = new Date();
    const expiryDate = parseISO(tech.eid_expiry_date);
    const daysRemaining = differenceInDays(expiryDate, today);
    
    if (daysRemaining < 0) {
      return { status: 'expired', daysRemaining, label: 'EID Expired', color: 'bg-red-600 text-white' };
    } else if (daysRemaining <= 30) {
      return { status: 'critical', daysRemaining, label: `Expires in ${daysRemaining}d`, color: 'bg-red-500 text-white' };
    } else if (daysRemaining <= 60) {
      return { status: 'urgent', daysRemaining, label: `Expires in ${daysRemaining}d`, color: 'bg-orange-500 text-white' };
    } else if (daysRemaining <= 90) {
      return { status: 'upcoming', daysRemaining, label: `Expires in ${daysRemaining}d`, color: 'bg-yellow-500 text-white' };
    } else {
      return { status: 'valid', daysRemaining, label: 'EID Valid', color: 'bg-green-100 text-green-700' };
    }
  };

  // Check if technician needs EID renewal (based on expiry)
  const needsEIDRenewal = (tech) => {
    const expiryStatus = getEIDExpiryStatus(tech);
    return ['expired', 'critical', 'urgent', 'upcoming'].includes(expiryStatus.status);
  };

  // Eligible for medical test: Active technicians only (new or needing EID renewal)
  const eligibleForMedical = technicians.filter(t => {
    // Only show active technicians
    if (t.status !== 'active') return false;
    
    const hasPendingMedical = appointments.some(a => 
      a.technician_id === t.id && 
      a.appointment_type === 'medical_test' && 
      ['scheduled', 'departed_for_appointment'].includes(a.status)
    );
    
    if (hasPendingMedical) return false; // Don't show if already has pending medical
    
    // For new visa: no completed medical yet
    const hasCompletedMedical = appointments.some(a =>
      a.technician_id === t.id &&
      a.appointment_type === 'medical_test' &&
      ['medical_fit', 'medical_unfit'].includes(a.status)
    );
    
    const isNewVisa = !hasCompletedMedical;
    const isRenewal = needsEIDRenewal(t);
    
    return isNewVisa || isRenewal;
  });

  // Eligible for EID: Active technicians with FIT medical AND (no EID yet OR needs renewal)
  const eligibleForEID = technicians.filter(t => {
    // Only show active technicians
    if (t.status !== 'active') return false;
    
    const hasFitMedical = appointments.some(a =>
      a.technician_id === t.id &&
      a.appointment_type === 'medical_test' &&
      a.status === 'medical_fit'
    );
    
    if (!hasFitMedical) return false;
    
    const hasPendingOrCompletedEID = appointments.some(a =>
      a.technician_id === t.id &&
      a.appointment_type === 'eid_biometrics' &&
      ['scheduled', 'departed_for_appointment', 'eid_processed'].includes(a.status)
    );
    
    // Don't show if already has pending/completed EID AND not needing renewal
    if (hasPendingOrCompletedEID && !needsEIDRenewal(t)) return false;
    
    return true;
  });

  const todayAppointments = appointments.filter(a => 
    a.appointment_date && format(parseISO(a.appointment_date), 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd') && 
    a.status === 'scheduled'
  );

  const missedAppointments = appointments.filter(a => a.status === 'missed_appointment');

  // Count technicians with expiring EIDs
  const techniciansExpiringEID = technicians.filter(t => needsEIDRenewal(t));
  const criticalEIDExpiries = technicians.filter(t => {
    const status = getEIDExpiryStatus(t);
    return ['expired', 'critical'].includes(status.status);
  });

  const handleScheduleAppointments = async () => {
    if (selectedTechnicians.length === 0) {
      alert("Please select at least one technician");
      return;
    }

    if (!appointmentData.appointment_location.trim()) {
      alert("Please enter appointment location");
      return;
    }

    try {
      for (const techId of selectedTechnicians) {
        const tech = technicians.find(t => t.id === techId);
        await createAppointmentMutation.mutateAsync({
          technician_id: techId,
          appointment_type: appointmentType,
          camp_id: tech?.camp_id,
          appointment_date: appointmentData.appointment_date,
          appointment_time: appointmentData.appointment_time,
          appointment_location: appointmentData.appointment_location,
          status: 'scheduled',
          medical_result: appointmentType === 'medical_test' ? 'pending' : null,
          scheduled_by_user_id: currentUser?.id,
          notes: appointmentData.notes
        });
      }

      alert(`✅ Successfully scheduled ${appointmentType === 'medical_test' ? 'Medical Test' : 'EID Biometrics'} appointments for ${selectedTechnicians.length} technician(s)`);
      
      setShowScheduleDialog(false);
      setSelectedTechnicians([]);
      setAppointmentData({
        appointment_date: format(new Date(), 'yyyy-MM-dd'),
        appointment_time: '09:00',
        appointment_location: '',
        notes: ''
      });
    } catch (error) {
      alert(`Failed to schedule appointments: ${error.message}`);
    }
  };

  const handleReschedule = async () => {
    if (!rescheduleData.appointment_date || !rescheduleData.appointment_time || !rescheduleData.appointment_location) {
      alert("Please fill in all required fields");
      return;
    }

    try {
      await updateAppointmentMutation.mutateAsync({
        id: selectedAppointment.id,
        data: {
          appointment_date: rescheduleData.appointment_date,
          appointment_time: rescheduleData.appointment_time,
          appointment_location: rescheduleData.appointment_location,
          notes: rescheduleData.notes,
          status: 'scheduled',
          actual_departure_time: null,
          actual_return_time: null,
          status_marked_by_user_id: null
        }
      });

      alert("✅ Appointment rescheduled successfully!");
      setShowRescheduleDialog(false);
      setSelectedAppointment(null);
      setRescheduleData({});
    } catch (error) {
      alert(`Failed to reschedule: ${error.message}`);
    }
  };

  const handleMarkDeparted = async (appointmentId) => {
    const currentTime = format(new Date(), 'HH:mm');
    
    try {
      await updateAppointmentMutation.mutateAsync({
        id: appointmentId,
        data: {
          status: 'departed_for_appointment',
          actual_departure_time: currentTime,
          status_marked_by_user_id: currentUser?.id
        }
      });
    } catch (error) {
      alert(`Failed to mark departure: ${error.message}`);
    }
  };

  const handleMarkMissed = async (appointmentId) => {
    if (!confirm('Mark this appointment as missed? HR will be notified to reschedule.')) return;

    try {
      await updateAppointmentMutation.mutateAsync({
        id: appointmentId,
        data: {
          status: 'missed_appointment',
          status_marked_by_user_id: currentUser?.id
        }
      });
    } catch (error) {
      alert(`Failed to mark as missed: ${error.message}`);
    }
  };

  const handleMarkReturned = async (appointmentId) => {
    const currentTime = format(new Date(), 'HH:mm');
    
    try {
      await updateAppointmentMutation.mutateAsync({
        id: appointmentId,
        data: {
          status: 'returned_from_appointment',
          actual_return_time: currentTime,
          status_marked_by_user_id: currentUser?.id
        }
      });

      const appointment = appointments.find(a => a.id === appointmentId);
      if (appointment?.appointment_type === 'medical_test') {
        setSelectedAppointment(appointment);
        setShowSlipUploadDialog(true);
      }
    } catch (error) {
      alert(`Failed to mark return: ${error.message}`);
    }
  };

  const handleUploadSlips = async () => {
    if (!medicalSlipFile && !tawjeehSlipFile) {
      alert("Please upload at least one slip");
      return;
    }

    setUploadingSlips(true);

    try {
      let medicalSlipUrl = selectedAppointment?.medical_slip_url;
      let tawjeehSlipUrl = selectedAppointment?.tawjeeh_slip_url;

      if (medicalSlipFile) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file: medicalSlipFile });
        medicalSlipUrl = file_url;
      }

      if (tawjeehSlipFile) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file: tawjeehSlipFile });
        tawjeehSlipUrl = file_url;
      }

      await updateAppointmentMutation.mutateAsync({
        id: selectedAppointment.id,
        data: {
          medical_slip_url: medicalSlipUrl,
          tawjeeh_slip_url: tawjeehSlipUrl
        }
      });

      alert("✅ Slips uploaded successfully!");
      setShowSlipUploadDialog(false);
      setSelectedAppointment(null);
      setMedicalSlipFile(null);
      setTawjeehSlipFile(null);
    } catch (error) {
      alert(`Failed to upload slips: ${error.message}`);
    }

    setUploadingSlips(false);
  };

  const handleUpdateMedicalResult = async (appointmentId, result) => {
    if (!confirm(`Mark medical result as ${result}?`)) return;

    try {
      const appointment = appointments.find(a => a.id === appointmentId);
      const tech = technicians.find(t => t.id === appointment?.technician_id);

      await updateAppointmentMutation.mutateAsync({
        id: appointmentId,
        data: {
          medical_result: result,
          status: result === 'fit' ? 'medical_fit' : 'medical_unfit',
          result_updated_by_user_id: currentUser?.id
        }
      });

      if (result === 'fit') {
        alert("✅ Medical result updated to FIT. Technician is now eligible for EID appointment.");
      } else if (result === 'unfit') {
        // Auto-create disciplinary action for medical unfitness
        const confirmTermination = confirm(
          `${tech?.full_name} marked as MEDICALLY UNFIT.\n\nWould you like to automatically create a Termination disciplinary record with reason "Medically Unfit"?`
        );

        if (confirmTermination) {
          await createDisciplinaryMutation.mutateAsync({
            technician_id: appointment.technician_id,
            date: format(new Date(), 'yyyy-MM-dd'),
            action_type: 'termination',
            severity: 'critical',
            violation: 'Medically Unfit - Failed Medical Examination',
            action_taken: `Termination due to medical unfitness. Medical test conducted on ${appointment.appointment_date} at ${appointment.appointment_location}.`,
            reported_by: currentUser?.full_name || 'System',
            follow_up_required: true,
            notes: `Auto-generated from medical appointment ${appointmentId}. Technician declared medically unfit.`
          });

          const viewDisciplinary = confirm("✅ Disciplinary termination record created.\n\nWould you like to open the Disciplinary Actions page to view the entry?");
          
          if (viewDisciplinary) {
            window.location.href = createPageUrl('Disciplinary');
          }
        }
      }
    } catch (error) {
      alert(`Failed to update result: ${error.message}`);
    }
  };

  const handleMarkEIDProcessed = async (appointmentId) => {
    if (!confirm('Mark EID biometrics as processed?')) return;

    try {
      await updateAppointmentMutation.mutateAsync({
        id: appointmentId,
        data: {
          status: 'eid_processed',
          result_updated_by_user_id: currentUser?.id
        }
      });

      alert("✅ EID processed successfully!");
    } catch (error) {
      alert(`Failed to mark as processed: ${error.message}`);
    }
  };

  const getStatusBadge = (status) => {
    const configs = {
      'scheduled': { color: 'bg-blue-100 text-blue-700', text: 'Scheduled' },
      'departed_for_appointment': { color: 'bg-purple-100 text-purple-700', text: 'Departed' },
      'returned_from_appointment': { color: 'bg-green-100 text-green-700', text: 'Returned' },
      'missed_appointment': { color: 'bg-red-100 text-red-700', text: 'Missed' },
      'medical_fit': { color: 'bg-green-600 text-white', text: 'Medical FIT' },
      'medical_unfit': { color: 'bg-red-600 text-white', text: 'Medical UNFIT' },
      'eid_processed': { color: 'bg-green-600 text-white', text: 'EID Processed' }
    };

    const config = configs[status] || configs['scheduled'];

    return (
      <Badge className={config.color}>
        {config.text}
      </Badge>
    );
  };

  // Apply search filter
  let filteredAppointments = appointments;

  if (searchQuery.trim()) {
    const searchLower = searchQuery.toLowerCase();
    filteredAppointments = filteredAppointments.filter(appointment => {
      const tech = technicians.find(t => t.id === appointment.technician_id);
      const camp = camps.find(c => c.id === appointment.camp_id);
      
      return tech?.full_name?.toLowerCase().includes(searchLower) ||
             tech?.employee_id?.toLowerCase().includes(searchLower) ||
             camp?.name?.toLowerCase().includes(searchLower) ||
             appointment.appointment_location?.toLowerCase().includes(searchLower);
    });
  }

  // Apply column filters
  filteredAppointments = filteredAppointments.filter(appointment => {
    const tech = technicians.find(t => t.id === appointment.technician_id);
    const camp = camps.find(c => c.id === appointment.camp_id);
    const expiryStatus = tech ? getEIDExpiryStatus(tech) : null;
    
    const dateStr = appointment.appointment_date || '-';
    const timeStr = appointment.appointment_time || '-';
    const techName = tech?.full_name || 'Unknown';
    const employeeId = tech?.employee_id || '-';
    const campName = camp?.name || '-';
    const typeStr = appointment.appointment_type === 'medical_test' ? 'Medical Test' : 'EID Biometrics';
    const locationStr = appointment.appointment_location || '-';
    const statusStr = getStatusBadge(appointment.status).props.children || '-';
    const departureStr = appointment.actual_departure_time || '-';
    const returnStr = appointment.actual_return_time || '-';
    const resultStr = appointment.medical_result ? appointment.medical_result.toUpperCase() : '-';
    const eidExpiryStr = tech?.eid_expiry_date ? format(parseISO(tech.eid_expiry_date), 'dd/MM/yyyy') : '-';

    if (filterDate.length > 0 && !filterDate.includes(dateStr)) return false;
    if (filterTime.length > 0 && !filterTime.includes(timeStr)) return false;
    if (filterTechName.length > 0 && !filterTechName.includes(techName)) return false;
    if (filterEmployeeId.length > 0 && !filterEmployeeId.includes(employeeId)) return false;
    if (filterCamp.length > 0 && !filterCamp.includes(campName)) return false;
    if (filterType.length > 0 && !filterType.includes(typeStr)) return false;
    if (filterLocation.length > 0 && !filterLocation.includes(locationStr)) return false;
    if (filterStatus.length > 0 && !filterStatus.includes(statusStr)) return false;
    if (filterDeparture.length > 0 && !filterDeparture.includes(departureStr)) return false;
    if (filterReturn.length > 0 && !filterReturn.includes(returnStr)) return false;
    if (filterResult.length > 0 && !filterResult.includes(resultStr)) return false;
    if (filterEIDExpiry.length > 0 && !filterEIDExpiry.includes(eidExpiryStr)) return false;

    return true;
  });

  // Get unique values for filters
  const uniqueDates = [...new Set(appointments.map(a => a.appointment_date || '-'))].sort().reverse();
  const uniqueTimes = [...new Set(appointments.map(a => a.appointment_time || '-'))].sort();
  const uniqueTechNames = [...new Set(appointments.map(a => {
    const tech = technicians.find(t => t.id === a.technician_id);
    return tech?.full_name || 'Unknown';
  }))].sort();
  const uniqueEmployeeIds = [...new Set(appointments.map(a => {
    const tech = technicians.find(t => t.id === a.technician_id);
    return tech?.employee_id || '-';
  }))].sort();
  const uniqueCamps = [...new Set(appointments.map(a => {
    const camp = camps.find(c => c.id === a.camp_id);
    return camp?.name || '-';
  }))].sort();
  const uniqueTypes = ['Medical Test', 'EID Biometrics'];
  const uniqueLocations = [...new Set(appointments.map(a => a.appointment_location || '-'))].sort();
  const uniqueStatuses = ['Scheduled', 'Departed', 'Returned', 'Missed', 'Medical FIT', 'Medical UNFIT', 'EID Processed'];
  const uniqueDepartures = [...new Set(appointments.map(a => a.actual_departure_time || '-'))].sort();
  const uniqueReturns = [...new Set(appointments.map(a => a.actual_return_time || '-'))].sort();
  const uniqueResults = ['PENDING', 'FIT', 'UNFIT', '-'];
  const uniqueEIDExpiry = [...new Set(appointments.map(a => {
    const tech = technicians.find(t => t.id === a.technician_id);
    return tech?.eid_expiry_date ? format(parseISO(tech.eid_expiry_date), 'dd/MM/yyyy') : '-';
  }))].sort();

  // Sort appointments
  const sortedAppointments = [...filteredAppointments].sort((a, b) => {
    let aVal, bVal;

    switch (sortField) {
      case 'appointment_date':
        aVal = a.appointment_date ? new Date(a.appointment_date).getTime() : 0;
        bVal = b.appointment_date ? new Date(b.appointment_date).getTime() : 0;
        break;
      case 'tech_name':
        const techA = technicians.find(t => t.id === a.technician_id);
        const techB = technicians.find(t => t.id === b.technician_id);
        aVal = techA?.full_name || '';
        bVal = techB?.full_name || '';
        break;
      case 'camp':
        const campA = camps.find(c => c.id === a.camp_id);
        const campB = camps.find(c => c.id === b.camp_id);
        aVal = campA?.name || '';
        bVal = campB?.name || '';
        break;
      case 'eid_expiry':
        const techAExp = technicians.find(t => t.id === a.technician_id);
        const techBExp = technicians.find(t => t.id === b.technician_id);
        aVal = techAExp?.eid_expiry_date ? new Date(techAExp.eid_expiry_date).getTime() : 0;
        bVal = techBExp?.eid_expiry_date ? new Date(techBExp.eid_expiry_date).getTime() : 0;
        break;
      default:
        aVal = a[sortField] || '';
        bVal = b[sortField] || '';
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

  const clearAllFilters = () => {
    setFilterDate([]);
    setFilterTime([]);
    setFilterTechName([]);
    setFilterEmployeeId([]);
    setFilterCamp([]);
    setFilterType([]);
    setFilterLocation([]);
    setFilterStatus([]);
    setFilterDeparture([]);
    setFilterReturn([]);
    setFilterResult([]);
    setFilterEIDExpiry([]);
    setSearchQuery("");
    setRenewalFilter("all");
  };

  const hasActiveFilters = filterDate.length > 0 || filterTime.length > 0 ||
    filterTechName.length > 0 || filterEmployeeId.length > 0 || filterCamp.length > 0 ||
    filterType.length > 0 || filterLocation.length > 0 || filterStatus.length > 0 ||
    filterDeparture.length > 0 || filterReturn.length > 0 || filterResult.length > 0 ||
    filterEIDExpiry.length > 0 || searchQuery.trim() !== "" || renewalFilter !== "all";

  const ColumnFilter = ({ values, selected, setSelected, searchValue, setSearchValue }) => {
    const filteredValues = values.filter(v =>
      String(v).toLowerCase().includes(searchValue.toLowerCase())
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
    const headers = ['Date', 'Time', 'Technician', 'Employee ID', 'Camp', 'Type', 'Location', 'Status', 'Departure Time', 'Return Time', 'Medical Result', 'EID Expiry Date', 'Notes'];
    
    const rows = sortedAppointments.map(appointment => {
      const tech = technicians.find(t => t.id === appointment.technician_id);
      const camp = camps.find(c => c.id === appointment.camp_id);
      
      return [
        appointment.appointment_date || '-',
        appointment.appointment_time || '-',
        tech?.full_name || 'Unknown',
        tech?.employee_id || '-',
        camp?.name || '-',
        appointment.appointment_type === 'medical_test' ? 'Medical Test' : 'EID Biometrics',
        appointment.appointment_location || '-',
        getStatusBadge(appointment.status).props.children,
        appointment.actual_departure_time || '-',
        appointment.actual_return_time || '-',
        appointment.medical_result ? appointment.medical_result.toUpperCase() : '-',
        tech?.eid_expiry_date ? format(parseISO(tech.eid_expiry_date), 'dd/MM/yyyy') : '-',
        appointment.notes || '-'
      ];
    });

    const csv = [headers, ...rows].map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `appointments_${format(new Date(), 'yyyy-MM-dd')}.csv`;
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
          .no-print {
            display: none !important;
          }
          @page {
            size: landscape;
            margin: 1cm;
          }
        }
      `}</style>

      <div className="max-w-[1800px] mx-auto space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">EID & Visa Management</h1>
              <p className="text-gray-600">Manage medical tests and EID biometric appointments</p>
            </div>
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
            {canDoHRActions && (
              <Button onClick={() => setShowScheduleDialog(true)} className="bg-blue-600">
                <Plus className="w-4 h-4 mr-2" />
                Schedule Appointments
              </Button>
            )}
          </div>
        </div>

        {criticalEIDExpiries.length > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>⚠️ {criticalEIDExpiries.length} technician(s) with CRITICAL EID expiry!</strong>
              <br />
              These technicians have EIDs expiring within 30 days or already expired. Please schedule renewal appointments immediately.
            </AlertDescription>
          </Alert>
        )}

        {todayAppointments.length > 0 && (
          <Alert className="border-orange-500 bg-orange-50">
            <Calendar className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-900">
              <strong>{todayAppointments.length} appointment(s) scheduled for today!</strong>
              <br />
              Please ensure all technicians depart on time for their appointments.
            </AlertDescription>
          </Alert>
        )}

        {missedAppointments.length > 0 && canDoHRActions && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>{missedAppointments.length} missed appointment(s) require rescheduling</strong>
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <Card className="border-none shadow-md">
            <CardContent className="p-6">
              <p className="text-sm text-gray-600 mb-1">Total Appointments</p>
              <p className="text-3xl font-bold text-gray-900">{appointments.length}</p>
            </CardContent>
          </Card>
          <Card className="border-none shadow-md">
            <CardContent className="p-6">
              <p className="text-sm text-gray-600 mb-1">Scheduled</p>
              <p className="text-3xl font-bold text-blue-600">
                {appointments.filter(a => a.status === 'scheduled').length}
              </p>
            </CardContent>
          </Card>
          <Card className="border-none shadow-md">
            <CardContent className="p-6">
              <p className="text-sm text-gray-600 mb-1">Departed</p>
              <p className="text-3xl font-bold text-purple-600">
                {appointments.filter(a => a.status === 'departed_for_appointment').length}
              </p>
            </CardContent>
          </Card>
          <Card className="border-none shadow-md">
            <CardContent className="p-6">
              <p className="text-sm text-gray-600 mb-1">Missed</p>
              <p className="text-3xl font-bold text-red-600">{missedAppointments.length}</p>
            </CardContent>
          </Card>
          <Card className="border-none shadow-md">
            <CardContent className="p-6">
              <p className="text-sm text-gray-600 mb-1">Completed</p>
              <p className="text-3xl font-bold text-green-600">
                {appointments.filter(a => ['medical_fit', 'eid_processed'].includes(a.status)).length}
              </p>
            </CardContent>
          </Card>
          <Card className="border-none shadow-md bg-gradient-to-br from-orange-50 to-red-50">
            <CardContent className="p-6">
              <p className="text-sm text-orange-700 mb-1 font-medium">EID Expiring Soon</p>
              <p className="text-3xl font-bold text-red-600">{techniciansExpiringEID.length}</p>
              <p className="text-xs text-red-600 mt-1">{criticalEIDExpiries.length} critical</p>
            </CardContent>
          </Card>
        </div>

        <Card className="border-none shadow-md">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search by technician name, ID, camp, or location..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-10"
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
              <Select value={renewalFilter} onValueChange={setRenewalFilter}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Appointments</SelectItem>
                  <SelectItem value="new">New Visa Only</SelectItem>
                  <SelectItem value="renewal">EID Renewals Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg overflow-hidden" id="printable-table">
          {hasActiveFilters && (
            <div className="bg-blue-50 border-b border-blue-200 px-6 py-3 no-print">
              <div className="flex items-center justify-between">
                <p className="text-sm text-blue-700 font-medium">
                  <Filter className="w-4 h-4 inline mr-2" />
                  Filters active
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
            <CardTitle>All Appointments ({sortedAppointments.length})</CardTitle>
          </CardHeader>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse bg-white">
              <thead>
                <tr className="border-b-2 border-gray-300">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200 no-print min-w-[200px]">
                    Actions
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                    <div className="flex items-center justify-between gap-2">
                      <span>Date</span>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => handleSort('appointment_date')}>
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
                        <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => handleSort('appointment_time')}>
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
                      <span>Technician</span>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => handleSort('tech_name')}>
                          <ArrowUpDown className="w-3 h-3" />
                        </Button>
                        <ColumnFilter
                          values={uniqueTechNames}
                          selected={filterTechName}
                          setSelected={setFilterTechName}
                          searchValue={searchTechName}
                          setSearchValue={setSearchTechName}
                        />
                      </div>
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
                      <span>EID Expiry</span>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => handleSort('eid_expiry')}>
                          <ArrowUpDown className="w-3 h-3" />
                        </Button>
                        <ColumnFilter
                          values={uniqueEIDExpiry}
                          selected={filterEIDExpiry}
                          setSelected={setFilterEIDExpiry}
                          searchValue={searchEIDExpiry}
                          setSearchValue={setSearchEIDExpiry}
                        />
                      </div>
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                    <div className="flex items-center justify-between gap-2">
                      <span>Camp</span>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => handleSort('camp')}>
                          <ArrowUpDown className="w-3 h-3" />
                        </Button>
                        <ColumnFilter
                          values={uniqueCamps}
                          selected={filterCamp}
                          setSelected={setFilterCamp}
                          searchValue={searchCamp}
                          setSearchValue={setSearchCamp}
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
                      <span>Location</span>
                      <ColumnFilter
                        values={uniqueLocations}
                        selected={filterLocation}
                        setSelected={setFilterLocation}
                        searchValue={searchLocation}
                        setSearchValue={setSearchLocation}
                      />
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
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                    <div className="flex items-center justify-between gap-2">
                      <span>Departure</span>
                      <ColumnFilter
                        values={uniqueDepartures}
                        selected={filterDeparture}
                        setSelected={setFilterDeparture}
                        searchValue={searchDeparture}
                        setSearchValue={setSearchDeparture}
                      />
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                    <div className="flex items-center justify-between gap-2">
                      <span>Return</span>
                      <ColumnFilter
                        values={uniqueReturns}
                        selected={filterReturn}
                        setSelected={setFilterReturn}
                        searchValue={searchReturn}
                        setSearchValue={setSearchReturn}
                      />
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                    <div className="flex items-center justify-between gap-2">
                      <span>Medical Result</span>
                      <ColumnFilter
                        values={uniqueResults}
                        selected={filterResult}
                        setSelected={setFilterResult}
                        searchValue={searchResult}
                        setSearchValue={setSearchResult}
                      />
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedAppointments.length === 0 ? (
                  <tr>
                    <td colSpan="13" className="px-4 py-12 text-center text-gray-500">
                      <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <p>{hasActiveFilters ? 'No appointments match your filters' : 'No appointments scheduled yet'}</p>
                    </td>
                  </tr>
                ) : (
                  sortedAppointments.map((appointment, index) => {
                    const tech = technicians.find(t => t.id === appointment.technician_id);
                    const camp = camps.find(c => c.id === appointment.camp_id);
                    const expiryStatus = tech ? getEIDExpiryStatus(tech) : null;

                    return (
                      <tr
                        key={appointment.id}
                        className={`border-b border-gray-200 hover:bg-blue-50 transition-colors ${
                          index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                        }`}
                      >
                        <td className="px-4 py-3 text-sm border-r border-gray-200 whitespace-nowrap no-print">
                          <div className="flex gap-1">
                            {appointment.status === 'scheduled' && (
                              <>
                                <Button size="sm" onClick={() => handleMarkDeparted(appointment.id)} className="bg-purple-600 hover:bg-purple-700">
                                  Departed
                                </Button>
                                <Button size="sm" variant="destructive" onClick={() => handleMarkMissed(appointment.id)}>
                                  Missed
                                </Button>
                              </>
                            )}
                            {appointment.status === 'departed_for_appointment' && (
                              <Button size="sm" onClick={() => handleMarkReturned(appointment.id)} className="bg-green-600 hover:bg-green-700">
                                Returned
                              </Button>
                            )}
                            {appointment.status === 'returned_from_appointment' && appointment.appointment_type === 'medical_test' && (
                              <>
                                <Button size="sm" variant="outline" onClick={() => {
                                  setSelectedAppointment(appointment);
                                  setShowSlipUploadDialog(true);
                                }}>
                                  <Upload className="w-3 h-3 mr-1" />
                                  Slips
                                </Button>
                                {canDoHRActions && (
                                  <>
                                    <Button size="sm" onClick={() => handleUpdateMedicalResult(appointment.id, 'fit')} className="bg-green-600">
                                      FIT
                                    </Button>
                                    <Button size="sm" onClick={() => handleUpdateMedicalResult(appointment.id, 'unfit')} variant="destructive">
                                      UNFIT
                                    </Button>
                                  </>
                                )}
                              </>
                            )}
                            {appointment.status === 'returned_from_appointment' && appointment.appointment_type === 'eid_biometrics' && canDoHRActions && (
                              <Button size="sm" onClick={() => handleMarkEIDProcessed(appointment.id)} className="bg-green-600">
                                Mark Processed
                              </Button>
                            )}
                            {appointment.status === 'missed_appointment' && canDoHRActions && (
                              <Button size="sm" variant="outline" onClick={() => {
                                setSelectedAppointment(appointment);
                                setRescheduleData({
                                  appointment_date: appointment.appointment_date,
                                  appointment_time: appointment.appointment_time,
                                  appointment_location: appointment.appointment_location,
                                  notes: appointment.notes || ''
                                });
                                setShowRescheduleDialog(true);
                              }}>
                                Reschedule
                              </Button>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 border-r border-gray-200 whitespace-nowrap font-medium">
                          {appointment.appointment_date ? format(parseISO(appointment.appointment_date), 'dd/MM/yyyy') : '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 border-r border-gray-200 whitespace-nowrap">
                          {appointment.appointment_time || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 border-r border-gray-200 whitespace-nowrap">
                          {tech?.full_name || 'Unknown'}
                        </td>
                        <td className="px-4 py-3 text-sm text-blue-600 font-medium border-r border-gray-200 whitespace-nowrap">
                          {tech?.employee_id || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm border-r border-gray-200 whitespace-nowrap">
                          {expiryStatus ? (
                            <div className="space-y-1">
                              <div className="text-xs text-gray-600">
                                {tech?.eid_expiry_date ? format(parseISO(tech.eid_expiry_date), 'dd/MM/yyyy') : '-'}
                              </div>
                              <Badge className={expiryStatus.color}>
                                {expiryStatus.label}
                              </Badge>
                            </div>
                          ) : '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 border-r border-gray-200 whitespace-nowrap">
                          {camp?.name || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm border-r border-gray-200 whitespace-nowrap">
                          <Badge variant="outline">
                            {appointment.appointment_type === 'medical_test' ? '🏥 Medical Test' : '🆔 EID Biometrics'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 border-r border-gray-200">
                          {appointment.appointment_location || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm border-r border-gray-200 whitespace-nowrap">
                          {getStatusBadge(appointment.status)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 border-r border-gray-200 whitespace-nowrap">
                          {appointment.actual_departure_time || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 border-r border-gray-200 whitespace-nowrap">
                          {appointment.actual_return_time || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm border-r border-gray-200 whitespace-nowrap">
                          {appointment.medical_result ? (
                            <Badge className={
                              appointment.medical_result === 'fit' ? 'bg-green-600 text-white' :
                              appointment.medical_result === 'unfit' ? 'bg-red-600 text-white' :
                              'bg-gray-100 text-gray-700'
                            }>
                              {appointment.medical_result.toUpperCase()}
                            </Badge>
                          ) : '-'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              Showing <span className="font-semibold">{sortedAppointments.length}</span> of <span className="font-semibold">{appointments.length}</span> appointments
            </p>
          </div>
        </Card>
      </div>

      <Dialog open={showScheduleDialog} onOpenChange={setShowScheduleDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Schedule Appointments</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Appointment Type*</Label>
              <Select value={appointmentType} onValueChange={(value) => {
                setAppointmentType(value);
                setSelectedTechnicians([]);
              }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="medical_test">🏥 Medical Test</SelectItem>
                  <SelectItem value="eid_biometrics">🆔 EID Biometrics</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date*</Label>
                <Input
                  type="date"
                  value={appointmentData.appointment_date}
                  onChange={(e) => setAppointmentData({...appointmentData, appointment_date: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>Time*</Label>
                <Input
                  type="time"
                  value={appointmentData.appointment_time}
                  onChange={(e) => setAppointmentData({...appointmentData, appointment_time: e.target.value})}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Location* (External Medical Facility)</Label>
                <Button type="button" variant="outline" size="sm" onClick={() => setShowAddHospitalDialog(true)}>
                  <Plus className="w-3 h-3 mr-1" />
                  Add Hospital
                </Button>
              </div>
              <div className="relative">
                <Input
                  placeholder="Search or type location..."
                  value={appointmentData.appointment_location}
                  onChange={(e) => {
                    setAppointmentData({...appointmentData, appointment_location: e.target.value});
                  }}
                />
                {appointmentData.appointment_location && hospitals.filter(h => 
                  h.name.toLowerCase().includes(appointmentData.appointment_location.toLowerCase()) ||
                  h.location?.toLowerCase().includes(appointmentData.appointment_location.toLowerCase())
                ).length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {hospitals
                      .filter(h => 
                        h.name.toLowerCase().includes(appointmentData.appointment_location.toLowerCase()) ||
                        h.location?.toLowerCase().includes(appointmentData.appointment_location.toLowerCase())
                      )
                      .map(hospital => (
                        <div
                          key={hospital.id}
                          className="px-4 py-2 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                          onClick={() => {
                            setAppointmentData({
                              ...appointmentData, 
                              appointment_location: `${hospital.name} - ${hospital.location}`
                            });
                          }}
                        >
                          <p className="font-medium text-gray-900">{hospital.name}</p>
                          <p className="text-xs text-gray-600">{hospital.location}</p>
                          {hospital.address && <p className="text-xs text-gray-500">{hospital.address}</p>}
                        </div>
                      ))}
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-500">
                Start typing to search from registered hospitals, or enter a custom location
              </p>
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                placeholder="Additional instructions..."
                value={appointmentData.notes}
                onChange={(e) => setAppointmentData({...appointmentData, notes: e.target.value})}
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Select Technicians* ({selectedTechnicians.length} selected)</Label>
              {appointmentType === 'medical_test' && techniciansExpiringEID.length > 0 && (
                <Alert className="bg-orange-50 border-orange-200">
                  <AlertCircle className="h-4 w-4 text-orange-600" />
                  <AlertDescription className="text-orange-900">
                    <strong>{techniciansExpiringEID.length} technician(s) with expiring EID</strong> are shown below. 
                    They need medical tests for EID renewal.
                  </AlertDescription>
                </Alert>
              )}
              <div className="border rounded-lg p-4 max-h-96 overflow-y-auto">
                {(appointmentType === 'medical_test' ? eligibleForMedical : eligibleForEID).map(tech => {
                  const expiryStatus = getEIDExpiryStatus(tech);
                  const isRenewal = needsEIDRenewal(tech);
                  
                  return (
                    <div key={tech.id} className={`flex items-center space-x-2 py-2 hover:bg-gray-50 rounded px-2 ${
                      isRenewal ? 'bg-orange-50 border-l-4 border-orange-500' : ''
                    }`}>
                      <Checkbox
                        checked={selectedTechnicians.includes(tech.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedTechnicians([...selectedTechnicians, tech.id]);
                          } else {
                            setSelectedTechnicians(selectedTechnicians.filter(id => id !== tech.id));
                          }
                        }}
                      />
                      <label className="flex-1 cursor-pointer">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{tech.full_name}</p>
                            <p className="text-xs text-gray-500">
                              {tech.employee_id} • {camps.find(c => c.id === tech.camp_id)?.name}
                            </p>
                          </div>
                          {isRenewal && (
                            <div className="flex gap-2 items-center">
                              <Badge variant="outline" className="text-xs">
                                🔄 RENEWAL
                              </Badge>
                              <Badge className={expiryStatus.color}>
                                {expiryStatus.label}
                              </Badge>
                            </div>
                          )}
                        </div>
                      </label>
                    </div>
                  );
                })}
                {(appointmentType === 'medical_test' ? eligibleForMedical : eligibleForEID).length === 0 && (
                  <p className="text-center text-gray-500 py-4">
                    No eligible technicians for {appointmentType === 'medical_test' ? 'medical tests' : 'EID biometrics'}
                  </p>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowScheduleDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleScheduleAppointments} className="bg-blue-600">
              Schedule {selectedTechnicians.length} Appointment(s)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showRescheduleDialog} onOpenChange={setShowRescheduleDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Reschedule Appointment</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {selectedAppointment && (
              <Alert className="bg-blue-50 border-blue-200">
                <AlertCircle className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-900">
                  Rescheduling {selectedAppointment.appointment_type === 'medical_test' ? 'Medical Test' : 'EID Biometrics'} for <strong>{technicians.find(t => t.id === selectedAppointment.technician_id)?.full_name}</strong>
                </AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>New Date*</Label>
                <Input
                  type="date"
                  value={rescheduleData.appointment_date || ''}
                  onChange={(e) => setRescheduleData({...rescheduleData, appointment_date: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>New Time*</Label>
                <Input
                  type="time"
                  value={rescheduleData.appointment_time || ''}
                  onChange={(e) => setRescheduleData({...rescheduleData, appointment_time: e.target.value})}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Location* (External Medical Facility)</Label>
                <Button type="button" variant="outline" size="sm" onClick={() => setShowAddHospitalDialog(true)}>
                  <Plus className="w-3 h-3 mr-1" />
                  Add Hospital
                </Button>
              </div>
              <div className="relative">
                <Input
                  placeholder="Search or type location..."
                  value={rescheduleData.appointment_location || ''}
                  onChange={(e) => {
                    setRescheduleData({...rescheduleData, appointment_location: e.target.value});
                  }}
                />
                {rescheduleData.appointment_location && hospitals.filter(h => 
                  h.name.toLowerCase().includes(rescheduleData.appointment_location.toLowerCase()) ||
                  h.location?.toLowerCase().includes(rescheduleData.appointment_location.toLowerCase())
                ).length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {hospitals
                      .filter(h => 
                        h.name.toLowerCase().includes(rescheduleData.appointment_location.toLowerCase()) ||
                        h.location?.toLowerCase().includes(rescheduleData.appointment_location.toLowerCase())
                      )
                      .map(hospital => (
                        <div
                          key={hospital.id}
                          className="px-4 py-2 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                          onClick={() => {
                            setRescheduleData({
                              ...rescheduleData, 
                              appointment_location: `${hospital.name} - ${hospital.location}`
                            });
                          }}
                        >
                          <p className="font-medium text-gray-900">{hospital.name}</p>
                          <p className="text-xs text-gray-600">{hospital.location}</p>
                          {hospital.address && <p className="text-xs text-gray-500">{hospital.address}</p>}
                        </div>
                      ))}
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-500">
                Start typing to search from registered hospitals, or enter a custom location
              </p>
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                placeholder="Additional instructions..."
                value={rescheduleData.notes || ''}
                onChange={(e) => setRescheduleData({...rescheduleData, notes: e.target.value})}
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowRescheduleDialog(false);
              setSelectedAppointment(null);
              setRescheduleData({});
            }}>
              Cancel
            </Button>
            <Button onClick={handleReschedule} className="bg-blue-600">
              Reschedule Appointment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showAddHospitalDialog} onOpenChange={setShowAddHospitalDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add New Hospital</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Hospital Name*</Label>
                <Input
                  placeholder="e.g., Dubai Hospital"
                  value={newHospitalData.name || ''}
                  onChange={(e) => setNewHospitalData({...newHospitalData, name: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>Location/City*</Label>
                <Input
                  placeholder="e.g., Dubai"
                  value={newHospitalData.location || ''}
                  onChange={(e) => setNewHospitalData({...newHospitalData, location: e.target.value})}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Address</Label>
                <Input
                  placeholder="Complete address"
                  value={newHospitalData.address || ''}
                  onChange={(e) => setNewHospitalData({...newHospitalData, address: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>Phone*</Label>
                <Input
                  placeholder="+971 4 123 4567"
                  value={newHospitalData.phone || ''}
                  onChange={(e) => setNewHospitalData({...newHospitalData, phone: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>Emergency Number</Label>
                <Input
                  placeholder="+971 4 999 9999"
                  value={newHospitalData.emergency_number || ''}
                  onChange={(e) => setNewHospitalData({...newHospitalData, emergency_number: e.target.value})}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowAddHospitalDialog(false);
              setNewHospitalData({});
            }}>
              Cancel
            </Button>
            <Button 
              onClick={() => {
                if (!newHospitalData.name || !newHospitalData.location || !newHospitalData.phone) {
                  alert("Please fill in required fields: Name, Location, Phone");
                  return;
                }
                createHospitalMutation.mutate(newHospitalData);
              }}
              className="bg-purple-600 hover:bg-purple-700"
            >
              Add Hospital
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showSlipUploadDialog} onOpenChange={setShowSlipUploadDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Medical & Tawjeeh Slips</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Medical Slip</Label>
              <Input
                type="file"
                accept="image/*,.pdf"
                onChange={(e) => setMedicalSlipFile(e.target.files[0])}
              />
              {selectedAppointment?.medical_slip_url && (
                <a href={selectedAppointment.medical_slip_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">
                  View uploaded slip
                </a>
              )}
            </div>

            <div className="space-y-2">
              <Label>Tawjeeh Slip</Label>
              <Input
                type="file"
                accept="image/*,.pdf"
                onChange={(e) => setTawjeehSlipFile(e.target.files[0])}
              />
              {selectedAppointment?.tawjeeh_slip_url && (
                <a href={selectedAppointment.tawjeeh_slip_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">
                  View uploaded slip
                </a>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowSlipUploadDialog(false);
              setMedicalSlipFile(null);
              setTawjeehSlipFile(null);
            }}>
              Cancel
            </Button>
            <Button onClick={handleUploadSlips} disabled={uploadingSlips} className="bg-blue-600">
              {uploadingSlips ? 'Uploading...' : 'Upload Slips'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}