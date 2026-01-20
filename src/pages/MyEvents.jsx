
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Calendar, Clock, MapPin, Users, PartyPopper, Trophy,
  Utensils, Bus, Star, CheckCircle2, XCircle
} from "lucide-react";
import { format, parseISO, isFuture, isPast } from "date-fns";

export default function MyEvents() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showRegisterDialog, setShowRegisterDialog] = useState(false);
  const [showFeedbackDialog, setShowFeedbackDialog] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedRegistration, setSelectedRegistration] = useState(null);
  const [feedbackData, setFeedbackData] = useState({ rating: 0, feedback: '' });

  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
  });

  const { data: technicians = [] } = useQuery({
    queryKey: ['technicians'],
    queryFn: () => base44.entities.Technician.list(),
  });

  const currentTechnician = technicians.find(t => t.email?.toLowerCase() === currentUser?.email?.toLowerCase());

  const { data: events = [] } = useQuery({
    queryKey: ['events'],
    queryFn: () => base44.entities.Event.list('-date'),
  });

  const { data: myRegistrations = [] } = useQuery({
    queryKey: ['my-registrations'],
    queryFn: async () => {
      if (!currentTechnician?.id) return [];
      const allRegs = await base44.entities.EventRegistration.list('-registration_date');
      return allRegs.filter(r => r.technician_id === currentTechnician.id);
    },
    enabled: !!currentTechnician?.id,
  });

  const { data: camps = [] } = useQuery({
    queryKey: ['camps'],
    queryFn: () => base44.entities.Camp.list(),
  });

  const registerMutation = useMutation({
    mutationFn: (data) => base44.entities.EventRegistration.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-registrations'] });
      setShowRegisterDialog(false);
      setSelectedEvent(null);
    },
  });

  const cancelRegistrationMutation = useMutation({
    mutationFn: ({ id }) => base44.entities.EventRegistration.update(id, { status: 'cancelled' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-registrations'] });
    },
  });

  const submitFeedbackMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.EventRegistration.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-registrations'] });
      setShowFeedbackDialog(false);
      setSelectedRegistration(null);
      setFeedbackData({ rating: 0, feedback: '' });
    },
  });

  const handleRegister = async () => {
    if (!currentTechnician?.id || !selectedEvent?.id) return;
    
    await registerMutation.mutateAsync({
      event_id: selectedEvent.id,
      technician_id: currentTechnician.id,
      registration_date: new Date().toISOString().split('T')[0],
      registration_time: new Date().toTimeString().split(' ')[0],
      status: 'registered'
    });
  };

  const handleSubmitFeedback = async () => {
    await submitFeedbackMutation.mutateAsync({
      id: selectedRegistration.id,
      data: feedbackData
    });
  };

  // Filter available events (not registered yet, open for registration)
  const availableEvents = events.filter(event => {
    const isRegistered = myRegistrations.some(r => r.event_id === event.id && r.status !== 'cancelled');
    const isOpen = event.status === 'open_for_registration';
    const matchesSearch = event.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.location?.toLowerCase().includes(searchQuery.toLowerCase());
    
    return !isRegistered && isOpen && matchesSearch;
  });

  // My registered events
  const upcomingRegistrations = myRegistrations.filter(reg => {
    const event = events.find(e => e.id === reg.event_id);
    return event && event.date && isFuture(parseISO(event.date)) && ['registered', 'waitlisted'].includes(reg.status);
  });

  const pastRegistrations = myRegistrations.filter(reg => {
    const event = events.find(e => e.id === reg.event_id);
    return event && event.date && isPast(parseISO(event.date)) && ['attended', 'no_show'].includes(reg.status);
  });

  const getStatusBadge = (status) => {
    const config = {
      'registered': { color: 'bg-green-100 text-green-700', label: 'Registered', icon: CheckCircle2 },
      'waitlisted': { color: 'bg-yellow-100 text-yellow-700', label: 'Waitlisted', icon: Clock },
      'attended': { color: 'bg-blue-100 text-blue-700', label: 'Attended', icon: CheckCircle2 },
      'no_show': { color: 'bg-red-100 text-red-700', label: 'No Show', icon: XCircle },
      'cancelled': { color: 'bg-gray-100 text-gray-700', label: 'Cancelled', icon: XCircle }
    };
    
    const c = config[status] || config['registered'];
    const Icon = c.icon;
    return (
      <Badge className={c.color}>
        <Icon className="w-3 h-3 mr-1" />
        {c.label}
      </Badge>
    );
  };

  const EventCard = ({ event, registration }) => {
    const camp = camps.find(c => c.id === event.camp_id);
    const allRegs = myRegistrations.filter(r => r.event_id === event.id);
    const totalRegistrations = allRegs.length;
    
    return (
      <Card className="border-none shadow-md hover:shadow-lg transition-shadow">
        <CardContent className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="font-bold text-lg text-gray-900 mb-1">{event.name}</h3>
              <p className="text-sm text-gray-600 capitalize">{event.event_type?.replace(/_/g, ' ')}</p>
            </div>
            {registration && getStatusBadge(registration.status)}
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
            {event.meeting_point && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Users className="w-4 h-4" />
                <span>Meet at: {event.meeting_point} ({event.meeting_time})</span>
              </div>
            )}
          </div>

          {event.description && (
            <p className="text-sm text-gray-600 mb-4 line-clamp-2">{event.description}</p>
          )}

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

          {registration ? (
            <div className="flex gap-2">
              {registration.status === 'registered' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => cancelRegistrationMutation.mutate({ id: registration.id })}
                  className="flex-1"
                >
                  Cancel Registration
                </Button>
              )}
              {registration.status === 'attended' && !registration.rating && (
                <Button
                  size="sm"
                  onClick={() => {
                    setSelectedRegistration(registration);
                    setShowFeedbackDialog(true);
                  }}
                  className="flex-1 bg-purple-600 hover:bg-purple-700"
                >
                  <Star className="w-4 h-4 mr-2" />
                  Rate Event
                </Button>
              )}
              {registration.rating && (
                <div className="flex items-center gap-1 text-sm text-gray-600">
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  <span>You rated this {registration.rating}/5</span>
                </div>
              )}
            </div>
          ) : (
            <Button
              onClick={() => {
                setSelectedEvent(event);
                setShowRegisterDialog(true);
              }}
              className="w-full bg-purple-600 hover:bg-purple-700"
            >
              Register Now
            </Button>
          )}
        </CardContent>
      </Card>
    );
  };

  if (!currentTechnician) {
    return (
      <div className="p-6 md:p-8 flex items-center justify-center min-h-screen">
        <Card>
          <CardContent className="p-8 text-center">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Please complete your technician profile to view events</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 min-h-screen">
      <div className="max-w-[1400px] mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <PartyPopper className="w-8 h-8 text-purple-600" />
            My Events
          </h1>
          <p className="text-gray-600 mt-1">Browse and register for upcoming recreational activities</p>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-none shadow-md bg-gradient-to-br from-blue-50 to-blue-100">
            <CardContent className="p-6">
              <Users className="w-8 h-8 text-blue-600 mb-2" />
              <p className="text-sm text-blue-600 font-medium mb-1">Upcoming Events</p>
              <p className="text-3xl font-bold text-blue-900">{upcomingRegistrations.length}</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-md bg-gradient-to-br from-green-50 to-green-100">
            <CardContent className="p-6">
              <CheckCircle2 className="w-8 h-8 text-green-600 mb-2" />
              <p className="text-sm text-green-600 font-medium mb-1">Events Attended</p>
              <p className="text-3xl font-bold text-green-900">
                {pastRegistrations.filter(r => r.status === 'attended').length}
              </p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-md bg-gradient-to-br from-purple-50 to-purple-100">
            <CardContent className="p-6">
              <Calendar className="w-8 h-8 text-purple-600 mb-2" />
              <p className="text-sm text-purple-600 font-medium mb-1">Available Events</p>
              <p className="text-3xl font-bold text-purple-900">{availableEvents.length}</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="available" className="space-y-6">
          <TabsList className="bg-white shadow-sm">
            <TabsTrigger value="available">
              Available Events ({availableEvents.length})
            </TabsTrigger>
            <TabsTrigger value="upcoming">
              My Upcoming ({upcomingRegistrations.length})
            </TabsTrigger>
            <TabsTrigger value="past">
              Past Events ({pastRegistrations.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="available">
            <Card className="border-none shadow-md mb-6">
              <CardContent className="p-4">
                <Input
                  placeholder="Search available events..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </CardContent>
            </Card>

            {availableEvents.length === 0 ? (
              <Card className="border-none shadow-md">
                <CardContent className="p-12 text-center">
                  <PartyPopper className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No events available for registration at the moment</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {availableEvents.map(event => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="upcoming">
            {upcomingRegistrations.length === 0 ? (
              <Card className="border-none shadow-md">
                <CardContent className="p-12 text-center">
                  <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">You haven't registered for any upcoming events</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {upcomingRegistrations.map(reg => {
                  const event = events.find(e => e.id === reg.event_id);
                  if (!event) return null;
                  return <EventCard key={reg.id} event={event} registration={reg} />;
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="past">
            {pastRegistrations.length === 0 ? (
              <Card className="border-none shadow-md">
                <CardContent className="p-12 text-center">
                  <Clock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No past events yet</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {pastRegistrations.map(reg => {
                  const event = events.find(e => e.id === reg.event_id);
                  if (!event) return null;
                  return <EventCard key={reg.id} event={event} registration={reg} />;
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Register Dialog */}
        <Dialog open={showRegisterDialog} onOpenChange={setShowRegisterDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Registration</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-gray-600">
                You are about to register for <strong>{selectedEvent?.name}</strong>
              </p>
              {selectedEvent?.registration_deadline && (
                <p className="text-sm text-gray-500">
                  Registration deadline: {format(parseISO(selectedEvent.registration_deadline), 'MMM dd, yyyy')}
                </p>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowRegisterDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleRegister} className="bg-purple-600 hover:bg-purple-700">
                Confirm Registration
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Feedback Dialog */}
        <Dialog open={showFeedbackDialog} onOpenChange={setShowFeedbackDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Rate This Event</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Rating</Label>
                <div className="flex gap-2 mt-2">
                  {[1, 2, 3, 4, 5].map(rating => (
                    <button
                      key={rating}
                      type="button"
                      onClick={() => setFeedbackData({...feedbackData, rating})}
                      className="focus:outline-none"
                    >
                      <Star
                        className={`w-8 h-8 ${
                          rating <= feedbackData.rating
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-gray-300'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label>Feedback (Optional)</Label>
                <Textarea
                  value={feedbackData.feedback}
                  onChange={(e) => setFeedbackData({...feedbackData, feedback: e.target.value})}
                  placeholder="Share your thoughts about the event..."
                  rows={4}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowFeedbackDialog(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleSubmitFeedback}
                disabled={!feedbackData.rating}
                className="bg-purple-600 hover:bg-purple-700"
              >
                Submit Feedback
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
