import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, UserPlus, LogOut, AlertCircle, Upload, Download, ArrowUpDown, Filter, X, Search, Printer, CheckCircle2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { format, parseISO, differenceInDays, parse, isValid } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";

export default function Visitors() {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showCheckOutDialog, setShowCheckOutDialog] = useState(false);
  const [showBulkUploadDialog, setShowBulkUploadDialog] = useState(false);
  const [selectedVisitor, setSelectedVisitor] = useState(null);
  const [formData, setFormData] = useState({
    check_in_date: format(new Date(), 'yyyy-MM-dd'),
    check_in_time: format(new Date(), 'HH:mm')
  });
  const [bulkFile, setBulkFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState("check_in_date");
  const [sortDirection, setSortDirection] = useState("desc");
  const [activeTab, setActiveTab] = useState("checked_in");
  
  // Excel-style column filters
  const [filterName, setFilterName] = useState([]);
  const [filterType, setFilterType] = useState([]);
  const [filterCompany, setFilterCompany] = useState([]);
  const [filterContact, setFilterContact] = useState([]);
  const [filterPurpose, setFilterPurpose] = useState([]);
  const [filterCamp, setFilterCamp] = useState([]);
  const [filterHost, setFilterHost] = useState([]);
  const [filterCheckInDate, setFilterCheckInDate] = useState([]);
  const [filterStatus, setFilterStatus] = useState([]);

  // Search states for column filters
  const [searchName, setSearchName] = useState("");
  const [searchType, setSearchType] = useState("");
  const [searchCompany, setSearchCompany] = useState("");
  const [searchContact, setSearchContact] = useState("");
  const [searchPurpose, setSearchPurpose] = useState("");
  const [searchCamp, setSearchCamp] = useState("");
  const [searchHost, setSearchHost] = useState("");
  const [searchCheckInDate, setSearchCheckInDate] = useState("");
  const [searchStatus, setSearchStatus] = useState("");
  
  const queryClient = useQueryClient();

  const [campSearch, setCampSearch] = useState("");

  const [duplicateWarning, setDuplicateWarning] = useState(null);

  const { data: fetchedVisitors = [] } = useQuery({ // Renamed 'visitors' to 'fetchedVisitors'
    queryKey: ['visitors'],
    queryFn: () => base44.entities.Visitor.list('-check_in_date'),
  });

  const { data: camps = [] } = useQuery({
    queryKey: ['camps'],
    queryFn: () => base44.entities.Camp.list(),
  });

  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
  });

  // Find Al Quoz camp (it must exist in the `camps` data from API)
  const alQuozCamp = useMemo(() => {
    return camps.find(c => c.code === 'AQ' || c.name?.toLowerCase().includes('al quoz'));
  }, [camps]);

  // Generate 10 sample visitors (mock data)
  const sampleVisitors = useMemo(() => {
    if (!alQuozCamp) return []; // Only generate if Al Quoz camp is found

    const today = format(new Date(), 'yyyy-MM-dd');
    const tomorrow = format(new Date().setDate(new Date().getDate() + 1), 'yyyy-MM-dd');
    const twoDaysAgo = format(new Date().setDate(new Date().getDate() - 2), 'yyyy-MM-dd');
    const fiveDaysAgo = format(new Date().setDate(new Date().getDate() - 5), 'yyyy-MM-dd');

    return [
        {
            id: 'mock-1', full_name: 'Ahmed Al Falah', visitor_type: 'contractor', company_name: 'BuildCo Constructions',
            contact_number: '0501112233', email: 'ahmed@buildco.com', purpose_of_visit: 'Site inspection for new project',
            camp_id: alQuozCamp.id, host_contact_person: 'Mohammed Ali',
            check_in_date: today, check_in_time: '08:30', expected_checkout_date: tomorrow,
            status: 'checked_in', registered_by: currentUser?.id || 'mock_user_1', vehicle_number: 'DXB-12345', notes: 'Scheduled weekly inspection'
        },
        {
            id: 'mock-2', full_name: 'Fatima Al Mansouri', visitor_type: 'supplier', company_name: 'Office Supplies Unlimited',
            contact_number: '0554445566', email: 'fatima@office.com', purpose_of_visit: 'Deliver new batch of stationery',
            camp_id: alQuozCamp.id, host_contact_person: 'Sara Khan',
            check_in_date: today, check_in_time: '10:00', expected_checkout_date: today,
            status: 'checked_in', registered_by: currentUser?.id || 'mock_user_2', vehicle_number: 'AUH-56789', items_brought_in: '5 large boxes of paper and pens'
        },
        {
            id: 'mock-3', full_name: 'Khalid Hassan', visitor_type: 'guest', company_name: 'XYZ Investment Group',
            contact_number: '0567778899', email: 'khalid@xyz.com', purpose_of_visit: 'Meeting with management for partnership talks',
            camp_id: alQuozCamp.id, host_contact_person: 'Ahmed Said',
            check_in_date: twoDaysAgo, check_in_time: '11:00', expected_checkout_date: twoDaysAgo,
            status: 'checked_out', registered_by: currentUser?.id || 'mock_user_1', notes: 'Attended a half-day workshop'
        },
        {
            id: 'mock-4', full_name: 'Noura Salem', visitor_type: 'inspector', company_name: 'Safety & Quality Standards',
            contact_number: '0523331122', email: 'noura@safety.com', purpose_of_visit: 'Annual safety audit of premises',
            camp_id: alQuozCamp.id, host_contact_person: 'Omar Jassim',
            check_in_date: today, check_in_time: '09:15', expected_checkout_date: today,
            status: 'checked_in', registered_by: currentUser?.id || 'mock_user_3', notes: 'Checking fire exits and safety equipment'
        },
        {
            id: 'mock-5', full_name: 'Ali Mohammed', visitor_type: 'maintenance', company_name: 'QuickFix HVAC Solutions',
            contact_number: '0509990011', email: 'ali@quickfix.com', purpose_of_visit: 'Routine AC system repair',
            camp_id: alQuozCamp.id, host_contact_person: 'Fatima Abdul',
            check_in_date: today, check_in_time: '13:00', expected_checkout_date: tomorrow,
            status: 'checked_in', registered_by: currentUser?.id || 'mock_user_4', vehicle_number: 'SHJ-24680', access_areas: 'Block A, HVAC room, server room'
        },
        {
            id: 'mock-6', full_name: 'Sara Khan', visitor_type: 'guest', company_name: 'University of Dubai',
            contact_number: '0541113355', email: 'sara@uni.edu', purpose_of_visit: 'Academic research visit for project',
            camp_id: alQuozCamp.id, host_contact_person: 'Dr. Hussain Al Balushi',
            check_in_date: fiveDaysAgo, check_in_time: '14:00', expected_checkout_date: twoDaysAgo,
            status: 'checked_in', registered_by: currentUser?.id || 'mock_user_2', notes: 'Overstayed by 3 days. Needs follow-up.' // Example overstay
        },
        {
            id: 'mock-7', full_name: 'David Lee', visitor_type: 'vendor', company_name: 'Global Tech Systems',
            contact_number: '0502224488', email: 'david@techsol.com', purpose_of_visit: 'New software installation and training',
            camp_id: alQuozCamp.id, host_contact_person: 'Jamal Ahmed',
            check_in_date: today, check_in_time: '09:45', expected_checkout_date: today,
            status: 'checked_in', registered_by: currentUser?.id || 'mock_user_5'
        },
        {
            id: 'mock-8', full_name: 'Mona Rashid', visitor_type: 'delivery', company_name: 'Express Courier Services',
            contact_number: '0587776655', email: 'mona@courier.com', purpose_of_visit: 'Urgent package delivery for HR',
            camp_id: alQuozCamp.id, host_contact_person: 'HR Department',
            check_in_date: today, check_in_time: '11:30', expected_checkout_date: today,
            status: 'checked_in', registered_by: currentUser?.id || 'mock_user_1', vehicle_number: 'DXB-90001'
        },
        {
            id: 'mock-9', full_name: 'Eisa Omar', visitor_type: 'contractor', company_name: 'Electric Works LLC',
            contact_number: '0501239876', email: 'eisa@ew.com', purpose_of_visit: 'Electrical panel upgrade',
            camp_id: alQuozCamp.id, host_contact_person: 'Fahad Tariq',
            check_in_date: format(new Date().setDate(new Date().getDate() - 1), 'yyyy-MM-dd'), check_in_time: '07:45', expected_checkout_date: today,
            status: 'checked_in', registered_by: currentUser?.id || 'mock_user_3', access_areas: 'Electrical room B'
        },
        {
            id: 'mock-10', full_name: 'Hana Saeed', visitor_type: 'other', company_name: 'Hana Photography',
            contact_number: '0561234567', email: 'hana@photography.com', purpose_of_visit: 'Photography session for company brochure',
            camp_id: alQuozCamp.id, host_contact_person: 'Marketing Dept',
            check_in_date: today, check_in_time: '15:00', expected_checkout_date: today,
            status: 'checked_in', registered_by: currentUser?.id || 'mock_user_4', notes: 'Capturing new office facilities and team photos'
        }
    ];
  }, [alQuozCamp, currentUser?.id]); // Re-generate if alQuozCamp or currentUser changes

  // Combine fetched visitors with sample visitors
  const visitors = useMemo(() => {
    // Filter out any mock visitors from the API if by chance they were persisted with mock IDs,
    // although they shouldn't be as they aren't part of API creation.
    const realVisitors = fetchedVisitors.filter(v => !String(v.id).startsWith('mock-'));
    return [...realVisitors, ...sampleVisitors];
  }, [fetchedVisitors, sampleVisitors]);

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Visitor.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visitors'] });
      setShowAddDialog(false);
      setFormData({ check_in_date: format(new Date(), 'yyyy-MM-dd'), check_in_time: format(new Date(), 'HH:mm') });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Visitor.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visitors'] });
      setShowCheckOutDialog(false);
      setSelectedVisitor(null);
    },
  });

  const bulkCreateMutation = useMutation({
    mutationFn: (data) => base44.entities.Visitor.bulkCreate(data),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['visitors'] });
      // The new handler will update uploadResult on success
      setUploadResult({ 
        success: true, 
        message: `Successfully registered ${result.length} visitor(s)!` 
      });
      setBulkFile(null);
      setShowBulkUploadDialog(false);
    },
    onError: (error) => {
      // The new handler will update uploadResult on error
      setUploadResult({ 
        success: false, 
        message: `Upload failed: ${error.message || 'Unknown error'}`,
        details: error.stack
      });
    },
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setDuplicateWarning(null);

    // Check for duplicates - same name + contact number + checked in today
    const today = format(new Date(), 'yyyy-MM-dd');
    const possibleDuplicate = visitors.find(v => 
      v.full_name?.toLowerCase() === formData.full_name?.toLowerCase() &&
      v.contact_number === formData.contact_number &&
      v.check_in_date === today &&
      v.status === 'checked_in'
    );

    if (possibleDuplicate) {
      const camp = camps.find(c => c.id === possibleDuplicate.camp_id);
      setDuplicateWarning({
        visitor: possibleDuplicate,
        camp: camp,
        message: `A visitor with the same name and contact number is already checked in today at ${camp?.name || 'Unknown camp'}. Are you sure you want to register this person again?`
      });
      return;
    }

    await createMutation.mutateAsync({
      ...formData,
      registered_by: currentUser?.id
    });
  };

  const confirmDuplicateSubmit = async () => {
    await createMutation.mutateAsync({
      ...formData,
      registered_by: currentUser?.id
    });
    setDuplicateWarning(null);
    setShowAddDialog(false); // Close the dialog after confirmed submission
  };

  const handleCheckOut = async (e) => {
    e.preventDefault();
    if (selectedVisitor && String(selectedVisitor.id).startsWith('mock-')) {
      console.warn("Attempted to check out a mock visitor. This action is not supported for sample data.");
      setShowCheckOutDialog(false);
      setSelectedVisitor(null);
      return;
    }
    await updateMutation.mutateAsync({
      id: selectedVisitor.id,
      data: {
        status: 'checked_out',
        check_out_date: format(new Date(), 'yyyy-MM-dd'),
        check_out_time: format(new Date(), 'HH:mm')
      }
    });
  };

  const downloadTemplate = () => {
    const template = `full_name,visitor_type,company_name,contact_number,email,id_document_type,id_document_number,purpose_of_visit,camp_name,host_contact_person,check_in_date,check_in_time,expected_checkout_date,vehicle_number,notes
John Doe,supplier,ABC Supplies,0501234567,john@abc.com,emirates_id,784-1234-5678901-1,Delivery of materials,Al Quoz,Ahmed Ali,2024-01-15,09:00,2024-01-15,DXB12345,Delivering construction materials
Jane Smith,contractor,XYZ Services,0507654321,jane@xyz.com,passport,A12345678,Maintenance work,Sajja Camp,Mohammed Khan,16/01/2024,10:00,18/01/2024,AUH67890,AC maintenance contract`;

    const blob = new Blob(['\ufeff' + template], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'visitor_template.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const handleBulkUpload = async () => {
    if (!bulkFile) {
      setUploadResult({ success: false, message: "Please select a CSV file first" });
      return;
    }

    setUploading(true);
    setUploadResult(null); // Clear previous upload result

    try {
      // Read the file
      const text = await bulkFile.text();
      
      // Remove BOM if present (for Excel compatibility)
      let cleanText = text;
      if (text.charCodeAt(0) === 0xFEFF) {
        cleanText = text.slice(1);
      }

      // Parse CSV
      // Filter out empty lines and lines starting with '#' (comments/headers in template)
      const lines = cleanText.split('\n').filter(line => line.trim() && !line.trim().startsWith('#'));
      if (lines.length < 2) { // Need at least one header row and one data row
        setUploadResult({ success: false, message: "CSV file is empty or has no data rows" });
        setUploading(false);
        return;
      }

      const headers = lines[0].split(',').map(h => h.trim());
      const rawVisitorsFromCSV = []; // Store raw parsed visitors before full validation

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        if (values.length === headers.length) { // Ensure consistent number of columns
          const visitor = {};
          headers.forEach((header, index) => {
            visitor[header] = values[index];
          });
          rawVisitorsFromCSV.push(visitor);
        } else if (values.some(v => v !== '')) { // Only log if the line is not completely empty after trimming
          console.warn(`Skipping malformed row ${i + 1}: Expected ${headers.length} columns, got ${values.length}. Data: ${lines[i]}`);
        }
      }

      if (rawVisitorsFromCSV.length === 0) {
        setUploadResult({ success: false, message: "No valid visitor records found in CSV" });
        setUploading(false);
        return;
      }

      // Helper function to convert date format to YYYY-MM-DD
      const convertDate = (dateStr) => {
        if (!dateStr) return null;
        
        dateStr = String(dateStr).trim();

        // Try YYYY-MM-DD first (standard for backend)
        if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
          const parsedDate = parseISO(dateStr);
          if (isValid(parsedDate)) return format(parsedDate, 'yyyy-MM-dd');
        }
        
        // Try DD/MM/YYYY
        try {
          const parsedDate = parse(dateStr, 'dd/MM/yyyy', new Date());
          if (isValid(parsedDate)) return format(parsedDate, 'yyyy-MM-dd');
        } catch (e) { /* ignore */ }

        // Try MM/DD/YYYY
        try {
          const parsedDate = parse(dateStr, 'MM/dd/yyyy', new Date());
          if (isValid(parsedDate)) return format(parsedDate, 'yyyy-MM-dd');
        } catch (e) { /* ignore */ }
        
        return null; // If no known format matches or invalid date
      };

      // Validate required fields
      const requiredFields = ['full_name', 'visitor_type', 'contact_number', 'camp_name', 'check_in_date'];
      const errors = [];
      
      rawVisitorsFromCSV.forEach((visitor, index) => {
        const missing = requiredFields.filter(field => !visitor[field]);
        if (missing.length > 0) {
          errors.push(`Row ${index + 2}: Missing required fields: ${missing.join(', ')}`);
        }
      });

      if (errors.length > 0) {
        setUploadResult({ 
          success: false, 
          message: `Found ${errors.length} row(s) with missing required fields`,
          details: errors.slice(0, 10).join('\n') + (errors.length > 10 ? `\n... and ${errors.length - 10} more` : '')
        });
        setUploading(false);
        return;
      }

      // Process visitors and map camp names to camp_ids
      const processedVisitors = [];
      const campNotFoundErrors = [];
      const dateErrors = []; // New array for date parsing errors
      const duplicateWarnings = [];

      for (let i = 0; i < rawVisitorsFromCSV.length; i++) {
        const visitor = rawVisitorsFromCSV[i];
        
        // Find camp by name (case-insensitive)
        const camp = camps.find(c => 
          c.name?.toLowerCase() === visitor.camp_name?.toLowerCase()
        );

        if (!camp) {
          campNotFoundErrors.push(`Row ${i + 2} ('${visitor.full_name || 'Unnamed'}'): Camp "${visitor.camp_name}" not found or inactive`);
          continue; // Skip this row if camp is not found
        }

        // Convert dates
        const checkInDate = convertDate(visitor.check_in_date);
        if (!checkInDate) {
          dateErrors.push(`Row ${i + 2} ('${visitor.full_name || 'Unnamed'}'): Invalid check_in_date format "${visitor.check_in_date}". Please use YYYY-MM-DD, DD/MM/YYYY, or MM/DD/YYYY.`);
          continue; // Skip this row if check-in date is invalid
        }

        let expectedCheckoutDate = null;
        if (visitor.expected_checkout_date) {
            expectedCheckoutDate = convertDate(visitor.expected_checkout_date);
            if (!expectedCheckoutDate) {
                dateErrors.push(`Row ${i + 2} ('${visitor.full_name || 'Unnamed'}'): Invalid expected_checkout_date format "${visitor.expected_checkout_date}". Please use YYYY-MM-DD, DD/MM/YYYY, or MM/DD/YYYY.`);
                continue; // Skip this row if expected checkout date is invalid
            }
        }

        // Check for duplicates - same name + contact + checked in on same date
        const existingVisitor = visitors.find(v => 
          v.full_name?.toLowerCase() === visitor.full_name?.toLowerCase() &&
          v.contact_number === visitor.contact_number &&
          v.check_in_date === checkInDate &&
          v.status === 'checked_in'
        );

        if (existingVisitor) {
          duplicateWarnings.push(`Row ${i + 2} ('${visitor.full_name || 'Unnamed'}'): A visitor with this name and contact number is already checked in on ${checkInDate}.`);
          continue;
        }

        // Build visitor object
        const visitorData = {
          full_name: visitor.full_name,
          visitor_type: visitor.visitor_type.toLowerCase().replace(/ /g, '_'), // Ensure consistent format
          contact_number: visitor.contact_number,
          camp_id: camp.id,
          check_in_date: checkInDate, // Use converted date
          check_in_time: visitor.check_in_time || format(new Date(), 'HH:mm'), // Default if not provided
          status: 'checked_in',
          registered_by: currentUser?.id
        };

        // Add optional fields if present
        if (visitor.company_name) visitorData.company_name = visitor.company_name;
        if (visitor.email) visitorData.email = visitor.email;
        if (visitor.id_document_type) visitorData.id_document_type = visitor.id_document_type.toLowerCase().replace(/ /g, '_');
        if (visitor.id_document_number) visitorData.id_document_number = visitor.id_document_number;
        if (visitor.purpose_of_visit) visitorData.purpose_of_visit = visitor.purpose_of_visit;
        if (visitor.host_contact_person) visitorData.host_contact_person = visitor.host_contact_person;
        if (expectedCheckoutDate) visitorData.expected_checkout_date = expectedCheckoutDate; // Use converted date
        if (visitor.vehicle_number) visitorData.vehicle_number = visitor.vehicle_number;
        if (visitor.notes) visitorData.notes = visitor.notes;

        processedVisitors.push(visitorData);
      }

      if (campNotFoundErrors.length > 0) {
        setUploadResult({ 
          success: false, 
          message: `Found ${campNotFoundErrors.length} row(s) with invalid camp names`,
          details: campNotFoundErrors.slice(0, 10).join('\n') + (campNotFoundErrors.length > 10 ? `\n... and ${campNotFoundErrors.length - 10} more` : '')
        });
        setUploading(false);
        return;
      }

      if (dateErrors.length > 0) { // Check for date parsing errors
        setUploadResult({ 
          success: false, 
          message: `Found ${dateErrors.length} row(s) with invalid date formats`,
          details: dateErrors.slice(0, 10).join('\n') + (dateErrors.length > 10 ? `\n... and ${dateErrors.length - 10} more` : '')
        });
        setUploading(false);
        return;
      }

      if (duplicateWarnings.length > 0) {
        setUploadResult({ 
          success: false, 
          message: `Found ${duplicateWarnings.length} duplicate visitor(s) already checked in. Skipping these entries.`,
          details: duplicateWarnings.slice(0, 10).join('\n') + (duplicateWarnings.length > 10 ? `\n... and ${duplicateWarnings.length - 10} more` : '')
        });
        setUploading(false); // Do not proceed if duplicates are found in validation
        return;
      }

      if (processedVisitors.length === 0) {
        setUploadResult({ success: false, message: "No valid visitors to upload after validation" });
        setUploading(false);
        return;
      }

      // Upload visitors
      await bulkCreateMutation.mutateAsync(processedVisitors);
      
      // Upload result handled by bulkCreateMutation.onSuccess/onError now
      // setUploadResult({ 
      //   success: true, 
      //   message: `Successfully registered ${processedVisitors.length} visitor(s)!` 
      // });
      // setBulkFile(null);
      // setShowBulkUploadDialog(false);

    } catch (error) {
      console.error("Bulk upload error:", error);
      // This will be caught by bulkCreateMutation.onError, but keeping a fallback just in case
      setUploadResult({ 
        success: false, 
        message: `Upload failed: ${error.message || 'Unknown error'}`,
        details: error.stack
      });
    } finally {
      setUploading(false);
    }
  };

  const exportToCSV = () => {
    const headers = ['Name', 'Type', 'Company', 'Contact', 'Purpose', 'Camp', 'Host', 'Check-in Date', 'Check-in Time', 'Status', 'Duration (days)'];
    const rows = filteredAndSortedVisitors.map(visitor => {
      const camp = camps.find(c => c.id === visitor.camp_id);
      let duration = 0;
      
      try {
        const parsedCheckIn = visitor.check_in_date ? parseISO(visitor.check_in_date) : null;
        const parsedCheckOut = visitor.check_out_date ? parseISO(visitor.check_out_date) : null;

        if (parsedCheckIn && isValid(parsedCheckIn)) {
          if (parsedCheckOut && isValid(parsedCheckOut)) {
            duration = differenceInDays(parsedCheckOut, parsedCheckIn);
          } else {
            duration = differenceInDays(new Date(), parsedCheckIn);
          }
        }
      } catch (e) {
        duration = 0; // Fallback for invalid dates
      }

      const checkInDateFormatted = visitor.check_in_date ? (() => {
        try {
          const parsed = parseISO(visitor.check_in_date);
          return isValid(parsed) ? format(parsed, 'dd/MM/yyyy') : visitor.check_in_date;
        } catch (e) {
          return visitor.check_in_date; // Return original if cannot parse
        }
      })() : '-';

      return [
        visitor.full_name,
        visitor.visitor_type?.replace(/_/g, ' '),
        visitor.company_name || '-',
        visitor.contact_number,
        visitor.purpose_of_visit || '-',
        camp?.name || '-',
        visitor.host_contact_person || '-',
        checkInDateFormatted, // Use the safely formatted date
        visitor.check_in_time || '-',
        visitor.status,
        duration
      ];
    });

    const csv = [headers, ...rows].map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n'); // Ensure proper CSV escaping
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' }); // Explicitly set charset for BOM-less UTF-8
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `visitors_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const printReport = () => {
    window.print();
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const clearAllColumnFilters = () => {
    setFilterName([]);
    setFilterType([]);
    setFilterCompany([]);
    setFilterContact([]);
    setFilterPurpose([]);
    setFilterCamp([]);
    setFilterHost([]);
    setFilterCheckInDate([]);
    setFilterStatus([]);
  };

  const hasActiveColumnFilters = filterName.length > 0 || filterType.length > 0 ||
    filterCompany.length > 0 || filterContact.length > 0 || filterPurpose.length > 0 ||
    filterCamp.length > 0 || filterHost.length > 0 || filterCheckInDate.length > 0 || filterStatus.length > 0;

  // Get visitors by tab
  const checkedInVisitors = visitors.filter(v => v.status === 'checked_in');
  const checkedOutVisitors = visitors.filter(v => v.status === 'checked_out');
  const overStayedVisitors = visitors.filter(v => {
    if (v.status !== 'checked_in' || !v.expected_checkout_date) return false;
    try {
      const parsedExpectedCheckout = parseISO(v.expected_checkout_date);
      return isValid(parsedExpectedCheckout) && differenceInDays(new Date(), parsedExpectedCheckout) > 0;
    } catch (e) {
      return false;
    }
  });

  // Apply tab filter
  let tabFilteredVisitors = visitors;
  if (activeTab === 'checked_in') tabFilteredVisitors = checkedInVisitors;
  else if (activeTab === 'checked_out') tabFilteredVisitors = checkedOutVisitors;
  else if (activeTab === 'overstayed') tabFilteredVisitors = overStayedVisitors;

  // Apply search
  let filteredVisitors = tabFilteredVisitors.filter(v => {
    const matchesSearch = !searchQuery || 
      v.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.company_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.contact_number?.includes(searchQuery);
    
    return matchesSearch;
  });

  // Filter camps based on search and status
  const activeCamps = camps.filter(c => c.status === 'active');
  const filteredCamps = activeCamps.filter(c => {
    const searchLower = campSearch.toLowerCase();
    return c.name?.toLowerCase().includes(searchLower) || 
           c.code?.toLowerCase().includes(searchLower);
  });

  // Get unique values for filters (from all visitors for full selection)
  const uniqueNames = [...new Set(visitors.map(v => v.full_name || '-'))].sort();
  const uniqueTypes = [...new Set(visitors.map(v => v.visitor_type?.replace(/_/g, ' ').toUpperCase() || '-'))].sort();
  const uniqueCompanies = [...new Set(visitors.map(v => v.company_name || '-'))].sort();
  const uniqueContacts = [...new Set(visitors.map(v => v.contact_number || '-'))].sort();
  const uniquePurposes = [...new Set(visitors.map(v => v.purpose_of_visit || '-'))].sort();
  const uniqueCamps = [...new Set(visitors.map(v => {
    const camp = camps.find(c => c.id === v.camp_id);
    return camp?.name || '-';
  }))].sort();
  const uniqueHosts = [...new Set(visitors.map(v => v.host_contact_person || '-'))].sort();
  const uniqueCheckInDates = [...new Set(visitors.map(v => {
    try {
      const parsedDate = v.check_in_date ? parseISO(v.check_in_date) : null;
      if (parsedDate && isValid(parsedDate)) {
        return format(parsedDate, 'MMM dd, yyyy');
      }
    } catch (e) {
      // Fallback
    }
    return '-'; // Return placeholder if date is invalid or missing
  }))].sort();
  const uniqueStatuses = [...new Set(visitors.map(v => v.status || '-'))].sort();

  // Apply column filters
  filteredVisitors = filteredVisitors.filter(v => {
    const camp = camps.find(c => c.id === v.camp_id);

    if (filterName.length > 0 && !filterName.includes(v.full_name || '-')) return false;
    if (filterType.length > 0 && !filterType.includes(v.visitor_type?.replace(/_/g, ' ').toUpperCase() || '-')) return false;
    if (filterCompany.length > 0 && !filterCompany.includes(v.company_name || '-')) return false;
    if (filterContact.length > 0 && !filterContact.includes(v.contact_number || '-')) return false;
    if (filterPurpose.length > 0 && !filterPurpose.includes(v.purpose_of_visit || '-')) return false;
    if (filterCamp.length > 0 && !filterCamp.includes(camp?.name || '-')) return false;
    if (filterHost.length > 0 && !filterHost.includes(v.host_contact_person || '-')) return false;
    
    // Safely parse and format check-in date for comparison
    const formattedCheckInDate = (() => {
        try {
            const parsed = v.check_in_date ? parseISO(v.check_in_date) : null;
            return parsed && isValid(parsed) ? format(parsed, 'MMM dd, yyyy') : '-';
        } catch (e) {
            return '-';
        }
    })();
    if (filterCheckInDate.length > 0 && !filterCheckInDate.includes(formattedCheckInDate)) return false;
    
    if (filterStatus.length > 0 && !filterStatus.includes(v.status || '-')) return false;

    return true;
  });

  // Sort visitors
  const filteredAndSortedVisitors = [...filteredVisitors].sort((a, b) => {
    let aVal, bVal;

    switch (sortField) {
      case 'check_in_date':
        try {
          aVal = a.check_in_date ? parseISO(a.check_in_date).getTime() : 0;
          bVal = b.check_in_date ? parseISO(b.check_in_date).getTime() : 0;
        } catch (e) {
          aVal = 0; // Fallback for invalid date strings
          bVal = 0;
        }
        break;
      case 'full_name':
        aVal = a.full_name || '';
        bVal = b.full_name || '';
        break;
      case 'visitor_type':
        aVal = a.visitor_type || '';
        bVal = b.visitor_type || '';
        break;
      case 'company_name':
        aVal = a.company_name || '';
        bVal = b.company_name || '';
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

  const getVisitorTypeColor = (type) => {
    const colors = {
      supplier: 'bg-blue-100 text-blue-700',
      vendor: 'bg-green-100 text-green-700',
      contractor: 'bg-purple-100 text-purple-700',
      guest: 'bg-pink-100 text-pink-700',
      inspector: 'bg-orange-100 text-orange-700',
      maintenance: 'bg-yellow-100 text-yellow-700',
      delivery: 'bg-teal-100 text-teal-700',
      other: 'bg-gray-100 text-gray-700'
    };
    return colors[type] || 'bg-gray-100 text-gray-700';
  };

  const getStatusColor = (status) => {
    const colors = {
      checked_in: 'bg-green-100 text-green-700',
      checked_out: 'bg-gray-100 text-gray-700',
      overstayed: 'bg-red-100 text-red-700'
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  // Helper function for safely formatting dates in display
  const formatSafeDate = (dateStr) => {
    if (!dateStr) return '-';
    try {
      const parsed = parseISO(dateStr);
      if (isValid(parsed)) {
        return format(parsed, 'MMM dd, yyyy');
      }
    } catch (e) {
      // Fallback for invalid date strings
    }
    return dateStr; // Return original if cannot format
  };

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
            font-family: sans-serif; /* Ensure readable font */
            background-color: white; /* Ensure white background */
            padding: 10px; /* Add some padding for better margin on print */
          }
          #printable-table table {
            width: 100%;
            border-collapse: collapse;
            font-size: 9px; /* Adjust font size for print */
          }
          #printable-table th, 
          #printable-table td {
            border: 1px solid #000;
            padding: 3px;
            text-align: left;
            vertical-align: top; /* Align content to top */
          }
          #printable-table th {
            background-color: #f3f4f6 !important; /* Ensure background prints */
            font-weight: bold;
          }
          #printable-table tr:hover {
            background-color: inherit !important; /* Prevent hover styles from printing */
          }
          .no-print {
            display: none !important; /* Hide elements with no-print class */
          }
          #printable-table tr {
            page-break-inside: avoid; /* Prevent breaking rows across pages */
          }
          #printable-table .badge {
            display: inline-block; /* Ensure badges print correctly */
            padding: 2px 4px;
            border-radius: 4px;
            font-size: 8px;
            white-space: nowrap;
          }
          /* Specific badge colors for better print visibility, if needed */
          #printable-table .bg-blue-100 { background-color: #dbeafe !important; color: #1d4ed8 !important; border: 1px solid #93c5fd; }
          #printable-table .bg-green-100 { background-color: #dcfce7 !important; color: #15803d !important; border: 1px solid #bbf7d0; }
          #printable-table .bg-purple-100 { background-color: #ede9fe !important; color: #6d28d9 !important; border: 1px solid #d8b4fe; }
          #printable-table .bg-pink-100 { background-color: #fce7f3 !important; color: #be185d !important; border: 1px solid #fbcfe8; }
          #printable-table .bg-orange-100 { background-color: #fff7ed !important; color: #ea580c !important; border: 1px solid #fed7aa; }
          #printable-table .bg-yellow-100 { background-color: #fefce8 !important; color: #ca8a04 !important; border: 1px solid #fde68a; }
          #printable-table .bg-teal-100 { background-color: #ccfbf1 !important; color: #0f766e !important; border: 1px solid #99f6e4; }
          #printable-table .bg-gray-100 { background-color: #f3f4f6 !important; color: #4b5563 !important; border: 1px solid #e5e7eb; }
          #printable-table .bg-red-50 { background-color: #fee2e2 !important; }
          #printable-table .bg-red-100 { background-color: #fee2e2 !important; color: #dc2626 !important; border: 1px solid #fca5a5; }

          @page {
            size: landscape;
            margin: 1cm;
          }
        }
      `}</style>

      <div className="max-w-[1800px] mx-auto space-y-6">
        <Alert className="border-blue-200 bg-blue-50 no-print">
          <AlertCircle className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-900 text-sm">
            <strong>📍 Camp Operations: Visitor Management</strong><br/>
            Register visitors on check-in → Track duration and status → Receive overstay alerts → Check out when leaving → Maintain security and compliance
          </AlertDescription>
        </Alert>

        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 no-print">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Visitor & Non-Employee Tracking</h1>
            <p className="text-gray-600 mt-1">Manage suppliers, vendors, contractors, and guests</p>
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
              Register Visitor
            </Button>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 no-print">
          <Card className="border-none shadow-md">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Currently Checked In</p>
                  <p className="text-2xl font-bold text-green-900">{checkedInVisitors.length}</p>
                </div>
                <UserPlus className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-md">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Visitors (Today)</p>
                  <p className="text-2xl font-bold text-blue-900">
                    {visitors.filter(v => {
                      try {
                        const parsedCheckInDate = v.check_in_date ? parseISO(v.check_in_date) : null;
                        return isValid(parsedCheckInDate) && format(parsedCheckInDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
                      } catch (e) {
                        return false;
                      }
                    }).length}
                  </p>
                </div>
                <UserPlus className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-md">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Checked Out</p>
                  <p className="text-2xl font-bold text-gray-900">{checkedOutVisitors.length}</p>
                </div>
                <LogOut className="w-8 h-8 text-gray-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-md">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-red-600">Overstayed</p>
                  <p className="text-2xl font-bold text-red-900">{overStayedVisitors.length}</p>
                </div>
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Overstay Alert */}
        {overStayedVisitors.length > 0 && (
          <Alert variant="destructive" className="no-print">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>{overStayedVisitors.length} visitors have overstayed their expected checkout date.</strong> Please follow up immediately.
            </AlertDescription>
          </Alert>
        )}

        {/* Search Bar */}
        <Card className="border-none shadow-md no-print">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search by name, company, or contact..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-white shadow-sm no-print">
            <TabsTrigger value="all" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">
              All Visitors ({visitors.length})
            </TabsTrigger>
            <TabsTrigger value="checked_in" className="data-[state=active]:bg-green-50 data-[state=active]:text-green-700">
              Checked In ({checkedInVisitors.length})
            </TabsTrigger>
            <TabsTrigger value="checked_out" className="data-[state=active]:bg-gray-50 data-[state=active]:text-gray-700">
              Checked Out ({checkedOutVisitors.length})
            </TabsTrigger>
            <TabsTrigger value="overstayed" className="data-[state=active]:bg-red-50 data-[state=active]:text-red-700">
              Overstayed ({overStayedVisitors.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab}>
            {/* Visitors Table */}
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
                {filteredAndSortedVisitors.length === 0 ? (
                  <div className="p-12 text-center text-gray-500">
                    <UserPlus className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p>No visitors found matching your criteria</p>
                  </div>
                ) : (
                  <table className="w-full border-collapse bg-white">
                    <thead>
                      <tr className="border-b-2 border-gray-300">
                        <th className="min-w-[150px] px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                          <div className="flex items-center justify-between gap-1">
                            <span>Name</span>
                            <div className="flex gap-1 items-center no-print">
                              <Button variant="ghost" size="sm" className="h-8 px-2 -mr-1" onClick={() => handleSort('full_name')}>
                                <ArrowUpDown className={`w-3 h-3 ${sortField === 'full_name' ? 'text-blue-600' : 'text-gray-400'}`} />
                              </Button>
                              <ColumnFilter
                                values={uniqueNames}
                                selected={filterName}
                                setSelected={setFilterName}
                                searchValue={searchName}
                                setSearchValue={setSearchName}
                                headerText="Name"
                              />
                            </div>
                          </div>
                        </th>
                        <th className="min-w-[120px] px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                          <div className="flex items-center justify-between gap-1">
                            <span>Type</span>
                            <div className="flex gap-1 items-center no-print">
                              <Button variant="ghost" size="sm" className="h-8 px-2 -mr-1" onClick={() => handleSort('visitor_type')}>
                                <ArrowUpDown className={`w-3 h-3 ${sortField === 'visitor_type' ? 'text-blue-600' : 'text-gray-400'}`} />
                              </Button>
                              <ColumnFilter
                                values={uniqueTypes}
                                selected={filterType}
                                setSelected={setFilterType}
                                searchValue={searchType}
                                setSearchValue={setSearchType}
                                headerText="Type"
                              />
                            </div>
                          </div>
                        </th>
                        <th className="min-w-[150px] px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                          <div className="flex items-center justify-between gap-1">
                            <span>Company</span>
                            <div className="flex gap-1 items-center no-print">
                              <Button variant="ghost" size="sm" className="h-8 px-2 -mr-1" onClick={() => handleSort('company_name')}>
                                <ArrowUpDown className={`w-3 h-3 ${sortField === 'company_name' ? 'text-blue-600' : 'text-gray-400'}`} />
                              </Button>
                              <ColumnFilter
                                values={uniqueCompanies}
                                selected={filterCompany}
                                setSelected={setFilterCompany}
                                searchValue={searchCompany}
                                setSearchValue={setSearchCompany}
                                headerText="Company"
                              />
                            </div>
                          </div>
                        </th>
                        <th className="min-w-[120px] px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                          <div className="flex items-center justify-between gap-1">
                            <span>Contact</span>
                            <div className="flex gap-1 items-center no-print">
                              <ColumnFilter
                                values={uniqueContacts}
                                selected={filterContact}
                                setSelected={setFilterContact}
                                searchValue={searchContact}
                                setSearchValue={setSearchContact}
                                headerText="Contact"
                              />
                            </div>
                          </div>
                        </th>
                        <th className="min-w-[200px] px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                          <div className="flex items-center justify-between gap-1">
                            <span>Purpose</span>
                            <div className="flex gap-1 items-center no-print">
                              <ColumnFilter
                                values={uniquePurposes}
                                selected={filterPurpose}
                                setSelected={setFilterPurpose}
                                searchValue={searchPurpose}
                                setSearchValue={setSearchPurpose}
                                headerText="Purpose"
                              />
                            </div>
                          </div>
                        </th>
                        <th className="min-w-[120px] px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                          <div className="flex items-center justify-between gap-1">
                            <span>Camp</span>
                            <div className="flex gap-1 items-center no-print">
                              <ColumnFilter
                                values={uniqueCamps}
                                selected={filterCamp}
                                setSelected={setFilterCamp}
                                searchValue={searchCamp}
                                setSearchValue={setSearchCamp}
                                headerText="Camp"
                              />
                            </div>
                          </div>
                        </th>
                        <th className="min-w-[120px] px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                          <div className="flex items-center justify-between gap-1">
                            <span>Host Contact</span>
                            <div className="flex gap-1 items-center no-print">
                              <ColumnFilter
                                values={uniqueHosts}
                                selected={filterHost}
                                setSelected={setFilterHost}
                                searchValue={searchHost}
                                setSearchValue={setSearchHost}
                                headerText="Host"
                              />
                            </div>
                          </div>
                        </th>
                        <th className="min-w-[120px] px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                          <div className="flex items-center justify-between gap-1">
                            <span>Check-in</span>
                            <div className="flex gap-1 items-center no-print">
                              <Button variant="ghost" size="sm" className="h-8 px-2 -mr-1" onClick={() => handleSort('check_in_date')}>
                                <ArrowUpDown className={`w-3 h-3 ${sortField === 'check_in_date' ? 'text-blue-600' : 'text-gray-400'}`} />
                              </Button>
                              <ColumnFilter
                                values={uniqueCheckInDates}
                                selected={filterCheckInDate}
                                setSelected={setFilterCheckInDate}
                                searchValue={searchCheckInDate}
                                setSearchValue={setSearchCheckInDate}
                                headerText="Check-in"
                              />
                            </div>
                          </div>
                        </th>
                        <th className="min-w-[100px] px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                          <div className="flex items-center justify-between gap-1">
                            <span>Duration</span>
                          </div>
                        </th>
                        <th className="min-w-[120px] px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                          <div className="flex items-center justify-between gap-1">
                            <span>Status</span>
                            <div className="flex gap-1 items-center no-print">
                              <ColumnFilter
                                values={uniqueStatuses}
                                selected={filterStatus}
                                setSelected={setFilterStatus}
                                searchValue={searchStatus}
                                setSearchValue={setSearchStatus}
                                headerText="Status"
                              />
                            </div>
                          </div>
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 no-print">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAndSortedVisitors.map((visitor, index) => {
                        const camp = camps.find(c => c.id === visitor.camp_id);
                        let duration = 0;
                        
                        try {
                          const parsedCheckIn = visitor.check_in_date ? parseISO(visitor.check_in_date) : null;
                          const parsedCheckOut = visitor.check_out_date ? parseISO(visitor.check_out_date) : null;

                          if (parsedCheckIn && isValid(parsedCheckIn)) {
                            if (parsedCheckOut && isValid(parsedCheckOut)) {
                              duration = differenceInDays(parsedCheckOut, parsedCheckIn);
                            } else {
                              duration = differenceInDays(new Date(), parsedCheckIn);
                            }
                          }
                        } catch (e) {
                          duration = 0; // Fallback for invalid dates
                        }

                        const isOverstayed = visitor.status === 'checked_in' && visitor.expected_checkout_date && (() => {
                          try {
                            const parsedExpectedCheckout = parseISO(visitor.expected_checkout_date);
                            return isValid(parsedExpectedCheckout) && differenceInDays(new Date(), parsedExpectedCheckout) > 0;
                          } catch (e) {
                            return false;
                          }
                        })();

                        return (
                          <tr
                            key={visitor.id}
                            className={`border-b border-gray-200 hover:bg-blue-50 transition-colors ${
                              index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                            } ${isOverstayed ? 'bg-red-50' : ''}`}
                          >
                            <td className="px-4 py-3 text-sm font-medium text-gray-900 border-r border-gray-200 whitespace-nowrap">
                              {visitor.full_name}
                            </td>
                            <td className="px-4 py-3 text-sm border-r border-gray-200 whitespace-nowrap">
                              <Badge className={getVisitorTypeColor(visitor.visitor_type)}>
                                {visitor.visitor_type?.replace(/_/g, ' ')}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-700 border-r border-gray-200 whitespace-nowrap">
                              {visitor.company_name || '-'}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-700 border-r border-gray-200 whitespace-nowrap">
                              {visitor.contact_number}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-700 border-r border-gray-200">
                              {visitor.purpose_of_visit || '-'}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-700 border-r border-gray-200 whitespace-nowrap">
                              {camp?.name || '-'}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-700 border-r border-gray-200 whitespace-nowrap">
                              {visitor.host_contact_person || '-'}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-700 border-r border-gray-200 whitespace-nowrap">
                              <div>
                                <p>{formatSafeDate(visitor.check_in_date)}</p>
                                {visitor.check_in_time && (
                                  <p className="text-xs text-gray-500">{visitor.check_in_time}</p>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-700 border-r border-gray-200 whitespace-nowrap">
                              {duration} {duration === 1 ? 'day' : 'days'}
                            </td>
                            <td className="px-4 py-3 text-sm border-r border-gray-200 whitespace-nowrap">
                              <Badge className={getStatusColor(visitor.status)}>
                                {visitor.status?.replace(/_/g, ' ')}
                              </Badge>
                              {isOverstayed && (
                                <Badge variant="destructive" className="ml-1">OVERSTAYED</Badge>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm whitespace-nowrap no-print">
                              {visitor.status === 'checked_in' && !String(visitor.id).startsWith('mock-') && ( // Only show checkout for non-mock visitors
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedVisitor(visitor);
                                    setShowCheckOutDialog(true);
                                  }}
                                  className="text-orange-600 border-orange-600 hover:bg-orange-50"
                                >
                                  <LogOut className="w-3 h-3 mr-1" />
                                  Check Out
                                </Button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>

              {filteredAndSortedVisitors.length > 0 && (
                <div className="bg-gray-50 px-6 py-3 border-t border-gray-200 no-print">
                  <p className="text-sm text-gray-600">
                    Showing <span className="font-semibold">{filteredAndSortedVisitors.length}</span> of <span className="font-semibold">{visitors.length}</span> visitors
                  </p>
                </div>
              )}
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Register Visitor Dialog */}
      <Dialog open={showAddDialog} onOpenChange={(open) => {
        setShowAddDialog(open);
        if (!open) {
          setDuplicateWarning(null); // Clear warning when dialog closes
          setFormData({ // Also clear form data
            check_in_date: format(new Date(), 'yyyy-MM-dd'),
            check_in_time: format(new Date(), 'HH:mm')
          });
          setCampSearch(""); // Clear camp search
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Register New Visitor</DialogTitle>
          </DialogHeader>

          {duplicateWarning && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Possible Duplicate Entry</strong>
                <p className="mt-2 text-sm">{duplicateWarning.message}</p>
                <div className="mt-3 p-3 bg-red-50 rounded border border-red-200">
                  <p className="text-sm font-semibold">Existing Record:</p>
                  <p className="text-xs mt-1">Name: {duplicateWarning.visitor.full_name}</p>
                  <p className="text-xs">Contact: {duplicateWarning.visitor.contact_number}</p>
                  <p className="text-xs">Camp: {duplicateWarning.camp?.name || 'N/A'}</p>
                  <p className="text-xs">Check-in: {formatSafeDate(duplicateWarning.visitor.check_in_date)} at {duplicateWarning.visitor.check_in_time}</p>
                  <p className="text-xs">Type: {duplicateWarning.visitor.visitor_type?.replace(/_/g, ' ')}</p>
                  {duplicateWarning.visitor.purpose_of_visit && (
                    <p className="text-xs">Purpose: {duplicateWarning.visitor.purpose_of_visit}</p>
                  )}
                </div>
                <div className="flex gap-2 mt-4">
                  <Button 
                    type="button"
                    size="sm" 
                    variant="outline" 
                    onClick={() => setDuplicateWarning(null)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="button"
                    size="sm" 
                    onClick={confirmDuplicateSubmit}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Register Anyway
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Full Name*</Label>
                <Input
                  required
                  value={formData.full_name || ''}
                  onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <Label>Visitor Type*</Label>
                <Select
                  value={formData.visitor_type || ''}
                  onValueChange={(val) => setFormData({...formData, visitor_type: val})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="supplier">Supplier</SelectItem>
                    <SelectItem value="vendor">Vendor</SelectItem>
                    <SelectItem value="contractor">Contractor</SelectItem>
                    <SelectItem value="guest">Guest</SelectItem>
                    <SelectItem value="inspector">Inspector</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                    <SelectItem value="delivery">Delivery</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Company Name</Label>
                <Input
                  value={formData.company_name || ''}
                  onChange={(e) => setFormData({...formData, company_name: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <Label>Contact Number*</Label>
                <Input
                  required
                  value={formData.contact_number || ''}
                  onChange={(e) => setFormData({...formData, contact_number: e.target.value})}
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <Label>ID Document Type</Label>
                <Select
                  value={formData.id_document_type || ''}
                  onValueChange={(val) => setFormData({...formData, id_document_type: val})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select ID type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="emirates_id">Emirates ID</SelectItem>
                    <SelectItem value="passport">Passport</SelectItem>
                    <SelectItem value="driving_license">Driving License</SelectItem>
                    <SelectItem value="company_id">Company ID</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>ID Document Number</Label>
              <Input
                value={formData.id_document_number || ''}
                onChange={(e) => setFormData({...formData, id_document_number: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <Label>Purpose of Visit*</Label>
              <Textarea
                required
                rows={3}
                value={formData.purpose_of_visit || ''}
                onChange={(e) => setFormData({...formData, purpose_of_visit: e.target.value})}
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Camp*</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className="w-full justify-between"
                    >
                      {formData.camp_id
                        ? camps.find(c => c.id === formData.camp_id)?.name
                        : "Select camp..."}
                      <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                    <Command>
                      <CommandInput 
                        placeholder="Search by camp name or code..." 
                        value={campSearch}
                        onValueChange={setCampSearch}
                      />
                      <CommandEmpty>No camp found.</CommandEmpty>
                      <CommandGroup className="max-h-64 overflow-y-auto">
                        {filteredCamps.map((camp) => (
                          <CommandItem
                            key={camp.id}
                            value={camp.id}
                            onSelect={() => {
                              setFormData({...formData, camp_id: camp.id});
                              setCampSearch("");
                            }}
                          >
                            <div className="flex flex-col">
                              <span className="font-medium">{camp.name}</span>
                              <span className="text-xs text-gray-500">{camp.code}</span>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>Host Contact Person</Label>
                <Input
                  value={formData.host_contact_person || ''}
                  onChange={(e) => setFormData({...formData, host_contact_person: e.target.value})}
                />
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Check-in Date*</Label>
                <Input
                  type="date"
                  required
                  value={formData.check_in_date || ''}
                  onChange={(e) => setFormData({...formData, check_in_date: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <Label>Check-in Time*</Label>
                <Input
                  type="time"
                  required
                  value={formData.check_in_time || ''}
                  onChange={(e) => setFormData({...formData, check_in_time: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <Label>Expected Checkout</Label>
                <Input
                  type="date"
                  value={formData.expected_checkout_date || ''}
                  onChange={(e) => setFormData({...formData, expected_checkout_date: e.target.value})}
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Vehicle Number</Label>
                <Input
                  value={formData.vehicle_number || ''}
                  onChange={(e) => setFormData({...formData, vehicle_number: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <Label>Access Areas</Label>
                <Input
                  value={formData.access_areas || ''}
                  onChange={(e) => setFormData({...formData, access_areas: e.target.value})}
                  placeholder="e.g., Main building, Storage area"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Items Brought In</Label>
              <Textarea
                rows={2}
                value={formData.items_brought_in || ''}
                onChange={(e) => setFormData({...formData, items_brought_in: e.target.value})}
                placeholder="Tools, equipment, materials, etc."
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="safety"
                checked={formData.safety_briefing_given || false}
                onCheckedChange={(checked) => setFormData({...formData, safety_briefing_given: checked})}
              />
              <label htmlFor="safety" className="text-sm cursor-pointer">
                Safety briefing provided
              </label>
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                rows={3}
                value={formData.notes || ''}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setShowAddDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                Register Visitor
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Check Out Dialog */}
      <Dialog open={showCheckOutDialog} onOpenChange={setShowCheckOutDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Check Out Visitor</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Alert>
              <AlertDescription>
                Checking out <strong>{selectedVisitor?.full_name}</strong> from {camps.find(c => c.id === selectedVisitor?.camp_id)?.name}
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label>Check-out Date</Label>
              <Input
                type="date"
                value={format(new Date(), 'yyyy-MM-dd')}
                disabled
              />
            </div>

            <div className="space-y-2">
              <Label>Check-out Time</Label>
              <Input
                type="time"
                value={format(new Date(), 'HH:mm')}
                disabled
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setShowCheckOutDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleCheckOut} className="bg-orange-600 hover:bg-orange-700">
                Confirm Check Out
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk Upload Dialog */}
      <Dialog open={showBulkUploadDialog} onOpenChange={setShowBulkUploadDialog}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Bulk Upload Visitors</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Alert>
              <AlertDescription className="text-sm">
                Upload a CSV file with visitor data. Download the template below to see the required format.
                <div className="mt-2">
                  <strong>Required fields:</strong> full_name, visitor_type, contact_number, camp_name, check_in_date.<br/>
                  <strong>Date formats supported:</strong> YYYY-MM-DD, DD/MM/YYYY, or MM/DD/YYYY.
                </div>
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
                onChange={(e) => {
                  setBulkFile(e.target.files[0]);
                  setUploadResult(null); // Clear previous upload result when a new file is selected
                }}
                disabled={uploading}
              />
            </div>

            {uploadResult && (
              <Alert variant={uploadResult.success ? "default" : "destructive"}>
                <AlertDescription className="text-sm">
                  {uploadResult.success ? (
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" />
                      {uploadResult.message}
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <AlertCircle className="w-4 h-4" />
                        <strong>{uploadResult.message}</strong>
                      </div>
                      {uploadResult.details && (
                        <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-x-auto whitespace-pre-wrap max-h-40 overflow-y-auto">
                          {uploadResult.details}
                        </pre>
                      )}
                    </div>
                  )}
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
                {uploading ? 'Uploading...' : 'Upload Visitors'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}