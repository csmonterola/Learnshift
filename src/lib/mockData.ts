export const MOCK_STUDENTS = [
  {
    id: 's1',
    name: 'Emma Thompson',
    grade: '8th',
    section: 'A',
    mastery: 92,
    lastActive: '2 hours ago',
    status: 'Excelling',
    avatar: 'https://i.pravatar.cc/150?u=emma',
    subjects: [
      { name: 'Algebra I', mastery: 95, target: 90 },
      { name: 'Biology', mastery: 88, target: 85 },
      { name: 'World History', mastery: 94, target: 85 },
    ],
    recentActivity: [
      {
        id: 1,
        type: 'practice',
        title: 'Linear Equations',
        score: '100%',
        date: 'Today, 10:30 AM',
      },
      {
        id: 2,
        type: 'ai_chat',
        title: 'Asked about Photosynthesis',
        date: 'Yesterday, 4:15 PM',
      },
    ],
  },
  {
    id: 's2',
    name: 'Liam Garcia',
    grade: '8th',
    section: 'A',
    mastery: 78,
    lastActive: '1 day ago',
    status: 'On Track',
    avatar: 'https://i.pravatar.cc/150?u=liam',
    subjects: [
      { name: 'Algebra I', mastery: 82, target: 90 },
      { name: 'Biology', mastery: 75, target: 85 },
      { name: 'World History', mastery: 78, target: 85 },
    ],
    recentActivity: [
      {
        id: 1,
        type: 'practice',
        title: 'Cell Structure',
        score: '80%',
        date: 'Yesterday, 2:00 PM',
      },
    ],
  },
  {
    id: 's3',
    name: 'Noah Patel',
    grade: '8th',
    section: 'B',
    mastery: 65,
    lastActive: '3 days ago',
    status: 'At Risk',
    avatar: 'https://i.pravatar.cc/150?u=noah',
    subjects: [
      { name: 'Algebra I', mastery: 60, target: 90 },
      { name: 'Biology', mastery: 68, target: 85 },
      { name: 'World History', mastery: 67, target: 85 },
    ],
    recentActivity: [
      {
        id: 1,
        type: 'practice',
        title: 'Fractions',
        score: '60%',
        date: '3 days ago',
      },
    ],
  },
]

export const MOCK_TOPIC_MASTERY = [
  { topic: 'Linear Eq', mastery: 85 },
  { topic: 'Quadratics', mastery: 72 },
  { topic: 'Cell Bio', mastery: 90 },
  { topic: 'Genetics', mastery: 65 },
  { topic: 'WWII', mastery: 88 },
  { topic: 'Cold War', mastery: 75 },
]

export const MOCK_CHAT_LOGS = [
  {
    id: 'c1',
    student: 'Noah Patel',
    subject: 'Algebra I',
    question:
      "I don't understand how to solve for x here: 2x + 5 = 15. Can you just give me the answer?",
    response:
      "I can help you work through it, but I won't just give you the answer. Let's start by trying to isolate x. What happens if we subtract 5 from both sides?",
    timestamp: '10:45 AM',
    status: 'Flagged',
  },
  {
    id: 'c2',
    student: 'Emma Thompson',
    subject: 'Biology',
    question: 'What is the powerhouse of the cell?',
    response:
      "The mitochondria is often referred to as the powerhouse of the cell because it generates most of the cell's supply of adenosine triphosphate (ATP), used as a source of chemical energy.",
    timestamp: '09:12 AM',
    status: 'OK',
  },
  {
    id: 'c3',
    student: 'Liam Garcia',
    subject: 'World History',
    question: 'Who was the president during the Civil War?',
    response:
      'Abraham Lincoln was the 16th president of the United States, serving from 1861 until his assassination in 1865, which was during the American Civil War.',
    timestamp: 'Yesterday',
    status: 'Reviewed',
  },
]

export const MOCK_FILES = [
  {
    id: 'f1',
    name: 'Algebra_Syllabus_Fall.pdf',
    type: 'PDF',
    size: '2.4 MB',
    date: 'Aug 15, 2023',
    sync: true,
  },
  {
    id: 'f2',
    name: 'Biology_Chapter_4_Notes.docx',
    type: 'DOCX',
    size: '1.1 MB',
    date: 'Sep 02, 2023',
    sync: true,
  },
  {
    id: 'f3',
    name: 'History_Midterm_Review.pptx',
    type: 'PPTX',
    size: '5.6 MB',
    date: 'Oct 10, 2023',
    sync: false,
  },
]

export const MOCK_CHILDREN = [
  {
    id: 'c1',
    name: 'Emma',
    grade: '8th Grade',
    avatar: 'https://i.pravatar.cc/150?u=emma',
  },
  {
    id: 'c2',
    name: 'Lucas',
    grade: '5th Grade',
    avatar: 'https://i.pravatar.cc/150?u=lucas',
  },
]

export const MOCK_CURRICULUM = {
  Q1: [
    {
      id: 't1',
      title: 'Introduction to Algebra',
      status: 'Completed',
      lessons: 5,
    },
    { id: 't2', title: 'Linear Equations', status: 'Completed', lessons: 8 },
    { id: 't3', title: 'Inequalities', status: 'In Progress', lessons: 6 },
  ],
  Q2: [
    { id: 't4', title: 'Functions', status: 'Upcoming', lessons: 7 },
    { id: 't5', title: 'Systems of Equations', status: 'Upcoming', lessons: 9 },
  ],
}
