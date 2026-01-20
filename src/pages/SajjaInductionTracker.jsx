import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Clock, AlertCircle, CheckCircle2, Users, Download, Printer, ArrowUpDown, Filter, X, List, Briefcase, FileText, Upload, Paperclip } from "lucide-react";
import { format, parseISO, differenceInDays } from "date-fns";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function SajjaInductionTracker() {
  const [selectedTechnician, setSelectedTechnician] = useState(null);
  const [showChecklistDialog, setShowChecklistDialog] = useState(false); // This will become the consolidated dialog
  const [processing, setProcessing] = useState(false);
  const [sortField, setSortField] = useState("sajja_induction_start_date");
  const [sortDirection, setSortDirection] = useState("desc");

  // Consolidated form state
  const [checklistData, setChecklistData] = useState({
    advance_payment_given: false,
    safety_shoes_issued: false,
    helmet_issued: false,
    jacket_issued: false,
    ppe_issued: false,
    c3_card_issued: false,
    hse_induction_completed: false,
    training_induction_completed: false
  });
  const [selectedProject, setSelectedProject] = useState("no_project"); // Changed default to "no_project"
  const [projectAssignmentDate, setProjectAssignmentDate] = useState(""); // Initialize to empty string
  const [completionDate, setCompletionDate] = useState("");
  const [completionTime, setCompletionTime] = useState("");
  const [taskAttachments, setTaskAttachments] = useState({});
  const [uploadingTaskId, setUploadingTaskId] = useState(null);

  // Bulk selection state
  const [selectedTechnicians, setSelectedTechnicians] = useState([]);
  const [showBulkCompleteDialog, setShowBulkCompleteDialog] = useState(false);
  const [bulkCompletionDate, setBulkCompletionDate] = useState('');
  const [bulkCompletionTime, setBulkCompletionTime] = useState('');
  const [bulkSelectedProject, setBulkSelectedProject] = useState('no_project'); // Changed default to "no_project"
  const [bulkProjectAssignmentDate, setBulkProjectAssignmentDate] = useState('');
  const [bulkCompletionNotes, setBulkCompletionNotes] = useState('');

  // Excel-style column filters
  const [filterEmployeeId, setFilterEmployeeId] = useState([]);
  const [filterFullName, setFilterFullName] = useState([]);
  const [filterNationality, setFilterNationality] = useState([]);
  const [filterGender, setFilterGender] = useState([]);
  const [filterTrade, setFilterTrade] = useState([]);
  const [filterDepartment, setFilterDepartment] = useState([]);

  // Search states for column filters
  const [searchEmployeeId, setSearchEmployeeId] = useState("");
  const [searchFullName, setSearchFullName] = useState("");
  const [searchNationality, setSearchNationality] = useState("");
  const [searchGender, setSearchGender] = useState("");
  const [searchTrade, setSearchTrade] = useState("");
  const [searchDepartment, setSearchDepartment] = useState("");

  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
  });

  const { data: technicians = [], isLoading } = useQuery({
    queryKey: ['technicians'],
    queryFn: () => base44.entities.Technician.list('-sajja_induction_start_date'),
  });

  const { data: camps = [] } = useQuery({
    queryKey: ['camps'],
    queryFn: () => base44.entities.Camp.list(),
  });

  const { data: projects = [], isLoading: isLoadingProjects } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list(),
  });

  const { data: inductionParties = [] } = useQuery({
    queryKey: ['induction-parties'],
    queryFn: () => base44.entities.InductionParty.list('sequence_order'),
  });

  const { data: taskTemplates = [] } = useQuery({
    queryKey: ['induction-task-templates'],
    queryFn: () => base44.entities.InductionTaskTemplate.list(),
  });

  const { data: technicianTasks = [] } = useQuery({
    queryKey: ['technician-induction-tasks'],
    queryFn: () => base44.entities.TechnicianInductionTask.list(),
    staleTime: 3 * 60 * 1000,
  });

  const sajjaCamp = camps.find(c => c.code?.toLowerCase() === 'sajja' || c.name?.toLowerCase().includes('sajja'));

  const preInductionTechnicians = technicians.filter(tech => 
    tech.camp_id === sajjaCamp?.id &&
    tech.induction_status === 'pre_induction' &&
    tech.sajja_induction_start_date &&
    tech.bed_id
  );

  const categorizedTechnicians = preInductionTechnicians.map(tech => {
    const startDate = parseISO(tech.sajja_induction_start_date);
    const daysInInduction = differenceInDays(new Date(), startDate);
    const isOverdue = daysInInduction > 5;

    // Calculate progress based on Induction Master tasks - handle duplicates by taking latest per template
    const tasksForThisTech = technicianTasks.filter(t => t.technician_id === tech.id);
    const activeTemplates = taskTemplates.filter(t => t.is_active !== false);
    
    // Get unique tasks per template (latest only if duplicates exist)
    const uniqueTasks = activeTemplates.map(template => {
      const tasksForTemplate = tasksForThisTech.filter(t => t.task_template_id === template.id);
      // Return the most recently created task for this template, or null if none exist
      return tasksForTemplate.length > 0 
        ? tasksForTemplate.sort((a, b) => new Date(b.created_date || 0) - new Date(a.created_date || 0))[0]
        : null;
    }).filter(t => t !== null);
    
    const totalTasks = activeTemplates.length;
    const completedTasks = uniqueTasks.filter(t => t.status === 'completed').length;
    const checklistProgress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

    return {
      ...tech,
      daysInInduction,
      isOverdue,
      checklistProgress,
      allChecklistCompleted: totalTasks > 0 && completedTasks === totalTasks
    };
  });

  // Apply column filters
  let filteredTechnicians = categorizedTechnicians.filter(tech => {
    if (filterEmployeeId.length > 0 && !filterEmployeeId.includes(tech.employee_id || '-')) return false;
    if (filterFullName.length > 0 && !filterFullName.includes(tech.full_name || '-')) return false;
    if (filterNationality.length > 0 && !filterNationality.includes(tech.nationality || '-')) return false;
    if (filterGender.length > 0 && !filterGender.includes(tech.gender || '-')) return false;
    if (filterTrade.length > 0 && !filterTrade.includes(tech.trade || '-')) return false;
    if (filterDepartment.length > 0 && !filterDepartment.includes(tech.department || '-')) return false;
    
    return true;
  });

  // Sort
  const sortedTechnicians = [...filteredTechnicians].sort((a, b) => {
    let aVal = a[sortField] || '';
    let bVal = b[sortField] || '';

    if (sortField === 'sajja_induction_start_date') {
      aVal = new Date(aVal).getTime();
      bVal = new Date(bVal).getTime();
    } else if (sortField === 'daysInInduction') {
      aVal = a.daysInInduction;
      bVal = b.daysInInduction;
    } else if (sortField === 'checklistProgress') {
      aVal = a.checklistProgress;
      bVal = b.checklistProgress;
    }

    if (sortDirection === 'asc') {
      return aVal > bVal ? 1 : -1;
    } else {
      return aVal < bVal ? 1 : -1;
    }
  });

  const onTimeTechnicians = sortedTechnicians.filter(t => !t.isOverdue);
  const overdueTechnicians = sortedTechnicians.filter(t => t.isOverdue);

  // Get unique values for filters
  const uniqueEmployeeIds = [...new Set(categorizedTechnicians.map(t => t.employee_id || '-'))].sort();
  const uniqueFullNames = [...new Set(categorizedTechnicians.map(t => t.full_name || '-'))].sort();
  const uniqueNationalities = [...new Set(categorizedTechnicians.map(t => t.nationality || '-'))].sort();
  const uniqueGenders = [...new Set(categorizedTechnicians.map(t => t.gender || '-'))].sort();
  const uniqueTrades = [...new Set(categorizedTechnicians.map(t => t.trade || '-'))].sort();
  const uniqueDepartments = [...new Set(categorizedTechnicians.map(t => t.department || '-'))].sort();

  const updateTechnicianMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Technician.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['technicians'] });
      queryClient.invalidateQueries({ queryKey: ['technician-induction-tasks'] });
      setShowChecklistDialog(false);
      setSelectedTechnician(null);
      setChecklistData({});
      setSelectedProject('no_project');
      setProjectAssignmentDate('');
      setCompletionDate('');
      setCompletionTime('');
    },
  });

  const createTaskMutation = useMutation({
    mutationFn: (data) => base44.entities.TechnicianInductionTask.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['technician-induction-tasks'] });
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.TechnicianInductionTask.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['technician-induction-tasks'] });
    },
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
    setFilterEmployeeId([]);
    setFilterFullName([]);
    setFilterNationality([]);
    setFilterGender([]);
    setFilterTrade([]);
    setFilterDepartment([]);
  };

  const hasActiveFilters = filterEmployeeId.length > 0 || filterFullName.length > 0 ||
    filterNationality.length > 0 || filterGender.length > 0 || filterTrade.length > 0 ||
    filterDepartment.length > 0;

  const handleManageChecklist = async (tech) => {
    setSelectedTechnician(tech);
    
    // Create missing tasks for this technician based on active templates
    const existingTaskTemplateIds = technicianTasks
      .filter(t => t.technician_id === tech.id)
      .map(t => t.task_template_id);
    
    const activeTemplates = taskTemplates.filter(t => t.is_active !== false);
    const missingTemplates = activeTemplates.filter(t => !existingTaskTemplateIds.includes(t.id));
    
    if (missingTemplates.length > 0) {
      const createPromises = missingTemplates.map(template => 
        createTaskMutation.mutateAsync({
          technician_id: tech.id,
          task_template_id: template.id,
          party_id: template.party_id,
          status: 'pending'
        })
      );
      await Promise.allSettled(createPromises);
      await queryClient.invalidateQueries({ queryKey: ['technician-induction-tasks'] });
    }
    
    setSelectedProject(tech.project_id || "no_project");
    setProjectAssignmentDate(tech.project_assigned_date || format(new Date(), 'yyyy-MM-dd'));
    setCompletionDate(tech.induction_completion_date || format(new Date(), 'yyyy-MM-dd'));
    setCompletionTime(tech.induction_time || format(new Date(), 'HH:mm'));
    
    setShowChecklistDialog(true);
  };

  const handleTaskToggle = async (taskId, currentStatus, partyId) => {
    if (currentUser?.role !== 'admin' && currentUser?.induction_party_id !== partyId) {
      alert('You do not have permission to modify tasks for this department');
      return;
    }

    const now = new Date();
    const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
    
    await updateTaskMutation.mutateAsync({
      id: taskId,
      data: {
        status: newStatus,
        completed_date: newStatus === 'completed' ? format(now, 'yyyy-MM-dd') : null,
        completed_time: newStatus === 'completed' ? format(now, 'HH:mm') : null,
        completed_by: newStatus === 'completed' ? currentUser?.full_name || 'Current User' : null,
        attachment_url: newStatus === 'completed' ? (taskAttachments[taskId] || null) : null
      }
    });
  };

  const handleTaskAttachmentUpload = async (taskId, file) => {
    if (!file) return;
    
    setUploadingTaskId(taskId);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setTaskAttachments(prev => ({ ...prev, [taskId]: file_url }));
      
      // If task is already completed, update it with the attachment
      const task = technicianTasks.find(t => t.id === taskId);
      if (task?.status === 'completed') {
        await updateTaskMutation.mutateAsync({
          id: taskId,
          data: { attachment_url: file_url }
        });
      }
    } catch (err) {
      console.error('Error uploading task attachment:', err);
      alert(`Failed to upload: ${err.message}`);
    } finally {
      setUploadingTaskId(null);
    }
  };

  // Reactive check that updates when technicianTasks change
  const allChecklistItemsSelected = React.useMemo(() => {
    if (!selectedTechnician) return false;
    const tasksForTech = technicianTasks.filter(t => t.technician_id === selectedTechnician.id);
    const activeTemplates = taskTemplates.filter(t => t.is_active !== false);
    const allComplete = tasksForTech.length === activeTemplates.length && 
                        tasksForTech.length > 0 && 
                        tasksForTech.every(t => t.status === 'completed');
    console.log('Checklist Status:', {
      technicianId: selectedTechnician.id,
      tasksCount: tasksForTech.length,
      templatesCount: activeTemplates.length,
      allCompleted: tasksForTech.every(t => t.status === 'completed'),
      result: allComplete
    });
    return allComplete;
  }, [selectedTechnician, technicianTasks, taskTemplates]);

  const handleSaveAll = async () => {
    if (!selectedTechnician) return;

    setProcessing(true);
    try {
      const tasksForTech = technicianTasks.filter(t => t.technician_id === selectedTechnician.id);
      const allCompleted = tasksForTech.length > 0 && tasksForTech.every(t => t.status === 'completed');
      
      const updateData = {
        pre_induction_checklist_completed: allCompleted
      };

      // Handle checklist completion timestamp
      if (allCompleted && !selectedTechnician.pre_induction_checklist_completed) {
        updateData.pre_induction_checklist_completion_date = format(new Date(), 'yyyy-MM-dd');
        updateData.pre_induction_checklist_completion_time = format(new Date(), 'HH:mm');
      } else if (!allCompleted && selectedTechnician.pre_induction_checklist_completed) {
        updateData.pre_induction_checklist_completion_date = null;
        updateData.pre_induction_checklist_completion_time = null;
      }

      // Handle project assignment (only if all tasks complete AND a project is selected)
      if (allCompleted && selectedProject && selectedProject !== 'no_project') {
        updateData.project_id = selectedProject;
        updateData.project_assigned_date = projectAssignmentDate;
        updateData.project_assigned_by = 'Admin';
      } else {
        updateData.project_id = null;
        updateData.project_assigned_date = null;
        updateData.project_assigned_by = null;
      }

      // Handle pre-induction completion
      if (allCompleted && selectedProject && selectedProject !== 'no_project' && completionDate) {
        updateData.induction_status = 'induction_completed';
        updateData.induction_completion_date = completionDate;
        updateData.induction_date = completionDate;
        updateData.induction_time = completionTime || format(new Date(), 'HH:mm');
      } else if (selectedTechnician.induction_status === 'induction_completed') {
        updateData.induction_status = 'pre_induction';
        updateData.induction_completion_date = null;
        updateData.induction_date = null;
        updateData.induction_time = null;
      }

      await updateTechnicianMutation.mutateAsync({
        id: selectedTechnician.id,
        data: updateData
      });

      let message = 'Pre-induction data saved successfully!';
      if (allCompleted && selectedProject && selectedProject !== 'no_project' && completionDate) {
        message = '✅ Pre-induction completed successfully!';
      }
      
      alert(message);
    } catch (err) {
      console.error('Error saving:', err);
      alert('Failed to save. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const handleSelectAll = () => {
    if (selectedTechnicians.length === sortedTechnicians.length) {
      setSelectedTechnicians([]);
    } else {
      setSelectedTechnicians(sortedTechnicians.map(t => t.id));
    }
  };

  const handleSelectTechnician = (techId) => {
    if (selectedTechnicians.includes(techId)) {
      setSelectedTechnicians(selectedTechnicians.filter(id => id !== techId));
    } else {
      setSelectedTechnicians([...selectedTechnicians, techId]);
    }
  };

  const handleBulkCompleteClick = () => {
    if (selectedTechnicians.length === 0) {
      alert("Please select at least one technician to complete induction");
      return;
    }

    // Set default system date and time
    const now = new Date();
    setBulkCompletionDate(format(now, 'yyyy-MM-dd'));
    setBulkCompletionTime(format(now, 'HH:mm'));
    setBulkProjectAssignmentDate(format(now, 'yyyy-MM-dd'));
    setBulkSelectedProject('no_project'); // Default to "no_project"
    setBulkCompletionNotes('');
    setShowBulkCompleteDialog(true);
  };

  const handleBulkCompleteInduction = async () => {
    if (!bulkCompletionDate) {
      alert("Please enter the completion date");
      return;
    }
    if (!bulkCompletionTime) {
      alert("Please enter the completion time");
      return;
    }
    if (selectedTechnicians.length === 0) {
      alert("No technicians selected for bulk completion.");
      return;
    }

    const hasProject = bulkSelectedProject && bulkSelectedProject !== 'no_project';
    
    const confirmMessage = hasProject 
      ? `This will:\n✅ Mark all checklist items as complete\n✅ Assign project: ${(projects || []).find(p => p.id === bulkSelectedProject)?.project_name || 'Selected Project'}\n✅ Complete pre-induction for ${selectedTechnicians.length} technician(s)\n\nProceed?`
      : `This will:\n✅ Mark all checklist items as complete\n✅ Complete pre-induction for ${selectedTechnicians.length} technician(s)\n⚠️ NO project will be assigned\n\nProceed?`;

    if (!window.confirm(confirmMessage)) {
      return;
    }

    setProcessing(true);
    let successCount = 0;
    let errorCount = 0;
    const errors = [];
    const mutations = [];

    for (const techId of selectedTechnicians) {
      const tech = (technicians || []).find(t => t.id === techId);
      if (!tech) continue;

      // Build comprehensive update data
      const updateData = {
        // Mark all checklist items as complete
        advance_payment_given: true,
        safety_shoes_issued: true,
        helmet_issued: true,
        jacket_issued: true,
        ppe_issued: true, // New field
        c3_card_issued: true, // New field
        hse_induction_completed: true,
        training_induction_completed: true,
        pre_induction_checklist_completed: true,
        pre_induction_checklist_completion_date: bulkCompletionDate,
        pre_induction_checklist_completion_time: bulkCompletionTime,
        
        // Complete induction
        induction_status: 'induction_completed',
        induction_completion_date: bulkCompletionDate,
        induction_date: bulkCompletionDate,
        induction_time: bulkCompletionTime,
      };

      // Add project assignment if selected, otherwise explicitly nullify
      if (bulkSelectedProject && bulkSelectedProject !== 'no_project') {
        updateData.project_id = bulkSelectedProject;
        updateData.project_assigned_date = bulkProjectAssignmentDate;
        updateData.project_assigned_by = 'Admin'; // Could be currentUser.email if available
      } else {
        updateData.project_id = null;
        updateData.project_assigned_date = null;
        updateData.project_assigned_by = null;
      }

      mutations.push(
        updateTechnicianMutation.mutateAsync({
          id: techId,
          data: updateData
        }).then(() => {
          successCount++;
        }).catch(err => {
          errorCount++;
          errors.push(`${tech.full_name} (${tech.employee_id}): ${err.message || 'Unknown error'}`);
          return Promise.reject(err);
        })
      );
    }

    try {
      await Promise.allSettled(mutations);

      if (successCount > 0) {
        let successMessage = `✅ Successfully completed pre-induction for ${successCount} technician(s)!`;
        if (hasProject) {
          const projectName = projects.find(p => p.id === bulkSelectedProject)?.project_name;
          successMessage += `\n✅ Project assigned: ${projectName}`;
        }
        if (errorCount > 0) {
          successMessage += `\n⚠️ ${errorCount} failed.`;
        }
        alert(successMessage);
      }

      if (errorCount > 0) {
        console.error("Bulk completion errors:", errors);
        alert(`Failed to complete induction for some technicians:\n${errors.slice(0, 5).join('\n')}${errors.length > 5 ? `\n... and ${errors.length - 5} more` : ''}`);
      }
      
      queryClient.invalidateQueries({ queryKey: ['technicians'] });
      
      setSelectedTechnicians([]);
      setShowBulkCompleteDialog(false);
      setBulkCompletionDate('');
      setBulkCompletionTime('');
      setBulkSelectedProject('no_project'); // Reset to "no_project"
      setBulkProjectAssignmentDate('');
      setBulkCompletionNotes('');

    } catch (err) {
      console.error('An unexpected error occurred during bulk completion:', err);
      alert('An unexpected error occurred during bulk completion. Check console for details.');
    } finally {
      setProcessing(false);
    }
  };

  const exportToCSV = () => {
    const headers = ['Employee ID', 'Full Name', 'Nationality', 'Trade', 'Department', 'Start Date', 'Days in Pre-Induction', 'Checklist Progress', 'Project', 'Status'];
    
    const data = sortedTechnicians.map(tech => {
      const project = projects.find(p => p.id === tech.project_id);
      return [
        tech.employee_id,
        tech.full_name,
        tech.nationality || '-',
        tech.trade || '-',
        tech.department || '-',
        format(parseISO(tech.sajja_induction_start_date), 'dd/MMM/yyyy'),
        tech.daysInInduction,
        `${Math.round(tech.checklistProgress)}%`,
        project?.project_name || '-',
        tech.isOverdue ? 'OVERDUE' : 'On Time'
      ];
    });

    const csv = [headers, ...data].map(row => 
      row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    ).join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `sajja_induction_tracker_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const printReport = () => {
    window.print();
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
        // If all are currently selected (or none), clear all
        setSelected([]);
      } else {
        // If some or none are selected, select all filtered values
        setSelected([...values]);
      }
    };

    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
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
                  {selected.length === values.length && values.length > 0 ? 'Deselect All' : 'Select All'}
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

  if (isLoading || isLoadingProjects) {
    return (
      <div className="p-6 md:p-8 bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Sajja induction data...</p>
        </div>
      </div>
    );
  }

  if (!sajjaCamp) {
    return (
      <div className="p-6 md:p-8 bg-gray-50 min-h-screen">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Sajja Camp not found in the system. Please ensure a camp with code "SAJJA" or name containing "Sajja" exists.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const techniciansWithoutBeds = technicians.filter(tech => 
    tech.camp_id === sajjaCamp?.id &&
    tech.induction_status === 'pre_induction' &&
    tech.sajja_induction_start_date &&
    !tech.bed_id
  );

  const techniciansReadyForProject = sortedTechnicians.filter(t => 
    t.allChecklistCompleted && !t.project_id
  );

  return (
    <div className="p-6 md:p-8 bg-gray-50 min-h-screen">
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-content,
          #printable-content * {
            visibility: visible;
          }
          #printable-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 20px;
            background-color: #fff;
          }
          .no-print {
            display: none !important;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 10px;
          }
          th, td {
            border: 1px solid #000;
            padding: 4px;
            text-align: left;
          }
          th {
            background-color: #f3f4f6 !important;
            font-weight: bold;
          }
          /* Ensure column filter buttons are hidden */
          .no-print .flex.gap-0\\.5 {
            display: none;
          }
        }
      `}</style>

      <div className="max-w-7xl mx-auto space-y-4">
        <Alert className="border-blue-200 bg-blue-50 no-print">
          <AlertCircle className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-900 text-sm">
            <strong>📍 Step 5 of 6: Sajja Pre-Induction (5 days max)</strong><br/>
            Complete all checklist tasks from Induction Master → Assign project → Mark complete → Status: "Induction Completed" → Next: Camp Induction (if required)
          </AlertDescription>
        </Alert>

        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Sajja Camp - Pre-Induction Tracker</h1>
            <p className="text-sm text-gray-600 mt-0.5">Manage pre-induction processes</p>
          </div>
          <div className="flex-shrink-0 flex items-center gap-2">
            {selectedTechnicians.length > 0 && (
              <Button 
                onClick={handleBulkCompleteClick}
                className="bg-green-600 hover:bg-green-700"
                size="sm"
                disabled={processing}
              >
                <CheckCircle2 className="w-4 h-4 mr-1" />
                Complete Selected ({selectedTechnicians.length})
              </Button>
            )}
            <Button variant="outline" onClick={exportToCSV} size="sm" className="border-green-600 text-green-600 hover:bg-green-50">
              <Download className="w-3 h-3 mr-1" />
              Export CSV
            </Button>
            <Button variant="outline" onClick={printReport} size="sm" className="border-blue-600 text-blue-600 hover:bg-blue-50">
              <Printer className="w-3 h-3 mr-1" />
              Print
            </Button>
          </div>
        </div>

        {techniciansWithoutBeds.length > 0 && (
          <Alert className="border-l-4 border-l-orange-600 bg-orange-50 no-print mb-4">
            <AlertCircle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-800">
              <strong>{techniciansWithoutBeds.length} technician(s)</strong> are in pre-induction status but don't have beds allocated yet.
              They will appear in this tracker once beds are assigned via the <strong>Smart Allocation</strong> page.
            </AlertDescription>
          </Alert>
        )}

        {techniciansReadyForProject.length > 0 && (
          <Alert className="border-l-4 border-l-green-600 bg-green-50 no-print mb-4">
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription className="text-green-800">
              <strong>{techniciansReadyForProject.length} technician(s)</strong> have completed their checklists and are ready for project assignment!
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 no-print mb-4">
          <Card className="border-none shadow-sm bg-gradient-to-br from-blue-50 to-blue-100">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-blue-600 mb-0.5">Total in Pre-Induction</p>
                  <p className="text-2xl font-bold text-blue-900">{preInductionTechnicians.length}</p>
                </div>
                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                  <Users className="w-5 h-5 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm bg-gradient-to-br from-green-50 to-green-100">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-green-600 mb-0.5">Checklist Complete</p>
                  <p className="text-2xl font-bold text-green-900">
                    {sortedTechnicians.filter(t => t.allChecklistCompleted).length}
                  </p>
                </div>
                <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm bg-gradient-to-br from-purple-50 to-purple-100">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-purple-600 mb-0.5">Ready for Project</p>
                  <p className="text-2xl font-bold text-purple-900">{techniciansReadyForProject.length}</p>
                </div>
                <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center">
                  <Briefcase className="w-5 h-5 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div id="printable-content">
          <div className="hidden print:block mb-4">
            <h1 className="text-2xl font-bold">Sajja Camp - Pre-Induction Tracker</h1>
            <p className="text-sm text-gray-600">Generated on {format(new Date(), 'dd/MM/yyyy HH:mm')}</p>
            <p className="text-sm mt-2">Total: {preInductionTechnicians.length} | On Time: {onTimeTechnicians.length} | Overdue: {overdueTechnicians.length} | Checklist Complete: {sortedTechnicians.filter(t => t.allChecklistCompleted).length} | Ready for Project: {techniciansReadyForProject.length}</p>
          </div>

          {overdueTechnicians.length > 0 && (
            <Card className="border-none shadow-lg mb-4">
              {hasActiveFilters && (
                <div className="bg-blue-50 border-b border-blue-200 px-4 py-2 no-print">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-blue-700 font-medium">
                      <Filter className="w-3 h-3 inline mr-1" />
                      Column filters active
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearAllFilters}
                      className="text-xs h-7 text-blue-700 hover:text-blue-900 hover:bg-blue-100"
                    >
                      <X className="w-3 h-3 mr-1" />
                      Clear All Filters
                    </Button>
                  </div>
                </div>
              )}

              <CardHeader className="border-b bg-gradient-to-r from-red-50 to-red-100 py-3 px-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <AlertCircle className="w-5 h-5 text-red-600" />
                    Overdue Pre-Induction ({overdueTechnicians.length})
                  </CardTitle>
                  {selectedTechnicians.length > 0 && (
                    <div className="flex items-center gap-2 no-print">
                      <Badge variant="default" className="text-xs bg-blue-600">
                        {selectedTechnicians.length} selected
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => setSelectedTechnicians([])}
                      >
                        Clear
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Alert variant="destructive" className="m-4 no-print">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    These technicians have exceeded the 5-day pre-induction period. Please complete their induction or investigate delays.
                  </AlertDescription>
                </Alert>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse bg-white">
                    <thead>
                      <tr className="border-b-2 border-gray-300">
                        <th className="px-2 py-2 text-center bg-gray-50 border-r border-gray-200 no-print w-8">
                          <Checkbox
                            checked={selectedTechnicians.length > 0 && sortedTechnicians.every(t => selectedTechnicians.includes(t.id))}
                            onCheckedChange={handleSelectAll}
                            disabled={processing}
                          />
                        </th>
                        <th className="px-2 py-2 text-center bg-gray-50 border-r border-gray-200 no-print w-24">
                          <span className="text-[10px] font-semibold text-gray-700 uppercase tracking-wider">Action</span>
                        </th>
                        <th className="px-2 py-2 text-left text-[10px] font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                          <div className="flex items-center justify-between gap-1">
                            <span>Employee ID</span>
                            <div className="flex gap-0.5 no-print">
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => handleSort('employee_id')}>
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
                        <th className="px-2 py-2 text-left text-[10px] font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                          <div className="flex items-center justify-between gap-1">
                            <span>Full Name</span>
                            <div className="flex gap-0.5 no-print">
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => handleSort('full_name')}>
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
                        <th className="px-2 py-2 text-left text-[10px] font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                          <div className="flex items-center justify-between gap-1">
                            <span>Nationality</span>
                            <div className="flex gap-0.5 no-print">
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => handleSort('nationality')}>
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
                        <th className="px-2 py-2 text-left text-[10px] font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                          <div className="flex items-center justify-between gap-1">
                            <span>Gender</span>
                            <div className="flex gap-0.5 no-print">
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => handleSort('gender')}>
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
                        <th className="px-2 py-2 text-left text-[10px] font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                          <div className="flex items-center justify-between gap-1">
                            <span>Trade</span>
                            <div className="flex gap-0.5 no-print">
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => handleSort('trade')}>
                                <ArrowUpDown className="w-3 h-3" />
                              </Button>
                              <ColumnFilter
                                values={uniqueTrades}
                                selected={filterTrade}
                                setSelected={setFilterTrade}
                                searchValue={searchTrade}
                                setSearchValue={setSearchTrade}
                              />
                            </div>
                          </div>
                        </th>
                        <th className="px-2 py-2 text-left text-[10px] font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                          <div className="flex items-center justify-between gap-1">
                            <span>Department</span>
                            <div className="flex gap-0.5 no-print">
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => handleSort('department')}>
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
                        <th className="px-2 py-2 text-left text-[10px] font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                          <div className="flex items-center justify-between gap-1">
                            <span>Start Date</span>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 no-print" onClick={() => handleSort('sajja_induction_start_date')}>
                              <ArrowUpDown className="w-3 h-3" />
                            </Button>
                          </div>
                        </th>
                        <th className="px-2 py-2 text-left text-[10px] font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                          <div className="flex items-center justify-between gap-1">
                            <span>Days</span>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 no-print" onClick={() => handleSort('daysInInduction')}>
                              <ArrowUpDown className="w-3 h-3" />
                            </Button>
                          </div>
                        </th>
                        <th className="px-2 py-2 text-left text-[10px] font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                          <div className="flex items-center justify-between gap-1">
                            <span>Checklist</span>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 no-print" onClick={() => handleSort('checklistProgress')}>
                              <ArrowUpDown className="w-3 h-3" />
                            </Button>
                          </div>
                        </th>
                        <th className="px-2 py-2 text-left text-[10px] font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                          <span>Project</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {overdueTechnicians.length === 0 ? (
                        <tr>
                          <td colSpan={13} className="px-4 py-8 text-center text-sm text-gray-500">
                            No overdue technicians
                          </td>
                        </tr>
                      ) : (
                        overdueTechnicians.map((tech, index) => {
                          const isSelected = selectedTechnicians.includes(tech.id);
                          const assignedProject = projects.find(p => p.id === tech.project_id);
                          return (
                            <tr
                              key={tech.id}
                              className={`border-b border-gray-200 hover:bg-red-100 transition-colors ${
                                isSelected ? 'bg-blue-100' :
                                index % 2 === 0 ? 'bg-red-50' : 'bg-red-100/50'
                              }`}
                            >
                              <td className="px-2 py-2 text-center border-r border-gray-200 no-print">
                                <Checkbox
                                  checked={isSelected}
                                  onCheckedChange={() => handleSelectTechnician(tech.id)}
                                  disabled={processing}
                                />
                              </td>
                              <td className="px-2 py-2 text-center border-r border-gray-200 no-print">
                                <Button
                                  onClick={() => handleManageChecklist(tech)}
                                  size="sm"
                                  className="bg-blue-600 hover:bg-blue-700 h-7 text-xs px-3"
                                  disabled={selectedTechnicians.length > 0 || processing}
                                >
                                  Manage
                                </Button>
                              </td>
                              <td className="px-2 py-2 text-xs font-medium text-blue-600 border-r border-gray-200 whitespace-nowrap">
                                {tech.employee_id}
                              </td>
                              <td className="px-2 py-2 text-xs text-gray-900 border-r border-gray-200 whitespace-nowrap font-medium">
                                {tech.full_name}
                              </td>
                              <td className="px-2 py-2 text-xs text-gray-700 border-r border-gray-200 whitespace-nowrap">
                                {tech.nationality || '-'}
                              </td>
                              <td className="px-2 py-2 text-xs text-gray-700 border-r border-gray-200 whitespace-nowrap">
                                {tech.gender || '-'}
                              </td>
                              <td className="px-2 py-2 text-xs text-gray-700 border-r border-gray-200 whitespace-nowrap">
                                {tech.trade || '-'}
                              </td>
                              <td className="px-2 py-2 text-xs text-gray-700 border-r border-gray-200 whitespace-nowrap">
                                {tech.department || '-'}
                              </td>
                              <td className="px-2 py-2 text-xs text-gray-700 border-r border-gray-200 whitespace-nowrap">
                                {format(parseISO(tech.sajja_induction_start_date), 'dd/MMM/yyyy')}
                              </td>
                              <td className="px-2 py-2 text-xs border-r border-gray-200 whitespace-nowrap">
                                <Badge variant="destructive" className="text-[10px] py-0 h-5">
                                  {tech.daysInInduction} days (Overdue {tech.daysInInduction - 5})
                                </Badge>
                              </td>
                              <td className="px-2 py-2 text-xs border-r border-gray-200 whitespace-nowrap">
                                <Badge 
                                  variant={tech.allChecklistCompleted ? "success" : "default"} 
                                  className={`text-[10px] py-0 h-5 ${tech.allChecklistCompleted ? 'bg-green-500' : 'bg-gray-400'}`}
                                >
                                  {Math.round(tech.checklistProgress)}% Complete
                                </Badge>
                              </td>
                              <td className="px-2 py-2 text-xs text-gray-700 border-r border-gray-200 whitespace-nowrap">
                                {assignedProject ? assignedProject.project_name : '-'}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {onTimeTechnicians.length > 0 && (
            <Card className="border-none shadow-lg">
              <CardHeader className="border-b bg-gradient-to-r from-green-50 to-green-100 py-3 px-4">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Clock className="w-5 h-5 text-green-600" />
                  On Time Pre-Induction ({onTimeTechnicians.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse bg-white">
                    <thead>
                      <tr className="border-b-2 border-gray-300">
                        <th className="px-2 py-2 text-center bg-gray-50 border-r border-gray-200 no-print w-8">
                          <Checkbox
                            checked={selectedTechnicians.length > 0 && sortedTechnicians.every(t => selectedTechnicians.includes(t.id))}
                            onCheckedChange={handleSelectAll}
                            disabled={processing}
                          />
                        </th>
                        <th className="px-2 py-2 text-center bg-gray-50 border-r border-gray-200 no-print w-24">
                          <span className="text-[10px] font-semibold text-gray-700 uppercase tracking-wider">Action</span>
                        </th>
                        <th className="px-2 py-2 text-left text-[10px] font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                          <div className="flex items-center justify-between gap-1">
                            <span>Employee ID</span>
                            <div className="flex gap-0.5 no-print">
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => handleSort('employee_id')}>
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
                        <th className="px-2 py-2 text-left text-[10px] font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                          <div className="flex items-center justify-between gap-1">
                            <span>Full Name</span>
                            <div className="flex gap-0.5 no-print">
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => handleSort('full_name')}>
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
                        <th className="px-2 py-2 text-left text-[10px] font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                          <div className="flex items-center justify-between gap-1">
                            <span>Nationality</span>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 no-print" onClick={() => handleSort('nationality')}>
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
                        </th>
                        <th className="px-2 py-2 text-left text-[10px] font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                          <div className="flex items-center justify-between gap-1">
                            <span>Gender</span>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 no-print" onClick={() => handleSort('gender')}>
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
                        </th>
                        <th className="px-2 py-2 text-left text-[10px] font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                          <div className="flex items-center justify-between gap-1">
                            <span>Trade</span>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 no-print" onClick={() => handleSort('trade')}>
                              <ArrowUpDown className="w-3 h-3" />
                            </Button>
                            <ColumnFilter
                              values={uniqueTrades}
                              selected={filterTrade}
                              setSelected={setFilterTrade}
                              searchValue={searchTrade}
                              setSearchValue={setSearchTrade}
                            />
                          </div>
                        </th>
                        <th className="px-2 py-2 text-left text-[10px] font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                          <div className="flex items-center justify-between gap-1">
                            <span>Department</span>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 no-print" onClick={() => handleSort('department')}>
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
                        </th>
                        <th className="px-2 py-2 text-left text-[10px] font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                          <div className="flex items-center justify-between gap-1">
                            <span>Start Date</span>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 no-print" onClick={() => handleSort('sajja_induction_start_date')}>
                              <ArrowUpDown className="w-3 h-3" />
                            </Button>
                          </div>
                        </th>
                        <th className="px-2 py-2 text-left text-[10px] font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                          <div className="flex items-center justify-between gap-1">
                            <span>Days</span>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 no-print" onClick={() => handleSort('daysInInduction')}>
                              <ArrowUpDown className="w-3 h-3" />
                            </Button>
                          </div>
                        </th>
                        <th className="px-2 py-2 text-left text-[10px] font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                          <div className="flex items-center justify-between gap-1">
                            <span>Checklist</span>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 no-print" onClick={() => handleSort('checklistProgress')}>
                              <ArrowUpDown className="w-3 h-3" />
                            </Button>
                          </div>
                        </th>
                        <th className="px-2 py-2 text-left text-[10px] font-semibold text-gray-700 uppercase tracking-wider bg-gray-50 border-r border-gray-200">
                          <span>Project</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {onTimeTechnicians.length === 0 ? (
                        <tr>
                          <td colSpan={13} className="px-4 py-8 text-center text-sm text-gray-500">
                            No technicians in pre-induction
                          </td>
                        </tr>
                      ) : (
                        onTimeTechnicians.map((tech, index) => {
                          const isSelected = selectedTechnicians.includes(tech.id);
                          const assignedProject = projects.find(p => p.id === tech.project_id);
                          return (
                            <tr
                              key={tech.id}
                              className={`border-b border-gray-200 hover:bg-green-50 transition-colors ${
                                isSelected ? 'bg-blue-100' :
                                index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                              }`}
                            >
                              <td className="px-2 py-2 text-center border-r border-gray-200 no-print">
                                <Checkbox
                                  checked={isSelected}
                                  onCheckedChange={() => handleSelectTechnician(tech.id)}
                                  disabled={processing}
                                />
                              </td>
                              <td className="px-2 py-2 text-center border-r border-gray-200 no-print">
                                <Button
                                  onClick={() => handleManageChecklist(tech)}
                                  size="sm"
                                  className="bg-blue-600 hover:bg-blue-700 h-7 text-xs px-3"
                                  disabled={selectedTechnicians.length > 0 || processing}
                                >
                                  Manage
                                </Button>
                              </td>
                              <td className="px-2 py-2 text-xs font-medium text-blue-600 border-r border-gray-200 whitespace-nowrap">
                                {tech.employee_id}
                              </td>
                              <td className="px-2 py-2 text-xs text-gray-900 border-r border-gray-200 whitespace-nowrap font-medium">
                                {tech.full_name}
                              </td>
                              <td className="px-2 py-2 text-xs text-gray-700 border-r border-gray-200 whitespace-nowrap">
                                {tech.nationality || '-'}
                              </td>
                              <td className="px-2 py-2 text-xs text-gray-700 border-r border-gray-200 whitespace-nowrap">
                                {tech.gender || '-'}
                              </td>
                              <td className="px-2 py-2 text-xs text-gray-700 border-r border-gray-200 whitespace-nowrap">
                                {tech.trade || '-'}
                              </td>
                              <td className="px-2 py-2 text-xs text-gray-700 border-r border-gray-200 whitespace-nowrap">
                                {tech.department || '-'}
                              </td>
                              <td className="px-2 py-2 text-xs text-gray-700 border-r border-gray-200 whitespace-nowrap">
                                {format(parseISO(tech.sajja_induction_start_date), 'dd/MMM/yyyy')}
                              </td>
                              <td className="px-2 py-2 text-xs border-r border-gray-200 whitespace-nowrap">
                                <Badge variant="default" className="text-[10px] py-0 h-5 bg-green-600">
                                  {tech.daysInInduction} days
                                </Badge>
                              </td>
                              <td className="px-2 py-2 text-xs border-r border-gray-200 whitespace-nowrap">
                                <Badge 
                                  variant={tech.allChecklistCompleted ? "success" : "default"} 
                                  className={`text-[10px] py-0 h-5 ${tech.allChecklistCompleted ? 'bg-green-500' : 'bg-gray-400'}`}
                                >
                                  {Math.round(tech.checklistProgress)}% Complete
                                </Badge>
                              </td>
                              <td className="px-2 py-2 text-xs text-gray-700 border-r border-gray-200 whitespace-nowrap">
                                {assignedProject ? assignedProject.project_name : '-'}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {preInductionTechnicians.length === 0 && (
            <Card className="border-none shadow-lg">
              <CardContent className="p-12 text-center text-gray-500">
                <Users className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium">No Technicians in Pre-Induction</p>
                <p className="text-sm mt-2">All technicians at Sajja Camp have completed their induction.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Consolidated Management Dialog */}
      <Dialog open={showChecklistDialog} onOpenChange={setShowChecklistDialog}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <List className="w-5 h-5 text-blue-600" />
              Manage Pre-Induction - {selectedTechnician?.full_name}
            </DialogTitle>
          </DialogHeader>
          
          {selectedTechnician && (
            <div className="space-y-6 py-4">
              {/* Technician Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="font-semibold text-gray-900">{selectedTechnician.full_name}</p>
                <p className="text-sm text-gray-600">{selectedTechnician.employee_id}</p>
                <p className="text-xs text-gray-500 mt-1">
                  Started: {format(parseISO(selectedTechnician.sajja_induction_start_date), 'dd/MMM/yyyy')} • Day {selectedTechnician.daysInInduction}
                </p>
              </div>

              {/* Section 1: Dynamic Induction Checklist from Induction Master */}
              <div className="space-y-3">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <List className="w-4 h-4" />
                  Pre-Induction Checklist (Induction Master)
                </h3>

                {inductionParties.filter(p => p.is_active !== false).length === 0 ? (
                  <Alert className="bg-yellow-50 border-yellow-200">
                    <AlertCircle className="h-4 w-4 text-yellow-600" />
                    <AlertDescription className="text-sm text-yellow-800">
                      No induction parties configured. Please go to <strong>Induction Master</strong> to set up parties and tasks.
                    </AlertDescription>
                  </Alert>
                ) : (
                  inductionParties.filter(p => p.is_active !== false).map(party => {
                    const partyTasks = taskTemplates.filter(t => t.party_id === party.id && t.is_active !== false);
                    const technicianTasksForParty = technicianTasks.filter(t => 
                      t.technician_id === selectedTechnician.id && t.party_id === party.id
                    );
                    
                    // Check if user has access to this party
                    const hasAccess = currentUser?.role === 'admin' || currentUser?.induction_party_id === party.id;
                    const isLocked = !hasAccess;
                    
                    return (
                      <div key={party.id} className={`border rounded-lg p-3 ${isLocked ? 'bg-gray-100 opacity-60' : 'bg-white'}`}>
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-semibold text-sm text-gray-900 flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">{party.sequence_order}</Badge>
                            {party.party_name}
                            {isLocked && (
                              <Badge variant="secondary" className="text-xs bg-gray-400 text-white">
                                🔒 {currentUser?.role === 'admin' ? 'Not Assigned' : 'No Access'}
                              </Badge>
                            )}
                            {hasAccess && (
                              <Badge variant="default" className="text-xs bg-blue-600 text-white">
                                ✓ Your Department
                              </Badge>
                            )}
                          </h4>
                          {party.attachment_url && (
                            <a 
                              href={party.attachment_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 px-2 py-1 bg-blue-50 rounded border border-blue-200"
                            >
                              <FileText className="w-3 h-3" />
                              Attachment
                            </a>
                          )}
                        </div>
                        <div className="space-y-2 ml-6">
                          {partyTasks.map(template => {
                            const techTask = technicianTasksForParty.find(t => t.task_template_id === template.id);
                            const isCompleted = techTask?.status === 'completed';
                            
                            return (
                              <div key={template.id} className={`p-2 rounded ${isLocked ? 'bg-gray-100' : 'bg-gray-50 hover:bg-gray-100'}`}>
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center space-x-3 flex-1">
                                    <Checkbox
                                      id={`task_${template.id}`}
                                      checked={isCompleted}
                                      onCheckedChange={() => techTask && handleTaskToggle(techTask.id, techTask.status, party.id)}
                                      disabled={!techTask || isLocked}
                                    />
                                    <label htmlFor={`task_${template.id}`} className={`text-sm ${isLocked ? 'cursor-not-allowed text-gray-500' : 'cursor-pointer text-gray-900'}`}>
                                      {template.task_name}
                                    </label>
                                  </div>
                                  {isCompleted && techTask?.completed_date && (
                                    <span className="text-xs text-green-600">
                                      ✓ {format(parseISO(techTask.completed_date), 'dd/MMM/yyyy')}
                                      {techTask?.completed_by && (
                                        <span className="ml-1 text-gray-500">by {techTask.completed_by}</span>
                                      )}
                                    </span>
                                  )}
                                </div>
                                
                                {/* Attachment Upload */}
                                {techTask && !isLocked && (
                                  <div className="ml-8 flex items-center gap-2">
                                    <input
                                      type="file"
                                      id={`attachment_${techTask.id}`}
                                      className="hidden"
                                      onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) handleTaskAttachmentUpload(techTask.id, file);
                                      }}
                                      disabled={uploadingTaskId === techTask.id}
                                    />
                                    <label
                                      htmlFor={`attachment_${techTask.id}`}
                                      className={`text-xs px-2 py-1 rounded border cursor-pointer inline-flex items-center gap-1 ${
                                        uploadingTaskId === techTask.id 
                                          ? 'bg-gray-100 border-gray-300 cursor-wait' 
                                          : 'bg-white border-blue-300 text-blue-600 hover:bg-blue-50'
                                      }`}
                                    >
                                      {uploadingTaskId === techTask.id ? (
                                        <>Uploading...</>
                                      ) : (
                                        <>
                                          <Paperclip className="w-3 h-3" />
                                          {techTask.attachment_url || taskAttachments[techTask.id] ? 'Change' : 'Attach'}
                                        </>
                                      )}
                                    </label>
                                    {(techTask.attachment_url || taskAttachments[techTask.id]) && (
                                      <a
                                        href={techTask.attachment_url || taskAttachments[techTask.id]}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                                      >
                                        <FileText className="w-3 h-3" />
                                        View
                                      </a>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })
                )}

                {allChecklistItemsSelected && (
                  <Alert className="bg-green-50 border-green-200">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-sm text-green-800">
                      ✅ All tasks completed! You can now assign a project.
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              <div className="border-t pt-4"></div>

              {/* Section 2: Project Assignment - DISABLED until checklist complete */}
              <div className={`space-y-3 p-4 rounded-lg border ${!allChecklistItemsSelected ? 'bg-gray-100 border-gray-300 opacity-60 pointer-events-none' : 'bg-blue-50 border-blue-200'}`}>
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    <Briefcase className="w-4 h-4" />
                    Project Assignment
                  </h3>
                  {!allChecklistItemsSelected && (
                    <Badge variant="secondary" className="text-xs bg-gray-400 text-white">Locked</Badge>
                  )}
                </div>

                {!allChecklistItemsSelected && (
                  <Alert variant="default" className="bg-yellow-100 border-yellow-400">
                    <AlertCircle className="h-4 w-4 text-yellow-700" />
                    <AlertDescription className="text-sm text-yellow-900 font-medium">
                      🔒 Complete all checklist items above to unlock project assignment
                    </AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="project">Select Project</Label>
                  <Select 
                    value={selectedProject} 
                    onValueChange={setSelectedProject}
                    disabled={!allChecklistItemsSelected}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a project" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="no_project">-- No Project --</SelectItem>
                      {projects.filter(p => p.status === 'active').map(project => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.project_code} - {project.project_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedProject && selectedProject !== "no_project" && allChecklistItemsSelected && (
                  <div className="space-y-2">
                    <Label htmlFor="assignment_date">Assignment Date</Label>
                    <Input
                      id="assignment_date"
                      type="date"
                      value={projectAssignmentDate}
                      onChange={(e) => setProjectAssignmentDate(e.target.value)}
                      disabled={!allChecklistItemsSelected}
                    />
                  </div>
                )}
              </div>

              <div className="border-t pt-4"></div>

              {/* Section 3: Complete Pre-Induction - DISABLED until project selected */}
              <div className={`space-y-3 p-4 rounded-lg border ${!selectedProject || selectedProject === "no_project" || !allChecklistItemsSelected ? 'bg-gray-100 border-gray-300 opacity-60 pointer-events-none' : 'bg-green-50 border-green-200'}`}>
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    Complete Pre-Induction
                  </h3>
                  {(!selectedProject || selectedProject === "no_project" || !allChecklistItemsSelected) && (
                    <Badge variant="secondary" className="text-xs bg-gray-400 text-white">Locked</Badge>
                  )}
                </div>

                {(!selectedProject || selectedProject === "no_project" || !allChecklistItemsSelected) && (
                  <Alert variant="default" className="bg-yellow-100 border-yellow-400">
                    <AlertCircle className="h-4 w-4 text-yellow-700" />
                    <AlertDescription className="text-sm text-yellow-900 font-medium">
                      🔒 Complete checklist and assign a project to unlock completion
                    </AlertDescription>
                  </Alert>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="completion_date">Completion Date*</Label>
                    <Input
                      id="completion_date"
                      type="date"
                      value={completionDate}
                      onChange={(e) => setCompletionDate(e.target.value)}
                      disabled={!selectedProject || selectedProject === "no_project" || !allChecklistItemsSelected}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="completion_time">Completion Time*</Label>
                    <Input
                      id="completion_time"
                      type="time"
                      value={completionTime}
                      onChange={(e) => setCompletionTime(e.target.value)}
                      disabled={!selectedProject || selectedProject === "no_project" || !allChecklistItemsSelected}
                    />
                  </div>
                </div>

                {completionDate && selectedProject && selectedProject !== "no_project" && allChecklistItemsSelected && (
                  <Alert className="bg-purple-50 border-purple-200">
                    <CheckCircle2 className="h-4 w-4 text-purple-600" />
                    <AlertDescription className="text-sm text-purple-800">
                      ✅ Ready to complete! This will mark pre-induction as complete and change status to "Induction Completed"
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowChecklistDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveAll}
              disabled={processing}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              {processing ? 'Saving...' : 'Save All Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Enhanced Bulk Complete Dialog */}
      <Dialog open={showBulkCompleteDialog} onOpenChange={setShowBulkCompleteDialog}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              Bulk Complete Pre-Induction ({selectedTechnicians.length} Selected)
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Selected Technicians Summary */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="font-semibold text-gray-900 mb-2">Selected Technicians:</p>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {selectedTechnicians.map(techId => {
                  const tech = technicians.find(t => t.id === techId);
                  if (!tech) return null;
                  return (
                    <div key={techId} className="text-sm text-gray-700 flex items-center justify-between">
                      <span>• {tech.full_name} ({tech.employee_id})</span>
                      <Badge variant="outline" className="text-xs">{tech.trade}</Badge>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Auto-Complete Checklist Info */}
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-900">
                <strong>Automated Actions:</strong>
                <ul className="list-disc ml-5 mt-2 space-y-1 text-sm">
                  <li>✅ All checklist items will be marked as complete</li>
                  <li>✅ Pre-induction status will be set to "Completed"</li>
                  <li>✅ System will record completion date and time</li>
                </ul>
              </AlertDescription>
            </Alert>

            {/* Completion Date and Time */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bulk_completion_date">Completion Date*</Label>
                <Input
                  id="bulk_completion_date"
                  type="date"
                  required
                  value={bulkCompletionDate}
                  disabled
                  className="bg-gray-100 cursor-not-allowed"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bulk_completion_time">Completion Time*</Label>
                <Input
                  id="bulk_completion_time"
                  type="time"
                  required
                  value={bulkCompletionTime}
                  disabled
                  className="bg-gray-100 cursor-not-allowed"
                />
              </div>
            </div>

            {/* Project Assignment Section */}
            <div className="space-y-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Briefcase className="w-5 h-5 text-purple-600" />
                <h3 className="font-semibold text-gray-900">Project Assignment (Optional)</h3>
              </div>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="bulk_project">Select Project (Same for All)</Label>
                  <Select 
                    value={bulkSelectedProject} 
                    onValueChange={setBulkSelectedProject}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="No project - Leave unassigned" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="no_project">No Project</SelectItem>
                      {projects.filter(p => p.status === 'active').map(project => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.project_code} - {project.project_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {bulkSelectedProject && bulkSelectedProject !== "no_project" && (
                  <div className="space-y-2">
                    <Label htmlFor="bulk_project_assignment_date">Project Assignment Date</Label>
                    <Input
                      id="bulk_project_assignment_date"
                      type="date"
                      value={bulkProjectAssignmentDate}
                      onChange={(e) => setBulkProjectAssignmentDate(e.target.value)}
                    />
                    <p className="text-xs text-gray-500">
                      This project will be assigned to all {selectedTechnicians.length} selected technician(s)
                    </p>
                  </div>
                )}

                {(!bulkSelectedProject || bulkSelectedProject === "no_project") && (
                  <Alert variant="default" className="bg-yellow-50 border-yellow-200">
                    <AlertCircle className="h-4 w-4 text-yellow-600" />
                    <AlertDescription className="text-sm text-yellow-800">
                      No project will be assigned. You can assign projects individually later.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </div>

          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => { 
                setShowBulkCompleteDialog(false); 
                setBulkCompletionDate(''); 
                setBulkCompletionTime('');
                setBulkSelectedProject('no_project'); // Reset to "no_project"
                setBulkProjectAssignmentDate('');
                setBulkCompletionNotes(''); 
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleBulkCompleteInduction}
              disabled={!bulkCompletionDate || !bulkCompletionTime || processing}
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              {processing ? 'Processing...' : `Complete ${selectedTechnicians.length} Pre-Induction(s)`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}