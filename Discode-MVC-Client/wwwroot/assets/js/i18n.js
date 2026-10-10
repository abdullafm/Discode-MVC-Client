"use strict";
(function () {

    var STORAGE_KEY = "discode-lang";

    var TRANSLATIONS = {
        "tr": {
            // Navigation & Header
            "Friends": "Arkadaşlar",
            "Direct Messages": "Doğrudan Mesajlar",
            "DIRECT MESSAGES": "DİREKT MESAJLAR",
            "Servers": "Sunucular",
            "Discover": "Keşfet",
            "Media": "Medya",
            "Nitro": "Nitro",
            "Settings": "Ayarlar",
            "Logout": "Çıkış Yap",
            "Log out": "Çıkış Yap",
            "Search": "Ara",
            "Find or start a conversation": "Bir sohbet bulun veya başlatın",
            "Explore Discoverable Servers": "Keşfedilebilir Sunucuları Keşfet",
            "Quick Search": "Hızlı Arama",
            "Find users by username instantly": "Kullanıcı adına göre anında bul",
            "Home": "Ana Sayfa",
            "Explore": "Keşfet",

            // Friend Tabs & Statuses
            "Online": "Çevrimiçi",
            "All Friends": "Tüm Arkadaşlar",
            "All": "Tümü",
            "Pending": "Beklemede",
            "Blocked": "Engellendi",
            "Add Friend": "Arkadaş Ekle",
            "Add friend": "Arkadaş Ekle",
            "Send Friend Request": "Arkadaşlık İsteği Gönder",
            "You can add friends with their Discord username.": "Arkadaşlarınızı Discord kullanıcı adlarıyla ekleyebilirsiniz.",
            "Other Places to Make Friends": "Arkadaş Edinmek İçin Diğer Yerler",
            "Active Now": "Şimdi Aktif",
            "It's quiet for now...": "Şimdilik sakin...",
            "Idle": "Boşta",
            "Do Not Disturb": "Rahatsız Etmeyin",
            "Invisible": "Görünmez",
            "Offline": "Çevrimdışı",
            "You will appear offline": "Çevrimdışı görüneceksiniz",
            "You will not receive desktop notifications": "Masaüstü bildirimleri almayacaksınız",
            "No friends yet.": "Henüz arkadaş yok.",
            "No pending requests.": "Bekleyen istek yok.",
            "No blocked users.": "Engellenen kullanıcı yok.",
            "No friends found.": "Arkadaş bulunamadı.",
            "No notifications": "Bildirim yok",
            "0 Unread": "0 Okunmamış",
            "Mark all as read": "Tümünü okundu olarak işaretle",
            "You're all caught up! Check back later for updates.": "Hepsini gördünüz! Güncellemeler için daha sonra tekrar kontrol edin.",
            "Status": "Durum",
            "Action": "İşlem",
            "User": "Kullanıcı",

            // Actions & Context Menus
            "Message": "Mesaj",
            "Bio": "Hakkında",
            "About": "Hakkında",
            "Note": "Not",
            "Add Note": "Not Ekle",
            "Click to add a note": "Not eklemek için tıklayın",
            "only visible to you": "yalnızca size görünür",
            "Only visible to you": "Yalnızca size görünür",
            "Member Since": "Üyelik Tarihi",
            "Edit Profile": "Profili Düzenle",
            "Edit Profiles": "Profilleri Düzenle",
            "Pronouns": "Zamirler",
            "Add pronouns": "Zamir ekle",
            "Set your status": "Durumunu ayarla",
            "Clear tomorrow": "Yarın temizle",
            "Don't clear": "Temizleme",
            "30 minutes": "30 dakika",
            "1 hour": "1 saat",
            "4 hours": "4 saat",
            "Today": "Bugün",
            "Tomorrow": "Yarın",
            "Start a Call": "Arama Başlat",
            "Call": "Ara",
            "Start Voice Call": "Sesli Arama Başlat",
            "Start Video Call": "Görüntülü Arama Başlat",
            "Invite to Voice": "Sese Davet Et",
            "Voice Connected": "Sese Bağlandı",
            "Return to call": "Aramaya dön",
            "Add people to Voice Chat": "Sesli Sohbete kişi ekle",
            "Join": "Katıl",
            "Leave": "Ayrıl",
            "Mute": "Sustur",
            "Deafen": "Sağırlaştır",
            "Join Voice": "Sese Katıl",
            "Pin": "Sabitle",
            "Unpin": "Sabitlemeyi Kaldır",
            "Profile": "Profil",
            "Close DM": "DM'yi Kapat",
            "Invite to Server": "Sunucuya Davet Et",
            "No servers": "Sunucu yok",
            "Block": "Engelle",
            "Block User": "Kullanıcıyı Engelle",
            "Unblock": "Engeli Kaldır",
            "Remove Friend": "Arkadaşı Sil",
            "Accept": "Kabul Et",
            "Decline": "Reddet",
            "Cancel": "İptal",
            "Done": "Bitti",
            "Save": "Kaydet",
            "Save Changes": "Değişiklikleri Kaydet",
            "Edit": "Düzenle",
            "Delete": "Sil",
            "Close": "Kapat",
            "Back": "Geri",
            "Copy": "Kopyala",
            "Copy Username": "Kullanıcı Adını Kopyala",

            // Direct Messages & Group
            "New Message": "Yeni Mesaj",
            "Create Message": "Mesaj Oluştur",
            "Group DMs can have up to 10 members.": "Grup DM'leri en fazla 10 üyeye sahip olabilir.",
            "Add friends or server members to group DMs.": "Grup DM'lerine arkadaşlarınızı ekleyin.",
            "Invite to Group DM": "Grup DM'sine Davet Et",
            "Edit Group": "Grubu Düzenle",
            "Type a message...": "Bir mesaj yazın...",
            "Send": "Gönder",
            "Send Messages": "Mesaj Gönder",
            "Manage Messages": "Mesajları Yönet",
            "Pinned Messages": "Sabitlenmiş Mesajlar",
            "No servers in common": "Ortak sunucu yok",
            "View Full Profile": "Tam Profili Görüntüle",

            // Channels & Servers
            "Text Channels": "Metin Kanalları",
            "TEXT CHANNELS": "METİN KANALLARI",
            "Voice Channels": "Ses Kanalları",
            "VOICE CHANNELS": "SES KANALLARI",
            "No channels yet.": "Henüz kanal yok.",
            "Hide Muted Channels": "Susturulmuş Kanalları Gizle",
            "Create Channel": "Kanal Oluştur",
            "Create Category": "Kategori Oluştur",
            "Edit Channel": "Kanalı Düzenle",
            "Delete Channel": "Kanalı Sil",
            "Channel Name": "Kanal Adı",
            "Category Name": "Kategori Adı",
            "Channel Type": "Kanal Türü",
            "Text": "Metin",
            "Voice": "Ses",
            "Category": "Kategori",
            "Private Channel": "Özel Kanal",
            "Private Category": "Özel Kategori",
            "View Channel": "Kanalı Görüntüle",
            "Voice room": "Ses odası",
            "Connect": "Bağlan",
            "Speak": "Konuş",
            "Mute Members": "Üyeleri Sustur",
            "Server": "Sunucu",
            "Server Profile": "Sunucu Profili",
            "Server Settings": "Sunucu Ayarları",
            "Server Boost": "Sunucu Takviyesi",
            "Boost Perks": "Takviye Ayrıcalıkları",
            "Leave Server": "Sunucudan Ayrıl",
            "Delete Server": "Sunucuyu Sil",
            "People": "Kişiler",
            "Members": "Üyeler",
            "Roles": "Roller",
            "Moderation": "Moderasyon",
            "Audit Log": "Denetim Kaydı",
            "Bans": "Yasaklar",
            "NO BANS": "YASAK YOK",
            "Server Ban List": "Sunucu Yasak Listesi",
            "Safety Setup": "Güvenlik Kurulumu",
            "Create Your Server": "Sunucunuzu Oluşturun",
            "Create My Own": "Kendiminkini Oluşturayım",
            "Customize your server": "Sunucunuzu özelleştirin",
            "Server Name": "Sunucu Adı",
            "Your Server Name": "Sunucu Adınız",
            "Enter a server name.": "Bir sunucu adı girin.",
            "Create": "Oluştur",
            "Have an invite already?": "Zaten bir davetiniz var mı?",
            "Join a Server": "Bir Sunucuya Katıl",
            "Enter an invite link.": "Bir davet bağlantısı girin.",
            "Invite Link": "Davet Bağlantısı",
            "Join Server": "Sunucuya Katıl",
            "Change Server Icon": "Sunucu Simgesini Değiştir",
            "Banner": "Afiş",
            "Description": "Açıklama",

            // Settings Modal
            "Account": "Hesap",
            "Account Info": "Hesap Bilgileri",
            "My Account": "Hesabım",
            "Username": "Kullanıcı Adı",
            "Email": "E-posta",
            "Password": "Şifre",
            "Visibility": "Görünürlük",
            "Public account": "Herkese açık hesap",
            "Turn this off to hide your account from people who are not your friends.": "Hesabınızı arkadaşınız olmayan kişilerden gizlemek için bunu kapatın.",
            "Password &amp; Security": "Şifre ve Güvenlik",
            "Account Standing": "Hesap Durumu",
            "Family Center": "Aile Merkezi",
            "Data &amp; Privacy": "Veri ve Gizlilik",
            "Messaging Permissions": "Mesajlaşma İzinleri",
            "Enable notifications": "Bildirimleri etkinleştir",
            "Turn all notifications on or off.": "Tüm bildirimleri açın veya kapatın.",
            "Direct messages": "Doğrudan mesajlar",
            "Notify me when someone sends a message.": "Biri mesaj gönderdiğinde bana bildir.",
            "Friend requests": "Arkadaşlık istekleri",
            "Notify me when someone adds me.": "Biri beni eklediğinde bana bildir.",
            "Sounds": "Sesler",
            "Play a sound with notifications.": "Bildirimlerle ses çal.",
            "Appearance": "Görünüm",
            "Experience": "Deneyim",
            "Theme": "Tema",
            "White": "Açık",
            "Black": "Koyu",
            "White is the default. Black stays on until you switch it back.": "Açık tema varsayılandır. Değiştirene kadar koyu tema kalır.",
            "Language &amp; Time": "Dil ve Saat",
            "Language & Time": "Dil ve Saat",
            "Select a Language": "Dil Seç",
            "Choose the language you want Discord to display.": "Discord'un görüntülemesini istediğiniz dili seçin.",
            "Time format": "Saat formatı",
            "Auto": "Otomatik",
            "12-hour": "12 saat",
            "24-hour": "24 saat",
            "Change your username": "Kullanıcı adınızı değiştirin",
            "Enter a new username and your existing password.": "Yeni bir kullanıcı adı ve mevcut şifrenizi girin.",
            "Current Password": "Mevcut Şifre",
            "Update your password": "Şifrenizi güncelleyin",
            "Enter your current password and a new password.": "Mevcut şifrenizi ve yeni şifrenizi girin.",
            "New Password": "Yeni Şifre",
            "Confirm New Password": "Yeni Şifreyi Onayla",
            "Fill in all password fields.": "Tüm şifre alanlarını doldurun.",

            // Auth (Login & Register)
            "Welcome back!": "Tekrar hoş geldiniz!",
            "Sign in": "Giriş Yap",
            "Don't have an account?": "Hesabınız yok mu?",
            "Sign up": "Kayıt Ol",
            "Create an account": "Hesap oluştur",
            "Create account": "Hesap oluştur",
            "Already have an account?": "Zaten bir hesabınız var mı?",
            "Display Name": "Görünen Ad",
            "Date of Birth": "Doğum Tarihi",
            "Day": "Gün",
            "Month": "Ay",
            "Year": "Yıl",
            "January": "Ocak",
            "February": "Şubat",
            "March": "Mart",
            "April": "Nisan",
            "May": "Mayıs",
            "June": "Haziran",
            "July": "Temmuz",
            "August": "Ağustos",
            "September": "Eylül",
            "October": "Ekim",
            "November": "Kasım",
            "December": "Aralık",

            // Discover & Nitro & Social Media
            "Gaming": "Oyun",
            "Music": "Müzik",
            "Education": "Eğitim",
            "Science &amp; Tech": "Bilim ve Teknoloji",
            "Entertainment": "Eğlence",
            "Student Hubs": "Öğrenci Merkezleri",
            "Find your community on Discord": "Discord'da topluluğunu bul",
            "Featured communities": "Öne çıkan topluluklar",
            "Public Post": "Herkese Açık Gönderi",
            "Create Story": "Hikaye Oluştur",
            "Go Live": "Canlı Yayına Geç",
            "Add Photo/Video": "Fotoğraf/Video Ekle",
            "Your story": "Hikayeniz",
            "No public posts yet.": "Henüz herkese açık gönderi yok.",
            "No posts from friends yet.": "Henüz arkadaşlardan gönderi yok.",
            "Post": "Paylaş",
            "Social Media": "Sosyal Medya",
            "Active Live Streams": "Aktif Canlı Yayınlar",
            "Live Now": "Şimdi Canlı",
            "Watch Stream": "Yayını İzle",
            "Start Streaming": "Yayın Başlat",
            "Start Live Stream": "Canlı Yayını Başlat",
            "No active public live streams right now.": "Şu anda aktif herkese açık canlı yayın yok.",
            "Public Posts": "Herkese Açık Gönderiler",
            "Live Chat": "Canlı Sohbet",
            "Send a message...": "Bir mesaj gönder...",
            "End Stream": "Yayını Sonlandır",
            "Your Stream": "Yayınınız",
            "Stream Title": "Yayın Başlığı",
            "Public (Visible in Explore)": "Herkese Açık (Keşfet'te Görünür)",
            "Friends Only": "Sadece Arkadaşlar",
            "Add a comment...": "Yorum yap...",
            "End": "Bitir",
            "joined": "katıldı",
            "Follow": "Takip Et",
            "Following": "Takip Ediliyor",
            "LIVE": "CANLI"
        },
        "az": {
            // Navigation & Header
            "Friends": "Dostlar",
            "Direct Messages": "Birbaşa Mesajlar",
            "DIRECT MESSAGES": "BİRBAŞA MESAJLAR",
            "Servers": "Serverlər",
            "Discover": "Kəşf Et",
            "Media": "Media",
            "Nitro": "Nitro",
            "Settings": "Parametrlər",
            "Logout": "Çıxış",
            "Log out": "Çıxış",
            "Search": "Axtar",
            "Find or start a conversation": "Söhbət tapın və ya başladın",
            "Explore Discoverable Servers": "Kəşf Edilə Bilən Serverləri Kəşf Edin",
            "Quick Search": "Sürətli Axtarış",
            "Find users by username instantly": "İstifadəçi adına görə dərhal tap",
            "Home": "Ana Səhifə",
            "Explore": "Kəşf Et",

            // Friend Tabs & Statuses
            "Online": "Onlayn",
            "All Friends": "Bütün Dostlar",
            "All": "Hamısı",
            "Pending": "Gözləmədə",
            "Blocked": "Bloklandı",
            "Add Friend": "Dost Əlavə Et",
            "Add friend": "Dost Əlavə Et",
            "Send Friend Request": "Dostluq İstəyi Göndər",
            "You can add friends with their Discord username.": "Dostlarınızı Discord istifadəçi adları ilə əlavə edə bilərsiniz.",
            "Other Places to Make Friends": "Dost Qazanmaq Üçün Digər Yerlər",
            "Active Now": "İndi Aktiv",
            "It's quiet for now...": "Hələlik sakitlikdir...",
            "Idle": "Fəaliyyətsiz",
            "Do Not Disturb": "Narahat Etməyin",
            "Invisible": "Görünməz",
            "Offline": "Oflayn",
            "You will appear offline": "Oflayn görünəcəksiniz",
            "You will not receive desktop notifications": "Masaüstü bildirişləri almayacaqsınız",
            "No friends yet.": "Hələ dost yoxdur.",
            "No pending requests.": "Gözləyən sorğu yoxdur.",
            "No blocked users.": "Bloklanmış istifadəçi yoxdur.",
            "No friends found.": "Dost tapılmadı.",
            "No notifications": "Bildiriş yoxdur",
            "0 Unread": "0 Oxunmamış",
            "Mark all as read": "Hamısını oxunmuş kimi işarələ",
            "You're all caught up! Check back later for updates.": "Hər şeyi gördünüz! Yeniliklər üçün sonra yoxlayın.",
            "Status": "Status",
            "Action": "Əməliyyat",
            "User": "İstifadəçi",

            // Actions & Context Menus
            "Message": "Mesaj",
            "Bio": "Haqqında",
            "About": "Haqqında",
            "Note": "Qeyd",
            "Add Note": "Qeyd Əlavə Et",
            "Click to add a note": "Qeyd əlavə etmək üçün klikləyin",
            "only visible to you": "yalnız sizə görünür",
            "Only visible to you": "Yalnız sizə görünür",
            "Member Since": "Qoşulma Tarixi",
            "Edit Profile": "Profili Düzəlt",
            "Edit Profiles": "Profilləri Düzəlt",
            "Pronouns": "Əvəzliklər",
            "Add pronouns": "Əvəzlik əlavə et",
            "Set your status": "Statusunuzu təyin edin",
            "Clear tomorrow": "Sabah təmizlə",
            "Don't clear": "Təmizləmə",
            "30 minutes": "30 dəqiqə",
            "1 hour": "1 saat",
            "4 hours": "4 saat",
            "Today": "Bu gün",
            "Tomorrow": "Sabah",
            "Start a Call": "Zəng Başlat",
            "Call": "Zəng et",
            "Start Voice Call": "Səsli Zəng Başlat",
            "Start Video Call": "Video Zəng Başlat",
            "Invite to Voice": "Səsə Dəvət Et",
            "Voice Connected": "Səsə Qoşuldu",
            "Return to call": "Zəngə qayıt",
            "Add people to Voice Chat": "Səsli Çata insan əlavə et",
            "Join": "Qoşul",
            "Leave": "Ayrıl",
            "Mute": "Susdur",
            "Deafen": "Karlaşdır",
            "Join Voice": "Səsə Qoşul",
            "Pin": "Sancaqla",
            "Unpin": "Sancağı Çıxar",
            "Profile": "Profil",
            "Close DM": "DM-i Bağla",
            "Invite to Server": "Serverə Dəvət Et",
            "No servers": "Server yoxdur",
            "Block": "Blokla",
            "Block User": "İstifadəçini Blokla",
            "Unblock": "Blokdan Çıxar",
            "Remove Friend": "Dostu Sil",
            "Accept": "Qəbul Et",
            "Decline": "İmtina Et",
            "Cancel": "Ləğv Et",
            "Done": "Hazırdır",
            "Save": "Yadda Saxla",
            "Save Changes": "Dəyişiklikləri Saxla",
            "Edit": "Düzəliş Et",
            "Delete": "Sil",
            "Close": "Bağla",
            "Back": "Geri",
            "Copy": "Kopyala",
            "Copy Username": "İstifadəçi Adını Kopyala",

            // Direct Messages & Group
            "New Message": "Yeni Mesaj",
            "Create Message": "Mesaj Yarat",
            "Group DMs can have up to 10 members.": "Qrup DM-lərində maksimum 10 üzv ola bilər.",
            "Add friends or server members to group DMs.": "Qrup DM-lərinə dostlarınızı əlavə edin.",
            "Invite to Group DM": "Qrup DM-nə Dəvət Et",
            "Edit Group": "Qrupu Düzəlt",
            "Type a message...": "Bir mesaj yazın...",
            "Send": "Göndər",
            "Send Messages": "Mesaj Göndər",
            "Manage Messages": "Mesajları İdarə Et",
            "Pinned Messages": "Sancaqlandığı Mesajlar",
            "No servers in common": "Ortaq server yoxdur",
            "View Full Profile": "Tam Profilə Bax",

            // Channels & Servers
            "Text Channels": "Mətn Kanalları",
            "TEXT CHANNELS": "MƏTN KANALLARI",
            "Voice Channels": "Səs Kanalları",
            "VOICE CHANNELS": "SƏS KANALLARI",
            "No channels yet.": "Hələ kanal yoxdur.",
            "Hide Muted Channels": "Susturulmuş Kanalları Gizlət",
            "Create Channel": "Kanal Yarat",
            "Create Category": "Kateqoriya Yarat",
            "Edit Channel": "Kanalı Düzəlt",
            "Delete Channel": "Kanalı Sil",
            "Channel Name": "Kanal Adı",
            "Category Name": "Kateqoriya Adı",
            "Channel Type": "Kanal Növü",
            "Text": "Mətn",
            "Voice": "Səs",
            "Category": "Kateqoriya",
            "Private Channel": "Özəl Kanal",
            "Private Category": "Özəl Kateqoriya",
            "View Channel": "Kanala Bax",
            "Voice room": "Səs otağı",
            "Connect": "Qoşul",
            "Speak": "Danış",
            "Mute Members": "Üzvləri Susdur",
            "Server": "Server",
            "Server Profile": "Server Profili",
            "Server Settings": "Server Parametrləri",
            "Server Boost": "Server Gücləndirilməsi",
            "Boost Perks": "Gücləndirmə Üstünlükləri",
            "Leave Server": "Serverdən Ayrıl",
            "Delete Server": "Serveri Sil",
            "People": "İnsanlar",
            "Members": "Üzvlər",
            "Roles": "Rollar",
            "Moderation": "Moderasiya",
            "Audit Log": "Audit Girişi",
            "Bans": "Qadağalar",
            "NO BANS": "QADAĞA YOXDUR",
            "Server Ban List": "Server Qadağa Siyahısı",
            "Safety Setup": "Təhlükəsizlik Quraşdırması",
            "Create Your Server": "Serverinizi Yaradın",
            "Create My Own": "Özümünkini Yaradım",
            "Customize your server": "Serverinizi fərdiləşdirin",
            "Server Name": "Server Adı",
            "Your Server Name": "Serverinizin Adı",
            "Enter a server name.": "Server adı daxil edin.",
            "Create": "Yarat",
            "Have an invite already?": "Artıq dəvətiniz var?",
            "Join a Server": "Bir Serverə Qoşul",
            "Enter an invite link.": "Dəvət linki daxil edin.",
            "Invite Link": "Dəvət Linki",
            "Join Server": "Serverə Qoşul",
            "Change Server Icon": "Server İkonunu Dəyişdir",
            "Banner": "Banner",
            "Description": "Təsvir",

            // Settings Modal
            "Account": "Hesab",
            "Account Info": "Hesab Məlumatı",
            "My Account": "Hesabım",
            "Username": "İstifadəçi Adı",
            "Email": "E-poçt",
            "Password": "Şifrə",
            "Visibility": "Görünürlük",
            "Public account": "İctimai hesab",
            "Turn this off to hide your account from people who are not your friends.": "Hesabınızı dost olmayan insanlardan gizlətmək üçün bunu söndürün.",
            "Password &amp; Security": "Şifrə və Təhlükəsizlik",
            "Account Standing": "Hesab Vəziyyəti",
            "Family Center": "Ailə Mərkəzi",
            "Data &amp; Privacy": "Məlumat və Məxfilik",
            "Messaging Permissions": "Mesajlaşma İcazələri",
            "Enable notifications": "Bildirişləri aktivləşdir",
            "Turn all notifications on or off.": "Bütün bildirişləri açın və ya söndürün.",
            "Direct messages": "Birbaşa mesajlar",
            "Notify me when someone sends a message.": "Kimsə mesaj göndərəndə mənə bildir.",
            "Friend requests": "Dostluq sorğuları",
            "Notify me when someone adds me.": "Kimsə məni əlavə edəndə mənə bildir.",
            "Sounds": "Səslər",
            "Play a sound with notifications.": "Bildirişlərlə səs çal.",
            "Appearance": "Görünüş",
            "Experience": "Təcrübə",
            "Theme": "Mövzu",
            "White": "Açıq",
            "Black": "Qaranlıq",
            "White is the default. Black stays on until you switch it back.": "Açıq mövzu standartdır. Qaranlıq dəyişdirənə qədər qalır.",
            "Language &amp; Time": "Dil və Vaxt",
            "Language & Time": "Dil və Vaxt",
            "Select a Language": "Dil Seç",
            "Choose the language you want Discord to display.": "Discord-un göstərməsini istədiyiniz dili seçin.",
            "Time format": "Saat formatı",
            "Auto": "Avtomatik",
            "12-hour": "12-saat",
            "24-hour": "24-saat",
            "Change your username": "İstifadəçi adınızı dəyişdirin",
            "Enter a new username and your existing password.": "Yeni istifadəçi adı və hazırkı şifrənizi daxil edin.",
            "Current Password": "Hazırkı Şifrə",
            "Update your password": "Şifrənizi yeniləyin",
            "Enter your current password and a new password.": "Hazırkı şifrənizi və yeni şifrə daxil edin.",
            "New Password": "Yeni Şifrə",
            "Confirm New Password": "Yeni Şifrəni Təsdiqləyin",
            "Fill in all password fields.": "Bütün şifrə xanalarını doldurun.",

            // Auth (Login & Register)
            "Welcome back!": "Xoş gəldiniz!",
            "Sign in": "Daxil Ol",
            "Don't have an account?": "Hesabınız yoxdur?",
            "Sign up": "Qeydiyyatdan Keç",
            "Create an account": "Hesab yaradın",
            "Create account": "Hesab yaradın",
            "Already have an account?": "Artıq hesabınız var?",
            "Display Name": "Görünən Ad",
            "Date of Birth": "Doğum Tarixi",
            "Day": "Gün",
            "Month": "Ay",
            "Year": "İl",
            "January": "Yanvar",
            "February": "Fevral",
            "March": "Mart",
            "April": "Aprel",
            "May": "May",
            "June": "İyun",
            "July": "İyul",
            "August": "Avqust",
            "September": "Sentyabr",
            "October": "Oktyabr",
            "November": "Noyabr",
            "December": "Dekabr",

            // Discover & Nitro & Social Media
            "Gaming": "Oyun",
            "Music": "Musiqi",
            "Education": "Təhsil",
            "Science &amp; Tech": "Elm və Texnologiya",
            "Entertainment": "Əyləncə",
            "Student Hubs": "Tələbə Mərkəzləri",
            "Find your community on Discord": "Discord-da öz icmanı tap",
            "Featured communities": "Seçilmiş icmalar",
            "Public Post": "İctimai Paylaşım",
            "Create Story": "Hekayə Yarat",
            "Go Live": "Canlı Yayıma Başla",
            "Add Photo/Video": "Foto/Video Əlavə Et",
            "Your story": "Sizin hekayəniz",
            "No public posts yet.": "Hələ ictimai paylaşım yoxdur.",
            "No posts from friends yet.": "Hələ dostlardan paylaşım yoxdur.",
            "Post": "Paylaş",
            "Social Media": "Sosyal Media",
            "Active Live Streams": "Aktiv Canlı Yayımlar",
            "Live Now": "İndi Canlı",
            "Watch Stream": "Yayıma Bax",
            "Start Streaming": "Yayıma Başla",
            "Start Live Stream": "Canlı Yayıma Başla",
            "No active public live streams right now.": "Hazırda aktiv ictimai canlı yayım yoxdur.",
            "Public Posts": "İctimai Paylaşımlar",
            "Live Chat": "Canlı Söhbət",
            "Send a message...": "Mesaj göndər...",
            "End Stream": "Yayımı Bitir",
            "Your Stream": "Yayımınız",
            "Stream Title": "Yayım Başlığı",
            "Public (Visible in Explore)": "Hamıya Açıq (Kəşf Et-də Görünür)",
            "Friends Only": "Yalnız Dostlar",
            "Add a comment...": "Rəy yaz...",
            "End": "Bitir",
            "joined": "qoşuldu",
            "Follow": "İzlə",
            "Following": "İzlənilir",
            "LIVE": "CANLI"
        }
    };

    var FLAG_MAP = {
        "en": { flag: "us", native: "English", sub: "English" },
        "tr": { flag: "tr", native: "Türkçe", sub: "Turkish" },
        "az": { flag: "az", native: "Azərbaycan", sub: "Azerbaijan" }
    };

    function getSavedLang() {
        try {
            var val = localStorage.getItem(STORAGE_KEY);
            if (val === "tr" || val === "az" || val === "en") return val;
        } catch (e) {}
        return "en";
    }

    function saveLang(lang) {
        try {
            localStorage.setItem(STORAGE_KEY, lang);
        } catch (e) {}
    }

    function translateText(str, targetLang) {
        if (!str || targetLang === "en") return str;
        var dict = TRANSLATIONS[targetLang];
        if (!dict) return str;
        if (dict[str]) return dict[str];
        return str;
    }

    function translateElement(el, targetLang) {
        if (!el || el.nodeType !== 1) return;
        var tag = el.tagName.toLowerCase();
        if (tag === "script" || tag === "style" || tag === "svg" || tag === "code" || tag === "pre") return;

        // 1. Check data-i18n attribute
        var i18nAttr = el.getAttribute("data-i18n");
        if (i18nAttr) {
            var trans = (targetLang === "en") ? i18nAttr : translateText(i18nAttr, targetLang);
            if (trans && el.children.length === 0 && el.textContent !== trans) {
                el.textContent = trans;
            }
        }

        // 2. Check input/textarea placeholders
        if (tag === "input" || tag === "textarea") {
            var ph = el.getAttribute("placeholder");
            if (ph) {
                if (!el.hasAttribute("data-i18n-ph-key")) {
                    el.setAttribute("data-i18n-ph-key", ph);
                }
                var phKey = el.getAttribute("data-i18n-ph-key");
                var phTrans = (targetLang === "en") ? phKey : translateText(phKey, targetLang);
                if (phTrans && el.getAttribute("placeholder") !== phTrans) {
                    el.setAttribute("placeholder", phTrans);
                }
            }
        }

        // 3. Check data-i18n-placeholder
        var phCustom = el.getAttribute("data-i18n-placeholder");
        if (phCustom) {
            var phTrans2 = (targetLang === "en") ? phCustom : translateText(phCustom, targetLang);
            if (phTrans2) el.setAttribute("placeholder", phTrans2);
        }

        // 4. Translate direct text nodes (safely without breaking nested icons/elements)
        var childNodes = el.childNodes;
        for (var i = 0; i < childNodes.length; i++) {
            var node = childNodes[i];
            if (node.nodeType === 3) { // TEXT_NODE
                var text = node.nodeValue;
                var trimmed = text.trim();
                if (!trimmed || trimmed.length < 2) continue;

                var origKey = node._originalKey;
                if (!origKey) {
                    if (TRANSLATIONS["tr"][trimmed] || TRANSLATIONS["az"][trimmed]) {
                        origKey = trimmed;
                        node._originalKey = trimmed;
                    }
                }

                if (origKey) {
                    var newText = (targetLang === "en") ? origKey : translateText(origKey, targetLang);
                    if (newText && newText !== trimmed) {
                        var leading = text.match(/^\s*/)[0];
                        var trailing = text.match(/\s*$/)[0];
                        node.nodeValue = leading + newText + trailing;
                    }
                }
            }
        }
    }

    function translateTree(root, targetLang) {
        if (!root) return;
        var walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT, null, false);
        var current = walker.currentNode;
        while (current) {
            translateElement(current, targetLang);
            current = walker.nextNode();
        }
    }

    function syncLanguageUI(lang) {
        var info = FLAG_MAP[lang] || FLAG_MAP["en"];

        // 1. Update flag in settings input field
        var fieldFlag = document.getElementById("lang-field-flag");
        if (fieldFlag) {
            fieldFlag.src = "https://flagcdn.com/w40/" + info.flag + ".png";
        }

        // 2. Update search input in settings
        var langSearch = document.getElementById("lang-search");
        if (langSearch) {
            langSearch.value = info.native;
        }

        // 3. Update active item in settings lang list
        var langList = document.getElementById("lang-select-list");
        if (langList) {
            var buttons = langList.querySelectorAll("button");
            for (var b = 0; b < buttons.length; b++) {
                var btnFlag = buttons[b].getAttribute("data-flag");
                var isMatch = btnFlag === info.flag;
                buttons[b].classList.toggle("on", isMatch);
            }
        }
    }

    function applyLanguage(lang) {
        if (!lang) lang = getSavedLang();
        saveLang(lang);
        document.documentElement.lang = lang;
        translateTree(document.body, lang);
        syncLanguageUI(lang);

        window.dispatchEvent(new CustomEvent("discode:langchange", { detail: { lang: lang } }));
    }

    function bindLangControls() {
        var langSearch = document.getElementById("lang-search");
        var langList = document.getElementById("lang-select-list");
        var langBox = langSearch ? langSearch.closest(".lang-box") : null;
        var langChevron = document.getElementById("lang-chevron");

        if (langList) {
            function setListOpen(open) {
                langList.hidden = !open;
                if (langBox) langBox.classList.toggle("open", open);
                if (langChevron) langChevron.className = "fa-solid " + (open ? "fa-chevron-up" : "fa-chevron-down");
            }

            var langField = langSearch ? langSearch.closest(".lang-field") : null;
            if (langField) {
                langField.addEventListener("click", function (e) {
                    if (langList.contains(e.target)) return;
                    setListOpen(langList.hidden);
                });
            }

            langList.addEventListener("click", function (e) {
                var btn = e.target.closest("button");
                if (!btn) return;
                var flag = btn.getAttribute("data-flag");
                var code = flag === "tr" ? "tr" : (flag === "az" ? "az" : "en");
                setListOpen(false);
                applyLanguage(code);
            });

            document.addEventListener("click", function (e) {
                if (langBox && !langBox.contains(e.target) && !langList.hidden) {
                    setListOpen(false);
                }
            });
        }
    }

    function setupObserver() {
        if (typeof MutationObserver === "undefined" || !document.body) return;
        var observer = new MutationObserver(function (mutations) {
            var cur = getSavedLang();
            if (cur === "en") return;
            for (var i = 0; i < mutations.length; i++) {
                var mut = mutations[i];
                if (mut.addedNodes && mut.addedNodes.length > 0) {
                    for (var n = 0; n < mut.addedNodes.length; n++) {
                        var node = mut.addedNodes[n];
                        if (node.nodeType === 1) {
                            translateTree(node, cur);
                        }
                    }
                }
            }
        });

        observer.observe(document.body, { childList: true, subtree: true });
    }

    window.DiscodeLang = {
        get: getSavedLang,
        set: function (code) {
            applyLanguage(code);
        },
        t: function (key) {
            return translateText(key, getSavedLang());
        },
        apply: function () {
            applyLanguage(getSavedLang());
        },
        translations: TRANSLATIONS
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", function () {
            bindLangControls();
            applyLanguage(getSavedLang());
            setupObserver();
        });
    } else {
        bindLangControls();
        applyLanguage(getSavedLang());
        setupObserver();
    }
})();
