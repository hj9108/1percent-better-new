const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December'
];

const MONTHS_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec'
];

const DAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday'
];

const DAYS_SHORT = [
  'Sun',
  'Mon',
  'Tue',
  'Wed',
  'Thu',
  'Fri',
  'Sat'
];

export const format = (date, pattern) => {
  if (!date) return '';
  var d = new Date(date);
  if (isNaN(d.getTime())) return '';

  var year = d.getFullYear();
  var month = d.getMonth();
  var dayOfMonth = d.getDate();
  var hours = d.getHours();
  var minutes = d.getMinutes();
  var dayOfWeek = d.getDay();

  var h12 = hours % 12 || 12;
  var ampm = hours >= 12 ? 'pm' : 'am';
  var pad = function (n) {
    return String(n).padStart(2, '0');
  };

  var result = pattern;
  var replacements = [];

  var addReplacement = function (token, value) {
    var index = result.indexOf(token);
    if (index !== -1) {
      var placeholder = '~' + replacements.length + '~';
      replacements.push(value);
      result = result.replace(token, placeholder);
    }
  };

  addReplacement('yyyy', String(year));
  addReplacement('EEEE', DAYS[dayOfWeek]);
  addReplacement('EEE', DAYS_SHORT[dayOfWeek]);
  addReplacement('MMMM', MONTHS[month]);
  addReplacement('MMM', MONTHS_SHORT[month]);
  addReplacement('MM', pad(month + 1));
  addReplacement('dd', pad(dayOfMonth));
  addReplacement('HH', pad(hours));
  addReplacement('hh', pad(h12));
  addReplacement('mm', pad(minutes));
  addReplacement('d', String(dayOfMonth));
  addReplacement('h', String(h12));
  addReplacement('a', ampm);

  for (var i = 0; i < replacements.length; i++) {
    result = result.replace('~' + i + '~', replacements[i]);
  }

  return result;
};

export var subDays = function (date, days) {
  var d = new Date(date);
  d.setDate(d.getDate() - days);
  return d;
};

export var addDays = function (date, days) {
  var d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
};

export var subMonths = function (date, months) {
  var d = new Date(date);
  d.setMonth(d.getMonth() - months);
  return d;
};

export var addMonths = function (date, months) {
  var d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
};

export var startOfMonth = function (date) {
  var d = new Date(date);
  return new Date(d.getFullYear(), d.getMonth(), 1);
};

export var endOfMonth = function (date) {
  var d = new Date(date);
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
};

export var startOfWeek = function (date) {
  var d = new Date(date);
  var day = d.getDay();
  var diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
};

export var endOfWeek = function (date) {
  var s = startOfWeek(date);
  return addDays(s, 6);
};

export var eachDayOfInterval = function (interval) {
  var days = [];
  var current = new Date(interval.start);
  var endDate = new Date(interval.end);
  while (current <= endDate) {
    days.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  return days;
};

export var getDay = function (date) {
  return new Date(date).getDay();
};

export var isSameDay = function (a, b) {
  var da = new Date(a);
  var db = new Date(b);
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
};

export var differenceInDays = function (a, b) {
  var da = new Date(a);
  var db = new Date(b);
  return Math.round((da - db) / (1000 * 60 * 60 * 24));
};

export var isPast = function (date) {
  return new Date(date) < new Date();
};

export var isWithinInterval = function (date, interval) {
  var d = new Date(date);
  return d >= new Date(interval.start) && d <= new Date(interval.end);
};

export var subWeeks = function (date, weeks) {
  return subDays(date, weeks * 7);
};