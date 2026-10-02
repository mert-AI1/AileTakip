import {
  initializeApp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";

import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  collection,
  addDoc,
  getDocs,
  query,
  where,
  limit
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";


/* =========================
   FIREBASE
========================= */

const firebaseConfig = {
  apiKey: "AIzaSyBbcmDCB3Yfw69TTwKKrMrKNKj-eEK7A8o",
  authDomain: "ailetakip-9e888.firebaseapp.com",
  projectId: "ailetakip-9e888",
  storageBucket: "ailetakip-9e888.firebasestorage.app",
  messagingSenderId: "48061317195",
  appId: "1:48061317195:web:e27852c6196da6e814cdce",
  measurementId: "G-YLJJ2R5MG3"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let mode = "login";
let watch = null;


/* =========================
   KISA YARDIMCILAR
========================= */

const $ = id => document.getElementById(id);

function toast(message) {
  const box = $("toast");

  if (!box) return;

  box.textContent = message;
  box.style.display = "block";

  setTimeout(() => {
    box.style.display = "none";
  }, 2500);
}


/* =========================
   GİRİŞ / KAYIT SEKME
========================= */

$("loginTab").onclick = () => {

  mode = "login";

  $("loginTab").classList.add("on");
  $("registerTab").classList.remove("on");

  $("authSubmit").textContent = "Giriş Yap";
  $("msg").textContent = "";
};


$("registerTab").onclick = () => {

  mode = "register";

  $("registerTab").classList.add("on");
  $("loginTab").classList.remove("on");

  $("authSubmit").textContent = "Kayıt Ol";
  $("msg").textContent = "";
};


/* =========================
   GİRİŞ / KAYIT
========================= */

$("authForm").onsubmit = async event => {

  event.preventDefault();

  const email = $("email").value.trim();
  const password = $("password").value;

  $("msg").textContent = "İşlem yapılıyor...";

  try {

    if (mode === "login") {

      await signInWithEmailAndPassword(
        auth,
        email,
        password
      );

      $("msg").textContent = "";

      toast("Giriş başarılı.");

    } else {

      const result =
        await createUserWithEmailAndPassword(
          auth,
          email,
          password
        );

      await setDoc(
        doc(db, "users", result.user.uid),
        {
          email: email,
          createdAt: Date.now()
        },
        {
          merge: true
        }
      );

      $("msg").textContent = "";

      toast("Hesabınız oluşturuldu.");

    }

  } catch (error) {

    console.error(error);

    let message = "Bir hata oluştu.";

    if (error.code === "auth/email-already-in-use") {
      message = "Bu e-posta zaten kayıtlı.";
    }

    else if (error.code === "auth/invalid-email") {
      message = "Geçerli bir e-posta adresi girin.";
    }

    else if (error.code === "auth/weak-password") {
      message = "Şifre en az 6 karakter olmalıdır.";
    }

    else if (
      error.code === "auth/invalid-credential" ||
      error.code === "auth/wrong-password" ||
      error.code === "auth/user-not-found"
    ) {
      message = "E-posta veya şifre hatalı.";
    }

    $("msg").textContent = message;
  }
};


/* =========================
   OTURUM KONTROLÜ
========================= */

onAuthStateChanged(auth, async user => {

  if (user) {

    $("auth").style.display = "none";
    $("app").style.display = "block";
    $("logout").style.display = "block";

    await loadUserFamily(user.uid);

    await loadHistory(user.uid);

  } else {

    $("auth").style.display = "block";
    $("app").style.display = "none";
    $("logout").style.display = "none";
  }

});


/* =========================
   ÇIKIŞ
========================= */

$("logout").onclick = async () => {

  try {

    if (watch !== null) {
      navigator.geolocation.clearWatch(watch);
      watch = null;
    }

    await signOut(auth);

    sharing(false);

    toast("Çıkış yapıldı.");

  } catch (error) {

    console.error(error);

  }

};


/* =========================
   KULLANICI AİLESİNİ GETİR
========================= */

async function loadUserFamily(uid) {

  try {

    const userRef = doc(db, "users", uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      $("familyInfo").textContent = "Henüz bir aileniz yok.";
      return;
    }

    const data = userSnap.data();

    if (!data.familyId) {
      $("familyInfo").textContent = "Henüz bir aileniz yok.";
      return;
    }

    const familyRef = doc(db, "families", data.familyId);
    const familySnap = await getDoc(familyRef);

    if (!familySnap.exists()) {
      $("familyInfo").textContent = "Aile bulunamadı.";
      return;
    }

    const family = familySnap.data();

    $("familyInfo").innerHTML =
      `<b>${escapeHtml(family.name)}</b><br>
       Davet kodu: <strong>${escapeHtml(family.code)}</strong>`;

  } catch (error) {

    console.error(error);

    $("familyInfo").textContent =
      "Aile bilgileri yüklenemedi.";
  }
}


/* =========================
   AİLE OLUŞTUR
========================= */

$("create").onclick = async () => {

  const user = auth.currentUser;

  if (!user) {
    toast("Önce giriş yapmalısınız.");
    return;
  }

  const name =
    $("familyName").value.trim() || "Ailem";

  const code =
    Math.random()
      .toString(36)
      .substring(2, 8)
      .toUpperCase();

  try {

    const familyRef =
      doc(collection(db, "families"));

    await setDoc(familyRef, {

      name: name,
      code: code,
      ownerId: user.uid,
      createdAt: Date.now()

    });

    await setDoc(
      doc(db, "users", user.uid),
      {
        familyId: familyRef.id,
        email: user.email
      },
      {
        merge: true
      }
    );

    $("familyInfo").innerHTML =
      `<b>${escapeHtml(name)}</b><br>
       Davet kodu: <strong>${code}</strong>`;

    toast("Aile oluşturuldu.");

  } catch (error) {

    console.error(error);

    toast("Aile oluşturulamadı.");
  }
};


/* =========================
   AİLEYE KATIL
========================= */

$("join").onclick = async () => {

  const user = auth.currentUser;

  if (!user) {
    toast("Önce giriş yapmalısınız.");
    return;
  }

  const code =
    $("code").value.trim().toUpperCase();

  if (!code) {
    toast("Davet kodunu girin.");
    return;
  }

  try {

    const result = await getDocs(
      query(
        collection(db, "families"),
        where("code", "==", code),
        limit(1)
      )
    );

    if (result.empty) {

      toast("Davet kodu bulunamadı.");
      return;
    }

    const family = result.docs[0];

    await setDoc(
      doc(db, "users", user.uid),
      {
        familyId: family.id,
        email: user.email
      },
      {
        merge: true
      }
    );

    const familyData = family.data();

    $("familyInfo").innerHTML =
      `<b>${escapeHtml(familyData.name)}</b><br>
       Davet kodu: <strong>${escapeHtml(familyData.code)}</strong>`;

    toast("Aileye katıldınız.");

  } catch (error) {

    console.error(error);

    toast("Aileye katılırken hata oluştu.");
  }
};


/* =========================
   KONUM PAYLAŞIM DURUMU
========================= */

function sharing(on) {

  $("status").textContent =
    on
      ? "● Konum paylaşımı açık"
      : "● Konum paylaşımı kapalı";

  $("status").style.color =
    on
      ? "#63e6a8"
      : "#aaa";
}


/* =========================
   KONUMU FIRESTORE'A KAYDET
========================= */

async function save(position) {

  const user = auth.currentUser;

  if (!user) return;

  try {

    await addDoc(
      collection(db, "locations"),
      {

        uid: user.uid,

        latitude:
          position.coords.latitude,

        longitude:
          position.coords.longitude,

        accuracy:
          position.coords.accuracy,

        createdAt: Date.now()

      }
    );

    const pin = $("pin");

    pin.style.display = "block";
    pin.style.left = "50%";
    pin.style.top = "50%";

    await loadHistory(user.uid);

  } catch (error) {

    console.error(error);

    toast("Konum kaydedilemedi.");
  }
}


/* =========================
   KONUM PAYLAŞIMINI BAŞLAT
========================= */

function start() {

  if (!navigator.geolocation) {

    toast(
      "Bu tarayıcı konum özelliğini desteklemiyor."
    );

    return;
  }

  navigator.geolocation.getCurrentPosition(

    position => {

      save(position);

      toast("Konumunuz alındı.");

    },

    error => {

      console.error(error);

      toast(
        "Konum izni alınamadı. Tarayıcı izinlerini kontrol edin."
      );

    },

    {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0
    }

  );


  watch =
    navigator.geolocation.watchPosition(

      position => {

        save(position);

      },

      error => {

        console.error(error);

      },

      {
        enableHighAccuracy: true,
        maximumAge: 10000,
        timeout: 15000
      }

    );

  sharing(true);
}


/* =========================
   BUTONLAR
========================= */

$("share").onclick = () => {

  start();

  toast("Konum paylaşımı açıldı.");
};


$("locate").onclick = () => {

  start();

};


$("stop").onclick = () => {

  if (watch !== null) {

    navigator.geolocation.clearWatch(watch);

    watch = null;
  }

  sharing(false);

  toast("Konum paylaşımı durduruldu.");
};


/* =========================
   KONUM GEÇMİŞİ
========================= */

async function loadHistory(uid) {

  try {

    const result = await getDocs(
      query(
        collection(db, "locations"),
        where("uid", "==", uid),
        limit(10)
      )
    );

    if (result.empty) {

      $("historyList").textContent =
        "Henüz kayıt yok.";

      return;
    }

    const locations =
      result.docs
        .map(doc => doc.data())
        .sort(
          (a, b) =>
            b.createdAt - a.createdAt
        );

    $("historyList").innerHTML =
      locations
        .map(location => {

          const date =
            new Date(
              location.createdAt
            ).toLocaleString("tr-TR");

          return `
            <div class="historyItem">
              ${date}
            </div>
          `;

        })
        .join("");

  } catch (error) {

    console.error(error);

    $("historyList").textContent =
      "Geçmiş yüklenemedi. Firestore ayarlarını kontrol edin.";
  }
}


/* =========================
   GÜVENLİ HTML
========================= */

function escapeHtml(value) {

  return String(value)

    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
