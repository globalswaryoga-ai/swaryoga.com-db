import { getCohort } from './lib/workshopBunnyRepository';
(async () => {
  try {
    const cohort = await getCohort('w_english_swar_yoga');
    console.log(cohort);
  } catch (e) {
    console.error(e);
  }
})();
