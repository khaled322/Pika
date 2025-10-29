
export const usersData = [
  { id: 1, name: 'أحمد بن علي', email: 'ahmed@confirmer.com', role: 'confirmer', avatar: 'https://picsum.photos/seed/ahmed/100' },
  { id: 2, name: 'فاطمة الزهراء', email: 'fatima@confirmer.com', role: 'confirmer', avatar: 'https://picsum.photos/seed/fatima/100' },
  { id: 101, name: 'علي المسوق', email: 'ali@marketer.com', role: 'marketer', avatar: 'https://picsum.photos/seed/ali/100' },
  { id: 102, name: 'سارة المسوقة', email: 'sara@marketer.com', role: 'marketer', avatar: 'https://picsum.photos/seed/sara/100' },
];

export const confirmerServicesData = [
  { confirmerId: 1, title: 'خبير تأكيد طلبات - 3 سنوات خبرة', description: 'متخصص في منتجات التجميل والصحة، نسبة تأكيد عالية وتعامل احترافي مع الزبائن في العاصمة وضواحيها.', pricePerOrder: 250, experience: 3, regions: ['الجزائر العاصمة', 'البليدة'], specialties: ['تجميل', 'مكملات غذائية'] },
  { confirmerId: 2, title: 'تأكيد احترافي لولايات الغرب', description: '5 سنوات خبرة في مجال التجارة الإلكترونية، أضمن لكم أفضل نسبة تأكيد في وهران، تلمسان، ومستغانم.', pricePerOrder: 300, experience: 5, regions: ['وهران', 'تلمسان', 'مستغانم'], specialties: ['أزياء', 'إلكترونيات'] },
];

export const hireRequestsData = [
  { id: 'HR001', marketer: { id: 101, name: 'علي المسوق', avatar: 'https://picsum.photos/seed/ali/100' }, confirmerId: 2, message: 'مرحبا، لدي حملة جديدة لمنتجات ملابس وأحتاج مؤكد محترف في وهران.', status: 'pending', date: '2024-07-25' },
  { id: 'HR002', marketer: { id: 102, name: 'سارة المسوقة', avatar: 'https://picsum.photos/seed/sara/100' }, confirmerId: 2, message: 'السلام عليكم، هل أنت متاحة لتأكيد طلبات أجهزة إلكترونية؟', status: 'accepted', date: '2024-07-24' },
  { id: 'HR003', marketer: { id: 101, name: 'علي المسوق', avatar: 'https://picsum.photos/seed/ali/100' }, confirmerId: 1, message: 'أبحث عن مؤكد لمنتجات تجميل في العاصمة.', status: 'pending', date: '2024-07-25' },
   { id: 'HR004', marketer: { id: 102, name: 'سارة المسوقة', avatar: 'https://picsum.photos/seed/sara/100' }, confirmerId: 1, message: 'طلب توظيف لحملة مكملات غذائية جديدة.', status: 'declined', date: '2024-07-23' },
];

export const adAccountsData = [
  { id: 1, platform: 'Facebook', paymentMethod: 'Prepaid', price: 5000, isVerified: true, stock: 5 },
  { id: 2, platform: 'TikTok', paymentMethod: 'Postpaid', price: 7500, isVerified: true, stock: 3 },
  { id: 3, platform: 'Google', paymentMethod: 'Prepaid', price: 10000, isVerified: false, stock: 8 },
  { id: 4, platform: 'Facebook', paymentMethod: 'Postpaid', price: 6000, isVerified: true, stock: 0 },
];

export const transactionsData = [
    { id: 'TXN12345', date: '2024-07-20', description: 'إيداع عبر USDT', amount: 5000, type: 'deposit' },
    { id: 'TXN12346', date: '2024-07-19', description: 'رسوم خدمة تأكيد', amount: -250, type: 'fee' },
    { id: 'TXN12347', date: '2024-07-18', description: 'سحب أرباح CCP', amount: -15000, type: 'withdrawal' },
    { id: 'TXN12348', date: '2024-07-17', description: 'مكافأة إحالة', amount: 500, type: 'reward' },
    { id: 'TXN12349', date: '2024-07-16', description: 'إيداع BaridiMob', amount: 20000, type: 'deposit' },
];
