document.addEventListener("DOMContentLoaded", async () => {
    const liste = document.getElementById("liste-evenements");
    const formulaire = document.getElementById("form-evenement");
    const messageConnexion = document.getElementById("message-connexion-evenement");
    if (!liste) return;

    const echapperHTML = (texte) => String(texte ?? "").replace(/[&<>'"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#039;",'"':"&quot;"}[c]));
    const afficherDate = date => new Date(date).toLocaleString("fr-FR", {dateStyle:"long", timeStyle:"short"});
    const versDateLocale = date => {
        const d = new Date(date);
        const pad = n => String(n).padStart(2, "0");
        return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };

    async function chargerEvenements() {
        liste.innerHTML = '<div class="empty-state"><div class="empty-icon">⏳</div><h3>Chargement...</h3></div>';
        const {data, error} = await supabaseClient.from("evenements").select("id,titre,description,date_evenement,lieu,created_at,updated_at,auteur_id,auteur_identifiant").order("date_evenement", {ascending:true});
        if (error) {
            console.error(error);
            liste.innerHTML = '<div class="empty-state"><div class="empty-icon">⚠️</div><h3>Impossible de charger les événements</h3><p>Vérifie la configuration Supabase.</p></div>';
            return;
        }
        if (!data.length) {
            liste.innerHTML = '<div class="empty-state"><div class="empty-icon">📅</div><h3>Aucun événement pour le moment</h3><p>Le premier événement peut être ajouté par un membre connecté.</p></div>';
            return;
        }
        const admin = await estAdmin();
        liste.innerHTML = data.map(e => `
            <article class="info-card evenement-card">
                <div class="info-icon">📅</div>
                <div class="article-top"><span class="article-tag">ÉVÉNEMENT</span><span class="article-date">${afficherDate(e.date_evenement)}</span></div>
                <h3>${echapperHTML(e.titre)}</h3>
                <p>${echapperHTML(e.description).replace(/\n/g,"<br>")}</p>
                ${e.lieu ? `<p><strong>Lieu :</strong> ${echapperHTML(e.lieu)}</p>` : ""}
                <div class="post-author">Publié par <strong>${echapperHTML(e.auteur_identifiant || "Utilisateur")}</strong> le ${afficherDate(e.created_at)}${e.updated_at ? ` · modifié le ${afficherDate(e.updated_at)}` : ""}</div>
                ${admin ? `<div class="admin-actions"><button type="button" class="secondary-button admin-edit" data-id="${e.id}">Modifier</button><button type="button" class="danger-button admin-delete" data-id="${e.id}">Supprimer</button></div>` : ""}
            </article>`).join("");

        if (!admin) return;

        liste.querySelectorAll(".admin-delete").forEach(button => button.addEventListener("click", async () => {
            const id = button.dataset.id;
            if (!confirm("Supprimer définitivement cet événement ?")) return;
            button.disabled = true;
            const {data: deleted, error} = await supabaseClient.from("evenements").delete().eq("id", id).select("id");
            if (error) {
                button.disabled = false;
                console.error("Erreur suppression événement :", error);
                alert("Suppression impossible : " + error.message);
                return;
            }
            if (!deleted?.length) {
                button.disabled = false;
                alert("Aucun événement n’a été supprimé. Vérifie les politiques RLS Supabase de l’administrateur.");
                return;
            }
            await chargerEvenements();
        }));

        liste.querySelectorAll(".admin-edit").forEach(button => button.addEventListener("click", async () => {
            const item = data.find(e => String(e.id) === button.dataset.id);
            if (!item) return;
            const titre = prompt("Nouveau titre :", item.titre);
            if (titre === null) return;
            const description = prompt("Nouvelle description :", item.description);
            if (description === null) return;
            const date = prompt("Nouvelle date et heure :", versDateLocale(item.date_evenement));
            if (date === null) return;
            const lieu = prompt("Nouveau lieu :", item.lieu || "");
            if (lieu === null) return;
            if (!titre.trim() || !description.trim() || Number.isNaN(new Date(date).getTime())) {
                alert("Les informations saisies sont invalides.");
                return;
            }
            button.disabled = true;
            const {data: updated, error} = await supabaseClient.from("evenements").update({titre:titre.trim(), description:description.trim(), date_evenement:new Date(date).toISOString(), lieu:lieu.trim() || null, updated_at:new Date().toISOString()}).eq("id", item.id).select("id");
            if (error) {
                button.disabled = false;
                console.error("Erreur modification événement :", error);
                alert("Modification impossible : " + error.message);
                return;
            }
            if (!updated?.length) {
                button.disabled = false;
                alert("Aucun événement n’a été modifié. Vérifie les politiques RLS Supabase de l’administrateur.");
                return;
            }
            await chargerEvenements();
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
            if (!actuel) return alert("Tu dois être connecté pour ajouter un événement.");
            const titre = formulaire.elements.titre.value.trim();
            const description = formulaire.elements.description.value.trim();
            const dateEvenement = formulaire.elements.date_evenement.value;
            const lieu = formulaire.elements.lieu.value.trim();
            if (!titre || !description || !dateEvenement) return alert("Remplis le titre, la description et la date.");
            const profil = await obtenirProfil();
            const bouton = formulaire.querySelector("button[type='submit']");
            bouton.disabled = true;
            const {error} = await supabaseClient.from("evenements").insert({titre,description,date_evenement:new Date(dateEvenement).toISOString(),lieu:lieu || null,auteur_id:actuel.id,auteur_identifiant:profil?.identifiant || "Utilisateur"});
            bouton.disabled = false;
            if (error) return alert("Impossible d’ajouter l’événement : " + error.message);
            formulaire.reset();
            await chargerEvenements();
        });
    } catch (error) { console.error(error); }
    await chargerEvenements();
});
