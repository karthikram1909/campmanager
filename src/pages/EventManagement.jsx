import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Calendar, Clock, MapPin, Users, DollarSign, Plus, Eye,
  PartyPopper, Trophy, Utensils, Bus, TrendingUp, Star
} from "lucide-react";
import { format, parseISO, isFuture, isPast, isToday } from "date-fns";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function EventManagement() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [formData, setFormData] = useState({
    transport_provided: false,
    food_provided: false,
    gifts_prizes_provided: false
  });

  const queryClient = useQueryClient();

  const { data: events = [] } = useQuery({
    queryKey: ['events'],
    queryFn: () => base44.entities.Event.list('-date'),
  });

  const { data: registrations = [] } = useQuery({
    queryKey: ['event-registrations'],
    queryFn: () => base44.entities.EventRegistration.list(),
  });

  const { data: technicians = [] } = useQuery({
    queryKey: ['technicians'],
    queryFn: () => base44.entities.Technician.list(),
  });

  const { data: camps = [] } = useQuery({
    queryKey: ['camps'],
    queryFn: () => base44.entities.Camp.list(),
  });

  const createEventMutation = useMutation({
    mutationFn: (data) => base44.entities.Event.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      setShowAddDialog(false);
      setFormData({
        transport_provided: false,
        food_provided: false,
        gifts_prizes_provided: false
      });
    },
  });

  // Filter events
  const filteredEvents = events.filter(event => {
    const matchesSearch = event.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.location?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || event.status === statusFilter;
    const matchesType = typeFilter === 'all' || event.event_type === typeFilter;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  // Categorize events
  const upcomingEvents = filteredEvents.filter(e => e.date && isFuture(parseISO(e.date)));
  const todayEvents = filteredEvents.filter(e => e.date && isToday(parseISO(e.date)));
  const pastEvents = filteredEvents.filter(e => e.date && isPast(parseISO(e.date)) && !isToday(parseISO(e.date)));

  // Calculate statistics
  const totalUpcoming = upcomingEvents.length;
  const totalParticipantsUpcoming = upcomingEvents.reduce((sum, event) => {
    const eventRegs = registrations.filter(r => r.event_id === event.id && ['registered', 'attended'].includes(r.status));
    return sum + eventRegs.length;
  }, 0);

  const totalBudgetAllocated = events.reduce((sum, e) => sum + (e.budget_allocated || 0), 0);
  const totalActualCost = events.reduce((sum, e) => sum + (e.actual_cost || 0), 0);
  const budgetRemaining = totalBudgetAllocated - totalActualCost;

  // Calculate average rating
  const ratingsData = registrations.filter(r => r.rating && r.rating > 0);
  const averageRating = ratingsData.length > 0
    ? (ratingsData.reduce((sum, r) => sum + r.rating, 0) / ratingsData.length).toFixed(1)
    : 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    await createEventMutation.mutateAsync(formData);
  };

  const getStatusBadge = (status) => {
    const config = {
      'planning': { color: 'bg-gray-100 text-gray-700', label: 'Planning' },
      'open_for_registration': { color: 'bg-blue-100 text-blue-700', label: 'Open for Registration' },
      'registration_closed': { color: 'bg-yellow-100 text-yellow-700', label: 'Registration Closed' },
      'confirmed': { color: 'bg-green-100 text-green-700', label: 'Confirmed' },
      'completed': { color: 'bg-purple-100 text-purple-700', label: 'Completed' },
      'cancelled': { color: 'bg-red-100 text-red-700', label: 'Cancelled' }
    };
    
    const c = config[status] || config['planning'];
    return <Badge className={c.color}>{c.label}</Badge>;
  };

  const getTypeBadge = (type) => {
    const config = {
      'outing': { icon: MapPin, color: 'text-blue-600' },
      'sports': { icon: Trophy, color: 'text-green-600' },
      'entertainment': { icon: PartyPopper, color: 'text-purple-600' },
      'social': { icon: Users, color: 'text-orange-600' },
      'cultural': { icon: Star, color: 'text-pink-600' },
      'training': { icon: TrendingUp, color: 'text-indigo-600' },
      'other': { icon: Calendar, color: 'text-gray-600' }
    };
    
    const c = config[type] || config['other'];
    const Icon = c.icon;
    return <Icon className={`w-4 h-4 ${c.color}`} />;
  };

  const EventCard = ({ event }) => {
    const eventRegistrations = registrations.filter(r => r.event_id === event.id);
    const attendedCount = eventRegistrations.filter(r => r.status === 'attended').length;
    const registeredCount = eventRegistrations.filter(r => ['registered', 'attended'].includes(r.status)).length;
    const camp = camps.find(c => c.id === event.camp_id);
    
    return (
      <Card className="border-none shadow-md hover:shadow-lg transition-shadow">
        <CardContent className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
                {getTypeBadge(event.event_type)}
              </div>
              <div>
                <h3 className="font-bold text-lg text-gray-900">{event.name}</h3>
                <p className="text-sm text-gray-600 capitalize">{event.event_type?.replace(/_/g, ' ')}</p>
              </div>
            </div>
            {getStatusBadge(event.status)}
          </div>

          <div className="space-y-2 mb-4">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Calendar className="w-4 h-4" />
              <span>{event.date ? format(parseISO(event.date), 'MMM dd, yyyy') : 'TBD'}</span>
              <Clock className="w-4 h-4 ml-2" />
              <span>{event.time || 'TBD'}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <MapPin className="w-4 h-4" />
              <span>{event.location}</span>
            </div>
            {camp && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Users className="w-4 h-4" />
                <span>{camp.name}</span>
              </div>
            )}
          </div>

          <div className="flex gap-2 mb-4">
            {event.food_provided && (
              <Badge variant="outline" className="text-xs">
                <Utensils className="w-3 h-3 mr-1" />
                Food
              </Badge>
            )}
            {event.transport_provided && (
              <Badge variant="outline" className="text-xs">
                <Bus className="w-3 h-3 mr-1" />
                Transport
              </Badge>
            )}
            {event.gifts_prizes_provided && (
              <Badge variant="outline" className="text-xs">
                <Trophy className="w-3 h-3 mr-1" />
                Prizes
              </Badge>
            )}
          </div>

          <div className="flex justify-between items-center pt-4 border-t">
            <div className="text-sm">
              <span className="font-semibold text-gray-900">{registeredCount}</span>
              <span className="text-gray-600"> / {event.max_participants || '∞'} participants</span>
              {event.status === 'completed' && attendedCount > 0 && (
                <span className="text-green-600 ml-2">({attendedCount} attended)</span>
              )}
            </div>
            <Link to={createPageUrl(`EventDetail?id=${event.id}`)}>
              <Button variant="outline" size="sm">
                <Eye className="w-4 h-4 mr-2" />
                View Details
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="p-6 md:p-8 bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 min-h-screen">
      <div className="max-w-[1800px] mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <PartyPopper className="w-8 h-8 text-purple-600" />
              Event Management
            </h1>
            <p className="text-gray-600 mt-1">Organize recreational activities for technicians</p>
          </div>
          <Button onClick={() => setShowAddDialog(true)} className="bg-purple-600 hover:bg-purple-700">
            <Plus className="w-4 h-4 mr-2" />
            Create New Event
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-none shadow-md bg-gradient-to-br from-blue-50 to-blue-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Calendar className="w-8 h-8 text-blue-600" />
              </div>
              <p className="text-sm text-blue-600 font-medium mb-1">Upcoming Events</p>
              <p className="text-3xl font-bold text-blue-900">{totalUpcoming}</p>
              {todayEvents.length > 0 && (
                <p className="text-xs text-blue-700 mt-1">{todayEvents.length} happening today!</p>
              )}
            </CardContent>
          </Card>

          <Card className="border-none shadow-md bg-gradient-to-br from-green-50 to-green-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Users className="w-8 h-8 text-green-600" />
              </div>
              <p className="text-sm text-green-600 font-medium mb-1">Total Participants</p>
              <p className="text-3xl font-bold text-green-900">{totalParticipantsUpcoming}</p>
              <p className="text-xs text-green-700 mt-1">Upcoming events</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-md bg-gradient-to-br from-orange-50 to-orange-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <DollarSign className="w-8 h-8 text-orange-600" />
              </div>
              <p className="text-sm text-orange-600 font-medium mb-1">Budget Remaining</p>
              <p className="text-3xl font-bold text-orange-900">AED {budgetRemaining.toLocaleString()}</p>
              <p className="text-xs text-orange-700 mt-1">From AED {totalBudgetAllocated.toLocaleString()} allocated</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-md bg-gradient-to-br from-purple-50 to-purple-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Star className="w-8 h-8 text-purple-600" />
              </div>
              <p className="text-sm text-purple-600 font-medium mb-1">Average Rating</p>
              <p className="text-3xl font-bold text-purple-900">{averageRating} / 5</p>
              <p className="text-xs text-purple-700 mt-1">{ratingsData.length} ratings received</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="border-none shadow-md">
          <CardContent className="p-6">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <Input
                  placeholder="Search events..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="planning">Planning</SelectItem>
                  <SelectItem value="open_for_registration">Open for Registration</SelectItem>
                  <SelectItem value="registration_closed">Registration Closed</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Event Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="outing">Outing</SelectItem>
                  <SelectItem value="sports">Sports</SelectItem>
                  <SelectItem value="entertainment">Entertainment</SelectItem>
                  <SelectItem value="social">Social</SelectItem>
                  <SelectItem value="cultural">Cultural</SelectItem>
                  <SelectItem value="training">Training</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Events Tabs */}
        <Tabs defaultValue="upcoming" className="space-y-6">
          <TabsList className="bg-white shadow-sm">
            <TabsTrigger value="upcoming">
              Upcoming ({upcomingEvents.length})
            </TabsTrigger>
            <TabsTrigger value="today">
              Today ({todayEvents.length})
            </TabsTrigger>
            <TabsTrigger value="past">
              Past Events ({pastEvents.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming">
            {upcomingEvents.length === 0 ? (
              <Card className="border-none shadow-md">
                <CardContent className="p-12 text-center">
                  <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No upcoming events. Create one to get started!</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {upcomingEvents.map(event => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="today">
            {todayEvents.length === 0 ? (
              <Card className="border-none shadow-md">
                <CardContent className="p-12 text-center">
                  <Clock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No events scheduled for today</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {todayEvents.map(event => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="past">
            {pastEvents.length === 0 ? (
              <Card className="border-none shadow-md">
                <CardContent className="p-12 text-center">
                  <PartyPopper className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No past events yet</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {pastEvents.map(event => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Create Event Dialog */}
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <PartyPopper className="w-6 h-6 text-purple-600" />
                Create New Event
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Event Name *</Label>
                  <Input
                    required
                    value={formData.name || ''}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="e.g., Beach Day at Jumeirah"
                  />
                </div>
                <div>
                  <Label>Event Type *</Label>
                  <Select
                    value={formData.event_type || ''}
                    onValueChange={(value) => setFormData({...formData, event_type: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="outing">Outing</SelectItem>
                      <SelectItem value="sports">Sports</SelectItem>
                      <SelectItem value="entertainment">Entertainment</SelectItem>
                      <SelectItem value="social">Social</SelectItem>
                      <SelectItem value="cultural">Cultural</SelectItem>
                      <SelectItem value="training">Training</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Description</Label>
                <Textarea
                  value={formData.description || ''}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="Describe the event, activities planned, what to bring, etc."
                  rows={3}
                />
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <Label>Date *</Label>
                  <Input
                    type="date"
                    required
                    value={formData.date || ''}
                    onChange={(e) => setFormData({...formData, date: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Start Time *</Label>
                  <Input
                    type="time"
                    required
                    value={formData.time || ''}
                    onChange={(e) => setFormData({...formData, time: e.target.value})}
                  />
                </div>
                <div>
                  <Label>End Time</Label>
                  <Input
                    type="time"
                    value={formData.end_time || ''}
                    onChange={(e) => setFormData({...formData, end_time: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Location *</Label>
                  <Input
                    required
                    value={formData.location || ''}
                    onChange={(e) => setFormData({...formData, location: e.target.value})}
                    placeholder="e.g., Jumeirah Beach, Dubai"
                  />
                </div>
                <div>
                  <Label>Meeting Point</Label>
                  <Input
                    value={formData.meeting_point || ''}
                    onChange={(e) => setFormData({...formData, meeting_point: e.target.value})}
                    placeholder="Where technicians should gather"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Meeting Time</Label>
                  <Input
                    type="time"
                    value={formData.meeting_time || ''}
                    onChange={(e) => setFormData({...formData, meeting_time: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Primary Camp</Label>
                  <Select
                    value={formData.camp_id || ''}
                    onValueChange={(value) => setFormData({...formData, camp_id: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select camp (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={null}>All Camps</SelectItem>
                      {camps.map(camp => (
                        <SelectItem key={camp.id} value={camp.id}>{camp.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <Label>Max Participants</Label>
                  <Input
                    type="number"
                    value={formData.max_participants || ''}
                    onChange={(e) => setFormData({...formData, max_participants: parseInt(e.target.value)})}
                    placeholder="Leave blank for unlimited"
                  />
                </div>
                <div>
                  <Label>Registration Deadline</Label>
                  <Input
                    type="date"
                    value={formData.registration_deadline || ''}
                    onChange={(e) => setFormData({...formData, registration_deadline: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Cost per Person (AED)</Label>
                  <Input
                    type="number"
                    value={formData.cost_per_person || 0}
                    onChange={(e) => setFormData({...formData, cost_per_person: parseFloat(e.target.value)})}
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Budget Allocated (AED)</Label>
                  <Input
                    type="number"
                    value={formData.budget_allocated || ''}
                    onChange={(e) => setFormData({...formData, budget_allocated: parseFloat(e.target.value)})}
                  />
                </div>
                <div>
                  <Label>Activities Planned</Label>
                  <Input
                    value={formData.activities_planned || ''}
                    onChange={(e) => setFormData({...formData, activities_planned: e.target.value})}
                    placeholder="Comma-separated, e.g., Swimming, BBQ, Games"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <Label>Event Includes</Label>
                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      checked={formData.food_provided}
                      onCheckedChange={(checked) => setFormData({...formData, food_provided: checked})}
                    />
                    <label className="text-sm">Food Provided</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      checked={formData.transport_provided}
                      onCheckedChange={(checked) => setFormData({...formData, transport_provided: checked})}
                    />
                    <label className="text-sm">Transport Provided</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      checked={formData.gifts_prizes_provided}
                      onCheckedChange={(checked) => setFormData({...formData, gifts_prizes_provided: checked})}
                    />
                    <label className="text-sm">Gifts/Prizes</label>
                  </div>
                </div>
              </div>

              <div>
                <Label>Notes</Label>
                <Textarea
                  value={formData.notes || ''}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  placeholder="Any additional information"
                  rows={2}
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowAddDialog(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-purple-600 hover:bg-purple-700">
                  Create Event
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}