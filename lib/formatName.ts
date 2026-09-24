/**
 * Format a freeform, admin/website-typed customer or lead name for
 * consistent display: trims/collapses whitespace and title-cases each word.
 *
 * When a name was typed as one run-on word with no space at all (e.g.
 * "sushamabhargav"), attempts a best-effort split using a dictionary of
 * common Indian first names — finds the LONGEST dictionary first-name that
 * prefixes the word (so "priyanka" wins over "priya" in "priyankasharma"),
 * splits there, and title-cases both halves. If no dictionary entry matches,
 * the word is left unsplit but still capitalized — a miss here never makes
 * the name look more broken than the input, it just doesn't fix the split.
 */

// Common Indian first names (lowercase, both genders, spanning major regions/
// languages) used only to find a plausible split point in a run-on name.
// Not exhaustive — a name that isn't listed here simply won't be split.
const COMMON_FIRST_NAMES = new Set([
  'aabha', 'aadesh', 'aadi', 'aaditya', 'aakash', 'aanya', 'aarav', 'aarti', 'aarushi', 'aashi',
  'aashish', 'aavya', 'abha', 'abhay', 'abhinav', 'abhishek', 'abid', 'aditi', 'aditya', 'aftab',
  'agastya', 'ajay', 'ajit', 'akash', 'akbar', 'akhil', 'akshara', 'akshat', 'akshay', 'akshita',
  'alka', 'alok', 'amar', 'amaya', 'ambika', 'amish', 'amit', 'amita', 'amol', 'amrita',
  'anand', 'anandi', 'anannya', 'anay', 'anika', 'anil', 'anish', 'anisha', 'anita', 'anjali',
  'anjana', 'anju', 'ankit', 'ankita', 'anmol', 'annapurna', 'anoop', 'ansh', 'anshul', 'anu',
  'anubhav', 'anuj', 'anupam', 'anupama', 'anurag', 'anushka', 'anvita', 'anwar', 'aparna', 'apoorva',
  'archana', 'arjun', 'arnav', 'arpita', 'arun', 'aruna', 'arundhati', 'arvind', 'aryan', 'asha',
  'ashish', 'ashok', 'ashwin', 'ashwini', 'asif', 'asma', 'atharv', 'atul', 'avani', 'avinash',
  'ayaan', 'ayesha', 'ayush', 'ayushi', 'azad',
  'babita', 'badal', 'bala', 'balaji', 'balbir', 'baljeet', 'bandana', 'bansi', 'barkha', 'bhagwan',
  'bhagyashree', 'bhairav', 'bhakti', 'bharat', 'bharati', 'bhargav', 'bhavana', 'bhavesh', 'bhavya', 'bhoomi',
  'bhumika', 'bhuvan', 'bimla', 'bindu', 'bipin', 'bishnu', 'brijesh', 'chaitali', 'chaitanya', 'chandan',
  'chander', 'chandini', 'chandra', 'chandrakant', 'chandrashekhar', 'chetan', 'chetna', 'chhaya', 'chirag', 'darshan',
  'darshana', 'daya', 'deepa', 'deepak', 'deepali', 'deepika', 'deepti', 'deven', 'devendra', 'devesh',
  'devi', 'devika', 'dharam', 'dharmendra', 'dhaval', 'dhiraj', 'dhruv', 'dilip', 'dinesh', 'diptesh',
  'disha', 'divya', 'divyanshu', 'durga', 'ekta', 'esha', 'faisal', 'farhan', 'farida', 'firoz',
  'gagan', 'ganesh', 'ganga', 'garima', 'gaurav', 'gauri', 'gayatri', 'geeta', 'geetanjali', 'girish',
  'gita', 'gopal', 'gopi', 'gopika', 'gouri', 'govind', 'gunjan', 'gurmeet', 'gurpreet', 'hansa',
  'hanuman', 'hardik', 'harendra', 'hari', 'harish', 'harpreet', 'harsh', 'harsha', 'harshad', 'harshit',
  'harshita', 'hema', 'hemant', 'hemlata', 'hina', 'hitesh', 'imran', 'indira', 'indra', 'indu',
  'ishaan', 'ishan', 'ishika', 'ishita', 'jagdish', 'jagriti', 'jai', 'jaideep', 'jainendra', 'jalaj',
  'jasleen', 'jaspal', 'jaspreet', 'jatin', 'jaya', 'jayant', 'jayanti', 'jayesh', 'jayshree', 'jeevan',
  'jeevika', 'jignesh', 'jitendra', 'jugal', 'jyoti', 'jyotsna', 'kailash', 'kajal', 'kalindi', 'kalpana',
  'kalyani', 'kamal', 'kamala', 'kamlesh', 'kanak', 'kanchan', 'kanhaiya', 'kanika', 'kanta', 'kanti',
  'kapil', 'karan', 'kartik', 'kartika', 'kashish', 'kaustubh', 'kavita', 'kavya', 'ketaki', 'ketan',
  'khushbu', 'khushi', 'kiran', 'kirti', 'komal', 'kranti', 'krishna', 'krishnan', 'krish', 'kritika',
  'kunal', 'kusum', 'lakshmi', 'lalit', 'lalita', 'latika', 'laxman', 'laxmi', 'leela', 'lokesh',
  'madhav', 'madhavi', 'madhu', 'madhukar', 'madhuri', 'madhusudan', 'mahek', 'mahendra', 'mahesh', 'maheshwari',
  'mahima', 'malati', 'malini', 'malti', 'mamta', 'manan', 'mandar', 'manisha', 'manish', 'manjeet',
  'manju', 'manjula', 'manjunath', 'manoj', 'mansi', 'manvi', 'mayank', 'mayur', 'medha', 'meena',
  'meenakshi', 'meera', 'megha', 'meghana', 'mehul', 'milan', 'milind', 'mira', 'mitali', 'mitesh',
  'mohan', 'mohini', 'mohit', 'mona', 'monika', 'mridul', 'mukesh', 'mukta', 'mukul', 'muskan',
  'nagesh', 'naina', 'nalini', 'namrata', 'nandini', 'nandita', 'naresh', 'natasha', 'navin', 'navya',
  'neel', 'neeraj', 'neeru', 'neeta', 'neha', 'nidhi', 'nikhil', 'nikita', 'nilesh', 'nimisha',
  'nirmal', 'nirmala', 'nisha', 'nishant', 'nishita', 'nitesh', 'nitin', 'nitya', 'niyati', 'ojas',
  'om', 'omkar', 'padma', 'padmini', 'pallavi', 'pankaj', 'parag', 'param', 'parimal', 'parth',
  'parul', 'pavan', 'payal', 'poonam', 'pooja', 'prabha', 'prabhakar', 'pradeep', 'pragati', 'pragya',
  'prakash', 'pramila', 'pramod', 'pranav', 'pranay', 'pranjal', 'prashant', 'prateek', 'pratibha', 'pratik',
  'pratiksha', 'pravin', 'preeti', 'prem', 'prerna', 'priya', 'priyanka', 'priyanshu', 'purnima', 'purushottam',
  'pushpa', 'rachit', 'radha', 'radhika', 'ragini', 'rahul', 'raj', 'raja', 'rajan', 'rajat',
  'rajeev', 'rajendra', 'rajesh', 'rajeshwari', 'rajkumar', 'rajni', 'rakesh', 'raksha', 'ram', 'raman',
  'ramesh', 'ramila', 'rani', 'ranjan', 'ranjana', 'ranjeet', 'ranveer', 'rashi', 'rashmi', 'ratan',
  'ratna', 'ravi', 'ravindra', 'raviraj', 'reema', 'reena', 'rekha', 'renu', 'renuka', 'richa',
  'ridhi', 'rima', 'rimjhim', 'rina', 'rishabh', 'rishi', 'ritesh', 'ritika', 'ritu', 'rohan',
  'rohini', 'rohit', 'roshan', 'roshni', 'rukmini', 'rupali', 'rupa', 'rupesh', 'sachin', 'sadhana',
  'sagar', 'sahil', 'sai', 'saloni', 'saman', 'samar', 'sameer', 'sampada', 'samta', 'sanam',
  'sandeep', 'sandhya', 'sangeeta', 'sanika', 'sanjana', 'sanjay', 'sanjeev', 'sanjita', 'santosh', 'sapna',
  'sarika', 'sarita', 'sarla', 'sarthak', 'saru', 'sarvesh', 'satish', 'satya', 'satyendra', 'saumya',
  'saurabh', 'savita', 'seema', 'shafali', 'shailendra', 'shailesh', 'shakti', 'shalini', 'shama', 'shankar',
  'shanta', 'shantanu', 'sharad', 'sharda', 'sharmila', 'sheela', 'sheetal', 'shekhar', 'shikha', 'shilpa',
  'shirin', 'shivam', 'shivani', 'shobha', 'shraddha', 'shreya', 'shreyas', 'shrikant', 'shruti', 'shubham',
  'shubhangi', 'shubhra', 'shweta', 'siddharth', 'simran', 'smita', 'sneha', 'snehal', 'soham', 'sonal',
  'sonali', 'sonam', 'sonia', 'sourabh', 'sourav', 'sriram', 'subhash', 'subodh', 'sudarshan', 'sudha',
  'sudhakar', 'sudhir', 'suhani', 'suhas', 'sujata', 'sujay', 'sujit', 'suket', 'suketu', 'sulekha',
  'suman', 'sumati', 'sumeet', 'sumit', 'sumitra', 'sunanda', 'sundar', 'sunidhi', 'sunil', 'sunita',
  'suraj', 'suresh', 'suruchi', 'surya', 'sushama', 'sushant', 'sushil', 'sushila', 'sushma', 'suvarna',
  'swapnil', 'swara', 'swarnima', 'swati', 'tanay', 'tania', 'tanmay', 'tanuja', 'tanvi', 'tanya',
  'tarun', 'tejas', 'tejasvi', 'trupti', 'tulsi', 'tushar', 'uday', 'udit', 'uma', 'umang',
  'umesh', 'urmila', 'urvashi', 'usha', 'utkarsh', 'uttam', 'vaibhav', 'vaishali', 'vaishnavi', 'vandana',
  'vanita', 'vansh', 'varsha', 'varun', 'vasant', 'vasudha', 'vasudev', 'ved', 'vedant', 'veena',
  'venkatesh', 'vibha', 'vidhi', 'vidya', 'vijay', 'vijaya', 'vikas', 'vikram', 'vimal', 'vimla',
  'vinay', 'vinayak', 'vinita', 'vinod', 'vipin', 'vipul', 'viraj', 'viren', 'virendra', 'vishal',
  'vishnu', 'vishwas', 'vivek', 'yash', 'yashwant', 'yogendra', 'yogesh', 'yogita', 'yukta', 'zoya',
]);

function titleCaseWord(word: string): string {
  if (!word) return word;
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

export function formatPersonName(raw: string | null | undefined): string {
  if (!raw) return '';
  const collapsed = String(raw).trim().replace(/\s+/g, ' ');
  if (!collapsed) return '';

  if (collapsed.includes(' ')) {
    return collapsed.split(' ').map(titleCaseWord).join(' ');
  }

  // Single run-on word. If the WHOLE word is already a recognized name on
  // its own (e.g. "ramesh"), never split it — otherwise a shorter name that
  // happens to prefix it (e.g. "ram") would wrongly chop it into "Ram Esh".
  // Only attempt a split when the full word isn't itself a known name.
  const lower = collapsed.toLowerCase();
  if (COMMON_FIRST_NAMES.has(lower)) {
    return titleCaseWord(collapsed);
  }

  // Look for the longest dictionary first-name that prefixes it, checking
  // longest candidates first (so "priyanka" wins over "priya" in
  // "priyankasharma"). Requires at least 2 chars left for the surname so we
  // never split off an empty/1-char remainder.
  for (let splitAt = lower.length - 2; splitAt >= 2; splitAt--) {
    const first = lower.slice(0, splitAt);
    if (COMMON_FIRST_NAMES.has(first)) {
      const rest = lower.slice(splitAt);
      return `${titleCaseWord(first)} ${titleCaseWord(rest)}`;
    }
  }

  // No confident split point found — just fix capitalization.
  return titleCaseWord(collapsed);
}
