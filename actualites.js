document.addEventListener("DOMContentLoaded", async () => {
    const liste = document.getElementById("liste-actualites");
    const formulaire = document.getElementById("form-actualite");
    const messageConnexion = document.getElementById("message-connexion-actualite");
    if (!liste) return;

    const echapperHTML = (texte) => String(texte ?? "").replace(/[&<>'"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#039;",'"':"&quot;"}[c]));
    const afficherDate = date => new Date(date).toLocaleString("fr-FR", {dateStyle:"long", timeStyle:"short"});

    async function chargerActualites() {
        liste.innerHTML = '<div class="empty-state"><div class="empty-icon">⏳</div><h3>Chargement...</h3></div>';
        const {data, error} = await supabaseClient.from("actualites").select("id,titre,contenu,created_at,updated_at,auteur_id,auteur_identifiant").order("created_at", {ascending:false});
        if (error) {
            console.error(error);
            liste.innerHTML = '<div class="empty-state"><div class="empty-icon">⚠️</div><h3>Impossible de charger les actualités</h3><p>Vérifie la configuration Supabase.</p></div>';
            return;
        }
        if (!data.length) {
            liste.innerHTML = '<div class="empty-state"><div class="empty-icon">📰</div><h3>Aucune actualité pour le moment</h3><p>La première actualité peut être publiée par un membre connecté.</p></div>';
            return;
        }
        const admin = await estAdmin();
        liste.innerHTML = data.map(a => `
            <article class="article-card">
                <div class="article-top"><span class="article-tag">ACTUALITÉ</span><span class="article-date">${afficherDate(a.created_at)}</span></div>
                <h3>${echapperHTML(a.titre)}</h3>
                <p>${echapperHTML(a.contenu).replace(/\n/g,"<br>")}</p>
                <div class="post-author">Publié par <strong>${echapperHTML(a.auteur_identifiant || "Utilisateur")}</strong>${a.updated_at ? ` · modifié le ${afficherDate(a.updated_at)}` : ""}</div>
                ${admin ? `<div class="admin-actions"><button type="button" class="secondary-button admin-edit" data-id="${a.id}">Modifier</button><button type="button" class="danger-button admin-delete" data-id="${a.id}">Supprimer</button></div>` : ""}
            </article>`).join("");

        if (!admin) return;

        liste.querySelectorAll(".admin-delete").forEach(button => button.addEventListener("click", async () => {
            const id = button.dataset.id;
            if (!confirm("Supprimer définitivement cette actualité ?")) return;
            button.disabled = true;
            const {data: deleted, error} = await supabaseClient.from("actualites").delete().eq("id", id).select("id");
            if (error) {
                button.disabled = false;
                console.error("Erreur suppression actualité :", error);
                alert("Suppression impossible : " + error.message);
                return;
            }
            if (!deleted?.length) {
                button.disabled = false;
                alert("Aucune actualité n’a été supprimée. Vérifie les politiques RLS Supabase de l’administrateur.");
                return;
            }
            await chargerActualites();
        }));

        liste.querySelectorAll(".admin-edit").forEach(button => button.addEventListener("click", async () => {
            const item = data.find(a => String(a.id) === button.dataset.id);
            if (!item) return;
            const titre = prompt("Nouveau titre :", item.titre);
            if (titre === null) return;
            const contenu = prompt("Nouveau contenu :", item.contenu);
            if (contenu === null) return;
            if (!titre.trim() || !contenu.trim()) {
                alert("Le titre et le contenu ne peuvent pas être vides.");
                return;
            }
            button.disabled = true;
            const {data: updated, error} = await supabaseClient.from("actualites").update({titre:titre.trim(), contenu:contenu.trim(), updated_at:new Date().toISOString()}).eq("id", item.id).select("id");
            if (error) {
                button.disabled = false;
                console.error("Erreur modification actualité :", error);
                alert("Modification impossible : " + error.message);
                return;
            }
            if (!updated?.length) {
                button.disabled = false;
                alert("Aucune actualité n’a été modifiée. Vérifie les politiques RLS Supabase de l’administrateur.");
                return;
            }
            await chargerActualites();
        }));
    }

    try {
        const utilisateur = await utilisateurConnecte();
        if (formulaire && messageConnexion) {
            formulaire.hidden = !utilisateur;
            messageConnexion.hidden = !!utilisateur;
        }
        if (formulaire) formulaire.addEventListener("submit", async event => {
            event.preventDefault();
            const actuel = await utilisateurConnecte();
            if (!actuel) return alert("Tu dois être connecté pour publier une actualité.");
            const titre = formulaire.elements.titre.value.trim();
            const contenu = formulaire.elements.contenu.value.trim();
            if (!titre || !contenu) return alert("Remplis le titre et le contenu.");
            const moderation = analyserContenu(titre + " " + contenu);
            if (!moderation.autorise) return alert("Publication refusée : ce contenu contient un terme interdit.");
            const profil = await obtenirProfil();
            const bouton = formulaire.querySelector("button[type='submit']");
            bouton.disabled = true;
            const {error} = await supabaseClient.from("actualites").insert({titre, contenu, auteur_id:actuel.id, auteur_identifiant:profil?.identifiant || "Utilisateur"});
            bouton.disabled = false;
            if (error) return alert("Impossible de publier l’actualité : " + error.message);
            formulaire.reset();
            await chargerActualites();
        });
    } catch (error) { console.error(error); }
    await chargerActualites();
});
