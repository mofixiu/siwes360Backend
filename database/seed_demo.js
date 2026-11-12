// Demo data for screenshots and walkthroughs.
//
//   npm run seed:demo                 # builds the siwes360_demo database
//   DB_NAME=siwes360_demo npm start   # serves it
//
// Drops and recreates DEMO_DB_NAME (default siwes360_demo; it must end in
// _demo), so it never touches the real siwes360 database. Every person,
// institution and company here is made up; emails use the reserved .example
// domain. Dates are relative to the day you run it, so the logbooks always look
// current. All demo accounts use DEMO_PASSWORD.
const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");
const bcrypt = require("bcrypt");
require("dotenv").config();
const weeks = require("../utils/weeks");

const DEMO_DB = process.env.DEMO_DB_NAME || "siwes360_demo";
if (!/_demo$/.test(DEMO_DB)) throw new Error("DEMO_DB_NAME must end in _demo");
const DEMO_PASSWORD = "Logbook-2026";

const dbConfig = {
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "david001",
  port: Number(process.env.DB_PORT || 3306),
};

const sqlStatements = (file) =>
  fs
    .readFileSync(path.join(__dirname, file), "utf8")
    .replace(/--.*$/gm, "")
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s && !/^CREATE INDEX IF NOT EXISTS/i.test(s));

// ---- What the students wrote ------------------------------------------------
// [activities, skills acquired, challenges faced]

const SOFTWARE = [
  ["Safety and IT induction. Collected my laptop and access card, then set up the development environment: Node, Docker and read access to the staging database.", "Reading a docker-compose file", "The VPN kept dropping; IT reissued my certificate."],
  ["Read through the payments service and wrote notes on how a transfer moves from the API to the ledger tables.", "Tracing a request through an unfamiliar codebase", ""],
  ["Fixed a validation bug on the customer sign-up form: phone numbers starting with +234 were rejected. Mr Lawal reviewed the change before it was merged.", "Regular expressions, writing a regression test", ""],
  ["Wrote unit tests for the invoice PDF generator. Coverage on that module went from 41% to 68%.", "Jest mocks for file output", "Two old tests failed on my machine because of the time zone."],
  ["Paired with a senior developer on a slow monthly report. We added an index on transactions.created_at and the report dropped from 9 seconds to under 1.", "Reading a MySQL EXPLAIN plan", ""],
  ["Sprint planning. Took two tickets: export account statements to CSV, and show a clearer message when BVN verification times out.", "", ""],
  ["Built the CSV export endpoint for account statements, including the date range filter.", "Streaming large responses in Express", "Very large ranges ran out of memory until I streamed the rows."],
  ["Worked through code review comments on the CSV export: moved formatting out of the controller and added tests for empty date ranges.", "Separating formatting from data access", ""],
  ["Helped QA reproduce a crash on Android 10 phones. It came from an unhandled null on the notifications screen.", "Reading Android crash logs", "Could not reproduce on the emulator; needed a test phone from QA."],
  ["Wrote a one-page guide for new interns on running the test suite locally.", "Technical writing", ""],
  ["Sat in on a call with the support team about the five most common customer complaints last month.", "", ""],
  ["Moved three scheduled jobs from the old server to the task runner and added logging when a job fails.", "Cron syntax, structured logging", "One job depended on a file path that only existed on the old server."],
  ["Fixed pagination on the admin transactions table: page 2 repeated the last rows of page 1.", "Offset versus cursor pagination", ""],
  ["Learnt the release process: pull request, CI checks, staging, then the Thursday release.", "", ""],
  ["Investigated a failed release. Staging was missing an environment variable; I added it to the release checklist.", "Reading CI logs", ""],
  ["Documented the statements endpoint in the team's Postman collection with example requests.", "API documentation", ""],
  ["Refactored the email templates to share one layout and removed four copies of the same footer.", "", "Outlook rendered the new layout differently; fixed with a table-based header."],
  ["Found 212 duplicate customer records from an old import and wrote a script that flags them for review.", "SQL GROUP BY and HAVING", ""],
  ["Showed the CSV export to the product manager. Asked to add the account name to the file header, which I did.", "Presenting work", ""],
  ["Monthly security training: phishing examples and how customer data must be stored and shared.", "", ""],
  ["Started the BVN timeout ticket. Read how the verification provider reports errors and listed the cases we show today.", "", "The provider's documentation is out of date."],
  ["Implemented the clearer BVN timeout message and a retry button, with tests for the three error cases.", "Error handling in the mobile client", ""],
  ["Reviewed a teammate's pull request for the first time; left four comments, two of which were accepted.", "Giving code review feedback", ""],
  ["Set up alerts for the payments queue so the team is told when more than 50 transfers are waiting.", "Monitoring dashboards", ""],
  ["Wrote the weekly summary for the backend team stand-up while the lead was on leave.", "", ""],
];

const POWER = [
  ["Safety induction at the Ikeja depot: PPE, the lock-out tag-out procedure and site rules.", "Lock-out tag-out", ""],
  ["Went out with the maintenance crew to a 500 kVA transformer and recorded oil level and winding temperature readings.", "Reading transformer gauges", "Heavy rain delayed the crew by two hours."],
  ["Learnt to read the single-line diagrams of the 11 kV feeders in the area.", "Single-line diagrams", ""],
  ["Helped replace a burnt cut-out fuse on a distribution pole after watching the isolation steps.", "", ""],
  ["Took insulation resistance readings with a megger on a new three-core cable before it was energised.", "Insulation resistance testing", ""],
  ["Logged meter readings for twelve commercial customers and flagged two meters that had stopped recording.", "", "One site refused us entry without a letter."],
  ["Earth resistance tests at a new substation. Two earth pits read above the limit and need treating.", "Earth resistance testing", ""],
  ["Office day: updated the fault log and marked the week's outages on the feeder map.", "", ""],
  ["Watched a transformer oil sample being taken for a dielectric strength test.", "Oil sampling procedure", ""],
  ["Helped install a prepaid meter at a residential estate and checked polarity before switching on.", "Meter installation", ""],
  ["Visited a factory with frequent trips. Measured load on each phase and found it badly unbalanced.", "Using a clamp meter", ""],
  ["Wrote up the load balancing recommendation for the factory with my supervisor.", "Technical report writing", ""],
  ["Replaced a corroded jumper on a pole-mounted transformer under supervision.", "", "Climbing gear was short; waited for another set."],
  ["Inventory check of the depot store: fuses, lugs and cable lengths against the store ledger.", "", ""],
  ["Treated the two high-reading earth pits with the crew and retested; both now read within the limit.", "", ""],
  ["Shadowed the control room operator for a shift and logged each feeder trip with its time and cause.", "Reading the SCADA alarm list", "Several trips had no cause recorded."],
  ["Thermal camera survey of a distribution substation. Found one hot joint on a busbar clamp.", "Thermal imaging", ""],
  ["Helped tighten and re-torque the hot busbar clamp after isolation, then rescanned it.", "Torque settings for bolted joints", ""],
  ["Drew the as-built diagram for the new estate's distribution network from the site notes.", "Drawing in AutoCAD Electrical", "The site notes and the plan disagreed on two cable routes."],
  ["Toolbox talk on working near energised lines, then a practical on testing for dead.", "Proving dead with a voltage detector", ""],
];

const AUDIT = [
  ["Met the audit team and was walked through the firm's working paper files.", "", ""],
  ["Vouched 40 purchase invoices against payment vouchers for a manufacturing client.", "Vouching", "Three invoices were missing approval signatures."],
  ["Prepared the September bank reconciliation for a client's operating account. Two cheques were still unpresented.", "Bank reconciliation", ""],
  ["Learnt the firm's sampling approach for testing expenses.", "Audit sampling", ""],
  ["Inventory count at a client's warehouse in Apapa with the senior. Recorded differences on six items.", "Stock count procedures", "Some bins had no labels."],
  ["Posted adjusting journals for accrued expenses in Sage under supervision.", "Journals in Sage", ""],
  ["Drafted the fixed asset schedule and checked depreciation rates against the client's policy.", "Fixed asset schedules", ""],
  ["Reviewed three months of VAT returns and matched output VAT to the sales ledger.", "VAT reconciliation", ""],
  ["Prepared confirmation letters for the client's ten largest debtors.", "", ""],
  ["Payroll test for August: matched the staff list to HR records and recalculated PAYE for a sample of eight.", "PAYE computation", ""],
  ["Filed the week's working papers and updated the audit checklist.", "", ""],
  ["Took minutes at the client's exit meeting.", "Minute taking", ""],
  ["Started a new engagement: read last year's audit file and the client's trial balance.", "", ""],
  ["Tested cut-off on sales invoices either side of the year end.", "Cut-off testing", "Two invoices were dated after delivery."],
  ["Recalculated the client's withholding tax deductions for a sample of suppliers.", "Withholding tax", ""],
  ["Agreed the loan balances to the bank's confirmation letters.", "", "One bank had not replied yet."],
  ["Drafted the management letter points on purchase approvals with the senior.", "Writing audit findings", ""],
  ["Reviewed the petty cash book and counted the cash box with the client's cashier.", "Cash counts", ""],
];

const COMMENTS = ["Good.", "Clear entry, thank you.", "Keep these notes for your report.", "Well done.", ""];
const SIGNOFF_COMMENTS = [
  "Steady week. Punctual every day.",
  "Good progress. Ask more questions in stand-up.",
  "Solid work on the tickets this week.",
  "Satisfactory.",
  "Reliable on site and careful with the safety steps.",
];

// ---- People -----------------------------------------------------------------

const SCHOOLS = {
  lcu: { name: "Lagoon City University", address: "Km 4, Lagoon Road, Lekki, Lagos" },
  ngp: { name: "Northgate Polytechnic", address: "Old Airport Road, Kaduna" },
  hsu: { name: "Harmattan State University", address: "University Way, Bauchi" },
};

const SUPERVISORS = {
  ngozi: { name: "Ngozi Okafor", email: "ngozi.okafor@brightwave.example", phone: "0800 000 0417", org: "Brightwave Systems", position: "Engineering Manager" },
  emeka: { name: "Emeka Nwosu", email: "emeka.nwosu@tranzline.example", phone: "0800 000 0934", org: "Tranzline Power Services", position: "Senior Protection Engineer" },
  folake: { name: "Folake Bamidele", email: "folake.bamidele@marlowedaramola.example", phone: "0800 000 0266", org: "Marlowe & Daramola, Chartered Accountants", position: "Audit Manager" },
};

// start: weeks before this week that the internship started (0 = this Monday)
// gaps: working-day indexes with no entry; lastLogged: working days ago of the last entry (null = up to yesterday)
// loggedToday: also has an entry for today
// approvedBefore: weeks before this one are reviewed; later weeks still pending
// signedThrough: weeks 1..n signed off; returned: working-day indexes that were rejected
const STUDENTS = [
  { key: "tolu", name: "Tolu Adeyemi", school: "lcu", matric: "LCU/CSC/22/0147", dept: "Computer Science", level: 300, sup: "ngozi", work: ["Brightwave Systems", "14 Admiralty Way, Lekki Phase 1", "Lekki, Lagos"], bank: SOFTWARE, start: 9, approvedBefore: 10, signedThrough: 8, gaps: [13], returned: [16] },
  { key: "kelechi", name: "Kelechi Obi", school: "lcu", matric: "LCU/CSC/22/0093", dept: "Computer Science", level: 300, sup: "ngozi", work: ["Brightwave Systems", "14 Admiralty Way, Lekki Phase 1", "Lekki, Lagos"], bank: SOFTWARE, offset: 6, start: 9, approvedBefore: 9, signedThrough: 8, gaps: [4, 22] },
  { key: "aisha", name: "Aisha Bello", school: "lcu", matric: "LCU/SEN/22/0211", dept: "Software Engineering", level: 300, sup: "ngozi", work: ["Brightwave Systems", "14 Admiralty Way, Lekki Phase 1", "Lekki, Lagos"], bank: SOFTWARE, offset: 12, start: 8, approvedBefore: 9, signedThrough: 7, loggedToday: true },
  { key: "ibrahim", name: "Ibrahim Musa", school: "lcu", matric: "LCU/EEE/21/0388", dept: "Electrical/Electronic Engineering", level: 400, sup: "emeka", work: ["Tranzline Power Services", "Plot 9, Oba Akran Avenue", "Ikeja, Lagos"], bank: POWER, start: 9, approvedBefore: 6, signedThrough: 4, lastLogged: 6, gaps: [9] },
  { key: "seun", name: "Seun Ogunleye", school: "lcu", matric: "LCU/EEE/21/0402", dept: "Electrical/Electronic Engineering", level: 400, sup: "emeka", work: ["Tranzline Power Services", "Plot 9, Oba Akran Avenue", "Ikeja, Lagos"], bank: POWER, offset: 5, start: 9, approvedBefore: 6, signedThrough: 5, lastLogged: 4 },
  { key: "chiamaka", name: "Chiamaka Eze", school: "lcu", matric: "LCU/ACC/22/0156", dept: "Accounting", level: 300, sup: "folake", work: ["Marlowe & Daramola", "22 Broad Street", "Lagos Island, Lagos"], bank: AUDIT, start: 9, approvedBefore: 10, signedThrough: 9 },
  { key: "halima", name: "Halima Yusuf", school: "lcu", matric: "LCU/ACC/22/0174", dept: "Accounting", level: 300, sup: "folake", work: ["Marlowe & Daramola", "22 Broad Street", "Lagos Island, Lagos"], bank: AUDIT, offset: 4, start: 7, approvedBefore: 8, signedThrough: 7, gaps: [11] },
  { key: "bayo", name: "Bayo Akande", school: "lcu", matric: "LCU/MEE/21/0310", dept: "Mechanical Engineering", level: 400, notSetUp: true },
  // Other institutions, for the ITF view.
  { key: "musa", name: "Musa Garba", school: "ngp", matric: "NGP/EEE/HND/23/031", dept: "Electrical Engineering", level: 200, sup: "emeka", work: ["Tranzline Power Services", "Plot 9, Oba Akran Avenue", "Ikeja, Lagos"], bank: POWER, offset: 2, start: 6, approvedBefore: 5, signedThrough: 4 },
  { key: "zainab", name: "Zainab Lawal", school: "ngp", matric: "NGP/CSC/HND/23/014", dept: "Computer Science", level: 200, sup: "ngozi", work: ["Brightwave Systems", "14 Admiralty Way, Lekki Phase 1", "Lekki, Lagos"], bank: SOFTWARE, offset: 18, start: 6, approvedBefore: 7, signedThrough: 6 },
  { key: "yakubu", name: "Yakubu Danladi", school: "ngp", matric: "NGP/MEE/HND/23/022", dept: "Mechanical Engineering", level: 200, notSetUp: true },
  { key: "efe", name: "Efe Okoro", school: "hsu", matric: "HSU/ACC/21/1102", dept: "Accounting", level: 400, sup: "folake", work: ["Marlowe & Daramola", "22 Broad Street", "Lagos Island, Lagos"], bank: AUDIT, offset: 7, start: 9, approvedBefore: 8, signedThrough: 7, lastLogged: 5 },
  { key: "amina", name: "Amina Sani", school: "hsu", matric: "HSU/ACC/21/1087", dept: "Accounting", level: 400, sup: "folake", work: ["Marlowe & Daramola", "22 Broad Street", "Lagos Island, Lagos"], bank: AUDIT, offset: 3, start: 9, approvedBefore: 10, signedThrough: 9 },
];

const ADMINS = [
  { name: "Adaeze Nnamdi", email: "siwes.office@lcu.example", phone: "0800 000 0018", school: "lcu" },
  { name: "Sadiq Abdullahi", email: "siwes.office@northgate.example", phone: "0800 000 2093", school: "ngp" },
];
const ITF = { name: "Kabir Danjuma", email: "k.danjuma@itf.example", phone: "0800 000 1724", region: "Lagos Area Office" };

const emailFor = (name, school) => `${name.toLowerCase().replace(/ /g, ".")}@students.${school}.example`;

async function main() {
  const conn = await mysql.createConnection(dbConfig);
  await conn.query(`DROP DATABASE IF EXISTS \`${DEMO_DB}\``);
  await conn.query(`CREATE DATABASE \`${DEMO_DB}\``);
  await conn.query(`USE \`${DEMO_DB}\``);
  for (const file of ["siwes360_migration.sql", "002_password_resets.sql", "003_weekly_signoffs.sql"]) {
    for (const stmt of sqlStatements(file)) await conn.query(stmt);
  }

  const hash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const addUser = async (name, email, phone, role) => {
    const [r] = await conn.query(
      "INSERT INTO users (email, password, full_name, phone, role) VALUES (?, ?, ?, ?, ?)",
      [email, hash, name, phone, role]
    );
    return r.insertId;
  };
  const notify = (userId, message, type, daysAgo, read = true) =>
    conn.query(
      "INSERT INTO notifications (user_id, message, type, is_read, created_at) VALUES (?, ?, ?, ?, DATE_SUB(NOW(), INTERVAL ? HOUR))",
      [userId, message, type, read, Math.round(daysAgo * 24)]
    );

  const schoolIds = {};
  for (const [key, s] of Object.entries(SCHOOLS)) {
    const [r] = await conn.query("INSERT INTO schools (name, address) VALUES (?, ?)", [s.name, s.address]);
    schoolIds[key] = r.insertId;
  }
  for (const a of ADMINS) {
    const id = await addUser(a.name, a.email, a.phone, "admin");
    await conn.query("INSERT INTO admins (user_id, school_id) VALUES (?, ?)", [id, schoolIds[a.school]]);
  }
  const itfId = await addUser(ITF.name, ITF.email, ITF.phone, "itf");
  await conn.query("INSERT INTO itf (user_id, region) VALUES (?, ?)", [itfId, ITF.region]);

  const supIds = {};
  for (const [key, s] of Object.entries(SUPERVISORS)) {
    supIds[key] = await addUser(s.name, s.email, s.phone, "supervisor");
    await conn.query("INSERT INTO supervisors (user_id, organization, position) VALUES (?, ?, ?)", [
      supIds[key],
      s.org,
      s.position,
    ]);
  }

  const today = weeks.today();
  const thisMonday = weeks.weekRange(today, 1).week_start;
  const fmtDay = (d) =>
    new Date(weeks.toTime(d)).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

  for (const s of STUDENTS) {
    const id = await addUser(s.name, emailFor(s.name, s.school), `0800 000 1${String(100 + STUDENTS.indexOf(s)).slice(-3)}`, "student");
    if (s.notSetUp) {
      await conn.query(
        "INSERT INTO students (user_id, matric_no, department, level, school_id, is_first_login) VALUES (?, ?, ?, ?, ?, 1)",
        [id, s.matric, s.dept, s.level, schoolIds[s.school]]
      );
      continue;
    }

    const sup = SUPERVISORS[s.sup];
    const start = weeks.addDays(thisMonday, -7 * s.start);
    const end = weeks.addDays(start, 24 * 7 - 3); // 24 weeks, ending on a Friday
    await conn.query(
      `INSERT INTO students (user_id, matric_no, department, level, supervisor_id, school_id,
         internship_start_date, internship_end_date, is_first_login,
         workplace_name, workplace_address, workplace_location, supervisor_name, supervisor_phone, supervisor_email)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?)`,
      [id, s.matric, s.dept, s.level, supIds[s.sup], schoolIds[s.school], start, end, ...s.work, sup.name, sup.phone, sup.email]
    );

    // Working days from the start up to yesterday (or today).
    const lastDay = s.loggedToday ? today : weeks.addDays(today, -1);
    const days = [];
    for (let d = start; d <= lastDay; d = weeks.addDays(d, 1)) {
      if (weeks.workingDaysBetween(d, d) === 1) days.push(d);
    }
    const cutoff = s.lastLogged ? days.length - s.lastLogged : days.length;
    const signedWeeks = new Set();
    let written = 0;
    for (let i = 0; i < cutoff; i += 1) {
      if ((s.gaps || []).includes(i)) continue;
      const day = days[i];
      const week = weeks.weekNumber(start, day);
      // The induction is always the first day; after that the bank cycles without it.
      const [activities, skills, challenges] =
        i === 0 ? s.bank[0] : s.bank[1 + ((i - 1 + (s.offset || 0)) % (s.bank.length - 1))];
      let status = week < s.approvedBefore ? "approved" : "pending";
      let comment = status === "approved" ? COMMENTS[i % COMMENTS.length] || null : null;
      if ((s.returned || []).includes(i)) {
        status = "rejected";
        comment = "Say what you changed and why, not only which ticket. Edit and resubmit.";
      }
      await conn.query(
        `INSERT INTO daily_logs (student_id, log_date, description, skills_acquired, challenges_faced, supervisor_comment, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, day, activities, skills || null, challenges || null, comment, status, `${day} 17:${String(10 + (i % 40)).padStart(2, "0")}:00`]
      );
      written += 1;
      if (week <= s.signedThrough) signedWeeks.add(week);
    }

    for (const week of [...signedWeeks].sort((a, b) => a - b)) {
      const { week_start, week_end } = weeks.weekRange(start, week);
      await conn.query(
        `INSERT INTO weekly_signoffs (student_id, supervisor_id, supervisor_name, week_number, week_start, week_end, comment, signed_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, supIds[s.sup], sup.name, week, week_start, week_end, SIGNOFF_COMMENTS[week % SIGNOFF_COMMENTS.length], `${weeks.addDays(week_start, 4)} 16:30:00`]
      );
    }

    if (s.key === "tolu") {
      const lastSigned = weeks.weekRange(start, s.signedThrough);
      await notify(id, `${sup.name} signed off week ${s.signedThrough} of your logbook with a comment`, "signoff", 5);
      await notify(id, `Your log entry for ${fmtDay(days[16])} was returned. Please review the feedback and resubmit.`, "rejection", 30);
      await notify(id, `Your log entry for ${fmtDay(weeks.addDays(lastSigned.week_start, 3))} has been approved`, "approval", 6, false);
    }
    const recent = days.slice(Math.max(0, cutoff - 2), cutoff);
    for (const day of recent) {
      await notify(supIds[s.sup], `${s.name} (${s.matric}) submitted a new log entry for ${fmtDay(day)}`, "logbook", 1, false);
    }
    console.log(`${s.name.padEnd(16)} ${String(written).padStart(3)} entries, ${signedWeeks.size} weeks signed`);
  }

  await conn.end();
  console.log(`\nSeeded ${DEMO_DB}. Serve it with: DB_NAME=${DEMO_DB} npm start`);
  console.log("Accounts (password in database/seed_demo.js):");
  console.log(`  admin       ${ADMINS[0].email}`);
  console.log(`  itf         ${ITF.email}`);
  console.log(`  supervisor  ${SUPERVISORS.ngozi.email}`);
  console.log(`  student     ${emailFor("Tolu Adeyemi", "lcu")}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
