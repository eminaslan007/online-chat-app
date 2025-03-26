// Firebase yapılandırması
const firebaseConfig = {
    apiKey: "AIzaSyBxDWDzkG24fwxaCOdBB8x0HPIehC6C02c",
    authDomain: "online-chat-app-8ea34.firebaseapp.com",
    projectId: "online-chat-app-8ea34",
    storageBucket: "online-chat-app-8ea34.firebasestorage.app",
    messagingSenderId: "31701961349",
    appId: "1:31701961349:web:76aac5bcd1732e7111b7ec",
    measurementId: "G-RPNJJL0S7P",
    databaseURL: "https://online-chat-app-8ea34-default-rtdb.firebaseio.com"
};

// Firebase'i başlat
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// DOM elementleri
const loginScreen = document.getElementById('login-screen');
const chatScreen = document.getElementById('chat-screen');
const loginForm = document.getElementById('login-form');
const messageForm = document.getElementById('message-form');
const messagesContainer = document.getElementById('messages');
const messageInput = document.getElementById('message-input');
const usernameInput = document.getElementById('username');
const onlineCountElement = document.getElementById('online-count');
const logoutButton = document.getElementById('logout-button');

let currentUser = null;
let messagesRef = null;
let userRef = null;

// Kullanıcı girişi
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = usernameInput.value.trim();
    if (username) {
        try {
            currentUser = {
                id: Date.now().toString(),
                name: username,
                lastSeen: firebase.database.ServerValue.TIMESTAMP
            };

            // Kullanıcıyı çevrimiçi kullanıcılara ekle
            userRef = database.ref('users/' + currentUser.id);
            await userRef.set(currentUser);

            // Kullanıcı çıkış yaptığında veya bağlantı koptuğunda
            userRef.onDisconnect().remove();

            // Her 30 saniyede bir lastSeen'i güncelle
            setInterval(() => {
                if (currentUser && userRef) {
                    userRef.update({
                        lastSeen: firebase.database.ServerValue.TIMESTAMP
                    });
                }
            }, 30000);

            // Chat ekranına geç
            loginScreen.classList.remove('active');
            chatScreen.classList.add('active');

            // Sistem mesajı gönder
            await sendSystemMessage(username + ' sohbete katıldı');
            
            // Mesajları ve kullanıcıları dinlemeye başla
            startMessageListener();
            startUserListener();
        } catch (error) {
            console.error('Giriş hatası:', error);
            alert('Giriş yapılamadı. Lütfen tekrar deneyin.');
        }
    }
});

// Mesaj gönderme
messageForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = messageInput.value.trim();
    if (text && currentUser) {
        try {
            const message = {
                userId: currentUser.id,
                username: currentUser.name,
                text: text,
                timestamp: firebase.database.ServerValue.TIMESTAMP
            };

            // Mesajı veritabanına ekle
            await database.ref('messages').push(message);
            messageInput.value = '';
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        } catch (error) {
            console.error('Mesaj gönderme hatası:', error);
            alert('Mesaj gönderilemedi. Lütfen tekrar deneyin.');
        }
    }
});

// Mesajları dinlemeye başla
function startMessageListener() {
    if (messagesRef) {
        messagesRef.off();
    }
    
    messagesRef = database.ref('messages');
    messagesRef.orderByChild('timestamp').limitToLast(100).on('child_added', (snapshot) => {
        const message = snapshot.val();
        if (message) {
            displayMessage(message);
        }
    });
}

// Kullanıcıları dinlemeye başla
function startUserListener() {
    const usersRef = database.ref('users');
    
    // Aktif kullanıcıları dinle
    usersRef.on('value', (snapshot) => {
        const users = snapshot.val() || {};
        const now = Date.now();
        const activeUsers = Object.values(users).filter(user => {
            // Son 1 dakika içinde aktif olan kullanıcıları say
            return user.lastSeen && (now - user.lastSeen) < 60000;
        });
        onlineCountElement.textContent = activeUsers.length;
    });
}

// Mesajı görüntüleme
function displayMessage(message) {
    const existingMessage = document.querySelector(`[data-message-id="${message.timestamp}"]`);
    if (existingMessage) {
        return; // Mesaj zaten görüntülenmiş
    }

    const messageElement = document.createElement('div');
    messageElement.setAttribute('data-message-id', message.timestamp);
    const isSent = message.userId === currentUser?.id;
    
    messageElement.className = `message ${isSent ? 'sent' : 'received'}`;
    
    if (!isSent) {
        messageElement.innerHTML += `<div class="username">${escapeHtml(message.username)}</div>`;
    }
    
    messageElement.innerHTML += `
        <div class="text">${escapeHtml(message.text)}</div>
        <div class="time">${formatTime(message.timestamp)}</div>
    `;

    messagesContainer.appendChild(messageElement);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Sistem mesajı gönderme
async function sendSystemMessage(text) {
    const messageElement = document.createElement('div');
    messageElement.className = 'system-message';
    messageElement.textContent = text;
    messagesContainer.appendChild(messageElement);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    // Sistem mesajını veritabanına da kaydet
    try {
        await database.ref('messages').push({
            type: 'system',
            text: text,
            timestamp: firebase.database.ServerValue.TIMESTAMP
        });
    } catch (error) {
        console.error('Sistem mesajı gönderme hatası:', error);
    }
}

// Çıkış yapma
logoutButton.addEventListener('click', async () => {
    if (currentUser) {
        try {
            if (userRef) {
                await userRef.remove();
            }
            if (messagesRef) {
                messagesRef.off();
            }
            await sendSystemMessage(currentUser.name + ' sohbetten ayrıldı');
            currentUser = null;
            userRef = null;
            messagesRef = null;
            chatScreen.classList.remove('active');
            loginScreen.classList.add('active');
            messagesContainer.innerHTML = '';
        } catch (error) {
            console.error('Çıkış hatası:', error);
        }
    }
});

// Yardımcı fonksiyonlar
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatTime(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('tr-TR', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
}

// Sayfa yenilendiğinde veya kapatıldığında çıkış yapma
window.addEventListener('beforeunload', () => {
    if (currentUser && userRef) {
        userRef.remove();
    }
});
