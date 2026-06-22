// Age-milestone life timeline: 5, 10, 15, ... 80 — for each checkpoint, finds
// which Mahadasha (and, if the deeper tree was computed, Antardasha) was/is
// active on that birthday. This is the "calculate dasha first, then predict
// age-by-age" structure the user asked for, instead of one flat ordered
// list of bhav points.

export const AGE_MILESTONES = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80];

export interface DashaPeriodLite {
  planet: string;
  startDate: string | Date;
  endDate: string | Date;
}

export interface DashaTreeRowLite {
  level: string;
  planet: string;
  parentPath: string;
  startDate: string | Date;
  endDate: string | Date;
}

export interface AgeMilestone {
  age: number;
  date: string; // ISO date (the birthday for this milestone)
  mahadasha?: string;
  antardasha?: string;
}

export function computeAgeMilestones(
  dob: string | Date,
  mahadashas: DashaPeriodLite[],
  dashaPeriods?: DashaTreeRowLite[]
): AgeMilestone[] {
  const birth = new Date(dob);
  if (Number.isNaN(birth.getTime())) return [];

  return AGE_MILESTONES.map((age) => {
    const date = new Date(birth);
    date.setFullYear(date.getFullYear() + age);

    const maha = mahadashas.find((m) => date >= new Date(m.startDate) && date < new Date(m.endDate));
    let antardasha: string | undefined;
    if (maha && dashaPeriods?.length) {
      const antar = dashaPeriods.find(
        (d) => d.level === 'antar' && d.parentPath === maha.planet && date >= new Date(d.startDate) && date < new Date(d.endDate)
      );
      antardasha = antar?.planet;
    }

    return {
      age,
      date: date.toISOString().slice(0, 10),
      mahadasha: maha?.planet,
      antardasha,
    };
  });
}
