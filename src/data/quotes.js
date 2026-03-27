const motivationalQuotes = [
  {
    text: "The secret of getting ahead is getting started.",
    author: "Mark Twain",
  },
  {
    text: "It is never too late to be what you might have been.",
    author: "George Eliot",
  },
  {
    text: "Small daily improvements over time lead to stunning results.",
    author: "Robin Sharma",
  },
  {
    text: "You don't have to be great to start, but you have to start to be great.",
    author: "Zig Ziglar",
  },
  {
    text: "The only way to do great work is to love what you do.",
    author: "Steve Jobs",
  },
  {
    text: "Believe you can and you're halfway there.",
    author: "Theodore Roosevelt",
  },
  {
    text: "What we plant in the soil of contemplation, we shall reap in the harvest of action.",
    author: "Meister Eckhart",
  },
  {
    text: "A journey of a thousand miles begins with a single step.",
    author: "Lao Tzu",
  },
  {
    text: "The best time to plant a tree was 20 years ago. The second best time is now.",
    author: "Chinese Proverb",
  },
  {
    text: "Don't watch the clock; do what it does. Keep going.",
    author: "Sam Levenson",
  },
  {
    text: "Growth is the only evidence of life.",
    author: "John Henry Newman",
  },
  {
    text: "Be not afraid of growing slowly, be afraid only of standing still.",
    author: "Chinese Proverb",
  },
  {
    text: "Every moment is a fresh beginning.",
    author: "T.S. Eliot",
  },
  {
    text: "What you do today can improve all your tomorrows.",
    author: "Ralph Marston",
  },
  {
    text: "The only impossible journey is the one you never begin.",
    author: "Tony Robbins",
  },
  {
    text: "Act as if what you do makes a difference. It does.",
    author: "William James",
  },
  {
    text: "With the new day comes new strength and new thoughts.",
    author: "Eleanor Roosevelt",
  },
  {
    text: "You are never too old to set another goal or to dream a new dream.",
    author: "C.S. Lewis",
  },
  {
    text: "Happiness is not something ready made. It comes from your own actions.",
    author: "Dalai Lama",
  },
  {
    text: "We are what we repeatedly do. Excellence, then, is not an act, but a habit.",
    author: "Aristotle",
  },
  {
    text: "The man who moves a mountain begins by carrying away small stones.",
    author: "Confucius",
  },
  {
    text: "Start where you are. Use what you have. Do what you can.",
    author: "Arthur Ashe",
  },
  {
    text: "Success is the sum of small efforts repeated day in and day out.",
    author: "Robert Collier",
  },
  {
    text: "Plant seeds of happiness, hope, success, and love; it will all come back to you in abundance.",
    author: "Steve Maraboli",
  },
  {
    text: "The greatest glory in living lies not in never falling, but in rising every time we fall.",
    author: "Nelson Mandela",
  },
  {
    text: "In the middle of every difficulty lies opportunity.",
    author: "Albert Einstein",
  },
  {
    text: "Bloom where you are planted.",
    author: "Saint Francis de Sales",
  },
  {
    text: "Your life does not get better by chance, it gets better by change.",
    author: "Jim Rohn",
  },
  {
    text: "Progress, not perfection, is what we should be asking of ourselves.",
    author: "Julia Cameron",
  },
  {
    text: "One percent better every day. That's all it takes.",
    author: "James Clear",
  },
  {
    text: "The only person you are destined to become is the person you decide to be.",
    author: "Ralph Waldo Emerson",
  },
  {
    text: "Do something today that your future self will thank you for.",
    author: "Sean Patrick Flanery",
  },
  {
    text: "It always seems impossible until it's done.",
    author: "Nelson Mandela",
  },
  {
    text: "You don't need to see the whole staircase, just take the first step.",
    author: "Martin Luther King Jr.",
  },
  {
    text: "Discipline is choosing between what you want now and what you want most.",
    author: "Abraham Lincoln",
  },
  {
    text: "Water the flowers, not the weeds.",
    author: "Fletcher Peacock",
  },
  {
    text: "Be patient with yourself. Self-growth is tender; it's holy ground.",
    author: "Stephen Covey",
  },
  {
    text: "Strive not to be a success, but rather to be of value.",
    author: "Albert Einstein",
  },
  {
    text: "The mind is everything. What you think you become.",
    author: "Buddha",
  },
  {
    text: "Don't count the days, make the days count.",
    author: "Muhammad Ali",
  },
  {
    text: "If you want to lift yourself up, lift up someone else.",
    author: "Booker T. Washington",
  },
  {
    text: "Doubt kills more dreams than failure ever will.",
    author: "Suzy Kassem",
  },
  {
    text: "Grow through what you go through.",
    author: "Tyrese Gibson",
  },
  {
    text: "Dream big and dare to fail.",
    author: "Norman Vaughan",
  },
  {
    text: "A flower does not think of competing with the flower next to it. It just blooms.",
    author: "Zen Shin",
  },
  {
    text: "The comeback is always stronger than the setback.",
    author: "Anonymous",
  },
  {
    text: "Almost everything will work again if you unplug it for a few minutes, including you.",
    author: "Anne Lamott",
  },
  {
    text: "Push yourself, because no one else is going to do it for you.",
    author: "Anonymous",
  },
  {
    text: "Fall seven times, stand up eight.",
    author: "Japanese Proverb",
  },
  {
    text: "Consistency is what transforms average into excellence.",
    author: "Anonymous",
  },
  {
    text: "Life isn't about finding yourself. Life is about creating yourself.",
    author: "George Bernard Shaw",
  },
  {
    text: "The pain you feel today will be the strength you feel tomorrow.",
    author: "Anonymous",
  },
  {
    text: "Inhale confidence, exhale doubt.",
    author: "Anonymous",
  },
  {
    text: "What lies behind us and what lies before us are tiny matters compared to what lies within us.",
    author: "Ralph Waldo Emerson",
  },
  {
    text: "Your limitation—it's only your imagination.",
    author: "Anonymous",
  },
  {
    text: "Great things never come from comfort zones.",
    author: "Anonymous",
  },
  {
    text: "Difficult roads often lead to beautiful destinations.",
    author: "Zig Ziglar",
  },
  {
    text: "Be yourself; everyone else is already taken.",
    author: "Oscar Wilde",
  },
  {
    text: "Turn your wounds into wisdom.",
    author: "Oprah Winfrey",
  },
  {
    text: "Not all those who wander are lost.",
    author: "J.R.R. Tolkien",
  },
];

export const getQuoteOfTheDay = () => {
  const today = new Date();
  const startOfYear = new Date(today.getFullYear(), 0, 0);
  const diff = today - startOfYear;
  const oneDay = 1000 * 60 * 60 * 24;
  const dayOfYear = Math.floor(diff / oneDay);

  const index = dayOfYear % motivationalQuotes.length;
  return motivationalQuotes[index];
};

export const getRandomQuote = () => {
  const index = Math.floor(Math.random() * motivationalQuotes.length);
  return motivationalQuotes[index];
};

export default motivationalQuotes;