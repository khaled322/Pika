import { GoogleGenAI } from "https://aistudiocdn.com/@google/genai@^1.27.0";
import { 
    onAuthChange, 
    logout, 
    signInWithGoogle, 
    signInWithEmailPassword, 
    signUpWithEmailPassword,
    getFriendlyAuthErrorMessage 
} from './firebase.js';
import { usersData, confirmerServicesData, hireRequestsData, adAccountsData } from './constants.js';

// --- STATE MANAGEMENT ---
const state = {
    theme: localStorage.getItem('theme') || 'dark',
    chat: {
        isOpen: false,
        messages: [],
        isLoading: false,
        error: null,
        chatInstance: null,
        hasSentWelcome: false,
    },
    dashboard: {
        activeView: 'dashboard',
        isSidebarOpen: false,
    },
    admin: {
        activeView: 'dashboard',
        isSidebarOpen: false,
        users: [...usersData],
    }
};

// --- THEME LOGIC ---
const applyTheme = () => {
    const root = document.documentElement;
    if (state.theme === 'dark') {
        root.classList.add('dark');
        document.getElementById('theme-icon-sun')?.classList.remove('hidden');
        document.getElementById('theme-icon-moon')?.classList.add('hidden');
    } else {
        root.classList.remove('dark');
        document.getElementById('theme-icon-sun')?.classList.add('hidden');
        document.getElementById('theme-icon-moon')?.classList.remove('hidden');
    }
    localStorage.setItem('theme', state.theme);
};

const toggleTheme = () => {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    applyTheme();
};

// --- CHATBOT LOGIC ---
const initGeminiChat = () => {
    try {
        if (!process.env.API_KEY) throw new Error("API_KEY environment variable not set.");
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        state.chat.chatInstance = ai.chats.create({
            model: 'gemini-2.5-flash',
            config: {
                systemInstruction: "You are a friendly and helpful customer support agent for 'Marketer's Hub Algeria' (also known as DZ Marketers), a platform for digital marketers in Algeria. Your goal is to assist users with their questions about the platform's services (like the confirmer marketplace, ad account store), features, and pricing in a concise and professional manner. Communicate primarily in Arabic. Keep your answers helpful but brief.",
            },
        });
        state.chat.error = null;
    } catch (e) {
        console.error("Failed to initialize Gemini AI:", e);
        state.chat.error = "لا يمكن بدء خدمة الدردشة الآن.";
    }
};

const renderChatMessages = () => {
    const messagesContainer = document.getElementById('chat-messages');
    if (!messagesContainer) return;

    messagesContainer.innerHTML = state.chat.messages.map(msg => {
        const isUser = msg.sender === 'user';
        const isLoadingPulse = state.chat.isLoading && msg.sender === 'ai' && msg.id === state.chat.messages[state.chat.messages.length - 1].id;
        return `
            <div class="flex items-end gap-2 ${isUser ? 'justify-end' : 'justify-start'}">
              ${!isUser ? '<img src="https://picsum.photos/seed/support/32" alt="AI" class="w-8 h-8 rounded-full self-start flex-shrink-0" />' : ''}
              <div class="max-w-[80%] p-3 rounded-xl ${isUser ? 'bg-primary-500 text-white rounded-ee-none' : 'bg-gray-200 dark:bg-dark-border text-gray-800 dark:text-dark-text rounded-es-none'}">
                <p class="text-sm whitespace-pre-wrap break-words">${msg.text}${isLoadingPulse ? '<span class="inline-block w-1 h-4 bg-gray-600 dark:bg-gray-300 animate-pulse ms-1"></span>' : ''}</p>
              </div>
            </div>
        `;
    }).join('');
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
};

const handleSendMessage = async (e) => {
    e.preventDefault();
    const input = document.getElementById('chat-input');
    const userMessage = input.value.trim();
    if (!userMessage || state.chat.isLoading || !state.chat.chatInstance) return;

    input.value = '';
    const newUserMessage = { id: Date.now().toString(), text: userMessage, sender: 'user' };
    const aiResponseId = (Date.now() + 1).toString();

    state.chat.messages.push(newUserMessage);
    state.chat.messages.push({ id: aiResponseId, text: '', sender: 'ai' });
    state.chat.isLoading = true;
    renderChatMessages();

    try {
        const stream = await state.chat.chatInstance.sendMessageStream({ message: userMessage });
        let fullResponse = '';
        for await (const chunk of stream) {
            fullResponse += chunk.text;
            const aiMessage = state.chat.messages.find(m => m.id === aiResponseId);
            if (aiMessage) {
                aiMessage.text = fullResponse;
                renderChatMessages();
            }
        }
    } catch (e) {
        console.error("Error sending message to Gemini:", e);
        const aiMessage = state.chat.messages.find(m => m.id === aiResponseId);
        if (aiMessage) {
            aiMessage.text = "عذراً، حدث خطأ ما. يرجى المحاولة مرة أخرى.";
            renderChatMessages();
        }
    } finally {
        state.chat.isLoading = false;
        renderChatMessages();
    }
};

const toggleChatWindow = (isOpen) => {
    state.chat.isOpen = isOpen;
    document.getElementById('chat-button-container')?.classList.toggle('invisible', isOpen);
    document.getElementById('chat-button-container')?.classList.toggle('opacity-0', isOpen);
    document.getElementById('chat-window-container')?.classList.toggle('invisible', !isOpen);
    document.getElementById('chat-window-container')?.classList.toggle('opacity-0', !isOpen);
    
    if (isOpen && !state.chat.hasSentWelcome) {
        state.chat.hasSentWelcome = true;
        state.chat.messages.push({
            id: Date.now().toString(),
            text: 'مرحباً بك في مركز المسوقين الجزائري! كيف يمكنني مساعدتك اليوم؟',
            sender: 'ai'
        });
        renderChatMessages();
    }
};

const createChatElements = () => {
    if (document.getElementById('chat-button-container')) return; // Already created
    const chatHTML = `
        <div id="chat-button-container" class="fixed bottom-20 end-4 z-40 transition-all duration-300">
            <button id="open-chat-btn" class="bg-primary-500 hover:bg-primary-600 text-white rounded-full p-4 shadow-lg transition-transform transform hover:scale-110" aria-label="Open Live Chat">
                <i data-lucide="message-square" class="w-7 h-7"></i>
            </button>
        </div>
        <div id="chat-window-container" class="fixed bottom-4 end-4 w-[calc(100%-2rem)] max-w-sm h-[70vh] max-h-[500px] z-50 bg-white dark:bg-dark-card shadow-2xl rounded-2xl flex flex-col transition-all duration-300 ease-in-out transform-gpu opacity-0 scale-95 invisible">
            <div class="flex items-center justify-between p-4 border-b border-gray-200 dark:border-dark-border flex-shrink-0">
                <div class="flex items-center gap-3">
                    <div class="relative"><img src="https://picsum.photos/seed/support/40" alt="Support" class="w-10 h-10 rounded-full" /><span class="absolute bottom-0 end-0 block h-2.5 w-2.5 rounded-full bg-green-500 ring-2 ring-white dark:ring-dark-card"></span></div>
                    <div><h3 class="font-bold text-gray-900 dark:text-white">الدعم المباشر</h3><p class="text-xs text-green-600 dark:text-green-400">متصل الآن</p></div>
                </div>
                <button id="close-chat-btn" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><i data-lucide="x" class="w-6 h-6"></i></button>
            </div>
            <div id="chat-messages" class="flex-1 p-4 overflow-y-auto space-y-4">
                ${state.chat.error ? `<div class="text-center text-red-500 text-sm bg-red-500/10 p-2 rounded-md">${state.chat.error}</div>` : ''}
            </div>
            <div class="p-4 border-t border-gray-200 dark:border-dark-border flex-shrink-0">
                <form id="chat-form" class="flex items-center gap-2">
                    <input type="text" id="chat-input" placeholder="اكتب رسالتك هنا..." class="flex-1 w-full px-4 py-2 bg-gray-100 dark:bg-dark-border border-transparent rounded-full focus:outline-none focus:ring-2 focus:ring-primary-500" />
                    <button type="submit" class="bg-primary-500 text-white rounded-full p-3 transition-colors disabled:bg-primary-300 hover:bg-primary-600"><i data-lucide="send" class="w-5 h-5"></i></button>
                </form>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', chatHTML);
    lucide.createIcons();

    document.getElementById('open-chat-btn').addEventListener('click', () => toggleChatWindow(true));
    document.getElementById('close-chat-btn').addEventListener('click', () => toggleChatWindow(false));
    document.getElementById('chat-form').addEventListener('submit', handleSendMessage);
    
    initGeminiChat();
    renderChatMessages();
};

// --- RENDER FUNCTIONS FOR DASHBOARD VIEWS ---
const renderMarketerDashboard = () => {
    const contentArea = document.getElementById('content-area');
    contentArea.innerHTML = `
        <div class="space-y-8 animate-fade-in">
            <h1 class="text-3xl font-bold text-gray-900 dark:text-white">لوحة تحكم المسوق</h1>
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div class="bg-white dark:bg-dark-card p-5 rounded-xl shadow-lg flex items-center space-s-4"><div class="bg-gray-100 dark:bg-dark-border p-3 rounded-full"><i data-lucide="wallet" class="text-blue-500"></i></div><div><p class="text-sm text-gray-500 dark:text-gray-400 font-medium">الرصيد الحالي</p><p class="text-2xl font-bold text-gray-900 dark:text-white">45,750 دج</p></div></div>
                <div class="bg-white dark:bg-dark-card p-5 rounded-xl shadow-lg flex items-center space-s-4"><div class="bg-gray-100 dark:bg-dark-border p-3 rounded-full"><i data-lucide="bar-chart-2" class="text-green-500"></i></div><div><p class="text-sm text-gray-500 dark:text-gray-400 font-medium">الحملات النشطة</p><p class="text-2xl font-bold text-gray-900 dark:text-white">3</p></div></div>
                <div class="bg-white dark:bg-dark-card p-5 rounded-xl shadow-lg flex items-center space-s-4"><div class="bg-gray-100 dark:bg-dark-border p-3 rounded-full"><i data-lucide="users" class="text-indigo-500"></i></div><div><p class="text-sm text-gray-500 dark:text-gray-400 font-medium">المؤكدين المتاحين</p><p class="text-2xl font-bold text-gray-900 dark:text-white">4</p></div></div>
                <div class="bg-white dark:bg-dark-card p-5 rounded-xl shadow-lg flex items-center space-s-4"><div class="bg-gray-100 dark:bg-dark-border p-3 rounded-full"><i data-lucide="credit-card" class="text-red-500"></i></div><div><p class="text-sm text-gray-500 dark:text-gray-400 font-medium">إجمالي الإنفاق</p><p class="text-2xl font-bold text-gray-900 dark:text-white">11,670 دج</p></div></div>
            </div>
            <div class="bg-white dark:bg-dark-card p-6 rounded-xl shadow-lg">
                <h3 class="text-2xl font-bold mb-4">نتائج الحملات</h3>
                <div class="h-80"><canvas id="campaign-chart"></canvas></div>
            </div>
        </div>`;
    lucide.createIcons();

    // Init Chart.js
    const ctx = document.getElementById('campaign-chart').getContext('2d');
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['حملة 1', 'حملة 2', 'حملة 3', 'حملة 4', 'حملة 5'],
            datasets: [
                { label: 'نتائج', data: [2400, 1398, 9800, 3908, 4800], backgroundColor: '#3b82f6', borderRadius: 4 },
                { label: 'تكلفة', data: [4000, 3000, 2000, 2780, 1890], backgroundColor: '#4b5563', borderRadius: 4 }
            ]
        },
        options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } } }
    });
};

const renderConfirmerDashboard = () => {
    const myRequests = hireRequestsData.filter(r => r.confirmerId === 2); // Assuming ID 2
    const getStatusChip = (status) => {
        switch (status) {
            case 'accepted': return 'border-green-500 bg-green-500/10 text-green-500';
            case 'declined': return 'border-red-500 bg-red-500/10 text-red-500';
            default: return 'border-yellow-500 bg-yellow-500/10 text-yellow-500';
        }
    }
    document.getElementById('content-area').innerHTML = `
        <div class="space-y-8 animate-fade-in">
            <h1 class="text-3xl font-bold text-gray-900 dark:text-white">لوحة تحكم المؤكد</h1>
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div class="bg-white dark:bg-dark-card p-5 rounded-xl shadow-lg flex items-center space-s-4"><div class="bg-gray-100 dark:bg-dark-border p-3 rounded-full"><i data-lucide="dollar-sign" class="text-green-500"></i></div><div><p class="text-sm text-gray-500 dark:text-gray-400 font-medium">الأرباح الشهرية</p><p class="text-2xl font-bold text-gray-900 dark:text-white">32,500 دج</p></div></div>
                <div class="bg-white dark:bg-dark-card p-5 rounded-xl shadow-lg flex items-center space-s-4"><div class="bg-gray-100 dark:bg-dark-border p-3 rounded-full"><i data-lucide="percent" class="text-blue-500"></i></div><div><p class="text-sm text-gray-500 dark:text-gray-400 font-medium">نسبة القبول</p><p class="text-2xl font-bold text-gray-900 dark:text-white">85%</p></div></div>
                <div class="bg-white dark:bg-dark-card p-5 rounded-xl shadow-lg flex items-center space-s-4"><div class="bg-gray-100 dark:bg-dark-border p-3 rounded-full"><i data-lucide="user-check" class="text-indigo-500"></i></div><div><p class="text-sm text-gray-500 dark:text-gray-400 font-medium">العملاء الحاليين</p><p class="text-2xl font-bold text-gray-900 dark:text-white">4</p></div></div>
                <div class="bg-white dark:bg-dark-card p-5 rounded-xl shadow-lg flex items-center space-s-4"><div class="bg-gray-100 dark:bg-dark-border p-3 rounded-full"><i data-lucide="clock" class="text-yellow-500"></i></div><div><p class="text-sm text-gray-500 dark:text-gray-400 font-medium">متوسط الرد</p><p class="text-2xl font-bold text-gray-900 dark:text-white">3 ساعات</p></div></div>
            </div>
            <div class="bg-white dark:bg-dark-card p-6 rounded-xl shadow-lg">
                <h3 class="text-2xl font-bold mb-4 flex items-center gap-3"><i data-lucide="mail" class="text-primary-500"></i> طلبات التوظيف الواردة</h3>
                <div class="space-y-4">
                    ${myRequests.length > 0 ? myRequests.map(request => `
                        <div class="bg-white dark:bg-dark-card p-5 rounded-xl shadow-lg border-l-4 border-primary-500">
                            <div class="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                                <div class="flex items-center gap-4">
                                    <img src="${request.marketer.avatar}" alt="${request.marketer.name}" class="w-12 h-12 rounded-full" />
                                    <div><h4 class="font-bold text-gray-900 dark:text-white">${request.marketer.name}</h4><p class="text-sm text-gray-500 dark:text-gray-400">${request.date}</p></div>
                                </div>
                                <div class="text-xs font-bold py-1 px-3 rounded-full border ${getStatusChip(request.status)}">${request.status === 'pending' ? 'طلب جديد' : (request.status === 'accepted' ? 'مقبول' : 'مرفوض')}</div>
                            </div>
                            <p class="my-4 text-gray-600 dark:text-gray-300">${request.message}</p>
                            ${request.status === 'pending' ? `
                            <div class="flex justify-end gap-3">
                                <button class="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors"><i data-lucide="x" class="w-4 h-4"></i><span>رفض</span></button>
                                <button class="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors"><i data-lucide="check" class="w-4 h-4"></i><span>قبول</span></button>
                            </div>` : ''}
                        </div>
                    `).join('') : '<p class="text-center text-gray-500 dark:text-gray-400 py-8">لا توجد طلبات توظيف حالياً.</p>'}
                </div>
            </div>
        </div>`;
    lucide.createIcons();
};

const renderConfirmerCommunityView = () => {
    document.getElementById('content-area').innerHTML = `
        <div class="space-y-8 animate-fade-in">
            <h1 class="text-3xl font-bold text-gray-900 dark:text-white">مجتمع المؤكدين</h1>
            <p class="text-lg text-gray-600 dark:text-gray-400">تصفح عروض الخدمات من المؤكدين المحترفين في مجتمعنا واختر الأنسب لحملاتك.</p>
            <div id="confirmer-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                ${confirmerServicesData.map(service => {
                    const confirmer = usersData.find(u => u.id === service.confirmerId);
                    return `
                    <div class="bg-white dark:bg-dark-card rounded-xl shadow-lg overflow-hidden transform hover:-translate-y-1 transition-transform duration-300">
                        <div class="p-6">
                            <div class="flex items-center gap-4 mb-4">
                                <img src="${confirmer.avatar}" alt="${confirmer.name}" class="w-16 h-16 rounded-full border-4 border-primary-500/50" />
                                <div><h3 class="text-xl font-bold text-gray-900 dark:text-white">${confirmer.name}</h3><p class="text-sm text-gray-500 dark:text-gray-400">${service.title}</p></div>
                            </div>
                            <p class="text-gray-600 dark:text-gray-300 mb-5 h-20">${service.description}</p>
                            <div class="flex flex-wrap gap-x-4 gap-y-2 text-sm mb-5 border-y dark:border-dark-border py-3">
                                <div class="flex items-center text-gray-700 dark:text-gray-300"><i data-lucide="zap" class="text-yellow-500 me-1.5 w-4 h-4"></i>${service.experience} سنوات</div>
                                <div class="flex items-center text-gray-700 dark:text-gray-300"><i data-lucide="dollar-sign" class="text-green-500 me-1.5 w-4 h-4"></i>${service.pricePerOrder} دج / طلب</div>
                                <div class="flex items-center text-gray-700 dark:text-gray-300"><i data-lucide="map-pin" class="text-blue-500 me-1.5 w-4 h-4"></i>${service.regions.join(', ')}</div>
                            </div>
                            <div class="flex flex-wrap gap-2 mb-5">
                                ${service.specialties.map(spec => `<span class="text-xs font-semibold bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-3 py-1 rounded-full flex items-center gap-1.5"><i data-lucide="tag" class="w-3 h-3"></i> ${spec}</span>`).join('')}
                            </div>
                            <button data-service-id="${service.confirmerId}" class="hire-btn w-full bg-primary-500 text-white font-bold py-2.5 rounded-lg hover:bg-primary-600 transition-colors flex items-center justify-center space-s-2">
                                <i data-lucide="send" class="w-4 h-4"></i><span>إرسال طلب توظيف</span>
                            </button>
                        </div>
                    </div>`;
                }).join('')}
            </div>
        </div>`;
    lucide.createIcons();
    document.querySelectorAll('.hire-btn').forEach(btn => btn.addEventListener('click', (e) => {
        const serviceId = parseInt(e.currentTarget.dataset.serviceId, 10);
        const service = confirmerServicesData.find(s => s.confirmerId === serviceId);
        openHireModal(service);
    }));
};

const openHireModal = (service) => {
    const confirmer = usersData.find(u => u.id === service.confirmerId);
    const modalContainer = document.getElementById('modal-container');
    modalContainer.innerHTML = `
        <div id="hire-modal" class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 animate-fade-in">
            <div class="bg-white dark:bg-dark-card rounded-2xl shadow-2xl w-full max-w-lg" id="hire-modal-content">
                <div class="flex items-center justify-between p-5 border-b border-gray-200 dark:border-dark-border">
                    <h3 class="text-xl font-bold text-gray-900 dark:text-white">إرسال طلب توظيف</h3>
                    <button id="close-modal-btn" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><i data-lucide="x" class="w-6 h-6"></i></button>
                </div>
                <form id="hire-form">
                    <div class="p-6 space-y-5">
                        <div class="flex items-center gap-4 bg-gray-100 dark:bg-dark-bg p-4 rounded-lg">
                            <img src="${confirmer.avatar}" alt="${confirmer.name}" class="w-14 h-14 rounded-full" />
                            <div><p class="text-sm text-gray-500 dark:text-gray-400">أنت على وشك إرسال طلب إلى:</p><h4 class="font-bold text-lg text-gray-800 dark:text-white">${confirmer.name}</h4></div>
                        </div>
                        <div>
                            <label for="message" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">رسالتك:</label>
                            <textarea id="message" rows="5" class="w-full bg-gray-100 dark:bg-dark-border border-transparent rounded-lg p-3 focus:ring-primary-500 focus:border-primary-500 text-gray-800 dark:text-dark-text" placeholder="صف تفاصيل الحملة، نوع المنتج، عدد الطلبات المتوقع، إلخ." required>مرحبا، لدي حملة جديدة لمنتج [اكتب اسم المنتج] وأرغب في توظيفك لتأكيد الطلبات.</textarea>
                        </div>
                    </div>
                    <div class="flex justify-end items-center gap-4 p-5 bg-gray-50 dark:bg-dark-bg/50 rounded-b-2xl">
                        <button type="button" id="cancel-modal-btn" class="px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-dark-border rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700">إلغاء</button>
                        <button type="submit" id="submit-hire-btn" class="flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg disabled:bg-primary-400 disabled:cursor-not-allowed w-32">
                           <i data-lucide="send" class="w-4 h-4"></i><span>إرسال</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;
    lucide.createIcons();
    const closeModal = () => modalContainer.innerHTML = '';
    
    document.getElementById('hire-modal').addEventListener('click', closeModal);
    document.getElementById('hire-modal-content').addEventListener('click', e => e.stopPropagation());
    document.getElementById('close-modal-btn').addEventListener('click', closeModal);
    document.getElementById('cancel-modal-btn').addEventListener('click', closeModal);

    document.getElementById('hire-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = document.getElementById('submit-hire-btn');
        submitBtn.disabled = true;
        submitBtn.innerHTML = `<i data-lucide="loader-2" class="w-5 h-5 animate-spin"></i>`;
        lucide.createIcons();
        
        await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate API call
        closeModal();
        showSuccessAlert('تم إرسال طلب التوظيف بنجاح!');
    });
};

const showSuccessAlert = (message) => {
    const alertContainer = document.getElementById('alert-container');
    const alertId = `alert-${Date.now()}`;
    alertContainer.innerHTML = `
        <div id="${alertId}" class="fixed top-24 end-8 bg-green-500 text-white p-4 rounded-lg shadow-lg flex items-center gap-3 z-[100] animate-slide-in">
            <i data-lucide="check-circle" class="w-6 h-6"></i>
            <span>${message}</span>
        </div>
    `;
    lucide.createIcons();
    setTimeout(() => document.getElementById(alertId)?.remove(), 4000);
};

// ... more render functions for AdAccountStoreView, ServicesView, AccountSettingsPage
const renderAdAccountStoreView = () => {
    // Simplified for brevity. A full implementation would be similar to other render functions.
    document.getElementById('content-area').innerHTML = `<h1 class="text-3xl font-bold text-gray-900 dark:text-white">متجر الحسابات الإعلانية</h1><p>سيتم إضافة هذه الميزة قريباً.</p>`;
};
const renderServicesView = () => {
    document.getElementById('content-area').innerHTML = `<h1 class="text-3xl font-bold text-gray-900 dark:text-white">خدمات المحتوى</h1><p>سيتم إضافة هذه الميزة قريباً.</p>`;
};
const renderWalletView = () => {
    document.getElementById('content-area').innerHTML = `<h1 class="text-3xl font-bold text-gray-900 dark:text-white">المحفظة</h1><p>سيتم إضافة هذه الميزة قريباً.</p>`;
};
const renderAccountSettingsPage = () => {
    document.getElementById('content-area').innerHTML = `<h1 class="text-3xl font-bold text-gray-900 dark:text-white">إعدادات الحساب</h1><p>سيتم إضافة هذه الميزة قريباً.</p>`;
};

// --- ADMIN RENDER FUNCTIONS ---
const renderAdminDashboard = () => {
    const contentArea = document.getElementById('content-area');
    contentArea.innerHTML = `
        <div class="space-y-8 animate-fade-in">
            <h1 class="text-3xl font-bold text-gray-900 dark:text-white">لوحة تحكم الأدمن</h1>
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <!-- AdminStatCard instances -->
            </div>
            <div class="bg-white dark:bg-dark-card p-6 rounded-xl shadow-lg">
                <h3 class="text-2xl font-bold mb-4">نمو المستخدمين</h3>
                <div class="h-80"><canvas id="user-growth-chart"></canvas></div>
            </div>
        </div>`;
    // Add Chart.js logic for user growth
};
const renderUserManagement = () => {
    document.getElementById('content-area').innerHTML = `<h1 class="text-3xl font-bold text-gray-900 dark:text-white">إدارة المستخدمين</h1><p>سيتم إضافة هذه الميزة قريباً.</p>`;
};
const renderAdminSettings = () => {
    document.getElementById('content-area').innerHTML = `<h1 class="text-3xl font-bold text-gray-900 dark:text-white">إعدادات الموقع</h1><p>سيتم إضافة هذه الميزة قريباً.</p>`;
};


// --- PAGE INITIALIZERS ---
const initAuthPage = (formId, submitHandler, googleHandler) => {
    let selectedRole = 'marketer';
    const form = document.getElementById(formId);
    const emailInput = document.getElementById('email-address');
    const passwordInput = document.getElementById('password-input');
    const nameInput = document.getElementById('full-name'); // for register page
    const errorMsg = document.getElementById('error-message');
    const submitBtn = document.getElementById('submit-btn');
    const loader = document.getElementById('loader');
    const googleBtn = document.getElementById(googleHandler);

    document.querySelectorAll('.role-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            selectedRole = btn.dataset.role;
            document.querySelectorAll('.role-btn').forEach(b => {
                b.classList.remove('border-primary-500', 'bg-primary-50', 'dark:bg-primary-900/20', 'shadow-lg');
                b.classList.add('border-gray-300', 'dark:border-dark-border');
                b.querySelector('i').classList.remove('text-primary-500');
                b.querySelector('i').classList.add('text-gray-500');
            });
            btn.classList.add('border-primary-500', 'bg-primary-50', 'dark:bg-primary-900/20', 'shadow-lg');
            btn.classList.remove('border-gray-300', 'dark:border-dark-border');
            btn.querySelector('i').classList.add('text-primary-500');
            btn.querySelector('i').classList.remove('text-gray-500');
        });
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = emailInput.value;
        const password = passwordInput.value;
        const name = nameInput ? nameInput.value : null;

        if (email === 'admin' && password === 'admin123') {
            localStorage.setItem('isAdmin', 'true');
            window.location.href = '/admin.html';
            return;
        }

        submitBtn.disabled = true;
        loader.classList.remove('hidden');
        errorMsg.classList.add('hidden');
        
        try {
            await submitHandler(email, password, name);
            localStorage.setItem('userRole', selectedRole);
            window.location.href = '/dashboard.html';
        } catch (err) {
            errorMsg.textContent = getFriendlyAuthErrorMessage(err.code);
            errorMsg.classList.remove('hidden');
        } finally {
            submitBtn.disabled = false;
            loader.classList.add('hidden');
        }
    });
    
    googleBtn.addEventListener('click', async () => {
       try {
            await signInWithGoogle();
            localStorage.setItem('userRole', selectedRole);
            window.location.href = '/dashboard.html';
        } catch (error) {
            errorMsg.textContent = "فشل تسجيل الدخول باستخدام جوجل. يرجى المحاولة مرة أخرى.";
            errorMsg.classList.remove('hidden');
        }
    });
};

const renderSidebar = (userRole) => {
    const marketerLinks = [
        { text: 'لوحة التحكم', icon: 'layout-dashboard', view: 'dashboard' },
        { text: 'مجتمع المؤكدين', icon: 'users', view: 'confirmers' },
        { text: 'متجر الحسابات', icon: 'shopping-cart', view: 'accounts' },
        { text: 'خدمات المحتوى', icon: 'briefcase', view: 'services' },
        { text: 'المحفظة', icon: 'wallet', view: 'wallet' },
    ];
    const confirmerLinks = [
        { text: 'لوحة التحكم', icon: 'layout-dashboard', view: 'dashboard' },
        { text: 'الأرباح والمحفظة', icon: 'wallet', view: 'wallet' },
    ];
    const navLinks = userRole === 'marketer' ? marketerLinks : confirmerLinks;
    const sidebarHTML = `
        <div id="sidebar-mobile-overlay" class="fixed inset-0 bg-black/60 z-40 md:hidden hidden"></div>
        <div id="sidebar-content" class="fixed md:relative top-0 start-0 h-full w-64 bg-dark-card text-white z-50 flex flex-col transition-transform duration-300 -translate-x-full md:translate-x-0">
            <div class="flex items-center justify-between p-4 border-b border-dark-border h-16">
                 <a href="/dashboard.html" class="flex items-center space-s-2"><span class="text-2xl font-extrabold text-primary-500">DZ</span><span class="font-bold text-xl text-white">Marketers</span></a>
                <button id="close-sidebar-btn" class="md:hidden text-gray-400 hover:text-white"><i data-lucide="x" class="w-6 h-6"></i></button>
            </div>
            <nav class="flex-1 px-2 py-4 space-y-2">
                ${navLinks.map(link => `<button data-view="${link.view}" class="nav-link w-full flex items-center space-s-3 px-4 py-2.5 rounded-lg transition-colors ${state.dashboard.activeView === link.view ? 'bg-primary-500 text-white' : 'text-gray-300 hover:bg-dark-border hover:text-white'}"><i data-lucide="${link.icon}" class="w-5 h-5"></i><span class="font-medium">${link.text}</span></button>`).join('')}
            </nav>
            <div class="p-4 border-t border-dark-border">
                <button data-view="settings" class="nav-link w-full flex items-center space-s-3 px-4 py-2.5 rounded-lg transition-colors ${state.dashboard.activeView === 'settings' ? 'bg-primary-500 text-white' : 'text-gray-300 hover:bg-dark-border hover:text-white'}"><i data-lucide="settings" class="w-5 h-5"></i><span class="font-medium">إعدادات الحساب</span></button>
                <button id="logout-btn" class="w-full flex items-center space-s-3 mt-2 px-4 py-2.5 text-red-400 hover:bg-red-500/20 hover:text-red-300 rounded-lg transition-colors"><i data-lucide="log-out" class="w-5 h-5"></i><span class="font-medium">تسجيل الخروج</span></button>
            </div>
        </div>
    `;
    document.getElementById('sidebar-container').innerHTML = sidebarHTML;
    lucide.createIcons();
};

const initDashboardPage = () => {
    const userRole = localStorage.getItem('userRole');
    if (!userRole) {
        logout();
        window.location.href = '/login.html';
        return;
    }
    document.getElementById('loading-overlay').style.display = 'none';

    const renderView = (view) => {
        state.dashboard.activeView = view;
        document.querySelectorAll('.nav-link').forEach(l => {
            l.classList.toggle('bg-primary-500', l.dataset.view === view);
            l.classList.toggle('text-white', l.dataset.view === view);
        });
        switch(view) {
            case 'dashboard': userRole === 'marketer' ? renderMarketerDashboard() : renderConfirmerDashboard(); break;
            case 'confirmers': renderConfirmerCommunityView(); break;
            case 'accounts': renderAdAccountStoreView(); break;
            case 'services': renderServicesView(); break;
            case 'wallet': renderWalletView(); break;
            case 'settings': renderAccountSettingsPage(); break;
            default: renderMarketerDashboard();
        }
    };
    
    renderSidebar(userRole);
    renderView(state.dashboard.activeView);

    // Event Listeners
    document.getElementById('logout-btn').addEventListener('click', async () => {
        await logout();
        localStorage.removeItem('userRole');
        window.location.href = '/';
    });
    
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            renderView(e.currentTarget.dataset.view);
            toggleSidebar(false);
        });
    });

    const toggleSidebar = (show) => {
        document.getElementById('sidebar-content').classList.toggle('-translate-x-full', !show);
        document.getElementById('sidebar-mobile-overlay').classList.toggle('hidden', !show);
    }
    
    document.getElementById('mobile-menu-btn').addEventListener('click', () => toggleSidebar(true));
    document.getElementById('close-sidebar-btn').addEventListener('click', () => toggleSidebar(false));
    document.getElementById('sidebar-mobile-overlay').addEventListener('click', () => toggleSidebar(false));
};

const initAdminPage = () => {
    // Basic auth check
    if (localStorage.getItem('isAdmin') !== 'true') {
        window.location.href = '/login.html';
        return;
    }
    
    // Implement Admin Page logic similar to Dashboard Page
    renderAdminDashboard();
};


// --- MAIN EXECUTION ---
document.addEventListener('DOMContentLoaded', () => {
    applyTheme();
    lucide.createIcons();
    document.getElementById('theme-toggle')?.addEventListener('click', toggleTheme);

    const pageId = document.body.id;

    if (pageId !== 'admin-page') {
        createChatElements();
    }
    
    switch (pageId) {
        case 'login-page':
            initAuthPage('login-form', signInWithEmailPassword, 'google-signin-btn');
            break;
        case 'register-page':
            initAuthPage('register-form', (email, password) => signUpWithEmailPassword(email, password), 'google-signup-btn');
            break;
        case 'dashboard-page':
            onAuthChange(user => {
                if (!user) {
                    window.location.href = '/login.html';
                } else {
                    initDashboardPage();
                }
            });
            break;
        case 'admin-page':
            initAdminPage();
            break;
    }
});
