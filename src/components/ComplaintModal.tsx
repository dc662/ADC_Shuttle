import React, { useState, useEffect } from 'react';
import { Booking, SavedRating } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { X, Star, AlertTriangle, CheckCircle2, MessageSquare, Bus } from 'lucide-react';

interface ComplaintModalProps {
  booking: Booking | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmitRating: (ratingData: SavedRating & { bookingId: string }) => void;
}

const DEFAULT_REASONS = [
  'delay',
  'bad behaviour',
  'bad drive',
  'missed main / picked point',
  'air conditioning / hygiene',
  'other issue'
];

export const ComplaintModal: React.FC<ComplaintModalProps> = ({
  booking,
  isOpen,
  onClose,
  onSubmitRating,
}) => {
  const [rating, setRating] = useState<number>(5);
  const [selectedComplaints, setSelectedComplaints] = useState<string[]>([]);
  const [feedbackNotes, setFeedbackNotes] = useState<string>('');

  useEffect(() => {
    if (booking) {
      if (booking.ratingData) {
        setRating(booking.ratingData.rating);
        setSelectedComplaints(booking.ratingData.complaints || []);
        setFeedbackNotes(booking.ratingData.customFeedback || '');
      } else {
        setRating(5);
        setSelectedComplaints([]);
        setFeedbackNotes('');
      }
    }
  }, [booking]);

  if (!isOpen || !booking) return null;

  const isAlreadySubmitted = Boolean(booking.hasComplaint || booking.ratingData);
  const isCanceled = booking.status.includes('Canceled');

  const handleStarClick = (stars: number) => {
    if (isAlreadySubmitted) return;
    setRating(stars);
    if (stars === 5) {
      setSelectedComplaints([]);
    }
  };

  const toggleComplaint = (reason: string) => {
    if (isAlreadySubmitted) return;
    setSelectedComplaints((prev) =>
      prev.includes(reason) ? prev.filter((r) => r !== reason) : [...prev, reason]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isAlreadySubmitted) {
      onClose();
      return;
    }

    if (rating <= 4 && selectedComplaints.length === 0 && !feedbackNotes.trim()) {
      alert('Please select at least one reason or provide feedback comments.');
      return;
    }

    onSubmitRating({
      bookingId: booking.bookingId,
      rating,
      complaints: selectedComplaints,
      customFeedback: feedbackNotes.trim(),
      tripName: booking.tripName,
      driverName: booking.replacementName || booking.driverName,
      date: booking.date
    });
    onClose();
  };

  const ratingLabels = ['1 Star - Poor', '2 Stars - Fair', '3 Stars - Average', '4 Stars - Good', '5 Stars - Excellent'];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 15 }}
          transition={{ duration: 0.2 }}
          className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-slate-200 relative text-slate-800"
          id="modal-rating-complaint"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-slate-100">
            <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-blue-600" />
              {isAlreadySubmitted ? 'Trip Rating & Feedback Details' : 'Rate Trip & Feedback'}
            </h3>
            <button
              onClick={onClose}
              className="p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              id="btn-close-rating-modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto no-scrollbar">
            {/* Trip Info summary */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-xs flex items-center justify-between">
              <div>
                <div className="font-bold text-sm text-slate-800">{booking.tripName}</div>
                <div className="text-slate-500 mt-0.5">
                  {booking.date} &bull; {booking.tripTime}
                </div>
              </div>
              <div className="text-right">
                <span className="text-slate-500">Captain:</span>{' '}
                <strong className="text-slate-700 block">{booking.replacementName || booking.driverName || 'Driver'}</strong>
              </div>
            </div>

            {isCanceled ? (
              <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-center text-sm text-red-700 font-semibold space-y-1">
                <AlertTriangle className="w-6 h-6 text-red-500 mx-auto" />
                <div>This trip was canceled. Feedback is not applicable.</div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Interactive Star Rating */}
                <div className="text-center py-2 bg-slate-50/70 border border-slate-100 rounded-2xl">
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">
                    {isAlreadySubmitted ? 'Recorded Rating' : 'Tap Stars to Rate'}
                  </div>

                  <div className="flex justify-center gap-2 mb-1.5" id="rating-stars-container">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => handleStarClick(star)}
                        disabled={isAlreadySubmitted}
                        className={`transition transform active:scale-125 focus:outline-hidden ${
                          star <= rating ? 'text-amber-400' : 'text-slate-200'
                        } ${!isAlreadySubmitted ? 'hover:scale-110 cursor-pointer' : 'cursor-default'}`}
                      >
                        <Star className="w-8 h-8 fill-current" />
                      </button>
                    ))}
                  </div>

                  <div className="text-xs font-bold text-blue-600">
                    {ratingLabels[rating - 1] || ''}
                  </div>
                </div>

                {/* Complaint Categories (Visible if <= 4 stars or already submitted with complaints) */}
                {(rating <= 4 || selectedComplaints.length > 0) && (
                  <div className="bg-red-50/50 border border-red-100 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center gap-1.5 text-red-700 font-bold text-xs uppercase tracking-wide">
                      <AlertTriangle className="w-4 h-4 text-red-500" />
                      Complaint Category:
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {DEFAULT_REASONS.map((reason) => {
                        const isSelected = selectedComplaints.includes(reason);
                        return (
                          <button
                            key={reason}
                            type="button"
                            onClick={() => toggleComplaint(reason)}
                            disabled={isAlreadySubmitted}
                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize border transition ${
                              isSelected
                                ? 'bg-red-100 text-red-700 border-red-300 shadow-xs'
                                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            {reason}
                          </button>
                        );
                      })}
                    </div>

                    {/* Feedback Notes */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-600">
                        {isAlreadySubmitted ? 'Submitted Notes:' : 'Additional Feedback / Notes:'}
                      </label>
                      <textarea
                        value={feedbackNotes}
                        onChange={(e) => setFeedbackNotes(e.target.value)}
                        disabled={isAlreadySubmitted}
                        rows={3}
                        placeholder="Write any specific feedback for operations..."
                        className="w-full text-xs p-3 rounded-xl border border-slate-200 bg-white focus:border-blue-500 focus:outline-hidden resize-none disabled:bg-slate-50"
                      />
                    </div>
                  </div>
                )}

                {isAlreadySubmitted && (
                  <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-medium">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Feedback already logged for this trip. Thank you!</span>
                  </div>
                )}

                {/* Submit / Done Button */}
                <div className="flex gap-2 pt-1">
                  <button
                    type="submit"
                    id="btn-submit-rating"
                    className={`flex-1 py-3 rounded-xl font-bold text-sm text-white transition active:scale-98 shadow-sm ${
                      isAlreadySubmitted
                        ? 'bg-slate-900 hover:bg-slate-800'
                        : 'bg-blue-600 hover:bg-blue-700'
                    }`}
                  >
                    {isAlreadySubmitted ? 'Close' : 'Submit Feedback'}
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 font-semibold text-sm hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
