import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserPlus, Building2, CheckCircle, Upload, Download, AlertCircle, Search, CheckCircle2, Users, CalendarIcon, Edit, Clock, Save } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { formatDate as formatDateDisplay } from "@/components/utils/dateFormatter";
import PhoneInput from "@/components/ui/phone-input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

export default function OnboardingForm() {
  const [formData, setFormData] = useState({});
  const [sajjaCampId, setSajjaCampId] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [uploadMode, setUploadMode] = useState('none');
  const [bulkFile, setBulkFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [cleaningDuplicates, setCleaningDuplicates] = useState(false);
  const [cleanupProgress, setCleanupProgress] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [validationError, setValidationError] = useState(null);
  const [submissionError, setSubmissionError] = useState(null);
  const [creatingCamp, setCreatingCamp] = useState(false);
  const [campCreationAttempted, setCampCreationAttempted] = useState(false);
  const [showQuickEditDialog, setShowQuickEditDialog] = useState(false);
  const [editingTech, setEditingTech] = useState(null);

  const queryClient = useQueryClient();

  const { data: camps = [], isLoading: campsLoading } = useQuery({
    queryKey: ['camps'],
    queryFn: () => base44.entities.Camp.list(),
    refetchOnWindowFocus: false,
  });

  const { data: technicians = [] } = useQuery({
    queryKey: ['technicians'],
    queryFn: () => base44.entities.Technician.list('-expected_arrival_date'),
    refetchOnMount: true,
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list(),
  });

  const createCampMutation = useMutation({
    mutationFn: (data) => base44.entities.Camp.create(data),
    onSuccess: (newCamp) => {
      queryClient.invalidateQueries({ queryKey: ['camps'] });
      setSajjaCampId(newCamp.id); // Set the ID from the newly created camp
      setCreatingCamp(false);
      setCampCreationAttempted(true); // Mark as attempted and successful
    },
    onError: (error) => {
      console.error("Error creating Sajja Camp:", error);
      setCreatingCamp(false);
      // setCampCreationAttempted(false); // STOP INFINITE LOOP: Do not reset this to false.
    }
  });

  const deleteCampMutation = useMutation({
    mutationFn: (id) => base44.entities.Camp.delete(id),
    onSuccess: () => { },
  });

  // Check for Sajja Camp and create if needed
  useEffect(() => {
    if (campsLoading) return; // Wait for camps to load

    // Find Sajja Camp by code (more reliable) or name
    const sajjaCamp = camps.find(camp => camp.code === 'SAJJA' || camp.name === 'Sajja Camp');

    if (sajjaCamp) {
      setSajjaCampId(sajjaCamp.id);
      // If Sajja Camp is found, mark that we've "attempted" and succeeded in finding it.
      // This prevents trying to create it again.
      if (!campCreationAttempted) {
        setCampCreationAttempted(true);
      }
    } else if (!creatingCamp && !campCreationAttempted && !createCampMutation.isLoading) {
      // Only create if we haven't found it AND haven't already attempted creation
      // and createCampMutation is not already in flight
      handleCreateSajjaCamp();
    }
  }, [camps, campsLoading, creatingCamp, campCreationAttempted, createCampMutation.isLoading]);

  const handleCreateSajjaCamp = async () => {
    if (creatingCamp || campCreationAttempted) return; // Prevent duplicate calls

    setCreatingCamp(true);
    setCampCreationAttempted(true); // Mark that we're attempting

    try {
      await createCampMutation.mutateAsync({
        name: 'Sajja Camp',
        code: 'SAJJA',
        location: 'Sajja Industrial Area',
        capacity: 500,
        current_occupancy: 0,
        status: 'active'
      });
    } catch (error) {
      console.error('Failed to create Sajja Camp:', error);
      // Do not reset campCreationAttempted to false, to prevent infinite loops
      setCreatingCamp(false); // Ensure creatingCamp state is reset
    }
  };

  // Find duplicate Sajja Camps (by name or code)
  const sajjaCamps = camps.filter(camp =>
    camp.code === 'SAJJA' || camp.name === 'Sajja Camp'
  );
  const hasDuplicates = sajjaCamps.length > 1;

  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  const handleCleanupDuplicates = async () => {
    if (sajjaCamps.length <= 1) return;

    setCleaningDuplicates(true);
    // There will be sajjaCamps.length - 1 duplicates to delete
    setCleanupProgress({ current: 0, total: sajjaCamps.length - 1 });

    // Keep the first one (oldest by creation date, or just the first found)
    // Sorting ensures we keep a consistent "original" camp.
    const sortedSajjaCamps = sajjaCamps.sort((a, b) =>
      new Date(a.created_date || 0).getTime() - new Date(b.created_date || 0).getTime()
    );
    const [keepCamp, ...duplicates] = sortedSajjaCamps;

    for (let i = 0; i < duplicates.length; i++) {
      try {
        await deleteCampMutation.mutateAsync(duplicates[i].id);
        setCleanupProgress({ current: i + 1, total: duplicates.length });
        console.log(`Deleted duplicate ${i + 1}/${duplicates.length}`);

        if (i < duplicates.length - 1) {
          await sleep(2000); // Wait between deletions to avoid hammering the API
        }
      } catch (error) {
        console.error(`Error deleting duplicate ${i + 1}:`, error);
        // Implement retry logic for rate limits
        if (error.message?.includes('rate limit') || error.message?.includes('429')) {
          console.log('Rate limit hit during cleanup, waiting 5 seconds...');
          await sleep(5000);
          try {
            await deleteCampMutation.mutateAsync(duplicates[i].id);
            setCleanupProgress({ current: i + 1, total: duplicates.length });
          } catch (retryError) {
            console.error(`Retry failed for duplicate ${i + 1} during cleanup:`, retryError);
          }
        }
      }
    }

    await sleep(1000); // Give a moment for changes to propagate before refetching
    queryClient.invalidateQueries({ queryKey: ['camps'] });

    // Ensure the ID points to the kept camp after cleanup
    setSajjaCampId(keepCamp.id);
    setCleaningDuplicates(false);
    setCleanupProgress(null);
  };

  const createTechnicianMutation = useMutation({
    mutationFn: (data) => base44.entities.Technician.create(data),
    onSuccess: async (newTechnician) => {
      queryClient.invalidateQueries({ queryKey: ['technicians'] });
      setFormData({});
      setShowSuccess(true);
      setValidationError(null);
      setSubmissionError(null);
      setTimeout(() => setShowSuccess(false), 5000);
      setUploadMode('none');

      // Send notification to onboarding team
      try {
        await base44.functions.invoke('notifyOnboardingTeam', {
          technicians: [newTechnician],
          isBulk: false
        });
      } catch (error) {
        console.error('Failed to send notification:', error);
      }
    },
    onError: (error) => {
      console.error("Create technician error:", error);
      setSubmissionError(error.message || "Failed to create technician. Please try again.");
    }
  });

  const bulkCreateMutation = useMutation({
    mutationFn: (data) => base44.entities.Technician.bulkCreate(data),
    onSuccess: async (result) => {
      queryClient.invalidateQueries({ queryKey: ['technicians'] });
      setUploadResult({ success: true, message: `Successfully registered ${result.length} technicians as pending arrival!` });
      setBulkFile(null);

      // Send notification to onboarding team
      try {
        await base44.functions.invoke('notifyOnboardingTeam', {
          technicians: result,
          isBulk: true
        });
      } catch (error) {
        console.error('Failed to send notification:', error);
      }
    },
    onError: (error) => {
      console.error("Bulk upload error:", error);
      const errorMessage = error.response?.data?.message || error.message || "An unexpected error occurred during bulk upload.";
      const errorDetails = error.response?.data?.details || error.message;
      setUploadResult({ success: false, message: errorMessage, details: errorDetails });
    },
  });

  const updateTechnicianMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Technician.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['technicians'] });
      setShowQuickEditDialog(false);
      setEditingTech(null);
      alert('✅ Technician updated successfully');
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setValidationError(null);
    setSubmissionError(null); // Reset submission error

    // Validate required fields
    if (!formData.employee_id || !formData.full_name || !formData.nationality || !formData.gender || !formData.expected_arrival_date || !formData.flight_number || !formData.airline || !formData.departure_airport || !formData.arrival_airport || !formData.arrival_terminal) {
      setValidationError({
        type: 'missing_required',
        message: 'Please fill in all required fields: Employee ID, Full Name, Nationality, Gender, Expected Arrival Date, Flight Number, Airline, Departure Airport, Arrival Airport, and Arrival Terminal.'
      });
      return;
    }

    if (!sajjaCampId) {
      setValidationError({
        type: 'missing_camp',
        message: 'Sajja Camp not found or not yet created. Please wait a moment and try again.'
      });
      return;
    }

    const existingTechnician = technicians.find(t => t.employee_id === formData.employee_id);
    if (existingTechnician) {
      setValidationError({
        type: 'duplicate',
        employee_id: formData.employee_id,
        existing: existingTechnician
      });
      return;
    }

    const dataToSubmit = {
      employee_id: formData.employee_id,
      full_name: formData.full_name,
      nationality: formData.nationality,
      gender: formData.gender,
      expected_arrival_date: formData.expected_arrival_date,
      religion: formData.religion || null,
      date_of_birth: formData.date_of_birth || null,
      phone: formData.phone || null,
      email: formData.email || null,
      state: formData.state || null,
      marital_status: formData.marital_status || null,
      no_of_adults: formData.no_of_adults || null,
      no_of_children: formData.no_of_children || null,
      no_of_infants: formData.no_of_infants || null,
      passport_no: formData.passport_no || null,
      passport_expiry_date: formData.passport_expiry_date || null,
      health_insurance_no: formData.health_insurance_no || null,
      health_insurance_expiry_date: formData.health_insurance_expiry_date || null,
      trade: formData.trade || null,
      department: formData.department || null,
      expected_arrival_time: formData.expected_arrival_time || null,
      ticket_ref: formData.ticket_ref || null,
      flight_number: formData.flight_number || null,
      airline: formData.airline || null,
      departure_airport: formData.departure_airport || null,
      arrival_airport: formData.arrival_airport || null,
      arrival_terminal: formData.arrival_terminal || null,
      tentative_project_id: formData.tentative_project_id || null,
      emergency_contact_no: formData.emergency_contact_no || null,
      emergency_contact_no_relationship: formData.emergency_contact_no_relationship || null,
      emergency_contact_no_2: formData.emergency_contact_no_2 || null,
      emergency_contact_no_2_relationship: formData.emergency_contact_no_2_relationship || null,
      legal_nominee_name: formData.legal_nominee_name || null,
      nominee_relationship: formData.nominee_relationship || null,
      pickup_status: formData.flight_number ? 'scheduled' : 'not_scheduled',
      camp_id: sajjaCampId,
      status: 'pending_arrival'
    };

    console.log("Submitting technician data:", dataToSubmit); // Log the data being submitted
    createTechnicianMutation.mutate(dataToSubmit);
  };

  const downloadTemplate = () => {
    const template = `employee_id,full_name,nationality,religion,gender,date_of_birth,phone,email,state,marital_status,no_of_adults,no_of_children,no_of_infants,passport_no,passport_expiry_date,health_insurance_no,health_insurance_expiry_date,trade,department,expected_arrival_date,expected_arrival_time,ticket_ref,flight_number,airline,departure_airport,arrival_airport,arrival_terminal,tentative_project_id,emergency_contact_no,emergency_contact_no_relationship,emergency_contact_no_2,emergency_contact_no_2_relationship,legal_nominee_name,nominee_relationship
EMP001,John Doe,Indian,Hindu,male,15/Jan/1990,+971501234567,john@example.com,Kerala,married,2,1,0,P123456,31/Dec/2030,HI789012,31/Dec/2025,Electrician,Maintenance,01/Feb/2025,14:30,TKT123456,EK201,Emirates,Mumbai International,Dubai International,Terminal 3,,+971509876543,wife,+91 9876543210,mother,Mary Doe,wife
EMP002,Jane Smith,Filipino,Christian,female,20/Mar/1992,+971507654321,jane@example.com,Manila,single,0,0,0,P234567,30/Jun/2029,HI890123,30/Jun/2025,Plumber,Maintenance,01/Feb/2025,16:00,TKT789012,FZ505,Fly Dubai,Manila International,Dubai International,Terminal 2,,+971501112233,brother,+63 9123456789,mother,Robert Smith,father`;

    const blob = new Blob(['\ufeff' + template], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'technicians_advance_registration_template.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setBulkFile(file);
      setUploadResult(null);
    }
  };

  const parseCSV = (text) => {
    if (text.charCodeAt(0) === 0xFEFF) {
      text = text.slice(1);
    }

    const lines = text.split('\n').filter(line => line.trim() && !line.trim().startsWith('#'));
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim());
    const data = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      if (values.length === headers.length) {
        const obj = {};
        headers.forEach((header, index) => {
          obj[header] = values[index];
        });
        data.push(obj);
      } else {
        console.warn(`Skipping malformed row ${i + 1}: Expected ${headers.length} columns, got ${values.length}.`);
      }
    }

    return data;
  };

  const handleBulkUpload = async () => {
    if (!bulkFile || !sajjaCampId) {
      setUploadResult({ success: false, message: "Please select a CSV file and ensure Sajja Camp is ready." });
      return;
    }

    setUploading(true);
    setUploadResult(null);

    try {
      const text = await bulkFile.text();
      const techniciansData = parseCSV(text);

      if (techniciansData.length === 0) {
        setUploadResult({ success: false, message: "No valid data found in CSV file. Check CSV format and content." });
        setUploading(false);
        return;
      }

      // Validate required fields in bulk data
      const requiredFields = ['employee_id', 'full_name', 'nationality', 'gender', 'expected_arrival_date', 'flight_number', 'airline', 'departure_airport', 'arrival_airport', 'arrival_terminal'];
      const missingFieldsErrors = [];
      techniciansData.forEach((tech, index) => {
        const missing = requiredFields.filter(field => !tech[field]);
        if (missing.length > 0) {
          // Adjust row index for 1-based, plus 1 for header row
          missingFieldsErrors.push(`Row ${index + 2}: Missing required fields: ${missing.join(', ')}`);
        }
      });

      if (missingFieldsErrors.length > 0) {
        setUploadResult({
          success: false,
          message: `Found ${missingFieldsErrors.length} row(s) with missing required fields.`,
          details: missingFieldsErrors.slice(0, 10).join('\n') + (missingFieldsErrors.length > 10 ? `\n... and ${missingFieldsErrors.length - 10} more` : '')
        });
        setUploading(false);
        return;
      }

      const existingEmployeeIds = new Set(technicians.map(t => t.employee_id));
      const duplicatesInUpload = [];
      const validRecords = [];

      techniciansData.forEach(tech => {
        if (existingEmployeeIds.has(tech.employee_id)) {
          duplicatesInUpload.push(tech.employee_id);
        } else {
          validRecords.push(tech);
        }
      });

      if (duplicatesInUpload.length > 0) {
        setUploadResult({
          success: false,
          message: `Found ${duplicatesInUpload.length} duplicate employee ID(s) that already exist in the system. These technicians will not be uploaded.`,
          details: `Please ensure all employee_ids in your CSV are unique and do not conflict with existing records. Duplicate IDs: ${duplicatesInUpload.join(', ')}`
        });
        setUploading(false);
        return;
      }

      const convertDate = (dateStr) => {
        if (!dateStr) return null;

        // Already in YYYY-MM-DD format
        if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
          return dateStr;
        }

        // Handle dd/mmm/yyyy format (e.g., 15/Jan/1990)
        if (dateStr.match(/^\d{2}\/[A-Za-z]{3}\/\d{4}$/)) {
          const [day, monthName, year] = dateStr.split('/');
          const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          const month = monthNames.findIndex(m => m.toLowerCase() === monthName.toLowerCase()) + 1;
          if (month > 0) {
            return `${year}-${String(month).padStart(2, '0')}-${day.padStart(2, '0')}`;
          }
        }

        // Handle dd/mm/yyyy format (legacy)
        if (dateStr.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
          const [day, month, year] = dateStr.split('/');
          return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        }

        return dateStr;
      };

      const techniciansWithCamp = validRecords.map(tech => ({
        employee_id: tech.employee_id,
        full_name: tech.full_name,
        nationality: tech.nationality,
        gender: tech.gender,
        expected_arrival_date: convertDate(tech.expected_arrival_date),
        religion: tech.religion || null,
        date_of_birth: convertDate(tech.date_of_birth) || null,
        phone: tech.phone || null,
        email: tech.email || null,
        state: tech.state || null,
        marital_status: tech.marital_status || null,
        no_of_adults: tech.no_of_adults ? parseInt(tech.no_of_adults) : null,
        no_of_children: tech.no_of_children ? parseInt(tech.no_of_children) : null,
        no_of_infants: tech.no_of_infants ? parseInt(tech.no_of_infants) : null,
        passport_no: tech.passport_no || null,
        passport_expiry_date: convertDate(tech.passport_expiry_date) || null,
        health_insurance_no: tech.health_insurance_no || null,
        health_insurance_expiry_date: convertDate(tech.health_insurance_expiry_date) || null,
        trade: tech.trade || null,
        department: tech.department || null,
        expected_arrival_time: tech.expected_arrival_time || null,
        ticket_ref: tech.ticket_ref || null,
        flight_number: tech.flight_number || null,
        airline: tech.airline || null,
        departure_airport: tech.departure_airport || null,
        arrival_airport: tech.arrival_airport || null,
        arrival_terminal: tech.arrival_terminal || null,
        tentative_project_id: tech.tentative_project_id || null,
        emergency_contact_no: tech.emergency_contact_no || null,
        emergency_contact_no_relationship: tech.emergency_contact_no_relationship || null,
        emergency_contact_no_2: tech.emergency_contact_no_2 || null,
        emergency_contact_no_2_relationship: tech.emergency_contact_no_2_relationship || null,
        legal_nominee_name: tech.legal_nominee_name || null,
        nominee_relationship: tech.nominee_relationship || null,
        pickup_status: tech.flight_number ? 'scheduled' : 'not_scheduled',
        camp_id: sajjaCampId,
        status: 'pending_arrival'
      }));

      console.log("Bulk upload data:", techniciansWithCamp); // Log the data before submitting
      await bulkCreateMutation.mutateAsync(techniciansWithCamp);
    } catch (error) {
      console.error("Error during bulk upload parsing or pre-check:", error);
      setUploadResult({ success: false, message: error.message || "An unexpected error occurred during file processing." });
    } finally {
      setUploading(false);
    }
  };

  const pendingTechnicians = technicians.filter(t => t.status === 'pending_arrival');

  const filteredTechnicians = pendingTechnicians.filter(tech => {
    const matchesSearch = !searchQuery ||
      tech.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tech.employee_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tech.nationality?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const handleQuickEdit = (tech) => {
    setEditingTech({
      id: tech.id,
      health_insurance_no: tech.health_insurance_no || '',
      health_insurance_expiry_date: tech.health_insurance_expiry_date || '',
      ticket_ref: tech.ticket_ref || '',
      flight_number: tech.flight_number || '',
      airline: tech.airline || ''
    });
    setShowQuickEditDialog(true);
  };

  const handleSaveQuickEdit = () => {
    if (!editingTech) return;

    const updateData = {
      health_insurance_no: editingTech.health_insurance_no || null,
      health_insurance_expiry_date: editingTech.health_insurance_expiry_date || null,
      ticket_ref: editingTech.ticket_ref || null,
      flight_number: editingTech.flight_number || null,
      airline: editingTech.airline || null
    };

    updateTechnicianMutation.mutate({ id: editingTech.id, data: updateData });
  };



  return (
    <div className="p-4 md:p-6 bg-gradient-to-br from-gray-50 to-blue-50 min-h-screen">
      {hasDuplicates && (
        <Alert className="mb-4 border-orange-500 bg-orange-50">
          <AlertCircle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-800 flex items-center justify-between flex-wrap gap-2 text-sm">
            <div>
              <strong>Warning:</strong> Found {sajjaCamps.length} duplicate "Sajja Camp" entries.
              {cleaningDuplicates && cleanupProgress && (
                <span className="ml-2 font-medium">
                  Cleaning... ({cleanupProgress.current}/{cleanupProgress.total})
                </span>
              )}
            </div>
            <Button
              size="sm"
              onClick={handleCleanupDuplicates}
              disabled={cleaningDuplicates}
              className="bg-orange-600 hover:bg-orange-700 text-white min-w-[120px]"
            >
              {cleaningDuplicates ? 'Cleaning...' : 'Clean Up Duplicates'}
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {campsLoading && !sajjaCampId && (
        <Alert className="mb-4 border-blue-500 bg-blue-50">
          <AlertCircle className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800 text-sm">
            <strong>Loading...</strong> Checking for Sajja Camp status.
          </AlertDescription>
        </Alert>
      )}

      {creatingCamp && (
        <Alert className="mb-4 border-blue-500 bg-blue-50">
          <AlertCircle className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800 text-sm">
            <strong>Creating Sajja Camp...</strong> This will only happen once. Please wait...
          </AlertDescription>
        </Alert>
      )}

      {!sajjaCampId && !campsLoading && !creatingCamp && campCreationAttempted && (
        <Alert className="mb-4 border-red-500 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800 text-sm">
            <strong>Camp Creation Failed!</strong>
            <p className="mt-2">Unable to create Sajja Camp automatically. Please try manually:</p>
            <Button
              size="sm"
              onClick={() => {
                setCampCreationAttempted(false); // Allow a new attempt
                handleCreateSajjaCamp();
              }}
              className="mt-2 bg-blue-600 hover:bg-blue-700"
            >
              Retry Create Sajja Camp
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {showSuccess && (
        <Alert className="mb-4 border-green-500 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800 text-sm">
            Technician registered successfully and assigned to Sajja Camp! Status: Pending Arrival
          </AlertDescription>
        </Alert>
      )}

      {submissionError && ( // Display submission error
        <Alert className="mb-4 border-red-500 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800 text-sm">
            <strong>Error:</strong> {submissionError}
          </AlertDescription>
        </Alert>
      )}

      {validationError && validationError.type === 'duplicate' && (
        <Alert className="mb-4 border-red-500 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800 text-sm">
            <strong>Duplicate Employee ID Detected!</strong>
            <p className="mt-2">Employee ID <strong>{validationError.employee_id}</strong> already exists in the system:</p>
            <div className="mt-2 p-2 bg-white border border-red-200 rounded">
              <p className="font-semibold">{validationError.existing.full_name}</p>
              <p className="text-xs">Status: <Badge className="ml-2">{validationError.existing.status?.replace(/_/g, ' ')}</Badge></p>
              {validationError.existing.camp_id && (
                <p className="text-xs">Camp: {camps.find(c => c.id === validationError.existing.camp_id)?.name || 'Unknown'}</p>
              )}
            </div>
            <p className="mt-2 text-xs">Please use a different Employee ID or update the existing record instead.</p>
          </AlertDescription>
        </Alert>
      )}

      {validationError && (validationError.type === 'missing_required' || validationError.type === 'missing_camp') && ( // Display new validation errors
        <Alert className="mb-4 border-red-500 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800 text-sm">
            <strong>Validation Error:</strong> {validationError.message}
          </AlertDescription>
        </Alert>
      )}

      <div className="max-w-6xl mx-auto space-y-4">
        <Card className="border-none shadow-lg bg-gradient-to-br from-blue-600 to-blue-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 text-white">
              <UserPlus className="w-6 h-6" />
              <div>
                <h1 className="text-xl font-bold">Register New Technicians (Advance)</h1>
                <p className="text-blue-100 text-xs mt-0.5">
                  Register technicians before arrival - automatically assigned to Sajja Camp with pending status.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Alert className="border-blue-200 bg-blue-50">
          <Building2 className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-xs text-blue-900">
            <strong className="font-semibold">📍 Step 1 of 6: Register New Technicians</strong>
            <br />
            Register technicians before arrival → Assigned to Sajja Camp (Pending Arrival) → 02.Onboarding Team gets email notification → Next: Airport Pickup Management
          </AlertDescription>
        </Alert>

        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              try {
                const testResult = await base44.functions.invoke('notifyOnboardingTeam', {
                  technicians: [{
                    employee_id: 'TEST001',
                    full_name: 'Test Technician',
                    nationality: 'Indian',
                    trade: 'Electrician',
                    expected_arrival_date: format(new Date(), 'yyyy-MM-dd'),
                    flight_number: 'EK201',
                    airline: 'Emirates'
                  }],
                  isBulk: false
                });
                alert(`✅ Test email sent!\n\nSent to: ${testResult.recipients} recipient(s)\n\nCheck your email inbox (including spam folder)`);
              } catch (error) {
                alert(`❌ Test failed: ${error.message}`);
              }
            }}
            className="gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            Test Email Notification
          </Button>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <Card
            className={`border-2 ${uploadMode === 'bulk' ? 'border-blue-600 shadow-xl' : 'border-blue-200'} hover:border-blue-500 transition-all cursor-pointer hover:shadow-lg bg-gradient-to-br from-blue-50 to-blue-100`}
            onClick={() => { setUploadMode('bulk'); setUploadResult(null); setBulkFile(null); }}
          >
            <CardContent className="p-6 text-center">
              <Upload className="w-10 h-10 text-blue-600 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-gray-900 mb-1">Bulk Upload (Recommended)</h3>
              <p className="text-sm text-gray-600">Upload CSV file with multiple technicians</p>
            </CardContent>
          </Card>

          <Card
            className={`border-2 ${uploadMode === 'manual' ? 'border-green-600 shadow-xl' : 'border-green-200'} hover:border-green-500 transition-all cursor-pointer hover:shadow-lg bg-gradient-to-br from-green-50 to-green-100`}
            onClick={() => { setUploadMode('manual'); setFormData({}); setValidationError(null); setSubmissionError(null); }}
          >
            <CardContent className="p-6 text-center">
              <UserPlus className="w-10 h-10 text-green-600 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-gray-900 mb-1">Manual Entry</h3>
              <p className="text-sm text-gray-600">Add single technician manually</p>
            </CardContent>
          </Card>
        </div>

        {uploadMode === 'bulk' && (
          <Card className="border-none shadow-lg">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100 border-b pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Upload className="w-5 h-5" />
                Bulk Upload Technicians
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="space-y-4">
                <Alert className="bg-blue-50 border-blue-200">
                  <AlertCircle className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-xs text-blue-900">
                    <strong className="font-semibold">CSV Format Requirements:</strong>
                    <ul className="list-disc list-inside mt-1 space-y-0.5 text-xs">
                      <li><strong>Required: employee_id, full_name, nationality, gender, expected_arrival_date, flight_number, airline, departure_airport, arrival_airport, arrival_terminal</strong></li>
                      <li>Optional: religion, date_of_birth, phone, email, state, marital_status, no_of_adults, no_of_children, no_of_infants, passport_no, passport_expiry_date, health_insurance_no, health_insurance_expiry_date, trade, department, expected_arrival_time, ticket_ref, tentative_project_id, emergency_contact_no, emergency_contact_no_relationship, emergency_contact_no_2, emergency_contact_no_2_relationship, legal_nominee_name, nominee_relationship</li>
                      <li>Date format: <strong>dd/mmm/yyyy</strong> (e.g., 15/Jan/1990, 31/Dec/2025)</li>
                      <li>Time format: HH:MM 24-hour (e.g., 14:30)</li>
                      <li>Gender: male or female</li>
                      <li>Marital Status: single, married, divorced, widowed</li>
                      <li>Emergency Contact Relationship: wife, husband, mother, father, son, daughter, brother, sister</li>
                      <li>Family: no_of_adults (above 12yr), no_of_children (2-11yr), no_of_infants (0-2yr) - enter numbers</li>
                      <li>Save as <strong>CSV UTF-8</strong> (not standard CSV). Remove comment lines (lines starting with #).</li>
                    </ul>
                  </AlertDescription>
                </Alert>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={downloadTemplate}
                    className="flex-1 h-9"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download CSV Template
                  </Button>
                </div>

                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-blue-500 transition-colors">
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileChange}
                    className="hidden"
                    id="bulk-upload"
                  />
                  <label htmlFor="bulk-upload" className="cursor-pointer">
                    <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm font-medium text-gray-700">
                      {bulkFile ? bulkFile.name : 'Click to upload CSV file'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      or drag and drop
                    </p>
                  </label>
                </div>

                <Button
                  onClick={handleBulkUpload}
                  disabled={!bulkFile || uploading || !sajjaCampId || campsLoading || creatingCamp || createCampMutation.isLoading}
                  className="w-full bg-blue-600 hover:bg-blue-700 h-9"
                >
                  {uploading ? (
                    <>Processing...</>
                  ) : campsLoading ? (
                    <>Loading Camp Data...</>
                  ) : creatingCamp || createCampMutation.isLoading ? (
                    <>Setting up camp...</>
                  ) : !sajjaCampId ? (
                    <>Waiting for Sajja Camp...</>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Upload and Register Technicians
                    </>
                  )}
                </Button>

                {!sajjaCampId && !campsLoading && !creatingCamp && bulkFile && (
                  <Alert className="border-yellow-500 bg-yellow-50">
                    <AlertCircle className="h-4 w-4 text-yellow-600" />
                    <AlertDescription className="text-yellow-800 text-xs">
                      Upload is disabled because Sajja Camp is not found or being created. Please wait for the camp to be ready.
                    </AlertDescription>
                  </Alert>
                )}

                {uploadResult && (
                  <Alert variant={uploadResult.success ? "default" : "destructive"} className="mt-3">
                    {uploadResult.success ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <AlertCircle className="h-4 w-4" />
                    )}
                    <AlertDescription className="text-xs">
                      {uploadResult.message}
                      {uploadResult.details && (
                        <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-x-auto whitespace-pre-wrap">
                          {uploadResult.details}
                        </pre>
                      )}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {uploadMode === 'manual' && (
          <Card className="border-none shadow-lg">
            <CardHeader className="bg-gradient-to-r from-purple-50 to-purple-100 border-b pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <UserPlus className="w-5 h-5" />
                Manual Technician Registration
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              {!sajjaCampId && !campsLoading && (
                <Alert className="mb-4 border-yellow-500 bg-yellow-50">
                  <AlertCircle className="h-4 w-4 text-yellow-600" />
                  <AlertDescription className="text-yellow-800 text-xs">
                    Registration is disabled because Sajja Camp is not found or being created. Please wait for the camp to be ready.
                  </AlertDescription>
                </Alert>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="employee_id" className="text-sm">Employee ID*</Label>
                    <Input
                      id="employee_id"
                      required
                      value={formData.employee_id || ''}
                      onChange={(e) => {
                        setFormData({ ...formData, employee_id: e.target.value });
                        setValidationError(null);
                        setSubmissionError(null);
                      }}
                      placeholder="e.g., EMP001"
                      className={`h-9 text-sm ${validationError?.type === 'duplicate' ? 'border-red-500' : ''}`}
                    />
                    {validationError?.type === 'duplicate' && (
                      <p className="text-xs text-red-600">This Employee ID already exists</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="full_name" className="text-sm">Full Name*</Label>
                    <Input
                      id="full_name"
                      required
                      value={formData.full_name || ''}
                      onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                      placeholder="e.g., John Doe"
                      className="h-9 text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="nationality" className="text-sm">Nationality*</Label>
                  <Select
                    value={formData.nationality || ''}
                    onValueChange={(value) => setFormData({ ...formData, nationality: value })}
                  >
                    <SelectTrigger id="nationality" className="h-9 text-sm">
                      <SelectValue placeholder="Select nationality" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Indian">Indian</SelectItem>
                      <SelectItem value="Pakistani">Pakistani</SelectItem>
                      <SelectItem value="Bangladeshi">Bangladeshi</SelectItem>
                      <SelectItem value="Filipino">Filipino</SelectItem>
                      <SelectItem value="Nepali">Nepali</SelectItem>
                      <SelectItem value="Sri Lankan">Sri Lankan</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="gender" className="text-sm">Gender*</Label>
                    <Select
                      value={formData.gender || ''}
                      onValueChange={(value) => setFormData({ ...formData, gender: value })}
                    >
                      <SelectTrigger id="gender" className="h-9 text-sm">
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="date_of_birth" className="text-sm">Date of Birth</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full h-9 text-sm justify-start text-left font-normal">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formData.date_of_birth ? format(new Date(formData.date_of_birth), 'dd/MMM/yyyy') : 'Pick a date'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={formData.date_of_birth ? new Date(formData.date_of_birth) : undefined}
                          onSelect={(date) => setFormData({ ...formData, date_of_birth: date ? format(date, 'yyyy-MM-dd') : '' })}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="phone" className="text-sm">Phone</Label>
                    <PhoneInput
                      value={formData.phone || ''}
                      onChange={(value) => setFormData({ ...formData, phone: value })}
                      placeholder="Enter 9 digits"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="email" className="text-sm">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email || ''}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="john.doe@example.com"
                      className="h-9 text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="state" className="text-sm">State/Province</Label>
                    <Select
                      value={formData.state || ''}
                      onValueChange={(value) => setFormData({ ...formData, state: value })}
                    >
                      <SelectTrigger id="state" className="h-9 text-sm">
                        <SelectValue placeholder="Select state/province" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Kerala">Kerala (India)</SelectItem>
                        <SelectItem value="Tamil Nadu">Tamil Nadu (India)</SelectItem>
                        <SelectItem value="Karnataka">Karnataka (India)</SelectItem>
                        <SelectItem value="Maharashtra">Maharashtra (India)</SelectItem>
                        <SelectItem value="Uttar Pradesh">Uttar Pradesh (India)</SelectItem>
                        <SelectItem value="Bihar">Bihar (India)</SelectItem>
                        <SelectItem value="Punjab India">Punjab (India)</SelectItem>
                        <SelectItem value="Sindh">Sindh (Pakistan)</SelectItem>
                        <SelectItem value="Punjab Pakistan">Punjab (Pakistan)</SelectItem>
                        <SelectItem value="Khyber Pakhtunkhwa">Khyber Pakhtunkhwa (Pakistan)</SelectItem>
                        <SelectItem value="Dhaka">Dhaka (Bangladesh)</SelectItem>
                        <SelectItem value="Chittagong">Chittagong (Bangladesh)</SelectItem>
                        <SelectItem value="Manila">Manila (Philippines)</SelectItem>
                        <SelectItem value="Cebu">Cebu (Philippines)</SelectItem>
                        <SelectItem value="Davao">Davao (Philippines)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="marital_status" className="text-sm">Marital Status</Label>
                    <Select
                      value={formData.marital_status || ''}
                      onValueChange={(value) => setFormData({ ...formData, marital_status: value })}
                    >
                      <SelectTrigger id="marital_status" className="h-9 text-sm">
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
                </div>

                <div className="border-t pt-4 mt-4">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Family Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="no_of_adults" className="text-sm">No. of Adults (Above 12 yr)</Label>
                      <Input
                        id="no_of_adults"
                        type="number"
                        min="0"
                        value={formData.no_of_adults || ''}
                        onChange={(e) => setFormData({ ...formData, no_of_adults: parseInt(e.target.value) || 0 })}
                        placeholder="0"
                        className="h-9 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="no_of_children" className="text-sm">No. of Children (2-11 yr)</Label>
                      <Input
                        id="no_of_children"
                        type="number"
                        min="0"
                        value={formData.no_of_children || ''}
                        onChange={(e) => setFormData({ ...formData, no_of_children: parseInt(e.target.value) || 0 })}
                        placeholder="0"
                        className="h-9 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="no_of_infants" className="text-sm">No. of Infants (0-2 yr)</Label>
                      <Input
                        id="no_of_infants"
                        type="number"
                        min="0"
                        value={formData.no_of_infants || ''}
                        onChange={(e) => setFormData({ ...formData, no_of_infants: parseInt(e.target.value) || 0 })}
                        placeholder="0"
                        className="h-9 text-sm"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="passport_no" className="text-sm">Passport No</Label>
                    <Input
                      id="passport_no"
                      value={formData.passport_no || ''}
                      onChange={(e) => setFormData({ ...formData, passport_no: e.target.value })}
                      placeholder="e.g., P123456"
                      className="h-9 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="passport_expiry_date" className="text-sm">Passport Expiry Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full h-9 text-sm justify-start text-left font-normal">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formData.passport_expiry_date ? format(new Date(formData.passport_expiry_date), 'dd/MMM/yyyy') : 'Pick a date'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={formData.passport_expiry_date ? new Date(formData.passport_expiry_date) : undefined}
                          onSelect={(date) => setFormData({ ...formData, passport_expiry_date: date ? format(date, 'yyyy-MM-dd') : '' })}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="health_insurance_no" className="text-sm">Health Insurance No</Label>
                    <Input
                      id="health_insurance_no"
                      value={formData.health_insurance_no || ''}
                      onChange={(e) => setFormData({ ...formData, health_insurance_no: e.target.value })}
                      placeholder="e.g., HI789012"
                      className="h-9 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="health_insurance_expiry_date" className="text-sm">Health Insurance Expiry Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full h-9 text-sm justify-start text-left font-normal">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formData.health_insurance_expiry_date ? format(new Date(formData.health_insurance_expiry_date), 'dd/MMM/yyyy') : 'Pick a date'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={formData.health_insurance_expiry_date ? new Date(formData.health_insurance_expiry_date) : undefined}
                          onSelect={(date) => setFormData({ ...formData, health_insurance_expiry_date: date ? format(date, 'yyyy-MM-dd') : '' })}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="trade" className="text-sm">Trade/Skill</Label>
                    <Select
                      value={formData.trade || ''}
                      onValueChange={(value) => setFormData({ ...formData, trade: value })}
                    >
                      <SelectTrigger id="trade" className="h-9 text-sm">
                        <SelectValue placeholder="Select trade/skill" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Electrician">Electrician</SelectItem>
                        <SelectItem value="Plumber">Plumber</SelectItem>
                        <SelectItem value="Steel Fixer">Steel Fixer</SelectItem>
                        <SelectItem value="Mason">Mason</SelectItem>
                        <SelectItem value="Tile Mason">Tile Mason</SelectItem>
                        <SelectItem value="Carpenter">Carpenter</SelectItem>
                        <SelectItem value="Painter">Painter</SelectItem>
                        <SelectItem value="Welder">Welder</SelectItem>
                        <SelectItem value="HVAC Technician">HVAC Technician</SelectItem>
                        <SelectItem value="Fabricator">Fabricator</SelectItem>
                        <SelectItem value="Foreman">Foreman</SelectItem>
                        <SelectItem value="General Labor">General Labor</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="department" className="text-sm">Division</Label>
                    <Select
                      value={formData.department || ''}
                      onValueChange={(value) => setFormData({ ...formData, department: value })}
                    >
                      <SelectTrigger id="department" className="h-9 text-sm">
                        <SelectValue placeholder="Select division" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SFD">SFD</SelectItem>
                        <SelectItem value="FD">FD</SelectItem>
                        <SelectItem value="MEP">MEP</SelectItem>
                        <SelectItem value="Facade">Facade</SelectItem>
                        <SelectItem value="Infra">Infra</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="religion" className="text-sm">Religion</Label>
                    <Select
                      value={formData.religion || ''}
                      onValueChange={(value) => setFormData({ ...formData, religion: value })}
                    >
                      <SelectTrigger id="religion" className="h-9 text-sm">
                        <SelectValue placeholder="Select religion" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Hindu">Hindu</SelectItem>
                        <SelectItem value="Muslim">Muslim</SelectItem>
                        <SelectItem value="Christian">Christian</SelectItem>
                        <SelectItem value="Catholic">Catholic</SelectItem>
                        <SelectItem value="Sikh">Sikh</SelectItem>
                        <SelectItem value="Buddhist">Buddhist</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="tentative_project_id" className="text-sm">Tentative Project</Label>
                    <Select
                      value={formData.tentative_project_id || ''}
                      onValueChange={(value) => setFormData({ ...formData, tentative_project_id: value })}
                    >
                      <SelectTrigger id="tentative_project_id" className="h-9 text-sm">
                        <SelectValue placeholder="Select project" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={null}>None</SelectItem>
                        {projects.map(project => (
                          <SelectItem key={project.id} value={project.id}>
                            {project.project_name} ({project.project_code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Expected Arrival & Flight Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="expected_arrival_date" className="text-sm">Expected Arrival Date*</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-full h-9 text-sm justify-start text-left font-normal">
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {formData.expected_arrival_date ? format(new Date(formData.expected_arrival_date), 'dd/MMM/yyyy') : 'Pick a date'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={formData.expected_arrival_date ? new Date(formData.expected_arrival_date) : undefined}
                            onSelect={(date) => setFormData({ ...formData, expected_arrival_date: date ? format(date, 'yyyy-MM-dd') : '' })}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="expected_arrival_time" className="text-sm">Expected Arrival Time</Label>
                      <Input
                        id="expected_arrival_time"
                        type="time"
                        value={formData.expected_arrival_time || ''}
                        onChange={(e) => setFormData({ ...formData, expected_arrival_time: e.target.value })}
                        className="h-9 text-sm"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
                    <div className="space-y-1">
                      <Label htmlFor="ticket_ref" className="text-sm">Ticket Ref</Label>
                      <Input
                        id="ticket_ref"
                        value={formData.ticket_ref || ''}
                        onChange={(e) => setFormData({ ...formData, ticket_ref: e.target.value })}
                        placeholder="e.g., TKT123456"
                        className="h-9 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="flight_number" className="text-sm">Flight Number*</Label>
                      <Input
                        id="flight_number"
                        required
                        value={formData.flight_number || ''}
                        onChange={(e) => setFormData({ ...formData, flight_number: e.target.value })}
                        placeholder="e.g., EK201"
                        className="h-9 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="airline" className="text-sm">Airline*</Label>
                      <Input
                        id="airline"
                        required
                        value={formData.airline || ''}
                        onChange={(e) => setFormData({ ...formData, airline: e.target.value })}
                        placeholder="e.g., Emirates"
                        className="h-9 text-sm"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
                    <div className="space-y-1">
                      <Label htmlFor="departure_airport" className="text-sm">Departure Airport*</Label>
                      <Select
                        value={formData.departure_airport || ''}
                        onValueChange={(value) => setFormData({ ...formData, departure_airport: value })}
                      >
                        <SelectTrigger id="departure_airport" className="h-9 text-sm" required>
                          <SelectValue placeholder="Select departure" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="COK">Cochin (COK)</SelectItem>
                          <SelectItem value="BOM">Mumbai (BOM)</SelectItem>
                          <SelectItem value="DEL">Delhi (DEL)</SelectItem>
                          <SelectItem value="BLR">Bangalore (BLR)</SelectItem>
                          <SelectItem value="MAA">Chennai (MAA)</SelectItem>
                          <SelectItem value="KHI">Karachi (KHI)</SelectItem>
                          <SelectItem value="LHE">Lahore (LHE)</SelectItem>
                          <SelectItem value="ISB">Islamabad (ISB)</SelectItem>
                          <SelectItem value="DAC">Dhaka (DAC)</SelectItem>
                          <SelectItem value="MNL">Manila (MNL)</SelectItem>
                          <SelectItem value="CEB">Cebu (CEB)</SelectItem>
                          <SelectItem value="DXB">Dubai (DXB)</SelectItem>
                          <SelectItem value="SHJ">Sharjah (SHJ)</SelectItem>
                          <SelectItem value="AUH">Abu Dhabi (AUH)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="arrival_airport" className="text-sm">Arrival Airport*</Label>
                      <Select
                        value={formData.arrival_airport || ''}
                        onValueChange={(value) => setFormData({ ...formData, arrival_airport: value })}
                      >
                        <SelectTrigger id="arrival_airport" className="h-9 text-sm" required>
                          <SelectValue placeholder="Select arrival" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="DXB">Dubai (DXB)</SelectItem>
                          <SelectItem value="SHJ">Sharjah (SHJ)</SelectItem>
                          <SelectItem value="AUH">Abu Dhabi (AUH)</SelectItem>
                          <SelectItem value="COK">Cochin (COK)</SelectItem>
                          <SelectItem value="BOM">Mumbai (BOM)</SelectItem>
                          <SelectItem value="DEL">Delhi (DEL)</SelectItem>
                          <SelectItem value="BLR">Bangalore (BLR)</SelectItem>
                          <SelectItem value="MAA">Chennai (MAA)</SelectItem>
                          <SelectItem value="KHI">Karachi (KHI)</SelectItem>
                          <SelectItem value="LHE">Lahore (LHE)</SelectItem>
                          <SelectItem value="ISB">Islamabad (ISB)</SelectItem>
                          <SelectItem value="DAC">Dhaka (DAC)</SelectItem>
                          <SelectItem value="MNL">Manila (MNL)</SelectItem>
                          <SelectItem value="CEB">Cebu (CEB)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="arrival_terminal" className="text-sm">Arrival Terminal*</Label>
                      <Select
                        value={formData.arrival_terminal || ''}
                        onValueChange={(value) => setFormData({ ...formData, arrival_terminal: value })}
                      >
                        <SelectTrigger id="arrival_terminal" className="h-9 text-sm" required>
                          <SelectValue placeholder="Select terminal" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="T1">Terminal 1</SelectItem>
                          <SelectItem value="T2">Terminal 2</SelectItem>
                          <SelectItem value="T3">Terminal 3</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4 mt-4">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Emergency Contact Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="emergency_contact_no" className="text-sm">Emergency Contact Number</Label>
                      <PhoneInput
                        value={formData.emergency_contact_no || ''}
                        onChange={(value) => setFormData({ ...formData, emergency_contact_no: value })}
                        placeholder="Enter 9 digits"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="emergency_contact_no_relationship" className="text-sm">Relationship</Label>
                      <Select
                        value={formData.emergency_contact_no_relationship || ''}
                        onValueChange={(value) => setFormData({ ...formData, emergency_contact_no_relationship: value })}
                      >
                        <SelectTrigger id="emergency_contact_no_relationship" className="h-9 text-sm">
                          <SelectValue placeholder="Select relationship" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="wife">Wife</SelectItem>
                          <SelectItem value="husband">Husband</SelectItem>
                          <SelectItem value="mother">Mother</SelectItem>
                          <SelectItem value="father">Father</SelectItem>
                          <SelectItem value="son">Son</SelectItem>
                          <SelectItem value="daughter">Daughter</SelectItem>
                          <SelectItem value="brother">Brother</SelectItem>
                          <SelectItem value="sister">Sister</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                    <div className="space-y-1">
                      <Label htmlFor="emergency_contact_no_2" className="text-sm">Emergency Contact Number 2</Label>
                      <PhoneInput
                        value={formData.emergency_contact_no_2 || ''}
                        onChange={(value) => setFormData({ ...formData, emergency_contact_no_2: value })}
                        placeholder="Enter 9 digits"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="emergency_contact_no_2_relationship" className="text-sm">Relationship</Label>
                      <Select
                        value={formData.emergency_contact_no_2_relationship || ''}
                        onValueChange={(value) => setFormData({ ...formData, emergency_contact_no_2_relationship: value })}
                      >
                        <SelectTrigger id="emergency_contact_no_2_relationship" className="h-9 text-sm">
                          <SelectValue placeholder="Select relationship" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="wife">Wife</SelectItem>
                          <SelectItem value="husband">Husband</SelectItem>
                          <SelectItem value="mother">Mother</SelectItem>
                          <SelectItem value="father">Father</SelectItem>
                          <SelectItem value="son">Son</SelectItem>
                          <SelectItem value="daughter">Daughter</SelectItem>
                          <SelectItem value="brother">Brother</SelectItem>
                          <SelectItem value="sister">Sister</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4 mt-4">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Legal Nominee Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="legal_nominee_name" className="text-sm">Legal Nominee Name</Label>
                      <Input
                        id="legal_nominee_name"
                        value={formData.legal_nominee_name || ''}
                        onChange={(e) => setFormData({ ...formData, legal_nominee_name: e.target.value })}
                        placeholder="e.g., Mary Doe"
                        className="h-9 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="nominee_relationship" className="text-sm">Nominee Relationship</Label>
                      <Select
                        value={formData.nominee_relationship || ''}
                        onValueChange={(value) => setFormData({ ...formData, nominee_relationship: value })}
                      >
                        <SelectTrigger id="nominee_relationship" className="h-9 text-sm">
                          <SelectValue placeholder="Select relationship" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="wife">Wife</SelectItem>
                          <SelectItem value="husband">Husband</SelectItem>
                          <SelectItem value="mother">Mother</SelectItem>
                          <SelectItem value="father">Father</SelectItem>
                          <SelectItem value="son">Son</SelectItem>
                          <SelectItem value="daughter">Daughter</SelectItem>
                          <SelectItem value="brother">Brother</SelectItem>
                          <SelectItem value="sister">Sister</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setUploadMode('none');
                      setFormData({});
                      setValidationError(null);
                      setSubmissionError(null); // Reset on cancel
                    }}
                    className="h-9 px-3 text-sm"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="bg-green-600 hover:bg-green-700 h-9 px-3 text-sm"
                    disabled={createTechnicianMutation.isLoading || !sajjaCampId || campsLoading || creatingCamp || createCampMutation.isLoading}
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    {createTechnicianMutation.isLoading ? 'Registering...' :
                      campsLoading ? 'Loading Camp...' :
                        (creatingCamp || createCampMutation.isLoading) ? 'Setting up...' :
                          !sajjaCampId ? 'Camp Required' :
                            'Register Technician'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        <Card className="border-none shadow-lg">
          <CardHeader className="bg-gradient-to-r from-purple-50 to-purple-100 border-b pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="w-5 h-5 text-purple-600" />
                Registered Technicians Pending Arrival ({pendingTechnicians.length})
              </CardTitle>
            </div>
          </CardHeader>

          <CardContent className="p-4">
            <div className="mb-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search by name, employee ID, or nationality..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-9 text-sm"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse bg-white">
                <thead>
                  <tr className="border-b-2 border-gray-300">
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gradient-to-r from-gray-50 to-gray-100 border-r border-gray-200">
                      Actions
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gradient-to-r from-gray-50 to-gray-100 border-r border-gray-200">
                      Employee ID
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gradient-to-r from-gray-50 to-gray-100 border-r border-gray-200">
                      Full Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gradient-to-r from-gray-50 to-gray-100 border-r border-gray-200">
                      Nationality
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gradient-to-r from-gray-50 to-gray-100 border-r border-gray-200">
                      Trade
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gradient-to-r from-gray-50 to-gray-100 border-r border-gray-200">
                      Flight Details
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gradient-to-r from-gray-50 to-gray-100 border-r border-gray-200">
                      Expected Arrival
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gradient-to-r from-gray-50 to-gray-100">
                      Tentative Project
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTechnicians.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="px-6 py-12 text-center">
                        <Users className="w-16 h-16 mx-auto mb-3 text-gray-300" />
                        <p className="text-lg font-medium text-gray-500">
                          {searchQuery ? 'No technicians match your search' : 'No pending technicians registered yet'}
                        </p>
                        <p className="text-sm text-gray-400 mt-1">
                          {searchQuery ? 'Try adjusting your search' : 'Register technicians using bulk upload or manual entry above'}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredTechnicians.map((tech, index) => {
                      const tentativeProject = projects.find(p => p.id === tech.tentative_project_id);
                      return (
                        <tr
                          key={tech.id}
                          className={`border-b border-gray-200 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 transition-all ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                            }`}
                        >
                          <td className="px-4 py-3 text-center border-r border-gray-200">
                            <Button
                              onClick={() => handleQuickEdit(tech)}
                              size="sm"
                              className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm h-8 px-3"
                            >
                              <Edit className="w-3 h-3 mr-1.5" />
                              Edit
                            </Button>
                          </td>
                          <td className="px-4 py-3 border-r border-gray-200">
                            <Badge className="bg-blue-600 text-white font-mono text-xs px-2 py-1">
                              {tech.employee_id}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900 font-semibold border-r border-gray-200">
                            {tech.full_name}
                          </td>
                          <td className="px-4 py-3 border-r border-gray-200">
                            <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                              {tech.nationality || '-'}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 border-r border-gray-200">
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                              {tech.trade || '-'}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 border-r border-gray-200">
                            {tech.flight_number ? (
                              <div className="space-y-1">
                                <div className="flex items-center gap-1.5">
                                  <div className="w-1.5 h-1.5 bg-blue-600 rounded-full"></div>
                                  <span className="font-semibold text-blue-700 text-sm">{tech.flight_number}</span>
                                </div>
                                <p className="text-xs text-gray-600 ml-3">{tech.airline || '-'}</p>
                              </div>
                            ) : (
                              <span className="text-xs text-gray-400">Not set</span>
                            )}
                          </td>
                          <td className="px-4 py-3 border-r border-gray-200">
                            <div className="space-y-0.5">
                              <p className="font-semibold text-gray-900 text-sm">{formatDateDisplay(tech.expected_arrival_date)}</p>
                              {tech.expected_arrival_time && (
                                <div className="flex items-center gap-1 text-xs text-gray-600">
                                  <Clock className="w-3 h-3" />
                                  {tech.expected_arrival_time}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            {tentativeProject ? (
                              <div className="space-y-0.5">
                                <p className="font-semibold text-gray-900 text-sm">{tentativeProject.project_name}</p>
                                <Badge variant="outline" className="text-xs bg-indigo-50 text-indigo-700 border-indigo-200">
                                  {tentativeProject.project_code}
                                </Badge>
                              </div>
                            ) : (
                              <span className="text-xs text-gray-400">Not assigned</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {filteredTechnicians.length > 0 && (
              <div className="mt-3 text-sm text-gray-600">
                Showing <span className="font-semibold">{filteredTechnicians.length}</span> of <span className="font-semibold">{pendingTechnicians.length}</span> pending technicians
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Edit Dialog */}
      <Dialog open={showQuickEditDialog} onOpenChange={setShowQuickEditDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="w-5 h-5 text-blue-600" />
              Quick Edit - Pending Arrival Details
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <Alert className="bg-blue-50 border-blue-200">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800 text-sm">
                <strong>Pending Arrival Only:</strong> Edit health insurance and flight details before technician arrives.
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm">Health Insurance No</Label>
                <Input
                  value={editingTech?.health_insurance_no || ''}
                  onChange={(e) => setEditingTech({ ...editingTech, health_insurance_no: e.target.value })}
                  placeholder="e.g., HI789012"
                  className="h-9"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Health Insurance Expiry Date</Label>
                <Input
                  type="date"
                  value={editingTech?.health_insurance_expiry_date || ''}
                  onChange={(e) => setEditingTech({ ...editingTech, health_insurance_expiry_date: e.target.value })}
                  className="h-9"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Ticket Reference</Label>
              <Input
                value={editingTech?.ticket_ref || ''}
                onChange={(e) => setEditingTech({ ...editingTech, ticket_ref: e.target.value })}
                placeholder="e.g., TKT123456"
                className="h-9"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm">Flight Number</Label>
                <Input
                  value={editingTech?.flight_number || ''}
                  onChange={(e) => setEditingTech({ ...editingTech, flight_number: e.target.value })}
                  placeholder="e.g., EK201"
                  className="h-9"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Airline</Label>
                <Input
                  value={editingTech?.airline || ''}
                  onChange={(e) => setEditingTech({ ...editingTech, airline: e.target.value })}
                  placeholder="e.g., Emirates"
                  className="h-9"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowQuickEditDialog(false);
              setEditingTech(null);
            }}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveQuickEdit}
              disabled={updateTechnicianMutation.isLoading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Save className="w-4 h-4 mr-2" />
              {updateTechnicianMutation.isLoading ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}