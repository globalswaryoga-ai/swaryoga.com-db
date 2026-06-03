import mongoose from 'mongoose';

/**
 * Ritucharya Profile — one per CRM tenant.
 *
 * Holds the tenant's saved location + (correctable) weather + personal Ayurvedic
 * profile. The diet plan is derived on the fly from `rituId` + the master ritu
 * data, so we persist only the inputs (and the resolved ritu) — not a frozen plan.
 *
 * Tenant isolation: keyed by `userId` (the viewer userId from the verified JWT).
 */
const RitucharyaProfileSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, unique: true, index: true },

    // ── Location ──
    country: { type: String, default: '' },
    state: { type: String, default: '' },
    city: { type: String, default: '' },

    // ── Weather (auto-fetched, user-correctable) ──
    weather: {
      temp: { type: Number, default: 25 },
      tempMin: { type: Number, default: 20 },
      tempMax: { type: Number, default: 30 },
      humidity: { type: Number, default: 50 },
      windSpeed: { type: Number, default: 15 },
      aqi: { type: Number, default: 50 },
      description: { type: String, default: '' },
      manuallyCorrected: { type: Boolean, default: false },
      fetchedAt: { type: Date },
    },

    // ── Resolved ritu (from weather + calendar date) ──
    rituId: { type: String, default: '' }, // grisham | varsha | sharad | hemant | shishir | vasant
    rituPhase: { type: String, default: '' }, // begin | peak | last

    // ── Personal Ayurvedic profile ──
    profile: {
      name: { type: String, default: '' },
      age: { type: Number },
      gender: { type: String, default: '' }, // male | female | other
      prakriti: { type: String, default: '' }, // vata | pitta | kapha | vata-pitta | pitta-kapha | vata-kapha | tridosha
      healthConditions: { type: [String], default: [] },
      notes: { type: String, default: '' },
    },
  },
  { collection: 'ritucharya_profiles', timestamps: true }
);

export function getRitucharyaProfile() {
  return (
    mongoose.models.RitucharyaProfile ||
    mongoose.model('RitucharyaProfile', RitucharyaProfileSchema)
  );
}
