#!/usr/bin/env node
/**
 * Direct import: Swar Yoga English
 * - Creates enquiry form "swar-yoga-english"
 * - Adds all 13 questions with options
 * - Inserts 117 student submissions into form_submissions
 * - Imports leads into leads_sql
 *
 * Run: node import-swar-yoga-english.js
 */

const { createClient } = require('@libsql/client');
const { randomUUID } = require('crypto');

// ── DB connection ─────────────────────────────────────────────────────────────
const BUNNY_URL   = process.env.BUNNY_DATABASE_URL   || 'libsql://01M2B0JYBZ55FW4532MSWV322A-swaryoga-db.lite.bunnydb.net/';
const BUNNY_TOKEN = process.env.BUNNY_DATABASE_AUTH_TOKEN || 'eyJ0eXAiOiJKV1QiLCJhbGciOiJFZERTQSJ9.eyJwIjp7InJvIjpudWxsLCJydyI6eyJucyI6WyJzd2FyeW9nYS1kYiJdLCJ0YWdzIjpudWxsfSwicm9hIjpudWxsLCJyd2EiOm51bGwsImRkbCI6bnVsbH0sImlhdCI6MTc4OTIyMzYwMX0.9A7XcDsf5afxfdhT6JavXlO7xPHoMK7cBXX3EGHHPfUdDEWvWjGhEbcFJ1y0GKXzr9osVT74HFl9pV2rj0x8BQ';

const db = createClient({ url: BUNNY_URL.trim(), authToken: BUNNY_TOKEN.trim() });

async function exec(sqlOrObj, args = []) {
  if (typeof sqlOrObj === 'object' && sqlOrObj !== null && 'sql' in sqlOrObj) {
    return db.execute({ sql: sqlOrObj.sql, args: sqlOrObj.args || [] });
  }
  return db.execute({ sql: sqlOrObj, args });
}

function normalizePhone(raw) {
  if (!raw) return '';
  let p = String(raw).replace(/[\s\-\(\)\.±+]/g, '').replace(/[^\d]/g, '');
  if (p.startsWith('00')) p = p.slice(2);
  return p.length >= 6 ? p : '';
}

// ── Form definition ───────────────────────────────────────────────────────────
const FORM_ID = 'swar-yoga-english';

const QUESTIONS = [
  { fieldKey: 'timestamp',       type: 'text',     label: 'Registration Timestamp', required: false, order: 0, options: [] },
  { fieldKey: 'name',            type: 'text',     label: 'Full Name',              required: true,  order: 1, options: [] },
  { fieldKey: 'email',           type: 'text',     label: 'Email Address',          required: true,  order: 2, options: [] },
  { fieldKey: 'gender',          type: 'radio',    label: 'Gender',                 required: true,  order: 3, options: ['Male', 'Female', 'Other'] },
  { fieldKey: 'age',             type: 'text',     label: 'Age',                    required: false, order: 4, options: [] },
  { fieldKey: 'phone',           type: 'text',     label: 'WhatsApp Number',        required: true,  order: 5, options: [] },
  { fieldKey: 'occupation',      type: 'radio',    label: 'Occupation',             required: false, order: 6, options: ['Job', 'Self-Employed', 'Businessman', 'Housewife', 'Jobless', 'Retired', 'Student'] },
  { fieldKey: 'health_issues',   type: 'textarea', label: 'Any Health Issues?',     required: false, order: 7, options: [] },
  { fieldKey: 'reason',          type: 'textarea', label: 'Why do you want to join Swar Yoga?', required: false, order: 8, options: [] },
  { fieldKey: 'batch',           type: 'radio',    label: 'Preferred Batch',        required: false, order: 9,
    options: [
      'Morning Batch (From 13th Aug 9 am India time)',
      'Evening Batch (form 14th Aug 9.30 PM India time)',
      'Morning Batch (From 3rd Sep 26 9.00AM India time)',
      'Evening Batch (form 04th Sep 9.30 PM India time)',
      'Morning Batch (From 17th September -26, Time: 9.00AM IST)',
      'Morning Batch (From 4th December-26, Time: 9.00AM IST)',
      'These time not sutteble to me',
    ]
  },
  { fieldKey: 'video_on',        type: 'radio',    label: 'Will you keep video on during class?', required: false, order: 10, options: ['Yes', 'Yes all days', 'No'] },
  { fieldKey: 'attend_all',      type: 'radio',    label: 'Will you attend all days?', required: false, order: 11, options: ['Yes', 'Yes all days', 'No'] },
  { fieldKey: 'city',            type: 'text',     label: 'City / Location',        required: false, order: 12, options: [] },
  { fieldKey: 'commitment',      type: 'radio',    label: 'Commitment',             required: false, order: 13, options: ['Yes I will', 'I noted', 'some day will be off', 'No i am not sure'] },
  { fieldKey: 'status_note',     type: 'text',     label: 'Admin Status Note',      required: false, order: 14, options: [] },
];

// ── Student data ──────────────────────────────────────────────────────────────
// [timestamp, name, email, gender, age, phone, occupation, health, reason, batch, videoOn, attendAll, city, commitment, statusNote]
const STUDENTS = [
  ['8/9/2026 10:05:06','MOHAN KALBURGI','swarsakshi9@gmail.com','Male','50','91930998680','Self-Employed','no','for my knowlage','Morning Batch (From 13th Aug 9 am India time)','Yes','Yes','Sangamner-Maharastra- India','Yes I will','Teacher'],
  ['8/9/2026 11:07:45','Dinesh Kumar N N','kumarnndinesh@gmail.com','Male','28','8431200104','Job','No','To refine my thoughts speach and fluency','Evening Batch (form 14th Aug 9.30 PM India time)','Yes','Yes','Banglore , Karnataka india','Yes I will','evn-taken'],
  ['8/9/2026 11:25:52','ARUN RAJAKUMAR','arunrajakumar189@gmail.com','Male','33','7339514957','Job','No','For good health','Evening Batch (form 14th Aug 9.30 PM India time)','Yes','Yes','Chennai','Yes I will','evn-taken'],
  ['8/9/2026 11:27:40','Dushyant Reddy','dnaweb123@gmail.com','Male','42','+919347922574','Self-Employed','Back pain n neck','Instagram','Morning Batch (From 13th Aug 9 am India time)','Yes','Yes','Hyderabad ,Telangana, India','Yes I will','mor-taken'],
  ['8/9/2026 11:38:46','Yogananda B B','yogiinindia@gmail.com','Male','48','9844942366','Job','Yes psoriasis','Active naadis','Evening Batch (form 14th Aug 9.30 PM India time)','Yes','Yes','Mysuru Karnataka India','I noted','evn-taken'],
  ['8/9/2026 12:20:07','Hetal Dineshbhai Panchal','hetalpanchal923@gmail.com','Female','34','7383566323','Job','No','I am on path of where I am learning on how to respond not to react','These time not sutteble to me','Yes','Yes','Ahmedabad','Yes I will',''],
  ['8/9/2026 12:28:17','Willelmine vellin','willelmine_vellin@yahoo.com','Female','50','230','Job','Thyroid','To be in better health I have bellpalsy','Evening Batch (form 14th Aug 9.30 PM India time)','Yes','Yes','Commerson street curepipe','Yes I will','evn-taken'],
  ['8/9/2026 13:32:53','Veeranah Prabhakar','lavanfurniture@gmail.com','Male','55','54748000','Self-Employed','Yes','Learning more','Evening Batch (form 14th Aug 9.30 PM India time)','Yes','Yes','Mauritius','Yes I will','evn-taken'],
  ['8/9/2026 14:00:27','Bhowany Simladevi','bsimladevi@gmail.com','Female','50','+2307812129','Job','I am pre diabetics and anaemia','I am keen and looking forward to learn it','Evening Batch (form 14th Aug 9.30 PM India time)','Yes','Yes','Beau Bassin, Mauritius','Yes I will','evn-taken'],
  ['8/9/2026 15:49:03','Deepa','deepa.das2613@gmail.com','Female','40','9742711838','Housewife','Yes','Self-awareness','These time not sutteble to me','Yes','Yes','Bangalore, Karnataka, India','Yes I will',''],
  ['8/9/2026 16:25:10','Pooja','poornima.rs23@gmail.com','Female','35','8892200586','Housewife','no','I am interested','Evening Batch (form 14th Aug 9.30 PM India time)','Yes','Yes','Bangalore','Yes I will','evn-taken'],
  ['8/9/2026 16:56:43','Padmini','padbusgeet@gmail.com','Female','44','+23059177045','Job','No','For health','Evening Batch (form 14th Aug 9.30 PM India time)','Yes','No','Pereybere mauritius','Yes I will','evn-taken'],
  ['8/9/2026 17:06:59','Kiruthika','kpkruthika@gmail.com','Female','38','9080693700','Self-Employed','No','Interested to learn','These time not sutteble to me','Yes','No','Coimbatore Tamil Nadu India','I noted',''],
  ['8/9/2026 17:08:13','Dayana Narraidoo','narraidoodayana@gmail.com','Female','62','+23057664894','Retired','Thyroid imbalance,high cholesterol and head ache','Very interesting from what I followed in previous sessions','Morning Batch (From 13th Aug 9 am India time)','Yes','Yes','Mauritius','Yes I will','mor-taken'],
  ['8/9/2026 17:27:58','Nirja','nirjasaraf2@gmail.com','Female','58','7888000341','Job','No','Interested in the subject','Evening Batch (form 14th Aug 9.30 PM India time)','Yes','Yes','Pune, Maharashtra','I noted','hold'],
  ['8/9/2026 17:29:55','Pradeep shiw maharaj','pshiwmaharaj@aquarelle-clothing.com','Male','60','+23057280940','Job','Diabetic','Improve health diabetic','Evening Batch (form 14th Aug 9.30 PM India time)','Yes','No','Port louis','Yes I will','evn-taken'],
  ['8/9/2026 17:42:46','Vijendra','vijendrabethi@gmail.com','Male','55','9951059696','Jobless','No','Knowledge purpose','Evening Batch (form 14th Aug 9.30 PM India time)','Yes','Yes','Hyderabad, Telangana','Yes I will','evn-taken'],
  ['8/9/2026 17:52:03','SYAMLAL','work.klait@gmail.com','Male','45','9846615879','Job','No','Knowledge','Evening Batch (form 14th Aug 9.30 PM India time)','Yes','No','Kerala','Yes I will','Removed'],
  ['8/9/2026 18:32:16','Manjula','manjuladoyekee@gmail.com','Female','71','23059486038','Retired','I take bp pills','To enjoy a good health','Evening Batch (form 14th Aug 9.30 PM India time)','Yes','Yes','Mauritius','Yes I will','evn-taken'],
  ['8/9/2026 18:35:12','HITHES','hithes@gmail.com','Male','48','','Job','Diabetes','Heard of this. To experience the benefits.','These time not sutteble to me','No','No','PALAKKAD, KERALA, INDIA','Yes I will',''],
  ['8/9/2026 18:55:48','Sheela Moothoosawmy','sheelamoothoosawmy@yahoo.com','Female','60','+23059351908','Retired','Sciatic pain and heart burnt','To be healed','Morning Batch (From 13th Aug 9 am India time)','Yes','Yes','Mauritus','Yes I will','mor-taken'],
  ['8/9/2026 22:22:24','Uma','uma.pokhun@gmail.com','Female','60','23052598411','Job','No','To gain knowledge on the subject','These time not sutteble to me','Yes','No','Quatre Bornes, Mauritius','Yes I will',''],
  ['8/9/2026 22:39:52','Shakuntala Barbhaya','barbhayashaku@gmail.com','Female','82','+91 9820984044','Retired','Arthritis, gastritis, allergic bronchitis','For positive attitude and better health','Evening Batch (form 14th Aug 9.30 PM India time)','Yes','Yes','Mumbai, Maharastra, Bharat','I noted','evn-taken'],
  ['8/9/2026 23:40:08','Ganesh Prasad','ganeshnprasad@yahoo.com','Male','62','9113201085','Retired','Diabetes','For prosperity','Evening Batch (form 14th Aug 9.30 PM India time)','Yes','Yes','Bangalore, karnataka, india','Yes I will','evn-taken'],
  ['8/9/2026 23:45:43','Prithviraj Seesurn','pseesurn@yahoo.com','Male','51','+23052550700','Job','Backpack & Diabetes','To improve health. Preventive.','Evening Batch (form 14th Aug 9.30 PM India time)','Yes','Yes','Ebene, Mauritius','Yes I will','evn-taken'],
  ['8/10/2026 0:02:25','Nitin ranjan','nitinr100@yahoo.com','Male','51','+971559002093','Self-Employed','No','Learn the science','Evening Batch (form 14th Aug 9.30 PM India time)','Yes','No','Dubai','Yes I will','evn-taken'],
  ['8/10/2026 9:51:18','Shashi Kumar M','mshashiyoga@gmail.com','Male','35','8892220809','Job','No','For deep knowledge better lifestyle','Morning Batch (From 13th Aug 9 am India time)','Yes','Yes','Bangalore Karnataka India','Yes I will','mor-taken'],
  ['8/10/2026 9:54:38','Rohith R','rohitdolphin20@gmail.com','Male','28','+918553220227','Job','God bless, nothing','Sports strength and conditioning coach passionate about Svara','Evening Batch (form 14th Aug 9.30 PM India time)','Yes','Yes','Bengaluru','Yes I will','evn-taken'],
  ['8/10/2026 9:59:39','Indira Dussoye','idussoye@gmail.com','Female','60','23059285485','Housewife','Back pain','For better health','Evening Batch (form 14th Aug 9.30 PM India time)','Yes','Yes','Trou deau douce, Mauritius','Yes I will','evn-taken'],
  ['8/10/2026 10:18:14','Arti Upadhyay','artikaupadhyay@gmail.com','Female','30','919754708708','Jobless','Hormonal imbalance','For good health','Morning Batch (From 13th Aug 9 am India time)','Yes','No','Gwalior, Madhya pradesh, India','Yes I will','mor-taken'],
  ['8/10/2026 10:24:21','A. Banu Prakash','saianand156@gmail.com','Male','28','+918056151134','Self-Employed','No',"I'd like to learn about the breath",'Morning Batch (From 13th Aug 9 am India time)','Yes','Yes','Chengalpattu, Tamilnadu, India','Yes I will','mor-taken'],
  ['8/10/2026 10:30:49','Abdul jaleel','jaleelmarmayogi@gmail.com','Male','58','9847342671','Self-Employed','Skin issues','Spiritual progress','Evening Batch (form 14th Aug 9.30 PM India time)','Yes','Yes','Cochin,kerala India','Yes I will','Evn-Taken'],
  ['8/10/2026 13:21:32','Palaniyappan','palanisimple@gmail.com','Male','42','+91 9841102529','Jobless','Restless,Upper Back Pain','Restless,Upper Back Pain, Calmness, Nervous Weakness','Evening Batch (form 14th Aug 9.30 PM India time)','Yes','Yes','Chennai','Yes I will','Yes i will'],
  ['8/10/2026 15:59:41','Ajith kumar','ajithkumarpottana@gmail.com','Male','65','+ 91 8891881942','Self-Employed','Diabetic','To get physical and mental and spiritual health','Evening Batch (form 14th Aug 9.30 PM India time)','Yes','Yes','Kozhikode district, Kerala state,India','Yes I will','Yes i will'],
  ['8/10/2026 16:22:09','Shailendra Pratap Singh','shailpsingh71@gmail.com','Male','55','+919368733839','Jobless','No','I want to overcome the failure..','Morning Batch (From 13th Aug 9 am India time)','Yes','Yes','Pilibhit, Uttar Pradesh, India','Yes I will','Yes i will'],
  ['8/10/2026 16:22:26','Krishna sharma','Ksh16121989@gmail.com','Female','37','+919251545453','Housewife','Hypothyroid','To heal myself','Morning Batch (From 13th Aug 9 am India time)','Yes','No','Jaipur','Yes I will','Yes i will'],
  ['8/10/2026 16:49:09','Bobby jain','bobbyvanamalijain@gmail.com','Male','50','7095473696','Self-Employed','No','For sadhana','Evening Batch (form 14th Aug 9.30 PM India time)','Yes','Yes','Vijayawada','Yes I will','Yes i will'],
  ['8/10/2026 18:40:41','Sid','mailsiddarth26@gmail.com','Male','33','7899102996','Job','Fat and mind Focus need fix','Knowledge learning','Morning Batch (From 13th Aug 9 am India time)','Yes','Yes','Bangalore','I noted','Yes i will'],
  ['8/10/2026 18:42:32','Rijul Kumar','rijulkuma@gmail.com','Male','29','918860645927','Jobless','Yes severe vata problems','Fascinated by Svara Vigyan','Evening Batch (form 14th Aug 9.30 PM India time)','Yes','Yes','Chandigarh, India','Yes I will','Yes i will'],
  ['8/13/2026 7:48:20','Muskan','aryanmahi2330@gmail.com','Female','44','+91 70382 55983','Housewife','No','To learn 8 fold paths of yoga','Evening Batch (form 04th Sep 9.30 PM India time)','Yes','No','Nagpur','Yes I will','Yes i will'],
  ['8/10/2026 20:21:20','ANEES','aneescivilengra@gmail.com','Male','50','91 9895476350','Self-Employed','No','To experiemce swara yoga','Evening Batch (form 14th Aug 9.30 PM India time)','Yes','No','Kollam, kerala ,india','Yes I will','Yes i will'],
  ['8/10/2026 21:58:45','Prashanth M','prashanth.maruthi@zohomail.in','Male','44','','Job','No, only neck pain','To Cleanse physically & mentally','Morning Batch (From 13th Aug 9 am India time)','Yes','Yes','Prashanth M','Yes I will','Yes i will'],
  ['8/10/2026 22:02:51','Shikha rana','shikhabaghel00@gmail.com','Female','35','+919711050140','Housewife','Half Body pain','Health issues','Morning Batch (From 13th Aug 9 am India time)','Yes','Yes','Chennai,tamilnadu,india','Yes I will','Yes i will'],
  ['8/11/2026 11:36:46','Beena','beenatatwamasi@gmail.com','Female','55','+919207815351','Jobless','No','To learn','Morning Batch (From 13th Aug 9 am India time)','No','Yes','Trivandrum kerala','Yes I will','Yes i will'],
  ['8/11/2026 6:16:34','Venkata jagannaath','sjagannath5656@gmail.com','Male','42','9700777747','Self-Employed','No','To practice swara yoga','Evening Batch (form 14th Aug 9.30 PM India time)','Yes','Yes','Chittoor -Andhra pradesh, India','Yes I will','Yes i will'],
  ['8/11/2026 8:29:12','Ramkumar','blogwithramu@gmail.com','Male','39','91-9176757905','Job','No','Learn ancient wisdom','Morning Batch (From 13th Aug 9 am India time)','Yes','Yes','Chennai','Yes I will','Yes i will'],
  ['8/11/2026 8:41:53','Usha','arshyh@gmail.com','Female','37','+230 57565935','Job','Gastritis','To know more about the natural ways of dealing with acidity','Evening Batch (form 14th Aug 9.30 PM India time)','Yes','Yes','Mauritius','Yes I will','some day will be off'],
  ['9/8/2026 16:43:15','Shruthi','shruthihr11@gmail.com','Female','40','9035444950','Housewife','Disc bulge','REGULARLY PRACTICING YOGA JUST WANTED TO EXPERIENCE SWAR YOGA','Morning Batch (From 17th September -26, Time: 9.00AM IST)','Yes all days','No','Bangaluru','Yes I will','Yes i will'],
  ['8/11/2026 10:31:01','Jagdish','bajjag@gmail.com','Male','68','919381205234','Self-Employed','Heart artery blocked','To improve my self','Morning Batch (From 13th Aug 9 am India time)','Yes','Yes','Chennai, Tamilnadu, India.','Yes I will','Yes i will'],
  ['8/11/2026 11:07:10','Abirami','drabianbu16@gmail.com','Female','30','918778808051','Job','No','Healthy lifestyle','Evening Batch (form 14th Aug 9.30 PM India time)','Yes','Yes','Trichy','Yes I will','Yes i will'],
  ['8/11/2026 11:58:42','Lakshmi prasanna vagwala','lakshmiprasanna9v@gmail.com','Female','','919492917208','Housewife','Some health issues','I want learn to solve my health issues','Morning Batch (From 13th Aug 9 am India time)','Yes','Yes','Nidamarru','Yes I will','Yes i will'],
  ['8/11/2026 12:29:01','Souvik das','faithvibes575@gmail.com','Male','28','+918910646302','Self-Employed','Allergic asthma','I am a spiritual practioner','Evening Batch (form 14th Aug 9.30 PM India time)','Yes','Yes','Kolkata','Yes I will','Yes i will'],
  ['8/11/2026 13:58:38','Sindhu Pandu','sindhuairmining@gmail.com','Female','36','918825687428','Job','Hormonal imbalance','Health','Evening Batch (form 14th Aug 9.30 PM India time)','Yes','No','Salem','Yes I will','Yes i will'],
  ['8/11/2026 17:47:12','Tulasi venkatappa','sudhavenkatappa0999@gmail.com','Female','45','7353555513','Housewife','Diabetic','To gain knowledge and use it for my own','Morning Batch (From 13th Aug 9 am India time)','Yes','Yes','Bangalore, Karnataka and India','Yes I will','Yes i will'],
  ['8/11/2026 18:16:49','Sunita Biradar','dsunita.123@gmail.com','Female','45','+919964442141','Self-Employed','No','I am interested in learning yoga','Morning Batch (From 13th Aug 9 am India time)','Yes','No','Vijayapur','Yes I will','some day will be off'],
  ['8/11/2026 18:20:52','Gayatri Das','gayatri.mg09@gmail.com','Female','43','91-7093901477','Housewife','No','Healthy Breathing','Evening Batch (form 14th Aug 9.30 PM India time)','Yes','Yes','Hyderabad, Telangana, India','Yes I will','Yes i will'],
  ['8/11/2026 18:58:51','Suchitra M','suchiram741@gmail.com','Female','33','919742032395','Housewife','No','Vocal clarity','Evening Batch (form 14th Aug 9.30 PM India time)','Yes','Yes','Bangalore, Karnataka, India','Yes I will','Yes i will'],
  ['8/11/2026 18:58:55','Abhishek Thakur','abhishek.thakur189@gmail.com','Male','37','+919817955007','Businessman','No','Studing swar vigyan from long time','Evening Batch (form 14th Aug 9.30 PM India time)','Yes','Yes','Kangra, Himachal Pradesh,India','Yes I will','No i am not sure'],
  ['8/11/2026 19:25:30','Jayakumar R','jsrupranav1965@gmail.com','Male','62','91 9791277938','Retired','No','My spiritual path to be developed.','Evening Batch (form 14th Aug 9.30 PM India time)','Yes','Yes','Edathala, Aluva, Ernakulam, Kerala.','Yes I will','Yes i will'],
  ['8/11/2026 19:54:28','Shivaramen','pareatumbee@intnet.mu','Male','70','+23057847526','Retired','Had inginual hernia repair last November','To have a healthy life','Morning Batch (From 13th Aug 9 am India time)','Yes','Yes','Ebene city Mauritius','Yes I will','Yes i will'],
  ['8/11/2026 21:13:05','Kal bhairav','Lakakulakedharnath9235@gmail.com','Male','','7981022002','Self-Employed','No','To understand and learn ancient practise','Evening Batch (form 14th Aug 9.30 PM India time)','Yes','No','Hyderabad telangana india','Yes I will','Yes i will'],
  ['8/11/2026 21:33:30','Satish','satya498a@gmail.com','Male','44','+918332973730','Jobless','Yes','Reduce stress level','Evening Batch (form 14th Aug 9.30 PM India time)','Yes','No','Telangana','Yes I will','Yes i will'],
  ['8/11/2026 21:47:11','Renuka','renusandu@gmail.com','Female','39','91 9885992155','Job','No','To gain knowledge','Evening Batch (form 14th Aug 9.30 PM India time)','Yes','No','Hyderabad','Yes I will','Yes i will'],
  ['8/13/2026 23:57:15','Samrudhi','samrudhivaidya06@gmail.com','Female','31','9766849596','Job','Obesity','To understand and have control over my body','These time not sutteble to me','Yes','Yes','Bangalore','Yes I will','Yes i will'],
  ['8/12/2026 11:21:29','Ravi N','ravin3759@gmail.com','Male','32','8183835383','Job','No','Learn swar yoga','Evening Batch (form 14th Aug 9.30 PM India time)','Yes','Yes','Bangalore','Yes I will','Yes i will'],
  ['8/11/2026 23:18:37','Dhanalaxmi','digitaldansan@gmail.com','Female','45','+91 9481056844','Job','Hypertension','To learn Swara yoga for manifesting my goals','Evening Batch (form 14th Aug 9.30 PM India time)','Yes','No','Bangalore, Karnataka,India','Yes I will','Yes i will'],
  ['8/11/2026 23:55:01','Akanksha','akankshaprjpt333@gmail.com','Female','36','7619928903','Housewife','Thyroid issue','I want to feel peaceful','Morning Batch (From 13th Aug 9 am India time)','Yes','No','Kochi, Kerala, India','Yes I will','Yes i will'],
  ['8/12/2026 1:39:58','Shanmuganathan','shananu@gmail.com','Male','53','919880456000','Businessman','Yes','Want to do meditation','Evening Batch (form 14th Aug 9.30 PM India time)','Yes','Yes','Bengaluru, Karnataka, India','Yes I will','Yes i will'],
  ['8/12/2026 10:44:31','Akanksha Dubey','aki.a2907@gmail.com','Female','42','+917483872035','Self-Employed','Lower Back pain','I want to experience the benefits of swar yoga','Evening Batch (form 14th Aug 9.30 PM India time)','Yes','Yes','Gurgaon, Haryana, India','Yes I will','Yes i will'],
  ['8/12/2026 10:45:17','Divya','y.shruthi.d@gmail.com','Female','35','+91 9944431196','Self-Employed','No','Learning','Morning Batch (From 13th Aug 9 am India time)','Yes','Yes','India','Yes I will','Yes i will'],
  ['8/12/2026 11:34:42','Dr Anuradha','dranu024@gmail.com','Female','57','917676619926','Self-Employed','No','Like','Evening Batch (form 14th Aug 9.30 PM India time)','Yes','Yes','Bangalore','Yes I will','Yes i will'],
  ['8/12/2026 12:22:07','Gaanesh','ganeshnarain185@mail.com','Male','62','9613039115','Jobless','Psoriasis (little)','To know about kriya and practice.','Morning Batch (From 3rd Sep 26 9.00AM India time)','Yes','Yes','Bangalore-Karnataka-Bharat','Yes I will','Yes i will'],
  ['8/12/2026 12:25:04','Sowmya','sowmyadev1982@gmail.com','Female','43','91 9844629396','Housewife','Yes','To know about swar vignan','Evening Batch (form 14th Aug 9.30 PM India time)','Yes','Yes','Bangalore jayanagar','Yes I will','Yes i will'],
  ['8/12/2026 12:49:29','Ritika sharma','ritikasharma192@gmail.com','Female','38','91 9212102413','Housewife','Yes','To improve my health issues','Evening Batch (form 14th Aug 9.30 PM India time)','Yes','Yes','Ghaziabad Uttar Pradesh','Yes I will','Yes i will'],
  ['8/12/2026 14:08:41','Nivethetha R','knivethetha@gmail.com','Female','34','+919962062393','Housewife','No','To gain knowledge and experience','Morning Batch (From 13th Aug 9 am India time)','Yes','No','Chennai Tamilnadu India','Yes I will','Yes i will'],
  ['8/12/2026 15:27:47','Balakumari Venkataraman','balakumarivenkat@gmail.com','Female','60','9148014434','Retired','Gut issue','I am a yoga teacher so I want to know more about breathing exercises','These time not sutteble to me','Yes','Yes','Trivandrum, Kerala, India','I noted','No i am not sure'],
  ['8/12/2026 16:49:38','Vaikunth K','vaikunth3@gmail.com','Male','36','9787748817','Job','Liver problem, kidney stone','For seeking peace','Evening Batch (form 04th Sep 9.30 PM India time)','Yes','Yes','Nagercoil','Yes I will','Yes i will'],
  ['8/12/2026 17:59:20','Ravish Chandra','ravish2in@gmail.com','Male','36','+919650126989','Self-Employed','Thyroid','To learn yoga and make my body healthy','Morning Batch (From 13th Aug 9 am India time)','Yes','Yes','Delhi','Yes I will','Yes i will'],
  ['8/12/2026 18:40:04','Manjunath','manjukalburgi@gmail.com','Male','45','9731760600','Job','High BP','To understand and get happiness','Evening Batch (form 04th Sep 9.30 PM India time)','Yes','Yes','Bangalore Karnataka India','Yes I will','Yes i will'],
  ['8/12/2026 21:03:33','Akshata G','akshatagombi@gmail.com','Female','30','91 8884528018','Job','No','Healthy life style','Evening Batch (form 14th Aug 9.30 PM India time)','Yes','Yes','Bangalore','Yes I will','Yes i will'],
  ['8/12/2026 22:16:01','Aabha Shania','aabhashania@gmail.com','Female','32','8860555841','Businessman','Not as such','To know more on this topic','Morning Batch (From 13th Aug 9 am India time)','Yes','Yes','Bengaluru','Yes I will','Yes i will'],
  ['9/14/2026 7:31:11','Pratima','pratima.hurrymun@gmail.com','Female','47','+447972595968','Job','No','Really keen to do this','Morning Batch (From 4th December-26, Time: 9.00AM IST)','Yes all days','Yes','Horley, UK','Yes I will','Yes i will'],
  ['8/12/2026 23:03:38','Gayathri Selvarasan','soundhealingwithgayathri@gmail.com','Female','41','919791811211','Job','No','I am a sound healing facilitator and want to learn more.','Evening Batch (form 14th Aug 9.30 PM India time)','Yes','Yes','Chennai, Tamilnadu and India','Yes I will','Yes i will'],
  ['8/12/2026 23:04:25','Laxmi prasanna','prasu25d@gmail.com','Female','40','9177657247','Housewife','no','learn swara vignan','Evening Batch (form 14th Aug 9.30 PM India time)','Yes','Yes','Hyderabad','Yes I will','Yes i will'],
  ['8/13/2026 5:32:01','Muskan','muskanmotiramani@gmail.com','Female','44','971569298907','Housewife','No','Yoga','Evening Batch (form 04th Sep 9.30 PM India time)','Yes','Yes','Uae','Yes I will','Yes i will'],
  ['8/13/2026 6:33:06','Mahendra Telugu','mahendratelugu6865@gmail.com','Male','45','9491403118','Job','Ya health issues','Attend peace','Evening Batch (form 04th Sep 9.30 PM India time)','Yes','Yes','Tandur telengana 501141','I noted','Yes i will'],
  ['8/13/2026 12:44:29','Mamta','mamtapahilwani@yahoo.com','Female','29','91-8827346762','Job','Back pain and sinus','Healing','Morning Batch (From 3rd Sep 26 9.00AM India time)','Yes','No','Karnataka, Bangalore, India','Yes I will','Yes i will'],
  ['8/13/2026 12:46:07','Yuva Rani','yuvaraniveeraragavan@gmail.com','Female','38','7708400048','Job','Uterine fibrods, uterus bulge','Be fit','Evening Batch (form 14th Aug 9.30 PM India time)','Yes','No','Madurai, tamilnadu','Yes I will','some day will be off'],
  ['8/13/2026 13:00:54','Pooja Oswal','pooja.oswal@gmail.com','Female','39','8105528371','Self-Employed','None','I am Breathwork therapist and want to learn everything about breath','Morning Batch (From 3rd Sep 26 9.00AM India time)','Yes','Yes','Banglore, karnataka and India','Yes I will','Yes i will'],
  ['8/13/2026 12:57:37','Jayanthi Ravi','jayanthiravi500@gmail.com','Female','53','9884933318','Housewife','10 yrs back Removed gal bladder','For mind relaxing','Evening Batch (form 14th Aug 9.30 PM India time)','Yes','No','Chennai, Tamilnadu, India','Yes I will','Yes i will'],
  ['8/13/2026 13:50:10','Piriyadharshinee','piriyadharshinee17@gmail.com','Female','26','+919486779318','Self-Employed','Hormonal imbalance','To learnt the ancient technique','Evening Batch (form 14th Aug 9.30 PM India time)','Yes','Yes','Kumbakonam, Tamil Nadu, India','Yes I will','Yes i will'],
  ['8/13/2026 14:29:07','Radha.C','radhakanagam2002@gmail.com','Female','25','919345719203','Jobless','Nil','Good life','Evening Batch (form 04th Sep 9.30 PM India time)','Yes','Yes','Tamilnadu , Nagercoil','Yes I will','Yes i will'],
  ['8/13/2026 16:44:05','Savita','rosysha2000@gmail.com','Female','45','+351920214903','Job','No','Interested to learn','Evening Batch (form 14th Aug 9.30 PM India time)','Yes','Yes','Porto, Portugal','Yes I will','Yes i will'],
  ['8/13/2026 15:20:10','Sonika Heeroo Seebooa','sonikirtisee@gmail.com','Female','33','+23054825162','Job','Anxiety and gastric issues','To heal myself and find peace of mind','Morning Batch (From 3rd Sep 26 9.00AM India time)','Yes','Yes','Mauritius','Yes I will','Yes i will'],
  ['8/13/2026 15:54:48','jeyashri r','jeyashrir98@gmail.com','Female','28','+91 6369609828','Jobless','Yes digestion','To improve my health','Evening Batch (form 14th Aug 9.30 PM India time)','Yes','Yes','Tiruppur Tamilnadu','Yes I will','Yes i will'],
  ['8/13/2026 15:48:41','Bhargavi','bhagu2say@gmail.com','Female','33','+919535154509','Job','No','Want to learn','Evening Batch (form 14th Aug 9.30 PM India time)','Yes','No','Bengaluru Karnataka india','Yes I will','Yes i will'],
  ['8/13/2026 16:10:30','Janardhana Rao','janardhanrao.maney@gmail.com','Male','54','919448226299','Job','No','To know about swara yoga.','Evening Batch (form 14th Aug 9.30 PM India time)','Yes','Yes','Bengaluru, karnataka, India','Yes I will','Yes i will'],
  ['8/13/2026 17:13:54','Jyothi Nannam','jyothi.nannam@gmail.com','Female','39','+91 9963955635','Housewife','Depression and stress. Emotional blockages','Release stress and emotionally balance','Morning Batch (From 3rd Sep 26 9.00AM India time)','Yes','Yes','Hyderabad','Yes I will','Yes i will'],
  ['8/13/2026 17:53:54','Tipu pahan','thp7583@gmail.com','Male','38','917749043120','Self-Employed','No','Because want a healthy and best version of my life style','Morning Batch (From 3rd Sep 26 9.00AM India time)','Yes','Yes','Pune, Maharashtra, India','Yes I will','Yes i will'],
  ['8/13/2026 21:42:44','Vurna BANGAROO','vurnabangaroo@gmail.com','Female','29','+23057967399','Job','No','Interest and eager to learn more about body, mind connection','Evening Batch (form 04th Sep 9.30 PM India time)','Yes','Yes','Mauritius','I noted','some day will be off'],
  ['8/14/2026 8:45:45','anamika gupta','guptaanamika.4664@gmail.com','Female','39','919936369950','Housewife','Thyroid','Health healing','Evening Batch (form 14th Aug 9.30 PM India time)','Yes','Yes','Lucknow','Yes I will','Yes i will'],
  ['8/14/2026 9:44:54','Vilok Shetty','vilokshetty@gmail.com','Male','41','9538355175','Self-Employed','Sometimes backache','Wanted to learn by spiritual aspect and ancient science','Evening Batch (form 04th Sep 9.30 PM India time)','Yes','Yes','Bangalore','Yes I will','Yes i will'],
  ['8/14/2026 11:19:59','raju sunam','sunam.raju555@gmail.com','Male','34','9666060284','Self-Employed','Gut issues','To be conscious of life energy','Evening Batch (form 04th Sep 9.30 PM India time)','Yes','Yes','Hyderabad 500012','Yes I will','Yes i will'],
  ['8/14/2026 13:26:02','Aps','info.inboxme@gmail.com','Female','47','917018420282','Jobless','Weakness and sometimes low energy','Irrespective of my practices prana goes very low','Evening Batch (form 14th Aug 9.30 PM India time)','Yes','Yes','Una,Himachal, India','Yes I will','Yes i will'],
  ['8/14/2026 14:56:59','Anushree Gowda','anushreegowdahj86@gmail.com','Female','40','9986361819','Housewife','Yes sinus, depression, anxiety, stress','For Mind relaxation, learning about good health','Evening Batch (form 04th Sep 9.30 PM India time)','Yes','No','Bangalore Karnataka','Yes I will','Yes i will'],
  ['8/14/2026 15:20:41','Ruchika Sonpipre','ruchika.sonpipre@gmail.com','Female','32','9202357355','Job','Yes. Multiple sclerosis','Health issues','Evening Batch (form 14th Aug 9.30 PM India time)','Yes','Yes','Kondagaon, chhattisgarh , India','Yes I will','Yes i will'],
  ['8/14/2026 15:34:59','Roshni Seeburn','seeburnroshni24@gmail.com','Female','51','23059255659','Job','Cholesterol / lower back pain','To learn about swar vigyan','Evening Batch (form 04th Sep 9.30 PM India time)','Yes','Yes','Curepipe Mauritius','Yes I will','some day will be off'],
  ['8/14/2026 15:47:22','BABU KUTTAN','babukuttan220@gmail.com','Male','45','8139033712','Self-Employed','BP, lethargy, dust allergy and breathing difficulty','I have heard about the science and want to study and practice it','Evening Batch (form 04th Sep 9.30 PM India time)','Yes','Yes','Thiruvananthapuram, kerala ,India','Yes I will','Yes i will'],
  ['8/14/2026 18:01:13','Shayen','shayenshalu2016@gmail.com','Female','36','91 9940562671','Housewife','Anxiety','I want to overcome','Evening Batch (form 04th Sep 9.30 PM India time)','Yes','No','Guduvanchery, Tamilnadu','Yes I will','Yes i will'],
  ['8/14/2026 18:13:41','Sumathi','sumathikrishnaraju@gmail.com','Female','68','9886090250','Housewife','Had heart problem got angioplasty done diabetes BP','To improve my health','Morning Batch (From 3rd Sep 26 9.00AM India time)','Yes','Yes','Bangalore India','Yes I will','Yes i will'],
  ['8/14/2026 19:40:15','Manjula','valrenzalifestyle@gmail.com','Female','39','+917829065200','Housewife','Yes I have pre-periods symptoms','Want to grow in spiritual','Evening Batch (form 04th Sep 9.30 PM India time)','Yes','No','Bangalore, Karnataka, India','I noted','some day will be off'],
  ['8/14/2026 20:02:07','Lalitha Manoharan','lalitha.mks@gmail.com','Female','39','91 96008 88489','Housewife','Irregular periods, Sciatica','To have a better health','Morning Batch (From 3rd Sep 26 9.00AM India time)','Yes','Yes','Chennai','Yes I will','Yes i will'],
  ['8/14/2026 20:07:39','Sharif Danakatagi','sharif.danakatagi123@gmail.com','Male','31','+919448076156','Job','No','Health life style','Evening Batch (form 04th Sep 9.30 PM India time)','Yes','No','India ,Karnataka,Belagavi','Yes I will','Yes i will'],
  ['8/15/2026 9:01:07','Madhuri Yeshasvi AKNS','yeshasvi24@gmail.com','Female','34','916361605015','Jobless','PCOS','Want to know and understand as to what Swar Yoga is','Evening Batch (form 04th Sep 9.30 PM India time)','Yes','Yes','Bangalore','Yes I will','Yes i will'],
  ['8/15/2026 23:25:49','Sunanda','sunandamootia@gmail.com','Female','32','+23059203628','Job','Stress','I want to pratice self care','Evening Batch (form 04th Sep 9.30 PM India time)','Yes','Yes','Mauritius','Yes I will','Yes i will'],
  ['8/16/2026 1:01:07','Ravi Sourav','ravisourav@gmail.com','Male','36','9978800647','Job','ED','Obesity n curiosity','Evening Batch (form 04th Sep 9.30 PM India time)','Yes','Yes','Bangalore India','Yes I will','Yes i will'],
  ['8/16/2026 7:44:05','Aparna J','aparnajammala@gmail.com','Female','43','9113269934','Housewife','Diabetes, sleep issues , fear','Rectify health issues','Evening Batch (form 04th Sep 9.30 PM India time)','Yes','Yes','Bangalore','Yes I will','some day will be off'],
  ['8/18/2026 14:20:12','Laxmicharan Panda','laxmicharan101@gmail.com','Male','63','7978532547','Businessman','No','For battery life','Evening Batch (form 04th Sep 9.30 PM India time)','Yes','Yes','Sikula, ganjam, odisha','Yes I will','Yes i will'],
  ['8/21/2026 19:46:10','Ashwini Ashwini','14ashwini04@gmail.com','Female','20','7899035061','Job','Dont know','Wager to know what kind of yoga is this','Evening Batch (form 04th Sep 9.30 PM India time)','Yes','No','Bangalore','Yes I will','No i am not sure'],
  ['8/24/2026 15:08:41','Parasakthi','parasakthisurendran@gmail.com','Female','27','9841275763','Housewife','Always tired wheezing','Basically interested','Morning Batch (From 3rd Sep 26 9.00AM India time)','No','No','Chennai','Yes I will','Yes i will'],
  ['9/2/2026 0:37:43','Najoua mas','najoomes@gmail.com','Female','47','+971509838174','Self-Employed','Thyroid','Improve health and well-being naturally','Evening Batch (form 04th Sep 9.30 PM India time)','Yes','Yes','Dubai UAE','Yes I will','Yes i will'],
  ['9/8/2026 7:05:08','Shweta agrawal','Shwaga1@gmail.com','Female','48','+6581724599','Housewife','IBS, diabetes','To get healed from ibs and other health issues','Morning Batch (17th Sep -26 9.00AM IST)','Yes all days','Yes','Singapore','Yes I will','Yes i will'],
  ['9/8/2026 11:23:48','Prafulla ys','prafullays@gmail.com','Female','34','918639900542','Self-Employed','Osteoporosis, hypothyroid','To lose weight and for mental peace','Morning Batch (From 17th September -26, Time: 9.00AM IST)','Yes all days','No','Hyderabad, india','Yes I will','Yes i will'],
  ['9/8/2026 14:27:16','Hetal','Hetaldesai19069@gmail.com','Female','50','+919824356136','Housewife','Few','To improve my health','Morning Batch (From 17th September -26, Time: 9.00AM IST)','Yes all days','Yes','Surat, gujarat India','I noted','Yes i will'],
];

async function main() {
  console.log('🔗 Connecting to Bunny DB...');

  // ── Step 1: Ensure tables ──
  await exec(`CREATE TABLE IF NOT EXISTS enquiry_forms (
    form_id TEXT PRIMARY KEY, workshop_name TEXT NOT NULL,
    workshop_date TEXT DEFAULT '', workshop_end_date TEXT DEFAULT '',
    workshop_time TEXT DEFAULT '', duration TEXT DEFAULT '',
    holidays TEXT DEFAULT '', workshop_mode TEXT DEFAULT 'online',
    workshop_id TEXT DEFAULT '', description TEXT DEFAULT '',
    workshop_image TEXT DEFAULT '', url_image TEXT DEFAULT '',
    price REAL DEFAULT 0, currency TEXT DEFAULT 'INR',
    fee_options TEXT DEFAULT '[]', group_link TEXT DEFAULT '',
    time_slots TEXT DEFAULT '[]', is_active INTEGER DEFAULT 1,
    created_by TEXT DEFAULT 'admin', submission_count INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now'))
  )`);
  await exec(`CREATE TABLE IF NOT EXISTS form_questions (
    id TEXT PRIMARY KEY, field_key TEXT NOT NULL, form_id TEXT NOT NULL,
    question_type TEXT NOT NULL DEFAULT 'text',
    label_en TEXT NOT NULL DEFAULT '', label_hi TEXT DEFAULT '', label_mr TEXT DEFAULT '',
    placeholder_en TEXT DEFAULT '', options TEXT DEFAULT '[]',
    image_url TEXT DEFAULT '', qr_code_url TEXT DEFAULT '',
    link_url TEXT DEFAULT '', link_label TEXT DEFAULT '',
    payment_config TEXT DEFAULT 'null', required INTEGER DEFAULT 0,
    sort_order INTEGER DEFAULT 0, is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now'))
  )`);
  await exec(`CREATE TABLE IF NOT EXISTS form_submissions (
    id TEXT PRIMARY KEY, form_id TEXT NOT NULL,
    name TEXT DEFAULT '', mobile TEXT DEFAULT '', email TEXT DEFAULT '',
    gender TEXT DEFAULT '', city TEXT DEFAULT '',
    answers TEXT DEFAULT '{}', payment_status TEXT DEFAULT 'pending',
    amount REAL DEFAULT 0, currency TEXT DEFAULT 'INR',
    created_at TEXT DEFAULT (datetime('now'))
  )`);
  await exec(`CREATE TABLE IF NOT EXISTS leads_sql (
    document_id TEXT PRIMARY KEY, lead_key TEXT, owner_user_id TEXT,
    lead_number TEXT, data_json TEXT,
    created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now'))
  )`);
  console.log('✅ Tables ready');

  // ── Step 2: Create or update the form ──
  const existing = await exec({ sql: `SELECT form_id FROM enquiry_forms WHERE form_id = ?`, args: [FORM_ID] });
  if (existing.rows.length === 0) {
    await exec({
      sql: `INSERT INTO enquiry_forms (form_id, workshop_name, workshop_date, workshop_end_date, workshop_time, duration, workshop_mode, description, is_active, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 'admin')`,
      args: [FORM_ID, 'Swar Yoga English', '2026-08-09', '2026-09-30', 'Morning 9AM IST / Evening 9:30PM IST', '15 Days', 'online', 'Swar Yoga English batch student registrations (imported)'],
    });
    console.log(`✅ Form created: ${FORM_ID}`);
  } else {
    console.log(`ℹ️  Form already exists: ${FORM_ID}`);
  }

  // ── Step 3: Add questions (skip if already present) ──
  const existingQs = await exec({ sql: `SELECT field_key FROM form_questions WHERE form_id = ?`, args: [FORM_ID] });
  const existingKeys = new Set(existingQs.rows.map(r => r.field_key));
  let qAdded = 0;
  for (const q of QUESTIONS) {
    if (existingKeys.has(q.fieldKey)) continue;
    const id = randomUUID();
    await exec({
      sql: `INSERT INTO form_questions (id, field_key, form_id, question_type, label_en, options, required, sort_order, is_active)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      args: [id, q.fieldKey, FORM_ID, q.type, q.label, JSON.stringify(q.options), q.required ? 1 : 0, q.order],
    });
    qAdded++;
  }
  console.log(`✅ Questions: ${qAdded} added, ${existingKeys.size} already existed`);

  // ── Step 4: Insert submissions + leads ──
  let subOk = 0, subSkip = 0, leadOk = 0, leadSkip = 0;

  for (const row of STUDENTS) {
    const [ts, name, email, gender, age, rawPhone, occupation, health, reason, batch, videoOn, attendAll, city, commitment, statusNote] = row;
    const phone = normalizePhone(rawPhone);

    // Form submission
    const subId = 'sub_' + randomUUID().replace(/-/g, '').slice(0, 10);
    const answers = JSON.stringify({ timestamp: ts, age, occupation, health_issues: health, reason, batch, video_on: videoOn, attend_all: attendAll, commitment, status_note: statusNote });

    // Check duplicate submission by email+form
    const dupSub = email ? await exec({ sql: `SELECT id FROM form_submissions WHERE form_id = ? AND email = ?`, args: [FORM_ID, email.trim().toLowerCase()] }) : { rows: [] };
    if (dupSub.rows.length === 0) {
      try {
        await exec({
          sql: `INSERT INTO form_submissions (id, form_id, name, mobile, email, gender, city, answers) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [subId, FORM_ID, name.trim(), phone || rawPhone, email.trim().toLowerCase(), gender, city.trim(), answers],
        });
        // Increment submission count
        await exec({ sql: `UPDATE enquiry_forms SET submission_count = submission_count + 1 WHERE form_id = ?`, args: [FORM_ID] });
        subOk++;
      } catch (e) { console.warn(`  ⚠️  Sub failed for ${name}: ${e.message}`); subSkip++; }
    } else {
      subSkip++;
    }

    // Lead
    if (phone && phone.length >= 6) {
      const leadKey = `system#${phone}`;
      const dupLead = await exec({ sql: `SELECT document_id FROM leads_sql WHERE lead_key = ?`, args: [leadKey] });
      if (dupLead.rows.length === 0) {
        const leadId = randomUUID();
        const now = new Date().toISOString();
        // Map status note to CRM status
        const sn = String(statusNote || '').toLowerCase();
        let crmStatus = 'lead';
        if (sn.includes('removed')) crmStatus = 'inactive';
        else if (sn.includes('taken') || sn.includes('yes i will') || sn.includes('noted') || sn.includes('teacher')) crmStatus = 'interested';

        const batchShort = String(batch || '').toLowerCase().includes('morning') ? 'Morning Batch' : String(batch || '').toLowerCase().includes('evening') ? 'Evening Batch' : batch;

        const leadData = {
          _id: leadId,
          phoneNumber: phone,
          name: name.trim(),
          email: email.trim().toLowerCase(),
          status: crmStatus,
          source: 'form-link',
          workshopName: 'Swar Yoga English',
          address: city.trim(),
          labels: [batchShort, 'swar-yoga-english'].filter(Boolean),
          createdByUserId: 'system',
          assignedToUserId: 'system',
          createdAt: now,
          updatedAt: now,
          metadata: { formId: FORM_ID, age, occupation, healthIssues: health, reason, batch, gender },
        };
        try {
          await exec({
            sql: `INSERT INTO leads_sql (document_id, lead_key, owner_user_id, lead_number, data_json, created_at, updated_at)
                  VALUES (?, ?, 'system', NULL, ?, ?, ?)`,
            args: [leadId, leadKey, JSON.stringify(leadData), now, now],
          });
          leadOk++;
        } catch (e) { console.warn(`  ⚠️  Lead failed for ${name}: ${e.message}`); leadSkip++; }
      } else {
        leadSkip++;
      }
    }
  }

  // ── Summary ──
  console.log('\n══════════════════════════════════════════');
  console.log('📊  IMPORT COMPLETE — Swar Yoga English');
  console.log('══════════════════════════════════════════');
  console.log(`  Form ID      : ${FORM_ID}`);
  console.log(`  Questions    : ${QUESTIONS.length} (${qAdded} newly added)`);
  console.log(`  Submissions  : ${subOk} imported, ${subSkip} skipped (duplicates)`);
  console.log(`  Leads        : ${leadOk} imported, ${leadSkip} skipped (duplicates/no phone)`);
  console.log('══════════════════════════════════════════');
  console.log('✅ Done! Open: http://localhost:3000/admin/crm/form-questions');

  process.exit(0);
}

main().catch(e => { console.error('❌ Fatal:', e.message); process.exit(1); });
