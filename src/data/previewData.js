export const salonPreview = {
  name: 'Atelier Salon',
  address: '14 Crescent Road, Ahmedabad',
  opening: '10:00 AM – 8:00 PM',
  closing: '8:00 PM',
  onlineClosing: '7:30 PM',
  days: 'Tuesday – Sunday',
  onlineOpen: true,
  sampleWaitAheadMinutes: 55,
};

export const servicesPreview = [
  { id: 'signature-cut', name: 'Signature haircut', description: 'A tailored cut with a considered finish.', duration: 40, price: 500, category: 'Hair' },
  { id: 'beard-sculpt', name: 'Beard sculpt', description: 'Shape, detail and a clean finish.', duration: 25, price: 300, category: 'Grooming' },
  { id: 'wash-style', name: 'Hair wash & style', description: 'A reset, then styled your way.', duration: 20, price: 250, category: 'Hair' },
  { id: 'classic-shave', name: 'Classic shave', description: 'A close shave and warm towel finish.', duration: 30, price: 350, category: 'Grooming' },
];

export const barbersPreview = [
  { id: 'amit', name: 'Amit Shah', specialty: 'Precision cuts', status: 'Busy', tone: 'blue', initials: 'AS', onDuty: true, currentToken: 'S-13' },
  { id: 'ravi', name: 'Ravi Patel', specialty: 'Style & finish', status: 'Busy', tone: 'blue', initials: 'RP', onDuty: true, currentToken: 'S-12' },
  { id: 'neel', name: 'Neel Mehta', specialty: 'Classic grooming', status: 'Available', tone: 'green', initials: 'NM', onDuty: true, currentToken: null },
  { id: 'dev', name: 'Dev Mehta', specialty: 'Classic grooming', status: 'On break', tone: 'muted', initials: 'DM', onDuty: true, currentToken: null },
];

export const queuePreview = [
  { id: 'demo-14', token: 'S-14', name: 'Aarav Joshi', services: ['Signature haircut'], preference: 'Any barber', assignedBarber: null, status: 'Waiting', waitingMinutes: 18, estimate: 0, source: 'Online' },
  { id: 'demo-15', token: 'S-15', name: 'Maya Shah', services: ['Beard sculpt', 'Classic shave'], preference: 'Amit Shah', assignedBarber: null, status: 'Waiting', waitingMinutes: 11, estimate: 14, source: 'Walk-in' },
  { id: 'demo-16', token: 'S-16', name: 'Ishaan Mehta', services: ['Hair wash & style'], preference: 'Any barber', assignedBarber: null, status: 'Waiting', waitingMinutes: 7, estimate: 32, source: 'Online' },
  { id: 'demo-12', token: 'S-12', name: 'Kabir Patel', services: ['Signature haircut', 'Beard sculpt'], preference: 'Ravi Patel', assignedBarber: 'Ravi Patel', status: 'In Chair', waitingMinutes: 0, estimate: 0, source: 'Walk-in' },
  { id: 'demo-13', token: 'S-13', name: 'Reyansh Desai', services: ['Classic shave'], preference: 'Any barber', assignedBarber: 'Amit Shah', status: 'Called', waitingMinutes: 0, estimate: 0, source: 'Online', calledMinutesAgo: 12 },
  { id: 'demo-17', token: 'S-17', name: 'Diya Shah', services: ['Beard sculpt'], preference: 'Neel Mehta', assignedBarber: null, status: 'Waiting', waitingMinutes: 4, estimate: 39, source: 'Walk-in' },
  { id: 'demo-18', token: 'S-18', name: 'Vihaan Desai', services: ['Signature haircut'], preference: 'Any barber', assignedBarber: null, status: 'Waiting', waitingMinutes: 2, estimate: 47, source: 'Online' },
];

export const statusPreview = {
  token: 'S-15',
  status: 'Waiting',
  position: 2,
  waitMinutes: 14,
  services: ['Beard sculpt', 'Classic shave'],
  preference: 'Amit Shah',
  assignedBarber: null,
  arrivingSoon: true,
};

export const statusPreviews = {
  'S-15': statusPreview,
  'S-13': { ...statusPreview, token: 'S-13', status: 'Called', position: null, waitMinutes: 0, services: ['Classic shave'], preference: 'Any barber', assignedBarber: 'Amit Shah', arrivingSoon: false },
  'S-12': { ...statusPreview, token: 'S-12', status: 'In Chair', position: null, waitMinutes: 0, services: ['Signature haircut', 'Beard sculpt'], preference: 'Ravi Patel', assignedBarber: 'Ravi Patel', arrivingSoon: false },
  'S-11': { ...statusPreview, token: 'S-11', status: 'Done', position: null, waitMinutes: 0, services: ['Hair wash & style'], preference: 'Any barber', assignedBarber: 'Neel Mehta', arrivingSoon: false },
  'S-10': { ...statusPreview, token: 'S-10', status: 'No-show', position: null, waitMinutes: 0, services: ['Signature haircut'], preference: 'Any barber', assignedBarber: 'Amit Shah', arrivingSoon: false },
  'S-09': { ...statusPreview, token: 'S-09', status: 'Cancelled', position: null, waitMinutes: 0, services: ['Beard sculpt'], preference: 'Any barber', assignedBarber: null, arrivingSoon: false },
};

export function formatPrice(amount) {
  return `₹${amount.toLocaleString('en-IN')}`;
}
