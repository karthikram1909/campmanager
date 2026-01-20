import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plane, Car, MapPin, Calendar, Clock, Users, AlertCircle, Download, Filter, X, ArrowUpDown, CheckCircle2, Camera, XCircle, Edit } from "lucide-react";
import { format, parseISO, isToday, isPast, isValid } from "date-fns";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";

export default function AirportPickupManagement() {
  const queryClient = useQueryClient();
  
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [showDispatchDialog, setShowDispatchDialog] = useState(false);
  const [showVerificationDialog, setShowVerificationDialog] = useState(false);
  const [showArrivalDialog, setShowArrivalDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [selectedTech, setSelectedTech] = useState(null);
  const [selectedTechs, setSelectedTechs] = useState([]);
  const [scheduleData, setScheduleData] = useState({});
  const [driverMobileError, setDriverMobileError] = useState("");
  const [driverCountryCode, setDriverCountryCode] = useState("+971");
  const [driverMobileNumber, setDriverMobileNumber] = useState("");
  const [verificationData, setVerificationData] = useState({});
  const [uploadingPassport, setUploadingPassport] = useState(false);
  const [sortField, setSortField] = useState("expected_arrival_date");
  const [sortDirection, setSortDirection] = useState("asc");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const videoRef = React.useRef(null);
  const canvasRef = React.useRef(null);
  const [showPassportCamera, setShowPassportCamera] = useState(false);
  const [passportCameraStream, setPassportCameraStream] = useState(null);
  const passportVideoRef = React.useRef(null);
  const passportCanvasRef = React.useRef(null);

  // Filters
  const [filterDate, setFilterDate] = useState("all");
  const [filterPickupStatus, setFilterPickupStatus] = useState("all");
  const [filterCamp, setFilterCamp] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Excel-style column filters
  const [filterEmployeeId, setFilterEmployeeId] = useState([]);
  const [filterFullName, setFilterFullName] = useState([]);
  const [filterFlightNumber, setFilterFlightNumber] = useState([]);
  const [filterAirline, setFilterAirline] = useState([]);
  const [filterTerminal, setFilterTerminal] = useState([]);
  const [filterDriver, setFilterDriver] = useState([]);

  // Search states for column filters
  const [searchEmployeeId, setSearchEmployeeId] = useState("");
  const [searchFullName, setSearchFullName] = useState("");
  const [searchFlightNumber, setSearchFlightNumber] = useState("");
  const [searchAirline, setSearchAirline] = useState("");
  const [searchTerminal, setSearchTerminal] = useState("");
  const [searchDriver, setSearchDriver] = useState("");

  const { data: technicians = [] } = useQuery({
    queryKey: ['technicians'],
    queryFn: () => base44.entities.Technician.list('-expected_arrival_date'),
    staleTime: 5 * 60 * 1000,
  });

  const { data: camps = [] } = useQuery({
    queryKey: ['camps'],
    queryFn: () => base44.entities.Camp.list(),
    staleTime: 10 * 60 * 1000,
  });

  const { data: transferRequests = [] } = useQuery({
    queryKey: ['transfer-requests'],
    queryFn: () => base44.entities.TransferRequest.list(),
    staleTime: 5 * 60 * 1000,
  });

  const updatePickupMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Technician.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['technicians'] });
    },
  });

  const bulkUpdatePickupMutation = useMutation({
    mutationFn: async ({ techIds, data }) => {
      const promises = techIds.map(id => base44.entities.Technician.update(id, data));
      return Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['technicians'] });
    },
  });

  // Safe date helpers
  const safeParseDate = (dateString) => {
    if (!dateString) return null;
    try {
      const date = parseISO(dateString);
      return isValid(date) ? date : null;
    } catch {
      return null;
    }
  };

  const safeFormatDate = (dateString, formatString = 'dd/MMM/yyyy') => {
    if (!dateString) return '-';
    const date = safeParseDate(dateString);
    if (!date) return dateString;
    try {
      return format(date, formatString);
    } catch {
      return dateString;
    }
  };

  const safeIsToday = (dateString) => {
    try {
      const date = safeParseDate(dateString);
      return date && isToday(date);
    } catch {
      return false;
    }
  };

  const safeIsPast = (dateString) => {
    try {
      const date = safeParseDate(dateString);
      return date && isPast(date);
    } catch {
      return false;
    }
  };

  // Get technicians that are part of active transfer requests
  const techsInActiveTransfers = new Set();
  transferRequests.forEach(tr => {
    if (!['completed', 'cancelled'].includes(tr.status) && tr.technician_ids) {
      tr.technician_ids.forEach(id => techsInActiveTransfers.add(id));
    }
  });

  // Filter technicians with flight info and pending arrival (onboarding only, exclude camp-to-camp transfers)
  const pendingArrivals = (technicians || []).filter(t => 
    t.status === 'pending_arrival' && 
    t.flight_number && 
    !t.last_transfer_date && 
    !techsInActiveTransfers.has(t.id)
  );

  // Apply filters
  let filteredArrivals = pendingArrivals;

  // Search filter
  if (searchQuery.trim()) {
    const searchLower = searchQuery.toLowerCase();
    filteredArrivals = filteredArrivals.filter(tech =>
      tech.full_name?.toLowerCase().includes(searchLower) ||
      tech.employee_id?.toLowerCase().includes(searchLower) ||
      tech.flight_number?.toLowerCase().includes(searchLower) ||
      tech.airline?.toLowerCase().includes(searchLower) ||
      tech.pickup_driver_name?.toLowerCase().includes(searchLower)
    );
  }

  // Date filter
  if (filterDate !== 'all') {
    filteredArrivals = filteredArrivals.filter(tech => {
      if (filterDate === 'today') return safeIsToday(tech.expected_arrival_date);
      if (filterDate === 'overdue') return safeIsPast(tech.expected_arrival_date) && !safeIsToday(tech.expected_arrival_date);
      return true;
    });
  }

  // Pickup status filter
  if (filterPickupStatus !== 'all') {
    filteredArrivals = filteredArrivals.filter(tech => 
      (tech.pickup_status || 'not_scheduled') === filterPickupStatus
    );
  }

  // Camp filter
  if (filterCamp !== 'all') {
    filteredArrivals = filteredArrivals.filter(tech => tech.camp_id === filterCamp);
  }

  // Column filters
  if (filterEmployeeId.length > 0) {
    filteredArrivals = filteredArrivals.filter(tech => 
      filterEmployeeId.includes(tech.employee_id || '-')
    );
  }
  if (filterFullName.length > 0) {
    filteredArrivals = filteredArrivals.filter(tech => 
      filterFullName.includes(tech.full_name || '-')
    );
  }
  if (filterFlightNumber.length > 0) {
    filteredArrivals = filteredArrivals.filter(tech => 
      filterFlightNumber.includes(tech.flight_number || '-')
    );
  }
  if (filterAirline.length > 0) {
    filteredArrivals = filteredArrivals.filter(tech => 
      filterAirline.includes(tech.airline || '-')
    );
  }
  if (filterTerminal.length > 0) {
    filteredArrivals = filteredArrivals.filter(tech => 
      filterTerminal.includes(tech.arrival_terminal || '-')
    );
  }
  if (filterDriver.length > 0) {
    filteredArrivals = filteredArrivals.filter(tech => 
      filterDriver.includes(tech.pickup_driver_name || '-')
    );
  }

  // Sort
  const sortedArrivals = [...filteredArrivals].sort((a, b) => {
    let aVal, bVal;

    switch (sortField) {
      case 'expected_arrival_date':
        const aDate = safeParseDate(a.expected_arrival_date);
        const bDate = safeParseDate(b.expected_arrival_date);
        if (aDate && bDate) {
          aVal = aDate.getTime();
          bVal = bDate.getTime();
        } else {
          aVal = a[sortField] || '';
          bVal = b[sortField] || '';
        }
        break;
      default:
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
  const uniqueEmployeeIds = [...new Set(pendingArrivals.map(t => t.employee_id || '-'))].sort();
  const uniqueFullNames = [...new Set(pendingArrivals.map(t => t.full_name || '-'))].sort();
  const uniqueFlightNumbers = [...new Set(pendingArrivals.map(t => t.flight_number || '-'))].sort();
  const uniqueAirlines = [...new Set(pendingArrivals.map(t => t.airline || '-'))].sort();
  const uniqueTerminals = [...new Set(pendingArrivals.map(t => t.arrival_terminal || '-'))].sort();
  const uniqueDrivers = [...new Set(pendingArrivals.map(t => t.pickup_driver_name || '-'))].sort();

  // Stats
  const arrivingToday = (sortedArrivals || []).filter(t => safeIsToday(t.expected_arrival_date));
  const notScheduled = (sortedArrivals || []).filter(t => !t.pickup_status || t.pickup_status === 'not_scheduled');
  const driverDispatched = (sortedArrivals || []).filter(t => t.pickup_status === 'driver_dispatched');
  const pickedUp = (sortedArrivals || []).filter(t => t.pickup_status === 'picked_up');

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const clearAllFilters = () => {
    setSearchQuery("");
    setFilterDate("all");
    setFilterPickupStatus("all");
    setFilterCamp("all");
    setFilterEmployeeId([]);
    setFilterFullName([]);
    setFilterFlightNumber([]);
    setFilterAirline([]);
    setFilterTerminal([]);
    setFilterDriver([]);
  };

  const hasActiveFilters = 
    searchQuery.trim() !== "" ||
    filterDate !== "all" ||
    filterPickupStatus !== "all" ||
    filterCamp !== "all" ||
    filterEmployeeId.length > 0 ||
    filterFullName.length > 0 ||
    filterFlightNumber.length > 0 ||
    filterAirline.length > 0 ||
    filterTerminal.length > 0 ||
    filterDriver.length > 0;

  // Handle select all
  const handleSelectAll = () => {
    if (selectedTechs.length === sortedArrivals.filter(t => t.pickup_status !== 'arrived_at_camp').length && sortedArrivals.length > 0) {
      setSelectedTechs([]);
    } else {
      setSelectedTechs(sortedArrivals.filter(t => t.pickup_status !== 'arrived_at_camp').map(a => a.id));
    }
  };

  // Handle individual selection
  const handleSelectTech = (techId) => {
    if (selectedTechs.includes(techId)) {
      setSelectedTechs(selectedTechs.filter(id => id !== techId));
    } else {
      setSelectedTechs([...selectedTechs, techId]);
    }
  };

  // Stage 1: Schedule Pickup
  const handleSchedulePickup = (tech) => {
    setSelectedTech(tech);
    
    // Parse existing mobile number if available
    if (tech.pickup_driver_mobile) {
      const mobile = tech.pickup_driver_mobile.trim();
      const match = mobile.match(/^(\+\d+)\s*(.+)$/);
      if (match) {
        setDriverCountryCode(match[1]);
        setDriverMobileNumber(match[2].replace(/[\s\-\(\)]/g, ''));
      } else {
        setDriverCountryCode("+971");
        setDriverMobileNumber("");
      }
    } else {
      setDriverCountryCode("+971");
      setDriverMobileNumber("");
    }
    
    setScheduleData({
      pickup_driver_name: tech.pickup_driver_name || '',
      pickup_vehicle_number: tech.pickup_vehicle_number || ''
    });
    setDriverMobileError("");
    setShowScheduleDialog(true);
  };

  const handleBulkSchedule = () => {
    if (selectedTechs.length === 0) {
      alert('Please select at least one technician');
      return;
    }
    setSelectedTech(null);
    setDriverCountryCode("+971");
    setDriverMobileNumber("");
    setScheduleData({
      pickup_driver_name: '',
      pickup_vehicle_number: ''
    });
    setDriverMobileError("");
    setShowScheduleDialog(true);
  };

  const handleSaveSchedule = async () => {
    if (!scheduleData.pickup_driver_name || !scheduleData.pickup_vehicle_number) {
      alert('Please enter driver name and vehicle number');
      return;
    }

    // Validate mobile number - now mandatory
    if (!driverMobileNumber || !driverMobileNumber.trim()) {
      setDriverMobileError('Driver mobile number is required');
      return;
    }

    if (driverMobileNumber && driverMobileNumber.trim()) {
      const cleanNumber = driverMobileNumber.replace(/[\s\-\(\)]/g, '');
      
      // Check if digits only
      if (!/^\d+$/.test(cleanNumber)) {
        setDriverMobileError('Mobile number must contain only digits');
        return;
      }
      
      // Country-specific validation
      if (driverCountryCode === '+971') {
        // UAE: 9 digits (e.g., 501234567)
        if (cleanNumber.length !== 9) {
          setDriverMobileError('UAE mobile number must be 9 digits');
          return;
        }
      } else if (driverCountryCode === '+91') {
        // India: 10 digits
        if (cleanNumber.length !== 10) {
          setDriverMobileError('Indian mobile number must be 10 digits');
          return;
        }
      } else if (driverCountryCode === '+1') {
        // US/Canada: 10 digits
        if (cleanNumber.length !== 10) {
          setDriverMobileError('US/Canada mobile number must be 10 digits');
          return;
        }
      } else if (driverCountryCode === '+44') {
        // UK: 10 digits
        if (cleanNumber.length !== 10) {
          setDriverMobileError('UK mobile number must be 10 digits');
          return;
        }
      } else {
        // Generic validation for other countries (7-15 digits)
        if (cleanNumber.length < 7 || cleanNumber.length > 15) {
          setDriverMobileError('Mobile number must be 7-15 digits');
          return;
        }
      }
    }

    setDriverMobileError("");

    // Combine country code and mobile number
    const fullMobileNumber = driverMobileNumber && driverMobileNumber.trim() 
      ? `${driverCountryCode} ${driverMobileNumber.trim()}`
      : '';

    const updateData = {
      ...scheduleData,
      pickup_driver_mobile: fullMobileNumber,
      pickup_status: 'scheduled'
    };

    if (selectedTech) {
      await updatePickupMutation.mutateAsync({
        id: selectedTech.id,
        data: updateData
      });
      alert(`✅ Pickup scheduled for ${selectedTech.full_name}`);
    } else {
      await bulkUpdatePickupMutation.mutateAsync({
        techIds: selectedTechs,
        data: updateData
      });
      alert(`✅ Pickup scheduled for ${selectedTechs.length} technician(s)`);
    }

    setShowScheduleDialog(false);
    setSelectedTech(null);
    setSelectedTechs([]);
    setScheduleData({});
    setDriverMobileError("");
    setDriverCountryCode("+971");
    setDriverMobileNumber("");
  };

  // Stage 2: Dispatch Driver or Cancel
  const handleDispatchDriver = async (tech) => {
    // Validate required fields before dispatch
    if (!tech.pickup_driver_name || !tech.pickup_vehicle_number) {
      alert('❌ Cannot dispatch: Driver Name and Vehicle Number are required.\n\nPlease edit the pickup details to add missing information.');
      return;
    }

    if (!confirm(`Confirm dispatch driver for ${tech.full_name}?\n\nDriver: ${tech.pickup_driver_name}\nVehicle: ${tech.pickup_vehicle_number}`)) {
      return;
    }

    await updatePickupMutation.mutateAsync({
      id: tech.id,
      data: { pickup_status: 'driver_dispatched' }
    });
    alert(`✅ Driver dispatched for ${tech.full_name}`);
  };

  const handleCancelPickup = (tech) => {
    setSelectedTech(tech);
    setShowCancelDialog(true);
  };

  const handleConfirmCancel = async () => {
    if (!selectedTech) return;

    await updatePickupMutation.mutateAsync({
      id: selectedTech.id,
      data: {
        pickup_status: 'cancelled',
        pickup_driver_name: null,
        pickup_vehicle_number: null
      }
    });

    alert(`🚫 Pickup cancelled for ${selectedTech.full_name}`);
    setShowCancelDialog(false);
    setSelectedTech(null);
  };

  // Stage 3: Mark Picked Up with Verification
  const handleMarkPickedUp = (tech) => {
    setSelectedTech(tech);
    setVerificationData({
      pickup_name_verified: tech.pickup_name_verified || false,
      pickup_passport_verified: tech.pickup_passport_verified || false,
      pickup_refreshment_served: tech.pickup_refreshment_served || false,
      pickup_photo_url: tech.pickup_photo_url || '',
      pickup_passport_attachment_url: tech.pickup_passport_attachment_url || ''
    });
    setShowVerificationDialog(true);
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user' },
        audio: false 
      });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setShowCamera(true);
    } catch (err) {
      console.error('Error accessing camera:', err);
      alert('❌ Unable to access camera. Please check permissions.');
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setShowCamera(false);
  };

  const startPassportCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' },
        audio: false 
      });
      setPassportCameraStream(stream);
      if (passportVideoRef.current) {
        passportVideoRef.current.srcObject = stream;
      }
      setShowPassportCamera(true);
    } catch (err) {
      console.error('Error accessing camera:', err);
      alert('❌ Unable to access camera. Please check permissions.');
    }
  };

  const stopPassportCamera = () => {
    if (passportCameraStream) {
      passportCameraStream.getTracks().forEach(track => track.stop());
      setPassportCameraStream(null);
    }
    setShowPassportCamera(false);
  };

  const capturePassportPhoto = async () => {
    if (!passportVideoRef.current || !passportCanvasRef.current) return;

    const video = passportVideoRef.current;
    const canvas = passportCanvasRef.current;
    const context = canvas.getContext('2d');

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Get GPS location
    let location = 'Location unavailable';
    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 5000
        });
      });
      location = `${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}`;
    } catch (err) {
      console.error('Error getting location:', err);
    }

    // Add timestamp and location overlay
    const now = new Date();
    const timestamp = format(now, 'dd/MMM/yyyy HH:mm:ss');
    
    context.fillStyle = 'rgba(0, 0, 0, 0.7)';
    context.fillRect(0, canvas.height - 80, canvas.width, 80);
    
    context.fillStyle = 'white';
    context.font = 'bold 20px Arial';
    context.fillText(`📅 ${timestamp}`, 20, canvas.height - 45);
    context.fillText(`📍 ${location}`, 20, canvas.height - 15);

    canvas.toBlob(async (blob) => {
      setUploadingPassport(true);
      try {
        const file = new File([blob], `passport_${Date.now()}.jpg`, { type: 'image/jpeg' });
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        setVerificationData({ ...verificationData, pickup_passport_attachment_url: file_url });
        alert('✅ Passport captured and uploaded successfully');
        stopPassportCamera();
      } catch (err) {
        console.error('Error uploading passport photo:', err);
        alert(`❌ Failed to upload passport: ${err.message}`);
      } finally {
        setUploadingPassport(false);
      }
    }, 'image/jpeg', 0.95);
  };

  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    // Set canvas size to video size
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Get GPS location
    let location = 'Location unavailable';
    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 5000
        });
      });
      location = `${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}`;
    } catch (err) {
      console.error('Error getting location:', err);
    }

    // Add timestamp and location overlay
    const now = new Date();
    const timestamp = format(now, 'dd/MMM/yyyy HH:mm:ss');
    
    // Set up text styling
    context.fillStyle = 'rgba(0, 0, 0, 0.7)';
    context.fillRect(0, canvas.height - 80, canvas.width, 80);
    
    context.fillStyle = 'white';
    context.font = 'bold 20px Arial';
    context.fillText(`📅 ${timestamp}`, 20, canvas.height - 45);
    context.fillText(`📍 ${location}`, 20, canvas.height - 15);

    // Convert canvas to blob
    canvas.toBlob(async (blob) => {
      setUploadingPhoto(true);
      try {
        const file = new File([blob], `pickup_photo_${Date.now()}.jpg`, { type: 'image/jpeg' });
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        setVerificationData({ ...verificationData, pickup_photo_url: file_url });
        alert('✅ Photo captured and uploaded successfully');
        stopCamera();
      } catch (err) {
        console.error('Error uploading photo:', err);
        alert(`❌ Failed to upload photo: ${err.message}`);
      } finally {
        setUploadingPhoto(false);
      }
    }, 'image/jpeg', 0.95);
  };

  const handlePhotoUpload = async (file) => {
    if (!file) return;

    setUploadingPhoto(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setVerificationData({ ...verificationData, pickup_photo_url: file_url });
      alert('✅ Photo uploaded successfully');
    } catch (err) {
      console.error('Error uploading photo:', err);
      alert(`❌ Failed to upload photo: ${err.message}`);
    } finally {
      setUploadingPhoto(false);
    }
  };

  // Cleanup camera on dialog close
  React.useEffect(() => {
    if (!showVerificationDialog) {
      stopCamera();
      stopPassportCamera();
    }
  }, [showVerificationDialog]);

  const handlePassportUpload = async (file) => {
    if (!file) return;

    setUploadingPassport(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setVerificationData({ ...verificationData, pickup_passport_attachment_url: file_url });
      alert('✅ Passport document uploaded successfully');
    } catch (err) {
      console.error('Error uploading passport:', err);
      alert(`❌ Failed to upload passport: ${err.message}`);
    } finally {
      setUploadingPassport(false);
    }
  };

  const handleSaveVerification = async () => {
    if (!verificationData.pickup_name_verified) {
      alert('❌ Please verify the technician\'s name before proceeding');
      return;
    }

    if (!verificationData.pickup_passport_verified) {
      alert('❌ Please verify the technician\'s passport before proceeding');
      return;
    }

    if (!verificationData.pickup_photo_url) {
      alert('❌ Please upload a photo of the technician before proceeding');
      return;
    }

    if (!verificationData.pickup_passport_attachment_url) {
      alert('❌ Please upload the passport document before proceeding');
      return;
    }

    // Capture system date and time
    const now = new Date();
    const verificationDate = format(now, 'yyyy-MM-dd');
    const verificationTime = format(now, 'HH:mm');

    await updatePickupMutation.mutateAsync({
      id: selectedTech.id,
      data: {
        ...verificationData,
        pickup_verification_date: verificationDate,
        pickup_verification_time: verificationTime,
        pickup_status: 'picked_up'
      }
    });

    alert(`✅ ${selectedTech.full_name} marked as picked up with verification complete`);
    setShowVerificationDialog(false);
    setSelectedTech(null);
    setVerificationData({});
  };



  const exportToCSV = () => {
    const headers = ['Employee ID', 'Full Name', 'Flight Number', 'Airline', 'Terminal', 'Expected Date', 'Expected Time', 'Actual Landing', 'Pickup Status', 'Driver', 'Vehicle', 'Name Verified', 'Refreshment Served', 'Photo Uploaded', 'Camp'];
    
    const rows = sortedArrivals.map(tech => {
      const camp = camps.find(c => c.id === tech.camp_id);
      return [
        tech.employee_id,
        tech.full_name,
        tech.flight_number || '-',
        tech.airline || '-',
        tech.arrival_terminal || '-',
        safeFormatDate(tech.expected_arrival_date),
        tech.expected_arrival_time || '-',
        tech.actual_landing_time || '-',
        tech.pickup_status || 'not_scheduled',
        tech.pickup_driver_name || '-',
        tech.pickup_vehicle_number || '-',
        tech.pickup_name_verified ? 'Yes' : 'No',
        tech.pickup_refreshment_served ? 'Yes' : 'No',
        tech.pickup_photo_url ? 'Yes' : 'No',
        camp?.name || '-'
      ];
    });

    const csv = [headers, ...rows].map(row => 
      row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    ).join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `airport_pickups_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const getPickupBadge = (status) => {
    const badges = {
      'not_scheduled': { text: 'Not Scheduled', class: 'bg-gray-100 text-gray-700' },
      'scheduled': { text: 'Scheduled', class: 'bg-blue-100 text-blue-700' },
      'driver_dispatched': { text: 'Driver Dispatched', class: 'bg-orange-100 text-orange-700' },
      'picked_up': { text: 'Picked Up ✓', class: 'bg-green-100 text-green-700' },
      'arrived_at_camp': { text: 'At Camp', class: 'bg-purple-600 text-white' },
      'cancelled': { text: 'Cancelled', class: 'bg-red-100 text-red-700' }
    };
    return badges[status] || badges['not_scheduled'];
  };

  // Get action button for each stage
  const getActionButton = (tech) => {
    const status = tech.pickup_status || 'not_scheduled';

    switch (status) {
      case 'not_scheduled':
        return (
          <div className="flex gap-2">
            <Button
              onClick={() => window.open(`/Technicians?edit=${tech.id}`, '_blank')}
              size="sm"
              variant="outline"
              className="border-gray-600 text-gray-600 hover:bg-gray-50"
            >
              <Edit className="w-3 h-3 mr-1" />
              Edit
            </Button>
            <Button
              onClick={() => handleSchedulePickup(tech)}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Car className="w-3 h-3 mr-1" />
              Schedule
            </Button>
          </div>
        );
      
      case 'scheduled':
        return (
          <div className="flex gap-2">
            <Button
              onClick={() => handleSchedulePickup(tech)}
              size="sm"
              variant="outline"
              className="border-blue-600 text-blue-600 hover:bg-blue-50"
            >
              Edit
            </Button>
            <Button
              onClick={() => handleDispatchDriver(tech)}
              size="sm"
              className="bg-orange-600 hover:bg-orange-700"
            >
              <Car className="w-3 h-3 mr-1" />
              Dispatch
            </Button>
            <Button
              onClick={() => handleCancelPickup(tech)}
              size="sm"
              variant="outline"
              className="border-red-600 text-red-600 hover:bg-red-50"
            >
              <XCircle className="w-3 h-3 mr-1" />
              Cancel
            </Button>
          </div>
        );
      
      case 'driver_dispatched':
        return (
          <div className="flex gap-2">
            <Button
              onClick={() => handleMarkPickedUp(tech)}
              size="sm"
              className="bg-green-600 hover:bg-green-700"
            >
              <Camera className="w-3 h-3 mr-1" />
              Mark Picked Up
            </Button>
            <Button
              onClick={() => handleCancelPickup(tech)}
              size="sm"
              variant="outline"
              className="border-red-600 text-red-600 hover:bg-red-50"
            >
              <XCircle className="w-3 h-3 mr-1" />
              Cancel
            </Button>
          </div>
        );
      
      case 'picked_up':
        return (
          <Badge className="bg-purple-100 text-purple-700">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Awaiting Confirmation
          </Badge>
        );
      
      case 'arrived_at_camp':
        return (
          <Badge className="bg-green-100 text-green-700">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Completed
          </Badge>
        );
      
      case 'cancelled':
        return (
          <Button
            onClick={() => handleSchedulePickup(tech)}
            size="sm"
            variant="outline"
            className="border-blue-600 text-blue-600"
          >
            Reschedule
          </Button>
        );
      
      default:
        return null;
    }
  };

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
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
              <Car className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Airport Pickup Management</h1>
              <p className="text-gray-600 mt-1">Multi-stage pickup process with verification</p>
            </div>
          </div>
          <div className="flex gap-2">
            {selectedTechs.length > 0 && notScheduled.some(t => selectedTechs.includes(t.id)) && (
              <Button 
                onClick={handleBulkSchedule}
                className="bg-purple-600 hover:bg-purple-700"
              >
                <Car className="w-4 h-4 mr-2" />
                Schedule Pickup ({selectedTechs.length})
              </Button>
            )}
            <Button variant="outline" onClick={exportToCSV} className="border-blue-600 text-blue-600 hover:bg-blue-50">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Workflow Guide Alert */}
        <Alert className="border-blue-200 bg-blue-50">
          <AlertCircle className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-900">
            <strong>📍 Step 2 of 6: Airport Pickup Management</strong><br/>
            <span className="text-sm">
              Schedule pickup → Dispatch driver → Verify at airport (photo + passport) → Mark picked up → Next: Expected Arrivals (for camp confirmation)
            </span>
          </AlertDescription>
        </Alert>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card className="border-none shadow-md bg-gradient-to-br from-blue-50 to-blue-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-600 mb-1">Total Scheduled</p>
                  <p className="text-3xl font-bold text-blue-900">{sortedArrivals.length}</p>
                </div>
                <Plane className="w-10 h-10 text-blue-600 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-md bg-gradient-to-br from-green-50 to-green-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-600 mb-1">Arriving Today</p>
                  <p className="text-3xl font-bold text-green-900">{arrivingToday.length}</p>
                </div>
                <Calendar className="w-10 h-10 text-green-600 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-md bg-gradient-to-br from-gray-50 to-gray-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Not Scheduled</p>
                  <p className="text-3xl font-bold text-gray-900">{notScheduled.length}</p>
                </div>
                <AlertCircle className="w-10 h-10 text-gray-600 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-md bg-gradient-to-br from-orange-50 to-orange-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-orange-600 mb-1">Driver Dispatched</p>
                  <p className="text-3xl font-bold text-orange-900">{driverDispatched.length}</p>
                </div>
                <Car className="w-10 h-10 text-orange-600 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-md bg-gradient-to-br from-purple-50 to-purple-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-600 mb-1">Picked Up</p>
                  <p className="text-3xl font-bold text-purple-900">{pickedUp.length}</p>
                </div>
                <CheckCircle2 className="w-10 h-10 text-purple-600 opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="border-none shadow-md">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="relative">
                <Input
                  placeholder="Search flights, drivers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
                <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              </div>

              <Select value={filterDate} onValueChange={setFilterDate}>
                <SelectTrigger>
                  <SelectValue placeholder="All Dates" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Dates</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterPickupStatus} onValueChange={setFilterPickupStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="not_scheduled">Not Scheduled</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="driver_dispatched">Driver Dispatched</SelectItem>
                  <SelectItem value="picked_up">Picked Up</SelectItem>
                  <SelectItem value="arrived_at_camp">Arrived at Camp</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterCamp} onValueChange={setFilterCamp}>
                <SelectTrigger>
                  <SelectValue placeholder="All Camps" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Camps</SelectItem>
                  {camps.map(camp => (
                    <SelectItem key={camp.id} value={camp.id}>{camp.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {hasActiveFilters && (
                <Button
                  variant="outline"
                  onClick={clearAllFilters}
                  className="border-blue-600 text-blue-600 hover:bg-blue-50"
                >
                  <X className="w-4 h-4 mr-2" />
                  Clear Filters
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card className="border-none shadow-lg">
          {hasActiveFilters && (
            <div className="bg-blue-50 border-b border-blue-200 px-6 py-3">
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
                  Clear All
                </Button>
              </div>
            </div>
          )}

          <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50 border-b">
            <CardTitle>Scheduled Airport Pickups ({sortedArrivals.length})</CardTitle>
          </CardHeader>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse bg-white">
              <thead>
                <tr className="border-b-2 border-gray-300">
                  <th className="px-2 py-2 text-center text-xs font-semibold text-gray-700 uppercase bg-gray-50 border-r" style={{ width: '40px' }}>
                    <Checkbox
                      checked={selectedTechs.length === sortedArrivals.filter(t => t.pickup_status !== 'arrived_at_camp').length && sortedArrivals.filter(t => t.pickup_status !== 'arrived_at_camp').length > 0}
                      onCheckedChange={handleSelectAll}
                      disabled={sortedArrivals.filter(t => t.pickup_status !== 'arrived_at_camp').length === 0}
                    />
                  </th>
                  <th className="px-2 py-2 text-center text-xs font-semibold text-gray-700 uppercase bg-gray-50 border-r" style={{ width: '140px' }}>
                    Actions
                  </th>
                  <th className="px-2 py-2 text-left text-xs font-semibold text-gray-700 uppercase bg-gray-50 border-r" style={{ width: '90px' }}>
                    <div className="flex items-center justify-between gap-1">
                      <span className="whitespace-nowrap">EMP ID</span>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" className="h-6 px-1" onClick={() => handleSort('employee_id')}>
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
                  <th className="px-2 py-2 text-left text-xs font-semibold text-gray-700 uppercase bg-gray-50 border-r" style={{ width: '130px' }}>
                    <div className="flex items-center justify-between gap-1">
                      <span className="whitespace-nowrap">Name</span>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" className="h-6 px-1" onClick={() => handleSort('full_name')}>
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
                  <th className="px-2 py-2 text-left text-xs font-semibold text-gray-700 uppercase bg-gray-50 border-r" style={{ width: '100px' }}>
                    <div className="flex items-center justify-between gap-1">
                      <span className="whitespace-nowrap">Flight</span>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" className="h-6 px-1" onClick={() => handleSort('flight_number')}>
                          <ArrowUpDown className="w-3 h-3" />
                        </Button>
                        <ColumnFilter
                          values={uniqueFlightNumbers}
                          selected={filterFlightNumber}
                          setSelected={setFilterFlightNumber}
                          searchValue={searchFlightNumber}
                          setSearchValue={setSearchFlightNumber}
                        />
                      </div>
                    </div>
                  </th>
                  <th className="px-2 py-2 text-left text-xs font-semibold text-gray-700 uppercase bg-gray-50 border-r">
                    <div className="flex items-center justify-between gap-1">
                      <span className="whitespace-nowrap">Airline</span>
                      <ColumnFilter
                        values={uniqueAirlines}
                        selected={filterAirline}
                        setSelected={setFilterAirline}
                        searchValue={searchAirline}
                        setSearchValue={setSearchAirline}
                      />
                    </div>
                  </th>
                  <th className="px-2 py-2 text-left text-xs font-semibold text-gray-700 uppercase bg-gray-50 border-r">
                    <div className="flex items-center justify-between gap-1">
                      <span className="whitespace-nowrap">Terminal</span>
                      <ColumnFilter
                        values={uniqueTerminals}
                        selected={filterTerminal}
                        setSelected={setFilterTerminal}
                        searchValue={searchTerminal}
                        setSearchValue={setSearchTerminal}
                      />
                    </div>
                  </th>
                  <th className="px-2 py-2 text-left text-xs font-semibold text-gray-700 uppercase bg-gray-50 border-r">
                    <div className="flex items-center justify-between gap-1">
                      <span className="whitespace-nowrap">Expected</span>
                      <Button variant="ghost" size="sm" className="h-6 px-1" onClick={() => handleSort('expected_arrival_date')}>
                        <ArrowUpDown className="w-3 h-3" />
                      </Button>
                    </div>
                  </th>
                  <th className="px-2 py-2 text-left text-xs font-semibold text-gray-700 uppercase bg-gray-50 border-r">
                    <span className="whitespace-nowrap">Landed</span>
                  </th>
                  <th className="px-2 py-2 text-left text-xs font-semibold text-gray-700 uppercase bg-gray-50 border-r" style={{ width: '110px' }}>
                    <span className="whitespace-nowrap">Status</span>
                  </th>
                  <th className="px-2 py-2 text-left text-xs font-semibold text-gray-700 uppercase bg-gray-50 border-r" style={{ width: '100px' }}>
                    <div className="flex items-center justify-between gap-1">
                      <span className="whitespace-nowrap">Driver</span>
                      <ColumnFilter
                        values={uniqueDrivers}
                        selected={filterDriver}
                        setSelected={setFilterDriver}
                        searchValue={searchDriver}
                        setSearchValue={setSearchDriver}
                      />
                    </div>
                  </th>
                  <th className="px-2 py-2 text-left text-xs font-semibold text-gray-700 uppercase bg-gray-50 border-r">
                    <span className="whitespace-nowrap">Vehicle</span>
                  </th>
                  <th className="px-2 py-2 text-left text-xs font-semibold text-gray-700 uppercase bg-gray-50 border-r">
                    <span className="whitespace-nowrap">Verification</span>
                  </th>
                  <th className="px-2 py-2 text-left text-xs font-semibold text-gray-700 uppercase bg-gray-50 border-r">
                    <span className="whitespace-nowrap">Camp</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedArrivals.length === 0 ? (
                <tr>
                  <td colSpan="14" className="px-6 py-12 text-center">
                      <Plane className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <p className="text-lg font-medium text-gray-500">
                        {hasActiveFilters ? 'No pickups match your filters' : 'No scheduled pickups'}
                      </p>
                      <p className="text-sm text-gray-400 mt-2">
                        {hasActiveFilters ? 'Try adjusting your filters' : 'Flight information will appear here for pending arrivals'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  sortedArrivals.map((tech, index) => {
                    const camp = camps.find(c => c.id === tech.camp_id);
                    const pickupBadge = getPickupBadge(tech.pickup_status);
                    const isOverdue = safeIsPast(tech.expected_arrival_date) && !safeIsToday(tech.expected_arrival_date);
                    const isToday = safeIsToday(tech.expected_arrival_date);
                    const isSelected = selectedTechs.includes(tech.id);
                    const hasArrivedAtCamp = tech.pickup_status === 'arrived_at_camp';

                    return (
                      <tr
                        key={tech.id}
                        className={`border-b border-gray-200 hover:bg-blue-50 transition-colors ${
                          isSelected ? 'bg-blue-100' :
                          isOverdue ? 'bg-red-50' :
                          isToday ? 'bg-green-50' :
                          index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                        }`}
                      >
                        <td className="px-2 py-2 text-center border-r">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => handleSelectTech(tech.id)}
                            disabled={hasArrivedAtCamp || tech.pickup_status === 'scheduled' || tech.pickup_status === 'driver_dispatched' || tech.pickup_status === 'picked_up'}
                          />
                        </td>
                        <td className="px-2 py-2 text-center border-r">
                          {getActionButton(tech)}
                        </td>
                        <td className="px-2 py-2 text-xs font-medium text-blue-600 border-r">
                          {tech.employee_id}
                        </td>
                        <td className="px-2 py-2 text-xs font-medium text-gray-900 border-r">
                          {tech.full_name}
                        </td>
                        <td className="px-2 py-2 border-r">
                          <div className="flex items-center gap-1">
                            <Plane className="w-3 h-3 text-blue-600" />
                            <span className="text-xs font-medium text-blue-700">{tech.flight_number}</span>
                          </div>
                        </td>
                        <td className="px-2 py-2 text-xs text-gray-700 border-r">
                          {tech.airline || '-'}
                        </td>
                        <td className="px-2 py-2 text-xs text-gray-700 border-r">
                          {tech.arrival_terminal || '-'}
                        </td>
                        <td className="px-2 py-2 text-xs border-r">
                          <div>
                            <p className="font-medium text-gray-900">{safeFormatDate(tech.expected_arrival_date)}</p>
                            {tech.expected_arrival_time && (
                              <p className="text-[10px] text-gray-500">{tech.expected_arrival_time}</p>
                            )}
                          </div>
                        </td>
                        <td className="px-2 py-2 text-xs text-gray-700 border-r">
                          {tech.actual_landing_time || '-'}
                        </td>
                        <td className="px-2 py-2 border-r">
                          <Badge className={`${pickupBadge.class} text-[10px] px-1.5 py-0.5`}>
                            {pickupBadge.text}
                          </Badge>
                        </td>
                        <td className="px-2 py-2 text-xs text-gray-700 border-r">
                          {tech.pickup_driver_name || '-'}
                        </td>
                        <td className="px-2 py-2 text-xs text-gray-700 border-r">
                          {tech.pickup_vehicle_number || '-'}
                        </td>
                        <td className="px-2 py-2 border-r">
                          {tech.pickup_status === 'picked_up' || tech.pickup_status === 'arrived_at_camp' ? (
                            <div className="space-y-0.5">
                              {tech.pickup_name_verified && (
                                <Badge variant="outline" className="bg-green-50 text-green-700 text-[9px] px-1 py-0 block">
                                  <CheckCircle2 className="w-2 h-2 mr-0.5" />
                                  Name
                                </Badge>
                              )}
                              {tech.pickup_refreshment_served && (
                                <Badge variant="outline" className="bg-blue-50 text-blue-700 text-[9px] px-1 py-0 block">
                                  <CheckCircle2 className="w-2 h-2 mr-0.5" />
                                  Ref.
                                </Badge>
                              )}
                              {tech.pickup_photo_url && (
                                <Badge variant="outline" className="bg-purple-50 text-purple-700 text-[9px] px-1 py-0 block">
                                  <Camera className="w-2 h-2 mr-0.5" />
                                  Photo
                                </Badge>
                              )}
                            </div>
                          ) : (
                            <span className="text-[10px] text-gray-400">Pending</span>
                          )}
                        </td>
                        <td className="px-2 py-2 text-xs text-gray-700 border-r">
                          {camp?.name || '-'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="bg-gray-50 px-6 py-3 border-t">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">
                Showing <span className="font-semibold">{sortedArrivals.length}</span> of {pendingArrivals.length} scheduled pickups
              </p>
              {selectedTechs.length > 0 && (
                <p className="text-sm font-medium text-blue-600">
                  {selectedTechs.length} selected
                </p>
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* Stage 1: Schedule Pickup Dialog */}
      <Dialog open={showScheduleDialog} onOpenChange={setShowScheduleDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Car className="w-5 h-5 text-blue-600" />
              {selectedTech ? `Schedule Pickup - ${selectedTech.full_name}` : `Schedule Pickup (${selectedTechs.length} technicians)`}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {selectedTech ? (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="font-semibold text-gray-900">{selectedTech.full_name}</p>
                <p className="text-sm text-gray-600">{selectedTech.employee_id}</p>
                <div className="mt-2 flex items-center gap-2 text-sm">
                  <Plane className="w-4 h-4 text-blue-600" />
                  <span className="font-medium">{selectedTech.flight_number}</span>
                  <span className="text-gray-500">•</span>
                  <span>{safeFormatDate(selectedTech.expected_arrival_date)}</span>
                </div>
              </div>
            ) : (
              <Alert className="bg-blue-50 border-blue-200">
                <Users className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-900">
                  <strong>Bulk Scheduling:</strong> Assigning same driver & vehicle to {selectedTechs.length} technician(s)
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Driver Name*</Label>
                <Input
                  required
                  placeholder="e.g., Ahmed Khan"
                  value={scheduleData.pickup_driver_name || ''}
                  onChange={(e) => setScheduleData({ ...scheduleData, pickup_driver_name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Driver Mobile Number*</Label>
                <div className="flex gap-2">
                  <Select value={driverCountryCode} onValueChange={setDriverCountryCode}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="+971">🇦🇪 +971 (UAE)</SelectItem>
                      <SelectItem value="+91">🇮🇳 +91 (India)</SelectItem>
                      <SelectItem value="+1">🇺🇸 +1 (US/CA)</SelectItem>
                      <SelectItem value="+44">🇬🇧 +44 (UK)</SelectItem>
                      <SelectItem value="+92">🇵🇰 +92 (Pakistan)</SelectItem>
                      <SelectItem value="+971">🇸🇦 +966 (Saudi)</SelectItem>
                      <SelectItem value="+20">🇪🇬 +20 (Egypt)</SelectItem>
                      <SelectItem value="+974">🇶🇦 +974 (Qatar)</SelectItem>
                      <SelectItem value="+965">🇰🇼 +965 (Kuwait)</SelectItem>
                      <SelectItem value="+973">🇧🇭 +973 (Bahrain)</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    type="tel"
                    placeholder={
                      driverCountryCode === '+971' ? '501234567' :
                      driverCountryCode === '+91' ? '9876543210' :
                      driverCountryCode === '+1' ? '2025551234' :
                      '1234567890'
                    }
                    value={driverMobileNumber}
                    onChange={(e) => {
                      const value = e.target.value;
                      // Only allow digits
                      if (/^\d*$/.test(value)) {
                        let maxLength = 15;
                        if (driverCountryCode === '+971') maxLength = 9;
                        else if (driverCountryCode === '+91') maxLength = 10;
                        else if (driverCountryCode === '+1') maxLength = 10;
                        else if (driverCountryCode === '+44') maxLength = 10;
                        
                        if (value.length <= maxLength) {
                          setDriverMobileNumber(value);
                          setDriverMobileError("");
                        }
                      }
                    }}
                    className={`flex-1 ${driverMobileError ? 'border-red-500' : ''}`}
                  />
                </div>
                <p className="text-xs text-gray-500">
                  {driverCountryCode === '+971' && 'UAE: 9 digits (e.g., 501234567)'}
                  {driverCountryCode === '+91' && 'India: 10 digits (e.g., 9876543210)'}
                  {driverCountryCode === '+1' && 'US/Canada: 10 digits (e.g., 2025551234)'}
                  {driverCountryCode === '+44' && 'UK: 10 digits (e.g., 7400123456)'}
                  {!['+971', '+91', '+1', '+44'].includes(driverCountryCode) && 'Enter mobile number without country code'}
                </p>
                {driverMobileError && (
                  <p className="text-sm text-red-600">{driverMobileError}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Vehicle Number*</Label>
                <Input
                  required
                  placeholder="e.g., DXB-12345"
                  value={scheduleData.pickup_vehicle_number || ''}
                  onChange={(e) => setScheduleData({ ...scheduleData, pickup_vehicle_number: e.target.value })}
                />
              </div>
              </div>
              </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowScheduleDialog(false);
              setSelectedTech(null);
              setSelectedTechs([]);
              setScheduleData({});
              setDriverMobileError("");
              setDriverCountryCode("+971");
              setDriverMobileNumber("");
            }}>
              Cancel
            </Button>
            <Button onClick={handleSaveSchedule} className="bg-blue-600 hover:bg-blue-700">
              <Car className="w-4 h-4 mr-2" />
              Schedule Pickup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stage 3: Pickup Verification Dialog */}
      <Dialog open={showVerificationDialog} onOpenChange={setShowVerificationDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Camera className="w-5 h-5 text-green-600" />
              Pickup Verification - {selectedTech?.full_name}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4 overflow-y-auto flex-1">
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-900">
                <strong>Required Verification:</strong> Please verify name, verify passport, upload photo, upload passport document, and confirm refreshment service before proceeding.
              </AlertDescription>
            </Alert>

            {selectedTech && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="font-semibold text-gray-900">{selectedTech.full_name}</p>
                <p className="text-sm text-gray-600">{selectedTech.employee_id}</p>
                <div className="mt-2 flex items-center gap-2 text-sm">
                  <Plane className="w-4 h-4 text-blue-600" />
                  <span>{selectedTech.flight_number}</span>
                  <span className="text-gray-500">•</span>
                  <Car className="w-4 h-4 text-orange-600" />
                  <span>{selectedTech.pickup_vehicle_number}</span>
                </div>
              </div>
            )}

            <div className="space-y-4 border-t pt-4">
              <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg border-2 border-green-200">
                <Checkbox
                  id="name_verified"
                  checked={verificationData.pickup_name_verified || false}
                  onCheckedChange={(checked) => setVerificationData({ ...verificationData, pickup_name_verified: checked })}
                />
                <Label htmlFor="name_verified" className="cursor-pointer font-semibold text-green-900">
                  ✓ Name Verified at Pickup (Required)
                </Label>
              </div>

              <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg border-2 border-green-200">
                <Checkbox
                  id="passport_verified"
                  checked={verificationData.pickup_passport_verified || false}
                  onCheckedChange={(checked) => setVerificationData({ ...verificationData, pickup_passport_verified: checked })}
                />
                <Label htmlFor="passport_verified" className="cursor-pointer font-semibold text-green-900">
                  ✓ Passport Verified at Pickup (Required)
                </Label>
              </div>

              <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <Checkbox
                  id="refreshment_served"
                  checked={verificationData.pickup_refreshment_served || false}
                  onCheckedChange={(checked) => setVerificationData({ ...verificationData, pickup_refreshment_served: checked })}
                />
                <Label htmlFor="refreshment_served" className="cursor-pointer font-medium">
                  Refreshment Served During Pickup
                </Label>
              </div>

              <div className="space-y-2">
                <Label className="font-semibold text-gray-900">Capture Photo of Technician* (Required)</Label>

                {!verificationData.pickup_photo_url && !showCamera && (
                  <Button
                    type="button"
                    onClick={startCamera}
                    disabled={uploadingPhoto}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    Take Photo (Live Camera)
                  </Button>
                )}

                {showCamera && (
                  <div className="mt-3 space-y-3">
                    <div className="relative bg-black rounded-lg overflow-hidden">
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        className="w-full h-auto"
                      />
                      <canvas ref={canvasRef} className="hidden" />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        onClick={capturePhoto}
                        disabled={uploadingPhoto}
                        className="flex-1 bg-green-600 hover:bg-green-700"
                      >
                        <Camera className="w-4 h-4 mr-2" />
                        {uploadingPhoto ? 'Processing...' : 'Capture Photo'}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={stopCamera}
                        disabled={uploadingPhoto}
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                    </div>
                    <p className="text-xs text-gray-600">
                      📍 Photo will include timestamp and GPS location
                    </p>
                  </div>
                )}

                {uploadingPhoto && (
                  <div className="flex items-center gap-2 text-blue-600">
                    <Clock className="w-4 h-4 animate-spin" />
                    <span className="text-sm">Uploading photo...</span>
                  </div>
                )}

                {verificationData.pickup_photo_url && (
                  <div className="mt-3 p-3 bg-gray-50 rounded-lg border">
                    <p className="text-sm font-medium text-gray-700 mb-2">Captured Photo:</p>
                    <img 
                      src={verificationData.pickup_photo_url} 
                      alt="Technician at pickup" 
                      className="w-full max-w-md h-auto object-cover rounded-lg border-2 border-green-500 shadow-md"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setVerificationData({ ...verificationData, pickup_photo_url: '' });
                        stopCamera();
                      }}
                      className="mt-2 text-red-600 hover:text-red-700"
                    >
                      <X className="w-4 h-4 mr-1" />
                      Remove & Retake
                    </Button>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label className="font-semibold text-gray-900">Capture Passport Document* (Required)</Label>

                {!verificationData.pickup_passport_attachment_url && !showPassportCamera && (
                  <Button
                    type="button"
                    onClick={startPassportCamera}
                    disabled={uploadingPassport}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    Take Photo (Live Camera)
                  </Button>
                )}

                {showPassportCamera && (
                  <div className="mt-3 space-y-3">
                    <div className="relative bg-black rounded-lg overflow-hidden">
                      <video
                        ref={passportVideoRef}
                        autoPlay
                        playsInline
                        className="w-full h-auto"
                      />
                      <canvas ref={passportCanvasRef} className="hidden" />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        onClick={capturePassportPhoto}
                        disabled={uploadingPassport}
                        className="flex-1 bg-green-600 hover:bg-green-700"
                      >
                        <Camera className="w-4 h-4 mr-2" />
                        {uploadingPassport ? 'Processing...' : 'Capture Passport'}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={stopPassportCamera}
                        disabled={uploadingPassport}
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                    </div>
                    <p className="text-xs text-gray-600">
                      📍 Photo will include timestamp and GPS location
                    </p>
                  </div>
                )}

                {uploadingPassport && (
                  <div className="flex items-center gap-2 text-blue-600">
                    <Clock className="w-4 h-4 animate-spin" />
                    <span className="text-sm">Uploading passport document...</span>
                  </div>
                )}

                {verificationData.pickup_passport_attachment_url && (
                  <div className="mt-3 p-3 bg-gray-50 rounded-lg border">
                    <p className="text-sm font-medium text-gray-700 mb-2">Captured Document:</p>
                    <img 
                      src={verificationData.pickup_passport_attachment_url} 
                      alt="Passport document" 
                      className="w-full max-w-md h-auto object-cover rounded-lg border-2 border-green-500 shadow-md"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setVerificationData({ ...verificationData, pickup_passport_attachment_url: '' });
                        stopPassportCamera();
                      }}
                      className="mt-2 text-red-600 hover:text-red-700"
                    >
                      <X className="w-4 h-4 mr-1" />
                      Remove & Retake
                    </Button>
                  </div>
                )}
              </div>

              <div className="space-y-2 pt-4 border-t">
                <Label className="text-sm text-gray-600">Verification Timestamp (Auto-generated)</Label>
                <div className="flex items-center gap-2 p-3 bg-gray-100 rounded-lg border">
                  <Clock className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">
                    Will be recorded when verification is completed
                  </span>
                </div>
              </div>
              </div>
              </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowVerificationDialog(false);
              setSelectedTech(null);
              setVerificationData({});
            }}>
              Cancel
            </Button>
            <Button 
              onClick={handleSaveVerification} 
              disabled={uploadingPhoto || uploadingPassport || !verificationData.pickup_name_verified || !verificationData.pickup_passport_verified || !verificationData.pickup_photo_url || !verificationData.pickup_passport_attachment_url}
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Complete Verification
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Pickup Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-600" />
              Cancel Pickup
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <Alert className="bg-red-50 border-red-200">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-900">
                <strong>Confirm Cancellation:</strong> This will cancel the airport pickup for {selectedTech?.full_name} and clear the driver/vehicle assignment.
              </AlertDescription>
            </Alert>

            {selectedTech && (
              <div className="p-4 bg-gray-50 rounded-lg border">
                <p className="text-sm text-gray-600 mb-1">Technician</p>
                <p className="font-semibold">{selectedTech.full_name} ({selectedTech.employee_id})</p>
                <p className="text-sm text-gray-600 mt-2">Driver: {selectedTech.pickup_driver_name}</p>
                <p className="text-sm text-gray-600">Vehicle: {selectedTech.pickup_vehicle_number}</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowCancelDialog(false);
              setSelectedTech(null);
            }}>
              Go Back
            </Button>
            <Button onClick={handleConfirmCancel} className="bg-red-600 hover:bg-red-700">
              <XCircle className="w-4 h-4 mr-2" />
              Confirm Cancellation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}