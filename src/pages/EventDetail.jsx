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
import { Checkbox } from "@/components/ui/checkbox";
import {
  ArrowLeft, Calendar, Clock, MapPin, Users, DollarSign, Edit2,
  PartyPopper, Download, CheckCircle2, Star, FileText
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function EventDetail() {
  const urlParams = new URLSearchParams(window.location.search);
  const eventId = urlParams.get('id');

  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editFormData, setEditFormData] = useState({});
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [selectedForAttendance, setSelectedForAttendance] = useState([]);

  const queryClient = useQueryClient();

  const { data: event } = useQuery({
    queryKey: ['event', eventId],
    queryFn: async () => {
      const events = await base44.entities.Event.list();
      return events.find(e => e.id === eventId);
    },
    enabled: !!eventId,
  });

  const { data: registrations = [] } = useQuery({
    queryKey: ['event-registrations', eventId],
    queryFn: async () => {
      const allRegs = await base44.entities.EventRegistration.list('-registration_date');
      return allRegs.filter(r => r.event_id === eventId);
    },
    enabled: !!eventId,
  });

  const { data: technicians = [] } = useQuery({
    queryKey: ['technicians'],
    queryFn: () => base44.entities.Technician.list(),
  });

  const { data: camps = [] } = useQuery({
    queryKey: ['camps'],
    queryFn: () => base44.entities.Camp.list(),
  });

  const updateEventMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Event.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event', eventId] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
      setShowEditDialog(false);
    },
  });

  const updateRegistrationMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.EventRegistration.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event-registrations', eventId] });
    },
  });

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploadingFiles(true);
    
    try {
      const uploadPromises = files.map(file => 
        base44.integrations.Core.UploadFile({ file })
      );
      
      const results = await Promise.all(uploadPromises);
      const newUrls = results.map(result => result.file_url);
      
      const currentAttachments = event.attachments_urls 
        ? event.attachments_urls.split(',').filter(url => url.trim()) 
        : [];
      const updatedAttachments = [...currentAttachments, ...newUrls].join(',');
      
      await updateEventMutation.mutateAsync({
        id: eventId,
        data: { attachments_urls: updatedAttachments }
      });
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setUploadingFiles(false);
    }
  };

  const handleMarkAttendance = async (registrationId, status) => {
    await updateRegistrationMutation.mutateAsync({
      id: registrationId,
      data: { 
        status,
        attendance_marked_date: new Date().toISOString().split('T')[0],
        attendance_marked_by: 'current_user'
      }
    });
  };

  const handleBulkMarkAttendance = async () => {
    const promises = selectedForAttendance.map(regId =>
      updateRegistrationMutation.mutateAsync({
        id: regId,
        data: { 
          status: 'attended',
          attendance_marked_date: new Date().toISOString().split('T')[0],
          attendance_marked_by: 'current_user'
        }
      })
    );
    
    await Promise.all(promises);
    setSelectedForAttendance([]);
  };

  const handleUpdateEvent = async (e) => {
    e.preventDefault();
    await updateEventMutation.mutateAsync({
      id: eventId,
      data: editFormData
    });
  };

  if (!event) {
    return (
      <div className="p-6 md:p-8 flex items-center justify-center min-h-screen">
        <Card>
          <CardContent className="p-8 text-center">
            <PartyPopper className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Event not found</p>
            <Link to={createPageUrl("EventManagement")}>
              <Button className="mt-4">Back to Events</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const camp = camps.find(c => c.id === event.camp_id);
  const attachments = event.attachments_urls 
    ? event.attachments_urls.split(',').filter(url => url.trim()) 
    : [];

  const registeredCount = registrations.filter(r => ['registered', 'attended'].includes(r.status)).length;
  const attendedCount = registrations.filter(r => r.status === 'attended').length;
  const noShowCount = registrations.filter(r => r.status === 'no_show').length;
  const cancelledCount = registrations.filter(r => r.status === 'cancelled').length;

  const totalCost = registeredCount * (event.cost_per_person || 0);
  const budgetRemaining = (event.budget_allocated || 0) - (event.actual_cost || 0);

  const averageRating = registrations.filter(r => r.rating).length > 0
    ? (registrations.reduce((sum, r) => sum + (r.rating || 0), 0) / registrations.filter(r => r.rating).length).toFixed(1)
    : 0;

  return (
    <div className="p-6 md:p-8 bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 min-h-screen">
      <div className="max-w-[1400px] mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to={createPageUrl("EventManagement")}>
              <Button variant="outline" size="icon">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{event.name}</h1>
              <p className="text-gray-600 capitalize">{event.event_type?.replace(/_/g, ' ')}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => {
                setEditFormData(event);
                setShowEditDialog(true);
              }}
            >
              <Edit2 className="w-4 h-4 mr-2" />
              Edit Event
            </Button>
            <Select
              value={event.status}
              onValueChange={(value) => updateEventMutation.mutate({ id: eventId, data: { status: value } })}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="planning">Planning</SelectItem>
                <SelectItem value="open_for_registration">Open for Registration</SelectItem>
                <SelectItem value="registration_closed">Registration Closed</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-none shadow-md">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Users className="w-8 h-8 text-blue-600" />
              </div>
              <p className="text-sm text-gray-600 font-medium mb-1">Registered</p>
              <p className="text-3xl font-bold text-gray-900">{registeredCount}</p>
              <p className="text-xs text-gray-500 mt-1">/ {event.max_participants || '∞'} max</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-md">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
              <p className="text-sm text-gray-600 font-medium mb-1">Attended</p>
              <p className="text-3xl font-bold text-gray-900">{attendedCount}</p>
              <p className="text-xs text-gray-500 mt-1">{noShowCount} no-shows</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-md">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <DollarSign className="w-8 h-8 text-orange-600" />
              </div>
              <p className="text-sm text-gray-600 font-medium mb-1">Budget Status</p>
              <p className="text-3xl font-bold text-gray-900">AED {budgetRemaining.toLocaleString()}</p>
              <p className="text-xs text-gray-500 mt-1">remaining</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-md">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Star className="w-8 h-8 text-purple-600" />
              </div>
              <p className="text-sm text-gray-600 font-medium mb-1">Average Rating</p>
              <p className="text-3xl font-bold text-gray-900">{averageRating}</p>
              <p className="text-xs text-gray-500 mt-1">/ 5 stars</p>
            </CardContent>
          </Card>
        </div>

        {/* Event Details */}
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Info */}
            <Card className="border-none shadow-md">
              <CardHeader>
                <CardTitle>Event Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="flex items-start gap-3">
                    <Calendar className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-500">Date</p>
                      <p className="text-gray-900">{format(parseISO(event.date), 'MMMM dd, yyyy')}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Clock className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-500">Time</p>
                      <p className="text-gray-900">{event.time} {event.end_time && `- ${event.end_time}`}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-500">Location</p>
                      <p className="text-gray-900">{event.location}</p>
                    </div>
                  </div>
                  {event.meeting_point && (
                    <div className="flex items-start gap-3">
                      <Users className="w-5 h-5 text-blue-600 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-gray-500">Meeting Point</p>
                        <p className="text-gray-900">{event.meeting_point}</p>
                        {event.meeting_time && <p className="text-sm text-gray-600">at {event.meeting_time}</p>}
                      </div>
                    </div>
                  )}
                </div>

                {event.description && (
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-1">Description</p>
                    <p className="text-gray-900">{event.description}</p>
                  </div>
                )}

                {event.activities_planned && (
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-1">Activities</p>
                    <p className="text-gray-900">{event.activities_planned}</p>
                  </div>
                )}

                <div className="flex gap-2">
                  {event.food_provided && (
                    <Badge variant="outline">Food Provided</Badge>
                  )}
                  {event.transport_provided && (
                    <Badge variant="outline">Transport Provided</Badge>
                  )}
                  {event.gifts_prizes_provided && (
                    <Badge variant="outline">Gifts/Prizes</Badge>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Participants */}
            <Card className="border-none shadow-md">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Participants ({registrations.length})</CardTitle>
                  {selectedForAttendance.length > 0 && (
                    <Button size="sm" onClick={handleBulkMarkAttendance}>
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Mark {selectedForAttendance.length} as Attended
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {registrations.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">No registrations yet</p>
                  ) : (
                    registrations.map(reg => {
                      const tech = technicians.find(t => t.id === reg.technician_id);
                      if (!tech) return null;
                      
                      return (
                        <div key={reg.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            {event.status === 'confirmed' && reg.status === 'registered' && (
                              <Checkbox
                                checked={selectedForAttendance.includes(reg.id)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setSelectedForAttendance([...selectedForAttendance, reg.id]);
                                  } else {
                                    setSelectedForAttendance(selectedForAttendance.filter(id => id !== reg.id));
                                  }
                                }}
                              />
                            )}
                            <div>
                              <p className="font-medium text-gray-900">{tech.full_name}</p>
                              <p className="text-sm text-gray-600">{tech.employee_id}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {reg.rating && (
                              <Badge variant="outline" className="text-xs">
                                <Star className="w-3 h-3 mr-1 fill-yellow-400 text-yellow-400" />
                                {reg.rating}
                              </Badge>
                            )}
                            <Select
                              value={reg.status}
                              onValueChange={(value) => handleMarkAttendance(reg.id, value)}
                            >
                              <SelectTrigger className="w-[140px] h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="registered">Registered</SelectItem>
                                <SelectItem value="attended">Attended</SelectItem>
                                <SelectItem value="no_show">No Show</SelectItem>
                                <SelectItem value="cancelled">Cancelled</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            {/* Budget */}
            <Card className="border-none shadow-md">
              <CardHeader>
                <CardTitle>Budget Tracking</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Allocated Budget</p>
                  <p className="text-2xl font-bold text-gray-900">AED {(event.budget_allocated || 0).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Estimated Cost</p>
                  <p className="text-xl font-semibold text-gray-900">AED {totalCost.toLocaleString()}</p>
                  <p className="text-xs text-gray-500">{registeredCount} × AED {event.cost_per_person || 0}</p>
                </div>
                <div>
                  <Label>Actual Cost (AED)</Label>
                  <Input
                    type="number"
                    value={event.actual_cost || ''}
                    onChange={(e) => updateEventMutation.mutate({ 
                      id: eventId, 
                      data: { actual_cost: parseFloat(e.target.value) || 0 } 
                    })}
                    placeholder="Enter actual expenditure"
                  />
                </div>
                <div className="pt-4 border-t">
                  <p className="text-sm text-gray-600 mb-1">Remaining Budget</p>
                  <p className={`text-2xl font-bold ${budgetRemaining >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    AED {budgetRemaining.toLocaleString()}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Attachments */}
            <Card className="border-none shadow-md">
              <CardHeader>
                <CardTitle>Attachments</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Input
                    type="file"
                    multiple
                    onChange={handleFileUpload}
                    disabled={uploadingFiles}
                    className="cursor-pointer"
                  />
                  {uploadingFiles && <p className="text-sm text-blue-600 mt-2">Uploading...</p>}
                </div>
                
                {attachments.length > 0 && (
                  <div className="space-y-2">
                    {attachments.map((url, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-gray-600" />
                          <span className="text-sm text-gray-700">File {index + 1}</span>
                        </div>
                        <a href={url} target="_blank" rel="noopener noreferrer">
                          <Button variant="ghost" size="sm">
                            <Download className="w-4 h-4" />
                          </Button>
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Edit Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Event Details</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleUpdateEvent} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Event Name</Label>
                  <Input
                    value={editFormData.name || ''}
                    onChange={(e) => setEditFormData({...editFormData, name: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Location</Label>
                  <Input
                    value={editFormData.location || ''}
                    onChange={(e) => setEditFormData({...editFormData, location: e.target.value})}
                  />
                </div>
              </div>
              
              <div>
                <Label>Description</Label>
                <Textarea
                  value={editFormData.description || ''}
                  onChange={(e) => setEditFormData({...editFormData, description: e.target.value})}
                  rows={3}
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Budget Allocated (AED)</Label>
                  <Input
                    type="number"
                    value={editFormData.budget_allocated || ''}
                    onChange={(e) => setEditFormData({...editFormData, budget_allocated: parseFloat(e.target.value)})}
                  />
                </div>
                <div>
                  <Label>Cost per Person (AED)</Label>
                  <Input
                    type="number"
                    value={editFormData.cost_per_person || ''}
                    onChange={(e) => setEditFormData({...editFormData, cost_per_person: parseFloat(e.target.value)})}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowEditDialog(false)}>
                  Cancel
                </Button>
                <Button type="submit">Save Changes</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}