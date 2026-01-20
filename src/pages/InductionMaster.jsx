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
import { Users, Plus, Edit, Trash2, List, ArrowRight, AlertCircle, CheckCircle2, Upload, FileText } from "lucide-react";

export default function InductionMaster() {
  const [showPartyDialog, setShowPartyDialog] = useState(false);
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [editingParty, setEditingParty] = useState(null);
  const [editingTask, setEditingTask] = useState(null);
  const [selectedPartyForTasks, setSelectedPartyForTasks] = useState(null);

  const [partyForm, setPartyForm] = useState({
    party_name: '',
    sequence_order: 1,
    depends_on_party_id: null,
    description: '',
    attachment_url: '',
    is_active: true
  });
  const [uploadingAttachment, setUploadingAttachment] = useState(false);

  const [taskForm, setTaskForm] = useState({
    party_id: '',
    task_name: '',
    task_order: 1,
    is_mandatory: true,
    description: '',
    is_active: true
  });

  const queryClient = useQueryClient();

  const { data: parties = [] } = useQuery({
    queryKey: ['induction-parties'],
    queryFn: () => base44.entities.InductionParty.list(),
  });

  const { data: taskTemplates = [] } = useQuery({
    queryKey: ['induction-task-templates'],
    queryFn: () => base44.entities.InductionTaskTemplate.list(),
  });

  const sortedParties = [...parties].sort((a, b) => a.sequence_order - b.sequence_order);

  const createPartyMutation = useMutation({
    mutationFn: (data) => base44.entities.InductionParty.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['induction-parties'] });
      setShowPartyDialog(false);
      resetPartyForm();
    },
  });

  const updatePartyMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.InductionParty.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['induction-parties'] });
      setShowPartyDialog(false);
      resetPartyForm();
    },
  });

  const deletePartyMutation = useMutation({
    mutationFn: (id) => base44.entities.InductionParty.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['induction-parties'] });
      queryClient.invalidateQueries({ queryKey: ['induction-task-templates'] });
    },
  });

  const createTaskMutation = useMutation({
    mutationFn: (data) => base44.entities.InductionTaskTemplate.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['induction-task-templates'] });
      setShowTaskDialog(false);
      resetTaskForm();
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.InductionTaskTemplate.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['induction-task-templates'] });
      setShowTaskDialog(false);
      resetTaskForm();
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: (id) => base44.entities.InductionTaskTemplate.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['induction-task-templates'] });
    },
  });

  const resetPartyForm = () => {
    setPartyForm({
      party_name: '',
      sequence_order: 1,
      depends_on_party_id: null,
      description: '',
      attachment_url: '',
      is_active: true
    });
    setEditingParty(null);
  };

  const resetTaskForm = () => {
    setTaskForm({
      party_id: '',
      task_name: '',
      task_order: 1,
      is_mandatory: true,
      description: '',
      is_active: true
    });
    setEditingTask(null);
  };

  const handleAddParty = () => {
    const nextOrder = sortedParties.length > 0 ? Math.max(...sortedParties.map(p => p.sequence_order)) + 1 : 1;
    setPartyForm({ ...partyForm, sequence_order: nextOrder });
    setShowPartyDialog(true);
  };

  const handleEditParty = (party) => {
    setEditingParty(party);
    setPartyForm({
      party_name: party.party_name,
      sequence_order: party.sequence_order,
      depends_on_party_id: party.depends_on_party_id || null,
      description: party.description || '',
      attachment_url: party.attachment_url || '',
      is_active: party.is_active !== false
    });
    setShowPartyDialog(true);
  };

  const handleSaveParty = async () => {
    if (!partyForm.party_name) {
      alert('Please enter a party name');
      return;
    }

    if (editingParty) {
      await updatePartyMutation.mutateAsync({ id: editingParty.id, data: partyForm });
    } else {
      await createPartyMutation.mutateAsync(partyForm);
    }
  };

  const handleDeleteParty = async (party) => {
    const tasksForParty = taskTemplates.filter(t => t.party_id === party.id);
    if (tasksForParty.length > 0) {
      if (!confirm(`This party has ${tasksForParty.length} task(s). Deleting the party will also delete all associated tasks. Continue?`)) {
        return;
      }
    } else {
      if (!confirm(`Delete party "${party.party_name}"?`)) {
        return;
      }
    }

    // Delete all tasks first
    for (const task of tasksForParty) {
      await deleteTaskMutation.mutateAsync(task.id);
    }
    
    await deletePartyMutation.mutateAsync(party.id);
  };

  const handleAddTask = (party) => {
    const partyTasks = taskTemplates.filter(t => t.party_id === party.id);
    const nextOrder = partyTasks.length > 0 ? Math.max(...partyTasks.map(t => t.task_order)) + 1 : 1;
    
    setTaskForm({
      party_id: party.id,
      task_name: '',
      task_order: nextOrder,
      is_mandatory: true,
      description: '',
      is_active: true
    });
    setSelectedPartyForTasks(party);
    setShowTaskDialog(true);
  };

  const handleEditTask = (task, party) => {
    setEditingTask(task);
    setSelectedPartyForTasks(party);
    setTaskForm({
      party_id: task.party_id,
      task_name: task.task_name,
      task_order: task.task_order,
      is_mandatory: task.is_mandatory !== false,
      description: task.description || '',
      is_active: task.is_active !== false
    });
    setShowTaskDialog(true);
  };

  const handleSaveTask = async () => {
    if (!taskForm.task_name) {
      alert('Please enter a task name');
      return;
    }

    if (editingTask) {
      await updateTaskMutation.mutateAsync({ id: editingTask.id, data: taskForm });
    } else {
      await createTaskMutation.mutateAsync(taskForm);
    }
  };

  const handleDeleteTask = async (task) => {
    if (!confirm(`Delete task "${task.task_name}"?`)) {
      return;
    }
    await deleteTaskMutation.mutateAsync(task.id);
  };

  const getDependencyParty = (partyId) => {
    return parties.find(p => p.id === partyId);
  };

  const getPartyTasks = (partyId) => {
    return taskTemplates
      .filter(t => t.party_id === partyId)
      .sort((a, b) => a.task_order - b.task_order);
  };

  return (
    <div className="p-6 md:p-8 bg-gradient-to-br from-gray-50 to-blue-50 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Pre-Induction Master</h1>
            <p className="text-gray-600 mt-1">Configure parties and their checklist tasks</p>
          </div>
          <Button onClick={handleAddParty} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            Add Party
          </Button>
        </div>

        {/* Info Alert */}
        <Alert className="border-blue-200 bg-blue-50">
          <AlertCircle className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-900">
            <strong>📍 Configuration Page: Pre-Induction Master</strong><br/>
            <span className="text-sm">Define parties (Finance, HSE, Store, etc.) and their task checklists. Tasks configured here appear in Sajja Pre-Induction Tracker for technician-level tracking.</span>
          </AlertDescription>
        </Alert>

        {/* Parties List */}
        {sortedParties.length === 0 ? (
          <Card className="border-none shadow-lg">
            <CardContent className="p-12 text-center">
              <Users className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium text-gray-500">No Parties Configured</p>
              <p className="text-sm text-gray-400 mt-2">Add your first induction party to get started</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {sortedParties.map((party, index) => {
              const partyTasks = getPartyTasks(party.id);
              const dependsOnParty = party.depends_on_party_id ? getDependencyParty(party.depends_on_party_id) : null;

              return (
                <Card key={party.id} className="border-none shadow-lg">
                  <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50 border-b">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">
                          {party.sequence_order}
                        </div>
                        <div>
                          <CardTitle className="text-lg">{party.party_name}</CardTitle>
                          {party.description && (
                            <p className="text-sm text-gray-600 mt-1">{party.description}</p>
                          )}
                          {dependsOnParty && (
                            <div className="flex items-center gap-2 mt-2">
                              <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700 border-orange-200">
                                <ArrowRight className="w-3 h-3 mr-1" />
                                Depends on: {dependsOnParty.party_name}
                              </Badge>
                            </div>
                          )}
                          </div>
                          {party.attachment_url && (
                          <a 
                           href={party.attachment_url} 
                           target="_blank" 
                           rel="noopener noreferrer"
                           className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 mt-2"
                          >
                           <FileText className="w-3 h-3" />
                           View Attachment
                          </a>
                          )}
                          </div>
                          <div className="flex items-center gap-2">
                          <Badge variant="secondary">{partyTasks.length} tasks</Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAddTask(party)}
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          Add Task
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditParty(party)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteParty(party)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4">
                    {partyTasks.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <List className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                        <p className="text-sm">No tasks defined for this party</p>
                        <Button
                          variant="link"
                          onClick={() => handleAddTask(party)}
                          className="mt-2 text-blue-600"
                        >
                          Add first task
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {partyTasks.map((task) => (
                          <div
                            key={task.id}
                            className="flex items-center justify-between p-3 bg-white rounded-lg border hover:bg-gray-50"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-6 h-6 bg-gray-100 rounded flex items-center justify-center text-xs font-semibold text-gray-600">
                                {task.task_order}
                              </div>
                              <div>
                                <p className="font-medium text-gray-900">{task.task_name}</p>
                                {task.description && (
                                  <p className="text-xs text-gray-500 mt-1">{task.description}</p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {task.is_mandatory && (
                                <Badge variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200">
                                  Required
                                </Badge>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditTask(task, party)}
                              >
                                <Edit className="w-3 h-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteTask(task)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Add/Edit Party Dialog */}
      <Dialog open={showPartyDialog} onOpenChange={setShowPartyDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingParty ? 'Edit Party' : 'Add New Party'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Party Name*</Label>
              <Input
                placeholder="e.g., Finance, HSE, Store"
                value={partyForm.party_name}
                onChange={(e) => setPartyForm({ ...partyForm, party_name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Sequence Order*</Label>
              <Input
                type="number"
                min="1"
                value={partyForm.sequence_order}
                onChange={(e) => setPartyForm({ ...partyForm, sequence_order: parseInt(e.target.value) })}
              />
              <p className="text-xs text-gray-500">The order in which this party acts in the workflow</p>
            </div>

            <div className="space-y-2">
              <Label>Depends On Party (Optional)</Label>
              <Select
                value={partyForm.depends_on_party_id || 'none'}
                onValueChange={(value) => setPartyForm({ ...partyForm, depends_on_party_id: value === 'none' ? null : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="No dependency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Dependency (Can start immediately)</SelectItem>
                  {sortedParties
                    .filter(p => p.id !== editingParty?.id)
                    .map(party => (
                      <SelectItem key={party.id} value={party.id}>
                        {party.party_name} (Order {party.sequence_order})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">This party can only start after the selected party completes all tasks</p>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                placeholder="Description of this party's role..."
                value={partyForm.description}
                onChange={(e) => setPartyForm({ ...partyForm, description: e.target.value })}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Attachment (e.g., HR Induction Guidelines)</Label>
              <Input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  
                  setUploadingAttachment(true);
                  try {
                    const { file_url } = await base44.integrations.Core.UploadFile({ file });
                    setPartyForm({ ...partyForm, attachment_url: file_url });
                    alert('✅ Attachment uploaded successfully');
                  } catch (err) {
                    console.error('Error uploading attachment:', err);
                    alert(`❌ Failed to upload attachment: ${err.message}`);
                  } finally {
                    setUploadingAttachment(false);
                  }
                }}
                disabled={uploadingAttachment}
              />
              {uploadingAttachment && (
                <p className="text-xs text-blue-600">Uploading...</p>
              )}
              {partyForm.attachment_url && (
                <div className="flex items-center justify-between p-2 bg-green-50 rounded border border-green-200">
                  <a 
                    href={partyForm.attachment_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                  >
                    <FileText className="w-3 h-3" />
                    View Current Attachment
                  </a>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPartyForm({ ...partyForm, attachment_url: '' })}
                    className="text-red-600 hover:text-red-700 h-6"
                  >
                    Remove
                  </Button>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowPartyDialog(false);
              resetPartyForm();
            }}>
              Cancel
            </Button>
            <Button onClick={handleSaveParty} className="bg-blue-600 hover:bg-blue-700">
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Save Party
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Task Dialog */}
      <Dialog open={showTaskDialog} onOpenChange={setShowTaskDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingTask ? 'Edit Task' : `Add Task - ${selectedPartyForTasks?.party_name}`}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Task Name*</Label>
              <Input
                placeholder="e.g., Issue Safety Shoes"
                value={taskForm.task_name}
                onChange={(e) => setTaskForm({ ...taskForm, task_name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Task Order*</Label>
              <Input
                type="number"
                min="1"
                value={taskForm.task_order}
                onChange={(e) => setTaskForm({ ...taskForm, task_order: parseInt(e.target.value) })}
              />
              <p className="text-xs text-gray-500">Order within this party's checklist</p>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="is_mandatory"
                checked={taskForm.is_mandatory}
                onChange={(e) => setTaskForm({ ...taskForm, is_mandatory: e.target.checked })}
                className="w-4 h-4"
              />
              <Label htmlFor="is_mandatory" className="cursor-pointer">This task is mandatory</Label>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                placeholder="Instructions or details for completing this task..."
                value={taskForm.description}
                onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowTaskDialog(false);
              resetTaskForm();
            }}>
              Cancel
            </Button>
            <Button onClick={handleSaveTask} className="bg-blue-600 hover:bg-blue-700">
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Save Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}