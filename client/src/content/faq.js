import { CANONICAL_DEFINITION, DISCLOSURE_SENTENCE, OFFICIAL_COLLEGE_URL } from "../seo/identity.js";

export const FAQ_ITEMS = [
  {
    id: "what-is-dssconfessions",
    question: "What is DSSC Confessions?",
    answer: CANONICAL_DEFINITION,
    extra:
      "Unlike traditional social media confession pages that rely on Google Forms or Facebook posts, DSSC Confessions integrates directly with Spotify to attach music to your words, generates one-time author deletion keys, and maintains strict zero-IP logging.",
  },
  {
    id: "is-dssc-confessions-official",
    question: "Is DSSC Confessions the official DSSC website or student portal?",
    answer:
      "No. DSSC Confessions is an independent, student-made creative website. It is not the official website, student portal, or grading system of Davao del Sur State College. For official enrollment and records, visit the official college site.",
    extra: `If you are looking for the official college administration, please visit ${OFFICIAL_COLLEGE_URL}.`,
  },
  {
    id: "is-dssc-affiliated",
    question: "Is DSSC Confessions affiliated with Davao del Sur State College?",
    answer:
      "No. DSSC Confessions is not affiliated with, sponsored by, or endorsed by Davao del Sur State College. The college name is used purely descriptively to identify the student and campus community we serve.",
    extra: DISCLOSURE_SENTENCE,
  },
  {
    id: "where-to-find-official-dssc",
    question: "Where can I find the official DSSC website or student portal?",
    answer:
      "The official website of Davao del Sur State College is at https://www.dssc.edu.ph/. For student and employee portal services (enrollment, grades, records), access the official DSSC Portal directly at https://portal.dssc.edu.ph/.",
  },
  {
    id: "who-can-send-confession",
    question: "Who can send a confession?",
    answer:
      "Anyone in the Davao del Sur State College community—students, alumni, faculty, and friends across Digos City and Davao del Sur—can send an anonymous confession. No account, student ID, or login is required.",
  },
  {
    id: "is-it-anonymous",
    question: "Is DSSC Confessions safe and anonymous?",
    answer:
      "Yes. We require no accounts, email addresses, or phone numbers. We never log raw IP addresses or device fingerprints. Abuse-prevention safeguards operate without storing or logging your personal identity.",
    extra:
      "When you post, we only store the recipient name, optional sender pseudonym, message text, and verified Spotify track details. No identifiers tying the post to your network or identity exist.",
  },
  {
    id: "how-to-report-confession",
    question: "How do I report or remove a confession about me?",
    answer:
      "Click the flag icon on any confession card and choose 'This is about me and I want it removed' or another reason. Confessions receiving verified urgent reports are hidden automatically from public view.",
  },
  {
    id: "how-to-delete-confession",
    question: "How do I delete a confession I posted?",
    answer:
      "When you submit a confession, you receive a private one-time Delete Key. Enter this key on your confession card at any time to permanently remove it from our database.",
    extra:
      "Please keep your Delete Key safe. Because we do not store emails or accounts, a lost Delete Key cannot be recovered automatically.",
  },
  {
    id: "who-made-dssconfessions",
    question: "Who runs DSSC Confessions?",
    answer:
      "DSSC Confessions was built by Joshua as an independent community project to give the Davao del Sur State College student community a warm, creative, music-driven space for unspoken thoughts.",
  },
  {
    id: "what-are-pokes",
    question: "What are Pokes on confessions?",
    answer:
      "A Poke is a lightweight, friendly tap on a confession. Tapping Poke increments the counter to let the author know someone read their story, with zero user tracking.",
  },
  {
    id: "how-to-send-a-confession",
    question: "How do I send a confession with a song?",
    answer:
      "Go to the Confess page, enter the recipient's name, type your message, search for your chosen song on Spotify, and tap Post Confession. You will immediately receive a private one-time Delete Key that lets you delete the confession whenever you want.",
    steps: [
      "Open the Confess page from the navigation bar.",
      "Enter the recipient's name (e.g., their first name or nickname).",
      "Write your message (up to 3,000 characters).",
      "Search Spotify for the song that captures your feelings and select it.",
      "Review the Live Preview and tap Post Confession.",
      "Save your private Delete Key safely.",
    ],
  },
  {
    id: "how-to-find-confessions",
    question: "How do I find confessions written for my name?",
    answer:
      "Visit the Browse page and type your name, nickname, or initials into the search bar. DSSC Confessions will find all public confessions dedicated to that recipient, with matching songs and timestamps.",
  },
  {
    id: "how-many-song-replies",
    question: "How many song replies can a confession receive?",
    answer:
      "Each confession can receive up to 500 anonymous song replies on its mixtape. The author can turn off replies when posting, or use their private Delete Key to remove individual replies and free up spots.",
  },
];

