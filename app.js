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


/* =====================================================
   FIREBASE
===================================================== */

const firebaseConfig = {
  apiKey: "AIzaSyBbcmDCB3Yfw69TTwKKrMrKNKj-eEK7A8o",
  authDomain: "ailetakip-9e888.firebaseapp.com",
  projectId: "ailetakip-9e888",
  storageBucket: "ailetakip-9e888.firebasestorage.app",
  messagingSenderId: "48061317195",
  appId: "1:48061317195:web:d4bd10f862c119c314cdce",
  measurementId: "G-9CKC2XNHBE"
};

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);

const db = getFirestore(app);


/* =====================================================
   DEĞİŞKENLER
===================================================== */

let mode = "login";

let watch = null;


/* =====================================================
   KISA YARDIMCILAR
===================================================== */

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


/* =====================================================
   GİRİŞ / KAYIT SEKME
===================================================== */

if ($("loginTab")) {

  $("loginTab").onclick = () => {

    mode = "login";

    $("loginTab").classList.add("on");

    $("registerTab").classList.remove("on");

    $("authSubmit").textContent = "Giriş Yap";

    $("msg").textContent = "";

  };

}


if ($("registerTab")) {

  $("registerTab").onclick = () => {

    mode = "register";

    $("registerTab").classList.add("on");

    $("loginTab").classList.remove("on");

    $("authSubmit").textContent = "Kayıt Ol";

    $("msg").textContent = "";

  };

}


/* =====================================================
   GİRİŞ / KAYIT
===================================================== */

if ($("authForm")) {

  $("authForm").onsubmit = async event => {

    event.preventDefault();

    const email =
      $("email").value.trim();

    const password =
      $("password").value;


    $("msg").textContent =
      "İşlem yapılıyor...";


    try {

      /* -------------------------
         GİRİŞ
      ------------------------- */

      if (mode === "login") {

        await signInWithEmailAndPassword(
          auth,
          email,
          password
        );

        $("msg").textContent = "";

        toast("Giriş başarılı.");

      }


      /* -------------------------
         KAYIT
      ------------------------- */

      else {

        const result =
          await createUserWithEmailAndPassword(
            auth,
            email,
            password
          );


        await setDoc(

          doc(
            db,
            "users",
            result.user.uid
          ),

          {

            email: email,

            createdAt: Date.now(),

            familyId: null

          },

          {

            merge: true

          }

        );


        $("msg").textContent = "";

        toast(
          "Hesabınız oluşturuldu."
        );

      }

    }


    /* -------------------------
       HATA
    ------------------------- */

    catch (error) {

      console.error(error);

      let message =
        "Bir hata oluştu.";


      if (
        error.code ===
        "auth/email-already-in-use"
      ) {

        message =
          "Bu e-posta zaten kayıtlı.";

      }


      else if (
        error.code ===
        "auth/invalid-email"
      ) {

        message =
          "Geçerli bir e-posta adresi girin.";

      }


      else if (
        error.code ===
        "auth/weak-password"
      ) {

        message =
          "Şifre en az 6 karakter olmalıdır.";

      }


      else if (
        error.code ===
        "auth/invalid-credential" ||

        error.code ===
        "auth/wrong-password" ||

        error.code ===
        "auth/user-not-found"
      ) {

        message =
          "E-posta veya şifre hatalı.";

      }


      else if (
        error.code ===
        "auth/too-many-requests"
      ) {

        message =
          "Çok fazla deneme yapıldı. Bir süre sonra tekrar deneyin.";

      }


      $("msg").textContent =
        message;

    }

  };

}


/* =====================================================
   OTURUM KONTROLÜ
===================================================== */

onAuthStateChanged(
  auth,
  async user => {

    if (user) {

      if ($("auth")) {

        $("auth").style.display =
          "none";

      }


      if ($("app")) {

        $("app").style.display =
          "block";

      }


      if ($("logout")) {

        $("logout").style.display =
          "block";

      }


      await loadUserFamily(
        user.uid
      );


      await loadHistory(
        user.uid
      );

    }


    else {

      if ($("auth")) {

        $("auth").style.display =
          "block";

      }


      if ($("app")) {

        $("app").style.display =
          "none";

      }


      if ($("logout")) {

        $("logout").style.display =
          "none";

      }

    }

  }
);


/* =====================================================
   ÇIKIŞ
===================================================== */

if ($("logout")) {

  $("logout").onclick = async () => {

    try {

      if (watch !== null) {

        navigator.geolocation.clearWatch(
          watch
        );

        watch = null;

      }


      await signOut(auth);


      sharing(false);


      toast(
        "Çıkış yapıldı."
      );

    }


    catch (error) {

      console.error(error);

    }

  };

}


/* =====================================================
   KULLANICI AİLESİNİ GETİR
===================================================== */

async function loadUserFamily(uid) {

  try {

    const userRef =
      doc(
        db,
        "users",
        uid
      );


    const userSnap =
      await getDoc(
        userRef
      );


    if (!userSnap.exists()) {

      if ($("familyInfo")) {

        $("familyInfo").textContent =
          "Henüz bir aileniz yok.";

      }

      return;

    }


    const data =
      userSnap.data();


    if (!data.familyId) {

      if ($("familyInfo")) {

        $("familyInfo").textContent =
          "Henüz bir aileniz yok.";

      }

      return;

    }


    const familyRef =
      doc(
        db,
        "families",
        data.familyId
      );


    const familySnap =
      await getDoc(
        familyRef
      );


    if (!familySnap.exists()) {

      if ($("familyInfo")) {

        $("familyInfo").textContent =
          "Aile bulunamadı.";

      }

      return;

    }


    const family =
      familySnap.data();


    if ($("familyInfo")) {

      $("familyInfo").innerHTML =

        `<b>${escapeHtml(
          family.name
        )}</b><br>

        Davet kodu:

        <strong>${escapeHtml(
          family.code
        )}</strong>`;

    }

  }


  catch (error) {

    console.error(error);


    if ($("familyInfo")) {

      $("familyInfo").textContent =
        "Aile bilgileri yüklenemedi.";

    }

  }

}


/* =====================================================
   AİLE OLUŞTUR
===================================================== */

if ($("create")) {

  $("create").onclick = async () => {

    const user =
      auth.currentUser;


    if (!user) {

      toast(
        "Önce giriş yapmalısınız."
      );

      return;

    }


    const name =
      $("familyName").value.trim()
      || "Ailem";


    const code =
      Math.random()
        .toString(36)
        .substring(2, 8)
        .toUpperCase();


    try {

      const familyRef =
        doc(
          collection(
            db,
            "families"
          )
        );


      await setDoc(

        familyRef,

        {

          name: name,

          code: code,

          ownerId: user.uid,

          createdAt: Date.now()

        }

      );


      await setDoc(

        doc(
          db,
          "users",
          user.uid
        ),

        {

          familyId:
            familyRef.id,

          email:
            user.email

        },

        {

          merge: true

        }

      );


      if ($("familyInfo")) {

        $("familyInfo").innerHTML =

          `<b>${escapeHtml(
            name
          )}</b><br>

          Davet kodu:

          <strong>${escapeHtml(
            code
          )}</strong>`;

      }


      toast(
        "Aile oluşturuldu."
      );

    }


    catch (error) {

      console.error(error);

      toast(
        "Aile oluşturulamadı."
      );

    }

  };

}


/* =====================================================
   AİLEYE KATIL
===================================================== */

if ($("join")) {

  $("join").onclick = async () => {

    const user =
      auth.currentUser;


    if (!user) {

      toast(
        "Önce giriş yapmalısınız."
      );

      return;

    }


    const code =
      $("code").value
        .trim()
        .toUpperCase();


    if (!code) {

      toast(
        "Davet kodunu girin."
      );

      return;

    }


    try {

      const result =
        await getDocs(

          query(

            collection(
              db,
              "families"
            ),

            where(
              "code",
              "==",
              code
            ),

            limit(1)

          )

        );


      if (result.empty) {

        toast(
          "Davet kodu bulunamadı."
        );

        return;

      }


      const family =
        result.docs[0];


      await setDoc(

        doc(
          db,
          "users",
          user.uid
        ),

        {

          familyId:
            family.id,

          email:
            user.email

        },

        {

          merge: true

        }

      );


      const familyData =
        family.data();


      if ($("familyInfo")) {

        $("familyInfo").innerHTML =

          `<b>${escapeHtml(
            familyData.name
          )}</b><br>

          Davet kodu:

          <strong>${escapeHtml(
            familyData.code
          )}</strong>`;

      }


      toast(
        "Aileye katıldınız."
      );

    }


    catch (error) {

      console.error(error);

      toast(
        "Aileye katılırken hata oluştu."
      );

    }

  };

}


/* =====================================================
   KONUM PAYLAŞIM DURUMU
===================================================== */

function sharing(on) {

  if (!$("status")) return;


  $("status").textContent =

    on

      ? "● Konum paylaşımı açık"

      : "● Konum paylaşımı kapalı";


  $("status").style.color =

    on

      ? "#63e6a8"

      : "#aaa";

}


/* =====================================================
   KONUMU FIRESTORE'A KAYDET
===================================================== */

async function save(position) {

  const user =
    auth.currentUser;


  if (!user) return;


  try {

    await addDoc(

      collection(
        db,
        "locations"
      ),

      {

        uid:
          user.uid,

        latitude:
          position.coords.latitude,

        longitude:
          position.coords.longitude,

        accuracy:
          position.coords.accuracy,

        createdAt:
          Date.now()

      }

    );


    if ($("pin")) {

      $("pin").style.display =
        "block";

      $("pin").style.left =
        "50%";

      $("pin").style.top =
        "50%";

    }


    await loadHistory(
      user.uid
    );

  }


  catch (error) {

    console.error(error);

    toast(
      "Konum kaydedilemedi."
    );

  }

}


/* =====================================================
   KONUM PAYLAŞIMINI BAŞLAT
===================================================== */

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

      toast(
        "Konumunuz alındı."
      );

    },


    error => {

      console.error(error);

      toast(
        "Konum izni alınamadı. Tarayıcı izinlerini kontrol edin."
      );

    },


    {

      enableHighAccuracy:
        true,

      timeout:
        15000,

      maximumAge:
        0

    }

  );


  if (watch !== null) {

    navigator.geolocation.clearWatch(
      watch
    );

  }


  watch =
    navigator.geolocation.watchPosition(

      position => {

        save(position);

      },


      error => {

        console.error(error);

      },


      {

        enableHighAccuracy:
          true,

        maximumAge:
          10000,

        timeout:
          15000

      }

    );


  sharing(true);

}


/* =====================================================
   KONUM PAYLAŞ BUTONU
===================================================== */

if ($("share")) {

  $("share").onclick = () => {

    start();

    toast(
      "Konum paylaşımı açıldı."
    );

  };

}


/* =====================================================
   KONUMU BUL
===================================================== */

if ($("locate")) {

  $("locate").onclick = () => {

    start();

  };

}


/* =====================================================
   KONUM PAYLAŞIMINI DURDUR
===================================================== */

if ($("stop")) {

  $("stop").onclick = () => {

    if (watch !== null) {

      navigator.geolocation.clearWatch(
        watch
      );

      watch = null;

    }


    sharing(false);


    toast(
      "Konum paylaşımı durduruldu."
    );

  };

}


/* =====================================================
   KONUM GEÇMİŞİ
===================================================== */

async function loadHistory(uid) {

  try {

    const result =
      await getDocs(

        query(

          collection(
            db,
            "locations"
          ),

          where(
            "uid",
            "==",
            uid
          ),

          limit(10)

        )

      );


    if (result.empty) {

      if ($("historyList")) {

        $("historyList").textContent =
          "Henüz kayıt yok.";

      }

      return;

    }


    const locations =

      result.docs

        .map(
          document =>
            document.data()
        )

        .sort(

          (a, b) =>
            b.createdAt -
            a.createdAt

        );


    if ($("historyList")) {

      $("historyList").innerHTML =

        locations

          .map(location => {

            const date =

              new Date(
                location.createdAt
              )
                .toLocaleString(
                  "tr-TR"
                );


            return `

              <div class="historyItem">

                ${escapeHtml(date)}

              </div>

            `;

          })

          .join("");

    }

  }


  catch (error) {

    console.error(error);


    if ($("historyList")) {

      $("historyList").textContent =
        "Geçmiş yüklenemedi. Firestore ayarlarını kontrol edin.";

    }

  }

}


/* =====================================================
   GÜVENLİ HTML
===================================================== */

function escapeHtml(value) {

  return String(value)

    .replaceAll(
      "&",
      "&amp;"
    )

    .replaceAll(
      "<",
      "&lt;"
    )

    .replaceAll(
      ">",
      "&gt;"
    )

    .replaceAll(
      '"',
      "&quot;"
    )

    .replaceAll(
      "'",
      "&#039;"
    );

}
