import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, AlertCircle, Plus, Upload, Building2, User, Download, ArrowUpDown, Filter, X, Printer, Search } from "lucide-react";
import { differenceInDays, parseISO, format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";


export default function Documents() {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showBulkUploadDialog, setShowBulkUploadDialog] = useState(false);
  // docType is used for the add/bulk upload dialogs to determine the category of document being handled.
  const [docType, setDocType] = useState("technician"); 
  // activeDisplayTab controls which tab (Technician, Camp, Passport, etc.) is currently shown in the main view.
  const [activeDisplayTab, setActiveDisplayTab] = useState("technician");
  const [formData, setFormData] = useState({});
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [bulkFile, setBulkFile] = useState(null);
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [existingDocument, setExistingDocument] = useState(null);
  const [pendingDocumentData, setPendingDocumentData] = useState(null);
  
  // Sorting state for tables
  const [sortField, setSortField] = useState("expiry_date");
  const [sortDirection, setSortDirection] = useState("asc");

  // Excel-style column filters for technician documents
  const [filterTechName, setFilterTechName] = useState([]);
  const [filterTechEmployeeId, setFilterTechEmployeeId] = useState([]);
  const [filterTechDocType, setFilterTechDocType] = useState([]);
  const [filterTechDocNumber, setFilterTechDocNumber] = useState([]);
  const [filterTechIssueDate, setFilterTechIssueDate] = useState([]);
  const [filterTechExpiryDate, setFilterTechExpiryDate] = useState([]);
  const [filterTechStatus, setFilterTechStatus] = useState([]);
  const [filterTechCamp, setFilterTechCamp] = useState([]);

  // Excel-style column filters for camp documents
  const [filterCampName, setFilterCampName] = useState([]);
  const [filterCampDocType, setFilterCampDocType] = useState([]);
  const [filterCampDocName, setFilterCampDocName] = useState([]);
  const [filterCampDocNumber, setFilterCampDocNumber] = useState([]);
  const [filterCampIssueDate, setFilterCampIssueDate] = useState([]);
  const [filterCampExpiryDate, setFilterCampExpiryDate] = useState([]);
  const [filterCampStatus, setFilterCampStatus] = useState([]);
  const [filterCampAuthority, setFilterCampAuthority] = useState([]);

  // Search states for column filters - technician docs
  const [searchTechName, setSearchTechName] = useState("");
  const [searchTechEmployeeId, setSearchTechEmployeeId] = useState("");
  const [searchTechDocType, setSearchTechDocType] = useState("");
  const [searchTechDocNumber, setSearchTechDocNumber] = useState("");
  const [searchTechIssueDate, setSearchTechIssueDate] = useState("");
  const [searchTechExpiryDate, setSearchTechExpiryDate] = useState("");
  const [searchTechStatus, setSearchTechStatus] = useState("");
  const [searchTechCamp, setSearchTechCamp] = useState("");

  // Search states for column filters - camp docs
  const [searchCampName, setSearchCampName] = useState("");
  const [searchCampDocType, setSearchCampDocType] = useState("");
  const [searchCampDocName, setSearchCampDocName] = useState("");
  const [searchCampDocNumber, setSearchCampDocNumber] = useState("");
  const [searchCampIssueDate, setSearchCampIssueDate] = useState("");
  const [searchCampExpiryDate, setSearchCampExpiryDate] = useState("");
  const [searchCampStatus, setSearchCampStatus] = useState("");
  const [searchCampAuthority, setSearchCampAuthority] = useState("");
  
  // Search states for searchable dropdowns
  const [technicianSearch, setTechnicianSearch] = useState("");
  const [campSearch, setCampSearch] = useState("");
  const [technicianPopoverOpen, setTechnicianPopoverOpen] = useState(false);
  const [campPopoverOpen, setCampPopoverOpen] = useState(false);

  const queryClient = useQueryClient();

  const { data: techDocs = [] } = useQuery({
    queryKey: ['technician-documents'],
    queryFn: () => base44.entities.TechnicianDocument.list('-expiry_date'),
  });

  const { data: campDocs = [] } = useQuery({
    queryKey: ['camp-documents'],
    queryFn: () => base44.entities.CampDocument.list('-expiry_date'),
  });

  const { data: technicians = [] } = useQuery({
    queryKey: ['technicians'],
    queryFn: () => base44.entities.Technician.list(),
  });

  const { data: camps = [] } = useQuery({
    queryKey: ['camps'],
    queryFn: () => base44.entities.Camp.list(),
  });

  // Filter technicians based on search
  const filteredTechnicians = technicians.filter(t => {
    const searchLower = technicianSearch.toLowerCase();
    return t.full_name?.toLowerCase().includes(searchLower) || 
           t.employee_id?.toLowerCase().includes(searchLower);
  });

  // Filter camps based on search
  const filteredCamps = camps.filter(c => {
    const searchLower = campSearch.toLowerCase();
    return c.name?.toLowerCase().includes(searchLower) || 
           c.code?.toLowerCase().includes(searchLower);
  });

  const createTechDocMutation = useMutation({
    mutationFn: (data) => base44.entities.TechnicianDocument.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['technician-documents'] });
      setShowAddDialog(false);
      setFormData({});
      setPendingDocumentData(null);
    },
  });

  const updateTechDocMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.TechnicianDocument.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['technician-documents'] });
    },
  });

  const createCampDocMutation = useMutation({
    mutationFn: (data) => base44.entities.CampDocument.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['camp-documents'] });
      setShowAddDialog(false);
      setFormData({});
      setPendingDocumentData(null);
    },
  });

  const updateCampDocMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.CampDocument.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['camp-documents'] });
    },
  });

  const bulkCreateTechDocMutation = useMutation({
    mutationFn: (data) => base44.entities.TechnicianDocument.bulkCreate(data),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['technician-documents'] });
      setUploadResult({ success: true, count: result.length });
    },
    onError: (error) => {
      setUploadResult({ success: false, error: error.message || "An unknown error occurred" });
    },
  });

  const bulkCreateCampDocMutation = useMutation({
    mutationFn: (data) => base44.entities.CampDocument.bulkCreate(data),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['camp-documents'] });
      setUploadResult({ success: true, count: result.length });
    },
    onError: (error) => {
      setUploadResult({ success: false, error: error.message || "An unknown error occurred" });
    },
  });

  // Add sample documents for testing
  const createSampleDocsMutation = useMutation({
    mutationFn: async () => {
      if (technicians.length === 0) {
        throw new Error("Please add technicians first before creating sample documents");
      }

      const today = new Date();
      const sampleDocs = [];

      // Create documents for the first 5 technicians (or however many exist)
      const techsToUse = technicians.slice(0, Math.min(5, technicians.length));

      techsToUse.forEach((tech, index) => {
        // Expired passport (for first technician)
        if (index === 0) {
          sampleDocs.push({
            technician_id: tech.id,
            document_type: "passport",
            document_number: "P1234567",
            issue_date: "2015-01-01",
            expiry_date: "2024-01-01", // Expired
            notes: "URGENT: Passport expired"
          });
        }

        // Visa expiring soon (within 30 days)
        if (index === 1) {
          const expiringSoon = new Date(today);
          expiringSoon.setDate(expiringSoon.getDate() + 15); // 15 days from now
          sampleDocs.push({
            technician_id: tech.id,
            document_type: "visa",
            document_number: "V9876543",
            issue_date: "2023-01-15",
            expiry_date: expiringSoon.toISOString().split('T')[0],
            notes: "Visa renewal process needs to start"
          });
        }

        // Emirates ID expiring soon
        if (index === 2) {
          const expiringSoon = new Date(today);
          expiringSoon.setDate(expiringSoon.getDate() + 25); // 25 days from now
          sampleDocs.push({
            technician_id: tech.id,
            document_type: "emirates_id",
            document_number: "784-1234-5678901-2",
            issue_date: "2021-06-01",
            expiry_date: expiringSoon.toISOString().split('T')[0],
            notes: "Emirates ID renewal required"
          });
        }

        // Valid labor card
        if (index === 3) {
          const validDate = new Date(today);
          validDate.setMonth(validDate.getMonth() + 6); // 6 months from now
          sampleDocs.push({
            technician_id: tech.id,
            document_type: "labor_card",
            document_number: "LC456789",
            issue_date: "2023-06-01",
            expiry_date: validDate.toISOString().split('T')[0],
            notes: "Valid labor card"
          });
        }

        // Expired health certificate
        if (index === 4) {
          sampleDocs.push({
            technician_id: tech.id,
            document_type: "health_certificate",
            document_number: "HC789012",
            issue_date: "2023-01-01",
            expiry_date: "2024-01-01", // Expired
            notes: "Health certificate expired - renewal needed"
          });
        }

        // Add valid passport for technicians without expired one
        if (index >= 1) {
          const validPassport = new Date(today);
          validPassport.setFullYear(validPassport.getFullYear() + 3);
          sampleDocs.push({
            technician_id: tech.id,
            document_type: "passport",
            document_number: `P${789000 + index}`,
            issue_date: "2020-06-01",
            expiry_date: validPassport.toISOString().split('T')[0],
            notes: "Valid passport"
          });
        }
      });

      return await base44.entities.TechnicianDocument.bulkCreate(sampleDocs);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['technician-documents'] });
      alert("Sample documents created successfully! Check the dashboard for expiry alerts.");
    },
    onError: (error) => {
      alert(`Error creating sample documents: ${error.message}`);
    }
  });

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData({ ...formData, file_url });
    } catch (error) {
      console.error("Upload failed:", error);
    }
    setUploading(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (docType === 'technician') {
      // Check for duplicate technician document
      const existingDoc = techDocs.find(doc => 
        doc.technician_id === formData.technician_id && 
        doc.document_type === formData.document_type &&
        doc.is_active !== false // Only consider active documents
      );

      if (existingDoc) {
        // Found duplicate - show dialog
        setExistingDocument(existingDoc);
        setPendingDocumentData(formData);
        setShowDuplicateDialog(true);
      } else {
        // No duplicate - proceed
        createTechDocMutation.mutate(formData);
      }
    } else {
      // Check for duplicate camp document
      const existingDoc = campDocs.find(doc => 
        doc.camp_id === formData.camp_id && 
        doc.document_type === formData.document_type &&
        doc.is_active !== false // Only consider active documents
      );

      if (existingDoc) {
        // Found duplicate - show dialog
        setExistingDocument(existingDoc);
        setPendingDocumentData(formData);
        setShowDuplicateDialog(true);
      } else {
        // No duplicate - proceed
        createCampDocMutation.mutate(formData);
      }
    }
  };

  const handleArchiveAndCreate = async () => {
    if (!existingDocument || !pendingDocumentData) return;

    if (docType === 'technician') {
      // Archive the old document
      await updateTechDocMutation.mutateAsync({
        id: existingDocument.id,
        data: { is_active: false }
      });

      // Create the new document
      createTechDocMutation.mutate(pendingDocumentData);
    } else {
      // Archive the old document
      await updateCampDocMutation.mutateAsync({
        id: existingDocument.id,
        data: { is_active: false }
      });

      // Create the new document
      createCampDocMutation.mutate(pendingDocumentData);
    }
    
    setShowDuplicateDialog(false);
    setExistingDocument(null);
    setPendingDocumentData(null);
  };

  const handleCancelDuplicate = () => {
    setShowDuplicateDialog(false);
    setExistingDocument(null);
    setPendingDocumentData(null);
  };

  const downloadTemplate = () => {
    const template = docType === 'technician' 
      ? `# Technician Documents Template
# document_type options: passport, visa, emirates_id, labor_card, health_certificate, other
employee_id,document_type,document_number,issue_date,expiry_date,notes
EMP001,passport,P1234567,2020-01-01,2030-01-01,Valid passport
EMP002,visa,V9876543,2023-01-15,2025-01-15,Work visa
EMP003,emirates_id,784-1234-5678901-2,2023-06-01,2026-06-01,Emirates ID card`
      : `# Camp Documents Template
# document_type options: license, compliance_certificate, safety_inspection, fire_safety, health_permit, other
camp_code,document_type,document_name,issue_date,expiry_date,issuing_authority,notes
CAMP001,license,Trade License,2023-01-01,2024-01-01,DED,Annual renewal required
CAMP001,fire_safety,Fire Safety Certificate,2023-06-01,2024-06-01,Civil Defense,Valid certificate
CAMP002,health_permit,Health Permit,2023-03-15,2024-03-15,Dubai Municipality,Renewal due`;

    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = docType === 'technician' ? 'technician_documents_template.csv' : 'camp_documents_template.csv';
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
      
      const schema = docType === 'technician' 
        ? await base44.entities.TechnicianDocument.schema()
        : await base44.entities.CampDocument.schema();
        
      const extractResult = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: {
          type: "array",
          items: schema
        }
      });

      if (extractResult.status === "success" && extractResult.output) {
        if (docType === 'technician') {
          const processedData = extractResult.output.map(row => {
            const tech = technicians.find(t => t.employee_id === row.employee_id);
            return {
              technician_id: tech?.id,
              document_type: row.document_type,
              document_number: row.document_number,
              issue_date: row.issue_date,
              expiry_date: row.expiry_date,
              notes: row.notes
            };
          }).filter(d => d.technician_id); // Only include if technician is found
          
          if (processedData.length > 0) {
            await bulkCreateTechDocMutation.mutateAsync(processedData);
          } else {
            setUploadResult({ success: false, error: "No valid technician documents found after processing." });
          }
        } else {
          const processedData = extractResult.output.map(row => {
            const camp = camps.find(c => c.code === row.camp_code);
            return {
              camp_id: camp?.id,
              document_type: row.document_type,
              document_name: row.document_name,
              issue_date: row.issue_date,
              expiry_date: row.expiry_date,
              issuing_authority: row.issuing_authority,
              notes: row.notes
            };
          }).filter(d => d.camp_id); // Only include if camp is found
          
          if (processedData.length > 0) {
            await bulkCreateCampDocMutation.mutateAsync(processedData);
          } else {
            setUploadResult({ success: false, error: "No valid camp documents found after processing." });
          }
        }
        setBulkFile(null); // Clear file after successful processing
      } else {
        setUploadResult({ success: false, error: extractResult.details || "Failed to extract data from the file. Please check the format." });
      }
    } catch (error) {
      console.error("Bulk upload failed:", error);
      setUploadResult({ success: false, error: error.message || "An unexpected error occurred during bulk upload." });
    }

    setUploading(false);
  };

  const getDocumentStatus = (expiryDate) => {
    if (!expiryDate) return { status: 'unknown', variant: 'secondary', className: 'text-gray-500', days: null };
    const days = differenceInDays(parseISO(expiryDate), new Date());
    if (days < 0) return { status: 'expired', variant: 'destructive', className: '', days };
    if (days <= 30) return { status: 'expiring_soon', variant: 'outline', className: 'bg-orange-100 text-orange-700 border-orange-300', days };
    return { status: 'valid', variant: 'default', className: '', days };
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Get unique values for technician doc filters
  const uniqueTechNames = [...new Set(techDocs.map(d => {
    const tech = technicians.find(t => t.id === d.technician_id);
    return tech?.full_name || '-';
  }))].sort();
  
  const uniqueTechEmployeeIds = [...new Set(techDocs.map(d => {
    const tech = technicians.find(t => t.id === d.technician_id);
    return tech?.employee_id || '-';
  }))].sort();
  
  const uniqueTechDocTypes = [...new Set(techDocs.map(d => d.document_type?.replace(/_/g, ' ').toUpperCase() || '-'))].sort();
  const uniqueTechDocNumbers = [...new Set(techDocs.map(d => d.document_number || '-'))].sort();
  const uniqueTechIssueDates = [...new Set(techDocs.map(d => d.issue_date ? format(parseISO(d.issue_date), 'MMM dd, yyyy') : '-'))].sort();
  const uniqueTechExpiryDates = [...new Set(techDocs.map(d => d.expiry_date ? format(parseISO(d.expiry_date), 'MMM dd, yyyy') : '-'))].sort();
  const uniqueTechStatuses = [...new Set(techDocs.map(d => {
    const status = getDocumentStatus(d.expiry_date);
    return status.status === 'expired' ? 'Expired' :
           status.status === 'expiring_soon' ? 'Expiring Soon' : 'Valid';
  }))].sort();
  const uniqueTechCamps = [...new Set(techDocs.map(d => {
    const tech = technicians.find(t => t.id === d.technician_id);
    const camp = tech ? camps.find(c => c.id === tech.camp_id) : null;
    return camp?.name || '-';
  }))].sort();

  // Get unique values for camp doc filters
  const uniqueCampNames = [...new Set(campDocs.map(d => {
    const camp = camps.find(c => c.id === d.camp_id);
    return camp?.name || '-';
  }))].sort();
  
  const uniqueCampDocTypes = [...new Set(campDocs.map(d => d.document_type?.replace(/_/g, ' ').toUpperCase() || '-'))].sort();
  const uniqueCampDocNames = [...new Set(campDocs.map(d => d.document_name || '-'))].sort();
  const uniqueCampDocNumbers = [...new Set(campDocs.map(d => d.document_number || '-'))].sort();
  const uniqueCampIssueDates = [...new Set(campDocs.map(d => d.issue_date ? format(parseISO(d.issue_date), 'MMM dd, yyyy') : '-'))].sort();
  const uniqueCampExpiryDates = [...new Set(campDocs.map(d => d.expiry_date ? format(parseISO(d.expiry_date), 'MMM dd, yyyy') : '-'))].sort();
  const uniqueCampStatuses = [...new Set(campDocs.map(d => {
    const status = getDocumentStatus(d.expiry_date);
    return status.status === 'expired' ? 'Expired' :
           status.status === 'expiring_soon' ? 'Expiring Soon' : 'Valid';
  }))].sort();
  const uniqueCampAuthorities = [...new Set(campDocs.map(d => d.issuing_authority || '-'))].sort();

  // Column Filter Component
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

  // Filter and sort technician documents based on document type
  const getFilteredTechDocs = (docTypeFilter = null) => {
    let docs = techDocs.filter(doc => {
      // Only show active documents
      if (doc.is_active === false) return false;
      // If a specific docTypeFilter is provided, apply it.
      // For the "Other" tab, filter out specific known types.
      if (docTypeFilter === 'other') {
        const knownTypes = ['passport', 'visa', 'emirates_id', 'labor_card', 'health_certificate'];
        if (knownTypes.includes(doc.document_type)) return false;
      } else if (docTypeFilter && doc.document_type !== docTypeFilter) {
        return false;
      }
      
      const tech = technicians.find(t => t.id === doc.technician_id);
      const camp = tech ? camps.find(c => c.id === tech.camp_id) : null;
      const statusInfo = getDocumentStatus(doc.expiry_date);
      const statusText = statusInfo.status === 'expired' ? 'Expired' :
                         statusInfo.status === 'expiring_soon' ? 'Expiring Soon' : 'Valid';

      if (filterTechName.length > 0 && !filterTechName.includes(tech?.full_name || '-')) return false;
      if (filterTechEmployeeId.length > 0 && !filterTechEmployeeId.includes(tech?.employee_id || '-')) return false;
      if (filterTechDocType.length > 0 && !filterTechDocType.includes(doc.document_type?.replace(/_/g, ' ').toUpperCase() || '-')) return false;
      if (filterTechDocNumber.length > 0 && !filterTechDocNumber.includes(doc.document_number || '-')) return false;
      if (filterTechIssueDate.length > 0 && !filterTechIssueDate.includes(doc.issue_date ? format(parseISO(doc.issue_date), 'MMM dd, yyyy') : '-')) return false;
      if (filterTechExpiryDate.length > 0 && !filterTechExpiryDate.includes(doc.expiry_date ? format(parseISO(doc.expiry_date), 'MMM dd, yyyy') : '-')) return false;
      if (filterTechStatus.length > 0 && !filterTechStatus.includes(statusText)) return false;
      if (filterTechCamp.length > 0 && !filterTechCamp.includes(camp?.name || '-')) return false;

      return true;
    });

    return docs.sort((a, b) => {
      let aVal, bVal;
      
      // Handle sorting by related technician/camp fields
      if (sortField === 'technician_name') {
        const techA = technicians.find(t => t.id === a.technician_id);
        const techB = technicians.find(t => t.id === b.technician_id);
        aVal = techA?.full_name || '';
        bVal = techB?.full_name || '';
      } else if (sortField === 'employee_id') {
        const techA = technicians.find(t => t.id === a.technician_id);
        const techB = technicians.find(t => t.id === b.technician_id);
        aVal = techA?.employee_id || '';
        bVal = techB?.employee_id || '';
      } else if (sortField === 'camp_name_tech') { // For technician documents, sort by their camp's name
        const techA = technicians.find(t => t.id === a.technician_id);
        const campA = techA ? camps.find(c => c.id === techA.camp_id) : null;
        const techB = technicians.find(t => t.id === b.technician_id);
        const campB = techB ? camps.find(c => c.id === techB.camp_id) : null;
        aVal = campA?.name || '';
        bVal = campB?.name || '';
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
  };

  // Filter and sort camp documents
  const getFilteredCampDocs = () => {
    let docs = campDocs.filter(doc => {
      // Only show active documents
      if (doc.is_active === false) return false;
      const camp = camps.find(c => c.id === doc.camp_id);
      const statusInfo = getDocumentStatus(doc.expiry_date);
      const statusText = statusInfo.status === 'expired' ? 'Expired' :
                         statusInfo.status === 'expiring_soon' ? 'Expiring Soon' : 'Valid';

      if (filterCampName.length > 0 && !filterCampName.includes(camp?.name || '-')) return false;
      if (filterCampDocType.length > 0 && !filterCampDocType.includes(doc.document_type?.replace(/_/g, ' ').toUpperCase() || '-')) return false;
      if (filterCampDocName.length > 0 && !filterCampDocName.includes(doc.document_name || '-')) return false;
      if (filterCampDocNumber.length > 0 && !filterCampDocNumber.includes(doc.document_number || '-')) return false;
      if (filterCampIssueDate.length > 0 && !filterCampIssueDate.includes(doc.issue_date ? format(parseISO(doc.issue_date), 'MMM dd, yyyy') : '-')) return false;
      if (filterCampExpiryDate.length > 0 && !filterCampExpiryDate.includes(doc.expiry_date ? format(parseISO(doc.expiry_date), 'MMM dd, yyyy') : '-')) return false;
      if (filterCampStatus.length > 0 && !filterCampStatus.includes(statusText)) return false;
      if (filterCampAuthority.length > 0 && !filterCampAuthority.includes(doc.issuing_authority || '-')) return false;

      return true;
    });

    return docs.sort((a, b) => {
      let aVal, bVal;
      
      if (sortField === 'camp_name') {
        const campA = camps.find(c => c.id === a.camp_id);
        const campB = camps.find(c => c.id === b.camp_id);
        aVal = campA?.name || '';
        bVal = campB?.name || '';
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
  };

  const clearTechFilters = () => {
    setFilterTechName([]);
    setFilterTechEmployeeId([]);
    setFilterTechDocType([]);
    setFilterTechDocNumber([]);
    setFilterTechIssueDate([]);
    setFilterTechExpiryDate([]);
    setFilterTechStatus([]);
    setFilterTechCamp([]);
  };

  const clearCampFilters = () => {
    setFilterCampName([]);
    setFilterCampDocType([]);
    setFilterCampDocName([]);
    setFilterCampDocNumber([]);
    setFilterCampIssueDate([]);
    setFilterCampExpiryDate([]);
    setFilterCampStatus([]);
    setFilterCampAuthority([]);
  };

  const hasActiveTechFilters = 
    filterTechName.length > 0 ||
    filterTechEmployeeId.length > 0 ||
    filterTechDocType.length > 0 ||
    filterTechDocNumber.length > 0 ||
    filterTechIssueDate.length > 0 ||
    filterTechExpiryDate.length > 0 ||
    filterTechStatus.length > 0 ||
    filterTechCamp.length > 0;

  const hasActiveCampFilters = 
    filterCampName.length > 0 ||
    filterCampDocType.length > 0 ||
    filterCampDocName.length > 0 ||
    filterCampDocNumber.length > 0 ||
    filterCampIssueDate.length > 0 ||
    filterCampExpiryDate.length > 0 ||
    filterCampStatus.length > 0 ||
    filterCampAuthority.length > 0;

  // Export to CSV function
  const exportToCSV = () => {
    let headers;
    let rows;
    let filenamePrefix;

    if (activeDisplayTab === "camp") {
      const currentDocs = getFilteredCampDocs();
      headers = ['Camp Name', 'Document Type', 'Document Name', 'Document Number', 'Issue Date', 'Expiry Date', 'Days Until Expiry', 'Status', 'Issuing Authority', 'Notes', 'File URL'];
      filenamePrefix = 'camp_documents';
      rows = currentDocs.map(doc => {
        const camp = camps.find(c => c.id === doc.camp_id);
        const statusInfo = getDocumentStatus(doc.expiry_date);
        const daysLeft = statusInfo.days === null ? '-' : statusInfo.days;
        return [
          camp?.name || '-',
          doc.document_type?.replace(/_/g, ' ').toUpperCase() || '-',
          doc.document_name || '-',
          doc.document_number || '-',
          doc.issue_date ? format(parseISO(doc.issue_date), 'dd/MM/yyyy') : '-',
          doc.expiry_date ? format(parseISO(doc.expiry_date), 'dd/MM/yyyy') : '-',
          daysLeft,
          statusInfo.status.replace(/_/g, ' ').toUpperCase(),
          doc.issuing_authority || '-',
          doc.notes || '-',
          doc.file_url || '-'
        ];
      });
    } else { // Technician documents or specific technician document types
      const techDocTypeFilter = activeDisplayTab === "technician" ? null : activeDisplayTab;
      const currentDocs = getFilteredTechDocs(techDocTypeFilter);
      headers = ['Technician Name', 'Employee ID', 'Document Type', 'Document Number', 'Issue Date', 'Expiry Date', 'Days Until Expiry', 'Status', 'Camp', 'Notes', 'File URL'];
      filenamePrefix = 'technician_documents';
      rows = currentDocs.map(doc => {
        const tech = technicians.find(t => t.id === doc.technician_id);
        const camp = camps.find(c => c.id === tech?.camp_id);
        const statusInfo = getDocumentStatus(doc.expiry_date);
        const daysLeft = statusInfo.days === null ? '-' : statusInfo.days;

        return [
          tech?.full_name || '-',
          tech?.employee_id || '-',
          doc.document_type?.replace(/_/g, ' ').toUpperCase() || '-',
          doc.document_number || '-',
          doc.issue_date ? format(parseISO(doc.issue_date), 'dd/MM/yyyy') : '-',
          doc.expiry_date ? format(parseISO(doc.expiry_date), 'dd/MM/yyyy') : '-',
          daysLeft,
          statusInfo.status.replace(/_/g, ' ').toUpperCase(),
          camp?.name || '-',
          doc.notes || '-',
          doc.file_url || '-'
        ];
      });
    }

    const csvContent = [headers, ...rows].map(row =>
      row.map(cell => {
        // Handle potential commas or double quotes within data by double-quoting and escaping existing double-quotes
        const stringCell = String(cell);
        return `"${stringCell.replace(/"/g, '""')}"`;
      }).join(',')
    ).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filenamePrefix}_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const printReport = () => {
    window.print();
  };

  // Render technician documents table
  const renderTechDocTable = (docTypeFilter = null, tableId = null) => {
    const filteredDocs = getFilteredTechDocs(docTypeFilter);

    return (
      <Card className="border-none shadow-lg overflow-hidden" id={tableId}>
        {hasActiveTechFilters && (
          <div className="bg-blue-50 border-b border-blue-200 px-6 py-3 no-print">
            <div className="flex items-center justify-between">
              <p className="text-sm text-blue-700 font-medium">
                <Filter className="w-4 h-4 inline mr-2" />
                Column filters active
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearTechFilters}
                className="text-blue-700 hover:text-blue-900 hover:bg-blue-100"
              >
                <X className="w-4 h-4 mr-1" />
                Clear All Filters
              </Button>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          {filteredDocs.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No documents found{hasActiveTechFilters ? ' matching your filters' : ''}.</p>
            </div>
          ) : (
            <table className="w-full border-collapse bg-white">
              <thead>
                <tr className="border-b-2 border-gray-300">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                    <div className="flex items-center justify-between gap-2">
                      <span>Technician Name</span>
                      <div className="flex gap-1 no-print">
                        <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => handleSort('technician_name')}>
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
                      <div className="flex gap-1 no-print">
                        <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => handleSort('employee_id')}>
                          <ArrowUpDown className="w-3 h-3" />
                        </Button>
                        <ColumnFilter
                          values={uniqueTechEmployeeIds}
                          selected={filterTechEmployeeId}
                          setSelected={setFilterTechEmployeeId}
                          searchValue={searchTechEmployeeId}
                          setSearchValue={setSearchTechEmployeeId}
                        />
                      </div>
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                    <div className="flex items-center justify-between gap-2">
                      <span>Document Type</span>
                      <div className="flex gap-1 no-print">
                        <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => handleSort('document_type')}>
                          <ArrowUpDown className="w-3 h-3" />
                        </Button>
                        <ColumnFilter
                          values={uniqueTechDocTypes}
                          selected={filterTechDocType}
                          setSelected={setFilterTechDocType}
                          searchValue={searchTechDocType}
                          setSearchValue={setSearchTechDocType}
                        />
                      </div>
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                    <div className="flex items-center justify-between gap-2">
                      <span>Document Number</span>
                      <ColumnFilter
                        values={uniqueTechDocNumbers}
                        selected={filterTechDocNumber}
                        setSelected={setFilterTechDocNumber}
                        searchValue={searchTechDocNumber}
                        setSearchValue={setSearchTechDocNumber}
                      />
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                    <div className="flex items-center justify-between gap-2">
                      <span>Issue Date</span>
                      <div className="flex gap-1 no-print">
                        <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => handleSort('issue_date')}>
                          <ArrowUpDown className="w-3 h-3" />
                        </Button>
                        <ColumnFilter
                          values={uniqueTechIssueDates}
                          selected={filterTechIssueDate}
                          setSelected={setFilterTechIssueDate}
                          searchValue={searchTechIssueDate}
                          setSearchValue={setSearchTechIssueDate}
                        />
                      </div>
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                    <div className="flex items-center justify-between gap-2">
                      <span>Expiry Date</span>
                      <div className="flex gap-1 no-print">
                        <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => handleSort('expiry_date')}>
                          <ArrowUpDown className="w-3 h-3" />
                        </Button>
                        <ColumnFilter
                          values={uniqueTechExpiryDates}
                          selected={filterTechExpiryDate}
                          setSelected={setFilterTechExpiryDate}
                          searchValue={searchTechExpiryDate}
                          setSearchValue={setSearchTechExpiryDate}
                        />
                      </div>
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                    <div className="flex items-center justify-between gap-2">
                      <span>Status</span>
                      <ColumnFilter
                        values={uniqueTechStatuses}
                        selected={filterTechStatus}
                        setSelected={setFilterTechStatus}
                        searchValue={searchTechStatus}
                        setSearchValue={setSearchTechStatus}
                      />
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                    <div className="flex items-center justify-between gap-2">
                      <span>Camp</span>
                      <ColumnFilter
                        values={uniqueTechCamps}
                        selected={filterTechCamp}
                        setSelected={setFilterTechCamp}
                        searchValue={searchTechCamp}
                        setSearchValue={setSearchTechCamp}
                      />
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 no-print">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredDocs.map((doc, index) => {
                  const tech = technicians.find(t => t.id === doc.technician_id);
                  const camp = tech ? camps.find(c => c.id === tech.camp_id) : null;
                  const statusInfo = getDocumentStatus(doc.expiry_date);
                  
                  return (
                    <tr 
                      key={doc.id} 
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
                        {doc.document_type?.replace(/_/g, ' ').toUpperCase() || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 border-r border-gray-200 whitespace-nowrap">
                        {doc.document_number || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 border-r border-gray-200 whitespace-nowrap">
                        {doc.issue_date ? format(parseISO(doc.issue_date), 'MMM dd, yyyy') : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 border-r border-gray-200 whitespace-nowrap">
                        {doc.expiry_date ? format(parseISO(doc.expiry_date), 'MMM dd, yyyy') : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm border-r border-gray-200 whitespace-nowrap">
                        <Badge variant={statusInfo.variant} className={`text-xs ${statusInfo.className}`}>
                          {statusInfo.status === 'expired' ? 'Expired' :
                           statusInfo.status === 'expiring_soon' ? `${statusInfo.days} days left` :
                           'Valid'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 border-r border-gray-200 whitespace-nowrap">
                        {camp?.name || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm whitespace-nowrap no-print">
                        {doc.file_url && (
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => window.open(doc.file_url, '_blank')}
                            className="text-blue-600 hover:text-blue-700"
                          >
                            View
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

        {/* Table Footer */}
        <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
          <p className="text-sm text-gray-600">
            Showing <span className="font-semibold">{filteredDocs.length}</span> document(s)
          </p>
        </div>
      </Card>
    );
  };

  // Render camp documents table
  const renderCampDocTable = (tableId = null) => {
    const filteredDocs = getFilteredCampDocs();

    return (
      <Card className="border-none shadow-lg overflow-hidden" id={tableId}>
        {hasActiveCampFilters && (
          <div className="bg-blue-50 border-b border-blue-200 px-6 py-3 no-print">
            <div className="flex items-center justify-between">
              <p className="text-sm text-blue-700 font-medium">
                <Filter className="w-4 h-4 inline mr-2" />
                Column filters active
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearCampFilters}
                className="text-blue-700 hover:text-blue-900 hover:bg-blue-100"
              >
                <X className="w-4 h-4 mr-1" />
                Clear All Filters
              </Button>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          {filteredDocs.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No camp documents found{hasActiveCampFilters ? ' matching your filters' : ''}.</p>
            </div>
          ) : (
            <table className="w-full border-collapse bg-white">
              <thead>
                <tr className="border-b-2 border-gray-300">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                    <div className="flex items-center justify-between gap-2">
                      <span>Camp Name</span>
                      <div className="flex gap-1 no-print">
                        <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => handleSort('camp_name')}>
                          <ArrowUpDown className="w-3 h-3" />
                        </Button>
                        <ColumnFilter
                          values={uniqueCampNames}
                          selected={filterCampName}
                          setSelected={setFilterCampName}
                          searchValue={searchCampName}
                          setSearchValue={setSearchCampName}
                        />
                      </div>
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                    <div className="flex items-center justify-between gap-2">
                      <span>Document Type</span>
                      <div className="flex gap-1 no-print">
                        <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => handleSort('document_type')}>
                          <ArrowUpDown className="w-3 h-3" />
                        </Button>
                        <ColumnFilter
                          values={uniqueCampDocTypes}
                          selected={filterCampDocType}
                          setSelected={setFilterCampDocType}
                          searchValue={searchCampDocType}
                          setSearchValue={setSearchCampDocType}
                        />
                      </div>
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                    <div className="flex items-center justify-between gap-2">
                      <span>Document Name</span>
                      <div className="flex gap-1 no-print">
                        <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => handleSort('document_name')}>
                          <ArrowUpDown className="w-3 h-3" />
                        </Button>
                        <ColumnFilter
                          values={uniqueCampDocNames}
                          selected={filterCampDocName}
                          setSelected={setFilterCampDocName}
                          searchValue={searchCampDocName}
                          setSearchValue={setSearchCampDocName}
                        />
                      </div>
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                    <div className="flex items-center justify-between gap-2">
                      <span>Document Number</span>
                      <ColumnFilter
                        values={uniqueCampDocNumbers}
                        selected={filterCampDocNumber}
                        setSelected={setFilterCampDocNumber}
                        searchValue={searchCampDocNumber}
                        setSearchValue={setSearchCampDocNumber}
                      />
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                    <div className="flex items-center justify-between gap-2">
                      <span>Issue Date</span>
                      <div className="flex gap-1 no-print">
                        <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => handleSort('issue_date')}>
                          <ArrowUpDown className="w-3 h-3" />
                        </Button>
                        <ColumnFilter
                          values={uniqueCampIssueDates}
                          selected={filterCampIssueDate}
                          setSelected={setFilterCampIssueDate}
                          searchValue={searchCampIssueDate}
                          setSearchValue={setSearchCampIssueDate}
                        />
                      </div>
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                    <div className="flex items-center justify-between gap-2">
                      <span>Expiry Date</span>
                      <div className="flex gap-1 no-print">
                        <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => handleSort('expiry_date')}>
                          <ArrowUpDown className="w-3 h-3" />
                        </Button>
                        <ColumnFilter
                          values={uniqueCampExpiryDates}
                          selected={filterCampExpiryDate}
                          setSelected={setFilterCampExpiryDate}
                          searchValue={searchCampExpiryDate}
                          setSearchValue={setSearchCampExpiryDate}
                        />
                      </div>
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                    <div className="flex items-center justify-between gap-2">
                      <span>Status</span>
                      <ColumnFilter
                        values={uniqueCampStatuses}
                        selected={filterCampStatus}
                        setSelected={setFilterCampStatus}
                        searchValue={searchCampStatus}
                        setSearchValue={setSearchCampStatus}
                      />
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                    <div className="flex items-center justify-between gap-2">
                      <span>Issuing Authority</span>
                      <ColumnFilter
                        values={uniqueCampAuthorities}
                        selected={filterCampAuthority}
                        setSelected={setFilterCampAuthority}
                        searchValue={searchCampAuthority}
                        setSearchValue={setSearchCampAuthority}
                      />
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 no-print">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredDocs.map((doc, index) => {
                  const camp = camps.find(c => c.id === doc.camp_id);
                  const statusInfo = getDocumentStatus(doc.expiry_date);
                  
                  return (
                    <tr 
                      key={doc.id} 
                      className={`border-b border-gray-200 hover:bg-gray-50 transition-colors ${
                        index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                      }`}
                    >
                      <td className="px-4 py-3 text-sm text-gray-900 border-r border-gray-200 whitespace-nowrap font-medium">
                        {camp?.name || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 border-r border-gray-200 whitespace-nowrap">
                        {doc.document_type?.replace(/_/g, ' ').toUpperCase() || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 border-r border-gray-200 whitespace-nowrap font-medium">
                        {doc.document_name || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 border-r border-gray-200 whitespace-nowrap">
                        {doc.document_number || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 border-r border-gray-200 whitespace-nowrap">
                        {doc.issue_date ? format(parseISO(doc.issue_date), 'MMM dd, yyyy') : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 border-r border-gray-200 whitespace-nowrap">
                        {doc.expiry_date ? format(parseISO(doc.expiry_date), 'MMM dd, yyyy') : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm border-r border-gray-200 whitespace-nowrap">
                        <Badge variant={statusInfo.variant} className={`text-xs ${statusInfo.className}`}>
                          {statusInfo.status === 'expired' ? 'Expired' :
                           statusInfo.status === 'expiring_soon' ? `${statusInfo.days} days left` :
                           'Valid'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 border-r border-gray-200 whitespace-nowrap">
                        {doc.issuing_authority || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm whitespace-nowrap no-print">
                        {doc.file_url && (
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => window.open(doc.file_url, '_blank')}
                            className="text-blue-600 hover:text-blue-700"
                          >
                            View
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

        {/* Table Footer */}
        <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
          <p className="text-sm text-gray-600">
            Showing <span className="font-semibold">{filteredDocs.length}</span> document(s)
          </p>
        </div>
      </Card>
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
          }
          /* Ensure table elements specifically are visible and styled */
          #printable-table table {
            width: 100%;
            border-collapse: collapse;
            font-size: 9px; /* Smaller font for print */
          }
          #printable-table th,
          #printable-table td {
            border: 1px solid #000;
            padding: 3px;
            text-align: left;
            vertical-align: top; /* Align text to top in cells */
          }
          #printable-table th {
            background-color: #f3f4f6 !important; /* Ensure background prints */
            -webkit-print-color-adjust: exact; /* For webkit browsers */
            color-adjust: exact; /* Standard */
            font-weight: bold;
          }
          #printable-table tr:hover {
            background-color: inherit !important; /* Prevent hover styles on print */
          }
          /* Hide elements not meant for print */
          .no-print {
            display: none !important;
          }
          /* Ensure rows don't break across pages if possible */
          #printable-table tr {
            page-break-inside: avoid;
          }
          @page {
            size: landscape; /* Print in landscape mode */
            margin: 1cm; /* Smaller margins for more content */
          }
        }
      `}</style>

      <div className="max-w-[1800px] mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 no-print">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Document Management</h1>
            <p className="text-gray-600 mt-1">Track and manage all documents with expiry alerts</p>
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
              onClick={() => createSampleDocsMutation.mutate()} 
              className="border-green-600 text-green-600 hover:bg-green-50"
              disabled={createSampleDocsMutation.isLoading || technicians.length === 0}
            >
              <Plus className="w-4 h-4 mr-2" />
              {createSampleDocsMutation.isLoading ? 'Creating...' : 'Create Sample Docs'}
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
              Add Document
            </Button>
          </div>
        </div>

        {/* Alert Summary */}
        <div className="grid md:grid-cols-3 gap-4 no-print">
          <Card className="border-l-4 border-l-red-500 shadow-md">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Expired</p>
                  <p className="text-2xl font-bold text-red-600">
                    {[...techDocs, ...campDocs].filter(d => getDocumentStatus(d.expiry_date).status === 'expired').length}
                  </p>
                </div>
                <AlertCircle className="w-8 h-8 text-red-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-orange-500 shadow-md">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Expiring Soon</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {[...techDocs, ...campDocs].filter(d => getDocumentStatus(d.expiry_date).status === 'expiring_soon').length}
                  </p>
                </div>
                <AlertCircle className="w-8 h-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-green-500 shadow-md">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Valid</p>
                  <p className="text-2xl font-bold text-green-600">
                    {[...techDocs, ...campDocs].filter(d => getDocumentStatus(d.expiry_date).status === 'valid').length}
                  </p>
                </div>
                <FileText className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Documents Tabs */}
        <Tabs value={activeDisplayTab} onValueChange={setActiveDisplayTab} className="space-y-6">
          <TabsList className="bg-white shadow-sm no-print">
            <TabsTrigger value="technician">
              <User className="w-4 h-4 mr-2" />
              All Technician Docs
            </TabsTrigger>
            <TabsTrigger value="passport">Passport</TabsTrigger>
            <TabsTrigger value="visa">Visa</TabsTrigger>
            <TabsTrigger value="emirates_id">Emirates ID</TabsTrigger>
            <TabsTrigger value="labor_card">Labor Card</TabsTrigger>
            <TabsTrigger value="health_certificate">Health Certificate</TabsTrigger>
            <TabsTrigger value="other">Other Tech Docs</TabsTrigger>
            <TabsTrigger value="camp">
              <Building2 className="w-4 h-4 mr-2" />
              Camp Documents
            </TabsTrigger>
          </TabsList>

          {/* Technician Documents - All Types */}
          <TabsContent value="technician">
            {renderTechDocTable(null, "printable-table")}
          </TabsContent>

          {/* Individual Technician Document Type Tabs */}
          <TabsContent value="passport">
            {renderTechDocTable('passport', "printable-table")}
          </TabsContent>

          <TabsContent value="visa">
            {renderTechDocTable('visa', "printable-table")}
          </TabsContent>

          <TabsContent value="emirates_id">
            {renderTechDocTable('emirates_id', "printable-table")}
          </TabsContent>

          <TabsContent value="labor_card">
            {renderTechDocTable('labor_card', "printable-table")}
          </TabsContent>

          <TabsContent value="health_certificate">
            {renderTechDocTable('health_certificate', "printable-table")}
          </TabsContent>

          <TabsContent value="other">
            {renderTechDocTable('other', "printable-table")}
          </TabsContent>

          {/* Camp Documents */}
          <TabsContent value="camp">
            {renderCampDocTable("printable-table")}
          </TabsContent>
        </Tabs>
      </div>

      {/* Add Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Document</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Document Type</Label>
              <Select value={docType} onValueChange={(val) => { setDocType(val); setFormData({}); setTechnicianSearch(""); setCampSearch(""); }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="technician">Technician Document</SelectItem>
                  <SelectItem value="camp">Camp Document</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {docType === 'technician' ? (
              <>
                <div className="space-y-2">
                  <Label>Technician*</Label>
                  <Popover open={technicianPopoverOpen} onOpenChange={setTechnicianPopoverOpen}>
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
                          {filteredTechnicians.map((tech) => (
                            <CommandItem
                              key={tech.id}
                              value={tech.id}
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
                <div className="space-y-2">
                  <Label>Document Type*</Label>
                  <Select
                    value={formData.document_type || ''}
                    onValueChange={(val) => setFormData({...formData, document_type: val})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="passport">Passport</SelectItem>
                      <SelectItem value="visa">Visa</SelectItem>
                      <SelectItem value="emirates_id">Emirates ID</SelectItem>
                      <SelectItem value="labor_card">Labor Card</SelectItem>
                      <SelectItem value="health_certificate">Health Certificate</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Document Number</Label>
                  <Input
                    value={formData.document_number || ''}
                    onChange={(e) => setFormData({...formData, document_number: e.target.value})}
                  />
                </div>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <Label>Camp*</Label>
                  <Popover open={campPopoverOpen} onOpenChange={setCampPopoverOpen}>
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
                    <PopoverContent className="w-full p-0" align="start">
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
                                setCampPopoverOpen(false);
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
                  <Label>Document Type*</Label>
                  <Select
                    value={formData.document_type || ''}
                    onValueChange={(val) => setFormData({...formData, document_type: val})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="license">License</SelectItem>
                      <SelectItem value="ejari">Ejari</SelectItem>
                      <SelectItem value="compliance_certificate">Compliance Certificate</SelectItem>
                      <SelectItem value="safety_inspection">Safety Inspection</SelectItem>
                      <SelectItem value="fire_safety">Fire Safety</SelectItem>
                      <SelectItem value="health_permit">Health Permit</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Document Name*</Label>
                  <Input
                    required
                    value={formData.document_name || ''}
                    onChange={(e) => setFormData({...formData, document_name: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Issuing Authority</Label>
                  <Input
                    value={formData.issuing_authority || ''}
                    onChange={(e) => setFormData({...formData, issuing_authority: e.target.value})}
                  />
                </div>
              </>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Issue Date</Label>
                <Input
                  type="date"
                  value={formData.issue_date || ''}
                  onChange={(e) => setFormData({...formData, issue_date: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>Expiry Date*</Label>
                <Input
                  type="date"
                  required
                  value={formData.expiry_date || ''}
                  onChange={(e) => setFormData({...formData, expiry_date: e.target.value})}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Upload Document</Label>
              <div className="flex gap-2">
                <Input
                  type="file"
                  onChange={handleFileUpload}
                  disabled={uploading}
                />
                {formData.file_url && (
                  <p className="text-sm text-green-600">✓ File uploaded</p>
                )}
                {uploading && <Button disabled><Upload className="w-4 h-4 animate-spin" /></Button>}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setShowAddDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                Add Document
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Bulk Upload Dialog */}
      <Dialog open={showBulkUploadDialog} onOpenChange={setShowBulkUploadDialog}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Bulk Upload Documents</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Document Category</Label>
              <Select value={docType} onValueChange={(val) => { setDocType(val); setBulkFile(null); setUploadResult(null); }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="technician">Technician Documents</SelectItem>
                  <SelectItem value="camp">Camp Documents</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Alert>
              <AlertDescription>
                Upload a CSV file with document data. Download the template below to see the required format. Ensure technician employee IDs or camp codes in your CSV match existing records.
              </AlertDescription>
            </Alert>

            <Button
              variant="outline"
              onClick={downloadTemplate}
              className="w-full"
            >
              <Download className="w-4 h-4 mr-2" />
              Download CSV Template ({docType === 'technician' ? 'Technician' : 'Camp'})
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
                    ? `Successfully uploaded ${uploadResult.count} documents.`
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

      {/* Duplicate Document Dialog */}
      <Dialog open={showDuplicateDialog} onOpenChange={setShowDuplicateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-orange-700">
              <AlertCircle className="w-5 h-5" />
              Duplicate Document Detected
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Alert className="border-orange-500 bg-orange-50">
              <AlertCircle className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-sm text-orange-900">
                A document of type <strong>{existingDocument?.document_type?.replace(/_/g, ' ').toUpperCase()}</strong> already exists for this camp:
              </AlertDescription>
            </Alert>

            {existingDocument && (
              <div className="bg-gray-50 border rounded-lg p-3">
                <h4 className="font-semibold text-sm mb-2">Existing Document:</h4>
                <div className="space-y-1 text-sm">
                  {existingDocument.document_name && (
                    <div>
                      <span className="text-gray-600">Name:</span>
                      <span className="ml-2 font-medium">{existingDocument.document_name}</span>
                    </div>
                  )}
                  {existingDocument.document_number && (
                    <div>
                      <span className="text-gray-600">Number:</span>
                      <span className="ml-2 font-medium">{existingDocument.document_number}</span>
                    </div>
                  )}
                  {existingDocument.expiry_date && (
                    <div>
                      <span className="text-gray-600">Expiry Date:</span>
                      <span className="ml-2 font-medium">{format(parseISO(existingDocument.expiry_date), 'dd/MMM/yyyy')}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <p className="text-sm text-gray-700">
              Would you like to <strong>archive the old document</strong> and create this new one, or <strong>cancel this entry</strong>?
            </p>

            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={handleCancelDuplicate}
                className="flex-1"
              >
                Cancel Entry
              </Button>
              <Button
                onClick={handleArchiveAndCreate}
                className="flex-1 bg-orange-600 hover:bg-orange-700"
              >
                Archive Old & Create New
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}