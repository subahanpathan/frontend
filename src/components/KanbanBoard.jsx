import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { FiChevronDown, FiTrash2, FiEdit2, FiUser, FiAlertCircle, FiLoader } from 'react-icons/fi';
import bugService from '../services/bugService';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import IssueTypeIcon from './IssueTypeIcon';

const KanbanBoard = ({ projectId, tickets, setTickets, loading }) => {
  const navigate = useNavigate();
  const [updatingTickets, setUpdatingTickets] = useState(new Set());

  // Group tickets by status with enhanced configuration
  const columns = {
    'open': { label: 'Open', color: 'bg-gray-50', textColor: 'text-gray-700', icon: '○' },
    'in-progress': { label: 'In Progress', color: 'bg-blue-50', textColor: 'text-blue-700', icon: '▶' },
    'in-review': { label: 'In Review', color: 'bg-yellow-50', textColor: 'text-yellow-700', icon: '◉' },
    'closed': { label: 'Closed', color: 'bg-red-50', textColor: 'text-red-700', icon: '✕' },
    'resolved': { label: 'Resolved', color: 'bg-green-50', textColor: 'text-green-700', icon: '✓' },
  };

  const getTicketsForColumn = (columnStatus) => {
    return tickets.filter((ticket) =>
      (ticket.status?.toLowerCase() || 'open') === columnStatus
    );
  };

  const handleDragEnd = async (result) => {
    const { source, destination, draggableId } = result;

    // If dropped in the same position
    if (
      !destination ||
      (source.droppableId === destination.droppableId &&
        source.index === destination.index)
    ) {
      return;
    }

    // New status is the destination column id
    const newStatus = destination.droppableId;

    // Find the ticket being dragged
    const ticket = tickets.find((t) => t.id === draggableId);
    if (!ticket) return;

    // Update local state optimistically
    const updatedTickets = tickets.map((t) =>
      t.id === draggableId ? { ...t, status: newStatus } : t
    );
    setTickets(updatedTickets);

    // Mark as updating
    setUpdatingTickets((prev) => new Set([...prev, draggableId]));

    try {
      // Send update to API
      await bugService.updateTicket(draggableId, { status: newStatus });
      toast.success(`Ticket moved to ${columns[newStatus]?.label || newStatus}`);
    } catch (error) {
      // Revert on error
      setTickets(tickets);
      toast.error('Failed to update ticket status');
      console.error('Update error:', error);
    } finally {
      // Remove from updating set
      setUpdatingTickets((prev) => {
        const newSet = new Set(prev);
        newSet.delete(draggableId);
        return newSet;
      });
    }
  };

  const handleDeleteTicket = async (ticketId) => {
    if (!window.confirm('Are you sure you want to delete this ticket?')) return;

    try {
      await bugService.deleteTicket(ticketId);
      setTickets(tickets.filter((t) => t.id !== ticketId));
      toast.success('Ticket deleted successfully');
    } catch (error) {
      toast.error('Failed to delete ticket');
    }
  };

  const getPriorityColor = (priority) => {
    const colors = {
      low: 'text-blue-600 bg-blue-50 border-blue-200',
      medium: 'text-yellow-600 bg-yellow-50 border-yellow-200',
      high: 'text-orange-600 bg-orange-50 border-orange-200',
      critical: 'text-red-600 bg-red-50 border-red-200',
    };
    return colors[priority?.toLowerCase()] || colors.medium;
  };

  const getStatusBadgeColor = (status) => {
    const colors = {
      open: 'bg-gray-100 text-gray-800',
      'in-progress': 'bg-blue-100 text-blue-800',
      'in-review': 'bg-purple-100 text-purple-800',
      closed: 'bg-green-100 text-green-800',
      resolved: 'bg-green-100 text-green-800',
    };
    return colors[status?.toLowerCase()] || colors.open;
  };

  const getInitials = (firstName, lastName) => {
    return `${firstName?.[0] || 'U'}${lastName?.[0] || 'S'}`.toUpperCase();
  };

  const getPriorityBorderColor = (priority) => {
    const colors = {
      low: 'border-blue-400',
      medium: 'border-yellow-400',
      high: 'border-orange-400',
      critical: 'border-red-400',
    };
    return colors[priority?.toLowerCase()] || colors.medium;
  };

  // Ticket Card Component
  const TicketCard = ({ ticket, index }) => {
    const isUpdating = updatingTickets.has(ticket.id);

    return (
      <Draggable draggableId={ticket.id} index={index}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            className={`bg-white border-l-4 rounded-lg p-4 mb-3 cursor-move transition-all ${
              snapshot.isDragging ? 'shadow-lg ring-2 ring-blue-500 rotate-1' : 'hover:shadow-md border-gray-200'
            } ${isUpdating ? 'opacity-60' : ''}
            ${getPriorityBorderColor(ticket.priority)}`}
          >
            {/* Header with Title and Issue Type */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1 flex items-start gap-2">
                <IssueTypeIcon type={ticket.issue_type} size={16} className="mt-0.5 flex-shrink-0" />
                <h3
                  onClick={() => navigate(`/ticket/${ticket.id}`)}
                  className="text-sm font-medium text-gray-900 flex-1 cursor-pointer hover:text-blue-600 hover:underline line-clamp-2"
                >
                  {ticket.title}
                </h3>
              </div>
              {isUpdating && <FiLoader size={16} className="animate-spin text-blue-600 flex-shrink-0" />}
            </div>

            {/* Ticket ID */}
            <p className="text-xs font-mono text-gray-500 mb-2">{ticket.id}</p>

            {/* Priority & Assignee */}
            <div className="flex items-center justify-between gap-2 mb-3">
              {/* Priority Badge */}
              <div className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${getPriorityColor(ticket.priority)}`}>
                <FiAlertCircle size={12} />
                {ticket.priority || 'medium'}
              </div>

              {/* Assignee */}
              {ticket.assignee ? (
                <div className="flex items-center gap-1">
                  <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-xs text-white font-semibold">
                    {getInitials(ticket.assignee.first_name, ticket.assignee.last_name)}
                  </div>
                  <span className="text-xs text-gray-600 truncate">
                    {ticket.assignee.first_name}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <FiUser size={14} />
                  <span>Unassigned</span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-2 border-t border-gray-100">
              <button
                onClick={() => navigate(`/ticket/${ticket.id}`)}
                className="flex-1 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 py-2 rounded transition-colors flex items-center justify-center gap-1 min-h-[36px]"
              >
                <FiEdit2 size={14} />
                <span className="hidden sm:inline">View</span>
              </button>
              <button
                onClick={() => handleDeleteTicket(ticket.id)}
                className="flex-1 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 py-2 rounded transition-colors flex items-center justify-center gap-1 min-h-[36px]"
              >
                <FiTrash2 size={14} />
                <span className="hidden sm:inline">Delete</span>
              </button>
            </div>
          </div>
        )}
      </Draggable>
    );
  };

  if (!projectId) {
    return (
      <div className="flex items-center justify-center h-96 bg-gray-50 rounded-lg border border-gray-200">
        <div className="text-center">
          <FiAlertCircle size={48} className="mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600 font-medium">Select a project to view Kanban board</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <FiLoader size={48} className="mx-auto text-blue-600 mb-4 animate-spin" />
          <p className="text-gray-600">Loading Kanban board...</p>
        </div>
      </div>
    );
  }

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-5 gap-4 auto-rows-max">
        {Object.entries(columns).map(([statusKey, columnInfo]) => (
          <div key={statusKey} className={`${columnInfo.color} rounded-lg border border-gray-300 p-3 md:p-4 min-h-[400px] md:min-h-[500px] flex flex-col`}>
            {/* Column Header */}
            <div className="flex items-center justify-between mb-4 pb-3 border-b-2 border-gray-400">
              <h2 className={`font-bold ${columnInfo.textColor} flex items-center gap-2`}>
                <span className="text-lg">{columnInfo.icon}</span>
                {columnInfo.label}
                <span className="inline-flex items-center justify-center w-6 h-6 bg-gray-300 rounded-full text-xs font-semibold text-gray-800">
                  {getTicketsForColumn(statusKey).length}
                </span>
              </h2>
            </div>

            {/* Droppable Container */}
            <Droppable droppableId={statusKey}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`flex-1 transition-colors rounded ${
                    snapshot.isDraggingOver ? 'bg-blue-200 bg-opacity-30 ring-2 ring-blue-400' : ''
                  }`}
                >
                  {getTicketsForColumn(statusKey).length === 0 ? (
                    <div className="flex items-center justify-center h-32 text-center">
                      <div>
                        <p className="text-gray-600 text-sm font-medium">No tickets</p>
                        <p className="text-gray-400 text-xs mt-1">Drag to add</p>
                      </div>
                    </div>
                  ) : (
                    getTicketsForColumn(statusKey).map((ticket, index) => (
                      <TicketCard key={ticket.id} ticket={ticket} index={index} />
                    ))
                  )}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </div>
        ))}
      </div>
    </DragDropContext>
  );
};

export default KanbanBoard;
