// Firebase yapılandırması
const firebaseConfig = {
    apiKey: "AIzaSyBxDWDzkG24fwxaCOdBB8x0HPIehC6C02c",
    authDomain: "online-chat-app-8ea34.firebaseapp.com",
    databaseURL: "https://online-chat-app-8ea34-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "online-chat-app-8ea34",
    storageBucket: "online-chat-app-8ea34.firebasestorage.app",
    messagingSenderId: "31701961349",
    appId: "1:31701961349:web:76aac5bcd1732e7111b7ec"
};

// Firebase'i başlat
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
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
let isSubmitting = false;
let chatRoomId = 'private-chat-room'; // Sabit sohbet odası

// İzin verilen kullanıcılar
const ALLOWED_USERS = ['EMİN', 'KÜBRA'];

// Kullanıcı girişi
loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    isSubmitting = true;

    const username = usernameInput.value.trim().toUpperCase();

    // Sadece EMİN ve KÜBRA kullanıcı adlarına izin ver
    if (!ALLOWED_USERS.includes(username)) {
        alert('Sadece EMİN ve KÜBRA kullanıcı adlarıyla giriş yapabilirsiniz.');
        isSubmitting = false;
        return;
    }

    auth.signInAnonymously()
        .then((userCredential) => {
            const user = userCredential.user;
            currentUser = {
                id: user.uid,
                name: username
            };

            // Kullanıcıyı veritabanına kaydet
            return database.ref('users/' + user.uid).set({
                username: username,
                online: true,
                lastSeen: firebase.database.ServerValue.TIMESTAMP
            });
        })
        .then(() => {
            // Doğrudan sohbete geç
            loginScreen.classList.remove('active');
            chatScreen.classList.add('active');
            loadMessages();
            updateOnlineUsers();
        })
        .catch((error) => {
            console.error('Giriş hatası:', error);
            alert('Bir hata oluştu. Lütfen tekrar deneyin.');
        })
        .finally(() => {
            isSubmitting = false;
        });
});

// Mesaj gönderme
messageForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    isSubmitting = true;

    const text = messageInput.value.trim();
    if (text && currentUser) {
        const message = {
            uid: currentUser.id,
            username: currentUser.name,
            text: text,
            timestamp: firebase.database.ServerValue.TIMESTAMP
        };

        const submitButton = messageForm.querySelector('button[type="submit"]');
        submitButton.disabled = true;

        database.ref('chatRooms/' + chatRoomId + '/messages').push(message)
            .then(() => {
                messageInput.value = '';
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
            })
            .catch((error) => {
                console.error('Mesaj gönderme hatası:', error);
                alert('Mesaj gönderilemedi.');
            })
            .finally(() => {
                isSubmitting = false;
                submitButton.disabled = false;
            });
    } else {
        isSubmitting = false;
    }
});

// Mesajları yükle
function loadMessages() {
    if (messagesRef) {
        messagesRef.off();
    }

    messagesRef = database.ref('chatRooms/' + chatRoomId + '/messages');
    const processedMessages = new Set();

    messagesRef.orderByChild('timestamp').on('child_added', (snapshot) => {
        const message = snapshot.val();
        const messageId = snapshot.key;

        if (!processedMessages.has(messageId)) {
            processedMessages.add(messageId);
            displayMessage(message, messageId);
        }
    });
}

// Mesajı görüntüle
function displayMessage(message, messageId) {
    if (document.querySelector(`[data-message-id="${messageId}"]`)) {
        return;
    }

    const messageElement = document.createElement('div');
    messageElement.setAttribute('data-message-id', messageId);
    const isSent = message.uid === currentUser?.id;
    
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

// Çevrimiçi kullanıcıları güncelle
function updateOnlineUsers() {
    database.ref('users').on('value', (snapshot) => {
        const users = snapshot.val() || {};
        const onlineUsers = Object.values(users).filter(user => 
            ALLOWED_USERS.includes(user.username.toUpperCase())
        );
        onlineCountElement.textContent = onlineUsers.length;
    });
}

// Çıkış yap
logoutButton.addEventListener('click', () => {
    if (currentUser) {
        database.ref('users/' + currentUser.id).remove()
            .then(() => {
                auth.signOut();
                currentUser = null;
                messagesRef = null;
                chatScreen.classList.remove('active');
                loginScreen.classList.add('active');
                messagesContainer.innerHTML = '';
            })
            .catch((error) => {
                console.error('Çıkış hatası:', error);
            });
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

// Sayfa yenilendiğinde veya kapatıldığında
window.addEventListener('beforeunload', () => {
    if (currentUser) {
        database.ref('users/' + currentUser.id).remove();
    }
});
