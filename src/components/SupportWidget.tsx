import React from 'react';
import { Phone, Mail, HelpCircle, AlertOctagon, Lightbulb, Clock, ShieldCheck } from 'lucide-react';
import { User } from '../types';

interface SupportWidgetProps {
  currentUser: User | null;
  onSendToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const SupportWidget: React.FC<SupportWidgetProps> = ({ currentUser, onSendToast }) => {
  const handleEmail = (type: 'Feedback / Suggestion' | 'Claim / Complaint') => {
    const adminEmail = 'minatharwatwadie@gmail.com';
    const userName = currentUser ? currentUser.name : 'Employee';
    const subject = encodeURIComponent(`[${type}] - ADC Shuttle Corporate Portal`);
    const body = encodeURIComponent(
      `Hello Transportation Operations Team,\n\nI would like to submit a ${type.toLowerCase()}.\n\nEmployee Name: ${userName}\nEmployee ID: ${
        currentUser?.id || 'N/A'
      }\nDetails:\n[Please write your details here...]\n\nThank you.`
    );

    window.location.href = `mailto:${adminEmail}?subject=${subject}&body=${body}`;
    onSendToast(`Opening email client for ${type}...`, 'info');
  };

  return (
    <div className="p-4 space-y-4 max-w-lg mx-auto" id="support-container">
      {/* Title Header */}
      <div className="text-center py-2">
        <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-2 border border-blue-100 shadow-xs">
          <HelpCircle className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-900">Transportation Support</h2>
        <p className="text-xs text-slate-500 max-w-xs mx-auto mt-1">
          Have an inquiry, lost an item, or need immediate assistance on your shuttle route?
        </p>
      </div>

      {/* Direct Phone Lines */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="text-xs font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
          <Phone className="w-3.5 h-3.5 text-blue-600" />
          Direct Dispatch & Operations
        </div>

        <a
          href="tel:+201044789992"
          id="btn-tech-support-call"
          className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/80 hover:bg-blue-50 hover:border-blue-200 transition group active:scale-98"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
              <Phone className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-800">Tech Support</div>
              <div className="text-[11px] text-slate-500">App & Account Inquiries</div>
            </div>
          </div>
          <span className="text-xs font-bold text-blue-600 group-hover:underline">+20 10 44789992</span>
        </a>

        <a
          href="tel:+201070066925"
          id="btn-ops-support-call"
          className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/80 hover:bg-blue-50 hover:border-blue-200 transition group active:scale-98"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <Phone className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-800">Fleet Operations</div>
              <div className="text-[11px] text-slate-500">Live Routes & Driver Contact</div>
            </div>
          </div>
          <span className="text-xs font-bold text-emerald-600 group-hover:underline">+20 10 70066925</span>
        </a>
      </div>

      {/* Email & Claims Actions */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-2.5">
        <div className="text-xs font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
          <Mail className="w-3.5 h-3.5 text-blue-600" />
          Feedback & Complaints Desk
        </div>

        <button
          onClick={() => handleEmail('Feedback / Suggestion')}
          id="btn-send-feedback-email"
          className="w-full flex items-center justify-between p-3 rounded-xl bg-blue-50/80 border border-blue-200/80 text-left hover:bg-blue-100/70 transition active:scale-98"
        >
          <div className="flex items-center gap-2.5">
            <Lightbulb className="w-4 h-4 text-blue-600 shrink-0" />
            <span className="text-xs font-bold text-blue-900">Send Feedback / Route Suggestion</span>
          </div>
          <span className="text-[11px] font-semibold text-blue-700">Email &rarr;</span>
        </button>

        <button
          onClick={() => handleEmail('Claim / Complaint')}
          id="btn-send-complaint-email"
          className="w-full flex items-center justify-between p-3 rounded-xl bg-red-50/80 border border-red-200/80 text-left hover:bg-red-100/70 transition active:scale-98"
        >
          <div className="flex items-center gap-2.5">
            <AlertOctagon className="w-4 h-4 text-red-600 shrink-0" />
            <span className="text-xs font-bold text-red-900">Submit Formal Claim / Incident</span>
          </div>
          <span className="text-[11px] font-semibold text-red-700">Email &rarr;</span>
        </button>
      </div>

      {/* Operational Policy Note */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-2 text-xs text-slate-600">
        <div className="flex items-center gap-1.5 font-bold text-slate-800">
          <Clock className="w-3.5 h-3.5 text-slate-600" />
          Operating Hours & Reservation Window
        </div>
        <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-500 pl-1">
          <li>Daily seat reservations open at <strong>07:00 AM</strong>.</li>
          <li>Evening return booking cutoff is <strong>06:15 PM</strong>.</li>
          <li>Weekend (Friday & Saturday) service is paused.</li>
          <li>Please arrive at your pickup point 5 minutes before departure.</li>
        </ul>
      </div>
    </div>
  );
};
