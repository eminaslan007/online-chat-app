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

// Authorized domains
const authorizedDomains = ['aslanchatt.netlify.app', 'localhost'];

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
loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const username = usernameInput.value.trim();
    if (username) {
        currentUser = {
            id: Date.now().toString(),
            name: username,
            timestamp: firebase.database.ServerValue.TIMESTAMP
        };

        // Kullanıcıyı çevrimiçi kullanıcılara ekle
        userRef = database.ref('users/' + currentUser.id);
        userRef.set(currentUser);

        // Kullanıcı çıkış yaptığında veya bağlantı koptuğunda
        userRef.onDisconnect().remove();

        // Chat ekranına geç
        loginScreen.classList.remove('active');
        chatScreen.classList.add('active');

        // Sistem mesajı gönder
        sendSystemMessage(username + ' sohbete katıldı');
        
        // Mesajları dinlemeye başla
        startMessageListener();
    }
});

// Çıkış yapma
logoutButton.addEventListener('click', () => {
    if (currentUser) {
        if (userRef) {
            userRef.remove();
        }
        if (messagesRef) {
            messagesRef.off();
        }
        sendSystemMessage(currentUser.name + ' sohbetten ayrıldı');
        currentUser = null;
        userRef = null;
        messagesRef = null;
        chatScreen.classList.remove('active');
        loginScreen.classList.add('active');
        messagesContainer.innerHTML = '';
    }
});

// Mesaj gönderme
messageForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = messageInput.value.trim();
    if (text && currentUser) {
        const message = {
            userId: currentUser.id,
            username: currentUser.name,
            text: text,
            timestamp: firebase.database.ServerValue.TIMESTAMP
        };

        // Mesajı veritabanına ekle
        database.ref('messages').push(message)
            .then(() => {
                messageInput.value = '';
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
            })
            .catch((error) => {
                console.error('Mesaj gönderme hatası:', error);
                alert('Mesaj gönderilemedi. Lütfen tekrar deneyin.');
            });
    }
});

// Mesajları dinlemeye başla
function startMessageListener() {
    if (messagesRef) {
        messagesRef.off(); // Eski dinleyiciyi kaldır
    }
    
    messagesRef = database.ref('messages');
    messagesRef.on('child_added', (snapshot) => {
        const message = snapshot.val();
        displayMessage(message);
    });
}

// Mesajı görüntüleme
function displayMessage(message) {
    const messageElement = document.createElement('div');
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
function sendSystemMessage(text) {
    const messageElement = document.createElement('div');
    messageElement.className = 'system-message';
    messageElement.textContent = text;
    messagesContainer.appendChild(messageElement);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Çevrimiçi kullanıcıları takip etme
database.ref('users').on('value', (snapshot) => {
    const users = snapshot.val() || {};
    const count = Object.keys(users).length;
    onlineCountElement.textContent = count;
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
