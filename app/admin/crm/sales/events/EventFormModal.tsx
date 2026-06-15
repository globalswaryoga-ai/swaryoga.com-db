'use client';

import { useEffect, useState } from 'react';

export type EventParticipant = {
  customerId: string;
  customerName: string;
  customerPhone: string;
  workshopName: string;
  amount: number;
  paymentMode: string;
};

export type WorkshopEvent = {
  _id?: string;
  startDate: string;
  endDate?: string;
  workshopName: string;
  workshopTime: string;
  workshopFees: number;
  notes?: string;
  participants: EventParticipant[];
};

const PAYMENT_MODES = ['cash', 'upi', 'bank_transfer', 'card', 'cashfree', 'payu', 'other'];

const EMPTY_PARTICIPANT: EventParticipant = {
  customerId: '',
  customerName: '',
  customerPhone: '',
  workshopName: '',
  amount: 0,
  paymentMode: 'cash',
};

function toDateInput(value?: string) {
  if (!value) return '';
  return value.length >= 10 ? value.slice(0, 10) : value;
}

export default function EventFormModal({
  isOpen,
  onClose,
  onSave,
  editingEvent,
  workshopOptions,
  saving,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (payload: WorkshopEvent) => void | Promise<void>;
  editingEvent?: WorkshopEvent | null;
  workshopOptions: string[];
  saving?: boolean;
}) {
  const [form, setForm] = useState<WorkshopEvent>({
    startDate: '',
    endDate: '',
    workshopName: '',
    workshopTime: '',
    workshopFees: 0,
    notes: '',
    participants: [],
  });
  const [draftParticipant, setDraftParticipant] = useState<EventParticipant>({ ...EMPTY_PARTICIPANT });

  useEffect(() => {
    if (!isOpen) return;
    if (editingEvent) {
      setForm({
        ...editingEvent,
        startDate: toDateInput(editingEvent.startDate),
        endDate: toDateInput(editingEvent.endDate),
        participants: editingEvent.participants || [],
      });
    } else {
      setForm({
        startDate: new Date().toISOString().slice(0, 10),
        endDate: '',
        workshopName: '',
        workshopTime: '',
        workshopFees: 0,
        notes: '',
        participants: [],
      });
    }
    setDraftParticipant({ ...EMPTY_PARTICIPANT });
  }, [isOpen, editingEvent]);

  if (!isOpen) return null;

  const totalAmount = form.participants.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  const addParticipant = () => {
    if (!draftParticipant.customerName.trim() && !draftParticipant.customerId.trim()) return;
    setForm((p) => ({
      ...p,
      participants: [
        ...p.participants,
        {
          ...draftParticipant,
          workshopName: draftParticipant.workshopName.trim() || p.workshopName,
        },
      ],
    }));
    setDraftParticipant({ ...EMPTY_PARTICIPANT, workshopName: form.workshopName });
  };

  const removeParticipant = (idx: number) => {
    setForm((p) => ({ ...p, participants: p.participants.filter((_, i) => i !== idx) }));
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[10000] p-4">
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gradient-to-r from-purple-700 to-violet-600 p-6 text-white flex items-center justify-between z-10">
          <h2 className="text-2xl font-bold text-white">{editingEvent ? 'Edit Event' : 'Add Event'}</h2>
          <button onClick={onClose} className="text-2xl font-bold hover:scale-110 transition-transform" aria-label="Close" type="button">
            ✕
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!form.startDate || !form.workshopName.trim()) return;
            onSave(form);
          }}
          className="p-6 space-y-5"
        >
          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Start Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                value={form.startDate}
                onChange={(e) => setForm((p) => ({ ...p, startDate: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">End Date</label>
              <input
                type="date"
                value={form.endDate}
                onChange={(e) => setForm((p) => ({ ...p, endDate: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900"
              />
            </div>
          </div>

          {/* Workshop name + time + fees */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Workshop Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              list="event-workshop-options"
              value={form.workshopName}
              onChange={(e) => setForm((p) => ({ ...p, workshopName: e.target.value }))}
              placeholder="e.g. Swar Yoga L-1"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900"
            />
            <datalist id="event-workshop-options">
              {workshopOptions.map((w) => (
                <option key={w} value={w} />
              ))}
            </datalist>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Workshop Time</label>
              <input
                type="text"
                value={form.workshopTime}
                onChange={(e) => setForm((p) => ({ ...p, workshopTime: e.target.value }))}
                placeholder="e.g. 6:00 AM - 8:00 AM"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Workshop Fees (per person)</label>
              <input
                type="number"
                min={0}
                value={form.workshopFees}
                onChange={(e) => setForm((p) => ({ ...p, workshopFees: Number(e.target.value) || 0 }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
              rows={2}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900"
              placeholder="Optional notes about this batch/event"
            />
          </div>

          {/* Participants */}
          <div className="rounded-2xl border-2 border-purple-200 bg-purple-50 p-5">
            <h3 className="text-lg font-extrabold text-purple-900 mb-3">Participants</h3>

            <div className="rounded-xl border border-purple-200 bg-white p-4 grid grid-cols-1 sm:grid-cols-6 gap-3">
              <input
                type="text"
                value={draftParticipant.customerId}
                onChange={(e) => setDraftParticipant((p) => ({ ...p, customerId: e.target.value }))}
                placeholder="ID"
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 sm:col-span-1"
              />
              <input
                type="text"
                value={draftParticipant.customerName}
                onChange={(e) => setDraftParticipant((p) => ({ ...p, customerName: e.target.value }))}
                placeholder="Name"
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 sm:col-span-2"
              />
              <input
                type="text"
                value={draftParticipant.workshopName}
                onChange={(e) => setDraftParticipant((p) => ({ ...p, workshopName: e.target.value }))}
                placeholder={form.workshopName || 'Workshop'}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 sm:col-span-1"
              />
              <input
                type="number"
                min={0}
                value={draftParticipant.amount || ''}
                onChange={(e) => setDraftParticipant((p) => ({ ...p, amount: Number(e.target.value) || 0 }))}
                placeholder="Amount"
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 sm:col-span-1"
              />
              <select
                value={draftParticipant.paymentMode}
                onChange={(e) => setDraftParticipant((p) => ({ ...p, paymentMode: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 sm:col-span-1"
              >
                {PAYMENT_MODES.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
              <div className="sm:col-span-6">
                <button
                  type="button"
                  onClick={addParticipant}
                  className="w-full rounded-lg bg-purple-600 px-4 py-2 text-white font-bold hover:bg-purple-700 transition"
                >
                  + Add Participant
                </button>
              </div>
            </div>

            {form.participants.length > 0 ? (
              <div className="mt-4 overflow-x-auto rounded-xl border border-purple-200 bg-white">
                <table className="w-full text-sm">
                  <thead className="bg-purple-100 text-purple-900">
                    <tr>
                      <th className="px-3 py-2 text-left">ID</th>
                      <th className="px-3 py-2 text-left">Name</th>
                      <th className="px-3 py-2 text-left">Workshop</th>
                      <th className="px-3 py-2 text-right">Amount</th>
                      <th className="px-3 py-2 text-left">Payment</th>
                      <th className="px-3 py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {form.participants.map((p, idx) => (
                      <tr key={idx} className="border-t border-purple-100 text-gray-900">
                        <td className="px-3 py-2 font-mono">{p.customerId || '—'}</td>
                        <td className="px-3 py-2">{p.customerName}</td>
                        <td className="px-3 py-2">{p.workshopName || form.workshopName}</td>
                        <td className="px-3 py-2 text-right">₹{Number(p.amount).toLocaleString('en-IN')}</td>
                        <td className="px-3 py-2">{p.paymentMode}</td>
                        <td className="px-3 py-2 text-right">
                          <button
                            type="button"
                            onClick={() => removeParticipant(idx)}
                            className="text-red-600 font-bold hover:text-red-700"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-purple-200 font-bold text-gray-900">
                      <td className="px-3 py-2" colSpan={3}>Total ({form.participants.length})</td>
                      <td className="px-3 py-2 text-right">₹{totalAmount.toLocaleString('en-IN')}</td>
                      <td colSpan={2}></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : (
              <p className="mt-3 text-purple-700 font-semibold text-sm">No participants added yet.</p>
            )}
          </div>

          {/* Submit */}
          <div className="flex items-center justify-end gap-3 px-0 pt-4 pb-2 border-t border-gray-200 sticky bottom-0 bg-white">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : editingEvent ? 'Update Event' : 'Create Event'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
