// signup.js
async function signUp(email, password) {
  try {
    if (!email || !password) {
      throw new Error("Email et mot de passe requis !");
    }

    const userCredential = await firebase.auth().createUserWithEmailAndPassword(email, password);
    const user = userCredential.user;

    console.log("✅ Utilisateur créé:", user.uid);

    await firebase.firestore().collection("users").doc(user.uid).set({
      username: email.split("@")[0],
      avatar: `https://i.pravatar.cc/150?img=${Math.floor(Math.random() * 70)}`,
      coins: 100,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    alert("Compte créé avec succès !");
    return user;
  } catch (error) {
    console.error("❌ Erreur inscription:", error.message);
    alert("Erreur: " + error.message);
    throw error;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("signupForm");
  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = document.getElementById("email").value;
      const password = document.getElementById("password").value;
      await signUp(email, password);
    });
  }
});
